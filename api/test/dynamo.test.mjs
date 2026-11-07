// Inspect the production adapter's SDK requests without needing AWS credentials or the runtime SDK locally.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function adapter(send) {
  class Command { constructor(input) { this.input = input; } }
  const ctx = vm.createContext({ DynamoDBClient: class {}, DynamoDBDocumentClient: { from: () => ({ send }) },
    GetCommand: Command, PutCommand: Command, DeleteCommand: Command, QueryCommand: Command, UpdateCommand: Command });
  const code = readFileSync(new URL('../lib/dynamo.mjs', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace('export function', 'function');
  vm.runInContext(code, ctx);
  return vm.runInContext("dynamoStore('accounts')", ctx);
}

test('progress reads ask DynamoDB for the current committed revision', async () => {
  const store = adapter(async cmd => { assert.equal(cmd.input.ConsistentRead, true); return { Item: { revision: 2 } }; });
  assert.equal((await store.get('KID#a', 'PROGRESS')).revision, 2);
});

test('DynamoDB progress writes condition on the observed revision, including legacy saves', async () => {
  const requests = [], store = adapter(async cmd => { requests.push(JSON.parse(JSON.stringify(cmd.input))); });
  assert.equal(await store.compareAndPut({ pk: 'KID#a', sk: 'PROGRESS', revision: 1 }, 0), true);
  assert.equal(requests[0].ConditionExpression, 'attribute_not_exists(#rev)');
  assert.equal(requests[0].ExpressionAttributeNames['#rev'], 'revision');
  assert.equal('ExpressionAttributeValues' in requests[0], false, 'no unused expression values on the first write');
  assert.equal(await store.compareAndPut({ pk: 'KID#a', sk: 'PROGRESS', revision: 3 }, 2), true);
  assert.equal(requests[1].ConditionExpression, '#rev = :rev');
  assert.equal(requests[1].ExpressionAttributeValues[':rev'], 2);
  assert.equal(requests[1].Item.revision, 3);
});

test('only a conditional write conflict is treated as a retry; infrastructure errors propagate', async () => {
  const conflict = adapter(async () => { throw Object.assign(new Error('conflict'), { name: 'ConditionalCheckFailedException' }); });
  assert.equal(await conflict.compareAndPut({}, 1), false);
  const broken = adapter(async () => { throw new Error('unavailable'); });
  await assert.rejects(broken.compareAndPut({}, 1), /unavailable/);
});
