# Architecture Decision Record: 客户端模块注册表设计

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

## Status

Accepted

## Last Updated

2026-10

## Context

Astro View Transitions (SPA 模式) 下，客户端脚本需在每次页面加载/切换时重新初始化。当前有 9 个独立脚本：

- ThemeToggle, TOC, ReadingProgress, ScrollReveal, TiltCard, CodeCopy, TelegramAuth, GravatarFallback, VerifyWatermark

问题：

1. 脚本加载顺序有依赖 (ThemeToggle 必在 TOC 前、TelegramAuth 需主题就绪)
2. 每个脚本独立监听 `astro:page-load`，重复代码多
3. 错误处理分散，难以统一上报
4. 测试时难以 Mock/禁用单个模块
5. 新增脚本需修改多处 (BaseLayout、脚本文件、类型定义)

## Options

### Option A: 单一入口 + 注册表模式 (推荐)

- `client-entry.ts` 唯一入口，在 `astro:page-load`/`astro:after-swap` 触发
- `ClientRuntime.registerModule(name, initFn, options?)` 注册模块
- 支持依赖声明 `dependsOn: ['theme-toggle']`，自动拓扑排序
- 统一错误边界、性能计时、开发工具面板

### Option B: Astro 原生 `<script is:inline data-astro-rerun>`

- 每个组件内联脚本，依赖 Astro 自动重执行
- 无需注册表，但顺序控制弱、组件间通信难

### Option C: 现状 (分散监听)

- 每脚本自行 `document.addEventListener('astro:page-load', ...)`
- 简单但技术债累积

## Decision

**选择 Option A: 单一入口 + 注册表模式**

### 接口契约

```typescript
// src/modules/client-runtime.ts

export interface ClientContext {
  document: Document;
  window: Window;
  routerEvents: {
    onPageLoad: (fn: () => void) => void;
    onAfterSwap: (fn: () => void) => void;
    onBeforePreparation?: (fn: () => void) => void;
  };
  utils: {
    query: <T extends Element>(sel: string) => T | null;
    queryAll: <T extends Element>(sel: string) => NodeListOf<T>;
    on: (el: Element, event: string, fn: EventListener) => () => void;
  };
}

export type ClientModuleInit = (ctx: ClientContext) => void | Promise<void>;

export interface ModuleRegistration {
  name: string;
  init: ClientModuleInit;
  dependsOn?: string[]; // 依赖模块名
  runOn?: ("pageLoad" | "afterSwap")[]; // 生命周期钩子，默认 ['pageLoad', 'afterSwap']
  once?: boolean; // 仅首次加载运行一次
  condition?: (ctx: ClientContext) => boolean; // 条件注册
}

export interface ClientRuntime {
  registerModule(reg: ModuleRegistration): void;
  unregisterModule(name: string): void;
  getModule(name: string): ModuleRegistration | undefined;
  start(): void;
  stop(): void;
}
```

### 实现

```typescript
// src/scripts/client-entry.ts
import { clientRuntime } from "@/modules/client-runtime";

// 1. 注册所有模块 (按依赖顺序，或依赖声明自动排序)
clientRuntime.registerModule({
  name: "theme-toggle",
  init: ThemeToggle.init,
  runOn: ["pageLoad"], // 仅首次加载
  once: true,
});

clientRuntime.registerModule({
  name: "toc",
  init: TOC.init,
  dependsOn: ["theme-toggle"], // 需主题变量就绪
});

clientRuntime.registerModule({
  name: "telegram-auth",
  init: TelegramAuth.init,
  dependsOn: ["theme-toggle"],
  condition: (ctx) => ctx.document.querySelector("[data-telegram-auth]") !== null,
});

// ... 其他模块

// 2. 启动运行时 (在 BaseLayout 中唯一引入)
clientRuntime.start();
```

```typescript
// src/modules/client-runtime.ts (实现)
const modules = new Map<string, ModuleRegistration>();
const initQueue: string[] = [];

export const clientRuntime: ClientRuntime = {
  registerModule(reg) {
    modules.set(reg.name, reg);
  },
  unregisterModule(name) {
    modules.delete(name);
  },
  getModule(name) {
    return modules.get(name);
  },
  start() {
    // 拓扑排序
    const sorted = topologicalSort(modules);

    // 注册生命周期
    const ctx = createContext();

    ctx.routerEvents.onPageLoad(() => runLifecycle(sorted, ctx, "pageLoad"));
    ctx.routerEvents.onAfterSwap(() => runLifecycle(sorted, ctx, "afterSwap"));
  },
  stop() {
    // 清理事件监听
  },
};

function runLifecycle(names: string[], ctx: ClientContext, hook: "pageLoad" | "afterSwap") {
  for (const name of names) {
    const mod = modules.get(name);
    if (!mod) continue;
    if (mod.once && mod._initialized) continue;
    if (mod.condition && !mod.condition(ctx)) continue;
    if (!mod.runOn?.includes(hook)) continue;

    try {
      const start = performance.now();
      mod.init(ctx);
      mod._initialized = true;
      console.debug(`[ClientRuntime] ${name} init: ${(performance.now() - start).toFixed(2)}ms`);
    } catch (err) {
      console.error(`[ClientRuntime] ${name} failed:`, err);
      // 可选：上报到错误追踪服务
    }
  }
}
```

### 模块重构示例

```typescript
// src/scripts/modules/toc.ts
export const TOC = {
  init(ctx: ClientContext) {
    const { document, utils } = ctx;
    const tocContainer = utils.query("[data-toc-container]");
    if (!tocContainer) return;

    // 生成 TOC、绑定滚动高亮、移动端面板
    // ...
  },
};
```

```typescript
// src/scripts/modules/telegram-auth.ts
export const TelegramAuth = {
  init(ctx: ClientContext) {
    const { document, utils, window } = ctx;
    const walls = utils.queryAll("[data-telegram-auth]");

    walls.forEach((wall) => {
      const postId = wall.dataset.postId;
      const groupName = wall.dataset.groupName;
      const ua = window.navigator.userAgent || "";
      const isMobile = /Mobile|Android|iPhone/.test(ua);
      const cookie = document.cookie || "";
      const pref = cookie.match(/auth_preference=([^;]+)/)?.[1];

      // 1. 确定认证策略优先级
      const strategy = resolveAuthStrategy({ isMobile, pref });

      // 2. 渲染对应的认证 UI
      renderAuthUI(wall, postId, strategy);

      // 3. 启动对应的验证流程
      startAuthFlow(wall, postId, strategy);
    });
  },
};

function resolveAuthStrategy({ isMobile, pref }: { isMobile: boolean; pref?: string }) {
  // 用户显式偏好优先
  if (pref === "deeplink") return { primary: "deeplink", fallbacks: ["widget", "miniapp"] };
  if (pref === "widget") return { primary: "widget", fallbacks: ["miniapp", "deeplink"] };
  if (pref === "miniapp") return { primary: "miniapp", fallbacks: ["widget", "deeplink"] };

  // 默认策略：移动端优先 Deep Link，桌面端优先 Mini App
  if (/Mobile|Android|iPhone/.test(navigator.userAgent)) {
    return { primary: "deeplink", fallbacks: ["widget"] };
  }
  return { primary: "miniapp", fallbacks: ["widget", "deeplink"] };
}

function renderAuthUI(wall: Element, postId: string, strategy: AuthStrategy) {
  const { primary, fallbacks } = strategy;

  // 渲染主入口按钮
  const primaryBtn = createAuthButton(postId, primary, true);
  wall.appendChild(primaryBtn);

  // 渲染降级选项 (折叠面板)
  if (fallbacks.length > 0) {
    const fallbackContainer = document.createElement("div");
    fallbackContainer.className = "auth-fallbacks hidden";
    fallbackContainer.innerHTML = fallbacks
      .map(
        (fb) =>
          `<button class="btn btn-secondary auth-fallback" data-strategy="${fb}" data-post-id="${postId}">
        ${getStrategyLabel(fb)}
      </button>`,
      )
      .join("");
    wall.appendChild(fallbackContainer);

    // 点击"切换方式"展开
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "btn btn-ghost btn-sm auth-toggle";
    toggleBtn.textContent = "切换验证方式";
    toggleBtn.onclick = () => fallbackContainer.classList.toggle("hidden");
    wall.appendChild(toggleBtn);
  }

  // 绑定降级按钮事件
  wall.querySelectorAll(".auth-fallback").forEach((btn) => {
    btn.onclick = () => {
      const nextStrategy = btn.dataset.strategy;
      document.cookie = `auth_preference=${nextStrategy}; max-age=2592000; path=/`;
      location.reload(); // 简单粗暴：刷新页面应用新策略
    };
  });
}

function createAuthButton(postId: string, strategy: string, isPrimary: boolean): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = `btn ${isPrimary ? "btn-primary" : "btn-secondary"} auth-entry`;
  btn.dataset.strategy = strategy;
  btn.dataset.postId = postId;

  switch (strategy) {
    case "deeplink":
      btn.innerHTML = `<a href="https://t.me/${BOT_USERNAME}?start=auth_${postId}" target="_blank">
        <svg class="icon">...</svg> 在 Telegram 中打开
      </a>`;
      break;
    case "widget":
      btn.innerHTML = "通过 Telegram 登录";
      btn.onclick = () => loadTelegramWidget(postId);
      break;
    case "miniapp":
      btn.innerHTML = "在 Mini App 中打开";
      btn.onclick = () => openMiniApp(postId);
      break;
  }
  return btn;
}

function startAuthFlow(wall: Element, postId: string, strategy: AuthStrategy) {
  const { primary, fallbacks } = strategy;

  // 主策略：开始轮询/监听
  if (primary === "deeplink") {
    startDeeplinkPolling(wall, postId);
  } else if (primary === "widget") {
    loadTelegramWidget(postId, () => onWidgetSuccess(wall, postId));
  } else if (primary === "miniapp") {
    // Mini App 由用户主动点击触发，此处只需监听回调
    window.addEventListener("message", (e) => {
      if (e.data?.type === "miniapp-auth-success" && e.data.postId === postId) {
        onAuthSuccess(wall, postId, e.data.token);
      }
    });
  }

  // 降级策略：统一监听用户手动切换
  wall.querySelectorAll(".auth-fallback").forEach((btn) => {
    btn.onclick = async () => {
      const nextStrategy = btn.dataset.strategy;
      document.cookie = `auth_preference=${nextStrategy}; max-age=2592000; path=/`;
      // 重新渲染并启动新策略
      wall.innerHTML = "";
      renderAuthUI(
        wall,
        postId,
        resolveAuthStrategy({
          isMobile: /Mobile|Android|iPhone/.test(navigator.userAgent),
          pref: nextStrategy,
        }),
      );
      startAuthFlow(
        wall,
        postId,
        resolveAuthStrategy({
          isMobile: /Mobile|Android|iPhone/.test(navigator.userAgent),
          pref: nextStrategy,
        }),
      );
    };
  });
}

// ... 原有的 startDeeplinkPolling, injectContent, loadTelegramWidget 等函数保持不变
```

```typescript
// 类型定义
interface AuthStrategy {
  primary: "deeplink" | "widget" | "miniapp";
  fallbacks: ("deeplink" | "widget" | "miniapp")[];
}
```

### BaseLayout 集成

```astro
---
// src/layouts/BaseLayout.astro
---

<html>
  <head>...</head>
  <body data-theme="light">
    <ClientRouter fallback="animate">
      <header><Navbar /></header>
      <main><slot /></main>
      <footer><Footer /></footer>
    </ClientRouter>

    <!-- 单一入口脚本 -->
    <script type="module">
      import { clientRuntime } from '@/modules/client-runtime';
      import { ThemeToggle } from '@/scripts/modules/theme-toggle';
      import { TOC } from '@/scripts/modules/toc';
      import { ReadingProgress } from '@/scripts/modules/reading-progress';
      import { ScrollReveal } from '@/scripts/modules/scroll-reveal';
      import { TiltCard } from '@/scripts/modules/tilt-card';
      import { CodeCopy } from '@/scripts/modules/code-copy';
      import { TelegramAuth } from '@/scripts/modules/telegram-auth';
      import { GravatarFallback } from '@/scripts/modules/gravatar-fallback';

      // 注册
      clientRuntime.registerModule({ name: 'theme-toggle', init: ThemeToggle.init, once: true });
      clientRuntime.registerModule({ name: 'toc', init: TOC.init, dependsOn: ['theme-toggle'] });
      clientRuntime.registerModule({ name: 'reading-progress', init: ReadingProgress.init });
      clientRuntime.registerModule({ name: 'scroll-reveal', init: ScrollReveal.init });
      clientRuntime.registerModule({ name: 'tilt-card', init: TiltCard.init });
      clientRuntime.registerModule({ name: 'code-copy', init: CodeCopy.init });
      clientRuntime.registerModule({
        name: 'telegram-auth',
        init: TelegramAuth.init,
        dependsOn: ['theme-toggle'],
        condition: (ctx) => ctx.document.querySelector('[data-telegram-auth]') !== null
      });
      clientRuntime.registerModule({ name: 'gravatar-fallback', init: GravatarFallback.init });

      clientRuntime.start();
    </script>
  </body>
</html>
```

## Consequences

### Positive

- **单一入口**：BaseLayout 仅引入一个 `<script>`，消除碎片化
- **依赖管理**：声明式 `dependsOn` 自动拓扑排序，消除顺序 Bug
- **条件加载**：`condition` 函数按需初始化 (如 TelegramAuth 仅在认证墙页面)
- **可测试性**：`ClientRuntime` 可在测试中用 JSDOM Mock，单模块可独立测试
- **可观测性**：统一性能计时、错误捕获、开发工具面板
- **热重载友好**：模块注册分离，支持 HMR 重新注册

### Negative / Trade-offs

- **初期迁移成本**：需重构 9 个脚本为模块格式
- **运行时依赖**：引入 `client-runtime.ts` 作为运行时依赖 (极轻量 ~50 行)
- **学习曲线**：团队需理解注册表模式 vs 原生事件监听

## Migration Path

1. Phase 6.1: 创建 `client-runtime.ts` 接口与实现
2. Phase 6.2: 重构 9 个脚本为 `src/scripts/modules/*.ts` 导出 `init(ctx)`
3. Phase 6.3: 更新 `BaseLayout` 引入单一入口
4. Phase 6.4: 验证所有交互、View Transitions 切换、错误场景
5. Phase 6.5: 添加开发工具面板 (可选)

## References

- `src/modules/client-runtime.ts`

- `src/scripts/client-entry.ts`

- `src/scripts/modules/*.ts`

- `src/layouts/BaseLayout.astro`

- docs/adr/0001-functional-architecture.md#35-client-runtime-module
- CONTEXT.md (术语: ClientModule, ClientRuntime, ViewTransitions)
