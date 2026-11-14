/**
 * Nickname helpers for the test popup page. Display-only: values are passed to `showPopup` as plain
 * text or written via `textContent`; markup must never be interpreted as HTML.
 */

export interface TelegramUserLike {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

const UNKNOWN_USER = "未知用户";

const clean = (value: string | undefined): string =>
  typeof value === "string" ? value.trim() : "";

export const nicknameOf = (user?: TelegramUserLike | null): string => {
  const first = clean(user?.first_name);
  const last = clean(user?.last_name);
  const joined = [first, last].filter(Boolean).join(" ");
  if (joined) {
    return joined;
  }
  const username = clean(user?.username);
  return username ? `@${username}` : UNKNOWN_USER;
};
