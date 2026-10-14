# Security Policy

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

本政策覆盖 `real-LiHua.github.io` 仓库及其两个子系统：Astro 7 个人博客与 tgcloud Telegram Bot。完整安全架构、威胁模型与密钥管理策略见 `docs/SECURITY_WHITEPAPER.md`。

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅        |
| < 1.0   | ❌        |

安全修复通常以补丁版本发布到最新的 `main`。

## Reporting a Vulnerability

**请勿通过公开 Issue 报告安全漏洞。**

优先使用 GitHub Security Advisories 进行私密报告：

- <https://github.com/real-LiHua/real-LiHua.github.io/security/advisories/new>

备选联系方式：`⏸ 待确认`（维护者安全邮箱待补充）。

报告时请尽量包含：

- 受影响组件与版本（博客 / 构建管线 / tgcloud Bot）。
- 复现步骤或最小 PoC。
- 影响评估（机密性 / 完整性 / 可用性）。
- 是否已公开、是否愿意署名。

## Scope

### In scope

- 博客站点：CSP 绕过、XSS、内容注入、水印 / 溯源绕过。
- 构建管线：Pagefind 索引、链接检查、HTML 验证、Mermaid 渲染与水印注入阶段。
- tgcloud Bot：`initData` / Login Widget 验证、JWT 签发与校验、受保护内容路由、群成员校验。
- 密钥处理与 CI/CD：Secret 泄露、权限过大、供应链投毒。

### Out of scope

- 第三方平台自身（Telegram、GitHub、Codeberg、Pinata、tgcloud）的基础设施问题——请报告给对应厂商。
- 拒绝服务（DoS / DDoS）与流量型攻击。
- 社会工程、钓鱼、物理攻击。
- 已停止支持的版本（< 1.0）。
- 文章内容本身的观点分歧。

## Coordinated Disclosure

我们采用协调披露流程：

| 阶段         | 目标时限     |
| ------------ | ------------ |
| 确认收到报告 | 48 小时内    |
| 初步分级     | 5 个工作日内 |
| 修复发布     | 30 天内      |

- 在修复发布前，请勿公开披露漏洞细节。
- 修复完成后，我们会在经你同意的前提下致谢（如需匿名请说明）。
- 严重事件按 `docs/SECURITY_WHITEPAPER.md` 第 7 节的事件响应流程处理。

## References

- `docs/SECURITY_WHITEPAPER.md` — 威胁模型、CSP、认证、构建管线与密钥管理策略。
- `docs/adr/0010-dependency-evaluation.md` — 依赖评估与供应链安全基线。
