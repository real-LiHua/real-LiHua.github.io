# 角色指南：构建部署工程师

**角色 ID**：`build-deploy-engineer`  
**类型**：Platform  
**核心职责**：BuildPipeline 统一管线、Pagefind 索引、Astro 集成、CI/CD 多平台部署、链接/HTML 验证

---

## 1. 核心领域

| 领域 | 关键文件 | 关注点 |
|------|----------|--------|
| **BuildPipeline** | `src/modules/build-pipeline.ts` | 5阶段串行、FileWalker 复用、错误聚合 |
| **Astro 集成** | `src/integrations/build-hooks.ts` | `astro:build:done`、`astro:build:start` 钩子 |
| **Pagefind** | `src/integrations/build-hooks.ts` | 索引生成、模块化 UI 配置 |
| **链接/HTML 验证** | `build-hooks.ts` | `lychee`、`vnu-jar` 配置与阈值 |
| **CI/CD** | `.github/workflows/deploy.yml` | 4平台并行、OIDC、Secret 管理 |
| **Mermaid/Watermark** | `src/integrations/mermaid-compile-time.ts`、`watermark.ts` | 构建时渲染、零宽水印 |

---

## 2. 必读文档

| 文档 | 重点章节 |
|------|----------|
| `AGENTS.md` | Technical Reference → BuildPipeline、Image Optimization、Oxlint/Oxfmt |
| `docs/adr/0001-functional-architecture.md` | 3.2 BuildPipeline Module、C4 Container 视图 |
| `docs/adr/0003-subagent-responsibilities-controls.md` | 角色定义、CI/CD 守护 |
| `docs/adr/0005-knowledge-update-process.md` | L0-L3 触发层、自动化守护脚本 |
| `docs/SECURITY_WHITEPAPER.md` | 5. 构建与部署管线安全、命令参数引号规范 |
| `docs/architecture-map.md` | 构建时数据流、模块依赖图 |

---

## 3. 专属质量门禁

```bash
# 本地预跑
pnpm exec tsx .agents/scripts/run-gate.ts build-deploy-engineer

# 等价于
pnpm tsc -b && pnpm oxlint && pnpm oxfmt --check && pnpm build
lychee dist/client && vnu --skip-non-html dist/client
```

**通过标准**：0 broken links、0 vnu errors、构建产物完整。

---

## 4. 核心交付物

| 交付物 | 位置 | 验收标准 |
|--------|------|----------|
| **BuildPipeline 核心** | `src/modules/build-pipeline.ts` | `execute(distDir)`、`registerStage()`、5阶段串行、错误聚合 |
| **Astro 集成** | `src/integrations/build-hooks.ts` | `astro:build:start` 清理、`astro:build:done` 执行管线 |
| **Pagefind 集成** | `build-hooks.ts` + `PagefindSearch.astro` | 索引生成、模块化 UI、CSS 变量主题适配 |
| **CI/CD 工作流** | `.github/workflows/deploy.yml` | 4平台并行、OIDC、Secret 隔离、依赖审计 |
| **知识库守护** | `.github/workflows/knowledge-guard.yml` | pointers/terms/contracts/regression 并行检查 |
| **知识库脚本** | `.agents/scripts/scan-pointers.ts` 等 | `--fix`、`--report`、CI 注释 |

---

## 6. 核心开发模式

### 6.1 BuildPipeline 核心

```typescript
// src/modules/build-pipeline.ts
export interface BuildStage {
  name: string;
  run: (distDir: URL, logger: AstroIntegrationLogger) => Promise<void>;
  timeout?: number; // ms，默认 60000
}

export interface BuildPipeline {
  execute(distDir: URL, logger: AstroIntegrationLogger): Promise<BuildReport>;
  registerStage(stage: BuildStage): void;
}

// 5阶段默认注册
const stages: BuildStage[] = [
  { name: "pagefind", run: runPagefind },
  { name: "link-check", run: runLychee },
  { name: "html-validate", run: runVnu },
  { name: "mermaid-render", run: runMermaid },
  { name: "watermark", run: runWatermark },
];
```

### 6.2 Astro 集成钩子

```typescript
// src/integrations/build-hooks.ts
export const buildHooksIntegration = (): AstroIntegration => ({
  name: "build-hooks",
  hooks: {
    "astro:build:start": ({ logger }) => {
      // 清理 pagefind public symlink
      if (existsSync(pagefindPublic)) rmSync(pagefindPublic, { recursive: true, force: true });
    },
    "astro:build:done": async ({ logger, dir }) => {
      // 1. Pagefind 索引
      logger.info("Running Pagefind indexing...");
      await runPagefind(dir);
      
      // 2. 链接检查
      logger.info("Running link checker...");
      await runLychee(dir);
      
      // 3. HTML 验证
      logger.info("Running HTML validator...");
      await runVnu(dir);
      
      // 4. Mermaid 渲染
      await runMermaid(dir);
      
      // 5. 水印注入
      await runWatermark(dir);
    },
  },
});
```

### 6.3 文件遍历复用

```typescript
// src/integrations/utils/file-utils.ts
export async function findHtmlFiles(dir: URL): Promise<URL[]> {
  const files: URL[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = new URL(entry.name, dir);
    if (entry.isDirectory()) {
      files.push(...await findHtmlFiles(fullPath));
    } else if (entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}
```

### 6.4 CI/CD 部署配置

```yaml
# .github/workflows/deploy.yml 关键片段
permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  cloudflare:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm build
        env:
          SITE_URL: "${{ secrets.SITE_URL }}"
          CLOUDFLARE_API_TOKEN: "${{ secrets.CLOUDFLARE_API_TOKEN }}"
          CLOUDFLARE_ACCOUNT_ID: "${{ secrets.CLOUDFLARE_ACCOUNT_ID }}"
      - uses: cloudflare/wrangler-action@v3

  codeberg:
    # SSH bare repo push
  
  github:
    uses: withastro/action@v2

  ipfs:
    # Pinata API
```

---

## 5. 专属质量门禁细则

| 检查项 | 工具 | 标准 |
|--------|------|------|
| **链接检查** | `lychee dist/client` | 0 broken links（除显式排除） |
| **HTML 验证** | `vnu --skip-non-html dist/client` | 0 errors |
| **构建** | `pnpm build` | success |
| **类型/格式** | `pnpm tsc -b && pnpm oxlint && pnpm oxfmt --check` | 0 errors/diffs |

---

## 6. 常见任务类型

| 任务类型 | 典型触发 | 关键产出 |
|----------|----------|----------|
| **BuildPipeline 阶段增/删** | 新增验证步骤 | 新增 Stage + 注册 + 超时配置 |
| **CI/CD 平台新增/变更** | 新部署目标 | 新 Job + Secret + OIDC 配置 |
| **Pagefind 配置调整** | 搜索体验优化 | `bundlePath`、`ranking`、`mergeIndex` |
| **Mermaid/Watermark 调优** | 性能/准确度 | 超时配置、选择器优化 |
| **知识库守护脚本** | 新增检查项 | 新脚本 + CI 集成 + PR 注释 |

---

## 7. 常见坑与规避

| 坑 | 症状 | 规避 |
|----|------|------|
| **构建阶段超时** | 阶段卡死、CI 超时 | 每阶段设 `timeout: 60000`、分批处理大文件 |
| **lychee 误报** | 内部链接/锚点报错 | `--exclude-mail`、`--exclude` 排除规则 |
| **vnu 误报** | 无关 HTML 规则报错 | `--filterfile` 排除已知误报 |
| **Pagefind 索引过大** | 构建慢、体积大 | 分片索引、增量更新 |
| **Secret 泄露** | CI 日志输出 Secret | 所有 `env:` 值双引号包裹、不在 `run:` 直接引用 |
| **多平台部署不一致** | 内容差异 | SHA-256 对比 `dist/client` 校验 |

---

## 8. 关键文件清单

```
.github/workflows/
├── deploy.yml              # 4平台部署
└── knowledge-guard.yml     # 知识库守护

src/
├── modules/
│   └── build-pipeline.ts   # 管线核心接口 + 实现
├── integrations/
│   ├── build-hooks.ts       # Astro 集成钩子
│   ├── mermaid-compile-time.ts
│   ├── watermark.ts
│   └── utils/
│       └── file-utils.ts    # 文件遍历复用
├── components/
│   └── PagefindSearch.astro # 搜索 UI 组件
└── layouts/
    └── BaseLayout.astro     # CSP、Pagefind UI、ClientRouter

.agents/scripts/
├── scan-pointers.ts
├── check-terms.ts
├── sync-contracts.ts
├── run-gate.ts
└── check-regression.ts
```

---

## 9. 协作接口

| 依赖角色 | 协作内容 | 接口 |
|----------|----------|------|
| `frontend-architect` | Pagefind UI 组件、CSS 变量 | `searchModule.SearchComponentProps`、`themeSystem` |
| `content-engineer` | 构建产物源数据 | `contentPipeline.getPublishedPosts()` |
| `search-discovery-engineer` | 索引生成配置 | `searchModule.generateIndex()` |
| `quality-dx-guardian` | 门禁配置、CI 守护 | `run-gate.ts`、`knowledge-guard.yml` |
| `cli-tool-engineer` | 发布脚本集成 | CI Job 依赖 |

---

## 10. 学习资源

| 资源 | 链接 |
|------|------|
| Astro Integrations | https://docs.astro.build/en/guides/integrations/ |
| GitHub Actions | https://docs.github.com/en/actions |
| Cloudflare Workers | https://developers.cloudflare.com/workers/ |
| Pagefind | https://pagefind.app/ |
| lychee | https://github.com/lycheeverse/lychee |
| vnu-jar | https://github.com/validator/validator |

---

**核心口诀**：统一管线替代分散钩子 → FileWalker 复用遍历 → 阶段超时保护 → OIDC 免长期凭证 → 知识库守护入 CI → 本地预跑门禁 → 多平台一致性校验