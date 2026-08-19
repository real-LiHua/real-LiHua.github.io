---
description: 质量门禁自动化 - 预检查单、自动化验收、回归阻断
---

# 质量门禁自动化

## 通用门禁（所有任务必跑）

```bash
# 1. TypeScript 类型检查
pnpm tsc -b
# ✓ 0 errors

# 2. Lint 检查
pnpm oxlint
# ✓ 0 errors (warn 仅 no-console)

# 3. 格式化检查
pnpm oxfmt --check
# ✓ 0 diffs

# 4. 构建验证
pnpm build
# ✓ success
```

## 角色专属门禁

| 角色                      | 专属命令                                                     | 验收标准                            |
| ------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| frontend-architect        | `pnpm exec playwright test --project=chromium`               | 核心页面渲染、导航、主题切换通过    |
| content-engineer          | `pnpm build && node -e "require('./dist/server/entry.mjs')"` | 无 Markdown 错误、RSS 生成有效      |
| build-deploy-engineer     | `lychee dist/client && vnu --skip-non-html dist/client`      | 0 broken links、0 vnu errors        |
| cli-tool-engineer         | `cargo test && cargo clippy -p post-edit && cargo audit`     | 全绿、0 warnings、0 vulnerabilities |
| search-discovery-engineer | `pnpm build && ls dist/client/pagefind/*.json`               | 索引文件存在、搜索可用              |
| quality-dx-guardian       | `pnpm exec playwright test`                                  | 全套 E2E 通过                       |

## 自动化脚本

### `run-gate <role> [--strict]`

```bash
# 运行通用 + 角色专属门禁
node .agents/scripts/run-gate.ts frontend-architect

# 严格模式：任何 warn 视为失败
node .agents/scripts/run-gate.ts cli-tool-engineer --strict
```

### `check-regression <base-sha>`

```bash
# 对比基准 commit 的质量指标
node .agents/scripts/check-regression.ts HEAD~1
# 输出：oxlint errors diff, tsc errors diff, test count diff
```

## 门禁结果文件

```
.agents/tasks/phase-X/N.gate.json
{
  "taskId": "1.1",
  "role": "cli-tool-engineer",
  "timestamp": "2026-08-19T10:45:00Z",
  "common": {
    "tsc": "pass",
    "oxlint": "pass",
    "oxfmt": "pass",
    "build": "pass"
  },
  "specific": {
    "cargo-test": "pass",
    "cargo-clippy": "pass",
    "cargo-audit": "pass"
  },
  "overall": "pass"
}
```

## 失败处理流程

1. 门禁失败 → 自动标记任务 `blocked`
2. 生成失败报告 → `.agents/tasks/phase-X/N.gate.failure.json`
3. 通知 assignee 和 quality-dx-guardian
4. 修复后重新 `complete-task` 触发门禁
5. 连续 3 次失败 → 升级为架构问题，创建 ADR

## Pre-commit 集成

```bash
# .husky/pre-commit.ts 已包含：
# 1. oxfmt pre-commit.ts && node pre-commit.ts || wrangler types
# 2. lint-staged (oxlint + oxfmt on staged files)
# 质量门禁在 commit 前自动运行
```
