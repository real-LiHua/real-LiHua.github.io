# 李华的博客

An Astro 7 blog reader preview styled for quiet, long-form reading. Preview
posts are sample content only; they are not published articles.

## Run locally

```sh
pnpm install
pnpm run dev
```

Open `http://localhost:4321`. The preview includes the home page, article
index, search entry point, sample article routes, and a custom 404 page. Use
the navigation to move between reader pages.

Local development uses the installed Maple Mono Normal NF CN system font and
does not download font files. GitHub Actions resolves and verifies the latest
stable official font release, caches it by release tag, then prepares it for
build-time WOFF2 optimization.

## OpenGraph images

`astro-og-canvas` renders a 1200×630 share card for the home page, article
index, series, topics, and every post under `/open-graph/**`. Cards are
prerendered at build time, use the paper/ink palette from `DESIGN.md`, and are
referenced by the `og:image` and `twitter:image` tags emitted by `SiteLayout`.

Card text uses the same Maple Mono Normal NF CN family as the site. Local
builds read the installed system font; CI reads the verified release prepared
by `pnpm run prepare:font`. Set `MAPLE_FONT_PATH` to a TTF/OTF file to point at
another installation.

## Checks

| Command                     | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `pnpm exec astro check`     | Check Astro and TypeScript files                       |
| `pnpm run build`            | Build the site and generate the Orama search index     |
| `pnpm test`                 | Run Playwright browser tests                           |
| `pnpm run lighthouse`       | Audit built pages with Lighthouse                      |
| `pnpm run test:font`        | Test local font-download, checksum, and cache behavior |
| `pnpm run test:font-output` | Test generated font-output validation                  |
| `pnpm run lint:md`          | Lint Markdown                                          |
| `pnpm run openspec`         | Run OpenSpec                                           |

The repository also contains tooling for the Rust `post-edit` CLI and tgcloud.
Its source and deployment workflows are outside the current reader preview.

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
the reader experience and its remaining implementation work.
