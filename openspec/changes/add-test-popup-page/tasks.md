# Tasks

## 1. Shared nickname logic

- [x] 1.1 Add `src/lib/nickname.ts`: `nicknameOf(user)` (trimmed
      first_name + last_name joined by one space; fallback `@username`; else
      unknown-user placeholder). No HTML-escape helper — callers must not
      interpolate into markup.
- [x] 1.2 Add failing unit tests in `tests/unit/nickname.test.ts` first, then
      make them pass.

## 2. Test page

- [x] 2.1 Add `/test/group-popup/` (`src/pages/test/group-popup.astro`),
      clearly labeled as a test page, explaining that the group-membership check
      for group -1002025381790 is not implemented (and why) and that entering the
      page pops the window.
- [x] 2.2 On entry, resolve the nickname from `initDataUnsafe.user` (the raw
      `initData` is not parsed; the WebApp is re-read on every poll so a late
      SDK load is observed); call the native `showPopup` inside Telegram
      (Bot API >= 6.2), or open the in-page `<dialog>` otherwise.
      Bounded (~1.5 s) wait for a late-loading SDK before falling back. Provide a
      re-open ("再弹一次") button and `aria-live` status lines (environment,
      nickname, popup path). Nickname only via `textContent`/plain string; no
      `innerHTML` anywhere on the page.
- [x] 2.3 Add the `flask` icon glyph (U+F0C3) to `src/lib/icons.ts` and a
      labeled icon-only navigation link to `/test/group-popup/` in
      `SiteLayout.astro`.

## 3. Coverage

- [x] 3.1 Add failing Playwright e2e tests in `tests/e2e/group-popup.spec.ts`
      first (native popup path, late SDK load, no raw-initData fallback,
      dialog fallback in a browser, older-client fallback, markup-nickname
      verbatim delivery, nav entry), then make them pass.

## 4. Docs and validation

- [x] 4.1 One line each in `README.md` and `PRODUCT.md`.
- [x] 4.2 `pnpm run test:unit`, `pnpm exec playwright test`, oxlint,
      `openspec validate add-test-popup-page`, markdownlint.
- [x] 4.3 Report; keep the change uncommitted for the user's `git push`.
