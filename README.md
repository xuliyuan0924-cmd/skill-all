# 功能沉淀池

> 建站团队的 AI 沟通配方库。将每次交付项目中被验证有效的需求描述沉淀下来，让设计师跳过反复调试 AI 的过程，直接复用已经打磨好的描述和约束。

---

## 它解决什么问题

设计师用 AI 做功能，效果能做出来，但需要大量反复微调才能打通完整链路。

这个池子存的不是功能代码，而是**和 AI 沟通这个功能的正确方式**——即已被验证有效的需求描述、关键约束、以及一开始容易漏说的点。

---

## 快速上手（设计师一次性配置）

**方法一：一键安装脚本（推荐）**

```bash
curl -s https://raw.githubusercontent.com/xuliyuan0924-cmd/skill-all/main/setup.sh | bash
```

**方法二：手动配置**

```bash
# 1. 克隆仓库
git clone https://github.com/xuliyuan0924-cmd/skill-all.git ~/feature-pool

# 2. 链接 Skill 到 OpenCode
ln -s ~/feature-pool/.cursor/skills/feature-pool ~/.cursor/skills/feature-pool
ln -s ~/feature-pool/.cursor/skills/feature-add  ~/.cursor/skills/feature-add
```

**同步最新功能（团队有新功能合并后）**

```bash
git -C ~/feature-pool pull
```

---

## 日常使用

### 复用功能（新项目时）

在 OpenCode 中输入：

```
有没有做过响应式导航栏？
```

或直接触发：`/feature-pool`

AI 会返回匹配的功能卡片，告诉你预览文件路径，确认后直接用验证过的描述生成代码。

### 沉淀功能（项目交付后）

在 OpenCode 中打开项目目录，输入：

```
/feature-add
```

AI 会扫描项目文件，识别可复用的功能，引导你提炼有效描述，自动生成功能卡片并提交 PR 等待 PM 审核。

---

## 工作流

```
【沉淀】
项目交付 → 设计师触发 /feature-add
→ AI 扫描代码，识别功能，提炼有效描述
→ 生成 SKILL.md + preview.html
→ 提交 PR → 钉钉通知 PM
→ PM 审核合并 → 全员 git pull 同步

【复用】
新项目需求 → 设计师描述需求
→ AI 检索功能池，返回预览路径
→ 设计师确认 → AI 用验证过的描述直接执行
```

---

## 目录结构

```
feature-pool/
├── README.md                        # 本文件
├── INDEX.md                         # 功能总索引（所有已上线功能列表）
├── TEMPLATE.md                      # 新功能卡片填写模板
│
├── setup.sh                         # 设计师一键安装脚本
│
├── .cursor/skills/
│   ├── feature-pool/SKILL.md        # 复用检索技能
│   └── feature-add/SKILL.md         # 沉淀引导技能
│
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md     # PR 描述模板
│   └── workflows/dingtalk-notify.yml # PR 创建时钉钉通知 PM
│
└── features/                        # 功能卡片主体
    ├── navigation/                   # 导航类
    ├── hero/                         # 首屏 Banner 类
    ├── content/                      # 内容展示类
    ├── forms/                        # 表单类
    ├── ecommerce/                    # 电商类
    ├── media/                        # 媒体类
    ├── interactive/                  # 交互组件类
    ├── layout/                       # 布局类
    ├── animation/                    # 动效类
    └── industry/                     # 行业模板类
```

每个功能包含两个文件：
- `SKILL.md`：功能的 AI 沟通配方（有效描述 + 关键约束 + 常漏说的 + 变体）
- `preview.html`：纯 HTML/CSS/JS 的交互 demo，可直接在浏览器中预览效果

---

## 参与贡献

### 提交新功能卡片

使用 `feature-add` 技能自动生成，或手动复制 [TEMPLATE.md](TEMPLATE.md) 填写后提交 PR。

### 更新现有功能卡片

如果在使用过程中发现更好的描述方式或新的约束，直接修改对应 SKILL.md 后提交 PR。

### 审核规范（PM 参考）

合并前确认：
- 「有效的需求描述」是否完整、能被直接复制给 AI 使用
- 「关键约束」是否来自真实踩坑，而非臆想
- `preview.html` 是否能正常运行和展示交互效果

---

## GitHub 配置说明

### 钉钉通知配置

1. 在钉钉群创建自定义机器人，获取 Webhook URL
2. 在 GitHub 仓库 → Settings → Secrets and variables → Actions 中新增：
   - Name: `DINGTALK_WEBHOOK_URL`
   - Value: 钉钉机器人的 Webhook URL

配置完成后，每次设计师提交 PR，PM 会自动收到钉钉通知。

---

## 路线图

- [x] 第一阶段：功能池本体 + 两个 Skill + GitHub 工程配置（当前版本）
- [ ] 第二阶段：Web 管理后台（可视化功能列表 + PM 一键审核 + 效果预览）
