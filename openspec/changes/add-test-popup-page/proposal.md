# Proposal

## Why

The original request was a test page that pops up a window showing the user's
nickname when they are in group -1002025381790. A client-side group
membership check is impossible: `initData` does not carry membership, and the
check would require a server holding the bot token calling Bot API
`getChatMember`. The site is a read-only, backend-free GitHub Pages Mini App,
so the user decided to drop the membership check for now: entering the page
pops the window unconditionally.

## What Changes

- Add the `/test/group-popup/` page, clearly labeled as a test page and linked
  from the site navigation (labeled icon entry).
- On entry, resolve the Telegram nickname as `first_name + last_name` (with
  the agreed fallbacks: `@username`, then an unknown-user placeholder) from
  `WebApp.initDataUnsafe.user`.
- Inside Telegram (Bot API >= 6.2 with `showPopup`), show the native
  `Telegram.WebApp.showPopup` with the nickname; otherwise fall back to an
  in-page `<dialog>` (browsers and older clients).
- Keep the nickname out of HTML parsing: it reaches the popup as a plain
  string and reaches the dialog via `textContent`; nothing is interpolated
  into `innerHTML`.
- Add unit tests for the nickname resolution and Playwright e2e coverage for
  the native-popup, late-SDK, dialog-fallback, and navigation cases.

## Capabilities

### New Capabilities

- `test-popup-page`: a clearly labeled test page `/test/group-popup/` that
  displays the Telegram user's nickname in a popup on entry, using the native
  Bot API popup inside Telegram and an in-page dialog otherwise.

### Modified Capabilities

None.

## Impact

- `src/pages/test/group-popup.astro`: the new page.
- `src/lib/nickname.ts`: pure nickname resolution.
- `src/lib/icons.ts`: new `flask` icon glyph (test-page entries only).
- `src/layouts/SiteLayout.astro`: one additional nav link.
- `tests/unit/nickname.test.ts`, `tests/e2e/group-popup.spec.ts`: coverage.
- README/PRODUCT: one line each; the production Telegram Mini App behavior is
  unchanged.
