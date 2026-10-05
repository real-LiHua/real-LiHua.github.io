# FAQ 手册

**适用**：所有子智能体  
**版本**：1.0

---

## 1. 入门与环境

### Q: 刚入职，先做什么？
**A**: 按顺序阅读：`AGENTS.md` → `CONTEXT.md` → 你的角色 ADR → `.agents/tasks/TASK_TEMPLATE.md` → 跑通 `pnpm check && pnpm build && pnpm playwright test`。

### Q: 本地环境怎么搭建？
```bash
# 1. 克隆仓库
git clone <repo-url>
cd real-LiHua.github.io

# 2. 安装依赖
corepack enable && corepack prepare pnpm@11 --activate
pnpm install

# 3. 安装 Playwright 浏览器
pnpm playwright install

# 4. 启动开发服务器
pnpm dev  # http://localhost:4321
```

### Q: `pnpm` 报错 `command not found`？
```bash
corepack enable && corepack prepare pnpm@11 --activate
# 或
npm install -g pnpm@11
```

### Q: `oxlint` 报错 `typeAware` 相关错误？
确保 `oxlint.config.ts` 有：
```typescript
export default defineConfig({
  options: { typeAware: true },
  // ...
});
```
并安装 `oxlint-tsgolint`：`pnpm add -D oxlint-tsgolint`

---

## 2. 任务与工作流

### Q: 怎么知道该做哪个任务？
```bash
# 查看当前 Phase 任务
ls .agents/tasks/phase-1/

# 看任务卡 Dependencies 字段，无依赖可并行
```

### Q: 任务卡 `Dependencies` 怎么填？
填必须先完成的任务 ID，如 `["1.1", "1.3"]`。无依赖留空数组 `[]`。

### Q: 任务卡 `Specs` 和 `Contracts` 怎么写？
```markdown
## Inputs
- **Specs**: [docs/adr/0001-functional-architecture.md#3.1-content-pipeline-module]
- **Contracts**: [src/modules/build-pipeline.ts]
```
**规则**：指针必须前置导向词，精确到章节锚点。

### Q: 进度多久更新一次？
**每 30 分钟** 必须 `task-progress`。长任务设置定时器。

### Q: 卡住多久必须上报阻塞？
**> 15 分钟** 无进展必须 `--blocked`。

### Q: 怎么上报阻塞并请求协助？
```bash
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 \
  --blocked "Zod import error: cannot find module 'astro/zod'" \
  --help-from quality-dx-guardian
```

### Q: 任务完成后必须做什么？
```bash
pnpm exec tsx .agents/scripts/task-complete.ts 1.1
# 自动跑：通用门禁 + 角色专属门禁
# 门禁通过 → 任务标记 done
# 门禁失败 → 自动标记 blocked，修复后重跑
```

### Q: 门禁失败能跳过吗？
**仅限紧急且阻塞无法解决**：
```bash
pnpm exec tsx .agents/scripts/task-complete.ts 1.1 --skip-gate
# ⚠️ 记录 gate.failure.json，24h 内必须补门禁
# 连续 2 次跳过 → 升级为架构问题
```

---

## 3. 代码与质量

### Q: 本地怎么跑全量质量检查？
```bash
# 通用
pnpm tsc -b && pnpm oxlint && pnpm oxfmt --check && pnpm build

# 角色专属
pnpm exec tsx .agents/scripts/run-gate.ts frontend-architect
```

### Q: `oxlint` 报错怎么快速修复？
```bash
# 可自动修复的
pnpm oxlint --fix

# 类型感知规则报错 → 检查类型定义、补类型
# 格式规则报错 → pnpm oxfmt --write
```

### Q: `pnpm build` 卡住或报错？
```bash
# 清理重建
rm -rf .astro dist node_modules
pnpm install
pnpm build

# 常见原因：类型错误、组件缺失、内存不足
# 先跑 pnpm check 修类型，再 build
```

### Q: `pnpm playwright test` 挂起/超时？
```bash
# 杀残留进程
pkill -f playwright
pkill -f cargo

# 重装浏览器
pnpm playwright install

# 单独跑某测试
pnpm playwright test tests/e2e/navigation.spec.ts --headed
```

### Q: `cargo test` / `cargo clippy` 失败？
```bash
# 看详细输出
cargo test -- --nocapture
cargo clippy -p post-edit -- -D warnings

# 常见：依赖缺失、类型不匹配、测试断言失败
```

---

## 4. 架构与模块

### Q: 怎么知道该改哪个模块？
查 `src/modules/index.ts` 导出的 7 个模块，对应 ADR 0001 的深度模块边界。

| 模块 | 职责 | 关键文件 |
|------|------|----------|
| `content-pipeline` | 内容集合、渲染、RSS | `src/utils/content.ts` |
| `build-pipeline` | 5阶段构建后处理 | `src/integrations/build-hooks.ts` |
| `theme-system` | CSS Token、主题切换 | `src/styles/theme-tokens.css` |
| `search` | Pagefind 索引、搜索 UI | `src/components/PagefindSearch.astro` |
| `client-runtime` | 9模块注册、生命周期 | `src/scripts/client-entry.ts` |
| `telegram-auth` | 认证墙、JWT、Bot | `src/scripts/telegram-auth.ts` |
| `ui-components` | 复合组件库 | `src/components/` |

### Q: 怎么新增一个深度模块？
1. `src/modules/new-module.ts` 定义接口 + 导出
2. `src/modules/index.ts` 导出
3. `.agents/contracts/new-module.json` 同步契约
4. 实现文件放 `src/...` 内部，不跨模块引用实现
5. 更新 `src/modules/index.ts` 统一导出

### Q: 怎么用 `@/modules` 导入？
确保 `tsconfig.json` 有：
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```
```typescript
import { contentPipeline, buildPipeline } from "@/modules";
```

---

## 5. 样式与主题

### Q: 怎么修改主题色？
编辑 `src/styles/theme-tokens.css` 的 `:root` / `[data-theme="dark"]` 变量，**不要**改 `global.css`。

### Q: 怎么适配 daisyUI 5 主题？
```css
/* theme-tokens.css */
@plugin "daisyui/theme" {
  name: "light";
  --color-primary: oklch(60% 0.15 250);
  /* ... */
}
@plugin "daisyui/theme" {
  name: "dark";
  prefersdark: true;
  --color-primary: oklch(70% 0.15 250);
}
```

### Q: 怎么用 daisyUI 组件？
```astro
<!-- 语义化类名 -->
<button class="btn btn-primary btn-sm rounded-full">按钮</button>
<div class="card card-bordered bg-base-100">卡片</div>
<badge class="badge-primary">标签</badge>
```

---

## 6. 搜索与 Pagefind

### Q: 搜索不工作怎么排查？
```bash
# 1. 确认构建跑了 pagefind
ls dist/client/pagefind/

# 2. 确认 BaseLayout 有 PagefindSearch
grep PagefindSearch src/layouts/BaseLayout.astro

# 3. 检查 CSS 变量
grep --pagefind-ui src/styles/theme-tokens.css
```

### Q: 怎么自定义搜索结果模板？
```html
<pagefind-results>
  <script type="text/pagefind-template">
    <li class="result-item">
      <h3>{{ meta.title }}</h3>
      <a href="{{ url | safeUrl }}">{{ url }}</a>
      <p>{{+ excerpt +}}</p>
    </li>
  </script>
</pagefind-results>
```

---

## 7. Telegram 认证

### Q: 认证流程是怎样的？
```
用户点击「在 Telegram 中打开」→ t.me/bot?start=auth_{postId}
    ↓
Bot 验证群成员 → 签发 JWT (15min)
    ↓
前端轮询验证 → 成功替换内容
```

### Q: Bot Token 在哪配置？
- **本地开发**：`.env` 或 `astro.config.ts` 硬编码（仅开发）
- **生产**：Cloudflare Workers Secret `TELEGRAM_BOT_TOKEN`
- **CI**：GitHub Secret `CLOUDFLARE_API_TOKEN` + Wrangler 部署时注入

### Q: 本地怎么测试认证？
```bash
# 1. 确保文章 frontmatter 有 telegramAuth.enabled: true
# 2. pnpm dev 访问文章页
# 3. 点击「在 Telegram 中打开」→ 模拟或真实 Bot 测试
```

---

## 8. 部署与 CI

### Q: 推送 main 后自动部署哪些平台？
| 平台 | 方式 | 耗时 |
|------|------|------|
| Cloudflare Workers | Wrangler Action | ~2min |
| Codeberg Pages | SSH bare push | ~1min |
| GitHub Pages | withastro/action | ~2min |
| IPFS | Pinata API | ~1min |

### Q: 怎么本地预览 Cloudflare Workers 部署？
```bash
pnpm preview  # 等价于 pnpm build && wrangler dev
```

### Q: CI 失败怎么看日志？
GitHub Actions → 对应 Job → 展开步骤 → 看红色报错行。

### Q: 怎么手动触发 CI？
GitHub Actions → `knowledge-guard.yml` → `Run workflow` → 选 `full: true` 跑完整回归。

---

## 9. 常见报错速查

| 报错 | 原因 | 解决 |
|------|------|------|
| `Cannot find module 'astro/zod'` | 导入路径错 | 用 `import { z } from "astro/zod"` |
| `oxlint: typeAware requires tsgolint` | 缺依赖 | `pnpm add -D oxlint-tsgolint` |
| `playwright: browser not found` | 浏览器未装 | `pnpm playwright install` |
| `cargo: linker not found` | 缺链接器 | Linux: `apt install build-essential` / macOS: `xcode-select --install` |
| `pnpm: command not found` | pnpm 未装 | `corepack enable && corepack prepare pnpm@11 --activate` |
| `port 4321 already in use` | 端口占用 | `lsof -ti:4321 | xargs kill -9` |
| `git: cannot lock ref` | 索引锁 | `rm -f .git/index.lock` |

---

## 9. 联系人

| 问题类型 | 找谁 | 方式 |
|----------|------|------|
| 架构/接口/疑难杂症 | `quality-dx-guardian` | `task-progress --blocked --help-from quality-dx-guardian` |
| 内容管道/类型/渲染 | `content-engineer` | 同上 |
| CI/CD/部署/构建 | `build-deploy-engineer` | 同上 |
| Rust CLI/工具链 | `cli-tool-engineer` | 同上 |
| 搜索/算法/索引 | `search-discovery-engineer` | 同上 |
| UI/组件/样式/a11y | `frontend-architect` | 同上 |

---

**记住**：不确定就问，别硬猜。阻塞 >15min 必须上报。