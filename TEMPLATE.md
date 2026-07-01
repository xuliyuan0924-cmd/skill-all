# 功能卡片模板

> 每张功能卡片由两个文件组成：
> - `SKILL.md`：AI 沟通配方（有效描述 + 关键约束 + 常漏说的 + 变体）
> - `preview.html`：纯 HTML/CSS/JS 交互 demo，沉淀时由 AI 自动生成

---

## SKILL.md 标准格式

```markdown
---
name: 功能英文标识（小写+连字符，如 sticky-header）
category: 所属分类（navigation / hero / content / forms / ecommerce / media / interactive / layout / animation / industry）
tags: 关键词1, 关键词2, 关键词3
complexity: 低 / 中 / 高
contributor: 提交者姓名
date: YYYY-MM-DD
description: 一句话描述，用于 feature-pool 技能搜索匹配
---

# 功能中文名称

## 有效的需求描述（直接复制给 AI 使用）

「在这里粘贴经过验证的、能让 AI 一次做对的完整需求描述。
描述要足够具体，包含尺寸、交互方式、动画参数等关键细节。」

## 关键约束（缺了 AI 就会做错）

- 约束一：说明为什么必须包含这个条件
- 约束二：说明为什么必须包含这个条件

## 常漏说的（一开始没说、后来才补的）

- 漏说的点一 → 导致的问题
- 漏说的点二 → 导致的问题

## 变体描述（已验证的变体，直接补充给 AI）

- **变体名称**：「在上面基础上，补充描述...」
- **变体名称**：「在上面基础上，补充描述...」
```

---

## preview.html 要求

- 使用纯 HTML / CSS / JS，不依赖任何外部框架
- 展示功能的**交互行为和结构**，不需要还原品牌风格
- 占位文字使用通用内容（如「品牌名称」「导航项」等）
- 文件需能独立在浏览器中打开运行
