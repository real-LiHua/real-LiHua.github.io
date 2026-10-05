// Telegram Auth Script - Handles deep link authentication flow
// Uses https://t.me/botname?start=token format

interface TelegramAuthConfig {
  postId: string;
  groupName: string;
  customMessage: string;
  botUsername: string;
}

interface SessionToken {
  token: string;
  expiresAt: number;
  userId: number;
  postId: string;
}

class TelegramAuth {
  private config!: TelegramAuthConfig;
  private statusEl!: HTMLElement | null;
  private pollInterval: number | null = null;
  private readonly STORAGE_KEY = "tg_auth_session";
  private readonly POLL_INTERVAL_MS = 3000;
  private readonly MAX_POLL_DURATION_MS = 120000; // 2 minutes

  constructor() {
    const wall = document.getElementById("telegram-auth-wall");
    if (!wall) return;

    this.config = {
      postId: wall.dataset.postId || "",
      groupName: wall.dataset.groupName || "私有群组",
      customMessage: wall.dataset.customMessage || "此文章需要验证 Telegram 群组成员身份后才能阅读",
      botUsername: (wall.dataset as any).botUsername || "your_bot",
    };

    this.statusEl = document.getElementById("auth-status");
    this.init();
  }

  private init(): void {
    // Check for existing valid session
    const session = this.getSession();
    if (session && this.isSessionValid(session)) {
      this.onAuthSuccess(session);
      return;
    }

    // Check URL for token callback (from bot redirect)
    this.handleUrlCallback();

    // Start polling for auth completion
    this.startPolling();

    // Add click handler to login link for UX feedback
    const loginLink = document.getElementById("telegram-login-link") as HTMLAnchorElement;
    if (loginLink) {
      loginLink.addEventListener("click", () => {
        this.showStatus("正在等待 Telegram 验证...", "info");
        // Ensure polling is active
        this.startPolling();
      });
    }
  }

  private handleUrlCallback(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const userId = urlParams.get("user_id");
    const expiresIn = urlParams.get("expires_in");

    if (token && userId && expiresIn) {
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

      const session: SessionToken = {
        token,
        userId: parseInt(userId, 10),
        postId: this.config.postId,
        expiresAt: Date.now() + parseInt(expiresIn, 10) * 1000,
      };

      this.saveSession(session);
      this.onAuthSuccess(session);
    }
  }

  private startPolling(): void {
    if (this.pollInterval) return;

    const startTime = Date.now();

    this.pollInterval = window.setInterval(async () => {
      // Check if we've been polling too long
      if (Date.now() - startTime > this.MAX_POLL_DURATION_MS) {
        this.stopPolling();
        this.showStatus("验证超时，请重新点击登录链接", "error");
        return;
      }

      // Check for session in storage (set by bot via Web App or separate tab)
      const session = this.getSession();
      if (session && session.postId === this.config.postId && this.isSessionValid(session)) {
        this.stopPolling();
        this.onAuthSuccess(session);
        return;
      }

      // Optionally poll server endpoint for auth status
      try {
        const response = await fetch(`/api/telegram/auth/status?postId=${this.config.postId}`);
        if (response.ok) {
          const data = (await response.json()) as {
            authenticated: boolean;
            token?: string;
            userId?: number;
            expiresIn?: number;
          };
          if (data.authenticated && data.token && data.userId) {
            this.stopPolling();
            const session: SessionToken = {
              token: data.token,
              userId: data.userId,
              postId: this.config.postId,
              expiresAt: Date.now() + (data.expiresIn || 86400) * 1000,
            };
            this.saveSession(session);
            this.onAuthSuccess(session);
          }
        }
      } catch {
        // Ignore poll errors
      }
    }, this.POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private getSession(): SessionToken | null {
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as SessionToken;
    } catch {
      return null;
    }
  }

  private saveSession(session: SessionToken): void {
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore storage errors
    }
  }

  private isSessionValid(session: SessionToken): boolean {
    return session.expiresAt > Date.now() && session.postId === this.config.postId;
  }

  private async onAuthSuccess(session: SessionToken): Promise<void> {
    this.showStatus("验证成功，正在加载内容...", "success");

    try {
      // Fetch protected content with token
      const response = await fetch(`/api/posts/${this.config.postId}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch content");
      }

      const html = await response.text();
      this.renderContent(html);
    } catch (error) {
      console.error("Failed to load protected content:", error);
      this.showStatus("加载内容失败，请刷新重试", "error");
    }
  }

  private renderContent(html: string): void {
    const wall = document.getElementById("telegram-auth-wall");
    if (!wall) return;

    // Replace auth wall with content
    wall.outerHTML = html;

    // Re-initialize scripts for new content (toc, reading-progress, etc.)
    this.reinitializeScripts();
  }

  private reinitializeScripts(): void {
    // Dispatch event for other scripts to re-initialize
    window.dispatchEvent(new CustomEvent("telegram-auth:content-loaded"));

    // Re-run TOC script if available
    if (typeof (window as any).initToc === "function") {
      (window as any).initToc();
    }
  }

  private showStatus(message: string, type: "info" | "success" | "error"): void {
    if (!this.statusEl) return;

    const colors = {
      info: "text-info",
      success: "text-success",
      error: "text-error",
    };

    this.statusEl.innerHTML = `<span class="${colors[type]}">${message}</span>`;
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new TelegramAuth());
} else {
  new TelegramAuth();
}

// Export for potential module usage
export { TelegramAuth };
