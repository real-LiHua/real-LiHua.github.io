# Design

## Decisions

### D1. No group membership check

The request was "if the user is in group -1002025381790, pop up their
nickname". Client-side detection is impossible: the launch `initData` carries
`user` but not membership, and the group id is only observable for
attachment-menu/join-request launches via `initData.chat.id` (and not for
menu-button launches at all). A real membership check needs Bot API
`getChatMember` with the bot token on a server, which this read-only,
backend-free site does not have. Per the user's decision, the membership
check is dropped: entering the page pops the window unconditionally. The
group id remains documented in the page copy for context.

### D2. Native popup inside Telegram, in-page dialog otherwise

Inside Telegram with Bot API >= 6.2 the page calls
`Telegram.WebApp.showPopup({ title, message, buttons: [{ type: "ok" }] })`.
Older clients (or a blocked SDK) and regular browsers fall back to an in-page
`<dialog>`. The SDK loads after `window.load`, so the page polls briefly
(bounded, ~1.5 s) for a real WebApp before falling back; the dialog fallback
is also the path for plain browsers where polling never resolves.

### D3. Nickname = first_name + last_name, parsed defensively

`initDataUnsafe.user` is preferred; otherwise the page parses the raw
`initData` query string (key `user`, percent-encoded JSON) itself. Resolution:
trimmed `first_name` + `last_name` joined by a single space; if both are
missing, fall back to `@username`; if nothing is available, an unknown-user
placeholder. Launch-time theme/palette handling is unchanged.

### D4. No HTML interpolation, anywhere

The nickname travels as a plain string argument to `showPopup` (Telegram
renders it as text) and is written via `textContent` into the dialog. No
`innerHTML`, no template interpolation into markup — nicknames with markup in
them render literally. `initDataUnsafe` is not treated as authentication
anywhere (display-only test page).

### D5. Labeled test page, discoverable in nav

The page is labeled as a test page in its copy, and linked from the shared
navigation with a flask icon entry (`flask`, U+F0C3). The sitemap and search
behavior are otherwise unchanged; the page is expected to be reached from the
nav. No other page's rendering is affected.
