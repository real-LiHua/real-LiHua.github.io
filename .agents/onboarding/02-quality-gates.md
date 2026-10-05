# 质量门禁手册

**适用**：所有子智能体  
**版本**：1.0  
**依据**：ADR 0003 `subagent-quality-gate` 技能

---

## 1. 门禁分层

```
┌─────────────────────────────────────────┐
│  通用门禁（全角色必跑）                    │
├─────────────────────────────────────────┤
│  角色专属门禁                              │
├─────────────────────────────────────────┤
│  回归检查（Phase 结束/发布前）             │
└─────────────────────────────────────────┘
```

---

## 2. 通用门禁（全角色必跑）

| 检查项 | 命令 | 通过标准 |
|--------|------|----------|
| TypeScript 类型检查 | `pnpm tsc -b` | 0 errors |
| Lint 检查 | `pnpm oxlint` | 0 errors (warn 仅 no-console) |
| 格式化检查 | `pnpm oxfmt --check` | 0 diffs |
| 构建验证 | `pnpm build` | success |

**失败即阻断** — 必须修复后才能 `task-complete`。

---

## 3. 角色专属门禁

| 角色 | 专属命令 | 验收标准 |
|------|----------|----------|
| `frontend-architect` | `pnpm playwright test --project=chromium` | 核心页面渲染、导航、主题切换通过 |
| `content-engineer` | `pnpm build && node -e "require('./dist/server/entry.mjs')"` | 无 Markdown 错误、RSS 生成有效 |
| `build-deploy-engineer` | `lychee dist/client && vnu --skip-non-html dist/client` | 0 broken links、0 vnu errors |
| `cli-tool-engineer` | `cargo test && cargo clippy -p post-edit && cargo audit` | 全绿、0 warnings、0 vulnerabilities |
| `search-discovery-engineer` | `pnpm build && ls dist/client/pagefind/*.json` | 索引文件存在、搜索可用 |
| `quality-dx-guardian` | `pnpm playwright test` | 全套 E2E 通过 |

---

## 4. 门禁执行方式

### 自动执行（推荐）
```bash
# task-complete 自动跑通用 + 专属门禁
pnpm exec tsx .agents/scripts/task-complete.ts 1.1

# 单独跑指定角色门禁
pnpm exec tsx .agents/scripts/run-gate.ts frontend-architect
```

### 手动执行（调试用）
```bash
# 通用
pnpm tsc -b && pnpm oxlint && pnpm oxfmt --check && pnpm build

# 角色专属
pnpm playwright test --project=chromium  # frontend-architect
```

---

## 5. 门禁结果记录

生成文件：`.agents/tasks/phase-X/N.gate.json`

```json
{
  "taskId": "1.1",
  "role": "cli-tool-engineer",
  "timestamp": "2026-10-05T10:45:00Z",
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

- `overall: "fail"` → 任务自动标记 `blocked` → 必须修复后重新 `task-complete`
- 连续 3 次失败 → 升级为架构问题，创建 ADR

---

## 6. 回归检查

```bash
# 对比基准 commit 的质量指标
pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1
```

**输出**：
- oxlint errors diff
- tsc errors diff
- test count diff
- 指针/术语/契约一致性

**Phase 结束/发布前必跑**。

---

## 7. CI 集成 (`.github/workflows/knowledge-guard.yml`)

| Job | 触发 | 失败策略 |
|-----|------|----------|
| `pointer-scan` | PR + 月度 | PR 警告 + Issue 分配 quality-dx-guardian |
| `term-check` | PR + 月度 | 同上 |
| `contract-sync` | PR + 月度 | 同上 |
| `regression-check` | 定时/手动 | 同上 |

**本地预检**：
```bash
pnpm exec tsx .agents/scripts/scan-pointers.ts
pnpm exec tsx .agents/scripts/check-terms.ts
pnpm exec tsx .agents/scripts/sync-contracts.ts
pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1
```

---

## 7. 严格模式

```bash
# 任何 warn 视为失败
pnpm exec tsx .agents/scripts/run-gate.ts cli-tool-engineer --strict
```

---

## 8. 常见失败与修复

| 失败项 | 常见原因 | 修复 |
|--------|----------|------|
| `tsc` 报错 | 类型不匹配、导入缺失 | `pnpm check` 查看详情，补类型/导入 |
| `oxlint` 报错 | 未使用变量、类型感知规则 | `pnpm oxlint --fix` 或手动修复 |
| `oxfmt` 不通过 | 格式不一致 | `pnpm oxfmt --write` |
| `build` 失败 | 类型错误、组件缺失 | `pnpm check` 先修类型，再 `pnpm build` |
| `cargo test` 失败 | 逻辑 bug、依赖缺失 | `cargo test -- --nocapture` 看详情 |
| `lychee` 死链 | 外部链接失效 | 修正链接或加 `--exclude` |
| `vnu` HTML 错误 | 标签未闭合、属性非法 | 查看报告行号修正模板 |

---

## 9. 紧急跳过（仅限阻塞无法解决）

```bash
pnpm exec tsx .agents/scripts/task-complete.ts 1.1 --skip-gate
```

**后果**：
- 记录 `.gate.failure.json`
- 需在 24h 内补门禁
- 连续 2 次跳过 → 升级为架构问题

---

## 10. 速查卡

```bash
# 本地全量预检
pnpm tsc -b && pnpm oxlint && pnpm oxfmt --check && pnpm build

# 角色专属门禁
pnpm exec tsx .agents/scripts/run-gate.ts <你的角色>

# 回归检查
pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1

# 全套知识库守护
pnpm exec tsx .agents/scripts/scan-pointers.ts
pnpm exec tsx .agents/scripts/check-terms.ts
pnpm exec tsx .agents/scripts/sync-contracts.ts
```

---

**核心原则**：门禁是保护网，不是障碍。本地预跑 → 修复 → `task-complete` 让 CI 绿灯通过。