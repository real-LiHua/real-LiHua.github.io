// Telegram Auth Module — Public Interface
// 深度模块：文章级访问控制 (前端墙 + 客户端轮询 + Bot 后端)

export interface TelegramAuthConfig {
  enabled: boolean;
  groupId: string;
  groupName?: string;
  customMessage?: string;
}

export interface TelegramAuthWallProps {
  postId: string;
  groupName: string;
  customMessage: string;
  botUsername: string;
}

export interface TelegramAuthStatus {
  verified: boolean;
  expiresAt?: number; // JWT 过期时间戳
  groupId: string;
}

export interface TelegramAuthModule {
  /** 认证墙组件 Props */
  AuthWallProps: TelegramAuthWallProps;

  /** 客户端初始化 (ClientModule) */
  initClient(ctx: {
    document: Document;
    window: Window;
    routerEvents: { onPageLoad: (fn: () => void) => void };
  }): void;

  /** 验证本地缓存的 JWT */
  verifyLocalToken(postId: string): Promise<TelegramAuthStatus | null>;

  /** 发起深度链接认证 */
  startAuthFlow(postId: string, botUsername: string): void;

  /** 轮询验证状态 */
  pollAuthStatus(postId: string, onUpdate: (status: TelegramAuthStatus) => void): () => void;

  /** 清除本地缓存 (登出) */
  clearAuth(postId: string): void;
}

// Bot 后端接口 (供 Grammy 实现参考)
export interface TelegramBotApi {
  /** 处理 /start=auth_{postId} */
  handleAuthStart(ctx: {
    userId: number;
    chatId: number;
    postId: string;
  }): Promise<{ success: boolean; jwt?: string; message: string }>;

  /** 检查用户是否为群组成员 */
  isGroupMember(userId: number, groupId: string): Promise<boolean>;

  /** 签发访问 JWT */
  issueToken(payload: { userId: number; postId: string; groupId: string }): string;
}

export const telegramAuthModule: TelegramAuthModule;