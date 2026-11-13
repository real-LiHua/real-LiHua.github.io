# Tasks

Implement each behavior task using TDD: write or update its automated test
first, run it and confirm the expected failure, implement the smallest
passing change, then refactor with tests remaining green.

## 1. Telegram Mini App bootstrap

- [x] 1.1 First add a failing browser test that stubs a Telegram launch (SDK route aborted, fragment-based launch, `window.Telegram.WebApp` mock) and asserts `ready()`/`expand()` are called and `<html>` carries `telegram`; an SDK request SHALL NOT block rendering. Then add the fragment-parsing inline head bootstrap and the dynamic post-load SDK injection, and make the test pass. Confirm the browser (no-Telegram) path stays green.

## 2. Forced client colors

- [x] 2.1 First add failing browser tests for forced dark/light mapping (surface colors resolve to client theme values, `dark` class and `color-scheme` meta mirror `colorScheme`), `themeChanged` re-application without reload, hidden theme toggle inside Telegram, untouched `reader-theme`, and forced colors even when the SDK is unreachable. Then add the `:root.telegram` token mapping, scheme sync, and toggle hiding, and make the tests pass.

## 3. Telegram chrome colors

- [x] 3.1 First add failing browser tests asserting `setHeaderColor("bg_color")`, `setBackgroundColor("bg_color")`, and `setBottomBarColor("bottom_bar_bg_color")` on Bot API ≥ 7.10 (and its absence on older clients). Then implement the version-gated chrome sync in `src/lib/telegram.ts`, and make the tests pass.

## 4. Documentation and regression

- [x] 4.1 Run the full test suite, `astro check`, and a build, and confirm no regressions; document the Mini App setup in `README.md`.
