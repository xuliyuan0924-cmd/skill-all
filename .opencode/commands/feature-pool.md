---
description: 从团队功能池检索已有功能，展示有效的 AI 需求描述，直接生成代码复用
---

请完成以下任务：

1. 读取文件 `~/feature-pool/INDEX.md`，根据我的需求「$ARGUMENTS」匹配 1-3 个最相关的功能
2. 用以下格式展示匹配结果：

- [ ] **① 功能名称** — 效果说明 — 预览：`~/feature-pool/features/<路径>/preview.html`
- [ ] **② 功能名称** — 效果说明 — 预览：`~/feature-pool/features/<路径>/preview.html`

3. 我选择后，读取对应的 `~/feature-pool/features/<路径>/SKILL.md`，展示其中「有效的需求描述」和「关键约束」让我确认
4. 我确认后，结合我的补充（技术栈、品牌色等）直接生成代码
