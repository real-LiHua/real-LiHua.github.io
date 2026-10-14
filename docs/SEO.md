# SEO 与元数据 (SEO & Metadata)

**Status**: Draft — 现状梳理 + 待办
**Date**: 2026-10-09
**适用范围**: 站点级与文章级 SEO、订阅、结构化数据
**关系**:

- 术语定义见 `CONTEXT.md`（RSSFeed、Sitemap、RSSGeneration、SitemapGeneration、DeployTarget 等）
- 部署目标见 `docs/adr/0003-deployment-strategy.md`
- 文章元数据字段见 `docs/CONTENT_GUIDE.md` §3
- `<head>` 注入点位于 `BaseLayout.astro`

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

---

## 1. 站点 URL 与 canonical

| 项                 | 值                                  | 来源                         |
| ------------------ | ----------------------------------- | ---------------------------- |
| 主站 URL（`site`） | `https://real-lihua.github.io`      | `astro.config.ts` `site`     |
| Codeberg Pages     | `https://lihua.codeberg.page`       | `docs/adr/0003`、`README.md` |
| IPFS (Pinata)      | `ipfs://<CID>`（当前禁用）          | `docs/adr/0003`              |
| tgcloud            | Telegram Mini App（`pnpm deploy`）⏸ | `README.md`                  |

**多平台 = 重复内容风险**。同一篇文章会同时出现在 GitHub Pages、Codeberg Pages、IPFS 上，因此**每页必须输出指向主站的 `<link rel="canonical">`**，让搜索引擎收殻到唯一 URL。

- canonical 基准应取 `Astro.site`（`astro.config.ts` 的 `site`）。
- 逐页 canonical 由 `BaseLayout` ⏸ 输出（用 `Astro.url` 相对主站拼接）。
- ⏸ 待确认：canonical 是否已实现、是否对受保护文章（`telegramAuth`）输出（受保护内容不应被索引，建议 `noindex`）。

```astro
---
// 设计示意（src/layouts/BaseLayout.astro）
const canonical = new URL(Astro.url.pathname, Astro.site);
---
<link rel="canonical" href={canonical} />
```

---

## 2. Sitemap（`@astrojs/sitemap`）

已在 `astro.config.ts` 的 `integrations` 中启用：

```ts
import sitemap from "@astrojs/sitemap";
// ...
integrations: [mdx(), sitemap(), minifyHtml(), buildPipelineIntegration()],
```

| 项       | 说明                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| 产物     | `sitemap-index.xml` + 分片（`site` 必须配置，否则集成报错）                                                        |
| 自动范围 | 所有生成路由；草稿不生成路由，故**不会**被收录                                                                     |
| 可配置项 | `changefreq` / `priority` / `lastmod`、`filter` / `exclude`、`chunks`、命名空间排除（见 `SitemapGeneration` 术语） |
| 待办     | ⏸ 待确认是否已排除认证/受保护路由；是否开启分片（`chunks`）                                                        |

受保护文章路由（`/posts/[id]` 的认证墙版本）应评估是否从 sitemap 排除，避免索引无正文的页面。

---

## 3. RSS（`@astrojs/rss`）

| 项       | 说明                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------- |
| 依赖     | `@astrojs/rss`（`package.json`）                                                                |
| 端点     | `src/pages/rss.xml.ts`（已实现）                                                                |
| 内容范围 | 仅**已发布**文章（`getPublishedPosts()`，排除 `drafts/`）                                       |
| 校验     | `rssSchema` 强制必要字段（`title`、`pubDate` 等）                                               |
| 自动发现 | 需在 `<head>` 输出 `<link rel="alternate" type="application/rss+xml" href="/rss.xml">` ⏸ 待确认 |

```ts
// 设计示意（src/pages/rss.xml.ts）
import rss from "@astrojs/rss";
export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: "李华的笔记本",
    description: "写代码、读书、记踩坑。",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishDate,
      link: `/posts/${post.id}/`,
    })),
  });
}
```

> RSS 条目应使用**绝对 URL**（`site` 前缀），否则部分阅读器解析失败。

---

## 4. OGP / Twitter 卡片（经 BaseLayout ⏸）

社交分享卡片由 `BaseLayout.astro` 的 `<head>` 统一注入，取值来自当前页 frontmatter：

| Meta 属性                        | 取值来源                          | 备注                           |
| -------------------------------- | --------------------------------- | ------------------------------ |
| `og:title`                       | `title`                           |                                |
| `og:description`                 | `description`                     | 缺省时可回退站点描述           |
| `og:type`                        | `article`（文章）/ `website`      |                                |
| `og:url`                         | canonical（主站）                 |                                |
| `og:image`                       | `image`（**绝对 URL**）           | schema 要求 `z.string().url()` |
| `og:site_name`                   | 站点名                            | `李华的笔记本`                 |
| `twitter:card`                   | `summary_large_image` / `summary` | 有 `image` 用大图卡片          |
| `twitter:title` / `:description` | 同 `og:*`                         |                                |

- ⏸ 待确认：是否输出 `og:locale`、页级 `og:image:alt`、Twitter 站点账号。
- 缺 `image` 时需有**默认分享图**（否则卡片降级为纯文本）。

---

## 5. robots.txt

| 项       | 现状                                                              |
| -------- | ----------------------------------------------------------------- |
| 文件     | `public/robots.txt` ⏸ \*\*\*\*（当前 `public/` 仅 `favicon.svg`） |
| 计划内容 | 允许全站抓取 + 指向 sitemap；屏蔽受保护/认证路由                  |

```text
# public/robots.txt ⏸ 待创建
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://real-lihua.github.io/sitemap-index.xml
```

> ⏸ 待确认：站点 `<meta name="robots">` 的默认策略；受保护文章应 `noindex`。

---

## 6. 结构化数据 (JSON-LD) ⏸

**当前状态：未实现**（无 JSON-LD 脚本，⏸ 待确认 `BaseLayout` ⏸ 重写后是否纳入）。

计划（草图，未落地）：

| 类型             | 适用页面      | 主要字段                                                                                  |
| ---------------- | ------------- | ----------------------------------------------------------------------------------------- |
| `WebSite`        | 首页          | `name`、`url`、`potentialAction`（SearchAction，可选）                                    |
| `Person`         | 关于页 / 作者 | `name`、`url`、`sameAs`                                                                   |
| `BlogPosting`    | 文章页        | `headline`、`datePublished`、`dateModified`、`author`、`image`、`description`、`keywords` |
| `BreadcrumbList` | 文章/标签页   | 面包屑层级                                                                                |

应通过 `<script type="application/ld+json">` 注入，并用 `dates`（ISO 8601）对齐 frontmatter 的 `publishDate` / `updatedDate`。

---

## 7. 文章级元数据映射

frontmatter → HTML meta 的对照（字段定义见 `docs/CONTENT_GUIDE.md` §3）：

| Frontmatter 字段 | HTML / Meta 输出                                           |
| ---------------- | ---------------------------------------------------------- |
| `title`          | `<title>`、`og:title`、`twitter:title`、JSON-LD `headline` |
| `description`    | `<meta name="description">`、`og:description`              |
| `image`          | `og:image`、`twitter:image`、JSON-LD `image`               |
| `publishDate`    | `article:published_time`、JSON-LD `datePublished`          |
| `updatedDate`    | `article:modified_time`、JSON-LD `dateModified`            |
| `tags`           | `<meta name="keywords">`、JSON-LD `keywords`               |
| `authors`        | `article:author`、JSON-LD `author`                         |
| `telegramAuth`   | 受保护页 → 建议 `noindex`，并确保正文不进初始 HTML         |

`<title>` 命名建议：`<文章标题> · 李华的笔记本`（站点名作后缀，龙首向左）。

---

## 8. 验证命令与工具

### 8.1 构建与本地检查

```bash
pnpm build                                    # ls dist/client/sitemap-index.xml              # ⏸ sitemap 产物
ls dist/client/rss.xml                        # ⏸ RSS 产物
ls dist/client/robots.txt                     # ⏸ 若创建了 public/robots.txt
grep -r "rel=\"canonical\"" dist/client        # ⏸ 抽查 canonical
pnpm exec oxlint . && pnpm exec oxfmt --check  # 静态检查
```

### 8.2 在线验证器

| 工具                       | URL                                                         | 用途                   |
| -------------------------- | ----------------------------------------------------------- | ---------------------- |
| Google Rich Results Test   | `https://search.google.com/test/rich-results`               | JSON-LD / 结构化数据   |
| Schema Markup Validator    | `https://validator.schema.org/`                             | JSON-LD 语法           |
| Facebook Sharing Debugger  | `https://developers.facebook.com/tools/debug/`              | OGP 预览               |
| X (Twitter) Card Validator | `https://cards-dev.twitter.com/validator`                   | Twitter 卡片           |
| Bing Webmaster / GSC       | `https://search.google.com/search-console`                  | sitemap 提交与索引     |
| W3C / Nu HTML Checker      | `https://validator.w3.org/nu/`（CI 用 `vnu-jar`，本地手动） | HTML 合法性            |
| PageSpeed Insights         | `https://pagespeed.web.dev/`                                | 性能 + Core Web Vitals |

---

## 9. 检查清单

- [ ] 每页输出 `<link rel="canonical">`，指向主站 `https://real-lihua.github.io`
- [ ] sitemap 生成于 `dist/client/`，且排除草稿与受保护路由
- [ ] RSS 仅含已发布文章，条目为绝对 URL
- [ ] `<head>` 输出 RSS `rel="alternate"` 自动发现链接
- [ ] 每篇有 `og:title` / `og:description`；缺 `image` 时回退默认分享图
- [ ] `robots.txt` 存在且 Sitemap 指令正确
- [ ] 受保护文章 `noindex`，正文不进初始 HTML
- [ ] JSON-LD（若实现）通过 Rich Results Test
- [ ] 多平台部署时 canonical 仍指向主站
