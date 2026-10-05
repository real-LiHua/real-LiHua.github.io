# 子智能体入职手册

**项目**：real-LiHua 个人博客  
**版本**：1.0  
**更新**：2026-10-05  
**适用对象**：所有新入职子智能体（6 角色）

---

## 1. 项目速览

| 维度 | 说明 |
|------|------|
| **栈** | Astro 7 + MDX + Content Collections + Tailwind CSS 4 + daisyUI 5 + Pagefind |
| **部署** | Cloudflare Workers / Codeberg Pages / GitHub Pages / IPFS (Pinata) |
| **代码质量** | oxlint + oxfmt + TypeScript strict + Playwright E2E |
| **CLI** | Rust `post-edit` (交互式文章管理) |
| **架构风格** | 7 个深度模块 + 6 角色子智能体协作 |

---

## 2. 核心文档地图（必读顺序）

```
L1 (必读)          L2 (按需)                    L3 (实现)
├── AGENTS.md      ├── CONTEXT.md (33术语)      ├── src/modules/*.ts (7模块接口)
├── REFACTOR_PLAN.md├── docs/adr/0001-0005.md   ├── package.json scripts
└── 任务卡          ├── SECURITY_WHITEPAPER.md  ├── .agents/scripts/*.ts
                    ├── SUBAGENT_OPERATIONS.md  └── .github/workflows/*
```

**首日必读**：AGENTS.md → CONTEXT.md → 你的角色 ADR → 任务卡模板

---

## 3. 角色与职责（6 角色）

| 角色 ID | 类型 | 核心领域 | 专属质量门禁 |
|---------|------|----------|--------------|
| `frontend-architect` | Stream | 组件、主题、View Transitions、a11y | Playwright Chromium |
| `content-engineer` | Stream | Content Collections、MDX、Zod、RSS | 内容管道+RSS验证 |
| `build-deploy-engineer` | Platform | BuildPipeline、Pagefind、CI/CD 4平台 | lychee + vnu |
| `cli-tool-engineer` | Platform | post-edit (Rust)、CLI 发布 | cargo test/clippy/audit |
| `search-discovery-engineer` | Complicated | Pagefind 索引、搜索 UI、算法 | Pagefind 索引存在 |
| `quality-dx-guardian` | Enabling | oxlint/oxfmt/TS/Playwright/ADR 治理 | 全套 Playwright |

**你的角色** = 任务卡 `Assignee` 字段。跨角色协作走 `--help-from`。

---

## 4. 日常工作流（5 步）

```bash
# 1. 领取任务
pnpm exec tsx .agents/scripts/task-claim.ts 1.1 --assignee <你的角色>

# 2. 每 30min 心跳
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 50 --msg "Exported types"

# 3. 遇阻塞 >15min 必报
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 --blocked "Need schema" --help-from quality-dx-guardian

# 4. 完成跑门禁
pnpm exec tsx .agents/scripts/task-complete.ts 1.1
# 自动跑：tsc, oxlint, oxfmt, build + 角色专属门禁

# 5. Phase 结束验收
pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1
```

---

## 5. 关键命令速查

| 场景 | 命令 |
|------|------|
| **跑全量质量门禁** | `pnpm exec tsx .agents/scripts/run-gate.ts <你的角色>` |
| **指针扫描/修复** | `pnpm exec tsx .agents/scripts/scan-pointers.ts [--fix] [--report]` |
| **术语一致性** | `pnpm exec tsx .agents/scripts/check-terms.ts [--report]` |
| **契约同步** | `pnpm exec tsx .agents/scripts/sync-contracts.ts [--report]` |
| **回归检查** | `pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1` |
| **开发/构建/测试** | `pnpm dev` / `pnpm build` / `pnpm playwright test` |

---

## 6. 质量门禁（必须通过）

### 通用门禁（所有角色）
```bash
pnpm tsc -b       # 0 errors
pnpm oxlint       # 0 errors
pnpm oxfmt --check # 0 diffs
pnpm build        # success
```

### 角色专属门禁
| 角色 | 专属命令 |
|------|----------|
| frontend-architect | `pnpm playwright test --project=chromium` |
| content-engineer | `pnpm build && node -e "require('./dist/server/entry.mjs')"` |
| build-deploy-engineer | `lychee dist/client && vnu --skip-non-html dist/client` |
| cli-tool-engineer | `cargo test && cargo clippy -p post-edit && cargo audit` |
| search-discovery-engineer | `pnpm build && ls dist/client/pagefind/*.json` |
| quality-dx-guardian | `pnpm playwright test` |

**门禁失败** → 自动标记任务 `blocked` → 修复后重新 `task-complete` → 连续 3 次失败升级为 ADR。

---

## 7. 关键规范（红线）

| 规范 | 说明 |
|------|------|
| **只读任务卡** | 执行前完整阅读 `.agents/tasks/phase-X/N.md` |
| **心跳 30min** | 长任务每 30min 必须 `task-progress` |
| **阻塞即报** | 卡住 >15min 必须 `task-progress --blocked` |
| **产出物声明** | `task-complete` 前明确输出文件列表 |
| **门禁自检** | `task-complete` 自动跑通用+专属门禁 |
| **契约先行** | 接口变更先更新 `.agents/contracts/` 再实现 |
| **引号规范** | 所有命令参数必须双引号包裹（详见白皮书第 10 节） |
| **术语单一源头** | 新术语先改 CONTEXT.md，再在别处使用 |

---

## 8. 术语速查（33 核心术语）

| 术语 | 含义 |
|------|------|
| **Satteri** | 替代 remark/rehype 的 Markdown 处理器 (`@astrojs/markdown-satteri`) |
| **BuildPipeline** | 5阶段：Pagefind → lychee → vnu → Mermaid → Watermark |
| **ClientRuntime** | 统一客户端入口 + 9模块注册表 + 生命周期分发 |
| **ThemeSystem** | CSS Token + daisyUI 主题 + prose 适配 + 运行时切换 |
| **Deep Module** | 小接口大实现 (Ousterhout) |
| **Seam** | 模块接口位置 (Feathers 术语) |
| **PrivateSubmodule** | 私有 Git 子模块挂载 drafts/，Deploy Key 只读 |

> 全量术语见 `CONTEXT.md`，新术语**必须**先入 CONTEXT.md。

---

## 9. 常用 API 模式

### Content Collections
```typescript
import { getCollection, render } from "astro:content";
const posts = await getCollection("blog", ({ id }) => !id.startsWith("drafts/"));
const { Content, headings } = await render(post);
```

### View Transitions
```astro
---
import { ClientRouter } from "astro:transitions";
---
<ClientRouter fallback="animate" />
<script is:inline>
  document.addEventListener("astro:page-load", () => { /* ... */ });
</script>
```

### Client Module 规范
```typescript
// 每模块导出 init(ctx)
export function init(ctx: ClientContext): void | Promise<void> {
  ctx.routerEvents.onPageLoad(() => { /* ... */ });
}
```

---

## 10. 故障排查速查

| 现象 | 原因 | 解决 |
|------|------|------|
| `task-claim` 找不到任务 | 路径错误 | 检查 `.agents/tasks/phase-X/` |
| `task-complete` 门禁挂起 | 端口占用/进程残留 | `pkill -f playwright; pkill -f cargo` |
| `check-regression` 报错 | git stash 冲突 | 手动 `git stash; git checkout <sha>; ...` |
| 进度文件不更新 | 权限问题 | `chmod +x .agents/scripts/*.ts` |
| `pnpm oxlint` 报错 | 类型感知未配置 | 检查 `oxlint.config.ts` 有 `typeAware: true` |

---

## 11. 资源链接

| 资源 | 链接 |
|------|------|
| **操作手册** | `docs/SUBAGENT_OPERATIONS.md` |
| **快速导航** | `docs/KNOWLEDGE_BASE_QUICKREF.md` |
| **架构决策** | `docs/adr/0001-0005.md` |
| **安全白皮书** | `docs/SECURITY_WHITEPAPER.md` |
| **重构计划** | `REFACTOR_PLAN.md` |
| **CI 工作流** | `.github/workflows/knowledge-guard.yml` |
| **PR 模板** | `.github/pull_request_template.md` |

---

## 12. 首周清单

- [ ] 读完 L1 文档（AGENTS.md + CONTEXT.md）
- [ ] 读完你的角色 ADR + 专属门禁
- [ ] 跑通 `pnpm check && pnpm build && pnpm playwright test`
- [ ] 完成一张任务卡全流程（claim → progress → complete）
- [ ] 配置本地 `oxlint.config.ts` `typeAware: true`
- [ ] 熟悉 `.agents/scripts/` 5 个核心脚本用法
- [ ] 阅读 `docs/KNOWLEDGE_BASE_QUICKREF.md` 术语表

---

## 13. 求助渠道

| 问题类型 | 找谁 | 方式 |
|----------|------|------|
| 架构/接口设计 | `quality-dx-guardian` | `task-progress --blocked --help-from quality-dx-guardian` |
| 内容管道/类型 | `content-engineer` | 同上 |
| CI/CD/部署 | `build-deploy-engineer` | 同上 |
| CLI/Rust | `cli-tool-engineer` | 同上 |
| 搜索/算法 | `search-discovery-engineer` | 同上 |
| UI/组件/样式 | `frontend-architect` | 同上 |

---

**欢迎加入！**  
遵循「只读任务卡 → 心跳更新 → 阻塞即报 → 产出物声明 → 门禁自检」五步法，你就能顺利交付高质量增量。

---

*文档版本：1.0 | 维护：quality-dx-guardian | 下次评审：Phase 1 结束*