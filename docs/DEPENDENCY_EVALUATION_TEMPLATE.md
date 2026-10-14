# 依赖评估模板 (Dependency Evaluation Template)

配套 `docs/adr/0010-dependency-evaluation.md` 的 L1/L2/L3 三层评估。复制本文件内容到 PR 描述或临时评估记录中使用。

> **何时使用**：新增依赖、替换现有依赖、移除依赖。常规引入在 PR 描述内完成 L1–L3 即可；**架构级依赖**（UI 框架、状态管理、数据库 ORM、构建工具）必须另建 ADR。

---

## 0. 基本信息

| 项            | 值                                            |
| ------------- | --------------------------------------------- |
| 依赖名        | `<package>`                                   |
| 目标版本      | `<version>`（精确到可解析范围，如 `^5.7.47`） |
| 引入/变更类型 | 新增 / 升级 / 替换 / 移除                     |
| 发起者        | `<role>`                                      |
| 关联 Issue/PR | `#<n>`                                        |

---

## 1. L1 — 替代方案对比

| 候选                | 体积 (min+gzip) | 维护活跃度 | 许可证   | 与现有栈契合 | 结论        |
| ------------------- | --------------- | ---------- | -------- | ------------ | ----------- |
| `<候选 A>`          | `<size>`        | `<活跃度>` | `<SPDX>` | `<说明>`     | 采纳 / 否决 |
| `<候选 B>`          | `<size>`        | `<活跃度>` | `<SPDX>` | `<说明>`     | 否决理由    |
| 自研 / 现有能力复用 | —               | —          | —        | `<说明>`     | 否决理由    |

> **原则**：先证伪“能否不引入”。能用现有依赖或平台能力解决时不引入新依赖。

---

## 2. L2 — 评估报告

| 维度     | 结论                                                              |
| -------- | ----------------------------------------------------------------- |
| 安全     | `pnpm audit` / `cargo audit` 无 high/critical；已知 CVE：`<列表>` |
| 许可证   | SPDX：`<license>`；是否触发 GPL/AGPL/Proprietary 红线：是/否      |
| 体积     | 对构建产物的增量：`<KB>`；是否可 tree-shake：是/否                |
| 维护性   | 最近发布：`<date>`；issue 响应；bus factor：`<说明>`              |
| 传递依赖 | 新增传递依赖数：`<n>`；是否引入重复版本：是/否                    |
| 供应链   | 是否有 postinstall 脚本 / 原生二进制 / 私有 registry：`<说明>`    |
| 平台适配 | Node/浏览器/Rust target 支持范围：`<说明>`                        |

---

## 3. L3 — 本地验证

- [ ] 类型检查通过：`pnpm check`
- [ ] 构建通过：`pnpm build`
- [ ] 单测/E2E 通过：`pnpm exec playwright test --project=chromium`
- [ ] 静态检查通过：`pnpm exec oxlint .` && `pnpm exec oxfmt --check`
- [ ] Rust 依赖（如适用）：`cargo test`、`cargo clippy`、`cargo audit`
- [ ] 产物体积对比（如适用）：构建前后 `dist/` 体积差 `<±KB>`

---

## 4. 决策与退出策略

| 项            | 内容                                        |
| ------------- | ------------------------------------------- |
| 决策          | 采纳 / 否决（附一句话理由）                 |
| 迁移路径      | 若替换现有依赖：兼容层、灰度方式            |
| 回滚点        | 回滚到哪个 commit / 版本                    |
| 退出策略      | 若将来移除，替代物是什么、受影响的模块/契约 |
| ADR（架构级） | `<编号>-<slug>.md`（架构级依赖必填）        |

---

## Related Documents

- `docs/adr/0010-dependency-evaluation.md` — 评估流程与阈值
- `docs/SECURITY_WHITEPAPER.md#5.3` — 供应链安全基线
- `.github/workflows/dependency-guard.yml` — 自动化守护
- `.github/pull_request_template.md#依赖变更` — PR 内 L1–L3 清单
