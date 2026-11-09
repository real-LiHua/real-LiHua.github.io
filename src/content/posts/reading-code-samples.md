---
title: 代码片段的阅读节奏
description: 让代码示例保持易读，也让上下文留在读者视线里。
publishedAt: 2026-10-20
readingTime: 5 分钟
isPreview: true
topics:
  - slug: technology
    name: 技术
  - slug: writing
    name: 写作
series:
  id: quiet-reading
  title: 安静阅读笔记
  order: 2
---

## 先读上下文

代码示例不应该突然出现。先说明它解决的问题，再展示足够小、能独立理解的片段。

## 让关键部分显眼

```ts
interface ReadingNote {
  title: string;
  minutes: number;
}

const note: ReadingNote = { title: "留一点空白", minutes: 5 };
```

读完代码后，用简短的解释指出值得留意的决定。读者可以复制代码，也可以沿着文章目录回到这一节。
