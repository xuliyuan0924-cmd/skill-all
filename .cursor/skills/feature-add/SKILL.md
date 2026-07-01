---
name: feature-add
description: >-
  将当前项目中已完成的功能沉淀到团队功能池。读取项目代码，自动识别可复用的
  UI 功能，引导设计师提炼有效的 AI 需求描述和关键约束，生成功能卡片后提交
  GitHub PR 等待 PM 审核。触发词：沉淀功能、/feature-add、把这次的功能录进池子、
  沉淀一下、记录功能
---

# 功能沉淀引导

## 前置要求

执行前确认：
1. 当前 OpenCode 工作区已打开项目目录
2. 本地已克隆功能池仓库（`~/feature-pool`）
3. 已配置好 git 用户信息

---

## 第一步：扫描项目，识别可沉淀的功能

读取当前工作区的项目文件（重点扫描 HTML / CSS / JS / Vue / React 组件文件），识别其中独立的 UI 功能模块。

展示清单，格式如下，询问设计师：

```
我扫描了项目，发现以下可沉淀的功能：

① 响应式粘性导航栏（src/components/Header.vue）
② 全屏视频首屏 Banner（src/components/Hero.vue）
③ 带验证的联系表单（src/components/ContactForm.vue）
④ 图片瀑布流相册（src/components/Gallery.vue）

请输入序号选择要沉淀的功能（如「① ③」或「全部」）：
```

---

## 第二步：逐个处理每个选中的功能

对每个选中的功能，依次执行以下流程：

### 2a. 反推有效的需求描述

读取该功能对应的代码文件，分析其实现逻辑，生成一段「如果从零让 AI 复现这个功能，应该怎么描述」的草稿。

描述要包含：
- 视觉效果和交互行为（用户看到/操作了什么）
- 关键的数值参数（尺寸、时间、断点等）
- 状态变化（hover / active / scroll / 移动端等）

### 2b. 向设计师追问补充信息

展示草稿后，询问：

```
这是我根据代码反推的需求描述草稿：

「[草稿内容]」

请帮我补充以下信息（直接说「没有」可跳过）：
1. 这个描述有没有漏掉什么关键约束？
   （比如：调试时特别加的条件、客户强调的要求、踩过的坑）
2. 有没有一开始忘说、后来才补充的描述？
3. 有没有已验证的变体版本？（如深色版、带动画版等）
```

### 2c. 生成功能卡片 SKILL.md

整合代码分析 + 设计师补充，按 `~/feature-pool/TEMPLATE.md` 格式生成 SKILL.md。

分类参考：
- `navigation`：导航栏、侧边栏、面包屑、锚点导航
- `hero`：首屏 Banner、全屏展示、视差滚动
- `content`：卡片列表、时间轴、FAQ、数据展示
- `forms`：联系表单、预约表单、搜索框、登录框
- `ecommerce`：商品卡、购物车、价格表、结算流程
- `media`：图片轮播、相册、视频播放器、地图
- `interactive`：弹窗、抽屉、标签页、折叠面板、Tooltip
- `layout`：页脚、响应式容器、网格布局、分割线
- `animation`：滚动触发动画、入场动效、Loading 状态
- `industry`：行业特定模板（餐饮、Portfolio、博客等）

### 2d. 生成 preview.html

基于功能代码和描述，生成一个纯 HTML/CSS/JS 的交互 demo 文件：
- 不依赖任何外部框架
- 展示完整的交互行为（动画、响应式、状态变化）
- 占位内容使用通用文字（「品牌名称」「导航项」等）
- 文件能独立在浏览器中运行

### 2e. 请设计师确认

```
已生成功能卡片：

📄 SKILL.md 预览：
[展示关键字段内容]

🖼 preview.html 已生成，可在浏览器打开确认效果

确认无误后输入「确认」继续，或告诉我需要修改的地方：
```

---

## 第三步：写入功能池并提交 PR

所有功能确认后，执行：

```bash
cd ~/feature-pool

# 创建新分支
git checkout -b feat/功能英文名-$(date +%Y%m%d)

# 将生成的文件写入对应目录
# features/<category>/<feature-name>/SKILL.md
# features/<category>/<feature-name>/preview.html

# 更新 INDEX.md，在对应分类下新增一行
# - [功能名](路径) — 一句话描述 · 标签

git add .
git commit -m "feat: 新增「功能中文名」功能卡片"
git push origin feat/功能英文名-$(date +%Y%m%d)

# 创建 PR（使用 gh CLI）
gh pr create \
  --title "新增功能卡片：功能中文名" \
  --body "## 新增功能\n\n**功能名称**：功能中文名\n**分类**：category\n**提交人**：设计师姓名\n\n## 功能描述\n\n[SKILL.md 中的描述摘要]\n\n## 预览\n\n[preview.html 截图（如有）]"
```

完成后告知设计师：

```
✅ PR 已创建，等待 PM 审核。
   PR 链接：[GitHub PR URL]
   审核通过后，所有设计师 git pull 即可同步使用这个功能。
```

---

## 注意事项

- 一次可以批量处理多个功能，但每个功能单独确认
- SKILL.md 中的「有效描述」必须是能让 AI 独立执行的完整句子，不能含「如上」「同前」等引用
- preview.html 不需要还原品牌颜色，用通用占位样式即可
- 如果设计师说「先跳过这个」，记录下来，最后统一问是否要补充
