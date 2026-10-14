// Telegram auth (client): renders the auth wall, then fetches and injects the
// gated article HTML once the SSR endpoint confirms a valid token.

import type { ClientContext } from "@/modules/types";

interface WallDataset extends DOMStringMap {
  postId: string;
  groupName: string;
  botUsername: string;
  customMessage?: string;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000;

export const TelegramAuth = {
  init(ctx: ClientContext): void {
    const walls = ctx.utils.queryAll<HTMLElement>("[data-telegram-auth]");
    for (const wall of walls) {
      if (wall.dataset.authBound === "true") {
        continue;
      }
      wall.dataset.authBound = "true";
      activate(ctx, wall);
    }
  },
};

const activate = (ctx: ClientContext, wall: HTMLElement): void => {
  const data = wall.dataset as WallDataset;
  const { postId } = data;

  const actions = ctx.document.createElement("div");
  actions.className = "mt-4 flex flex-col items-center gap-2";

  const deepLink = ctx.document.createElement("a");
  deepLink.className = "btn btn-primary";
  deepLink.href = `https://t.me/${data.botUsername}?start=auth_${encodeURIComponent(postId)}`;
  deepLink.target = "_blank";
  deepLink.rel = "noopener";
  deepLink.textContent = "在 Telegram 中验证";

  const status = ctx.document.createElement("p");
  status.className = "text-sm text-base-content/60";
  status.textContent = `加入「${data.groupName}」后自动解锁`;

  actions.append(deepLink, status);
  wall.append(actions);

  const started = Date.now();
  const poll = async (): Promise<void> => {
    try {
      const response = await ctx.window.fetch(`/api/posts/${encodeURIComponent(postId)}`);
      if (response.ok) {
        const result = (await response.json()) as { html?: string };
        if (result.html) {
          wall.classList.remove("items-center", "text-center");
          wall.classList.add("prose", "max-w-none");
          wall.innerHTML = result.html;
          return;
        }
      }
    } catch {
      // keep polling on transient errors
    }
    if (Date.now() - started < POLL_TIMEOUT_MS) {
      setTimeout(() => void poll(), POLL_INTERVAL_MS);
    }
  };
  void poll();
};
