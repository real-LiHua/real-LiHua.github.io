// handlers/message.js — runs on each `message` update.
//
// The file name is the Telegram update type; the platform calls this default
// export with the matching payload (a Message). The full Update is `ctx.update`.
//
// Scope (REWRITE_PLAN.md W7, ADR 0012 §4, SECURITY_WHITEPAPER §4.3):
//   1. `/start auth_<postId>` deep-link entry point.
//   2. Verify the user is a member of the group that gates the post.
//   3. Issue a short-lived (15 min) HS256 JWT with payload
//      `{ postId, userId, groupId, exp }` for the protected-content route.
//
// Runtime constraints (tgcloud V8 isolate): no Node builtins — crypto uses Web
// Crypto (`crypto.subtle`); imports are by bare module name (`sdk`, `sdk/db`,
// `schema`).
//
// ASSUMPTION: the runtime secret store is surfaced as `ctx.env` (no env access
// mechanism is documented for tgcloud handlers). `JWT_SECRET` is required to
// sign; `AUTH_GROUP_ID` is an optional fallback group when a post has no
// `post_auth` row. If neither resolves, auth is refused rather than signed with
// a default secret.
//
// ASSUMPTION: the browser polls a status endpoint (out of W7 scope) for the
// issued token. To make the token retrievable, it is stored as `sessions.id`
// (keyed by postId/userId); the exact polling protocol is not fully specified.

import { api, db } from "sdk";
import { and, eq } from "sdk/db";
import { groupMembers, pendingAuth, postAuth, profiles, sessions } from "schema";

const JWT_TTL_SECONDS = 15 * 60;
const JWT_ALGORITHM = "HS256";
// Telegram chat-member statuses that count as "in the group".
const MEMBER_STATUSES = new Set(["creator", "administrator", "member", "restricted"]);
// Defensive: post ids are slugs; reject anything with path/URL metacharacters.
const POST_ID_PATTERN = /^[\w.-]{1,128}$/u;
// Same defensive shape the security whitepaper uses for numeric ids.
const NUMERIC_ID_PATTERN = /^-?\d+$/u;

const encoder = new TextEncoder();

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

const encodeSegment = (value) => base64UrlEncode(encoder.encode(JSON.stringify(value)));

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function issueJwt(payload, secret) {
  const signingInput = `${encodeSegment({ alg: JWT_ALGORITHM, typ: "JWT" })}.${encodeSegment(payload)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

function envValue(ctx, name) {
  const value = ctx?.env?.[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function upsertProfile(from) {
  await db
    .insert(profiles)
    .values({
      userId: from.id,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      languageCode: from.language_code,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        languageCode: from.language_code,
        updatedAt: new Date(),
      },
    })
    .run();
}

async function recordMembership(groupId, userId, status) {
  const existing = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .get();

  if (existing) {
    await db
      .update(groupMembers)
      .set({ status, updatedAt: new Date() })
      .where(eq(groupMembers.id, existing.id))
      .run();
    return;
  }

  await db.insert(groupMembers).values({ groupId, userId, status }).run();
}

async function isGroupMember(groupId, userId) {
  try {
    const member = await api.getChatMember({ chat_id: groupId, user_id: userId });
    return MEMBER_STATUSES.has(member.status) ? member.status : null;
  } catch (error) {
    // Bot API 400 = user not found / not a member of the chat.
    if (error?.code === 400) {
      return null;
    }
    throw error;
  }
}

async function resolveGroupId(postId, ctx) {
  const auth = await db.select().from(postAuth).where(eq(postAuth.postId, postId)).get();
  if (auth?.groupId) {
    return auth.groupId;
  }

  const fallback = envValue(ctx, "AUTH_GROUP_ID");
  if (fallback && NUMERIC_ID_PATTERN.test(fallback)) {
    return Number(fallback);
  }

  return null;
}

async function reply(chatId, text) {
  try {
    await api.sendMessage({ chat_id: chatId, text });
  } catch (error) {
    // No logger abstraction exists in the tgcloud V8 isolate; console is the
    // only diagnostic channel available to a handler.
    // oxlint-disable-next-line no-console -- handler diagnostics
    console.error("Failed to send reply", { chatId, error });
  }
}

export default async function (message, ctx) {
  const text = message?.text?.trim();
  const from = message?.from;
  if (!text || !from) {
    return;
  }

  const match = /^\/start(?:\s+(?<payload>.+))?$/u.exec(text);
  if (!match) {
    return;
  }

  const { payload } = match.groups;
  const authMatch = payload ? /^auth_(?<postId>.+)$/u.exec(payload) : null;

  // Plain /start (no deep-link payload): acknowledge.
  if (!authMatch) {
    await reply(
      message.chat.id,
      'This bot authorizes access to protected posts. Open a protected post on the blog and tap "Open in Telegram".',
    );
    return;
  }

  const { postId } = authMatch.groups;
  if (!POST_ID_PATTERN.test(postId)) {
    await reply(message.chat.id, "Invalid authorization link.");
    return;
  }

  const secret = envValue(ctx, "JWT_SECRET");
  if (!secret) {
    // oxlint-disable-next-line no-console -- handler diagnostics
    console.error("JWT_SECRET is not configured; refusing to issue a token");
    await reply(
      message.chat.id,
      "Authorization is temporarily unavailable. Please try again later.",
    );
    return;
  }

  const groupId = await resolveGroupId(postId, ctx);
  if (!groupId) {
    await reply(message.chat.id, "This post is not configured for group-gated access.");
    return;
  }

  const status = await isGroupMember(groupId, from.id);
  if (!status) {
    await reply(message.chat.id, "You must join the group before you can unlock this post.");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + JWT_TTL_SECONDS;
  const jti = randomId();

  const token = await issueJwt({ postId, userId: from.id, groupId, jti, exp }, secret);

  await upsertProfile(from);
  await recordMembership(groupId, from.id, status);

  // The JWT doubles as the row id: the status endpoint returns it once the
  // browser poll matches this postId, and the protected route verifies it.
  await db
    .insert(sessions)
    .values({
      id: token,
      userId: from.id,
      postId,
      groupId,
      expiresAt: new Date(exp * 1000),
    })
    .run();

  await db
    .insert(pendingAuth)
    .values({
      id: jti,
      userId: from.id,
      postId,
      groupId,
      status: "authorized",
      expiresAt: new Date(exp * 1000),
    })
    .run();

  await reply(
    message.chat.id,
    "You are verified. Return to the browser to view the protected post.",
  );
}
