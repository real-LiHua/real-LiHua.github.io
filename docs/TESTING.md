# 测试策略 (Testing Strategy)

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

本文定义项目的测试金字塔、运行方式、角色专属质量门禁，以及 **Playwright E2E 与 CI 门禁**。
质量门禁的角色职责见 [`docs/SUBAGENT_OPERATIONS.md`](SUBAGENT_OPERATIONS.md)。

---

## 1. 测试金字塔

```text
        ▲  手动 / 可访问性 (a11y)        人工 + Lighthouse / axe
       ╱ ╲
      ╱   ╲  E2E (Playwright)            Playwright 1.64 · Chromium
     ╱─────╲
    ╱       ╲ 构建 / 管线门禁             Pagefind · lychee · vnu · Mermaid · Watermark
   ╱─────────╲
  ╱           ╲ 类型检查 + 静态分析       astro check · oxlint · oxfmt
 ╱─────────────╲
```

| 层  | 类型                | 目的                                  | 频率            |
| --- | ------------------- | ------------------------------------- | --------------- |
| L1  | 类型检查 / 静态分析 | 捕获类型与代码质量问题（最快、最广）  | 每次提交 / PR   |
| L2  | 构建 / 管线门禁     | 验证构建产物完整、链接有效、HTML 合法 | 每次构建 / PR   |
| L3  | E2E（Playwright）   | 验证用户关键路径在真实浏览器中可用    | PR / 发布前     |
| L4  | 手动 / a11y         | 主观视觉、键盘导航、读屏、可访问性    | 里程碑 / 发布前 |

**原则**：下层快速确定性反馈，上层覆盖真实交互。测试优先补**下层**，E2E 只覆盖关键路径（tracer-bullet）。

---

## 2. 如何运行每一层

### L1 — 类型检查与静态分析

```bash
pnpm check                    # astro check：TypeScript + Astro 类型
pnpm exec oxlint .            # Lint（0 errors，warn 仅 no-console 等）
pnpm exec oxfmt --check       # 格式检查（0 diffs）
pnpm exec oxfmt --write       # 自动修复格式
```

### L2 — 构建与管线门禁

```bash
pnpm build                    # astro build + BuildPipeline（Pagefind/lychee/vnu/Mermaid/Watermark）
pnpm preview                  # astro build && pnpm exec tgcloud dev
```

### L3 — E2E（Playwright）

```bash
pnpm exec playwright test                     # 全量 E2E
pnpm exec playwright test --project=chromium  # 仅 Chromium（前端门禁）
pnpm exec playwright test --ui                # UI 模式
pnpm exec playwright test --headed            # 有头模式
pnpm exec playwright test --debug             # 调试模式
```

### L4 — 手动 / 可访问性

- 键盘导航全链路（Tab / Enter / Esc）、焦点可见
- 主题切换（light/dark）无 FOUC、无对比度问题
- 站内搜索（Pagefind）结果与空态
- 发布前建议跑 Lighthouse / axe（⏸ 工具链待确认）

---

## 3. 角色专属质量门禁

通用门禁 = `tsc`/`astro check`

- `oxlint`

- `oxfmt`

- `build`（全角色必跑）。

| 角色                        | 专属门禁                                                     | 验收标准                            |
| --------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| `frontend-architect`        | `pnpm exec playwright test --project=chromium`               | 核心页面渲染、导航、主题切换通过    |
| `content-engineer`          | `pnpm build && node -e "require('./dist/server/entry.mjs')"` | 无 Markdown 错误、RSS 有效          |
| `build-deploy-engineer`     | `lychee dist/client && vnu --skip-non-html dist/client`      | 0 死链、0 vnu Error                 |
| `cli-tool-engineer`         | `cargo test && cargo clippy -p post-edit && cargo audit`     | 全绿、0 warnings、0 vulnerabilities |
| `search-discovery-engineer` | `pnpm build && ls dist/client/pagefind/*.json`               | Pagefind 索引存在、搜索可用         |
| `quality-dx-guardian`       | `pnpm exec playwright test`                                  | 全套 E2E 通过                       |

> `webServer` 会先执行 `pnpm build`，因此首次运行较慢（见 §4.2）。

---

## 4. Playwright E2E（已配置）

**现状**：`@playwright/test@^1.64.0` 已安装，配置文件为 [`playwright.config.ts`](../playwright.config.ts)，`tests/e2e/` 下有 5 个 spec（Chromium 全绿）。
`webServer` 监督**构建后的独立 Node 服务**（`pnpm build && node ./dist/server/entry.mjs`）而非 `astro dev`——本环境中 `astro dev` 会 daemonise；该命令同时预热 Pagefind 索引。

### 4.1 安装与初始化

```bash
pnpm add -D @playwright/test                      # 已完成
pnpm exec playwright install --with-deps chromium # 浏览器（含系统依赖）
```

### 4.2 `playwright.config.ts`

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "html",
  use: { baseURL: "http://localhost:4321", trace: "on-first-retry" },
  webServer: {
    // `astro dev` daemonises in this environment, so Playwright supervises the
    // built standalone Node server instead (also pre-warms the Pagefind index).
    command: "pnpm build && node ./dist/server/entry.mjs",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

> `--project=chromium` 对应前端门禁；`webServer` 自行拉起服务，避免 4321 端口冲突（见 [`docs/TROUBLESHOOTING.md`](TROUBLESHOOTING.md)）。

### 4.3 目录布局

```text
tests/
├── e2e/
│   ├── navigation.spec.ts      # 导航 / 路由 / View Transitions
│   ├── theme-toggle.spec.ts    # 主题切换、无 FOUC
│   ├── search.spec.ts          # Pagefind 搜索
│   ├── auth.spec.ts            # Telegram 认证流程
│   └── content.spec.ts         # 内容渲染 / RSS
└── fixtures/                   # 测试数据（Markdown/MDX 样本等）
```

> `tests/fixtures/` 目前仅有 `README.md`；新增数据样本随 spec 一并落地。

### 4.4 `package.json` 脚本

```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:chromium": "playwright test --project=chromium"
  }
}
```

### 4.5 CI 集成

E2E 已作为独立 Job 接入 `deploy.yml`，并作为 `codeberg` / `github` 部署 Job 的前置（`needs: e2e`）：

- 步骤：checkout → pnpm/Node 24 → `pnpm exec playwright install --with-deps chromium` → `pnpm build` → `pnpm exec playwright test`
- 上传 `playwright-report/` 与 `test-results/` 作为构建产物
- 失败策略：E2E 失败阻断部署

### 4.6 门禁命令对齐

本文与 `docs/SUBAGENT_OPERATIONS.md` 中的 E2E 门禁命令保持一致（`pnpm exec playwright test` / `--project=chromium`）。

---

## 5. 测试夹具与数据

| 类型      | 说明                                                       | 状态     |
| --------- | ---------------------------------------------------------- | -------- |
| 内容样本  | `tests/fixtures/` 下的 Markdown/MDX，覆盖 frontmatter 边界 | ⏸ 待建   |
| 认证 mock | 模拟 `ctx.initData` / JWT 的 Bot 桩                        | ⏸ 待确认 |
| 网络隔离  | 外部请求 mock（`page.route`），保证确定性                  | ⏸ 待建   |

---

## 6. 已知缺口 (Known Gaps)

| 缺口                     | 影响                   | 计划                           |
| ------------------------ | ---------------------- | ------------------------------ |
| `tests/fixtures/` 无样本 | 内容边界用例覆盖不足   | 随需要补充 Markdown/MDX 样本   |
| vnu 校验为非阻断模式     | 部分 HTML 违规可能漏过 | filterfile 维护 + 定期人工复核 |
| 无单元测试框架           | 纯逻辑模块缺细粒度测试 | ⏸ 待评估（优先 E2E 关键路径）  |

---

## 相关文档

- [`docs/TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — 测试相关故障排查
- [`docs/SUBAGENT_OPERATIONS.md`](SUBAGENT_OPERATIONS.md) — 质量门禁速查
- [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) — 部署前验证清单
- [`docs/SECURITY_WHITEPAPER.md`](SECURITY_WHITEPAPER.md#81-自动化测试-ci-集成) — 安全测试与验证
- [`docs/adr/0004-subagent-coordination.md`](adr/0004-subagent-coordination.md#6-质量门禁体系) — 门禁体系
