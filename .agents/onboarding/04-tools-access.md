# 工具与访问权限手册

**适用**：所有子智能体  
**版本**：1.0

---

## 1. 核心开发工具

| 工具 | 版本 | 用途 | 验证命令 |
|------|------|------|----------|
| **Node.js** | 24.x | 运行时 | `node --version` |
| **pnpm** | 11.x | 包管理 | `pnpm --version` |
| **TypeScript** | 6.x | 类型检查 | `pnpm tsc --version` |
| **Astro** | 7.x | 框架 | `pnpm astro --version` |
| **Rust/Cargo** | 1.80+ | CLI 工具 | `cargo --version` |
| **Playwright** | 1.63+ | E2E 测试 | `pnpm playwright --version` |

---

## 2. 代码质量工具

| 工具 | 配置文件 | 用途 | 运行命令 |
|------|----------|------|----------|
| **oxlint** | `.oxlintrc.json` / `oxlint.config.ts` | 快速 Lint | `pnpm oxlint` |
| **oxfmt** | `oxfmt.config.ts` | 格式化 | `pnpm oxfmt --check` / `--write` |
| **TypeScript** | `tsconfig.json` | 类型检查 | `pnpm tsc -b` |
| **husky + lint-staged** | `.husky/pre-commit.ts` + `package.json` | 提交前检查 | `pnpm lint-staged` |

### 关键配置
```typescript
// oxlint.config.ts 关键项
export default defineConfig({
  options: { typeAware: true },  // 必须开启
  plugins: ["typescript", "unicorn"],
  overrides: [
    { files: ["*.astro"], rules: { "no-unused-vars": "off" } },
    { files: ["src/pages/**/*.ts"], rules: { "no-explicit-any": "off" } }
  ]
});
```

---

## 3. 测试工具

| 工具 | 用途 | 关键命令 |
|------|------|----------|
| **Playwright** | E2E 测试 | `pnpm playwright test` / `--ui` / `--headed` / `--debug` |
| **Playwright Chromium** | 前端门禁 | `pnpm playwright test --project=chromium` |

### 测试结构
```
tests/
├── e2e/
│   ├── navigation.spec.ts      # 导航/路由
│   ├── theme-toggle.spec.ts    # 主题切换
│   ├── search.spec.ts          # Pagefind 搜索
│   ├── auth.spec.ts            # Telegram 认证
│   └── content.spec.ts         # 内容渲染/RSS
└── fixtures/                   # 测试数据
```

---

## 4. CI/CD 环境

### GitHub Actions Secrets（需在仓库 Settings 配置）

| Secret | 用途 | 所需角色 |
|--------|------|----------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Workers 部署 | build-deploy-engineer |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账号 ID | build-deploy-engineer |
| `CODEBERG_PAGES` | Codeberg SSH 私钥 | build-deploy-engineer |
| `PINATA_JWT_TOKEN` | IPFS Pinata 部署 | build-deploy-engineer |
| `SITE_URL` | 站点基础 URL | 全角色 |

### 工作流文件
| 文件 | 触发 | 用途 |
|------|------|------|
| `.github/workflows/deploy.yml` | push to main | 4平台并行部署 |
| `.github/workflows/knowledge-guard.yml` | PR + 定时 | 知识库守护 |

---

## 4. 核心脚本工具

位置：`.agents/scripts/`

| 脚本 | 用途 | 关键参数 |
|------|------|----------|
| `task-claim.ts` | 领取任务 | `--assignee <role>` |
| `task-progress.ts` | 进度/阻塞/协助 | `<percent>` `--msg` `--blocked` `--help-from` |
| `task-complete.ts` | 完成+门禁 | `--skip-gate` |
| `run-gate.ts` | 单独跑门禁 | `<role>` `--strict` |
| `check-regression.ts` | 回归检查 | `<base-sha>` |
| `scan-pointers.ts` | 指针扫描/修复 | `--fix` `--report` |
| `check-terms.ts` | 术语一致性 | `--report` |
| `sync-contracts.ts` | 契约同步 | `--report` |

### 权限设置
```bash
# 首次使用前确保可执行
chmod +x .agents/scripts/*.ts
```

---

## 5. 研发命令速查

### 开发
```bash
pnpm dev              # 启动 dev server (http://localhost:4321)
pnpm check            # 类型检查
pnpm build            # 生产构建
pnpm preview          # Wrangler 预览
```

### 代码质量
```bash
pnpm oxlint           # Lint
pnpm oxfmt --check    # 格式检查
pnpm oxfmt --write    # 自动修复格式
pnpm lint-staged      # 提交前检查 (husky 自动跑)
```

### 测试
```bash
pnpm playwright test           # 全量 E2E
pnpm playwright test --ui      # UI 模式
pnpm playwright test --headed  # 有头模式
pnpm playwright test --debug   # 调试模式
pnpm playwright test --project=chromium  # 仅 Chromium
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

## 6. 访问权限矩阵

| 资源 | frontend-architect | content-engineer | build-deploy-engineer | cli-tool-engineer | search-discovery-engineer | quality-dx-guardian |
|------|-------------------|------------------|----------------------|-------------------|---------------------------|---------------------|
| 源码读写 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CI/CD 配置 | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| GitHub Secrets | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Cloudflare Dashboard | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Cargo/Rust 工具链 | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Playwright UI | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| oxlint/oxfmt 配置 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 6. 常用别名建议（加入 `~/.zshrc` 或 `~/.bashrc`）

```bash
# 子智能体
alias tc='pnpm exec tsx .agents/scripts/task-claim.ts'
alias tp='pnpm exec tsx .agents/scripts/task-progress.ts'
alias tdone='pnpm exec tsx .agents/scripts/task-complete.ts'
alias tgate='pnpm exec tsx .agents/scripts/run-gate.ts'
alias treg='pnpm exec tsx .agents/scripts/check-regression.ts'

# 质量
alias lint='pnpm oxlint'
alias fmt='pnpm oxfmt --write'
alias typeck='pnpm tsc -b'
alias build='pnpm build'
alias test='pnpm playwright test'
alias test:ui='pnpm playwright test --ui'

# 知识库
alias pscan='pnpm exec tsx .agents/scripts/scan-pointers.ts'
alias pterms='pnpm exec tsx .agents/scripts/check-terms.ts'
alias psync='pnpm exec tsx .agents/scripts/sync-contracts.ts'
alias preg='pnpm exec tsx .agents/scripts/check-regression.ts'

# 内容
alias pedit='pnpm post:edit'
```

---

## 7. 故障排查

| 问题 | 排查步骤 |
|------|----------|
| `pnpm` 命令未找到 | `corepack enable && corepack prepare pnpm@11 --activate` |
| `oxlint` 报 `typeAware` 错误 | 检查 `oxlint.config.ts` 有 `options: { typeAware: true }` 且安装 `oxlint-tsgolint` |
| `playwright` 浏览器未安装 | `pnpm playwright install` |
| `cargo` 编译慢 | `export CARGO_NET_GIT_FETCH_WITH_CLI=true` 或用 `sccache` |
| `pnpm build` 卡住 | `rm -rf .astro dist node_modules && pnpm install && pnpm build` |
| 端口 4321 被占用 | `lsof -ti:4321 | xargs kill -9` |

---

**提示**：所有工具版本锁定在 `package.json` / `Cargo.toml` / `pnpm-lock.yaml`，请勿随意升级主版本。