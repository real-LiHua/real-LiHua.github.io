---
title: "认证阅读示例"
description: "这篇示例文章演示 Telegram 认证阅读：正文仅在验证通过后由服务端返回。"
publishDate: 2026-09-20
tags: ["telegram", "meta"]
authors: ["real-LiHua"]
telegramAuth:
  enabled: true
  groupId: "-1001234567890"
  groupName: "示例读者群"
  customMessage: "加入「示例读者群」即可阅读全文。"
---

## 仅成员可见

这段正文不会出现在静态构建的 HTML 中。静态页面只渲染验证墙；客户端通过
`/api/posts/<id>` 请求正文，服务端校验 `tg_auth_*` Cookie 中的 JWT 后才返回渲染结果。

> 因此，未验证的访客既不能从页面源码、也不能从构建产物中读取这段内容。
