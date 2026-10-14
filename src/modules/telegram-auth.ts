// Telegram Auth Module — deep module.
//
// Verifies short-lived HS256 JWTs issued by the Telegram bot once a user proves
// membership in the required group, and builds deep links into the bot. Uses Web
// Crypto only, so the same code runs under the Astro Node adapter and (for the
// bot) V8 isolates. (docs/SECURITY_WHITEPAPER.md §4, docs/TELEGRAM_AUTH_COMPARISON.md)

import type { TelegramAuthConfig, TelegramAuthStatus } from "./types";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const encoder = new TextEncoder();

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const base64UrlDecode = (value: string): Uint8Array => {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const importKey = (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);

const signatureFor = async (data: string, secret: string): Promise<string> => {
  const signature = await crypto.subtle.sign("HMAC", await importKey(secret), encoder.encode(data));
  return base64UrlEncode(new Uint8Array(signature));
};

export interface TelegramAuthModule {
  /** Deep link that starts the bot's auth flow for a post. */
  buildDeeplink(botUsername: string, postId: string): string;
  /** Whether a post's frontmatter enables the auth wall. */
  requiresAuth(config?: TelegramAuthConfig): boolean;
  /** Per-post cookie name holding the issued token. */
  cookieName(postId: string): string;
  /** Sign an HS256 JWT for `{ sub, gid }`. */
  sign(payload: { sub: string; gid: string }, secret: string, ttl?: number): Promise<string>;
  /** Verify a token, returning its status or `null` when invalid/expired. */
  verify(token: string | undefined, secret: string): Promise<TelegramAuthStatus | null>;
}

export const telegramAuth: TelegramAuthModule = {
  buildDeeplink(botUsername, postId) {
    return `https://t.me/${botUsername}?start=auth_${encodeURIComponent(postId)}`;
  },

  requiresAuth(config) {
    return Boolean(config?.enabled && config.groupId);
  },

  cookieName(postId) {
    return `tg_auth_${postId.replaceAll(/[^a-zA-Z0-9]/g, "_")}`;
  },

  async sign(payload, secret, ttl = TOKEN_TTL_SECONDS) {
    const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
    const now = Math.floor(Date.now() / 1000);
    const body = base64UrlEncode(
      encoder.encode(JSON.stringify({ ...payload, iat: now, exp: now + ttl })),
    );
    const data = `${header}.${body}`;
    return `${data}.${await signatureFor(data, secret)}`;
  },

  async verify(token, secret) {
    if (!token) {
      return null;
    }

    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) {
      return null;
    }

    const expected = await signatureFor(`${header}.${body}`, secret);
    if (expected.length !== signature.length) {
      return null;
    }

    let mismatch = 0;
    for (let index = 0; index < expected.length; index++) {
      mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
    }
    if (mismatch !== 0) {
      return null;
    }

    try {
      const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as {
        sub: string;
        gid: string;
        exp: number;
      };
      if (typeof claims.exp !== "number" || claims.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      return { verified: true, groupId: claims.gid, expiresAt: claims.exp * 1000 };
    } catch {
      return null;
    }
  },
};
