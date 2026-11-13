# Bot API version map

Feature gates are based on the **Bot API version supported by the client**, exposed as
`Telegram.WebApp.version`. The SDK build (`telegram-web-app.js?65`) is a different number;
do not compare them.

Check features with `Telegram.WebApp.isVersionAtLeast('8.0')`. Methods that are too new
usually warn and no-op in the SDK, so a “missing” button is often a version issue.

Source: <https://core.telegram.org/bots/webapps#recent-changes> (current through Bot API
10.1, June 11, 2026).

| Bot API | Date | What it added |
|---|---|---|
| 6.0 | Apr 2022 | Menu button can launch a Mini App (`setChatMenuButton`). |
| 6.1 | Jun 2022 | `version`, `headerColor`, `backgroundColor`, `BackButton`, `HapticFeedback`; `isVersionAtLeast`, `setHeaderColor`, `setBackgroundColor`, `openLink`, `openTelegramLink`, `openInvoice`; `secondary_bg_color`; `MainButton.offClick`; `chat`, `can_send_after`; back/settings/invoice events; attachment menu in groups/channels. |
| 6.2 | Aug 2022 | Closing confirmation, `showPopup`, `showAlert`, `showConfirm`, `is_premium`, `popupClosed`. |
| 6.4 | Dec 2022 | `platform`, `openLink` options, QR scanner, clipboard read, `qrTextReceived`, `clipboardTextReceived`. |
| 6.7 | Apr 2023 | Inline-query-result and direct-link launches; `switchInlineQuery`. |
| 6.9 | Sep 2023 | `CloudStorage`; `requestWriteAccess`, `requestContact`; `added_to_attachment_menu`, `allows_write_to_pm`; permission events; arbitrary header colors. |
| 7.0 | Dec 2023 | `SettingsButton`; header/accent/section/subtitle/destructive theme fields; `openTelegramLink` no longer closes the app. |
| 7.2 | Mar 2024 | `BiometricManager`. |
| 7.6 | Jul 2024 | `section_separator_color`; direct-link apps open full height by default. |
| 7.7 | Jul 2024 | Vertical swipe control (`isVerticalSwipesEnabled`, enable/disable); `scanQrPopupClosed`. |
| 7.8 | Jul 2024 | Main Mini App; `shareToStory`. |
| 7.10 | Sep 2024 | `SecondaryButton`, `secondaryButtonClicked`; `MainButton` renamed to `BottomButton`; `bottomBarColor`, `setBottomBarColor`, `bottom_bar_bg_color`. |
| 8.0 | Nov 2024 | Fullscreen (`requestFullscreen`/`exitFullscreen`, `isFullscreen`), safe areas (`safeAreaInset`, `contentSafeAreaInset`), `isActive`, home-screen shortcuts, emoji status, `shareMessage`, `downloadFile`, `LocationManager`, accelerometer/orientation/gyroscope, orientation lock, `photo_url` for all apps, third-party Ed25519 validation, expanded iOS debugging. |
| 9.0 | Apr 2025 | `DeviceStorage` (5 MB) and `SecureStorage` (10 items). |
| 9.1 | Jul 2025 | `hideKeyboard`. |
| 9.5 | Mar 2026 | `iconCustomEmojiId` on `BottomButton`. |
| 9.6 | Apr 2026 | `requestChat` (uses a `PreparedKeyboardButton`). |
| 10.1 | Jun 2026 | `chat_join_request_query_id`; join-request Mini Apps (`sendChatJoinRequestWebApp`, `answerChatJoinRequestQuery`). |

## Feature gates in code

```ts
const tg = Telegram.WebApp;

if (tg.isVersionAtLeast('7.10')) {
  tg.SecondaryButton.setParams({ text: 'Cancel', position: 'left' }).show();
}

if (tg.isVersionAtLeast('8.0')) {
  tg.requestFullscreen();
} else {
  tg.expand();
}
```

Prefer capability checks over version checks when both are available. For example, test
`typeof tg.requestFullscreen === 'function'` in addition to the version gate; it protects
against clients that report a version but do not implement a platform-specific feature.

## Migration notes

- **7.10:** the class is `BottomButton`; `WebApp.MainButton` still exists and is the primary
  instance. Code that referenced `MainButton` as a type should be updated.
- **8.0:** fullscreen makes safe areas mandatory. If you adopt fullscreen, adopt
  `contentSafeAreaInset` in the same change.
- **8.0:** `photo_url` is now available to all Mini Apps (subject to privacy settings), not
  only attachment-menu launches.
- **9.0:** `DeviceStorage`/`SecureStorage` are not a replacement for a server database.
  They are per-device caches and secret stores; entitlements stay server-side.
- **10.1:** join-request launches use a separate query id. Do not reuse `query_id` handling
  for `chat_join_request_query_id`.

## Version support policy

Telegram clients update independently and users can stay on old versions. A practical
policy:

- Require **6.1+** for the native back button, header colors, and `isVersionAtLeast`.
- Treat **7.x** features as enhancements, not requirements.
- Treat **8.0+** features (fullscreen, sensors, location, sharing, emoji status) as
  progressive enhancements with in-page fallbacks.
- Treat **9.0+** storage as optional; fall back to `localStorage` only for non-sensitive
  data.
- If a feature has no fallback, show a clear message (“Update Telegram to use this”) rather
  than a dead button.
