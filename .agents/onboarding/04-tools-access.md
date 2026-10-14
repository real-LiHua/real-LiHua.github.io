# 工具与访问权限手册

**适用**：所有子智能体
**版本**：1.0

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

---

## 1. 核心开发工具

| 工具           | 版本  | 用途     | 验证命令                         |
| -------------- | ----- | -------- | -------------------------------- |
| **Node.js**    | 24.x  | 运行时   | `node --version`                 |
| **pnpm**       | 11.x  | 包管理   | `pnpm --version`                 |
| **TypeScript** | 6.x   | 类型检查 | `pnpm exec tsc --version`        |
| **Astro**      | 7.x   | 框架     | `pnpm astro --version`           |
| **Rust/Cargo** | 1.80+ | CLI 工具 | `cargo --version`                |
| **Playwright** | 1.63+ | E2E 测试 | `pnpm exec playwright --version` |

---

## 2. 代码质量工具

| 工具                    | 配置文件                                  | 用途       | 运行命令                              |
| ----------------------- | ----------------------------------------- | ---------- | ------------------------------------- |
| **oxlint**              | `.oxlintrc.json` / `oxlint.config.ts` ⏸   | 快速 Lint  | `pnpm exec oxlint .`                  |
| **oxfmt**               | `oxfmt.config.ts`                         | 格式化     | `pnpm exec oxfmt --check` / `--write` |
| **TypeScript**          | `tsconfig.json`                           | 类型检查   | `pnpm exec tsc -b`                    |
| **husky + lint-staged** | `.husky/pre-commit.ts` ⏸ + `package.json` | 提交前检查 | `pnpm exec lint-staged`               |

### 关键配置

```typescript
// oxlint.config.ts 关键项（示例 ⏸，仓库现行配置为 .oxlintrc.json）
export default defineConfig({
  options: { typeAware: true }, // 必须开启
  plugins: ["typescript", "unicorn"],
  overrides: [
    { files: ["*.astro"], rules: { "no-unused-vars": "off" } },
    { files: ["src/pages/**/*.ts"], rules: { "no-explicit-any": "off" } },
  ],
});
```

---

## 3. 测试工具

| 工具                    | 用途     | 关键命令                                                        |
| ----------------------- | -------- | --------------------------------------------------------------- |
| **Playwright**          | E2E 测试 | `pnpm exec playwright test` ⏸ / `--ui` / `--headed` / `--debug` |
| **Playwright Chromium** | 前端门禁 | `pnpm exec playwright test --project=chromium` ⏸                |

> ⏸ 上述 `test` 命令需先补 `@playwright/test` 与 Playwright 配置后可用。

### 测试结构

```text
tests/
├── e2e/
│   ├── navigation.spec.ts      # 导航/路由
│   ├── theme-toggle.spec.ts    # 主题切换
│   ├── search.spec.ts          # Pagefind 搜索
│   ├── auth.spec.ts            # Telegram 认证
│   └── content.spec.ts         # 内容渲染/RSS
└── fixtures/                   # 测试数据
```

> ⏸ `tests/` 目录尚未创建，随 Playwright 配置一并落地。

---

## 4. CI/CD 环境

### GitHub Actions Secrets（需在仓库 Settings 配置）

| Secret               | 用途                  | 所需角色              |
| -------------------- | --------------------- | --------------------- |
| `TG_API_TOKEN`       | tgcloud API token     | build-deploy-engineer |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API 调用 | build-deploy-engineer |
| `CODEBERG_PAGES`     | Codeberg SSH 私钥     | build-deploy-engineer |
| `PINATA_JWT_TOKEN`   | IPFS Pinata 部署      | build-deploy-engineer |
| `SITE_URL`           | 站点基础 URL          | 全角色                |

### 工作流文件

| 文件                                    | 触发         | 用途          |
| --------------------------------------- | ------------ | ------------- |
| `.github/workflows/deploy.yml`          | push to main | 4平台并行部署 |
| `.github/workflows/knowledge-guard.yml` | PR + 定时    | 知识库守护    |

---

## 5. 核心脚本工具

位置：`.agents/scripts/`

| 脚本                  | 用途           | 关键参数                                      |
| --------------------- | -------------- | --------------------------------------------- |
| `task-claim.ts`       | 领取任务       | `--assignee <role>`                           |
| `task-progress.ts`    | 进度/阻塞/协助 | `<percent>` `--msg` `--blocked` `--help-from` |
| `task-complete.ts`    | 完成+门禁      | `--skip-gate`                                 |
| `run-gate.ts`         | 单独跑门禁     | `<role>` `--strict`                           |
| `check-regression.ts` | 回归检查       | `<base-sha>`                                  |
| `scan-pointers.ts`    | 指针扫描/修复  | `--fix` `--report`                            |
| `check-terms.ts`      | 术语一致性     | `--report`                                    |
| `sync-contracts.ts`   | 契约同步       | `--report`                                    |

### 权限设置

```bash
# 首次使用前确保可执行
chmod +x .agents/scripts/*.ts
```

---

## 6. 研发命令速查

### 开发

```bash
pnpm dev              # 启动 dev server (http://localhost:4321)
pnpm check            # 类型检查
pnpm build            # 生产构建
pnpm preview          # 构建 + tgcloud 本地预览
```

### 代码质量

```bash
pnpm exec oxlint .           # Lint
pnpm exec oxfmt --check      # 格式检查
pnpm exec oxfmt --write      # 自动修复格式
pnpm exec lint-staged        # 提交前检查 (husky 自动跑)
```

### 测试

> ⏸ 本块命令需先补 `@playwright/test` 与 Playwright 配置后可用。

```bash
pnpm exec playwright test           # 全量 E2E
pnpm exec playwright test --ui      # UI 模式
pnpm exec playwright test --headed  # 有头模式
pnpm exec playwright test --debug   # 调试模式
pnpm exec playwright test --project=chromium  # 仅 Chromium
```

### 子智能体操作

```bash
pnpm exec tsx .agents/scripts/task-claim.ts <id> --assignee <role>
pnpm exec tsx .agents/scripts/task-progress.ts <id> <percent> --msg "..."
pnpm exec tsx .agents/scripts/task-progress.ts <id> --blocked "..." --help-from <role>
pnpm exec tsx .agents/scripts/task-complete.ts <id> [--skip-gate]
pnpm exec tsx .agents/scripts/run-gate.ts <role> [--strict]
pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1
pnpm exec tsx .agents/scripts/scan-pointers.ts [--fix] [--report]
pnpm exec tsx .agents/scripts/check-terms.ts [--report]
pnpm exec tsx .agents/scripts/sync-contracts.ts [--report]
```

### 内容管理

```bash
pnpm post:edit        # Rust CLI 交互式文章管理
```

---

## 7. 访问权限矩阵

| 资源              | frontend-architect | content-engineer | build-deploy-engineer | cli-tool-engineer | search-discovery-engineer | quality-dx-guardian |
| ----------------- | ------------------ | ---------------- | --------------------- | ----------------- | ------------------------- | ------------------- |
| 源码读写          | ✅                 | ✅               | ✅                    | ✅                | ✅                        | ✅                  |
| CI/CD 配置        | ❌                 | ❌               | ✅                    | ❌                | ❌                        | ✅                  |
| GitHub Secrets    | ❌                 | ❌               | ✅                    | ❌                | ❌                        | ✅                  |
| tgcloud Dashboard | ❌                 | ❌               | ✅                    | ❌                | ❌                        | ❌                  |
| Cargo/Rust 工具链 | ❌                 | ❌               | ❌                    | ✅                | ❌                        | ❌                  |
| Playwright UI     | ✅                 | ❌               | ❌                    | ❌                | ❌                        | ✅                  |
| oxlint/oxfmt 配置 | ❌                 | ❌               | ❌                    | ❌                | ❌                        | ✅                  |

---

## 8. 常用别名建议（加入 `~/.zshrc` 或 `~/.bashrc`）

```bash
# 子智能体
alias tc='pnpm exec tsx .agents/scripts/task-claim.ts'
alias tp='pnpm exec tsx .agents/scripts/task-progress.ts'
alias tdone='pnpm exec tsx .agents/scripts/task-complete.ts'
alias tgate='pnpm exec tsx .agents/scripts/run-gate.ts'
alias treg='pnpm exec tsx .agents/scripts/check-regression.ts'
# 质量
alias lint='pnpm exec oxlint .'
alias fmt='pnpm exec oxfmt --write'
alias typeck='pnpm exec tsc -b'
alias build='pnpm build'
alias test='pnpm exec playwright test'  # alias test:ui='pnpm exec playwright test --ui'  # # 知识库
alias pscan='pnpm exec tsx .agents/scripts/scan-pointers.ts'
alias pterms='pnpm exec tsx .agents/scripts/check-terms.ts'
alias psync='pnpm exec tsx .agents/scripts/sync-contracts.ts'
alias preg='pnpm exec tsx .agents/scripts/check-regression.ts'
# 内容
alias pedit='pnpm post:edit'
```

---

## 9. 故障排查

| 问题                         | 排查步骤                                                              |
| ---------------------------- | --------------------------------------------------------------------- |
| `pnpm` 命令未找到            | `corepack enable && corepack prepare pnpm@11 --activate`              |
| `oxlint` 报 `typeAware` 错误 | 检查 `.oxlintrc.json` 配置 `typeAware: true` 且安装 `oxlint-tsgolint` |
| `playwright` 浏览器未安装    | `pnpm exec playwright install`                                        |
| `cargo` 编译慢               | `export CARGO_NET_GIT_FETCH_WITH_CLI=true` 或用 `sccache`             |
| `pnpm build` 卡住            | `rm -rf .astro dist node_modules && pnpm install && pnpm build`       |
| 端口 4321 被占用             | `lsof -ti:4321 \| xargs kill -9`                                      |

---

**提示**：所有工具版本锁定在 `package.json` / `Cargo.toml` / `pnpm-lock.yaml`，请勿随意升级主版本。
