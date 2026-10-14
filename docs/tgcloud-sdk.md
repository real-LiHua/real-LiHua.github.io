# tgcloud SDK 参考文档

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

## 概览

tgcloud 是 Telegram 的无服务器平台，运行在 V8 隔离环境中，类似 Cloudflare Workers + Drizzle ORM。本文档记录 SDK 核心 API、类型定义和常用模式。

## 核心模块

```javascript
import { db, api, fetch, console, EndpointError, InputFile } from "sdk";
import { eq, sql, and, or, desc, asc } from "sdk/db";
import { profiles, posts, sessions } from "./schema.js";
```

---

## Database (db)

### 查询构建器

```javascript
const user = await db.select().from(profiles).where(eq(profiles.userId, 12345)).get();
const posts = await db.select().from(posts).where(eq(posts.userId, user.id)).all();

const results = await db
  .select()
  .from(posts)
  .where(and(eq(posts.published, true), eq(posts.authorId, userId)))
  .orderBy(desc(posts.createdAt))
  .limit(10)
  .all();

const count = await db.run(sql`SELECT COUNT(*) FROM ${posts}`).get();
```

### 变更操作

```javascript
await db.insert(posts).values({ userId: 123, title: 'Hello', content: '...' }).run();
await db.update(posts).set({ published: true }).where(eq(posts.id, 1)).run();
await db.delete(posts).where(eq(posts.id, 1)).run();
await db.insert(posts).values({ ... }).onConflictDoUpdate({ target: posts.id, set: { ... } }).run();
```

### 事务

```javascript
await db.transaction(async (tx) => {
  const post = await tx.insert(posts).values({ ... }).returning().get();
  await tx.insert(postTags).values({ postId: post.id, tagId: 1 }).run();
});
```

---

## Bot API (api)

```javascript
await api.sendMessage({
  chat_id: 123456,
  text: "Hello!",
  parse_mode: "HTML",
  reply_markup: { inline_keyboard: [[{ text: "Click", callback_data: "data" }]] },
});

await api.editMessageText({ chat_id: 123456, message_id: 789, text: "Updated text" });

try {
  await api.deleteMessage({ chat_id: 123456, message_id: 789 });
} catch (e) {
  if (e.code !== 400) throw e;
}

const file = await api.getFile({ file_id: "..." });
const bytes = await api.getFileContent(file.file_id);

await api.sendDocument({
  chat_id: 123456,
  document: new InputFile(bytes, "doc.pdf", { type: "application/pdf" }),
});

await api.setWebhook({ url: "https://your-domain.com/webhook" });
await api.deleteWebhook({ drop_pending_updates: true });
```

### BotApiError

```javascript
try {
  await api.sendMessage({ chat_id, text: "..." });
} catch (e) {
  if (e.code === 403) {
    /* Bot 被用户屏蔽 */
  }
}
```

---

## HTTP (fetch)

```javascript
const res = await fetch("https://api.example.com/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Alice" }),
});
if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
const data = await res.json();
```

---

## Endpoint (Mini App)

```javascript
// endpoints/getProfile.js
import { db, EndpointError } from "sdk";
import { eq } from "sdk/db";
import { profiles } from "../schema.js";

export default async function (input, ctx) {
  const user = ctx.initData.user;
  const profile = await db.select().from(profiles).where(eq(profiles.userId, user.id)).get();
  if (!profile) throw new EndpointError("Profile not found", { code: "NOT_FOUND" });
  return profile;
}
```

### EndpointError

```javascript
throw new EndpointError("Invalid input", {
  code: "INVALID_INPUT",
  status: 400,
  details: { field: "email", reason: "format" },
});
```

---

## Schema 定义

```javascript
// schema.js
import { integer, text, sqliteTable, uniqueIndex } from "sdk/db";

export const profiles = sqliteTable("profiles", {
  userId: integer("user_id").primaryKey(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  languageCode: text("language_code"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => profiles.userId),
  title: text("title").notNull(),
  content: text("content").notNull(),
  published: integer("published", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").references(() => profiles.userId),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
  },
  (t) => ({ userIdx: uniqueIndex("sessions_user_idx").on(t.userId) }),
);
```

---

## Console (日志)

```javascript
console.log("Info:", { userId: 123, action: "login" });
console.warn("Warning: rate limit approaching", { remaining: 5 });
console.error("Error:", new Error("Failed to fetch"), { context: "webhook" });
```

---

## 部署与迁移

```bash
pnpm exec tgcloud push
pnpm exec tgcloud migrate
pnpm exec tgcloud run handlers/message '{"chat":{"id":1},"text":"hello"}'
pnpm exec tgcloud run endpoints/getProfile '{}' --ctx '{"initData":{"user":{"id":1}}}'
pnpm exec tgcloud webhook
pnpm exec tgcloud webhook sync
pnpm exec tgcloud status
```

---

## 配置文件

```jsonc
// tgcloud.jsonc
{
  "name": "my-blog-bot",
  "runtime": "v8",
  "entrypoint": "handlers/message.js",
  "endpoints": { "getProfile": "endpoints/getProfile.js" },
  "database": { "tables": ["profiles", "posts", "sessions"] },
  "secrets": ["BOT_TOKEN", "WEBHOOK_SECRET"],
}
```

---

## 常见模式

### 认证中间件

```javascript
export async function requireAuth(ctx) {
  if (!ctx.initData?.user)
    throw new EndpointError("Unauthorized", { code: "UNAUTHORIZED", status: 401 });
  return ctx.initData.user;
}
```

### 分页查询

```javascript
const { limit = 20, offset = 0 } = input;
const [items, total] = await Promise.all([
  db.select().from(posts).limit(limit).offset(offset).all(),
  db
    .select({ count: sql`COUNT(*)` })
    .from(posts)
    .get(),
]);
return { items, total, limit, offset, hasMore: offset + limit < total.count };
```

### 速率限制

```javascript
const RATE_LIMIT = new Map();
export default async function (message, ctx) {
  const key = `ratelimit:${message.from.id}`;
  const now = Date.now();
  const window = 60000,
    max = 30;
  const requests = (RATE_LIMIT.get(key) || []).filter((t) => now - t < window);
  if (requests.length >= max) return;
  requests.push(now);
  RATE_LIMIT.set(key, requests);
}
```

---

## 错误代码速查

| 代码 | 含义                     | 处理            |
| ---- | ------------------------ | --------------- |
| 400  | Bad Request / 消息不存在 | 忽略或记录      |
| 401  | Unauthorized (Bot Token) | 检查 Token 配置 |
| 403  | Forbidden (用户屏蔽 Bot) | 标记用户不可用  |
| 404  | Not Found                | 资源不存在      |
| 429  | Too Many Requests        | 指数退避重试    |
| 500+ | 服务端错误               | 重试 + 告警     |

---

## 类型定义

```typescript
interface Profile { userId: number; username?: string; firstName?: string; lastName?: string; languageCode?: string; createdAt: Date; updatedAt: Date; }
interface Post { id: number; userId: number; title: string; content: string; published: boolean; createdAt: Date; updatedAt: Date; }
interface EndpointResponse<T> { ok: true; result: T; } | { ok: false; error: { code: string; message: string; details?: Record<string, unknown>; } };
```

---

## 学习资源

| 资源             | 链接                                   |
| ---------------- | -------------------------------------- |
| tgcloud 官方文档 | https://tgcloud.io/docs                |
| Telegram Bot API | https://core.telegram.org/bots/api     |
| Telegram WebApp  | https://core.telegram.org/bots/webapps |
| Drizzle ORM      | https://orm.drizzle.team/              |
