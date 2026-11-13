# Telegram Mini Apps — SDK core

Source: <https://core.telegram.org/bots/webapps> (Bot API 10.1, June 2026).
`window.Telegram.WebApp` is available after `telegram-web-app.js` loads.

## Initialization

```html
<script src="https://telegram.org/js/telegram-web-app.js?65"></script>
```

Place it in `<head>` **before any other scripts**. The `?65` suffix pins the SDK build used
by the official docs; the client's Bot API version is a separate value in
`Telegram.WebApp.version`.

The SDK also exposes `window.Telegram.WebView` (lower-level events and `postEvent`). App
code should normally use `WebApp`.

## WebApp fields

| Field | Type | Notes |
|---|---|---|
| `initData` | String | Raw launch payload (query string). Validate server-side before trusting. |
| `initDataUnsafe` | WebAppInitData | Parsed copy. **Never** use for authentication. |
| `version` | String | Bot API version supported by the client, e.g. `"8.0"`. |
| `platform` | String | `android`, `ios`, `tdesktop`, `macos`, `web`, `weba`, `webk`, … |
| `colorScheme` | String | `light` or `dark`; also `var(--tg-color-scheme)`. |
| `themeParams` | ThemeParams | Current theme; also exposed as CSS variables. |
| `isActive` | Boolean | 8.0+ — `false` while minimized/inactive. |
| `isExpanded` | Boolean | Whether the app is at maximum available height. |
| `viewportHeight` | Float | Live visible height. Too jittery for pinning UI. |
| `viewportStableHeight` | Float | Height after gestures/animations settle; use for layout. |
| `headerColor` | String | `#RRGGBB`. |
| `backgroundColor` | String | `#RRGGBB`. |
| `bottomBarColor` | String | `#RRGGBB`. |
| `isClosingConfirmationEnabled` | Boolean | Whether close confirmation is on. |
| `isVerticalSwipesEnabled` | Boolean | 7.7+ — swipe-to-close/minimize state. |
| `isFullscreen` | Boolean | 8.0+ — fullscreen state. |
| `isOrientationLocked` | Boolean | 8.0+ — orientation lock state. |
| `safeAreaInset` | SafeAreaInset | Device notches/navigation bars. |
| `contentSafeAreaInset` | ContentSafeAreaInset | Telegram UI overlap (header, bottom bar). |
| `BackButton` | BackButton | Header back button. |
| `MainButton` | BottomButton | Primary bottom button. |
| `SecondaryButton` | BottomButton | Secondary bottom button (7.10+). |
| `SettingsButton` | SettingsButton | Context-menu Settings item. |
| `HapticFeedback` | HapticFeedback | Native haptics. |
| `CloudStorage` | CloudStorage | Synced key-value storage. |
| `BiometricManager` | BiometricManager | Face/fingerprint auth. |
| `Accelerometer` | Accelerometer | 8.0+ motion sensor. |
| `DeviceOrientation` | DeviceOrientation | 8.0+ orientation sensor. |
| `Gyroscope` | Gyroscope | 8.0+ rotation sensor. |
| `LocationManager` | LocationManager | 8.0+ geolocation. |
| `DeviceStorage` | DeviceStorage | 9.0+ local storage (5 MB). |
| `SecureStorage` | SecureStorage | 9.0+ Keychain/Keystore storage (10 items). |
| `Serverless` | Serverless | Calls Telegram Serverless endpoints. |

## WebApp methods

| Method | Since | Notes |
|---|---|---|
| `isVersionAtLeast(version)` | — | Compare against `version`; use for feature gates. |
| `setHeaderColor(color)` | 6.1 | Hex or `bg_color` / `secondary_bg_color`. Before 6.9 only theme colors/keywords. |
| `setBackgroundColor(color)` | 6.1 | Hex or `bg_color` / `secondary_bg_color`. |
| `setBottomBarColor(color)` | 7.10 | Hex or `bg_color` / `secondary_bg_color` / `bottom_bar_bg_color`; also Android nav bar. |
| `enableClosingConfirmation()` | 6.2 | Native "close anyway?" prompt. |
| `disableClosingConfirmation()` | 6.2 | — |
| `enableVerticalSwipes()` | 7.7 | Recommended unless the app uses vertical gestures. |
| `disableVerticalSwipes()` | 7.7 | Header swipe still closes/minimizes. |
| `requestFullscreen()` | 8.0 | Immersive mode; header becomes transparent; set header color for contrast. |
| `exitFullscreen()` | 8.0 | — |
| `lockOrientation()` | 8.0 | Lock current portrait/landscape mode. |
| `unlockOrientation()` | 8.0 | Follow device rotation again. |
| `addToHomeScreen()` | 8.0 | Prompt to add shortcut; `homeScreenAdded` may not fire. |
| `checkHomeScreenStatus([callback])` | 8.0 | `status`: `unsupported`, `unknown`, `added`, `missed`. |
| `onEvent(eventType, handler)` | — | `this` inside handler is `WebApp`. |
| `offEvent(eventType, handler)` | — | Remove the exact handler reference. |
| `sendData(data)` | — | ≤ 4096 bytes; **keyboard-button launches only**; sends service message and closes. |
| `switchInlineQuery(query[, choose_chat_types])` | 6.7 | Returns user to inline mode; chat types: `users`, `bots`, `groups`, `channels`. |
| `openLink(url[, options])` | — | External browser; **user gesture only**; `{ try_instant_view: true }` since 6.4. |
| `openTelegramLink(url)` | — | Opens `t.me` link inside Telegram; app is not closed since 7.0. |
| `openInvoice(url[, callback])` | 6.1 | Callback gets status; also `invoiceClosed` event. |
| `shareToStory(media_url[, params])` | 7.8 | Native story editor; `StoryShareParams`. |
| `shareMessage(msg_id[, callback])` | 8.0 | Share a `PreparedInlineMessage`; callback boolean. |
| `setEmojiStatus(custom_emoji_id[, params, callback])` | 8.0 | Native confirm dialog; `EmojiStatusParams`. |
| `requestEmojiStatusAccess([callback])` | 8.0 | Permission for Bot API `setUserEmojiStatus`. |
| `downloadFile(params[, callback])` | 8.0 | `DownloadFileParams`; callback boolean. |
| `hideKeyboard()` | 9.1 | No-op when keyboard is not open. |
| `showPopup(params[, callback])` | 6.2 | 1–3 buttons; callback/`popupClosed` gets button `id`. |
| `showAlert(message[, callback])` | 6.2 | Single Close button. |
| `showConfirm(message[, callback])` | 6.2 | Callback boolean. |
| `showScanQrPopup(params[, callback])` | 6.4 | Callback receives text; return `true` to close. |
| `closeScanQrPopup()` | 6.4 | Close scanner after valid data. |
| `readTextFromClipboard([callback])` | 6.4 | **Attachment-menu launches only**, user gesture only. |
| `requestWriteAccess([callback])` | 6.9 | Permission to message the user; check `allows_write_to_pm`. |
| `requestContact([callback])` | 6.9 | Ask for phone number. |
| `requestChat(req_id[, callback])` | 9.6 | Uses a `PreparedKeyboardButton`. |
| `ready()` | — | Hide loading placeholder; call when essential UI is ready. |
| `expand()` | — | Expand to maximum available height. |
| `close()` | — | Close the Mini App. |

## Events

Attach with `onEvent(eventType, handler)`; `this` is the `WebApp` object.

| Event | Since | Handler payload |
|---|---|---|
| `activated` / `deactivated` | 8.0 | none |
| `themeChanged` | — | none; read `this.themeParams` / `this.colorScheme` |
| `viewportChanged` | — | `{ isStateStable }`; height in `this.viewportHeight` |
| `safeAreaChanged` | 8.0 | none; read `this.safeAreaInset` |
| `contentSafeAreaChanged` | 8.0 | none; read `this.contentSafeAreaInset` |
| `mainButtonClicked` | — | none |
| `secondaryButtonClicked` | 7.10 | none |
| `backButtonClicked` | 6.1 | none |
| `settingsButtonClicked` | 6.1 | none |
| `invoiceClosed` | 6.1 | `{ url, status }`; status `paid`/`cancelled`/`failed`/`pending` |
| `popupClosed` | 6.2 | `{ button_id }` (nullable) |
| `qrTextReceived` | 6.4 | `{ data }` |
| `scanQrPopupClosed` | 7.7 | none |
| `clipboardTextReceived` | 6.4 | `{ data }`; empty string for non-text, `null` if no access |
| `writeAccessRequested` | 6.9 | `{ status: 'allowed' \| 'cancelled' }` |
| `contactRequested` | 6.9 | `{ status: 'sent' \| 'cancelled' }` |
| `biometricManagerUpdated` | 7.2 | none |
| `biometricAuthRequested` | 7.2 | `{ isAuthenticated, biometricToken? }` |
| `biometricTokenUpdated` | 7.2 | `{ isUpdated }` |
| `fullscreenChanged` | 8.0 | none; read `this.isFullscreen` |
| `fullscreenFailed` | 8.0 | `{ error: 'UNSUPPORTED' \| 'ALREADY_FULLSCREEN' }` |
| `homeScreenAdded` | 8.0 | none |
| `homeScreenChecked` | 8.0 | `{ status }` |
| `accelerometerStarted` / `Stopped` | 8.0 | none |
| `accelerometerChanged` | 8.0 | none; read `this.x/y/z` |
| `accelerometerFailed` | 8.0 | `{ error: 'UNSUPPORTED' }` |
| `deviceOrientationStarted` / `Stopped` | 8.0 | none |
| `deviceOrientationChanged` | 8.0 | none; read `this.alpha/beta/gamma` |
| `deviceOrientationFailed` | 8.0 | `{ error: 'UNSUPPORTED' }` |
| `gyroscopeStarted` / `Stopped` | 8.0 | none |
| `gyroscopeChanged` | 8.0 | none; read `this.x/y/z` |
| `gyroscopeFailed` | 8.0 | `{ error: 'UNSUPPORTED' }` |
| `locationManagerUpdated` | 8.0 | none |
| `locationRequested` | 8.0 | `{ locationData: LocationData }` |
| `shareMessageSent` | 8.0 | none |
| `shareMessageFailed` | 8.0 | `{ error }`: `UNSUPPORTED`, `MESSAGE_EXPIRED`, `MESSAGE_SEND_FAILED`, `USER_DECLINED`, `UNKNOWN_ERROR` |
| `emojiStatusSet` | 8.0 | none |
| `emojiStatusFailed` | 8.0 | `{ error }`: `UNSUPPORTED`, `SUGGESTED_EMOJI_INVALID`, `DURATION_INVALID`, `USER_DECLINED`, `SERVER_ERROR`, `UNKNOWN_ERROR` |
| `emojiStatusAccessRequested` | 8.0 | `{ status: 'allowed' \| 'cancelled' }` |
| `fileDownloadRequested` | 8.0 | `{ status: 'downloading' \| 'cancelled' }` |

## ThemeParams

All optional strings, `#RRGGBB`; each is also a CSS variable.

| Field | CSS variable | Since |
|---|---|---|
| `bg_color` | `--tg-theme-bg-color` | — |
| `text_color` | `--tg-theme-text-color` | — |
| `hint_color` | `--tg-theme-hint-color` | — |
| `link_color` | `--tg-theme-link-color` | — |
| `button_color` | `--tg-theme-button-color` | — |
| `button_text_color` | `--tg-theme-button-text-color` | — |
| `secondary_bg_color` | `--tg-theme-secondary-bg-color` | 6.1 |
| `header_bg_color` | `--tg-theme-header-bg-color` | 7.0 |
| `bottom_bar_bg_color` | `--tg-theme-bottom-bar-bg-color` | 7.10 |
| `accent_text_color` | `--tg-theme-accent-text-color` | 7.0 |
| `section_bg_color` | `--tg-theme-section-bg-color` | 7.0 |
| `section_header_text_color` | `--tg-theme-section-header-text-color` | 7.0 |
| `section_separator_color` | `--tg-theme-section-separator-color` | 7.6 |
| `subtitle_text_color` | `--tg-theme-subtitle-text-color` | 7.0 |
| `destructive_text_color` | `--tg-theme-destructive-text-color` | 7.0 |

Global variables: `--tg-color-scheme`, `--tg-viewport-height`,
`--tg-viewport-stable-height`, `--tg-safe-area-inset-{top,bottom,left,right}`,
`--tg-content-safe-area-inset-{top,bottom,left,right}`.

## Safe areas

`SafeAreaInset` and `ContentSafeAreaInset` both have `top`, `bottom`, `left`, `right`
(integers, pixels).

- **Safe area** — system UI: notches, navigation bars, rounded corners.
- **Content safe area** — Telegram UI: header, bottom bar, context menu.

Use `padding: max(<design spacing>, var(--tg-content-safe-area-inset-top))`. The content
inset is the one that matters in fullscreen; the device inset prevents clipping by hardware.

## WebAppInitData

| Field | Type | Notes |
|---|---|---|
| `query_id` | String | For `answerWebAppQuery`. |
| `chat_join_request_query_id` | String | 10.1 — for `answerChatJoinRequestQuery`. |
| `user` | WebAppUser | Current user. |
| `receiver` | WebAppUser | Private chat partner; attachment-menu launches only. |
| `chat` | WebAppChat | Group/channel context; attachment menu and join requests. |
| `chat_type` | String | `sender`, `private`, `group`, `supergroup`, `channel`; direct links only. |
| `chat_instance` | String | Stable chat identifier; direct links only. |
| `start_param` | String | `startattach` value; also GET `tgWebAppStartParam`. |
| `can_send_after` | Integer | Seconds before `answerWebAppQuery` is allowed. |
| `auth_date` | Integer | Unix timestamp when the payload was issued. |
| `hash` | String | HMAC for server validation. |
| `signature` | String | Ed25519 signature for third-party validation. |

`initData` is empty for keyboard-button and inline-mode launches.

## WebAppUser

| Field | Type | Notes |
|---|---|---|
| `id` | Integer | ≤ 52 significant bits; use 64-bit or double. |
| `is_bot` | Boolean | Only in `receiver`. |
| `first_name` | String | — |
| `last_name` | String | Optional. |
| `username` | String | Optional. |
| `language_code` | String | IETF tag; only in `user`. |
| `is_premium` | True | Optional. |
| `added_to_attachment_menu` | True | Optional. |
| `allows_write_to_pm` | True | Optional; set after `requestWriteAccess`. |
| `photo_url` | String | `.jpeg` or `.svg`. |

## WebAppChat

| Field | Type | Notes |
|---|---|---|
| `id` | Integer | ≤ 52 significant bits. |
| `type` | String | `group`, `supergroup`, `channel`. |
| `title` | String | — |
| `username` | String | Optional. |
| `photo_url` | String | Optional; attachment menu only. |
