# Validating `initData`

`initData` is a signed launch payload. Treat it as a bearer credential: anyone who obtains
it can impersonate the user until it expires. Validate it **on the server**, then issue your
own short-lived session.

Never validate in the browser. The bot token is the signing key; shipping it to clients
defeats the whole scheme. Never authenticate from `initDataUnsafe`.

## What Telegram signs

`initData` is a URL-encoded query string. The `hash` field is an HMAC-SHA-256 over every
other field, sorted by key.

```text
data_check_string = "auth_date=<auth_date>\nquery_id=<query_id>\nuser=<user>"
secret_key        = HMAC_SHA256(key="WebAppData", data=<bot_token>)
expected_hash     = hex(HMAC_SHA256(key=secret_key, data=data_check_string))
```

Rules that matter:

- Use **decoded** values (`URLSearchParams` / `parse_qsl` do this).
- Sort by field name; join `key=value` pairs with `\n` (0x0A), no trailing newline.
- Exclude only `hash` from the string. If `signature` is present, it **is included** in the
  HMAC check. (It is excluded only from the third-party Ed25519 check.)
- Compare the hex digest in constant time.
- Reject stale `auth_date` (recommended max age: 1 day; shorter for sensitive actions).
- Reject `auth_date` far in the future (allow a few minutes of clock skew).

`initData` is empty for keyboard-button and inline-mode launches. Those flows must
authenticate from the bot update that triggered the app, not from `initData`.

## Node.js (zero dependencies)

```ts
// src/server/validate-init-data.ts
import { createHmac, timingSafeEqual } from 'node:crypto';

export class InitDataError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export interface InitDataUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface ValidatedInitData {
  user?: InitDataUser;
  authDate: number;
  params: URLSearchParams;
}

const HEX_64 = /^[0-9a-f]{64}$/i;

export function validateInitData(
  initData: string,
  botToken: string,
  { maxAgeSeconds = 86_400, now = Math.floor(Date.now() / 1000) } = {},
): ValidatedInitData {
  if (!initData) throw new InitDataError('MISSING_INIT_DATA', 'initData is empty');

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !HEX_64.test(hash)) {
    throw new InitDataError('MISSING_HASH', 'hash is missing or malformed');
  }

  const pairs: string[] = [];
  let authDate: number | undefined;

  for (const [key, value] of params) {
    if (key === 'hash') continue;           // signature stays in the HMAC input
    if (key === 'auth_date') authDate = Number(value);
    pairs.push(`${key}=${value}`);
  }

  if (!Number.isFinite(authDate)) {
    throw new InitDataError('MISSING_AUTH_DATE', 'auth_date is missing or invalid');
  }
  if (maxAgeSeconds > 0 && now - authDate > maxAgeSeconds) {
    throw new InitDataError('EXPIRED', 'initData is too old');
  }
  if (authDate - now > 300) {
    throw new InitDataError('AUTH_DATE_IN_FUTURE', 'auth_date is in the future');
  }

  pairs.sort();

  // HMAC(key="WebAppData", data=botToken)
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret)
    .update(pairs.join('\n'))
    .digest('hex');

  const received = Buffer.from(hash, 'hex');
  const computed = Buffer.from(expected, 'hex');
  const valid =
    received.length === computed.length && timingSafeEqual(received, computed);

  if (!valid) throw new InitDataError('INVALID_HASH', 'hash does not match');

  let user: InitDataUser | undefined;
  const rawUser = params.get('user');
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as InitDataUser;
    } catch {
      throw new InitDataError('MALFORMED_USER', 'user is not valid JSON');
    }
  }

  return { user, authDate, params };
}
```

`pairs.sort()` sorts whole `key=value` strings. That matches sorting by key because keys
are unique and `=` sorts before any character that can continue a key.

## Astro endpoint

```ts
// src/pages/api/auth/telegram.ts
import type { APIRoute } from 'astro';
import { InitDataError, validateInitData } from '../../server/validate-init-data';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { initData } = await request.json().catch(() => ({}));
  if (typeof initData !== 'string') {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }

  try {
    const { user } = validateInitData(initData, import.meta.env.BOT_TOKEN);
    if (!user) return new Response(JSON.stringify({ ok: false }), { status: 401 });

    const session = await createSession(user.id); // your own token/JWT
    cookies.set('session', session, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return new Response(JSON.stringify({ ok: true, user: { id: user.id } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const code = error instanceof InitDataError ? error.code : 'INVALID';
    return new Response(JSON.stringify({ ok: false, code }), { status: 401 });
  }
};
```

Do not return the raw `initData` or the bot token in any response or log.

## Python (zero dependencies)

```python
import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl


class InitDataError(ValueError):
    pass


def validate_init_data(init_data: str, bot_token: str, max_age: int = 86_400) -> dict:
    if not init_data:
        raise InitDataError("initData is empty")

    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", "")
    if len(received_hash) != 64:
        raise InitDataError("hash is missing or malformed")

    try:
        auth_date = int(pairs.get("auth_date", ""))
    except ValueError as exc:
        raise InitDataError("auth_date is missing or invalid") from exc

    now = int(time.time())
    if max_age > 0 and now - auth_date > max_age:
        raise InitDataError("initData is too old")
    if auth_date - now > 300:
        raise InitDataError("auth_date is in the future")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected, received_hash.lower()):
        raise InitDataError("hash does not match")

    return json.loads(pairs["user"]) if "user" in pairs else {}
```

`dict(parse_qsl(...))` keeps the last duplicate key. Telegram does not send duplicates; if
you need strictness, reject repeated keys before converting to a dict.

## Third-party validation (Ed25519)

Use this when a service other than the bot's backend must verify the data. It requires only
the public `bot_id` and Telegram's Ed25519 public key.

```text
data_check_string = "<bot_id>:WebAppData\n" + sorted("key=value" pairs joined by "\n")
```

Exclude **both** `hash` and `signature` from those pairs. Verify the base64url `signature`
against the key for the environment:

- Production: `e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d`
- Test: `40055058a4ee38156a06562e52eece92a771bcd8346a8c4615cb7376eddf72ec`

```ts
import { createPublicKey, verify } from 'node:crypto';

const PUBLIC_KEYS = {
  production: 'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d',
  test: '40055058a4ee38156a06562e52eece92a771bcd8346a8c4615cb7376eddf72ec',
};

export function validateInitDataThirdParty(
  initData: string,
  botId: number | string,
  { test = false } = {},
) {
  const params = new URLSearchParams(initData);
  const signature = params.get('signature');
  if (!signature) throw new Error('signature is missing');

  const pairs: string[] = [];
  let authDate: number | undefined;

  for (const [key, value] of params) {
    if (key === 'hash' || key === 'signature') continue;
    if (key === 'auth_date') authDate = Number(value);
    pairs.push(`${key}=${value}`);
  }

  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate)) throw new Error('auth_date is missing');
  if (now - authDate! > 86_400) throw new Error('initData is too old');

  const dataCheckString = `${botId}:WebAppData\n${pairs.sort().join('\n')}`;
  const rawKey = Buffer.from(PUBLIC_KEYS[test ? 'test' : 'production'], 'hex');
  const publicKey = createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: rawKey.toString('base64url') },
    format: 'jwk',
  });

  const valid = verify(
    null,
    Buffer.from(dataCheckString, 'utf8'),
    publicKey,
    Buffer.from(signature, 'base64url'),
  );

  if (!valid) throw new Error('signature does not match');
  return params;
}
```

Third-party validation proves Telegram issued the data for that `bot_id`. It does **not**
prove the user is still logged in, and it does not prevent replay inside the `auth_date`
window. Apply your own session and authorization rules.

## `auth_date` and replay

`auth_date` is when Telegram issued the payload, not when your server received it. A
captured `initData` remains valid until your max-age cutoff, so:

- Use the shortest max age your UX allows (5–15 minutes for login, up to 24 hours for
  low-risk session refresh).
- Bind the resulting session to your own expiry, not to `initData`.
- For destructive or payment actions, require a server-issued challenge or re-authentication
  rather than replaying the original payload.
- Store `auth_date` and the validated `user.id` with the session for audit.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Hash mismatch on every request | Bot token used directly as the HMAC key | First compute `HMAC("WebAppData", bot_token)`, then HMAC the check string with that |
| Hash mismatch only when `signature` exists | `signature` removed before hashing | Remove only `hash` for HMAC validation |
| Hash mismatch after proxying | Values decoded twice, or `+` converted to space and re-encoded | Pass the raw string; decode exactly once |
| Hash mismatch with non-ASCII names | Comparing bytes vs. strings, or wrong encoding | UTF-8 encode the check string; hex-compare digests |
| `auth_date` invalid | Parsed as a date instead of Unix seconds | Treat it as an integer timestamp |
| Empty `initData` | Keyboard-button or inline-mode launch | Authenticate from the bot update instead |
| Works locally, fails in production | Different bot token (test vs. production) | Match token to environment; test server uses a separate bot |
| Valid hash but wrong user | Reading `initDataUnsafe` or trusting a client-supplied `user` | Use the parsed `user` only after hash verification |

## Logging and transport

- Send `initData` in a POST body or `Authorization` header; avoid query strings (length and
  proxy logs).
- Log the validation result and `user.id`, never the raw payload or token.
- Rate-limit the auth endpoint; failed validation is cheap but not free.
- Use HTTPS. The test environment allows HTTP, production does not.

## Runnable CLI

`scripts/validate-init-data.mjs` implements both modes with the Node standard library only.

```bash
# First-party (bot backend): HMAC with the bot token.
node scripts/validate-init-data.mjs --token "$BOT_TOKEN" --file init-data.txt
pbpaste | node scripts/validate-init-data.mjs --token "$BOT_TOKEN" --json

# Third-party (no bot token): Ed25519 with bot_id and Telegram's public key.
node scripts/validate-init-data.mjs --third-party --bot-id 123456 --file init-data.txt

# Test environment, custom freshness window.
node scripts/validate-init-data.mjs --third-party --bot-id 123456 --test \
  --max-age 300 --file init-data.txt
```

Exit codes: `0` valid, `1` invalid, `2` usage error. `--json` prints one object with
`ok`, `code`/`error` on failure, or `authDate`, `ageSeconds`, `user`, `startParam`,
`chatType`, `queryId`, and `chatJoinRequestQueryId` on success. The payload and token are
never printed.

`--init-data` accepts the string directly, but prefer `--file` or stdin: command-line
arguments are visible to other processes. The script rejects duplicate fields, requires
`auth_date` to be Unix seconds, and enforces a maximum age (default 24 hours, `0`
disables). Tests live in `scripts/validate-init-data.test.mjs` (`node --test scripts/`).

The functions are importable for use in a server route:

```js
import { validateInitData } from './scripts/validate-init-data.mjs';

const { user } = validateInitData(rawInitData, process.env.BOT_TOKEN, {
  maxAgeSeconds: 900,
});
```
