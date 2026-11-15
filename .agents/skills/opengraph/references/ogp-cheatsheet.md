# Open Graph cheatsheet

Condensed from <https://ogp.me/> (version 1.x). The spec MUST be treated as authoritative; this file is for quick lookup while editing.

## Required on every page

| Property | Type | Notes |
|---|---|---|
| `og:title` | String | Page/object title, not the site name |
| `og:type` | String | MUST be a protocol type or a CURIE (`ns:type` + `prefix` attr) |
| `og:image` | URL | MUST be absolute; the image shown in the card |
| `og:url` | URL | MUST be absolute canonical URL; the object's permanent ID |

## Optional, commonly used

| Property | Type | Notes |
|---|---|---|
| `og:description` | String | One or two sentences |
| `og:site_name` | String | Name of the containing site |
| `og:locale` | String | `language_TERRITORY`, e.g. `en_US` |
| `og:locale:alternate` | String, repeatable | Other locales available |
| `og:determiner` | Enum | `a`, `an`, `the`, `auto`, or empty |
| `og:audio` / `og:video` | URL | Media accompanying the object |
| `og:image:alt` | String | Description of the image; SHOULD accompany `og:image` |

## Structured properties

MUST follow their root tag in document order. A new root tag closes the previous group.

- `og:image:url` — same as `og:image`
- `og:image:secure_url` — HTTPS variant when it differs
- `og:image:type` — MIME type, e.g. `image/jpeg`
- `og:image:width` / `og:image:height` — pixels, positive integers
- `og:image:alt` — image description
- `og:video:*` — the same six properties
- `og:audio:*` — `url`, `secure_url`, `type` only

## Arrays

Repeat the tag. The first value wins on conflict. Only multi-valued properties (images, locales, tags, authors) MAY repeat; repeating `og:title` MUST NOT happen.

## Types

Vertical types: `music.song`, `music.album`, `music.playlist`, `music.radio_station`, `video.movie`, `video.episode`, `video.tv_show`, `video.other`.

No-vertical types: `article`, `book`, `profile`, `website`, `payment.link` (beta).

Article properties: `article:published_time`, `article:modified_time`, `article:expiration_time`, `article:author` (repeatable), `article:section`, `article:tag` (repeatable).

Book: `book:author`, `book:isbn`, `book:release_date`, `book:tag`.

Profile: `profile:first_name`, `profile:last_name`, `profile:username`, `profile:gender`.

## Value formats

- DateTime — ISO 8601
- Integer — 32-bit signed
- Boolean — `true`, `false`, `1`, `0`
- URL — MUST be http or https only

## Practical defaults

You SHOULD start from these values and justify any deviation.

| Thing | Value |
|---|---|
| Card image | 1200×630 px, 1.91:1, JPEG/PNG/WebP, under ~5 MB |
| Minimum useful image | 200×200; below that some platforms drop it |
| Title length | ~60–70 characters before clipping |
| Description length | ~110–160 characters |
| Minimum required set | `og:title`, `og:type`, `og:url`, `og:image` (+ `og:image:alt`) |

## Pitfalls the checker flags

- Relative `og:image` / `og:url`
- Duplicate single-value properties
- Structured property before its root tag
- Meta tags outside `<head>`
- Missing image dimensions or alt
- `en-US` instead of `en_US`
- `og:url` disagreeing with `rel=canonical`
- Non-numeric width/height
