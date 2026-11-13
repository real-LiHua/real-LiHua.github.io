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

// The raw launch payload is a query string; `user` is percent-encoded JSON.
// Returns null on any inconsistency instead of throwing — the page is a
// test harness, not an auth surface.
export const parseLaunchUser = (initData: string): TelegramUserLike | null => {
  if (!initData) {
    return null;
  }
  try {
    const raw = new URLSearchParams(initData).get("user");
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as TelegramUserLike;
  } catch {
    return null;
  }
};
