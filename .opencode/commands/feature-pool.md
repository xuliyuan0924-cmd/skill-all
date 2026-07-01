---
description: 从团队功能池检索已有功能，展示预览，一键复用经过验证的 AI 需求描述生成代码
---

# 功能检索与复用

以下是团队功能池中已沉淀的所有功能：

!`cat ~/feature-pool/INDEX.md 2>/dev/null || echo "⚠️ 功能池未安装，请先运行安装指令：git clone git@github.com:xuliyuan0924-cmd/skill-all.git ~/feature-pool"`

---

我的需求是：$ARGUMENTS

---

请按以下流程执行：

## 第一步：检索匹配功能

根据我的需求关键词，从上方 INDEX.md 中匹配最相关的 1-3 个功能，展示结果：

- [ ] **① 功能名称**
  📂 分类 · 复杂度
  💬 一句话说明效果
  👁 预览：`~/feature-pool/features/<category>/<name>/preview.html`

- [ ] **② 功能名称**
  📂 分类 · 复杂度
  💬 一句话说明效果
  👁 预览：`~/feature-pool/features/<category>/<name>/preview.html`

如果没有匹配到，直接告知我，不要强行匹配。

## 第二步：展示将要使用的需求描述

我选择后，读取对应功能的 SKILL.md 文件（路径：`~/feature-pool/features/<category>/<name>/SKILL.md`），完整展示「有效的需求描述」和「关键约束」两节内容，让我确认后再开始生成代码。

展示格式：

━━━━ 将使用以下需求描述 ━━━━

「[SKILL.md 中有效的需求描述原文]」

⚠️ 关键约束（已内置，无需重复说明）：
[SKILL.md 中关键约束原文]

━━━━━━━━━━━━━━━━━━━━━━━━

请告诉我当前项目需要补充的信息（可直接说「没有，开始做」）：
- 技术栈（Vue / React / 纯 HTML）
- 品牌色 / 字体
- 其他特殊要求

## 第三步：整合执行

将「有效需求描述 + 关键约束 + 我的补充」合并，按当前项目的技术栈生成完整代码。

完成后提示：
✅ 已完成「功能名称」
如果这次实现中发现了新的约束或更好的描述方式，可以用 `/feature-add` 更新功能池，让大家都受益。
