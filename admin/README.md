# 功能沉淀池 · 管理后台

PM 审核界面，用于查看待审核功能卡片、预览交互效果、一键通过或驳回。

## 本地预览

```bash
cd admin
npm install
cp .env.example .env    # 编辑 .env 填入真实配置
npm start
# 打开 http://localhost:3000
```

## 服务器部署

### 第一步：上传代码到服务器

```bash
# 在服务器上克隆仓库
git clone https://github.com/xuliyuan0924-cmd/skill-all.git ~/skill-all
cd ~/skill-all/admin
npm install
```

### 第二步：配置环境变量

```bash
cp .env.example .env
vim .env    # 填写以下内容：
```

| 变量 | 说明 |
|---|---|
| `GITHUB_TOKEN` | GitHub Personal Access Token（需要 `repo` 权限）|
| `GITHUB_OWNER` | GitHub 用户名，即 `xuliyuan0924-cmd` |
| `GITHUB_REPO` | 仓库名，即 `skill-all` |
| `ADMIN_PASSWORD` | PM 打开网页时输入的密码，自定义 |
| `PORT` | 服务端口，默认 3000 |

**如何获取 GitHub Token：**
1. 打开 GitHub → 右上角头像 → Settings → Developer settings
2. Personal access tokens → Tokens (classic) → Generate new token
3. 勾选 `repo` 权限 → 生成并复制

### 第三步：用 PM2 保持后台运行

```bash
npm install -g pm2
pm2 start server.js --name feature-pool-admin
pm2 save
pm2 startup    # 开机自动启动
```

### 第四步：配置 Nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;   # 替换为你的域名或服务器 IP

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 使用说明

1. 打开后台地址，输入 `ADMIN_PASSWORD` 进入
2. 左侧「待审核」列表显示设计师提交的 PR
3. 点击任意条目，右侧展示：
   - **左半部分**：preview.html 真实交互预览
   - **右半部分**：SKILL.md 内容（AI 沟通配方）
4. 确认内容后点「✓ 通过并合并」，PR 自动合并，功能正式上线
5. 若需修改点「✕ 驳回」，填写原因后自动关闭 PR 并评论通知设计师

## 后续更新

```bash
cd ~/skill-all && git pull
pm2 restart feature-pool-admin
```
