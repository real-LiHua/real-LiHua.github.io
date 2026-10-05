# Web 安全白皮书

**项目**：real-LiHua 个人博客
**版本**：1.0
**日期**：2026-10-05
**分级**：公开

---

## 1. 概述

本白皮书定义了 real-LiHua 个人博客系统的安全架构、威胁模型、防护措施与合规基线。系统基于 **Astro 7 + Node Adapter (Standalone) + Cloudflare Workers / Codeberg Pages / GitHub Pages / IPFS** 多平台部署，采用 **静态生成 (SSG)** 为主、客户端增强为辅的架构。

### 1.1 资产识别

| 资产                         | 类型                | 机密性 | 完整性 | 可用性 | 说明                                           |
| ---------------------------- | ------------------- | ------ | ------ | ------ | ---------------------------------------------- |
| 文章内容 (Markdown/MDX)      | 代码仓库            | 低     | 高     | 高     | 公开发布，防篡改优先                           |
| **草稿文章**                 | **私有子模块仓库**  | **高** | **高** | **中** | **物理隔离于公开仓库，仅构建时挂载，杜绝泄露** |
| Telegram 群组 ID / Bot Token | 环境变量            | 高     | 高     | 高     | 仅 CI/CD 注入，不入仓库                        |
| 构建产物                     | 部署制品            | 低     | 高     | 高     | 多平台分发，需防篡改                           |
| 访问日志 / 分析数据          | 第三方服务          | 中     | 中     | 中     | Cloudflare Analytics 等                        |
| 用户会话 (Telegram JWT)      | 客户端 localStorage | 高     | 高     | 中     | 短期有效，含群组成员身份证明                   |

### 1.2 合规基线

- **OWASP Top 10 2021** 全项覆盖
- **CSP Level 3** 严格模式
- **Referrer-Policy: strict-origin-when-cross-origin**
- **Permissions-Policy** 最小权限
- **HTTPS 强制** (HSTS preload 就绪)
- **Subresource Integrity (SRI)** 关键第三方资源

---

## 2. 威胁模型 (STRIDE)

| 威胁类别                   | 典型场景                    | 影响资产           | 缓解措施                                   |
| -------------------------- | --------------------------- | ------------------ | ------------------------------------------ |
| **Spoofing**               | 伪造 Telegram Bot 验证响应  | TelegramAuth JWT   | Bot Token 仅服务端持有，JWT 签名验证       |
| **Tampering**              | 修改部署制物注入恶意脚本    | 构建产物、文章内容 | 多平台部署一致性校验、SRI、水印溯源        |
| **Repudiation**            | 否认发布过某文章            | 文章内容           | Git 提交历史、盲水印、IPFS CID 不可变      |
| **Information Disclosure** | 环境变量泄露                | Bot Token          | CI 密文管理、**草稿物理隔离 (私有子模块)** |
| **Denial of Service**      | Pagefind 索引过大、构建超时 | 可用性             | 阶段超时控制、索引分片                     |
| **Elevation of Privilege** | 绕过 Telegram 认证读私有文  | 私有文章           | 服务端 JWT 验证、短过期时间                |

---

## 3. 架构层面防护

### 3.1 网络与传输层

```nginx
# Cloudflare Workers / Pages 自动强制 HTTPS
# HSTS 预加载已提交 hstspreload.org
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- **TLS 1.3 only** (Cloudflare 默认)
- **Certificate Transparency** 监控 (Cloudflare 提供)
- **DNSSEC** 已启用 (域名注册商)

### 3.2 内容安全策略 (CSP)

```html
<!-- BaseLayout.astro 注入 -->
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com data:;
    img-src 'self' data: https:;
    connect-src 'self' https://api.telegram.org wss://*.telegram.org;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
    block-all-mixed-content;
  "
/>
```

**策略说明**：

- `'wasm-unsafe-eval'`：Pagefind WASM 搜索索引加载所需
- `'unsafe-inline'` style：daisyUI/Tailwind 运行时注入、主题切换内联样式
- `connect-src` Telegram Bot API + WebSocket 长轮询
- 所有外部资源显式白名单，无 `*` 通配

### 3.3 安全响应头

| Header                         | 值                                                                                                              | 目的               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------ |
| `X-Content-Type-Options`       | `nosniff`                                                                                                       | 禁止 MIME 嗅探     |
| `X-Frame-Options`              | `DENY`                                                                                                          | 禁止嵌入 iframe    |
| `Referrer-Policy`              | `strict-origin-when-cross-origin`                                                                               | 限制 Referrer 泄露 |
| `Permissions-Policy`           | `accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()` | 禁用无关浏览器 API |
| `Cross-Origin-Opener-Policy`   | `same-origin`                                                                                                   | 隔离浏览上下文     |
| `Cross-Origin-Resource-Policy` | `same-origin`                                                                                                   | 资源跨源保护       |

---

## 4. 应用层防护

### 4.1 静态生成 (SSG) 安全优势

- **无服务端运行时攻击面**：无数据库、无用户输入处理、无会话管理
- **构建时验证**：Content Collections Zod Schema 强制前置数据类型安全
- **不可变部署**：每次部署生成新 CID/版本，历史版本只读

### 4.2 内容管道安全

```typescript
// src/content.config.ts - Zod Schema 强制验证
const blog = defineCollection({
  loader: glob({ base: "./src/posts", pattern: "**/*.md{,x}" }),
  schema: z.object({
    title: z.coerce.string().max(200),
    description: z.string().max(500).optional().nullable(),
    publishDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string().max(50)).optional(),
    authors: z.array(z.string().max(100)).optional(),
    image: z.string().url().optional(),
    telegramAuth: z
      .object({
        enabled: z.boolean(),
        groupId: z.string().regex(/^-?\d+$/), // Telegram group ID 格式
        groupName: z.string().max(100).optional(),
        customMessage: z.string().max(500).optional(),
      })
      .optional(),
  }),
});
```

- **草稿物理隔离**：草稿存放于**私有 Git 子模块仓库** (`git submodule add <private-repo> src/posts/drafts`)，构建时挂载，公开仓库零草稿文件，彻底消除泄露风险
- **路径遍历防护**：`glob` loader 限制 `base` 目录，ID 由文件路径生成
- **XSS 防护**：Markdown 渲染经 satteri + Shiki，无用户输入直接插入 HTML
- **MDX 安全**：`@astrojs/mdx` 默认不执行任意 JSX，仅允许注册组件

### 4.3 Telegram 认证授权

```
┌─────────────┐     1. 用户点击「在 Telegram 中打开」      ┌─────────────┐
│   博客前端   │ ─────────────────────────────────────────▶ │ Telegram App │
└─────────────┘  深度链接: t.me/bot?start=auth_{postId}    └──────┬──────┘
                                                                    │
                                                    2. Bot 验证群成员身份
                                                                    │
                                                    3. 签发短期 JWT (15min)
                                                                    ▼
┌─────────────┐     4. 前端轮询验证状态 ◀────────────────────── ┌─────────────┐
│   博客前端   │ ──────────────────────────────────────────────▶ │  Telegram   │
└─────────────┘  本地存储 JWT，后续访问携带 Authorization       │    Bot      │
                                                    (Grammy)     └─────────────┘
```

**安全控制点**：

- **Bot Token** 仅存在于 Cloudflare Workers 服务端环境变量
- **JWT**：HS256 签名，载荷 `{ postId, userId, groupId, exp }`，15 分钟过期
- **前端轮询**：最大 5 分钟，指数退避，失败不阻塞页面其他功能
- **群组 ID 校验**：正则 `^-?\d+$` 防注入

### 4.4 盲水印溯源

```typescript
// src/integrations/watermark.ts - 零宽字符水印
const ZERO_WIDTH_CHARS = ["\u200B", "\u200C", "\u200D", "\uFEFF"] as const;
// SHA-256(content + siteId) → 16 个零宽字符随机插入文本节点
```

- **仅原创文章**：`authors` 字段为空或 `[]` 视为原创
- **不可感知**：零宽字符不影响渲染，复制粘贴保留
- **验证工具**：`pnpm verify:watermark` 离线校验

### 4.5 客户端脚本安全

| 脚本              | 权限                 | 沙箱隔离   | 完整性校验     |
| ----------------- | -------------------- | ---------- | -------------- |
| theme-toggle      | localStorage 读写    | 无         | 内联 CSP nonce |
| toc               | DOM 读取             | 无         | 内联 CSP nonce |
| reading-progress  | scroll 监听          | 无         | 内联 CSP nonce |
| scroll-reveal     | IntersectionObserver | 无         | 内联 CSP nonce |
| tilt-card         | mousemove 监听       | 无         | 内联 CSP nonce |
| code-copy         | Clipboard API        | 需用户手势 | 内联 CSP nonce |
| telegram-auth     | fetch + localStorage | 同源       | 内联 CSP nonce |
| gravatar-fallback | img onerror          | 同源       | 内联 CSP nonce |

**统一入口**：`client-entry.ts` 单一注册点，便于审计与禁用。

---

## 5. 构建与部署管线安全

### 5.1 CI/CD 安全 (GitHub Actions)

```yaml
# .github/workflows/deploy.yml 关键安全实践
permissions:
  contents: read
  pages: write
  id-token: write # OIDC 认证部署

jobs:
  cloudflare:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - name: Build
        run: pnpm build
        env:
          SITE_URL: "${{ secrets.SITE_URL }}"
          CLOUDFLARE_API_TOKEN: "${{ secrets.CLOUDFLARE_API_TOKEN }}"
          CLOUDFLARE_ACCOUNT_ID: "${{ secrets.CLOUDFLARE_ACCOUNT_ID }}"
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        # 无需额外 secret，使用 OIDC
```

> **引号规范**：所有 `env:` 值与 `run:` 中的变量引用均用双引号包裹，防止词分割与命令注入。详见 [第 10 节引号规范](#10-命令参数引号规范)。

**关键控制**：

- **最小权限**：`contents: read`，仅部署步骤 `pages: write` / `id-token: write`
- **Secret 隔离**：每平台独立 Secret，无共享 Token
- **OIDC 认证**：Cloudflare / GitHub Pages 使用 Workload Identity Federation，无长期凭证
- **SSH 密钥轮换**：Codeberg 部署密钥 90 天轮换
- **依赖审计**：`pnpm audit` 每次构建运行，高危阻断

### 5.2 构建管线阶段安全 (BuildPipeline)

| 阶段                        | 安全控制                                                  | 失败处理        |
| --------------------------- | --------------------------------------------------------- | --------------- |
| **Pagefind**                | 仅索引 `dist/client` 静态文件，无外部请求                 | 记录错误，继续  |
| **Link Check (lychee)**     | `--exclude-mail` 跳过 mailto，`--max-concurrency 10` 限速 | 非 0 退出码阻断 |
| **HTML Validate (vnu-jar)** | `--skip-non-html`、`--filterfile` 排除已知误报            | 记录错误，继续  |
| **Mermaid Render**          | `securityLevel: "loose"` 仅渲染可信代码块，无外部加载     | 单文件失败跳过  |
| **Watermark Inject**        | 仅处理 `posts/*.html`，校验 `authors` 字段                | 单文件失败跳过  |

**阶段隔离**：每阶段独立 `try/catch`，超时 60s，错误聚合最后汇报。

**子模块挂载流程**：CI 构建前执行 `git submodule update --init --recursive`，私有仓库通过 Deploy Key 只读访问，构建产物不包含 `.git` 目录。

### 5.3 供应链安全

```json
// package.json - 依赖锁定
{
  "packageManager": "pnpm@11.3.0",
  "dependencies": {
    "astro": "^7.3.5", // 精确次版本锁定
    "daisyui": "^5.7.47",
    "tailwindcss": "^4.3.3"
  }
}
```

- **lockfile 入库**：`pnpm-lock.yaml` 提交 Git
- **依赖固定版本**：`^` 仅允许补丁升级，主/次版本手动升级
- **定期审计**：`pnpm audit --registry https://registry.npmjs.org/` CI 集成
- **恶意包监控**：GitHub Dependabot + `npm audit signatures`

---

## 6. 数据保护与隐私

### 6.1 个人数据处理

| 数据类型          | 来源                 | 存储位置                      | 保留期限        | 法律依据                |
| ----------------- | -------------------- | ----------------------------- | --------------- | ----------------------- |
| Telegram User ID  | Bot 验证             | JWT 载荷 (客户端)             | 15 分钟         | 合同履行 (访问控制)     |
| 群组成员身份      | Bot API              | 不持久化                      | 即时            | 合同履行                |
| 访问日志 (IP、UA) | Cloudflare Analytics | Cloudflare 边缘               | 30 天           | 合法利益 (安全分析)     |
| 主题偏好          | 用户选择             | localStorage                  | 永久 (用户控制) | 同意                    |
| **草稿内容**      | **作者编写**         | **私有子模块仓库 (加密存储)** | **作者控制**    | **合同履行 (创作过程)** |

**最小化原则**：不收集姓名、邮箱、Cookie、指纹、行为追踪。**草稿物理隔离于公开部署管线，仅作者可见**。

### 6.2 数据主体权利

- **访问权**：用户可在浏览器 DevTools 查看 localStorage 所有数据
- **删除权**：清除浏览器站点数据即删除所有本地存储
- **可携带权**：文章内容公开可导出，无专有格式锁定
- **拒绝画像**：无画像系统，无第三方追踪脚本

---

## 7. 事件响应

### 7.1 响应流程

```
发现事件
    │
    ├─▶ 确认严重级 (P0/P1/P2)
    │       P0: 恶意代码注入、凭证泄露、大规模篡改
    │       P1: 单页面篡改、认证绕过、构建管线被污染
    │       P2: 信息泄露 (非敏感)、轻微配置错误
    │
    ├─▶ 隔离 (P0/P1)
    │       - 回滚部署 (Cloudflare: `wrangler rollback`)
    │       - 撤销受损 Secret (GitHub Settings → Secrets)
    │       - 禁用 Telegram Bot (`/revoke` BotFather)
    │
    ├─▶ 取证
    │       - Git 提交历史排查
    │       - Cloudflare WAF 日志分析
    │       - 构建日志 (GitHub Actions) 审计
    │       - IPFS CID 对比验证
    │
    ├─▶ 修复
    │       - 代码修补 + 重新部署
    │       - Secret 轮换
    │       - 依赖升级/替换
    │
    └─▶ 复盘 (48h 内)
            - 根因分析 (5 Whys)
            - 改进措施入 ADR
            - 更新白皮书版本
```

### 7.2 关键联系人

| 角色            | 联系方式                 | 职责                 |
| --------------- | ------------------------ | -------------------- |
| 站点所有者      | GitHub Issues / Telegram | 决策、对外沟通       |
| Cloudflare 支持 | Cloudflare Dashboard     | WAF/边缘配置紧急变更 |
| GitHub 支持     | GitHub Support Portal    | Actions/Secrets 事件 |
| Codeberg 管理员 | Codeberg 实例管理        | Pages 部署异常       |

---

## 8. 安全测试与验证

### 8.1 自动化测试 (CI 集成)

```bash
# 每次 PR 运行（参数均按引号规范书写）
pnpm check          # TypeScript + Astro 类型检查
pnpm oxlint         # 静态代码分析 (安全规则集)
pnpm oxfmt --check  # 格式一致性
pnpm build          # 完整构建 + Pagefind + lychee + vnu
pnpm playwright test  # E2E: CSP 生效、认证流程、水印验证
```

> **注意**：所有命令参数均遵循 [第 10 节引号规范](#10-命令参数引号规范)。CI 中含变量/路径的命令必须用双引号包裹，详见 `10.3 CI/CD 中的强制规范`。

### 8.2 定期渗透测试

| 频率   | 范围             | 工具/方法                          |
| ------ | ---------------- | ---------------------------------- |
| 每周   | 依赖漏洞扫描     | `pnpm audit`、GitHub Dependabot    |
| 每月   | CSP/Headers 审计 | `securityheaders.com`、Observatory |
| 每季度 | 完整渗透测试     | OWASP ZAP 自动扫描 + 手工验证      |
| 每年   | 架构威胁建模更新 | STRIDE 重评、ADR 审查              |

### 8.3 安全基线清单 (发布前)

- [ ] CSP 报告模式 (`Content-Security-Policy-Report-Only`) 无违规
- [ ] `pnpm audit` 0 高危、0 严重
- [ ] `lychee` 无死链 (除外显式排除)
- [ ] `vnu-jar` 无 Error 级别违规
- [ ] Telegram Bot Token 未出现在任何构建产物中
- [ ] 水印验证通过 (`pnpm verify:watermark`)
- [ ] 多平台部署内容一致性校验 (SHA-256 对比)
- [ ] 所有 CI/CD 命令参数符合 [第 10 节引号规范](#10-命令参数引号规范)
- [ ] 无裸露变量/Secret 直接出现在命令行参数中

---

## 9. 事件历史与经验沉淀

| 日期       | 事件           | 根因 | 改进措施 | ADR  |
| ---------- | -------------- | ---- | -------- | ---- |
| 2026-XX-XX | 初版白皮书发布 | —    | 建立基线 | 0001 |

---

## 10. 命令参数引号规范

为防止命令注入、参数分割等风险，**所有含参数的命令必须遵循以下引号规范**：

### 10.1 核心原则

| 场景                    | 规则                       | 示例                               |
| ----------------------- | -------------------------- | ---------------------------------- | ------------ |
| **参数含空格/特殊字符** | 必须用双引号包裹           | `git commit -m "feat: add search"` |
| **参数为变量/Secret**   | 必须用双引号包裹           | `echo "${SECRET}"`                 |
| **参数为路径**          | 必须用双引号包裹           | `cp "src/file name.md" "dist/"`    |
| **命令子串/管道**       | 整体用双引号，内部单引号   | `sh -c "grep 'pattern' file.txt"`  |
| **JSON/复杂结构**       | 单引号包裹整体，内部双引号 | `jq -r '.key                       | "\(.name)"'` |

### 10.2 禁止模式

| ❌ 错误写法           | ✅ 正确写法             | 风险                     |
| --------------------- | ----------------------- | ------------------------ |
| `cmd arg with spaces` | `cmd "arg with spaces"` | 参数被拆分为多个         |
| `cmd $VAR`            | `cmd "$VAR"`            | 空值导致参数丢失、词分割 |
| `cmd $(cmd)`          | `cmd "$(cmd)"`          | 命令替换结果被词分割     |
| `sh -c cmd arg`       | `sh -c "cmd arg"`       | 仅第一个词作为命令       |
| `echo $SECRET`        | `echo "$SECRET"`        | Secret 泄露到进程表/日志 |

### 10.3 CI/CD 中的强制规范

```yaml
# .github/workflows/*.yml
# ❌ 错误
run: pnpm build --out-dir dist/client

# ✅ 正确
run: pnpm build --out-dir "dist/client"

# ❌ 错误：Secret 直接展开
env:
  API_TOKEN: ${{ secrets.API_TOKEN }}
run: curl -H "Authorization: Bearer $API_TOKEN" ...

# ✅ 正确：双引号包裹
env:
  API_TOKEN: ${{ secrets.API_TOKEN }}
run: curl -H "Authorization: Bearer \"$API_TOKEN\"" ...

# ❌ 错误：多行脚本无引号
run: |
  git add .
  git commit -m $MESSAGE

# ✅ 正确：双引号包裹变量
run: |
  git add .
  git commit -m "$MESSAGE"
```

### 10.4 脚本文件中的规范

```bash
#!/usr/bin/env bash
# 脚本内部同样适用

# ❌ 错误
git commit -m $1

# ✅ 正确
git commit -m "$1"

# ❌ 错误：数组展开无引号
files=("src/a.md" "src/b.md")
git add ${files[@]}

# ✅ 正确：引号保护数组元素
git add "${files[@]}"

# ❌ 错误：命令替换无引号
output=$(grep "pattern" file.txt)
echo $output

# ✅ 正确
output=$(grep "pattern" file.txt)
echo "$output"
```

### 10.5 Node.js / pnpm 脚本中的规范

```json
// package.json
{
  "scripts": {
    // ❌ 错误：参数无引号
    "build": "astro build --out-dir dist/client",

    // ✅ 正确：参数带引号
    "build": "astro build --out-dir \"dist/client\"",

    // ✅ 更安全：使用环境变量
    "build": "astro build --out-dir \"${OUT_DIR:-dist/client}\""
  }
}
```

### 10.6 审计清单

代码审查/安全审计时检查：

- [ ] 所有 `run:` / `script:` 中的变量是否用双引号包裹
- [ ] 所有含空格路径/参数是否用双引号包裹
- [ ] `sh -c` / `bash -c` 后的命令字符串是否整体用双引号
- [ ] Secret/Token 是否仅在双引号内引用，未出现在命令行参数位置
- [ ] 数组展开 `${arr[@]}` 是否用 `"${arr[@]}"`
- [ ] 命令替换 `$(...)` 结果是否用双引号包裹

---

## 11. 附录

### A. 安全相关配置文件清单

| 文件                              | 安全相关内容                                                             |
| --------------------------------- | ------------------------------------------------------------------------ |
| `astro.config.ts`                 | `security: { checkOrigin: false }` (开发便利，生产无影响)、CSP meta 注入 |
| `src/layouts/BaseLayout.astro`    | CSP、安全响应头、ClientRouter、Pagefind UI                               |
| `src/integrations/build-hooks.ts` | 构建阶段安全控制 (超时、错误隔离)                                        |
| `src/integrations/watermark.ts`   | 盲水印注入逻辑                                                           |
| `src/scripts/telegram-auth.ts`    | 客户端认证流程、JWT 校验                                                 |
| `.github/workflows/deploy.yml`    | CI/CD 权限、Secret 管理、OIDC                                            |
| `wrangler.jsonc`                  | Cloudflare Workers 绑定、环境变量                                        |
| `src/content.config.ts`           | Zod Schema 输入验证                                                      |

### B. 威胁建模数据流图 (DFD)

```
[用户浏览器] ──HTTPS──▶ [Cloudflare Edge] ──▶ [静态资源 / Workers]
    │                          │                    │
    │                    WAF 规则              KV 存储 (Bot Token)
    │                          │                    │
    ▼                          ▼                    ▼
[localStorage]           [Analytics]          [Telegram API]
(JWT, theme)             (匿名指标)            (群成员验证)
```

### C. 密钥管理策略

| 密钥                    | 存储                      | 轮换周期 | 撤销流程                          |
| ----------------------- | ------------------------- | -------- | --------------------------------- |
| Cloudflare API Token    | GitHub Secrets            | 90 天    | Settings → Secrets 删除 + 新建    |
| Telegram Bot Token      | Cloudflare Workers Secret | 90 天    | BotFather `/revoke` + 重新部署    |
| Codeberg SSH Deploy Key | GitHub Secrets            | 90 天    | Codeberg Settings 删除公钥 + 新建 |
| Pinata JWT              | GitHub Secrets            | 90 天    | Pinata Dashboard 撤销 + 新建      |
| JWT 签名密钥            | Cloudflare Workers Secret | 180 天   | 重新部署 Worker (旧 JWT 自动失效) |

---

## 11. 版本历史

| 版本 | 日期       | 作者       | 变更摘要                                                |
| ---- | ---------- | ---------- | ------------------------------------------------------- |
| 1.1  | 2026-10-05 | real-LiHua | 新增第 10 节命令参数引号规范，CI/CD 与安全基线同步更新  |
| 1.0  | 2026-10-05 | real-LiHua | 初版：覆盖架构、威胁模型、CSP、认证、构建管线、事件响应 |

---

**文档控制**：本白皮书随架构重构同步更新，重大变更需 ADR 记录。最新版本见仓库 `docs/SECURITY_WHITEPAPER.md`。
