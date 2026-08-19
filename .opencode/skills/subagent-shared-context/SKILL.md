---
description: 共享上下文管理 - 项目规范、架构决策记录 (ADR)、接口契约
---

# 共享上下文管理

## ADR（架构决策记录）

### 位置

```
.agents/adr/
├── 001-component-architecture.md   # 单布局+模块化组件+原生脚本
├── 002-content-pipeline.md         # satteri+git日期+Mermaid预渲染
├── 003-deployment-strategy.md      # 三端同步+Cloudflare优先边缘能力
└── NNN-short-title.md              # 新决策按序号递增
```

### 格式模板

```markdown
# ADR NNN: 标题

## Status

Accepted | Superseded | Deprecated

## Context

决策背景、问题、约束

## Decision

核心决策内容

## Consequences

- 正面影响
- 负面影响/风险
- 后续工作

## References

- 相关文件、PR、Issue
```

## 接口契约

### 定义位置

```
.agents/contracts/
├── content-schema.json      # Content Collections 导出类型
├── component-props.json     # 核心组件 Props 类型
├── script-api.json          # 客户端脚本暴露的全局 API
└── build-output.json        # 构建产物结构
```

### 使用方式

```bash
# 读取契约
cat .agents/contracts/content-schema.json | jq '.BlogPost'

# 验证实现符合契约
# 在任务中引用：`inputs.contracts: ["content-schema"]`
```

## 项目规范速查（只读）

### 命名约定

- 组件：PascalCase (`PostCard.astro`)
- 脚本：kebab-case (`theme-toggle.ts`)
- CSS 变量：`--prefix-name` (daisyUI 规范)
- 文件：kebab-case 目录，PascalCase 组件文件

### 类型约定

- 禁止 `any`、禁止隐式 `any`
- Props 必须显式 `interface Props`
- Zod schema 作为单一事实来源
- 日期：`dayjs` 对象或 ISO 字符串

### 交互约定

- `astro:page-load` 统一初始化事件
- `localStorage` key: `theme`
- `data-*` 属性传递配置（如 `data-gravatar-fallback`）
- Toast: `window.dispatchEvent(new CustomEvent('toast', {detail: {...}}))`

## 读取命令

```bash
# 读取 ADR
cat .agents/adr/001-component-architecture.md

# 读取契约
cat .agents/contracts/content-schema.json

# 搜索规范
grep -r "严禁使用 any" .agents/
```
