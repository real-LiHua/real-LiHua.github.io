# Spec Delta

## Purpose

Provide a labeled test page proving the Telegram Mini App popup path: the user
enters the page and a window appears with their Telegram nickname. Group
membership is explicitly out of scope (see design D1).

## ADDED Requirements

### Requirement: Entry pops the nickname window

The test page `/test/group-popup/` SHALL, on entry, display the Telegram
user's nickname (`first_name` + `last_name`, see Scenario: fallbacks) in a
popup window. The nickname SHALL come from `WebApp.initDataUnsafe.user`; the
raw `initData` query string SHALL NOT be parsed. It SHALL NOT check or imply
group membership in group -1002025381790.

#### Scenario: Telegram client, Bot API >= 6.2

- **WHEN** a Telegram launch provides a WebApp with `showPopup` and an
  `isVersionAtLeast("6.2")` that returns true
- **THEN** `showPopup` is called once with a title and the resolved nickname,
  and no in-page dialog opens

#### Scenario: Browser or older client

- **WHEN** no real Telegram WebApp is present (regular browser), or the
  client is older than Bot API 6.2
- **THEN** an in-page `<dialog>` opens automatically showing the resolved
  nickname, with an explicit close button and Escape-to-close

#### Scenario: Nickname source is initDataUnsafe

- **WHEN** the SDK exposes `initDataUnsafe.user`
- **THEN** the nickname is resolved from that object, even if the raw
  `initData` payload carries a different or additional `user` value

- **WHEN** `initDataUnsafe.user` is absent but the raw `initData` still
  contains a `user` key
- **THEN** the popup shows the unknown-user placeholder (the raw payload is
  not parsed)

#### Scenario: Nickname fallbacks

- **WHEN** `first_name` and `last_name` are both missing but `username` is present
- **THEN** the popup shows `@username`

- **WHEN** no user identity is available (plain browser, or a launch without
  user identity such as keyboard-button launches)
- **THEN** the popup shows an unknown-user placeholder

#### Scenario: Markup in the nickname renders literally

- **WHEN** `first_name` contains markup such as `<img src=x onerror=...>`
- **THEN** the markup is delivered verbatim to `showPopup` (plain-text
  argument) and rendered as literal text in the dialog via `textContent`; no
  element injection occurs and no injected handler runs

### Requirement: The page is labeled and discoverable

The page SHALL be labeled as a test page in its visible copy and SHALL be
linked from the site navigation with an accessible, labeled icon entry.

#### Scenario: Labeled test page

- **WHEN** a visitor opens `/test/group-popup/`
- **THEN** the visible copy identifies the page as a test page and states
  that group membership is not checked

#### Scenario: Navigation entry

- **WHEN** any page renders its navigation
- **THEN** an icon-only navigation link to `/test/group-popup/` is present
  with an accessible label and title naming the test page
