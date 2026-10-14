# Telegram 认证方案对比：Deep Link vs Login Widget vs Mini App

## 方案概览

| 维度         | Deep Link (当前)                                       | Login Widget                                                   | Mini App                                                    |
| ------------ | ------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------- |
| **核心机制** | 用户点击链接 → 打开 Telegram App → Bot 验证 → 返回 JWT | 网页嵌入 Widget → 用户点击授权 → 获取 `auth_result` → 后端验证 | 网页内打开 Mini App → 用户授权 → 获取 `initData` → 后端验证 |
| **用户体验** | 需跳转 App，回跳网页                                   | 网页内完成，无跳转                                             | 网页内全屏体验，类似原生 App                                |
| **适用场景** | 移动端为主、已安装 Telegram                            | 桌面端为主、未安装 App、快速验证                               | 复杂交互、支付、富媒体、游戏化场景                          |
| **技术栈**   | 纯链接 + Bot API                                       | 官方 JS Widget + 后端验证                                      | Web App (HTML/CSS/JS) + `initData` 验证                     |

---

## 详细对比

### 1. 用户流程

#### Deep Link (当前)

```text
用户点击「在 Telegram 中打开」按钮
    │
    ▼
打开 Telegram App (或网页版 t.me)
    │
    ▼
Bot 接收 /start auth_{postId}
    │
    ▼
Bot 验证群成员身份 → 签发 JWT (15min)
    │
    ▼
用户回到浏览器 → 前端轮询验证状态
    │
    ▼
验证通过 → AJAX 加载受保护内容
```

#### Login Widget

```text
页面加载 Telegram Login Widget
    │
    ▼
用户点击「通过 Telegram 登录」按钮
    │
    ▼
弹窗显示授权确认 (用户头像、权限)
    │
    ▼
用户点击「授权」→ Widget 返回 auth_result
    │
    ▼
前端将 auth_result 发送后端验证
    │
    ▼
后端验证 hash → 签发 JWT → 返回前端
    │
    ▼
前端存储 JWT → AJAX 加载受保护内容
```

#### Mini App

```text
页面点击「在 Mini App 中打开」按钮
    │
    ▼
打开 Mini App (全屏 WebView，内嵌网页)
    │
    ▼
Mini App 请求用户授权 (initData)
    │
    ▼
用户点击「授权」→ 返回 initData
    │
    ▼
前端将 initData 发送后端验证
    │
    ▼
后端验证 initData 签名 → 签发 JWT → 返回前端
    │
    ▼
前端存储 JWT → AJAX 加载受保护内容 / 留在 Mini App 内继续操作
```

---

### 2. 关键指标对比

| 指标                   | Deep Link             | Login Widget          | Mini App               | 备注                    |
| ---------------------- | --------------------- | --------------------- | ---------------------- | ----------------------- |
| **转化率 (移动端)**    | ⭐⭐⭐⭐⭐            | ⭐⭐⭐                | ⭐⭐⭐⭐               | Mini App 全屏体验好     |
| **转化率 (桌面端)**    | ⭐⭐⭐                | ⭐⭐⭐⭐⭐            | ⭐⭐⭐⭐               | Mini App 全屏体验好     |
| **首次用户摩擦**       | 中 (需安装/登录 App)  | 低 (网页内完成)       | 低 (网页内完成)        | Mini App 无需跳转       |
| **已登录用户速度**     | 快 (已登录 App)       | 中 (需点击授权)       | 中 (需点击授权)        | Mini App 需首次授权     |
| **实现复杂度**         | 低                    | 中                    | 高                     | Mini App 需开发前端页面 |
| **安全性**             | 高 (Bot API 直接验证) | 高 (需严格验证 hash)  | 高 (initData 签名验证) | 三者均可达企业级        |
| **Bot Token 暴露风险** | 无 (仅后端)           | 无 (仅后端验证 hash)  | 无 (仅后端验证签名)    | 同等                    |
| **群组成员验证**       | ✅ 原生支持           | ✅ 需额外 API 调用    | ✅ 原生支持            | Deep Link/Mini App 原生 |
| **多设备同步**         | ✅ 自动               | ✅ 自动               | ✅ 自动                | 同等                    |
| **可定制化 UI**        | 低 (按钮+链接)        | 高 (尺寸、主题、语言) | 极高 (完整 Web 技术栈) | Mini App 最灵活         |
| **富交互/支付/游戏**   | ❌ 不支持             | ❌ 不支持             | ✅ 原生支持            | Mini App 独有优势       |
| **离线/缓存能力**      | ❌ 无                 | ❌ 无                 | ✅ Service Worker      | Mini App 独有           |
| **SEO/爬虫友好**       | 无影响                | 无影响                | 无影响                 | 同等                    |

---

### 3. 技术实现对比

#### Deep Link 实现 (当前)

```javascript
// 后端: tgcloud/handlers/message.js
export default async function (message) {
  const match = message.text?.match(/^\/start auth_(.+)$/);
  if (!match) return;

  const postId = match[1];
  const userId = message.from.id;

  // 直接用 Bot API 验证群成员
  const isMember = await checkGroupMembership(userId);
  if (!isMember) return;

  const token = await issueJWT({ postId, userId });
  // 发送成功消息，前端轮询获取
}
```

```typescript
// 前端: src/scripts/modules/telegram-auth.ts
// 1. 生成深度链接: t.me/bot?start=auth_{postId}
// 2. 用户点击 → 打开 Telegram
// 3. 轮询 /api/auth/status?postId=...&token=...
// 4. 成功 → fetch /api/posts/[id]/protected → 注入内容
```

#### Login Widget 实现

```html
<!-- 页面嵌入 Widget -->
<script
  async
  src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="YourBotUsername"
  data-size="large"
  data-auth-url="/api/auth/telegram/callback"
  data-request-access="write"
></script>
```

```javascript
// 后端回调: /api/auth/telegram/callback
export default async function (input, ctx) {
  const { hash, ...userData } = input;

  // 1. 验证 hash (关键安全步骤)
  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();
  const checkString = Object.keys(userData)
    .sort()
    .map((k) => `${k}=${userData[k]}`)
    .join("\n");
  const hmac = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");

  if (hmac !== hash) throw new EndpointError("Invalid hash", 401);

  // 2. 可选：再次验证群成员身份
  const isMember = await checkGroupMembership(userData.id);
  if (!isMember) throw new EndpointError("Not group member", 403);

  // 3. 签发 JWT
  const token = await issueJWT({ postId: input.postId, userId: userData.id });
  return { token };
}
```

#### Mini App 实现

```html
<!-- 前端：打开 Mini App -->
<button onclick="openMiniApp('${postId}')" class="btn btn-primary">在 Mini App 中打开</button>

<script>
  function openMiniApp(postId) {
    // 方式 1: Telegram Web App SDK
    if (window.Telegram?.WebApp) {
      Telegram.WebApp.openTelegramLink(
        `https://t.me/${BOT_USERNAME}/${APP_NAME}?startapp=auth_${postId}`,
      );
    } else {
      // 方式 2: 直接打开链接
      window.open(`https://t.me/${BOT_USERNAME}/${APP_NAME}?startapp=auth_${postId}`, "_blank");
    }
  }
</script>
```

```javascript
// Mini App 前端 (独立页面): mini-app/auth.html ⏸
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script>
  const webApp = Telegram.WebApp;
  webApp.ready();
  webApp.expand();

  webApp.MainButton.text = "授权并继续";
  webApp.MainButton.onClick(async () => {
    const initData = webApp.initData; // 包含 user, auth_date, hash 等
    const res = await fetch('/api/auth/telegram/miniapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, postId: getUrlParam('postId') })
    });
    const { token } = await res.json();
    localStorage.setItem('tg_jwt', token);
    webApp.close(); // 关闭 Mini App，回到主页面
  });
  webApp.MainButton.show();
</script>
```

```javascript
// 后端验证: /api/auth/telegram/miniapp
export default async function (input, ctx) {
  const { initData, postId } = input;

  // 1. 验证 initData 签名 (关键)
  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest("hex");
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const hmac = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");
  if (hmac !== hash) throw new EndpointError("Invalid signature", 401);

  // 2. 检查 auth_date 是否过期 (24小时内)
  const authDate = parseInt(params.get("auth_date")) * 1000;
  if (Date.now() - authDate > 24 * 60 * 60 * 1000) {
    throw new EndpointError("Auth data expired", 401);
  }

  // 3. 解析用户信息
  const user = JSON.parse(params.get("user") || "{}");

  // 4. 可选：验证群成员身份
  const isMember = await checkGroupMembership(user.id);
  if (!isMember) throw new EndpointError("Not group member", 403);

  // 5. 签发 JWT
  const token = await issueJWT({ postId, userId: user.id });
  return { token };
}
```

---

### 4. 安全性深度分析

| 攻击向量           | Deep Link 防护                   | Login Widget 防护                | Mini App 防护                    |
| ------------------ | -------------------------------- | -------------------------------- | -------------------------------- |
| **中间人攻击**     | HTTPS + Bot API 直连             | HTTPS + hash 验证                | HTTPS + initData 签名验证        |
| **重放攻击**       | JWT 15min 过期 + 单次验证        | `auth_date` 时间戳 + 5min 有效期 | `auth_date` 时间戳 + 24h 有效期  |
| **CSRF**           | 无状态 (深度链接无 Cookie)       | `state` 参数或同源策略           | Mini App 内部无 CSRF (无 Cookie) |
| **Bot Token 泄露** | 仅后端持有                       | 仅后端验证 hash 用到             | 仅后端验证签名用到               |
| **群成员验证绕过** | Bot API 直接调用 `getChatMember` | 需额外调用 `getChatMember` API   | Bot API 直接调用 `getChatMember` |
| **中间人篡改数据** | 不适用                           | HMAC-SHA256 签名验证             | HMAC-SHA256 签名验证 (initData)  |
| **XSS 风险**       | 低 (无脚本注入)                  | 低 (官方脚本)                    | 中 (需自行开发页面，需 CSP)      |
| **点击劫持**       | 无风险                           | 低风险                           | 需配置 `frame-ancestors` CSP     |

**结论**：三者安全性相当，**关键在于正确实现**。Deep Link 实现最简单，Mini App 功能最强但开发成本最高。

---

### 5. 适配建议

#### 推荐 Deep Link 的场景

- ✅ 目标用户以**移动端为主**
- ✅ 用户已习惯 Telegram App
- ✅ 需要**群组成员验证**为核心逻辑
- ✅ 团队资源有限，倾向**低维护成本**
- ✅ 已有 Deep Link 实现且运行稳定

#### 推荐 Login Widget 的场景

- ✅ 目标用户以**桌面端/网页端为主**
- ✅ 用户**未安装 Telegram App** 比例高
- ✅ 需要**高度定制化 UI** (品牌色、尺寸、语言)
- ✅ 希望**零跳转、留在页面**完成授权
- ✅ 后续计划接入**Telegram Web App** 生态

#### 推荐 Mini App 的场景

- ✅ 需要**复杂交互** (表单、多步骤向导、实时预览)
- ✅ 需要**支付/订阅/打赏** 功能 (Telegram Payments)
- ✅ 需要**富媒体/图表/实时图表** 交互
- ✅ 需要**离线/缓存/后台同步** 能力
- ✅ 计划开发**游戏化/社交化** 功能 (排行榜、邀请奖励)
- ✅ 团队有前端开发能力，愿意投入 Mini App 开发

#### 混合方案 (推荐)

```text
移动端 UA → Deep Link (原生体验最好)
桌面端 UA → Mini App (全屏体验) 或 Login Widget (轻量)
```

```astro
---
const ua = Astro.request.headers.get('user-agent') || '';
const isMobile = /Mobile|Android|iPhone/.test(ua);
const isDesktop = !isMobile;
---

{isMobile ? (
  <!-- 移动端：Deep Link 原生体验最好 -->
  <a href={`https://t.me/${BOT_USERNAME}?start=auth_${postId}`} class="btn btn-primary">
    在 Telegram 中打开
  </a>
) : (
  <!-- 桌面端：Mini App 全屏体验 或 Login Widget 轻量 -->
  <div class="auth-options">
    <button onclick="openMiniApp('${postId}')" class="btn btn-primary">
      在 Mini App 中打开 (推荐)
    </button>
    <script async src="https://telegram.org/js/telegram-widget.js?22"
      data-telegram-login={BOT_USERNAME}
      data-size="large"
      data-auth-url="/api/auth/telegram/callback"
      data-request-access="write">
    </script>
  </div>
)}
```

---

### 6. 迁移成本评估

| 项           | Deep Link → Login Widget    | Deep Link → Mini App                  | Login Widget → Mini App           |
| ------------ | --------------------------- | ------------------------------------- | --------------------------------- |
| **后端改动** | 新增 `/callback`、hash 验证 | 新增 `/miniapp` 端点、initData 验证   | 复用 `/callback`，新增 `/miniapp` |
| **前端改动** | 替换按钮为 Widget、处理回调 | 新增 Mini App 页面、Web App SDK 集成  | 新增 Mini App 页面                |
| **基础设施** | 无                          | 需配置 Mini App 域名、HTTPS、Bot 设置 | 同上                              |
| **测试成本** | 高 (hash 验证、跨域、弹窗)  | 高 (WebApp SDK、全屏、支付流程)       | 高 (需完整 Mini App 测试)         |
| **回滚难度** | 低 (可并存)                 | 中 (需维护两套入口)                   | 中                                |
| **预估工时** | 2-3 人天                    | 5-10 人天 (含 Mini App 开发)          | 3-5 人天                          |

---

### 7. 决策建议：分层降级策略

> **核心原则**：用户体验优先，提供多路径、允许降级、记忆偏好

#### 推荐架构：分层降级 (Tiered Fallback)

```text
用户访问受保护文章
        │
        ▼
┌─────────────────────────────────────┐
│  UA 检测 + Cookie 记录偏好           │
└─────────────────────────────────────┘
        │
        ▼
   移动端? ──是──→ Deep Link (首选)
   │           └─ 失败/超时/用户拒绝 → Login Widget 备选
   │
   否 (桌面端)
   │
   ▼
┌─────────────────────────────────────┐
│  首选：Mini App (全屏沉浸体验)        │
│  备选：Login Widget (轻量、零跳转)     │
│  兜底：Deep Link (链接兜底)           │
└─────────────────────────────────────┘
```

**降级触发条件**：

- 用户主动关闭/取消 2 次 → 自动降级到下一优先级
- 超时 (30s) 无响应 → 自动降级
- 用户手动点击「切换方式」 → 手动降级

**Cookie 记录偏好**：`auth_preference=deeplink|widget|miniapp`，有效期 30 天

#### 推荐架构：UA 分流 + Cookie 降级 + 手动切换

```astro
---
const ua = Astro.request.headers.get('user-agent') || '';
const cookie = Astro.request.headers.get('cookie') || '';
const pref = cookie.match(/auth_preference=([^;]+)/)?.[1];
const isMobile = /Mobile|Android|iPhone/.test(ua);
const prefersMiniApp = pref === 'miniapp';
const prefersWidget = pref === 'widget';
---

{isMobile ? (
  <!-- 移动端：Deep Link 首选，失败降级 Widget -->
  <TelegramAuthMobile
    postId={postId}
    primary="deeplink"
    fallback="widget"
    onFallback={() => document.cookie = "auth_preference=widget; max-age=2592000"}
  />
) : (
  <!-- 桌面端：Mini App 首选，降级 Widget，兜底 Deep Link -->
  <TelegramAuthDesktop
    postId={postId}
    primary={prefersMiniApp ? 'miniapp' : (prefersWidget ? 'widget' : 'miniapp')}
    fallbackOrder={['miniapp', 'widget', 'deeplink']}
    onFallback={(next) => document.cookie = `auth_preference=${next}; max-age=2592000`}
  />
)}
```

#### 优先级矩阵

| 场景                     | 首选 (P0)    | 备选 (P1)    | 兜底 (P2)    | 备注           |
| ------------------------ | ------------ | ------------ | ------------ | -------------- |
| **移动端首访**           | Deep Link    | Login Widget | 手动复制链接 | 原生体验最好   |
| **移动端回访**           | Deep Link    | -            | -            | 已建立信任     |
| **桌面端首访**           | Mini App     | Login Widget | Deep Link    | 沉浸体验优先   |
| **桌面端回访**           | Mini App     | Login Widget | Deep Link    | 已建立信任     |
| **未安装 Telegram**      | Login Widget | Mini App     | 引导安装     | 无法 Deep Link |
| **Cookie 偏好=widget**   | Login Widget | Mini App     | Deep Link    | 尊重用户选择   |
| **Cookie 偏好=miniapp**  | Mini App     | Login Widget | Deep Link    | 尊重用户选择   |
| **Cookie 偏好=deeplink** | Deep Link    | Mini App     | Login Widget | 尊重用户选择   |

---

### 8. 落地更新清单（引入 Mini App 时）

如决定引入 Mini App，需更新：

- `docs/adr/0001-functional-architecture.md`

- TelegramAuth Module 接口新增 Mini App 入口
- `docs/SECURITY_WHITEPAPER.md`

- 新增 Mini App initData 验证安全控制点、CSP `frame-ancestors`
- `docs/adr/0007-client-module-registry.md`

- TelegramAuth ClientModule 新增 Mini App 流程
- `docs/SECURITY_WHITEPAPER.md`

- 安全配置文件清单新增 Mini App 相关、CSP `frame-ancestors`
- `REFACTOR_PLAN.md`

- 新增 Phase 任务 (Mini App 开发、支付集成等)
- `tgcloud.jsonc`

- 新增 Mini App 配置、域名绑定
