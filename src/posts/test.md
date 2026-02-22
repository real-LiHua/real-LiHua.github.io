---
title: 测试文章
description: 这是一篇包含各种 Markdown 格式和代码块的测试文章
tags: ["测试", "代码", "Markdown"]
---

## 文本格式

这是普通段落文本。

**这是粗体文本**

_这是斜体文本_

~~这是删除线文本~~

`这是行内代码`

---

## 列表

### 无序列表

- 项目一
- 项目二
  - 嵌套项目
  - 另一个嵌套
- 项目三

### 有序列表

1. 第一项
2. 第二项
3. 第三项

---

## 链接和图片

[这是一个链接](https://example.com)

![占位图](https://placehold.co/600x200)

---

## 引用

> 这是一个引用块。
> 可以换行继续写。
>
> 也可以有多个段落。

---

## 代码块

### JavaScript

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return true;
}

const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((n) => n * 2);

class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }

  greet() {
    return `Hi, I'm ${this.name}`;
  }
}
```

### Python

```python
def fibonacci(n):
    """计算斐波那契数列"""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

class DataProcessor:
    def __init__(self, data):
        self.data = data

    def process(self):
        return [x * 2 for x in self.data]
```

### TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
}

type Status = "pending" | "active" | "completed";

function fetchUser(id: number): Promise<User> {
  return fetch(`/api/users/${id}`).then((res) => res.json());
}
```

### HTML/CSS

```html
<div class="container">
  <header class="header">
    <h1>标题</h1>
    <nav>
      <a href="/">首页</a>
      <a href="/about">关于</a>
    </nav>
  </header>
  <main>
    <article>
      <p>内容区域</p>
    </article>
  </main>
</div>
```

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
  }
}
```

### Bash

```bash
#!/bin/bash

# 变量定义
NAME="World"
echo "Hello, $NAME!"

# 条件判断
if [ -f "file.txt" ]; then
    echo "文件存在"
fi

# 循环
for i in {1..5}; do
    echo "Count: $i"
done
```

### JSON

```json
{
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com",
  "skills": ["JavaScript", "Python", "Rust"],
  "address": {
    "city": "Beijing",
    "country": "China"
  }
}
```

---

## 表格

| 左对齐 | 居中对齐 | 右对齐 |
| :----- | :------: | -----: |
| 内容1  |  内容2   |  内容3 |
| 内容4  |  内容5   |  内容6 |

---

## 任务列表

- [x] 已完成的任务
- [ ] 待完成的任务
- [ ] 另一个待办

---

## 脚注

这里有一个脚注引用[^1]。

[^1]: 这是脚注的内容。

---

## 结论

这是一篇测试文章，展示了各种 Markdown 语法和代码块格式。
