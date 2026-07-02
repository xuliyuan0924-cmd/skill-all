---
description: 从团队功能池检索已有功能，展示有效的 AI 需求描述，直接生成代码复用
---

团队功能池已沉淀的功能：
!`cat ~/feature-pool/INDEX.md 2>/dev/null || echo "⚠️ 功能池未安装，请先运行：git clone git@github.com:xuliyuan0924-cmd/skill-all.git ~/feature-pool"`

我的需求：$ARGUMENTS

请从上方功能池中匹配 1-3 个最相关的功能，格式：

- [ ] **① 功能名称** — 效果说明 — 预览：`~/feature-pool/features/<路径>/preview.html`
- [ ] **② 功能名称** — 效果说明 — 预览：`~/feature-pool/features/<路径>/preview.html`

我选择后，展示该功能 SKILL.md 中的「有效需求描述」和「关键约束」让我确认，然后结合我的补充（技术栈、品牌色等）直接生成代码。
