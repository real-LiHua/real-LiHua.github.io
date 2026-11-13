# Astro Mini App starter

Copy these files into an Astro + Tailwind 4 project:

| Source | Destination | Required |
|---|---|---|
| `src/layouts/MiniAppLayout.astro` | `src/layouts/MiniAppLayout.astro` | yes |
| `src/lib/telegram.ts` | `src/lib/telegram.ts` | yes |
| `src/styles/global.css` | `src/styles/global.css` | yes |
| `src/pages/index.astro` | `src/pages/index.astro` | no — example screen |

Then:

1. The layout imports the stylesheet itself; if you use a different base layout,
   import `../styles/global.css` once there.
2. Wrap Mini App pages in `<MiniAppLayout title="...">`.
3. Keep `BOT_TOKEN` server-only (for example in `.env`), never prefixed with `PUBLIC_`.
4. Replace the `?65` SDK query with the current build from the official docs when you
   intentionally upgrade.

## Why it is built this way

- The layout uses `<script is:inline>` for the Telegram SDK. Astro's normal `<script>` is
  bundled, deferred, and may run after app code; the SDK must run first, in `<head>`.
- `global.css` maps `--tg-theme-*` to Tailwind tokens with `@theme inline`, so dark mode
  and theme switches work without JS. Safe-area helpers use content insets, not fixed
  offsets.
- `telegram.ts` is dependency-free and covers init, chrome colors, theme/viewport/safe-area
  events, and Astro view transitions. `initTelegram()` is reference-counted for multiple
  callers; `observeTelegram()` survives `astro:page-load` and cleans up on `astro:before-swap`.
- Outside Telegram the helper returns `null` and the example page shows a labelled preview.
  The preview never fakes `initData` or bypasses server auth.

The full API is documented in `references/sdk-core.md`; server-side validation is in
`references/validation.md`.

## Verify before copying

```bash
node --test scripts/                 # validation tests
node scripts/validate-init-data.mjs --help
```

If Tailwind reports an unknown utility, your project is on Tailwind 3 — the `@theme` and
`@utility` syntax here is Tailwind 4 only.
