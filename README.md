# 李华的博客

An Astro 7 reader preview for quiet, long-form reading in Simplified Chinese.
All four current posts are illustrative fixtures, not real articles. The home
and archive pages label the preview, and entries with `isPreview: true` also
carry an in-page notice. One fixture is marked `isPreview: false`, so
`/rss.xml` currently carries it; it is still sample content.

## Current stage

The reader preview is implemented end to end:

- **Reader pages**: home feed, article archive, article pages with
  chronological neighbors and series context, search, and a truthful custom 404.
- **Discovery and syndication**: year, topic, and ordered series archives,
  plus `/rss.xml`. Only entries marked `isPreview: false` enter the feed.
- **Reading controls**: persistent light/dark theme, draggable article
  outline, copyable heading anchors, language-badged code blocks with copy
  controls, responsive images and tables, and explicit Internet Archive
  lookups.
- **Search and agent access**: an on-demand Orama index with Mandarin
  tokenization, a native search dialog backed by `/search/`, read-only WebMCP
  tools on post pages, and an ARD catalog at `/.well-known/ard.json`.
- **Presentation and platforms**: OpenGraph share cards, sitemap,
  `robots.txt`, MDX with auto-imported icons, and the read-only Telegram Mini
  App.

The [`design-blog-reader-ui`](openspec/changes/design-blog-reader-ui/) change
is still active; its task list shows font-output verification (1.3) and final
integrated verification (7.1) as open. No real content, bot backend, or
authoring workflow exists yet.

## Run locally

```sh
pnpm install
pnpm run dev
```

Open `http://localhost:4321`. The preview includes the home page, article
archive and discovery pages, the search entry point, sample article routes,
labeled demo pages, and a custom 404 page.

## Content and routes

Posts live in `src/content/posts/` as `.md` or `.mdx`; the Astro Content
Collection validates frontmatter (`title`, `description`, `publishedAt`,
`readingTime`, `isPreview`, optional `topics`, and optional ordered `series`).
`isPreview` defaults to `true`. Preview entries stay visible in the UI with a
preview label and stay out of the feed.

| Route                                      | Purpose                                                              |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `/`                                        | Home feed                                                            |
| `/posts/`                                  | Article archive with year, topic, series, and RSS entry points       |
| `/posts/years/<year>/`                     | Year archive                                                         |
| `/topics/<slug>/`                          | Topic archive                                                        |
| `/series/`, `/series/<id>/`                | Series index and ordered series                                      |
| `/posts/<slug>/`                           | Article with outline, heading anchors, neighbors, and series context |
| `/search/`                                 | Direct-access search page; the shared dialog is the primary path     |
| `/rss.xml`                                 | Feed of non-preview entries                                          |
| `/sitemap-index.xml`, `/robots.txt`        | Crawler entry points                                                 |
| `/.well-known/ard.json`                    | ARD catalog of MCP server cards and installed skills                 |
| `/open-graph/**`                           | Prerendered share cards                                              |
| `/test/auto-import/`, `/test/group-popup/` | Labeled demo pages, not content                                      |

Search reads `/search-index.json`, an Orama index built at build time with the
Mandarin tokenizer. WebMCP registers read-only tools only in browsers that
support it. The ARD manifest is linked with `rel="ard"` and lists the
operator-written MCP server cards plus the installed skills tracked by
`skills-lock.json`.

Article pages follow the Open Graph article namespace. `package.json` supplies
the site `author` for `article:author`, a post's series title becomes
`article:section`, and topic names become `article:tag`. Publication and
modification times come from each post file's `git log` history and fall back to
the frontmatter `publishedAt` when history is unavailable, so deploy workflows
check out full history.

## Fonts and OpenGraph images

Local development uses the installed Maple Mono Normal NF CN system font and
does not download font files. GitHub Actions resolves and verifies the latest
stable official release, caches it by release tag, then prepares it for
build-time WOFF2 subsetting. `pnpm run check:font-output` rejects generated CSS
that points at remote or missing font files.

`astro-og-canvas` renders a 1200×630 share card for the home page, article
index, series, topics, and every post under `/open-graph/**`. Cards are
prerendered at build time, use the paper/ink palette from `DESIGN.md`, and are
referenced by the `og:image` and `twitter:image` tags emitted by `SiteLayout`.

Card text uses the same Maple Mono Normal NF CN family as the site. Local
builds read the installed system font; CI reads the verified release prepared
by `pnpm run prepare:font`. Set `MAPLE_FONT_PATH` to a TTF/OTF file to point at
another installation.

## MDX and auto-imported components

MDX is enabled, and `astro-auto-import` makes `src/components/Icon.astro`
available in MDX without an import statement:

```mdx
<Icon name="book" /> 阅读与记录
```

Posts in `src/content/posts` may be `.md` or `.mdx`; both share the same
frontmatter schema. Plain `.md` files cannot use components. A labeled demo
page lives at `/test/auto-import/`.

## Checks

| Command                               | Purpose                                                |
| ------------------------------------- | ------------------------------------------------------ |
| `pnpm exec astro check`               | Check Astro and TypeScript files                       |
| `pnpm run build`                      | Build the site and generate the Orama search index     |
| `pnpm test`                           | Run Playwright browser tests                           |
| `pnpm run test:unit`                  | Run Node unit tests                                    |
| `pnpm run lighthouse`                 | Audit built pages with Lighthouse                      |
| `pnpm run test:font`                  | Test local font download, checksum, and cache behavior |
| `pnpm run check:font-output`          | Verify built CSS references only local WOFF2 files     |
| `pnpm run test:font-output`           | Test generated font-output validation                  |
| `pnpm run test:markdown-dependencies` | Reject unified/remark/rehype dependencies              |
| `pnpm run lint:md`                    | Lint Markdown                                          |
| `pnpm run openspec`                   | Run OpenSpec                                           |

`Cargo.toml` still declares the Rust `post-edit` CLI, and `package.json`
declares the `post:edit`, `verify:watermark`, and tgcloud commands. Their
entrypoints and deployment workflows are not part of the current reader
preview, so those commands are not verified here.

Pushes to `main` deploy the built site to GitHub Pages. The same workflow also
mirrors the build to Codeberg Pages with `SITE_URL=https://lihua.codeberg.page`.

## Telegram Mini App

The site doubles as a read-only Telegram Mini App; no bot backend or
authentication is involved. To enable it, create a bot in
[@BotFather](https://t.me/BotFather) and set the Mini App URL to
`https://real-lihua.github.io` (`/newapp`, or the menu button via
`/setmenubutton`).

Behavior inside Telegram (detected from the `tgWebApp*` launch fragment):

- The client palette wins: shared design tokens resolve to the `--tg-theme-*`
  variables injected by the client, the light/dark class follows the client's
  `colorScheme`, and this is applied before first paint.
- `themeChanged` events re-apply the scheme live; the in-page theme toggle is
  hidden and `reader-theme` is left untouched.
- `ready()`/`expand()` run once the WebApp SDK loads, and header, background,
  and (Bot API ≥ 7.10) bottom bar chrome follow the client's `bg_color`.
- The pinned SDK (`telegram-web-app.js?65`) is injected after `window.load`,
  so it never blocks rendering; regular browsers make no request to
  telegram.org. If the SDK cannot load, the client palette still applies.
- In-app navigations (full page loads) keep the forced palette: the launch
  fragment is persisted per tab (`sessionStorage`) at launch and synced on
  `themeChanged`, and restored by the head bootstrap on the next page.

Opened in a regular browser, everything behaves exactly as before.

The site also ships a labeled test page at `/test/group-popup/` (linked from
the navigation): it demonstrates the Mini App popup path — entering the page
pops the Telegram user's nickname (`first_name` + `last_name`) via the native
`showPopup` on Bot API ≥ 6.2, with an in-page dialog fallback elsewhere. It
deliberately does not check group membership (that requires a bot backend);
see `openspec/changes/add-test-popup-page/`.

OpenSpec uses the `spec-driven` workflow. The active
[`design-blog-reader-ui`](openspec/changes/design-blog-reader-ui/) change tracks
the reader experience. The completed changes remain in `openspec/changes/`
until they are archived.
