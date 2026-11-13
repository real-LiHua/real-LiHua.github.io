# Testing and debugging Mini Apps

A Mini App cannot be fully tested in a normal browser tab: the browser has no
`window.Telegram`, no signed `initData`, and no native chrome. Use a browser for layout and
unit tests, then verify behavior in a real Telegram client.

## Test environment

The test server is completely separate: separate accounts, separate bots, separate data.

1. Create a **new Telegram account** on the test server:
   - **iOS:** tap the Settings icon 10 times → Accounts → Login to another account → Test.
   - **Telegram Desktop:** Settings → hold <kbd>Shift</kbd> + <kbd>Alt</kbd> and right-click
     “Add Account” → Test Server.
   - **macOS:** click the Settings icon 10 times → Debug Menu → <kbd>⌘</kbd> + click “Add
     Account”.
2. Create a **new bot** with `@BotFather` on that test account.
3. Call the Bot API with the `/test/` path:

   ```text
   https://api.telegram.org/bot<token>/test/METHOD_NAME
   ```

HTTP (non-TLS) Mini App URLs are allowed in the test environment, which is useful for local
tunnels. Production requires HTTPS.

The attachment-menu feature is available to all bots on the test server, even though it is
restricted to major advertisers in production.

## Debug modes

### iOS

1. In Telegram, tap Settings 10 times → enable **Allow Web View Inspection**.
2. Connect the phone to a Mac with a cable.
3. Safari → **Develop → [device]** → select the Mini App.

### Android

1. Enable USB debugging on the device.
2. In Telegram Settings, scroll to the version number, press and hold it twice → **Enable
   WebView Debug**.
3. Connect the device and open `chrome://inspect/#devices` in Chrome.

### Telegram Desktop (Windows/Linux)

1. Install the **Beta** version of Telegram Desktop.
2. Settings → Advanced → Experimental settings → **Enable webview inspection**.
3. Right-click inside the Mini App → **Inspect**.

### macOS

1. Install the **Beta** build of Telegram macOS.
2. Click the Settings icon 5 times quickly → enable **Debug Mini Apps**.
3. Right-click inside the Mini App → **Inspect Element**.

## Browser preview

Keep a fallback so development does not require Telegram every time:

```ts
const tg = window.Telegram?.WebApp;

if (!tg) {
  renderPreview({
    user: { id: 0, first_name: 'Preview' },
    theme: 'light',
  });
}
```

Rules for the fallback:

- Label it visibly as a preview (`Preview mode — open in Telegram`).
- Never let it call authenticated endpoints or bypass server checks.
- Keep the same routing and component tree as production so layout bugs still surface.
- Do not fake `initData`; the server must reject it.

A browser preview is also the fastest way to test responsive layout, keyboard navigation,
and focus states. Telegram Web (web.telegram.org) is a real client and a useful second
target, but it is not a substitute for iOS/Android WebViews.

## Test matrix

At minimum:

| Target | Why |
|---|---|
| iOS, small screen (SE-class) | Safe areas, keyboard, bottom button, WebView quirks |
| iOS, large screen | Layout stretching, fullscreen |
| Android, low performance class | Animation smoothness, sensor availability |
| Android, modern device | Baseline behavior |
| Telegram Desktop | Wide layout, mouse/keyboard, context menu |
| Telegram Web | Desktop browser engine, different chrome |
| Browser preview | Fast iteration and accessibility checks |

Also test:

- Light and dark themes, and switching theme while the app is open.
- Expanded and collapsed viewport; fullscreen enter/exit.
- Hardware back / gesture back vs. `BackButton`.
- Slow network and offline start.
- Denied permissions: location, biometrics, clipboard, notifications.
- Empty states and very long user names/chat titles.

## Symptom → cause

| Symptom | Check |
|---|---|
| Blank page | SDK blocked by CSP/adblock; JS error before `ready()`; wrong build output |
| Stuck on loading placeholder | `ready()` never called, or called before the script loaded |
| `initData` empty | Launched from keyboard button or inline mode; expected |
| Auth fails only in Telegram | Test/production bot token mismatch; validating `initDataUnsafe`; hash built with wrong field set |
| MainButton missing | Attachment-menu launch before interaction; `show()` before `ready()`; button hidden by app logic |
| MainButton disabled after loading | `showProgress()` disabled it and only `hideProgress()` was called |
| Bottom content clipped | Fixed `bottom: 0`; use safe-area insets and `viewportStableHeight` |
| Theme half-applied | Hard-coded colors mixed with `--tg-theme-*` |
| Fullscreen content under the header | Ignoring `contentSafeAreaInset` |
| Sensors never start | Unsupported device; `start()` callback returned `false`; permission not granted |
| `openLink` ignored | Called outside a user gesture |
| Back button dead | No `onClick` handler, or handler bound before SDK ready |
| Old client ignores a method | Bot API version below the feature gate; check `isVersionAtLeast` |

## Diagnostic snippet

Log this once at startup; it answers most “works on my device” reports:

```ts
const tg = window.Telegram?.WebApp;
console.table({
  present: Boolean(tg),
  version: tg?.version,
  platform: tg?.platform,
  colorScheme: tg?.colorScheme,
  isExpanded: tg?.isExpanded,
  isFullscreen: tg?.isFullscreen,
  initDataLength: tg?.initData.length,
  viewport: tg?.viewportStableHeight,
  safeTop: tg?.contentSafeAreaInset.top,
  safeBottom: tg?.contentSafeAreaInset.bottom,
});
```

Do not log `initData` itself; it is a credential.

## Release checklist

1. SDK script is in `<head>`, inline, pinned, and loads before app code.
2. `ready()` runs after the first meaningful screen; no permanent loading state.
3. `expand()` or fullscreen is intentional; both modes are usable.
4. Light/dark themes use only theme variables; native chrome colors are set.
5. Safe areas are respected on notched devices and in fullscreen.
6. `initData` is validated server-side, with `auth_date` freshness.
7. `initDataUnsafe` is not used for authorization anywhere.
8. Native buttons have one handler each and correct loading/disabled states.
9. Version-gated features degrade on older clients.
10. Storage limits and sensitivity are respected; no secrets in CloudStorage/localStorage.
11. External links and clipboard reads happen inside user gestures.
12. Tested on iOS, Android, Desktop, and a browser preview.
13. Tested with denied permissions and offline/slow network.
14. Error states are visible; failures do not leave spinners running.
15. BotFather configuration matches the intended launch modes (menu button, main app,
    attachment menu, payments).

## Common testing traps

- **Opening the URL in a browser** and concluding `initData` is broken. It is absent by
  design outside Telegram.
- **Using the production bot token** against the test server. They are different bots.
- **Caching the HTML aggressively.** The WebView may keep an old bundle; version assets or
  set `Cache-Control: no-cache` for the shell during development.
- **Assuming `viewportHeight` is stable.** It changes during gestures; use
  `viewportStableHeight` for layout.
- **Testing only on a high-end phone.** Low-performance Android devices expose animation
  and sensor problems.
- **Ignoring Telegram Web.** Desktop web has different clipboard, link, and popup behavior.
- **Forgetting the attachment-menu quirk.** The main button may be hidden until interaction.
