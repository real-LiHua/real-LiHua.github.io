# 最佳实践手册

**适用**：所有子智能体  
**版本**：1.0

---

## 1. 代码编写规范

### 1.1 TypeScript

```typescript
// ✅ 好：显式类型、readonly、严格模式
interface BuildStage {
  readonly name: string;
  readonly run: (distDir: URL, logger: AstroIntegrationLogger) => Promise<void>;
  readonly timeout?: number;
}

// ❌ 坏：any、隐式 any、未使用变量
function bad(x: any) { const y = 1; }

// ✅ 好：unknown 代替 any、显式类型守卫
function good(x: unknown): x is BuildStage {
  return typeof x === "object" && x !== null && "name" in x;
}
```

### 1.2 Astro 组件

```astro
---
// ✅ 好：Props 显式类型、JSDoc、最小 Props
interface Props {
  /** 文章标题 */
  title: string;
  /** 可选描述 */
  description?: string;
}

const { title, description } = Astro.props;
---

<h1>{title}</h1>
{description && <p>{description}</p>}
```

### 1.3 CSS / Tailwind

```css
/* ✅ 好：语义化类名、CSS 变量、响应式 */
.card {
  @apply bg-base-100 border border-base-200 rounded-box shadow-sm;
  transition: all 0.3s ease;
}

.card:hover {
  @apply border-primary/30 shadow-lg shadow-primary/5;
}

/* ❌ 坏：魔法数值、硬编码颜色 */
.bad { margin: 17px; color: #333; }
```

---

## 2. Git 与提交规范

### 2.1 分支策略

| 分支 | 用途 | 命名 |
|------|------|------|
| `main` | 生产就绪 | 仅通过 PR 合并 |
| `feat/*` | 新功能 | `feat/content-pipeline-types` |
| `fix/*` | 修复 | `fix/theme-toggle-hydration` |
| `refactor/*` | 重构 | `refactor/build-pipeline-stages` |
| `chore/*` | 维护 | `chore/update-deps` |

### 2.2 提交信息

```bash
# 格式：<type>(<scope>): <description>
# 类型：feat | fix | refactor | chore | docs | test | perf | ci

# 示例
git commit -m "feat(content): export PostFrontmatter type"
git commit -m "fix(theme): resolve hydration mismatch on toggle"
git commit -m "refactor(build): unify 5 stages into BuildPipeline"
git commit -m "chore(deps): update astro to 7.3.5"
```

### 2.3 PR 标题

```
[component] Brief description

# 示例
[content] Export PostFrontmatter and TelegramAuthConfig types
[build] Unify 5 build stages into single BuildPipeline
[ui] Add PagefindSearch component with daisyUI theming
```

---

## 3. 架构原则

### 3.1 深度模块

| 原则 | 说明 |
|------|------|
| **小接口** | 导出 ≤ 6 个公共方法 |
| **大实现** | 封装复杂逻辑、错误处理、副作用 |
| **单一职责** | 每模块只做一件事 |
| **契约先行** | 先定 `.agents/contracts/` 接口，再实现 |

### 3.2 复合组件模式

```astro
<!-- ✅ 好：复合组件，插槽灵活 -->
<Navbar>
  <Navbar.Start><Logo /></Navbar.Start>
  <Navbar.Center links={[{href:"/", label:"首页"}]} />
  <Navbar.End><ThemeToggle /></Navbar.End>
</Navbar>

<!-- ❌ 坏：布尔属性爆炸 -->
<Navbar showLogo showSearch showThemeToggle showMobileMenu />
```

### 3.3 依赖方向

```
页面/布局 → 模块接口 → 实现细节
    ↓
深度模块（隐藏复杂度）
```

**禁止**：页面直接 import 实现文件、跨模块访问私有实现

---

## 4. 安全实践

### 4.1 命令参数引号规范（白皮书第 10 节）

| ✅ 必须 | ❌ 禁止 |
|--------|--------|
| `cmd "arg with spaces"` | `cmd arg with spaces` |
| `cmd "$VAR"` | `cmd $VAR` |
| `sh -c "cmd arg"` | `sh -c cmd arg` |
| `git commit -m "$MSG"` | `git commit -m $MSG` |
| `echo "$SECRET"` | `echo $SECRET` |

### 4.2 密钥管理

| 密钥 | 存储位置 | 访问 |
|------|----------|------|
| Cloudflare API Token | GitHub Secrets | build-deploy-engineer |
| Telegram Bot Token | Cloudflare Workers Secret | build-deploy-engineer |
| Codeberg SSH Key | GitHub Secrets | build-deploy-engineer |
| Pinata JWT | GitHub Secrets | build-deploy-engineer |
| JWT 签名密钥 | Cloudflare Workers Secret | build-deploy-engineer |

**禁止**：硬编码密钥、提交到 Git、日志输出 Secret

### 4.3 CSP 合规

- 所有内联脚本必须有 `nonce` 或 `sha256-` 哈希
- 外部资源仅白名单域名
- `frame-ancestors 'none'` 防点击劫持

---

## 5. 性能实践

| 维度 | 目标 | 手段 |
|------|------|------|
| **构建时长** | < 3 分钟 | 并行阶段、增量构建、缓存 |
| **Pagefind 索引** | < 100KB gzipped | 增量索引、分片 |
| **首屏 LCP** | < 2.5s | 关键 CSS 内联、字体预加载、图片优化 |
| **JS 体积** | < 50KB gzipped | 代码分割、Tree-shaking、最小化运行时 |

---

## 6. 文档维护

| 动作 | 频率 | 责任 |
|------|------|------|
| 术语同步 | Phase 结束 | quality-dx-guardian |
| ADR 过期审查 | 季度 | 全员 |
| 指针扫描 | 月度 | quality-dx-guardian |
| 任务卡归档 | Phase 完成 | 对应角色 |
| 健康度评估 | 季度 | 全员 |

---

## 7. 代码审查清单

### 提交前自查
- [ ] `pnpm check && pnpm build` 通过
- [ ] `pnpm oxlint && pnpm oxfmt --check` 通过
- [ ] 无 `any` 泄漏、无未使用变量
- [ ] 类型定义在 `src/modules/types.ts` 或模块内
- [ ] 接口变更同步 `.agents/contracts/`
- [ ] 新术语已入 `CONTEXT.md`

### Reviewer 检查
- [ ] 架构一致性（模块边界、依赖方向）
- [ ] 类型安全（无 `any`、泛型约束合理）
- [ ] 错误处理完整（try/catch、Result 类型）
- [ ] 测试覆盖（新功能有 E2E/单测）
- [ ] 文档同步（AGENTS.md、CONTEXT.md、ADR）
- [ ] 安全合规（引号规范、无硬编码密钥、CSP）

---

## 8. 重构原则

| 原则 | 实践 |
|------|------|
| **契约先行** | 先改接口契约，再改实现，最后改调用方 |
| **增量迁移** | 保留旧实现，新增新实现，逐步切换，最后删除旧 |
| **单一职责拆分** | 大文件 → 多个小模块，各司其职 |
| **消除布尔爆炸** | 复合组件 / 策略模式 / 状态机 |
| **类型收窄** | `unknown` → 守卫 → 具体类型，避免 `as` |

---

## 9. 避坑指南

| 坑 | 症状 | 规避 |
|----|------|------|
| `remark/rehype` 已弃用 | 构建警告、类型报错 | 全面迁移到 Satteri (`@astrojs/markdown-satteri`) |
| `oxlint` 类型感知未开启 | 漏报类型错误 | `oxlint.config.ts` 加 `options: { typeAware: true }` |
| `oxfmt` Tailwind 类未排序 | 格式不一致 | `oxfmt.config.ts` 默认已启用 |
| 任务卡改同一文件冲突 | Git 冲突频发 | 共享文件 = 串行，或拆分更细粒度 |
| 指针失效 | 文档链接 404 | 重构后跑 `scan-pointers --fix` |
| 术语定义漂移 | 同一概念多定义 | 仅 CONTEXT.md 定义，别处引用 |
| 变量裸露命令行 | 注入风险、参数分割 | 全量双引号包裹 |

---

**核心口诀**：契约先行 → 深度模块 → 复合组件 → 双引号包裹 → 本地预跑门禁 → CI 绿灯合并