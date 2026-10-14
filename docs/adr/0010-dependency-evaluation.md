# Architecture Decision Record: 依赖评估与引入策略

## Status

Accepted

## Context

项目随着功能扩展需要引入新的 npm/Rust 依赖。缺乏标准化评估流程会导致：

- 重复造轮子（已有依赖或原生 API 可替代）
- 引入维护不活跃、有安全隐患、许可证不兼容的包
- 包体积膨胀、构建变慢、运行时性能下降
- 依赖地狱：版本冲突、传递依赖失控

需要一套 **轻量、可追溯、自动化辅助** 的评估流程。

## Decision

建立 **三层评估** + **决策记录** + **自动化守护** 的依赖管理流程。

---

### 1. 三层评估模型

| 层级              | 评估内容                                          | 通过标准       | 产出                      |
| ----------------- | ------------------------------------------------- | -------------- | ------------------------- |
| **L1: 必要性**    | 是否真需要？原生 API/现有依赖能否替代？           | 必须有明确理由 | 需求描述 + 替代方案对比表 |
| **L2: 质量/安全** | 维护状态、安全记录、许可证、体积、TypeScript 支持 | 全项达标       | 评估报告 (Markdown)       |
| **L3: 集成验证**  | 本地试用、构建通过、测试覆盖、类型安全            | CI 绿灯        | PR + 测试用例             |

---

### 2. L1 必要性评估 (必须先做)

**决策树**：

```text
需要新功能
    │
    ├─► 是否已有依赖覆盖？          → 是：复用现有
    │
    ├─► 浏览器/Node/Rust 原生 API 是否足够？  → 是：用原生
    │
    ├─► 是否可用现有依赖的子集/配置实现？   → 是：扩展配置
    │
    ├─► 是否可用轻量级实现 (<1KB) 替代？   → 是：自行实现/复制
    │
    └─► 确需引入新依赖                → 进入 L2
```

**替代方案对比表模板**：

```markdown
# 依赖引入提案: <package-name>

## 需求描述

- 功能: <具体功能>
- 场景: <使用场景>
- 约束: <体积/性能/兼容性要求>

## 替代方案对比

| 方案     | 包名/实现           | 体积 | 维护状态 | TS 支持 | 许可证 | 学习成本 | 结论        |
| -------- | ------------------- | ---- | -------- | ------- | ------ | -------- | ----------- |
| 原生 API | `crypto.subtle`     | 0    | 内置     | 完整    | -      | 低       | ✅ 首选     |
| 现有依赖 | `dayjs` (已有)      | 共享 | 活跃     | 完整    | MIT    | 0        | ✅ 复用     |
| 候选 A   | `date-fns`          | 12KB | 活跃     | 完整    | MIT    | 低       | 备选        |
| 候选 B   | `luxon`             | 45KB | 维护中   | 完整    | MIT    | 中       | ❌ 过重     |
| 自行实现 | `src/utils/date.ts` | <1KB | 內部     | 完整    | -      | 低       | ✅ 简单场景 |

## 决策

- 选择: <方案>
- 理由: <核心理由>
- ADR 编号: 待创建 (如涉及架构)
```

---

### 3. L2 质量/安全评估清单

**自动化检查** (CI 集成)：

```bash
# 1. 安全审计
pnpm audit --registry https://registry.npmjs.org/ <package>
cargo audit  # Rust

# 2. 维护状态
pnpm view <package> --json | jq '{version, time, maintainers, repository, bugs, license, dependencies}'

# 3. 许可证合规
pnpm licenses list --json | jq '.[] | select(.name=="<package>") | {name, license, licenseUrl}'

# 4. 包体积分析
pnpm dlx bundlephobia <package>  # 或 npm pack --dry-run
```

**人工评估项**：

| 维度           | 检查点                                    | 红线 (拒绝)             | 黄线 (需记录理由) |
| -------------- | ----------------------------------------- | ----------------------- | ----------------- |
| **维护活跃度** | 最近提交 < 6 月、Issue 响应、Release 频率 | 存档/年无 Release       | 维护者单人、低频  |
| **安全记录**   | CVE 历史、恶意包报告、依赖链深度          | 近年有高危 CVE          | 间接依赖有中危    |
| **许可证**     | MIT/Apache-2.0/BSD-3/ISC                  | GPL/AGPL/商业/未知      | 强 Copyleft       |
| **TypeScript** | 内置类型 / @types 完整度 / 版本同步       | 无类型、类型错误多      | 需手写声明        |
| **包体积**     | gzip < 10KB (工具库) / < 50KB (UI 库)     | > 100KB 无 tree-shaking | 30-100KB 需权衡   |
| **依赖链**     | 直接依赖数、传递依赖深度、单一维护者      | > 20 传递 / 深度 > 4    | 10-20 传递        |
| **兼容性**     | Node 24 / Rust MSRV / 浏览器基线          | 不支持目标环境          | 需 polyfill       |
| **社区信任**   | 下载量、GitHub Stars、依赖反向数          | < 1k 下载/周            | 新包/小众         |

---

### 4. L3 集成验证

**本地验证清单**：

```bash
# 1. 安装试用
pnpm add -D <package>    # 或 pnpm add <package>

# 2. 类型检查
pnpm check               # Astro + TS

# 3. 构建验证
pnpm build               # 无警告、体积可接受

# 4. 运行测试
pnpm exec playwright test     # # 5. 依赖图检查
pnpm why <package>       # 确认无版本冲突
pnpm dedupe              # 去重
```

**PR 必须包含**：

- [ ] L1 替代方案对比表
- [ ] L2 评估报告 (自动化输出 + 人工判断)
- [ ] L3 验证通过截图/日志
- [ ] 如破坏性变更：迁移指南 + 版本号 bump

---

### 5. 特殊场景处理

| 场景                | 处理方式                                               |
| ------------------- | ------------------------------------------------------ |
| **开发依赖**        | 仅 L1+L2，体积红线放宽至 500KB，无运行时影响           |
| **Peer Dependency** | 必须声明兼容范围，测试矩阵覆盖主版本                   |
| **Git 依赖**        | 仅指向具体 commit/tag，禁用分支引用                    |
| **私有 Registry**   | 需安全审批，配置 `.npmrc` 认证                         |
| **Rust 依赖**       | `cargo add` + `cargo audit` + `cargo tree -d` 检查重复 |
| **Polyfill**        | 记录在 `polyfills.ts`，标注移除条件 (目标环境支持时)   |

---

### 6. 决策记录与 ADR

| 情况                                                     | 记录方式                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| **常规引入**                                             | PR 描述包含 L1-L3 产出，合并即归档                          |
| **架构级依赖** (UI 框架、状态管理、数据库 ORM、构建工具) | 必须创建 ADR (编号 0010+)，记录选型理由、迁移路径、退出策略 |
| **替换现有依赖**                                         | ADR 记录迁移计划、兼容层、回滚点                            |
| **移除依赖**                                             | PR 记录移除原因、影响范围验证                               |

---

### 7. 自动化守护

**CI 新增 Job** (`.github/workflows/dependency-guard.yml` ⏸ 尚未落地)：

```yaml
name: Dependency Guard
on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths:
      - "package.json"
      - "pnpm-lock.yaml"
      - "Cargo.toml"
      - "Cargo.lock"

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - name: Audit
        run: pnpm audit --audit-level=high
      - name: License Check
        run: |
          pnpm licenses list --json | jq -r '.[] | select(.license | test("GPL|AGPL|Proprietary")) | .name' | grep -q . && exit 1 || true
      - name: Size Check (new deps)
        run: |
          # 对比 base 分支，检查新增依赖体积
          # 需实现脚本: scripts/check-dep-size.ts
      - name: Duplicate Check
        run: pnpm dedupe --check || true
```

**PR 模板新增** (`.github/pull_request_template.md`)：

```markdown
## 依赖变更 (如适用)

- [ ] 无依赖变更
- [ ] 新增依赖: <package@version>
  - [ ] L1: 替代方案对比表已完成
  - [ ] L2: 评估报告通过 (安全/许可证/体积/维护)
  - [ ] L3: 本地验证通过 (类型/构建/测试)
  - [ ] 架构级依赖 → 已创建 ADR
- [ ] 更新依赖: <package@old → new>
  - [ ] 变更日志已阅读
  - [ ] 破坏性变更 → 已适配/记录迁移
- [ ] 移除依赖: <package>
  - [ ] 无残留引用
  - [ ] 功能已替代/删除
```

---

### 8. 角色职责

| 角色                      | 职责                                          |
| ------------------------- | --------------------------------------------- |
| **发起者**                | 完成 L1 替代方案对比，发起 PR                 |
| **对应领域工程师**        | 完成 L2 评估 (如 frontend-architect 评 UI 库) |
| **quality-dx-guardian**   | 审核 L2/L3、CI 配置、ADR 合规                 |
| **build-deploy-engineer** | 依赖体积/构建影响、CI 缓存优化                |
| **cli-tool-engineer**     | Rust 依赖评估 (cargo audit/tree)              |

---

### 9. 常用工具速查

| 任务       | 命令/工具                                                    |
| ---------- | ------------------------------------------------------------ |
| 查看依赖树 | `pnpm why <pkg>` / `cargo tree -p <pkg>`                     |
| 检查重复   | `pnpm dedupe --check` / `cargo tree -d`                      |
| 体积分析   | `pnpm dlx bundlephobia <pkg>` / `cargo bloat --crates <pkg>` |
| 许可证扫描 | `pnpm licenses list` / `cargo deny check licenses`           |
| 安全审计   | `pnpm audit` / `cargo audit`                                 |
| 过期检查   | `pnpm outdated` / `cargo outdated`                           |
| 依赖可视化 | `pnpm dlx madge --image dep-graph.png`                       |

---

## Consequences

### Positive

- **零盲目引入**：每个依赖有据可查
- **安全/合规底线**：自动化拦截高危/不合规包
- **体积可控**：显性评估包大小与 tree-shaking
- **可追溯**：PR/ADR 记录决策理由，便于回顾和移除

### Trade-offs

- **前置成本**：L1 对比表约 5-15 分钟
- **流程阻力**：小依赖可能觉得繁琐 (可简化为 PR Checklist)
- **主观判断**：黄线项需团队共识

---

## Implementation Checklist

- [ ] 创建 `scripts/check-dep-size.ts` (新增依赖体积对比)
- [ ] 创建 `.github/workflows/dependency-guard.yml` ⏸
- [ ] 更新 `.github/pull_request_template.md` 增加依赖变更清单
- [ ] 创建 `docs/DEPENDENCY_EVALUATION_TEMPLATE.md` ⏸ (L1 对比表模板)
- [ ] 更新 `AGENTS.md` Skill Usage Guide 增加触发词
- [ ] 更新 `CONTEXT.md` 增加依赖相关术语

---

## Related Documents

- `docs/SECURITY_WHITEPAPER.md#5.3` (供应链安全基线)
- `docs/architecture-map.md#module-dependency-graph` (模块依赖图)
- `package.json` (packageManager: pnpm@11.3.0)
- `Cargo.toml` (Rust 依赖配置)
