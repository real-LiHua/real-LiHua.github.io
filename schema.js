// schema.js — tgcloud database schema.
//
// Tables are named exports; `pnpm deploy` (tgcloud push) registers this file and
// `pnpm exec tgcloud migrate` applies the changes. See docs/tgcloud-sdk.md and
// docs/adr/0012-tgcloud-migration.md.
//
// Runtime rules that shape this file (@tgcloud/cli bundled SDK reference):
//   - Import platform modules by bare name: `sdk`, `sdk/db`, `schema`, `lib/*`.
//   - No foreign keys: `.references()` / `foreignKey()` throw when declared.
//     Relationships below are LOGICAL (documented in comments); enforce
//     integrity in application code (insert parents first, delete children
//     first, sweep orphans with LEFT JOIN).
//   - Timestamps are INTEGER unix seconds via `{ mode: 'timestamp' }` + the
//     `(unixepoch())` default.

import { table, integer, text, boolean, index, uniqueIndex, sql } from "sdk/db";

const timestamp = (name) => integer(name, { mode: "timestamp" }).default(sql`(unixepoch())`);

// Telegram users seen by the bot (deep-link / Mini App identities).
export const profiles = table("profiles", {
  userId: integer("user_id").primaryKey(), // Telegram user id
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  languageCode: text("language_code"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Groups/chats that gate access to protected posts.
// NOTE: `chat_id` here is a LOGICAL reference to a Telegram chat, not to any
// table in this schema.
export const groups = table("groups", {
  chatId: integer("chat_id").primaryKey(),
  title: text("title"),
  username: text("username"),
  requireMembership: boolean("require_membership").default(true),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Per-post authorization config: which group unlocks a protected post.
// `post_id` is the post slug/route id; `group_id` logically references groups.
export const postAuth = table(
  "post_auth",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: text("post_id").notNull(),
    groupId: integer("group_id").notNull(),
    createdAt: timestamp("created_at"),
  },
  (t) => ({
    postUidx: uniqueIndex("uidx_post_auth_post").on(t.postId),
  }),
);

// Short-lived JWT sessions issued after a successful /start deep-link auth.
// `id` is the JWT id (jti); `expires_at` mirrors the JWT `exp` (15 min).
export const sessions = table(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull(), // logical -> profiles.userId
    postId: text("post_id"),
    groupId: integer("group_id"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: timestamp("created_at"),
  },
  (t) => ({
    userIdx: index("idx_sessions_user").on(t.userId),
    expiresIdx: index("idx_sessions_expires").on(t.expiresAt),
  }),
);

// Membership cache: which users belong to which groups.
// Unique per (group_id, user_id); `user_id` is indexed for the hot lookup the
// protected-content route performs (`WHERE user_id = ?`).
export const groupMembers = table(
  "group_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    groupId: integer("group_id").notNull(),
    userId: integer("user_id").notNull(),
    status: text("status").default("member"), // member | administrator | creator | restricted | left | kicked
    joinedAt: timestamp("joined_at"),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    memberUidx: uniqueIndex("uidx_group_members_group_user").on(t.groupId, t.userId),
    userIdx: index("idx_group_members_user").on(t.userId),
  }),
);

// Deep-link auth attempts awaiting the browser poll (/api/auth/status).
// `id` is an opaque nonce; the handler flips `status` to 'authorized' and the
// status endpoint reads it back. Rows are short-lived (see `expires_at`).
export const pendingAuth = table(
  "pending_auth",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull(),
    postId: text("post_id").notNull(),
    groupId: integer("group_id"),
    status: text("status").default("pending"), // pending | authorized | expired
    createdAt: timestamp("created_at"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  },
  (t) => ({
    userPostIdx: index("idx_pending_auth_user_post").on(t.userId, t.postId),
    expiresIdx: index("idx_pending_auth_expires").on(t.expiresAt),
  }),
);
