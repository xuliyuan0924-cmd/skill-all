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

/* ─────────────────────────────────────────
   工具：读取仓库文件内容（base64 解码）
───────────────────────────────────────── */
async function getFileContent(filePath) {
  const r = await fetch(
    `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
    { headers: ghHeaders }
  );
  if (!r.ok) return null;
  const data = await r.json();
  return {
    content: Buffer.from(data.content, 'base64').toString('utf-8'),
    sha: data.sha,
  };
}

/* ─────────────────────────────────────────
   工具：更新/创建仓库文件（commit）
───────────────────────────────────────── */
async function updateFileContent(filePath, content, message, sha) {
  const body = {
    message,
    content: Buffer.from(content).toString('base64'),
  };
  if (sha) body.sha = sha;

  const r = await fetch(
    `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
    { method: 'PUT', headers: ghHeaders, body: JSON.stringify(body) }
  );
  return r.ok;
}

/* ─────────────────────────────────────────
   GET /api/pending  待审核（open PRs）
───────────────────────────────────────── */
app.get('/api/pending', async (_req, res) => {
  try {
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls?state=open&per_page=50`,
      { headers: ghHeaders }
    );
    const prs = await r.json();
    res.json(prs.map((pr) => ({
      id: pr.number,
      title: pr.title,
      author: pr.user.login,
      createdAt: pr.created_at,
      body: pr.body || '',
      url: pr.html_url,
      branch: pr.head.ref,
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/rejected  已驳回（closed + not merged PRs）
───────────────────────────────────────── */
app.get('/api/rejected', async (_req, res) => {
  try {
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls?state=closed&per_page=50`,
      { headers: ghHeaders }
    );
    const prs = await r.json();

    // 过滤：已关闭但未合并的才是驳回
    const rejected = prs
      .filter((pr) => !pr.merged_at)
      .map((pr) => ({
        id: pr.number,
        title: pr.title,
        author: pr.user.login,
        createdAt: pr.created_at,
        closedAt: pr.closed_at,
        body: pr.body || '',
        url: pr.html_url,
      }));

    res.json(rejected);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/approved  已上线（排除已下架）
───────────────────────────────────────── */
app.get('/api/approved', async (_req, res) => {
  try {
    const [indexFile, archivedFile] = await Promise.all([
      getFileContent('INDEX.md'),
      getFileContent('ARCHIVED.md'),
    ]);

    if (!indexFile) return res.json([]);

    // 解析已下架路径集合
    const archivedPaths = new Set(
      (archivedFile?.content || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('features/'))
    );

    // 解析 INDEX.md 功能列表
    const regex = /^- \[(.+?)\]\((.+?)\)\s*[—–-]\s*(.+?)(?:\s*·\s*(.+))?$/gm;
    const features = [];
    let match;
    while ((match = regex.exec(indexFile.content)) !== null) {
      const featurePath = match[2].replace('/SKILL.md', '').replace(/\/$/, '');
      if (!archivedPaths.has(featurePath)) {
        features.push({
          name: match[1],
          path: featurePath,
          description: match[3].trim(),
          tags: match[4] ? match[4].split(',').map((t) => t.trim()) : [],
        });
      }
    }
    res.json(features);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/archived  已下架列表
───────────────────────────────────────── */
app.get('/api/archived', async (_req, res) => {
  try {
    const [indexFile, archivedFile] = await Promise.all([
      getFileContent('INDEX.md'),
      getFileContent('ARCHIVED.md'),
    ]);

    if (!archivedFile) return res.json([]);

    const archivedPaths = new Set(
      archivedFile.content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('features/'))
    );

    if (archivedPaths.size === 0) return res.json([]);

    // 从 INDEX.md 取已下架功能的元信息
    const regex = /^- \[(.+?)\]\((.+?)\)\s*[—–-]\s*(.+?)(?:\s*·\s*(.+))?$/gm;
    const features = [];
    let match;
    while ((match = regex.exec(indexFile?.content || '')) !== null) {
      const featurePath = match[2].replace('/SKILL.md', '').replace(/\/$/, '');
      if (archivedPaths.has(featurePath)) {
        features.push({
          name: match[1],
          path: featurePath,
          description: match[3].trim(),
          tags: match[4] ? match[4].split(',').map((t) => t.trim()) : [],
        });
      }
    }
    res.json(features);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/skill?path=  SKILL.md 内容
───────────────────────────────────────── */
app.get('/api/skill', async (req, res) => {
  const { path: p } = req.query;
  if (!p) return res.status(400).json({ error: '缺少 path 参数' });
  try {
    const file = await getFileContent(`${p}/SKILL.md`);
    if (!file) return res.status(404).json({ error: '文件不存在' });
    res.json({ content: file.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/preview?path=  preview.html 内容
───────────────────────────────────────── */
app.get('/api/preview', async (req, res) => {
  const { path: p } = req.query;
  if (!p) return res.status(400).json({ error: '缺少 path 参数' });
  try {
    const file = await getFileContent(`${p}/preview.html`);
    if (!file) return res.status(404).json({ error: '文件不存在' });
    res.json({ html: file.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/pr-files/:pr_number  PR 文件 + 驳回评论
───────────────────────────────────────── */
app.get('/api/pr-files/:pr_number', async (req, res) => {
  try {
    const [filesRes, commentsRes] = await Promise.all([
      fetch(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${req.params.pr_number}/files`, { headers: ghHeaders }),
      fetch(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${req.params.pr_number}/comments`, { headers: ghHeaders }),
    ]);

    const files = await filesRes.json();
    const comments = await commentsRes.json();

    const skillFile = files.find((f) => f.filename.endsWith('SKILL.md'));
    const previewFile = files.find((f) => f.filename.endsWith('preview.html'));
    const featurePath = skillFile ? skillFile.filename.replace('/SKILL.md', '') : null;

    // 获取文件原始内容
    const [previewHtml, skillContent] = await Promise.all([
      previewFile ? fetch(previewFile.raw_url, { headers: ghHeaders }).then((r) => r.text()) : Promise.resolve(null),
      skillFile   ? fetch(skillFile.raw_url,   { headers: ghHeaders }).then((r) => r.text()) : Promise.resolve(null),
    ]);

    // 找驳回评论（PM 评论包含 ❌ 关键词）
    const rejectComment = comments
      .filter((c) => c.body.includes('❌'))
      .map((c) => ({ body: c.body, date: c.created_at, author: c.user.login }))
      .pop() || null;

    res.json({ featurePath, previewHtml, skillContent, rejectComment });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/history?path=  功能版本历史
───────────────────────────────────────── */
app.get('/api/history', async (req, res) => {
  const { path: p } = req.query;
  if (!p) return res.status(400).json({ error: '缺少 path 参数' });
  try {
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?path=${encodeURIComponent(p)}&per_page=20`,
      { headers: ghHeaders }
    );
    const commits = await r.json();
    res.json(
      commits.map((c) => ({
        sha: c.sha.slice(0, 7),
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────
   POST /api/approve/:pr_number  通过并合并
───────────────────────────────────────── */
app.post('/api/approve/:pr_number', async (req, res) => {
  const { pr_number } = req.params;
  try {
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
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────
   POST /api/reject/:pr_number  驳回
   body: { reason }
───────────────────────────────────────── */
app.post('/api/reject/:pr_number', async (req, res) => {
  const { pr_number } = req.params;
  const { reason = '请根据功能卡片模板完善内容后重新提交。' } = req.body;
  try {
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
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${pr_number}`,
      { method: 'PATCH', headers: ghHeaders, body: JSON.stringify({ state: 'closed' }) }
    );
    if (!r.ok) {
      const data = await r.json();
      return res.status(r.status).json({ error: data.message });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────
   POST /api/archive  下架功能
   body: { path }
───────────────────────────────────────── */
app.post('/api/archive', async (req, res) => {
  const { path: featurePath } = req.body;
  if (!featurePath) return res.status(400).json({ error: '缺少 path 参数' });
  try {
    const file = await getFileContent('ARCHIVED.md');
    const lines = (file?.content || '').split('\n').map((l) => l.trim());

    if (lines.includes(featurePath)) {
      return res.json({ success: true, message: '已在下架列表中' });
    }

    lines.push(featurePath);
    const newContent = lines.filter((l) => l).join('\n') + '\n';
    const ok = await updateFileContent('ARCHIVED.md', newContent, `⬇️ 下架功能：${featurePath}`, file?.sha);
    ok ? res.json({ success: true }) : res.status(500).json({ error: '更新失败' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────
   POST /api/restore  恢复已下架功能
   body: { path }
───────────────────────────────────────── */
app.post('/api/restore', async (req, res) => {
  const { path: featurePath } = req.body;
  if (!featurePath) return res.status(400).json({ error: '缺少 path 参数' });
  try {
    const file = await getFileContent('ARCHIVED.md');
    if (!file) return res.json({ success: true });

    const lines = file.content.split('\n').map((l) => l.trim()).filter((l) => l && l !== featurePath);
    const newContent = lines.join('\n') + '\n';
    const ok = await updateFileContent('ARCHIVED.md', newContent, `⬆️ 恢复功能：${featurePath}`, file.sha);
    ok ? res.json({ success: true }) : res.status(500).json({ error: '更新失败' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`功能池管理后台运行在 http://localhost:${PORT}`);
});
