# 运维手册 (Operations Runbook)

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

日常运维、监控、备份、密钥与维护节奏。安全事件响应见
[`docs/SECURITY_WHITEPAPER.md` §7](SECURITY_WHITEPAPER.md#7-事件响应)。

---

## 1. 监控与可观测性 ⏸

| 维度            | 工具 / 来源                        | 内容                      | 状态      |
| --------------- | ---------------------------------- | ------------------------- | --------- |
| 边缘访问日志    | tgcloud Analytics                  | 匿名访问指标，保留 30 天  | ✅ 设计   |
| 构建 / 部署日志 | GitHub Actions（`deploy.yml`）     | 每个 Job 的构建与部署输出 | ✅ 已配置 |
| Bot 运行时日志  | tgcloud `console`                  | handler/endpoint 日志     | ✅ 设计   |
| 站点可用性      | 外部 uptime 检查（UptimeRobot 等） | 4 目标 URL 探测 + 告警    | ⏸ 待配置  |
| IPFS pin 状态   | Pinata Dashboard                   | CID pin 成功/失败         | ⏸ 禁用中  |
| 依赖漏洞        | GitHub Dependabot + `pnpm audit`   | 每周 PR                   | ✅ 已配置 |

> ⏸ 自动化告警尚未接入；当前依赖人工巡检与 GitHub 通知。

---

## 2. 备份与灾难恢复 (Backup & DR)

### 2.1 备份资产

| 资产           | 位置                                    | 恢复方式                                  |
| -------------- | --------------------------------------- | ----------------------------------------- |
| 公开文章内容   | Git 仓库（Markdown/MDX）                | `git clone` + 重建                        |
| **草稿内容**   | **私有 Git 子模块仓库** ⏸               | `git submodule update --init --recursive` |
| 构建产物快照   | IPFS CID（不可变）                      | 通过 CID / 网关取回                       |
| 数据库         | tgcloud DB（schema 定义于 `schema.js`） | `pnpm exec tgcloud migrate` 重写 schema   |
| 密钥 / Secrets | GitHub Secrets + tgcloud Secret         | **不备份**；按附录 C 重新生成/轮换        |

### 2.2 灾难恢复流程

```text
故障确认
    │
    ├─▶ 静态站点不可用 ──▶ git clone → pnpm install → pnpm build → 重新部署
    │
    ├─▶ tgcloud 异常    ──▶ pnpm exec tgcloud rollback（见响应流程）
    │
    ├─▶ 草稿子模块丢失 ──▶ 从私有仓库 recover / 重新 clone
    │
    └─▶ 密钥泄露       ──▶ 撤销 + 轮换（附录 C）→ 重新部署 → 复盘
```

> 内容以 Git 为**单一真实来源**；IPFS CID 作为不可变副本与防篡改佐证。

---

## 3. DNS / HTTPS / HSTS

| 项                       | 配置                                                                     | 来源                                                                         |
| ------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| HTTPS                    | tgcloud / Pages 自动强制 HTTPS，TLS 1.3 only                             | [`docs/SECURITY_WHITEPAPER.md` §3.1](SECURITY_WHITEPAPER.md#31-网络与传输层) |
| HSTS                     | `max-age=31536000; includeSubDomains; preload`（已提交 hstspreload.org） | 同上                                                                         |
| DNSSEC                   | 域名注册商启用                                                           | 同上                                                                         |
| Certificate Transparency | tgcloud 提供监控                                                         | 同上                                                                         |
| 自定义域名               | ⏸ 待确认（各目标域名均用平台默认域名）                                   | —                                                                            |

---

## 4. 密钥轮换节奏

轮换周期与撤销流程来自
[`docs/SECURITY_WHITEPAPER.md` 附录 C](SECURITY_WHITEPAPER.md#c-密钥管理策略)。

| 密钥                        | 存储           | 轮换周期 | 撤销流程                          |
| --------------------------- | -------------- | -------- | --------------------------------- |
| tgcloud API Token           | GitHub Secrets | 90 天    | Settings → Secrets 删除 + 新建    |
| Telegram Bot Token          | tgcloud Secret | 90 天    | BotFather `/revoke` + 重新部署    |
| Codeberg SSH Deploy Key     | GitHub Secrets | 90 天    | Codeberg Settings 删除公钥 + 新建 |
| Pinata JWT                  | GitHub Secrets | 90 天    | Pinata Dashboard 撤销 + 新建      |
| JWT 签名密钥 (`JWT_SECRET`) | tgcloud Secret | 180 天   | 重新部署（旧 JWT 自动失效）       |

> `Cloudflare` 相关 Secrets 已随迁移退役，不纳入轮换。

---

## 5. 事件响应

分级（P0/P1/P2）、隔离、取证、修复、复盘流程与关键联系人见
[`docs/SECURITY_WHITEPAPER.md` §7 事件响应](SECURITY_WHITEPAPER.md#7-事件响应)。

快速入口：

- 部署回滚：`pnpm exec tgcloud rollback`（见 [`docs/DEPLOYMENT.md`](DEPLOYMENT.md#8-回滚程序)）
- 撤销 Secret：GitHub Settings → Secrets / BotFather `/revoke`
- 取证：Git 提交历史、tgcloud WAF 日志、构建日志、IPFS CID 对比

---

## 6. 维护日历

| 频率     | 动作                                                                          | 依据 / 工具                                                               |
| -------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **每周** | `pnpm audit` 漏洞扫描、审查 Dependabot PR、检查站点可用性                     | SECURITY_WHITEPAPER §8.2、`.github/dependabot.yml`                        |
| **每月** | CSP / 安全响应头审计、指针失效扫描、IPFS pin 复核、vnu filterfile 复核        | securityheaders.com / Observatory、`.agents/knowledge/mermaid-svg-fix.md` |
| **季度** | 完整渗透测试（OWASP ZAP + 手工）、ADR 过期审查、pinned 依赖复核、备份恢复演练 | SECURITY_WHITEPAPER §8.2、`.agents/knowledge/dependency-matrix.md`        |
| **每年** | STRIDE 威胁建模重评、架构评审                                                 | SECURITY_WHITEPAPER §8.2                                                  |

---

## 7. 已知运维缺口 (Known Gaps)

| 缺口                    | 影响                       | 计划                                                                         |
| ----------------------- | -------------------------- | ---------------------------------------------------------------------------- |
| 无 uptime 告警          | 站点故障需人工发现         | 接入外部 uptime 检查                                                         |
| IPFS 禁用               | 缺去中心化副本             | 配置 Pinata JWT 后启用                                                       |
| 无单元测试框架          | 纯逻辑模块缺细粒度测试     | ⏸ 待评估（见 [`docs/TESTING.md`](TESTING.md)）                               |
| Cloudflare 退役文档残留 | 旧文档仍列 Cloudflare 目标 | 见 [`docs/DEPLOYMENT.md`](DEPLOYMENT.md#10-过期文档说明-stale-documentation) |

---

## 相关文档

- [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) — 部署与回滚
- [`docs/SECURITY_WHITEPAPER.md`](SECURITY_WHITEPAPER.md) — 安全基线、事件响应、密钥管理
- [`docs/TESTING.md`](TESTING.md) — 质量门禁
- [`docs/TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — 故障排查
- [`docs/GETTING_STARTED.md`](GETTING_STARTED.md) — 本地环境
- `.agents/knowledge/dependency-matrix.md` — 依赖更新策略
