/**
 * Tests for scripts/validate-init-data.mjs.
 *
 * Run with: node --test scripts/
 *
 * Fixtures are self-signed with a throwaway token/key so no real Telegram
 * credentials are involved.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';

import {
  InitDataError,
  validateInitData,
  validateInitDataThirdParty,
} from './validate-init-data.mjs';

const BOT_TOKEN = '123456:test-token-not-real';
const BOT_ID = 123456;
const NOW = 1_760_000_000;

/**
 * Build a signed initData string.
 * @param {Record<string, string|number>} fields
 * @param {{ token?: string, signature?: string }} [options]
 */
function makeInitData(fields, { token = BOT_TOKEN, signature } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    params.set(key, String(value));
  }
  if (signature) params.set('signature', signature);

  // `signature` is part of the HMAC input; only `hash` is excluded.
  const pairs = [...params].map(([k, v]) => `${k}=${v}`).sort();
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secret).update(pairs.join('\n')).digest('hex');

  params.set('hash', hash);
  return params.toString();
}

function baseFields(overrides = {}) {
  return {
    query_id: 'AAHdF6IQAAAAAN0Xoha',
    user: JSON.stringify({
      id: 42,
      first_name: 'Ada',
      last_name: 'Lovelace',
      username: 'ada',
      language_code: 'en',
    }),
    auth_date: NOW - 30,
    ...overrides,
  };
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof InitDataError, `expected InitDataError, got ${error}`);
    assert.equal(error.code, code);
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/* HMAC                                                                       */
/* -------------------------------------------------------------------------- */

test('valid initData returns the parsed user and auth_date', () => {
  const initData = makeInitData(baseFields());
  const result = validateInitData(initData, BOT_TOKEN, { now: NOW });

  assert.equal(result.authDate, NOW - 30);
  assert.equal(result.user.id, 42);
  assert.equal(result.user.username, 'ada');
  assert.equal(result.queryId, 'AAHdF6IQAAAAAN0Xoha');
});

test('rejects a different bot token', () => {
  const initData = makeInitData(baseFields());
  expectCode(
    () => validateInitData(initData, '654321:other', { now: NOW }),
    'INVALID_HASH',
  );
});

test('rejects tampered fields', () => {
  const initData = makeInitData(baseFields());
  const tampered = initData.replace('Ada', 'Mallory');
  expectCode(() => validateInitData(tampered, BOT_TOKEN, { now: NOW }), 'INVALID_HASH');
});

test('includes signature in the HMAC input when present', () => {
  // A realistic payload that carries both hash and signature.
  const fields = baseFields({ signature: 'c2lnbmF0dXJl' });
  const initData = makeInitData(fields);

  assert.equal(
    validateInitData(initData, BOT_TOKEN, { now: NOW }).user.id,
    42,
  );

  // Swapping the signature after signing must invalidate the HMAC too.
  const swapped = initData.replace('signature=c2lnbmF0dXJl', 'signature=b3RoZXI');
  expectCode(() => validateInitData(swapped, BOT_TOKEN, { now: NOW }), 'INVALID_HASH');
});

test('rejects stale auth_date', () => {
  const initData = makeInitData(baseFields({ auth_date: NOW - 90_000 }));
  expectCode(
    () => validateInitData(initData, BOT_TOKEN, { now: NOW, maxAgeSeconds: 86_400 }),
    'EXPIRED',
  );
});

test('maxAgeSeconds: 0 disables the freshness check', () => {
  const initData = makeInitData(baseFields({ auth_date: NOW - 90_000 }));
  assert.equal(
    validateInitData(initData, BOT_TOKEN, { now: NOW, maxAgeSeconds: 0 }).authDate,
    NOW - 90_000,
  );
});

test('rejects auth_date far in the future but allows small clock skew', () => {
  const future = makeInitData(baseFields({ auth_date: NOW + 3_600 }));
  expectCode(() => validateInitData(future, BOT_TOKEN, { now: NOW }), 'AUTH_DATE_IN_FUTURE');

  const skewed = makeInitData(baseFields({ auth_date: NOW + 60 }));
  assert.equal(
    validateInitData(skewed, BOT_TOKEN, { now: NOW }).authDate,
    NOW + 60,
  );
});

test('rejects missing or malformed hash and auth_date', () => {
  expectCode(() => validateInitData('', BOT_TOKEN, { now: NOW }), 'MISSING_INIT_DATA');
  expectCode(() => validateInitData('user=%7B%7D', BOT_TOKEN, { now: NOW }), 'MISSING_HASH');
  expectCode(
    () => validateInitData('hash=abc&auth_date=1', BOT_TOKEN, { now: NOW }),
    'INVALID_HASH',
  );

  const noAuthDate = makeInitData({ user: '{"id":1}' });
  expectCode(() => validateInitData(noAuthDate, BOT_TOKEN, { now: NOW }), 'MISSING_AUTH_DATE');

  const badAuthDate = makeInitData(baseFields({ auth_date: '2026-06-11' }));
  expectCode(() => validateInitData(badAuthDate, BOT_TOKEN, { now: NOW }), 'INVALID_AUTH_DATE');
});

test('rejects duplicate keys', () => {
  const initData = makeInitData(baseFields());
  const duplicated = `${initData}&user=%7B%22id%22%3A99%7D`;
  expectCode(() => validateInitData(duplicated, BOT_TOKEN, { now: NOW }), 'DUPLICATE_KEY');
});

test('rejects malformed user JSON', () => {
  const initData = makeInitData(baseFields({ user: 'not-json' }));
  expectCode(() => validateInitData(initData, BOT_TOKEN, { now: NOW }), 'MALFORMED_USER');

  const noId = makeInitData(baseFields({ user: '{"first_name":"Ada"}' }));
  expectCode(() => validateInitData(noId, BOT_TOKEN, { now: NOW }), 'MALFORMED_USER');
});

test('handles percent-encoded and non-ASCII values', () => {
  const user = JSON.stringify({ id: 7, first_name: '李华', language_code: 'zh' });
  const initData = makeInitData(baseFields({ user, start_param: 'a b+c' }));
  const result = validateInitData(initData, BOT_TOKEN, { now: NOW });

  assert.equal(result.user.first_name, '李华');
  assert.equal(result.startParam, 'a b+c');
});

/* -------------------------------------------------------------------------- */
/* Ed25519 (third party)                                                      */
/* -------------------------------------------------------------------------- */

function makeEd25519Fixture(botId = BOT_ID) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyHex = publicKey
    .export({ format: 'der', type: 'spki' })
    .subarray(-32)
    .toString('hex');

  const fields = baseFields();
  const pairs = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort();
  const signed = `${botId}:WebAppData\n${pairs.join('\n')}`;
  const signature = sign(null, Buffer.from(signed, 'utf8'), privateKey).toString(
    'base64url',
  );
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) params.set(k, String(v));
  params.set('signature', signature);

  return { initData: params.toString(), publicKeyHex };
}

test('third-party validation accepts a valid signature', () => {
  const { initData, publicKeyHex } = makeEd25519Fixture();
  const result = validateInitDataThirdParty(initData, BOT_ID, {
    now: NOW,
    publicKeyHex,
  });

  assert.equal(result.user.id, 42);
});

test('third-party validation rejects the wrong bot id', () => {
  const { initData, publicKeyHex } = makeEd25519Fixture();
  expectCode(
    () =>
      validateInitDataThirdParty(initData, 999999, { now: NOW, publicKeyHex }),
    'INVALID_SIGNATURE',
  );
});

test('third-party validation rejects a missing or malformed signature', () => {
  const { publicKeyHex } = makeEd25519Fixture();
  expectCode(
    () =>
      validateInitDataThirdParty(makeInitData(baseFields()), BOT_ID, {
        now: NOW,
        publicKeyHex,
      }),
    'MISSING_SIGNATURE',
  );

  expectCode(
    () =>
      validateInitDataThirdParty(
        makeInitData(baseFields({ signature: 'not base64!' })),
        BOT_ID,
        { now: NOW, publicKeyHex },
      ),
    'INVALID_SIGNATURE',
  );
});

test('third-party validation excludes hash and signature from the check string', () => {
  const { initData, publicKeyHex } = makeEd25519Fixture();
  // Adding a valid `hash` must not change the Ed25519 result.
  const withHash = `${initData}&hash=${'0'.repeat(64)}`;

  assert.equal(
    validateInitDataThirdParty(withHash, BOT_ID, { now: NOW, publicKeyHex }).user.id,
    42,
  );
});

/* -------------------------------------------------------------------------- */
/* CLI                                                                        */
/* -------------------------------------------------------------------------- */

test('CLI prints JSON and exits 0 for valid initData', () => {
  const initData = makeInitData(baseFields());
  const output = execFileSync(
    process.execPath,
    [
      'scripts/validate-init-data.mjs',
      '--token',
      BOT_TOKEN,
      '--init-data',
      initData,
      '--now',
      String(NOW),
      '--json',
    ],
    { encoding: 'utf8' },
  );

  const parsed = JSON.parse(output);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.mode, 'hmac');
  assert.equal(parsed.user.id, 42);
  assert.equal(parsed.ageSeconds, 30);
  assert.ok(!output.includes(BOT_TOKEN), 'must not echo the bot token');
});

test('CLI exits 1 for invalid initData', () => {
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        [
          'scripts/validate-init-data.mjs',
          '--token',
          'wrong-token',
          '--init-data',
          makeInitData(baseFields()),
          '--now',
          String(NOW),
          '--json',
        ],
        { encoding: 'utf8' },
      ),
    (error) => {
      assert.equal(error.status, 1);
      const parsed = JSON.parse(error.stdout);
      assert.equal(parsed.ok, false);
      assert.equal(parsed.code, 'INVALID_HASH');
      return true;
    },
  );
});
