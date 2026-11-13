#!/usr/bin/env node
/**
 * Validate Telegram Mini App `initData` with zero dependencies.
 *
 * HMAC mode (first-party — your bot's backend):
 *   node scripts/validate-init-data.mjs --token "$BOT_TOKEN" --file init-data.txt
 *   pbpaste | node scripts/validate-init-data.mjs --token "$BOT_TOKEN"
 *
 * Third-party mode (Ed25519 — a service that does not hold the bot token):
 *   node scripts/validate-init-data.mjs --third-party --bot-id 123456 --file init-data.txt
 *
 * Exit codes: 0 valid, 1 invalid, 2 usage error.
 *
 * The same functions are importable:
 *   import { validateInitData } from './scripts/validate-init-data.mjs';
 *
 * `initData` is a bearer credential: never log it, never validate it in a
 * browser, and always enforce an `auth_date` max age.
 */

import { createHmac, createPublicKey, timingSafeEqual, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Telegram's Ed25519 public key for the production environment. */
export const PRODUCTION_PUBLIC_KEY =
  'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d';

/** Telegram's Ed25519 public key for the test environment. */
export const TEST_PUBLIC_KEY =
  '40055058a4ee38156a06562e52eece92a771bcd8346a8c4615cb7376eddf72ec';

const DEFAULT_MAX_AGE_SECONDS = 86_400;
const MAX_FUTURE_SKEW_SECONDS = 300;
const HEX_64 = /^[0-9a-f]{64}$/i;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const UNIX_SECONDS = /^\d{1,12}$/;

export class InitDataError extends Error {
  /**
   * @param {string} code machine-readable reason
   * @param {string} message human-readable reason (never contains the payload)
   */
  constructor(code, message) {
    super(message);
    this.name = 'InitDataError';
    this.code = code;
  }
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Decode exactly once and reject duplicate keys: the signed string is
 * ambiguous if a field appears twice, and Telegram never sends duplicates.
 * @param {string} initData
 * @returns {URLSearchParams}
 */
function parseParams(initData) {
  if (typeof initData !== 'string' || initData.length === 0) {
    throw new InitDataError('MISSING_INIT_DATA', 'initData is empty');
  }

  const params = new URLSearchParams(initData);
  const seen = new Set();

  for (const key of params.keys()) {
    if (seen.has(key)) {
      throw new InitDataError(
        'DUPLICATE_KEY',
        `initData contains the field "${key}" more than once`,
      );
    }
    seen.add(key);
  }

  return params;
}

/**
 * @param {URLSearchParams} params
 * @param {{ maxAgeSeconds: number, now: number }} options
 * @returns {number} auth_date in Unix seconds
 */
function readAuthDate(params, { maxAgeSeconds, now }) {
  const raw = params.get('auth_date');
  if (!raw) {
    throw new InitDataError('MISSING_AUTH_DATE', 'auth_date is missing');
  }
  if (!UNIX_SECONDS.test(raw)) {
    throw new InitDataError(
      'INVALID_AUTH_DATE',
      'auth_date must be Unix seconds, not a date string',
    );
  }

  const authDate = Number(raw);
  const age = now - authDate;

  if (maxAgeSeconds > 0 && age > maxAgeSeconds) {
    throw new InitDataError(
      'EXPIRED',
      `initData is ${age}s old (max ${maxAgeSeconds}s)`,
    );
  }
  if (-age > MAX_FUTURE_SKEW_SECONDS) {
    throw new InitDataError(
      'AUTH_DATE_IN_FUTURE',
      `auth_date is ${-age}s in the future`,
    );
  }

  return authDate;
}

/**
 * @param {URLSearchParams} params
 * @param {number} authDate
 */
function buildResult(params, authDate) {
  /** @type {Record<string, unknown>} */
  const result = {
    authDate,
    user: undefined,
    startParam: params.get('start_param') ?? undefined,
    chatType: params.get('chat_type') ?? undefined,
    chatInstance: params.get('chat_instance') ?? undefined,
    queryId: params.get('query_id') ?? undefined,
    chatJoinRequestQueryId:
      params.get('chat_join_request_query_id') ?? undefined,
    params,
  };

  const rawUser = params.get('user');
  if (rawUser) {
    let user;
    try {
      user = JSON.parse(rawUser);
    } catch {
      throw new InitDataError('MALFORMED_USER', 'user is not valid JSON');
    }
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      throw new InitDataError('MALFORMED_USER', 'user is not a JSON object');
    }
    if (!Number.isInteger(user.id)) {
      throw new InitDataError('MALFORMED_USER', 'user.id is not an integer');
    }
    result.user = user;
  }

  return result;
}

/**
 * Build the signed `key=value` string. Duplicate keys were already rejected.
 * @param {URLSearchParams} params
 * @param {Set<string>} exclude
 */
function dataCheckString(params, exclude) {
  const pairs = [];
  for (const [key, value] of params) {
    if (exclude.has(key)) continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  return pairs.join('\n');
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * First-party validation: HMAC-SHA-256 keyed by the bot token.
 *
 * Excludes only `hash` from the signed string. If `signature` is present it is
 * part of the HMAC input (it is excluded only from the Ed25519 check).
 *
 * @param {string} initData raw `Telegram.WebApp.initData`
 * @param {string} botToken bot token (server-side only)
 * @param {{ maxAgeSeconds?: number, now?: number }} [options]
 */
export function validateInitData(initData, botToken, options = {}) {
  const {
    maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
    now = Math.floor(Date.now() / 1000),
  } = options;

  if (typeof botToken !== 'string' || botToken.length === 0) {
    throw new InitDataError('MISSING_BOT_TOKEN', 'bot token is required');
  }

  const params = parseParams(initData);
  const hash = params.get('hash');

  if (!hash) {
    throw new InitDataError('MISSING_HASH', 'hash is missing');
  }
  if (!HEX_64.test(hash)) {
    throw new InitDataError('INVALID_HASH', 'hash is not 64 hex characters');
  }

  const authDate = readAuthDate(params, { maxAgeSeconds, now });
  const checkString = dataCheckString(params, new Set(['hash']));

  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret)
    .update(checkString, 'utf8')
    .digest();
  const received = Buffer.from(hash, 'hex');

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    throw new InitDataError(
      'INVALID_HASH',
      'hash does not match; check the bot token and that only "hash" was excluded',
    );
  }

  return buildResult(params, authDate);
}

/**
 * Third-party validation: Ed25519 over `<bot_id>:WebAppData\n<sorted pairs>`.
 *
 * Requires the public `bot_id` and Telegram's public key; no bot token. Proves
 * Telegram issued the payload for that bot, not that the user is still active.
 *
 * @param {string} initData
 * @param {number|string} botId
 * @param {{ test?: boolean, maxAgeSeconds?: number, now?: number, publicKeyHex?: string }} [options]
 */
export function validateInitDataThirdParty(initData, botId, options = {}) {
  const {
    test = false,
    maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
    now = Math.floor(Date.now() / 1000),
    // Override for tests or for a deliberately pinned key.
    publicKeyHex,
  } = options;

  if (botId === undefined || botId === null || String(botId).length === 0) {
    throw new InitDataError('MISSING_BOT_ID', 'bot_id is required');
  }

  const params = parseParams(initData);
  const signature = params.get('signature');

  if (!signature) {
    throw new InitDataError('MISSING_SIGNATURE', 'signature is missing');
  }
  if (!BASE64URL.test(signature)) {
    throw new InitDataError(
      'INVALID_SIGNATURE',
      'signature is not base64url',
    );
  }

  const authDate = readAuthDate(params, { maxAgeSeconds, now });
  const checkString = dataCheckString(
    params,
    new Set(['hash', 'signature']),
  );
  const signed = `${botId}:WebAppData\n${checkString}`;

  const rawKey = Buffer.from(
    publicKeyHex ?? (test ? TEST_PUBLIC_KEY : PRODUCTION_PUBLIC_KEY),
    'hex',
  );
  const publicKey = createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: rawKey.toString('base64url') },
    format: 'jwk',
  });

  const valid = verify(
    null,
    Buffer.from(signed, 'utf8'),
    publicKey,
    Buffer.from(signature, 'base64url'),
  );

  if (!valid) {
    throw new InitDataError(
      'INVALID_SIGNATURE',
      'signature does not match; check bot_id and the environment',
    );
  }

  return buildResult(params, authDate);
}

/* -------------------------------------------------------------------------- */
/* CLI                                                                        */
/* -------------------------------------------------------------------------- */

const USAGE = `Validate Telegram Mini App initData (zero dependencies).

Usage:
  node validate-init-data.mjs --token <bot-token> [--file <path> | --init-data <string>]
  node validate-init-data.mjs --third-party --bot-id <id> [--test] [--file <path> | --init-data <string>]

Options:
  --token <token>       Bot token (HMAC mode).
  --third-party         Validate the Ed25519 signature instead of the HMAC.
  --bot-id <id>         Bot id (required with --third-party).
  --test                Use Telegram's test-environment public key.
  --init-data <string>  initData value. Prefer --file or stdin: argv is visible in ps.
  --file <path>         Read initData from a file; "-" reads stdin.
  --max-age <seconds>   Maximum auth_date age. Default 86400; 0 disables.
  --now <unix>          Override the current time (testing only).
  --json                Print a single JSON object.
  -h, --help            Show this help.

Exit codes: 0 valid, 1 invalid, 2 usage error.

If neither --init-data nor --file is given, stdin is read when it is not a TTY.
`;

function parseArgs(argv) {
  /** @type {Record<string, string|boolean>} */
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '-h' || arg === '--help') {
      args.help = true;
      continue;
    }
    if (arg.startsWith('--no-')) {
      args[arg.slice(5)] = false;
      continue;
    }
    if (!arg.startsWith('--')) {
      throw new InitDataError('USAGE', `unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const booleanFlags = new Set(['third-party', 'test', 'json']);
    if (booleanFlags.has(key)) {
      args[key] = true;
      continue;
    }

    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new InitDataError('USAGE', `--${key} requires a value`);
    }
    i += 1;
    args[key] = value;
  }

  return args;
}

function readInput(args) {
  if (args['init-data'] !== undefined) {
    if (args.file !== undefined) {
      throw new InitDataError(
        'USAGE',
        'use either --init-data or --file, not both',
      );
    }
    return String(args['init-data']);
  }

  const path = args.file ?? (process.stdin.isTTY ? undefined : '-');
  if (path === undefined) {
    throw new InitDataError(
      'USAGE',
      'provide --init-data, --file, or pipe initData on stdin',
    );
  }

  const raw =
    path === '-'
      ? readFileSync(0, 'utf8')
      : readFileSync(String(path), 'utf8');

  // A trailing newline is common when copying from logs or a file.
  return raw.replace(/\s+$/, '');
}

function describeUser(user) {
  if (!user) return 'user=<none>';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  const handle = user.username ? ` @${user.username}` : '';
  return `user=${user.id}${name ? ` (${name}${handle})` : handle}`;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    return fail(error, { json: process.argv.includes('--json') });
  }

  if (args.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  const json = args.json === true;
  const thirdParty = args['third-party'] === true;

  try {
    const initData = readInput(args);
    const maxAgeSeconds =
      args['max-age'] === undefined
        ? DEFAULT_MAX_AGE_SECONDS
        : Number(args['max-age']);
    const now =
      args.now === undefined ? Math.floor(Date.now() / 1000) : Number(args.now);

    if (!Number.isFinite(maxAgeSeconds) || maxAgeSeconds < 0) {
      throw new InitDataError('USAGE', '--max-age must be a number >= 0');
    }
    if (!Number.isFinite(now) || now <= 0) {
      throw new InitDataError('USAGE', '--now must be Unix seconds');
    }

    const options = { maxAgeSeconds, now };
    const result = thirdParty
      ? validateInitDataThirdParty(initData, args['bot-id'], {
          ...options,
          test: args.test === true,
        })
      : validateInitData(initData, args.token, options);

    const ageSeconds = Math.max(0, now - result.authDate);
    const user = result.user ?? null;

    if (json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            ok: true,
            mode: thirdParty ? 'ed25519' : 'hmac',
            authDate: result.authDate,
            ageSeconds,
            user,
            startParam: result.startParam ?? null,
            chatType: result.chatType ?? null,
            chatInstance: result.chatInstance ?? null,
            queryId: result.queryId ?? null,
            chatJoinRequestQueryId:
              result.chatJoinRequestQueryId ?? null,
          },
          null,
          2,
        )}\n`,
      );
    } else {
      process.stdout.write(
        `OK  ${describeUser(user)}  auth_date=${result.authDate} (${ageSeconds}s ago)\n`,
      );
    }
    return 0;
  } catch (error) {
    return fail(error, { json });
  }
}

function fail(error, { json }) {
  const isInitDataError = error instanceof InitDataError;
  const code = isInitDataError ? error.code : 'INTERNAL';
  const message = error instanceof Error ? error.message : String(error);

  if (json) {
    process.stdout.write(
      `${JSON.stringify({ ok: false, code, error: message }, null, 2)}\n`,
    );
  } else if (code === 'USAGE') {
    process.stderr.write(`error: ${message}\n\n${USAGE}`);
  } else {
    process.stderr.write(`INVALID  ${code}: ${message}\n`);
  }

  return code === 'USAGE' ? 2 : 1;
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  process.exitCode = main();
}
