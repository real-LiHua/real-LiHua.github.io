# UI components and native dialogs

Native UI is cheaper and more consistent than rebuilding controls in HTML. Telegram
renders these inside its own chrome, so they already respect theme, safe areas, and haptics.

## BackButton

Header back button, hidden by default.

| Member | Notes |
|---|---|
| `isVisible` | Boolean, read-only state. |
| `show()` / `hide()` | Toggle visibility. |
| `onClick(cb)` | Alias for `onEvent('backButtonClicked', cb)`. |
| `offClick(cb)` | Remove the exact handler. |

All methods return the object and can be chained.

```ts
const { BackButton } = Telegram.WebApp;
BackButton.onClick(() => router.back());
BackButton.show();
// At the root screen:
BackButton.hide();
```

`BackButton` is not browser history. Decide per screen; hiding it at the root prevents a
dead-end tap. On desktop/web, the header may also show a close button.

## BottomButton (MainButton and SecondaryButton)

`WebApp.MainButton` and `WebApp.SecondaryButton` share one implementation.

| Field | Notes |
|---|---|
| `type` | Read-only: `main` or `secondary`. |
| `iconCustomEmojiId` | 9.5+ — custom emoji before the text. |
| `text` | Default `Continue` (main) / `Cancel` (secondary). |
| `color` | Default `themeParams.button_color` (main) / `themeParams.bottom_bar_bg_color` (secondary). |
| `textColor` | Default `themeParams.button_text_color` (main) / `themeParams.button_color` (secondary). |
| `isVisible` | Hidden by default. |
| `isActive` | Enabled by default. |
| `hasShineEffect` | 7.10+ — animated shine. |
| `position` | Secondary only: `left` (default), `right`, `top`, `bottom`; applies when both are visible. |
| `isProgressVisible` | Read-only. |

| Method | Notes |
|---|---|
| `setText(text)` | Update label. |
| `onClick(cb)` / `offClick(cb)` | Alias for `mainButtonClicked` / `secondaryButtonClicked`. |
| `show()` / `hide()` | Toggle visibility. |
| `enable()` / `disable()` | Toggle interactivity. |
| `showProgress(leaveActive?)` | Loading spinner; disables the button unless `leaveActive=true`. |
| `hideProgress()` | Removes spinner; does **not** re-enable a disabled button. |
| `setParams(params)` | Bulk update; all methods chain. |

`setParams` keys: `icon_custom_emoji_id`, `text`, `color`, `text_color`,
`has_shine_effect`, `position`, `is_active`, `is_visible`.

```ts
const { MainButton, SecondaryButton, HapticFeedback } = Telegram.WebApp;

MainButton.setParams({ text: 'Pay', has_shine_effect: true }).show();
SecondaryButton.setParams({ text: 'Cancel', position: 'left' }).show();

MainButton.onClick(async () => {
  MainButton.showProgress();
  try {
    await pay();
    HapticFeedback.notificationOccurred('success');
  } finally {
    MainButton.hideProgress().enable();
  }
});
```

Gotchas:

- Attachment-menu launches keep the main button hidden until the first interaction. Provide
  an in-page action as well.
- `showProgress()` disables the button; calling `hideProgress()` alone leaves it disabled.
- The buttons are global singletons. In a component-heavy app, bind once in a layout or
  store and update `text` on route changes; do not stack handlers.
- Secondary button `position` is ignored when it is the only visible button.

## SettingsButton

Context-menu “Settings” item, hidden by default; requires BotFather configuration.

| Member | Notes |
|---|---|
| `isVisible` | Boolean. |
| `show()` / `hide()` | 7.0+. |
| `onClick(cb)` / `offClick(cb)` | Alias for `settingsButtonClicked`. |

Use it for account, notifications, or app preferences; it keeps settings out of the main
navigation.

## HapticFeedback

| Method | Values |
|---|---|
| `impactOccurred(style)` | `light`, `medium`, `heavy`, `rigid`, `soft` |
| `notificationOccurred(type)` | `error`, `success`, `warning` |
| `selectionChanged()` | No argument; only on selection change, not confirmation |

Haptics are best-effort: some devices/platforms ignore them. Never make haptics the only
feedback for an action.

## Native popups

### PopupParams

| Field | Type | Notes |
|---|---|---|
| `title` | String | Optional, ≤ 64 chars. |
| `message` | String | Required, 1–256 chars. |
| `buttons` | PopupButton[] | Optional, 1–3; defaults to `[{ type: 'close' }]`. |

### PopupButton

| Field | Type | Notes |
|---|---|---|
| `id` | String | Optional, ≤ 64; returned on press. |
| `type` | String | `default`, `ok`, `close`, `cancel`, `destructive`. |
| `text` | String | Required for `default`/`destructive`, ≤ 64. |

```ts
Telegram.WebApp.showPopup(
  {
    title: 'Delete project?',
    message: 'This cannot be undone.',
    buttons: [
      { id: 'cancel', type: 'cancel' },
      { id: 'delete', type: 'destructive', text: 'Delete' },
    ],
  },
  (buttonId) => {
    if (buttonId === 'delete') remove();
  },
);
```

`showAlert(message)` and `showConfirm(message)` are shortcuts; each accepts a callback.
The `popupClosed` event fires with `{ button_id }` as well. Prefer native popups over
`window.confirm`: the latter is inconsistent in WebViews and blocks the page.

## QR scanner

### ScanQrPopupParams

| Field | Type | Notes |
|---|---|---|
| `text` | String | Optional caption under “Scan QR”, ≤ 64. |

```ts
Telegram.WebApp.showScanQrPopup({ text: 'Scan a product code' }, (data) => {
  if (!isValid(data)) return false; // keep scanning
  useCode(data);
  return true; // close the scanner
});
```

`closeScanQrPopup()` closes it programmatically. Since 7.7, `scanQrPopupClosed` fires when
the user dismisses the scanner; do not assume the callback ran.

## Stories

### StoryShareParams

| Field | Type | Notes |
|---|---|---|
| `text` | String | 0–200 chars; 0–2048 for Premium. |
| `widget_link` | StoryWidgetLink | Link widget; Premium only. |

### StoryWidgetLink

| Field | Type | Notes |
|---|---|---|
| `url` | String | Required. |
| `name` | String | Optional, ≤ 48. |

```ts
Telegram.WebApp.shareToStory('https://cdn.example.com/story.jpg', {
  text: 'My result',
  widget_link: { url: 'https://t.me/examplebot/app', name: 'Open app' },
});
```

`media_url` must be HTTPS. Story sharing opens the native editor; success is not guaranteed
and there is no completion callback.

## Emoji status

### EmojiStatusParams

| Field | Type | Notes |
|---|---|---|
| `duration` | Integer | Seconds; omit for permanent. |

```ts
Telegram.WebApp.setEmojiStatus('5368324170671202286', { duration: 3600 }, (ok) => {
  if (!ok) return;
  // Persist the choice for the bot to re-apply via setUserEmojiStatus.
});
```

`setEmojiStatus` always shows a native confirmation. For programmatic updates, call
`requestEmojiStatusAccess()` and then use Bot API `setUserEmojiStatus` with the user's
permission.

## File downloads

### DownloadFileParams

| Field | Type | Notes |
|---|---|---|
| `url` | String | HTTPS URL. |
| `file_name` | String | Suggested filename. |

Server response should include `Content-Disposition: attachment; filename="..."` and
`Access-Control-Allow-Origin: https://web.telegram.org`, otherwise the download may fail on
web.

```ts
Telegram.WebApp.downloadFile(
  { url: 'https://cdn.example.com/report.pdf', file_name: 'report.pdf' },
  (accepted) => { if (accepted) toast('Download started'); },
);
```

The callback means the user accepted the download request, not that the file finished.

## Invoices

```ts
Telegram.WebApp.openInvoice(invoiceUrl, (status) => {
  // paid | cancelled | failed | pending
});
```

Also listen for `invoiceClosed` with `{ url, status }`. `pending` is not failure: the bot
receives `successful_payment` when it settles. Do not grant entitlements from the client
callback; confirm on the server via the payment update.

## Clipboard

`readTextFromClipboard(callback)` only works for **attachment-menu** launches and only
from a user gesture. For other launch types, show an input and let the user paste. Writing
to the clipboard is not exposed by the SDK; use the browser Clipboard API from a gesture.

## Design notes

- Prefer one primary action per screen. Two bottom buttons are for genuine alternatives
  (Buy / Cancel), not for equally weighted navigation.
- Use `HapticFeedback.selectionChanged()` on pickers and segmented controls, and
  `notificationOccurred('success' | 'error')` after async outcomes.
- Native popups are limited to three buttons; for richer flows build a bottom sheet or a
  separate screen with the back button visible.
- Keep button labels short: Telegram truncates long labels, especially on small screens.
