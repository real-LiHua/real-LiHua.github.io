# Launching Mini Apps

The launch method is part of the app's contract: it determines available data, whether the
app can reply, and whether it opens full height. Pick it before writing UI, and record it
in the bot's setup docs.

## 1. Keyboard button (reply keyboard)

Send a `KeyboardButton` with `web_app: { url }`. The URL must be HTTPS in production.

```json
{
  "keyboard": [[{ "text": "Open form", "web_app": { "url": "https://app.example.com/form" } }]],
  "resize_keyboard": true
}
```

- `initData` is **empty**.
- `Telegram.WebApp.sendData(data)` sends up to 4,096 bytes to the bot as a service message
  and closes the app.
- The bot receives `message.web_app_data.data`; reply normally in the chat.
- Best for simple input (date picker, search, configurator) where a chat reply is enough.

Because `initData` is empty, do not require login for this launch type. Identify the user
through the bot update that delivered the keyboard.

## 2. Inline button

Use an `InlineKeyboardButton` with `web_app: { url }` under a bot message.

- `initData` includes `user` and `query_id`.
- Reply on the user's behalf with Bot API `answerWebAppQuery`:
  `{ web_app_query_id: query_id, result: InlineQueryResult... }`.
- The app closes after the answer; `can_send_after` may delay sending.
- Best for full apps launched from a specific message (order flow, checkout, editor).

## 3. Menu button

Configure the chat menu button globally in BotFather (`/setmenubutton` or *Bot Settings →
Menu Button*), or per chat with `setChatMenuButton`:

```json
{
  "chat_id": 123456789,
  "menu_button": {
    "type": "web_app",
    "text": "Open app",
    "web_app": { "url": "https://app.example.com" }
  }
}
```

Behavior is identical to inline-button launches: `initData` with `user` and `query_id`, and
`answerWebAppQuery` for replies. Use it when the app is the bot's primary interface.

## 4. Main Mini App

Set up **Main Mini App** in BotFather. This adds a prominent **Launch app** button, media
previews, and listing in the Apps tab for users who launched it.

Links:

```text
https://t.me/botusername?startapp
https://t.me/botusername?startapp=command
https://t.me/botusername?startapp=command&mode=compact
```

- `startapp` arrives as `start_param` and GET `tgWebAppStartParam`.
- `chat_type` and `chat_instance` describe the chat context, enabling shared/multiplayer
  experiences.
- Opens at full height by default; `mode=compact` opens at half height.
- Group usage means multiple users share `chat_instance`; never assume one user per app
  instance.

## 5. Direct link

```text
https://t.me/botusername/appname
https://t.me/botusername/appname?startapp=command
https://t.me/botusername/appname?startapp=command&mode=compact
```

- `initData` includes `start_param`, `chat_type`, `chat_instance`.
- No chat read/write access. To send a message, return the user to inline mode with
  `switchInlineQuery`.
- Since Bot API 7.6, opens full height by default; `mode=compact` restores half height.

## 6. Inline mode

Pass a `button` of type `web_app` in `answerInlineQuery` (an
`InlineQueryResultsButton`). It appears above or instead of results and opens the app.

- No chat access; the app cannot read or send messages.
- `switchInlineQuery(query[, choose_chat_types])` returns the user to inline mode with a
  prefilled query.
- Best for content creation that ends with the user picking an inline result.

## 7. Attachment menu

Attachment-menu integration is limited to major advertisers on the Telegram Ad Platform,
but **all bots can use it on the test server**.

Enable in BotFather (test-server account) with `/setattach` or *Bot Settings → Configure
Attachment Menu*, then set the URL.

Add links:

```text
https://t.me/botusername?startattach
https://t.me/botusername?startattach=command
https://t.me/botusername?startattach&choose=users+bots
https://t.me/botusername?startattach=command&choose=groups+channels
```

Chat-specific forms:

```text
https://t.me/username?attach=botusername&startattach=command
https://t.me/+1234567890?attach=botusername&startattach=command
```

- `initData` adds `receiver` (private-chat partner) or `chat` (group/channel), plus
  `start_param`.
- `query_id` allows `answerWebAppQuery` to post into the originating chat.
- `readTextFromClipboard` is available **only** in this mode, and only from a user gesture.
- The main button stays hidden until the user interacts with the page.
- `startattach` may be empty; route on `start_param` presence, not truthiness alone.

## 8. Chat join requests (Bot API 10.1)

When the bot is a guard bot, a `chat_join_request` update includes `query_id`. Call
`sendChatJoinRequestWebApp` to show the Mini App before deciding the request.

- `initData` includes `chat_join_request_query_id` and chat info.
- Finish with Bot API `answerChatJoinRequestQuery`.
- Use for approval flows, age gates, or invite-code checks; keep the decision server-side.

## Deep-link routing

Handle `start_param` early, before rendering the first screen, so the app does not flash a
home screen before redirecting:

```ts
const startParam = new URLSearchParams(location.search).get('tgWebAppStartParam')
  ?? window.Telegram?.WebApp.initDataUnsafe.start_param;
```

Prefer `tgWebAppStartParam` for first paint (available in the URL), then reconcile with the
validated `start_param` from the server. Treat it as untrusted input: validate against an
allowlist of routes/IDs and never interpolate it into HTML.

`mode=compact` changes the initial height, not a capability. Do not use it to detect launch
type.

## BotFather setup checklist

- Create the bot with `@BotFather`; keep the token server-side only.
- Set the Mini App URL (HTTPS, publicly reachable, no auth wall on the initial HTML).
- Configure the menu button (`/setmenubutton`) and/or main Mini App.
- Enable the Settings item if the app has preferences.
- For payments, enable payments and configure the provider.
- Use the **test environment** for attachment menu and destructive experiments: create a
  separate test account and bot; Bot API base becomes
  `https://api.telegram.org/bot<token>/test/METHOD_NAME`. HTTP (non-TLS) is allowed there.

## Design guidelines

Telegram's own guidance, with the practical implication:

- **Mobile-first and responsive.** The WebView ranges from small phones to desktop.
- **Mimic native components.** Use Telegram buttons, popups, and list patterns; users
  already know them.
- **Smooth 60 fps animations.** Avoid layout thrash; animate transforms/opacity.
- **Label inputs and images.** Accessibility is part of native-quality UX.
- **Follow the theme in real time.** Use `--tg-theme-*`; handle `themeChanged`.
- **Respect safe areas.** Especially in fullscreen, where Telegram chrome overlays content.
- **Adapt to device performance.** Android User-Agent includes a performance class:

  ```text
  Telegram-Android/11.3.3 (Google sdk_gphone64_arm64; Android 14; SDK 34; LOW)
  ```

  Parse `LOW` / `AVERAGE` / `HIGH` and reduce effects on low-end devices.
- **Keep the first screen fast.** The loading placeholder hides on `ready()`; render the
  essential UI before calling it.

## Anti-patterns

- Building a custom header with a back arrow instead of using `BackButton`.
- Replacing the main button with a fixed footer and then fighting safe-area insets.
- Requiring `initData` for keyboard-button launches.
- Using `sendData` from a menu-button launch and wondering why nothing happens.
- Treating `startapp` as trusted HTML or as a database key without validation.
- Opening external links from `setTimeout` or on page load; `openLink` needs a gesture.
