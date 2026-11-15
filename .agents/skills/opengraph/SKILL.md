---
name: opengraph
description: Audit, add, or fix Open Graph (og:*) metadata so links unfurl with the right title, description, and image. Use this skill whenever the user mentions link previews, social cards, og:image, og:title, Open Graph, Twitter/X cards, Facebook/LinkedIn/Slack/WhatsApp/Discord unfurls, or <head> metadata — and whenever someone reports that a shared URL shows a blank, grey, generic, or wrong-looking preview, even if they never say "Open Graph".
metadata:
  version: "1.0.0"
---

# Open Graph metadata

Social crawlers read `<meta property="og:*">` from the HTML your server returns, and they cache what they read. They do not run client-side JavaScript and they do not fetch your source files. So the job is: correct, page-specific tags MUST land in the **served** HTML, and you MUST verify the **built output**, not the template you hoped would render.

Normative keywords follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): MUST and MUST NOT are requirements; SHOULD and SHOULD NOT are strong recommendations that may be deviated from only with a stated reason; MAY is genuine permission.

## Workflow

1. **Find the source of truth.** One layout or head component SHOULD own `<head>` (Astro layout, Next `metadata` export, Rails partial, template base). If tags appear in more than one place, you MUST consolidate before adding more.
2. **Read what is actually emitted.** You SHOULD prefer built/prerendered HTML (`dist/`, `out/`, a `dev` server response) over the template. If you can only see the template, you MUST say so.
3. **Run the checker** on the emitted HTML (see [Checking](#checking)).
4. **Fix at the source of truth.** You MUST NOT hand-patch built output.
5. **Re-run the checker** on rebuilt output and MUST report before/after.
6. **Warn about caching.** Most platforms cache previews, so you MUST warn that a correct fix can still show the old card until the cache is refreshed.

## The four required properties

Every page MUST have all four. Missing any one is the usual cause of a bare link.

| Property | Good value | Common mistake |
|---|---|---|
| `og:title` | Page-specific title, roughly 60–70 characters | Site name only, or the same title on every page |
| `og:type` | `website` for hubs, `article` for posts, `profile` for people | Omitted, or a free-text word like `blog` |
| `og:image` | Absolute `https://` URL to a 1200×630 (1.91:1) image, under ~5 MB | Relative `/og.png`, a logo, a 200×200 favicon |
| `og:url` | Canonical absolute URL for this page | Omitted, or pointing at the site root on every page |

`og:type` also accepts namespaced types from the protocol: `article`, `book`, `profile`, `music.song`, `music.album`, `music.playlist`, `music.radio_station`, `video.movie`, `video.episode`, `video.tv_show`, `video.other`, `website`. Custom types use a CURIE (`my_ns:thing`) plus a `prefix` attribute — if the user needs one, you MUST read the protocol link in [References](#references).

## Recommended properties

You SHOULD add these when the data exists; they are what separates a good unfurl from a serviceable one.

- `og:description` — one or two sentences, roughly 110–160 characters.
- `og:site_name` — the publication or product name ("The Verge", not "theverge.com").
- `og:locale` — `language_TERRITORY`, e.g. `en_US`, `zh_CN`, `de_DE`. Underscore, not hyphen.
- `og:image:width`, `og:image:height` — let platforms reserve layout space before the image arrives.
- `og:image:alt` — a description of the image, not a caption. It MUST be set whenever `og:image` is set; screen readers and some platforms rely on it.
- `og:image:type` — MIME type, e.g. `image/jpeg`.
- `og:image:secure_url` — only when the HTTPS image differs from `og:image`.

For articles, you SHOULD also emit `article:published_time` (ISO 8601), `article:modified_time`, `article:author`, and `article:section` / `article:tag` when known.

## Values that survive review

- **Absolute URLs only.** `og:url`, `og:image`, `og:audio`, and `og:video` MUST be absolute. You MUST build them from a configured site URL and MUST NOT string-concatenate `location.origin` at runtime (crawlers won't have it).
- **`og:url` SHOULD equal the canonical URL** in `<link rel="canonical">`. When they disagree, the graph identity and the indexed page diverge.
- **One tag per property, per page.** You MUST emit exactly one; the protocol resolves conflicts first-wins, so a duplicate silently shadows the value you meant. This is why "the layout sets og:title and the page sets it again" produces a wrong card that looks correct in source.
- **Escape for HTML.** In hand-written HTML, `&` MUST be `&amp;` inside `content`. In templating languages you MUST use the escaped output form (`{value}`, not `{value | raw}`).
- **Keep the image worth clicking.** Text baked into the image MUST survive a ~500px-wide thumbnail; put the page title in it, not the full summary.
- **Don't emit empty tags.** You MUST NOT emit `<meta property="og:title" content="">`: it is worse than omitting the tag, because platforms render a blank card instead of falling back to `<title>`.

## Framework notes

The mechanics differ per stack, but the invariant is the same: the tags MUST exist in server-rendered HTML, once.

- **Astro** — you MUST set `site` in `astro.config.*`, then derive URLs with `new URL(Astro.url.pathname, Astro.site)` or `new URL("/og/" + slug + ".png", Astro.site)`. A single layout's `<head>` SHOULD render the tags from props/frontmatter.
- **Next.js** — use the `metadata` or `generateMetadata` export; `openGraph.images` is resolved against `metadataBase`. You MUST NOT also hand-write `<meta property="og:*">` in the layout, or you get duplicates.
- **SPAs (client-rendered React/Vue/Svelte)** — tags injected after hydration are invisible to most crawlers. You MUST add SSR, static prerendering, or a prerender step; this is a build change, so you MUST flag the tradeoff rather than bolting on a runtime hack.
- **Static generators** — tags MUST be in the generated file. You MUST check `dist/` (or `out/`, `_site/`, `build/`) rather than the source.

## Checking

A bundled checker does the mechanical validation, so you don't re-implement HTML parsing per run:

```bash
python3 "$(dirname SKILL.md)/scripts/check_og.py" dist/index.html
python3 .../check_og.py dist/ --base-url https://example.com
python3 .../check_og.py --url https://example.com/pricing
python3 .../check_og.py page.html --json --strict
```

It reports missing required properties, relative URLs, duplicate tags, orphaned structured properties, missing image dimensions/alt, malformed locale and type values, and `og:url` vs. canonical mismatches. Exit code is `1` when there are errors, `0` otherwise; `--strict` also fails on warnings. `--url` only fetches what the user explicitly named — you MUST NOT probe a site on your own initiative.

You MUST fix reported **errors** first; you SHOULD treat **warnings** as decisions to make consciously, not noise to suppress. Warnings about title/description length are heuristics, not protocol rules — you MAY deviate when the copy is better.

## Reporting

You MUST give the user a short table (property, status, value or problem), then the concrete fix. You MUST NOT paste the entire `<head>`.

After changing code, you MUST state plainly what will and won't be instant: the HTML is fixed now, the previews on existing shares usually are not. You SHOULD point at the relevant platform debugger when staleness matters.

## References

- Protocol spec: <https://ogp.me/> — authoritative for property names, required/optional status, structured-property ordering, and type namespaces. You MUST read it before inventing a property or citing a rule as required.
- `references/ogp-cheatsheet.md` in this skill — condensed property list and ordering rules for quick lookup while editing.
