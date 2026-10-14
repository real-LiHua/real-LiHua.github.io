# 故障排查 (Troubleshooting)

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

集中的**现象 → 原因 → 修复**速查表。扩充自 `docs/SUBAGENT_OPERATIONS.md`、`.agents/onboarding/04-tools-access.md`、`docs/KNOWLEDGE_BASE_QUICKREF.md`。

---

## 1. 环境与包管理

| 现象                          | 原因                   | 修复                                                                             |
| ----------------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| `pnpm: command not found`     | 未启用 Corepack        | `corepack enable && corepack prepare pnpm@11 --activate`                         |
| `ERR_PNPM_UNSUPPORTED_ENGINE` | Node 版本不符          | 切换到 Node 24（`nvm use 24`）                                                   |
| 安装后命令行为异常            | 依赖与 lockfile 不一致 | `pnpm install --frozen-lockfile`；仍失败则 `rm -rf node_modules && pnpm install` |
| `oxfmt` / `oxlint` 未找到     | devDependencies 未安装 | 先 `pnpm install`                                                                |

---

## 2. Lint / 格式化

| 现象                                        | 原因                          | 修复                                                                      |
| ------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| `oxlint` 报 `typeAware` / tsgolint 相关错误 | 缺 `oxlint-tsgolint` 或未配置 | `.oxlintrc.json` 配置 `typeAware: true`，并 `pnpm add -D oxlint-tsgolint` |
| `oxlint` 大量报错                           | 未使用变量、类型问题          | `pnpm exec oxlint . --fix`，其余手动修复                                  |
| `oxfmt --check` 不通过                      | 格式不一致                    | `pnpm exec oxfmt --write`                                                 |

> 仓库现行 Lint 配置为 `.oxlintrc.json`（非 `oxlint.config.ts`）。type-aware 相关规则前缀为 `typescript/`。

---

## 3. 构建与管线

| 现象                          | 原因                             | 修复                                                                                          |
| ----------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm build` 卡住 / 挂起      | 残留缓存 / 增量状态损坏          | `rm -rf .astro dist node_modules && pnpm install && pnpm build`                               |
| `pnpm build` 类型报错         | 类型错误、组件缺失               | 先 `pnpm check` 修类型，再 `pnpm build`                                                       |
| 构建内存溢出 (OOM)            | `retainBody: true` 保留完整 body | 设为 `false`，仅需 frontmatter 时                                                             |
| `vnu` 报 `stroke-` SVG 错误   | `mermaid` 生成空 `stroke-` 属性  | filterfile 加 `.*stroke-.*`；见 `.agents/knowledge/mermaid-svg-fix.md`                        |
| `vnu` 报 `@apply` / meta 错误 | vnu 不理解 Tailwind `@apply`     | 非阻断模式 + filterfile 过滤已知误报（[`docs/TESTING.md`](TESTING.md#6-已知缺口-known-gaps)） |
| `lychee` 死链                 | 外部链接失效                     | 修正链接或加 `--exclude`；检查 `lychee.toml`                                                  |
| Pagefind 索引缺失             | 构建未跑索引阶段 / 产物被删      | `pnpm build` 后 `ls dist/client/pagefind/`；确认 BuildPipeline 已启用                         |
| Mermaid 未渲染                | satteri 插件 / 编译阶段未启用    | 检查 `astro.config.ts` 的 `satteriMermaid()` 与渲染脚本                                       |

---

## 4. 开发服务器

| 现象                        | 原因                    | 修复                             |
| --------------------------- | ----------------------- | -------------------------------- |
| 端口 4321 被占用            | 残留 dev 进程           | `lsof -ti:4321 \| xargs kill -9` |
| `pnpm dev` 启动即报类型错误 | 类型 / 内容 schema 报错 | 运行 `pnpm check` 定位并修复     |
| 热更新失效 / 页面 404       | `.astro` 缓存           | `rm -rf .astro` 后重启           |

---

## 5. Rust / Cargo

| 现象                      | 原因                  | 修复                                                                |
| ------------------------- | --------------------- | ------------------------------------------------------------------- |
| `cargo build` 极慢        | crates.io git 拉取慢  | `export CARGO_NET_GIT_FETCH_WITH_CLI=true`，或使用 `sccache`        |
| `cargo: linker not found` | 缺系统链接器          | Linux `apt install build-essential`；macOS `xcode-select --install` |
| `cargo` 报目标缺失        | 工作区不完整          | 确认 `src/post-edit/` 存在（见 `Cargo.toml`）                       |
| `cargo audit` 有漏洞      | 依赖存在 RUSTSEC 公告 | 升级/替换依赖，或登记风险后放行                                     |

---

## 6. Playwright / E2E

| 现象                            | 原因                      | 修复                                                   |
| ------------------------------- | ------------------------- | ------------------------------------------------------ |
| `playwright: browser not found` | 浏览器未安装              | `pnpm exec playwright install --with-deps chromium`    |
| `playwright test` 命令不可用    | `@playwright/test` 未安装 | `pnpm install`；见 [`docs/TESTING.md`](TESTING.md)     |
| 测试挂起 / 超时                 | 端口占用、服务未起        | `pkill -f playwright`；确认 `webServer.url` 与端口一致 |

---

## 7. View Transitions / 主题

| 现象                 | 原因                                   | 修复                                                                                                   |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 客户端脚本重复初始化 | 缺 `astro:page-load` 守卫              | 通过 `client-runtime` 统一注册，事件 `once` 语义；见 [`docs/architecture-map.md`](architecture-map.md) |
| 切页主题闪白 (FOUC)  | `astro:after-swap` 未恢复 `data-theme` | 在 `astro:after-swap` 重新应用主题；`theme-toggle` 模块加守卫 ⏸                                        |
| 主题切换后样式不变   | daisyUI 主题变量名错误                 | 核对 `@plugin "daisyui/theme"` 变量与 `theme-tokens.css` 一致                                          |

---

## 8. 内容 / 子模块

| 现象                             | 原因           | 修复                                                       |
| -------------------------------- | -------------- | ---------------------------------------------------------- |
| 草稿目录为空                     | 子模块未初始化 | `git submodule update --init --recursive` ⏸                |
| `Cannot find module 'astro/zod'` | 导入路径错误   | 使用 `import { z } from "astro/zod"`                       |
| 草稿出现在生产构建               | 路径过滤失效   | 确认草稿位于 `src/posts/drafts/` 且被 `getCollection` 过滤 |
| Zod 4 语法报错                   | 升级未同步文档 | 对照 Zod 4 迁移指南修正                                    |

---

## 9. tgcloud / Telegram

| 现象                    | 原因                          | 修复                                                  |
| ----------------------- | ----------------------------- | ----------------------------------------------------- |
| `tgcloud` 未认证        | 未登录 / Token 失效           | 重新登录或配置 `TG_API_TOKEN`；`pnpm status` 查看状态 |
| webhook 不生效          | URL 未同步 / 证书问题         | `pnpm exec tgcloud webhook sync`；确认 HTTPS 可达     |
| Bot 401                 | Bot Token 错误                | 检查 `TELEGRAM_BOT_TOKEN` 配置                        |
| Bot 403                 | 用户屏蔽 Bot                  | 标记用户不可用（预期行为）                            |
| 429 Too Many Requests   | 触达限流                      | 指数退避重试                                          |
| Endpoint 返回 400       | 输入非法 / `EndpointError`    | 检查 endpoint 参数与 `ctx.initData`                   |
| `pnpm preview` 无法预览 | `tgcloud dev` 未安装/未配置 ⏸ | `pnpm install`；确认 `@tgcloud/cli` 存在              |

错误代码对照见 [`docs/tgcloud-sdk.md`](tgcloud-sdk.md#错误代码速查)。

---

## 10. Git / 其他

| 现象                    | 原因           | 修复                                        |
| ----------------------- | -------------- | ------------------------------------------- |
| `git: cannot lock ref`  | 索引锁残留     | `rm -f .git/index.lock`                     |
| `check-regression` 报错 | git stash 冲突 | 手动 `git stash; git checkout <sha>; ...` ⏸ |
| 进度文件不更新          | 权限问题       | `chmod +x .agents/scripts/*.ts` ⏸           |
| `task-claim` 找不到任务 | 路径错误       | 检查 `.agents/tasks/phase-X/` ⏸             |

---

## 相关文档

- [`docs/GETTING_STARTED.md`](GETTING_STARTED.md) — 环境准备
- [`docs/TESTING.md`](TESTING.md) — 测试与门禁
- [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) — 部署
- [`docs/OPERATIONS.md`](OPERATIONS.md) — 运维 runbook
- [`docs/SUBAGENT_OPERATIONS.md`](SUBAGENT_OPERATIONS.md) — 子智能体故障排查
- `.agents/knowledge/mermaid-svg-fix.md` — Mermaid SVG 修复详情
- `.agents/knowledge/dependency-matrix.md` — 依赖与已知问题
