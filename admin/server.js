import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const {
  GITHUB_TOKEN,
  GITHUB_OWNER,
  GITHUB_REPO,
  ADMIN_PASSWORD,
  PORT = 3000,
} = process.env;

const GITHUB_API = 'https://api.github.com';

/** GitHub API 请求头 */
const ghHeaders = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

/** 简单密码鉴权中间件 */
app.use('/api', (req, res, next) => {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }
  next();
});

/* ─────────────────────────────────────────────
   GET /api/pending  待审核（开放中的 PR）
───────────────────────────────────────────── */
app.get('/api/pending', async (_req, res) => {
  try {
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls?state=open&per_page=50`,
      { headers: ghHeaders }
    );
    const prs = await r.json();

    const items = prs.map((pr) => ({
      id: pr.number,
      title: pr.title,
      author: pr.user.login,
      createdAt: pr.created_at,
      body: pr.body || '',
      url: pr.html_url,
      branch: pr.head.ref,
    }));

    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/approved  已上线功能（读 INDEX.md 解析）
───────────────────────────────────────────── */
app.get('/api/approved', async (_req, res) => {
  try {
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/INDEX.md`,
      { headers: ghHeaders }
    );
    const data = await r.json();
    const raw = Buffer.from(data.content, 'base64').toString('utf-8');

    // 解析 INDEX.md 中的功能链接行：- [名称](路径) — 描述 · 标签
    const regex = /^- \[(.+?)\]\((.+?)\)\s*[—–-]\s*(.+?)(?:\s*·\s*(.+))?$/gm;
    const features = [];
    let match;
    while ((match = regex.exec(raw)) !== null) {
      const skillPath = match[2].replace('SKILL.md', '').replace(/\/$/, '');
      features.push({
        name: match[1],
        path: skillPath,
        description: match[3].trim(),
        tags: match[4] ? match[4].split(',').map((t) => t.trim()) : [],
      });
    }
    res.json(features);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/skill?path=features/navigation/sticky-header
   返回 SKILL.md 内容
───────────────────────────────────────────── */
app.get('/api/skill', async (req, res) => {
  const { path: p } = req.query;
  if (!p) return res.status(400).json({ error: '缺少 path 参数' });

  try {
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${p}/SKILL.md`,
      { headers: ghHeaders }
    );
    const data = await r.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    res.json({ content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/preview?path=features/navigation/sticky-header
   返回 preview.html 内容（前端用 srcdoc 渲染）
───────────────────────────────────────────── */
app.get('/api/preview', async (req, res) => {
  const { path: p } = req.query;
  if (!p) return res.status(400).json({ error: '缺少 path 参数' });

  try {
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${p}/preview.html`,
      { headers: ghHeaders }
    );
    const data = await r.json();
    const html = Buffer.from(data.content, 'base64').toString('utf-8');
    res.json({ html });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/pr-files/:pr_number
   返回 PR 中包含的功能路径（用于加载待审核的预览）
───────────────────────────────────────────── */
app.get('/api/pr-files/:pr_number', async (req, res) => {
  try {
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${req.params.pr_number}/files`,
      { headers: ghHeaders }
    );
    const files = await r.json();

    // 找 SKILL.md 所在的功能目录
    const skillFile = files.find((f) => f.filename.endsWith('SKILL.md'));
    const featurePath = skillFile
      ? skillFile.filename.replace('/SKILL.md', '')
      : null;

    // 获取 preview.html 内容（从 PR 的 blob 拉取）
    let previewHtml = null;
    const previewFile = files.find((f) => f.filename.endsWith('preview.html'));
    if (previewFile) {
      const pr = await fetch(previewFile.raw_url, { headers: ghHeaders });
      previewHtml = await pr.text();
    }

    // 获取 SKILL.md 内容
    let skillContent = null;
    if (skillFile) {
      const sr = await fetch(skillFile.raw_url, { headers: ghHeaders });
      skillContent = await sr.text();
    }

    res.json({ featurePath, previewHtml, skillContent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────────
   POST /api/approve/:pr_number  通过并合并 PR
───────────────────────────────────────────── */
app.post('/api/approve/:pr_number', async (req, res) => {
  const { pr_number } = req.params;
  try {
    // 合并 PR
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${pr_number}/merge`,
      {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify({
          commit_title: `✅ 审核通过：合并功能卡片 #${pr_number}`,
          merge_method: 'squash',
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message });
    res.json({ success: true, message: '已合并，功能正式上线' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────────
   POST /api/reject/:pr_number  驳回 PR
   body: { reason: "驳回原因" }
───────────────────────────────────────────── */
app.post('/api/reject/:pr_number', async (req, res) => {
  const { pr_number } = req.params;
  const { reason = '请根据功能卡片模板补充完整信息后重新提交。' } = req.body;
  try {
    // 添加驳回评论
    await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${pr_number}/comments`,
      {
        method: 'POST',
        headers: ghHeaders,
        body: JSON.stringify({
          body: `❌ **PM 驳回**\n\n**驳回原因**：${reason}\n\n请修改后重新提交。`,
        }),
      }
    );

    // 关闭 PR
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${pr_number}`,
      {
        method: 'PATCH',
        headers: ghHeaders,
        body: JSON.stringify({ state: 'closed' }),
      }
    );
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message });
    res.json({ success: true, message: '已驳回，设计师将收到通知' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`功能池管理后台运行在 http://localhost:${PORT}`);
});
