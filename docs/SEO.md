# SEO 与元数据 (SEO & Metadata)

**Status**: Active — 站点级/文章级 SEO 已实现（canonical / OGP / JSON-LD / robots / RSS / sitemap），少数项见 §4、§6 的 `⏸`
**Date**: 2026-10-16
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
- 逐页 canonical 由 `BaseLayout` 输出（`Astro.url` 相对主站拼接，或 `canonical` prop 覆盖）。✅ 已实现。
- 受保护文章（`telegramAuth`）输出 `<meta name="robots" content="noindex, nofollow">`，且正文不进初始 HTML（`BaseLayout` 的 `noindex` prop + 认证墙）。✅ 已实现。

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
| 自动范围 | 所有生成路由；草稿不生成路由，受保护文章由 frontmatter 自动排除                                                    |
| 可配置项 | `changefreq` / `priority` / `lastmod`、`filter` / `exclude`、`chunks`、命名空间排除（见 `SitemapGeneration` 术语） |
| 待办     | ⏸ 是否开启分片（`chunks`）                                                                                         |

受保护文章路由（`telegramAuth.enabled: true`）通过 `sitemap` 的 `filter` 从索引中排除，避免索引无正文的页面。

---

## 3. RSS（`@astrojs/rss`）

| 项       | 说明                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| 依赖     | `@astrojs/rss`（`package.json`）                                                                            |
| 端点     | `src/pages/rss.xml.ts`（已实现）                                                                            |
| 内容范围 | 仅**已发布**文章（`getPublishedPosts()`，排除 `drafts/`）                                                   |
| 校验     | `rssSchema` 强制必要字段（`title`、`pubDate` 等）                                                           |
| 自动发现 | 已在 `<head>` 输出 `<link rel="alternate" type="application/rss+xml" title="LiHua.dev" href="/rss.xml">` ✅ |

```ts
// 设计示意（src/pages/rss.xml.ts）
import rss from "@astrojs/rss";
export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: "LiHua.dev",
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

## 4. OGP / Twitter 卡片（经 BaseLayout）

社交分享卡片由 `BaseLayout.astro` 的 `<head>` 统一注入，取值来自当前页 frontmatter：

| Meta 属性                            | 取值来源                     | 备注                               |
| ------------------------------------ | ---------------------------- | ---------------------------------- |
| `og:title`                           | `title`                      | ✅                                 |
| `og:description`                     | `description`                | ✅ 缺省时可回退站点描述            |
| `og:type`                            | `article`（文章）/ `website` | ✅ 由 `publishDate` 是否存在推断   |
| `og:url`                             | canonical（主站）            | ✅                                 |
| `og:image`                           | `image` 或 `/og-default.png` | ✅ 始终输出绝对 URL                |
| `og:site_name`                       | 站点名                       | ✅ `LiHua.dev`（见下方站点名说明） |
| `twitter:card`                       | `summary_large_image`        | ✅ 始终使用大图卡片                |
| `twitter:title` / `:description`     | 同 `og:*`                    | ✅                                 |
| `twitter:image`                      | 与 `og:image` 相同           | ✅                                 |
| `og:image:alt` / `twitter:image:alt` | 页面标题或站点级说明         | ✅                                 |
| `keywords`                           | `tags`                       | ✅ 仅文章页输出                    |

- ⏸ 待确认：是否输出 `og:locale`、Twitter 站点账号（`twitter:site`）。

默认分享图 `public/og-default.png` 为 1200×630 PNG；图像哲学与设计记录见 [`OG_IMAGE_PHILOSOPHY.md`](./OG_IMAGE_PHILOSOPHY.md)。文章自带的 `image` 优先，否则回退到默认分享图。

> **站点名说明**：实现中的站点名为 `LiHua.dev`（`BaseLayout`、`Footer`、`navbar/Start`、`rss.xml.ts` 一致）。`docs/VISUAL_DESIGN_SPEC.md` 的「墨与朱」目标规范使用「李华的笔记本」，属**待评审的目标设计**（该规范 §11 待办）；实现与 SEO 元数据以 `LiHua.dev` 为准，改名时需同步元数据与 RSS。

---

## 5. robots.txt

| 项   | 现状                                                                   |
| ---- | ---------------------------------------------------------------------- |
| 文件 | `public/robots.txt` ✅ 已创建（构建时复制到 `dist/client/robots.txt`） |
| 内容 | 允许全站抓取 + 指向 sitemap；屏蔽 `/api/`、`/drafts`                   |

```text
# public/robots.txt ✅
User-agent: *
Allow: /
Disallow: /api/
Disallow: /drafts

Sitemap: https://real-lihua.github.io/sitemap-index.xml
```

> 站点 `<meta name="robots">` 默认不输出（即允许索引）；受保护文章（`telegramAuth`）输出 `noindex, nofollow`（`BaseLayout` 的 `noindex` prop）。✅

---

## 6. 结构化数据 (JSON-LD)

**状态：已实现**（`BaseLayout.astro` 通过 `<script type="application/ld+json">` 注入；`<` 已转义，日期为 ISO 8601）。

| 类型             | 适用页面      | 主要字段                                                                                                      | 状态 |
| ---------------- | ------------- | ------------------------------------------------------------------------------------------------------------- | ---- |
| `WebSite`        | 首页类页面    | `name`、`url`、`description`                                                                                  | ✅   |
| `BlogPosting`    | 文章页        | `headline`、`datePublished`、`dateModified`、`author`、`image`、`description`、`keywords`、`mainEntityOfPage` | ✅   |
| `Person`         | 关于页 / 作者 | `name`、`url`                                                                                                 | ✅   |
| `BreadcrumbList` | 文章页        | 面包屑层级                                                                                                    | ✅   |

> 类型由 `publishDate` 是否存在推断：文章页输出 `BlogPosting`，其余输出 `WebSite`。`BaseLayout` 的 `jsonLd` prop 可追加一个或多个页面级结构化数据对象；输出前会转义 `<`。

---

## 7. 文章级元数据映射

frontmatter → HTML meta 的对照（字段定义见 `docs/CONTENT_GUIDE.md` §3）：

| Frontmatter 字段 | HTML / Meta 输出                                                 |
| ---------------- | ---------------------------------------------------------------- |
| `title`          | `<title>`、`og:title`、`twitter:title`、JSON-LD `headline`       |
| `description`    | `<meta name="description">`、`og:description`                    |
| `image`          | `og:image`、`twitter:image`、JSON-LD `image`（缺省用站点分享图） |
| `publishDate`    | `article:published_time`、JSON-LD `datePublished`                |
| `updatedDate`    | `article:modified_time`、JSON-LD `dateModified`                  |
| `tags`           | `<meta name="keywords">`、JSON-LD `keywords`                     |
| `authors`        | `article:author`、JSON-LD `author`                               |
| `telegramAuth`   | 受保护页 → `noindex, nofollow`，且正文不进初始 HTML（✅）        |

`<title>` 命名建议：`<文章标题> · LiHua.dev`（站点名作后缀；站点名见 §4 说明）。

---

## 8. 验证命令与工具

### 8.1 构建与本地检查

```bash
pnpm build                                     # 构建（含 sitemap / RSS / robots 产物）
ls dist/client/sitemap-index.xml               # sitemap 产物
ls dist/client/rss.xml                         # RSS 产物
ls dist/client/robots.txt                      # robots.txt 产物
grep -r "rel=\"canonical\"" dist/client         # 抽查 canonical
grep -r "application/ld+json" dist/client       # 抽查 JSON-LD
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

- [x] 每页输出 `<link rel="canonical">`，指向主站 `https://real-lihua.github.io`
- [x] sitemap 生成于 `dist/client/`，且排除草稿与受保护路由
- [x] RSS 仅含已发布文章，条目为绝对 URL
- [x] `<head>` 输出 RSS `rel="alternate"` 自动发现链接
- [x] 每篇有 `og:title` / `og:description`；缺 `image` 时回退默认分享图
- [x] `robots.txt` 存在且 Sitemap 指令正确
- [x] 受保护文章 `noindex`，正文不进初始 HTML
- [x] JSON-LD（`WebSite` / `BlogPosting` / `Person` / `BreadcrumbList`）输出
- [x] 多平台部署时 canonical 仍指向主站
