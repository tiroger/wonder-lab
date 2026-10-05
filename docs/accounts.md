# Wonder Lab accounts: grown-ups, groups and kid profiles

**Status (2026-10-04):** planned with Roger, not built yet. This is the spec the build follows; update it in the same PR as any change.

## Goals
- A kid's progress follows them to any device, including an incognito window or a friend's tablet.
- A parent sets up profiles for each of their kids; a teacher sets up a class.
- Kids never type an email or a password. Grown-ups never have to remember a password.
- Collect as little as possible about kids: a nickname, a picture choice and progress.
- Playing without signing in still works, saved on the device as today.

## Who's who
- **Grown-up:** signs in with any email address. Owns groups. Anyone can sign up.
- **Group:** a **family** or a **class**. Same thing with different defaults. A grown-up can have several (a teacher with two classes). Each group has a **group code** like `maple-otter-42`.
- **Kid profile:** belongs to one group. A nickname ("Sam", "Mrs. P's Ava"), a look (Pip in a color or costume), an optional **picture password**, and progress.

|                      | Family    | Class     |
|----------------------|-----------|-----------|
| Picture password     | off       | on        |
| Login cards          | optional  | suggested |
| Kids per group (max) | 10        | 40        |

## Signing in
### Grown-ups: email and a one-time code
1. "Grown-ups" (a link in Settings and the footer) opens `#/grownups`.
2. Enter any email. Wonder Lab emails a 6-digit code. Enter it. No password, ever.
3. A new email address creates an account on the spot.
4. The session lasts 30 days on that device. "Sign out" ends it. In an incognito window it ends when the window closes, and the email code gets you back in.

Built on Cognito's passwordless email sign-in (email OTP). The sign-in screens are our own, in Wonder Lab's style, and call Cognito's public API with `fetch`: no library, no hosted page.

### Kids: group code, then "Who's playing?"
1. On a new device: enter the group code or scan the QR code from a login card. The device remembers the group.
2. **Who's playing?** shows each kid's name and Pip look. Tap yours.
3. If the group uses picture passwords: tap your 2 secret pictures, in order, out of 9 (frog, sun, rocket, apple, fish, star, leaf, moon, bee).
4. Play. The header shows who's playing; tapping it goes back to "Who's playing?".

A kid signed in on a device stays signed in until someone switches players or the grown-up resets that kid.

### Playing as a guest
"Play without signing in" keeps today's behavior: progress lives on the device only. When a kid signs in on a device with guest progress, Wonder Lab asks: "This device has 12 stars. Add them to Sam's stars?" Yes merges them in; No leaves them on the device as guest progress.

## The grown-up page (`#/grownups`)
- **Groups:** create a family or a class, rename it, change the group code (the old one stops working), turn picture passwords on or off.
- **Kids:** add, rename, change the look, reset the picture password, remove (deletes their progress).
- **Progress:** per kid, stars, badges and trophies per topic, and critters found. Read-only.
- **Login cards:** a printable page, one card per kid: Wonder Lab logo, group code, QR code, the kid's name and Pip, and their secret pictures. Print CSS lays out 8 per page.
- **Account:** sign out; delete the account (deletes every group, kid and their progress).

## Pip and narration
- New Pip lines (recorded like every line): "Who's playing today?", "Tap your secret pictures!", "Not quite. Try again!", "Welcome back!" (reused), and the guest-merge question.
- A kid's nickname feeds `explorerName()`, so "Hi Sam!" uses the existing nameless recordings through `Voice.keyFor`.
- The grown-up page is text for adults: no Pip lines, no narration.

## Sync
- **Local first:** the app keeps saving to `localStorage` as today, so it works offline. When a kid is signed in, every change is also queued and sent to the API (debounced, about 2 seconds; retried when back online).
- **Merging can't lose anything:** progress only grows. The server keeps the union of stars, badges and critters, each with its earliest timestamp. Two devices played offline merge cleanly.
- **Kept per device, not synced:** sound, music, voice choice, "Wait for Pip", the last place visited.
- On sign-in the device downloads the kid's progress and merges it with anything already queued.

## API (`https://wonderlab.camp/api/…`, same origin through CloudFront)
| Method and path | Who | What |
|---|---|---|
| `GET /api/me` | grown-up | account and groups |
| `POST /api/groups` | grown-up | create a group |
| `PATCH /api/groups/{id}` | grown-up | rename, picture passwords on/off, new group code |
| `DELETE /api/groups/{id}` | grown-up | delete the group and its kids |
| `POST /api/groups/{id}/kids` | grown-up | add a kid |
| `PATCH /api/kids/{id}` | grown-up | rename, look, reset pictures |
| `DELETE /api/kids/{id}` | grown-up | remove a kid |
| `GET /api/groups/{id}/progress` | grown-up | every kid's progress |
| `GET /api/join/{code}` | anyone | the group's kids (nickname and look only) |
| `POST /api/join/{code}/kids/{id}` | anyone | sign in as that kid (with pictures if on); returns a device token |
| `GET /api/play` | kid device | that kid's profile and progress |
| `PUT /api/play/progress` | kid device | merge progress |
| `POST /api/play/signout` | kid device | forget this device token |

- **Grown-up routes:** check the Cognito ID token (an API Gateway JWT authorizer), then that the grown-up owns the group or kid.
- **Kid routes:** check the device token. It's 32 random bytes; only its hash is stored, it's tied to one kid, and resetting the kid revokes every device token.

## Security and privacy
- **Group codes:** 3 words from a 1,024-word kid-safe list plus 2 digits (about 37 bits). They aren't guessable, and `/api/join` is rate-limited per IP. A code only lists nicknames and looks.
- **Picture passwords:** keep classmates out of each other's profiles, not determined attackers. 5 wrong tries lock that kid's picture sign-in for 5 minutes.
- **Stored about kids:** nickname, look, picture password (hashed), progress. No email, real name, birthday, photo or location.
- **Stored about grown-ups:** email address, by Cognito. Used only to send sign-in codes.
- **No tracking:** no analytics, ads or third-party scripts.
- **Consent:** the grown-up who creates a kid profile gives consent for that child (the usual pattern for COPPA, the US law for under-13s; a teacher normally acts under the school's authority). A short plain-language privacy note at `#/privacy` says all of this. It's not legal advice; if Wonder Lab grows past family and friends, have someone check it.
- **Deleting:** removing a kid or a group, or deleting the account, deletes the data at once.

## Infrastructure (Terraform in `infra/`, deployed by CI)
- **Cognito user pool**, Essentials tier (passwordless email OTP; free up to 10,000 monthly active users). Email-only sign-in, self sign-up on, one app client with no secret, allowed flow `USER_AUTH` with `EMAIL_OTP`.
- **SES:** sends the sign-in emails from `hello@wonderlab.camp`. The domain identity and DKIM records go in Route 53. SES starts in a sandbox that can only email verified addresses; **Roger requests production access once** in the SES console (a short form, reviewed in about a day).
- **DynamoDB:** one table, on-demand, point-in-time recovery on. Items: `ADULT#sub`, `GROUP#id`, `KID#id`, `CODE#code` (to a group), `TOKEN#hash` (to a kid), with a GSI from a group to its kids.
- **Lambda:** one function (Node.js 22, no dependencies beyond the AWS SDK in the runtime) handles every route.
- **API Gateway HTTP API:** the JWT authorizer for grown-up routes, throttling, access logs.
- **CloudFront:** a second origin and an `/api/*` behavior with no caching that forwards `Authorization`, so the API is same-origin (no CORS).
- **Everything tagged `Project=wonderlab`.**
- **Bootstrap change (Roger applies once):** the CI deploy role gains Cognito, DynamoDB, Lambda, API Gateway, SES, CloudWatch Logs and a scoped `iam:PassRole` for the Lambda's role, all limited to `wonder-lab-*` names or the project tag, as today. The plan role gains the matching read actions.
- **Cost at family-and-classroom scale:** free tier or a few cents a month.

## Testing
- **The API:** unit tests with `node:test` against an in-memory table (sign-in, ownership checks, merging, rate limits, token revocation). They run in CI.
- **The app:** the walkthrough gets an `/api` stand-in (Playwright `route()`), covering grown-up sign-in, creating a family and two kids, kid sign-in on a second "device" (a fresh context), picture passwords, offline queueing, the guest merge, and two devices merging.
- **End to end, after deploy:** a manual checklist, since email codes can't be automated. Sign up, make a family, sign in as a kid in an incognito window, earn a star, see it on the grown-up page.

## Build order (stacked PRs)
1. **This spec.**
2. **Backend:** the infra Terraform, the Lambda and its tests, plus the bootstrap change. Roger applies the bootstrap and requests SES production access. Nothing visible changes.
3. **Grown-up page:** sign-in, groups, kids, group codes, login cards with QR codes (a small QR encoder written for the app), the privacy note.
4. **Kid sign-in and sync:** "Who's playing?", picture passwords, the header player chip, sync, guest merge, new Pip lines.
5. **Progress view** on the grown-up page.

## Decided
- **Grown-up sign-in:** any email, with a one-time code (no passwords, no Google). Open sign-up. (Roger, 2026-10-04)
- **Picture passwords:** on for classes, off for families, changeable per group.
