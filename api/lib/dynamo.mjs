// The table in DynamoDB: the small storage interface routes.mjs uses. The AWS SDK comes with the Lambda runtime.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

export function dynamoStore(table) {
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
  return {
    async get(pk, sk) { return (await db.send(new GetCommand({ TableName: table, Key: { pk, sk } }))).Item || null; },
    async put(item) { await db.send(new PutCommand({ TableName: table, Item: item })); },
    async putNew(item) {
      try { await db.send(new PutCommand({ TableName: table, Item: item, ConditionExpression: 'attribute_not_exists(pk)' })); return true; }
      catch (e) { if (e.name === 'ConditionalCheckFailedException') return false; throw e; }
    },
    async del(pk, sk) { await db.send(new DeleteCommand({ TableName: table, Key: { pk, sk } })); },
    async query(pk, prefix) {
      const items = []; let start;
      do {
        const r = await db.send(new QueryCommand({ TableName: table, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
          ExpressionAttributeValues: { ':pk': pk, ':p': prefix }, ExclusiveStartKey: start }));
        items.push(...r.Items); start = r.LastEvaluatedKey;
      } while (start);
      return items;
    },
    // a counter that DynamoDB deletes by itself once its time-to-live passes
    async bump(pk, sk, ttlSeconds) {
      const r = await db.send(new UpdateCommand({ TableName: table, Key: { pk, sk }, UpdateExpression: 'ADD n :one SET #ttl = if_not_exists(#ttl, :ttl)',
        ExpressionAttributeNames: { '#ttl': 'ttl' }, ExpressionAttributeValues: { ':one': 1, ':ttl': Math.floor(Date.now() / 1000) + ttlSeconds }, ReturnValues: 'UPDATED_NEW' }));
      return r.Attributes.n;
    },
  };
}
