/* ── 状态 ── */
let password = '';
let currentTab = 'pending';
let lists = { pending: [], approved: [], rejected: [], archived: [] };
let selectedItem = null;   // { type, data }
let currentInfoTab = 'skill';
let rawSkillContent = '';  // 保存原始 SKILL.md，用于一键复制需求描述

const CATEGORIES = {
  navigation: '导航', hero: '首屏', content: '内容', forms: '表单',
  ecommerce: '电商', media: '媒体', interactive: '交互',
  layout: '布局', animation: '动效', industry: '行业',
};

/* ── 登录 ── */
async function doLogin() {
  const pwd = document.getElementById('pwd-input').value.trim();
  if (!pwd) return;
  const res = await apiFetch('/api/pending', pwd);
  if (res === null) {
    document.getElementById('login-err').textContent = '密码错误，请重试';
    return;
  }
  password = pwd;
  document.getElementById('login-page').style.display = 'none';
  const app = document.getElementById('main-app');
  app.style.display = 'flex';
  refreshAll();
}

document.getElementById('pwd-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});

/* ── 数据加载 ── */
async function refreshAll() {
  const [pending, approved, rejected, archived] = await Promise.all([
    apiFetch('/api/pending'),
    apiFetch('/api/approved'),
    apiFetch('/api/rejected'),
    apiFetch('/api/archived'),
  ]);

  lists.pending  = Array.isArray(pending)  ? pending  : [];
  lists.approved = Array.isArray(approved) ? approved : [];
  lists.rejected = Array.isArray(rejected) ? rejected : [];
  lists.archived = Array.isArray(archived) ? archived : [];

  document.getElementById('cnt-pending').textContent  = lists.pending.length;
  document.getElementById('cnt-approved').textContent = lists.approved.length;
  document.getElementById('cnt-rejected').textContent = lists.rejected.length;
  document.getElementById('cnt-archived').textContent = lists.archived.length;

  renderList();
}

/* ── Tab 切换 ── */
function switchTab(tab) {
  currentTab = tab;
  ['pending','approved','rejected','archived'].forEach((t) => {
    document.getElementById(`htab-${t}`).classList.toggle('active', t === tab);
  });
  document.getElementById('search-input').value = '';
  document.getElementById('category-filter').value = '';
  renderList();
  clearDetail();
}

/* ── 列表渲染 ── */
function renderList() {
  const list = lists[currentTab];
  const kw = document.getElementById('search-input').value.toLowerCase();
  const cat = document.getElementById('category-filter').value;

  const filtered = list.filter((item) => {
    const name = getName(item).toLowerCase();
    const path = (item.path || item.branch || '').toLowerCase();
    const matchKw = !kw || name.includes(kw) || path.includes(kw);
    const matchCat = !cat || path.includes(cat);
    return matchKw && matchCat;
  });

  const container = document.getElementById('feature-list');

  if (!filtered.length) {
    container.innerHTML = `<div class="list-empty">${kw || cat ? '没有匹配的功能' : emptyText()}</div>`;
    return;
  }

  container.innerHTML = filtered.map((item) => {
    const name = getName(item);
    const meta = getMeta(item);
    const isActive = selectedItem && isSameItem(selectedItem.data, item);
    const statusCls = `status-${currentTab}`;
    return `<div class="feature-item ${statusCls}${isActive ? ' active' : ''}"
      onclick='selectItem(${JSON.stringify(JSON.stringify(item))})'>
      <div class="feature-name">${name}</div>
      <div class="feature-meta">${meta}</div>
    </div>`;
  }).join('');
}

function emptyText() {
  const map = { pending: '暂无待审核功能', approved: '暂无已上线功能', rejected: '暂无已驳回功能', archived: '暂无已下架功能' };
  return map[currentTab];
}

function filterList() { renderList(); }

function getName(item) {
  return item.title || item.name || '—';
}

function getMeta(item) {
  const dotClass = `dot-${currentTab}`;
  const dotMap = { pending: '●', approved: '●', rejected: '●', archived: '●' };
  const dot = `<span class="status-dot ${dotClass}">${dotMap[currentTab]}</span>`;
  if (currentTab === 'pending')  return `${dot} 待审核 · ${relativeTime(item.createdAt)} · ${item.author}`;
  if (currentTab === 'approved') return `${dot} 已上线 · ${(item.tags || []).slice(0,2).join(', ')}`;
  if (currentTab === 'rejected') return `${dot} 已驳回 · ${relativeTime(item.closedAt)} · ${item.author}`;
  if (currentTab === 'archived') return `${dot} 已下架 · ${item.description || ''}`;
  return '';
}

function isSameItem(a, b) {
  if (a.id && b.id) return a.id === b.id;
  if (a.path && b.path) return a.path === b.path;
  return false;
}

/* ── 选中详情 ── */
async function selectItem(jsonStr) {
  const item = JSON.parse(jsonStr);
  selectedItem = { type: currentTab, data: item };
  renderList();

  document.getElementById('empty-state').style.display = 'none';
  const dc = document.getElementById('detail-content');
  dc.style.display = 'flex';

  // 控制操作按钮显示
  document.getElementById('review-actions').style.display   = currentTab === 'pending'  ? 'flex' : 'none';
  document.getElementById('approved-actions').style.display = currentTab === 'approved' ? 'flex' : 'none';
  document.getElementById('archived-actions').style.display = currentTab === 'archived' ? 'flex' : 'none';

  // 驳回原因 Tab 仅已驳回时显示
  const rejectTab = document.getElementById('itab-reject');
  rejectTab.style.display = currentTab === 'rejected' ? 'inline-block' : 'none';

  switchInfoTab('skill');

  if (currentTab === 'pending' || currentTab === 'rejected') {
    await loadPRDetail(item);
  } else {
    await loadFeatureDetail(item);
  }
}

/* ── PR 详情（待审核 / 已驳回） ── */
async function loadPRDetail(pr) {
  document.getElementById('detail-title').textContent = pr.title;
  document.getElementById('detail-meta').textContent =
    `提交人：${pr.author} · ${relativeTime(pr.createdAt)}`;

  setSkillLoading();
  setPreviewLoading();
  document.getElementById('info-history').innerHTML = '<div class="loading-spinner">加载中…</div>';
  document.getElementById('info-reject').innerHTML  = '';

  const data = await apiFetch(`/api/pr-files/${pr.id}`);
  if (!data) { setSkillError(); return; }

  renderSkill(data.skillContent || '');
  renderPreview(data.previewHtml || '');

  // 驳回原因
  if (currentTab === 'rejected' && data.rejectComment) {
    document.getElementById('info-reject').innerHTML = `
      <div class="reject-card">
        <div class="reject-label">❌ 驳回原因</div>
        <div class="reject-reason">${escHtml(data.rejectComment.body.replace(/❌ \*\*PM 驳回\*\*\n\n\*\*驳回原因\*\*：/, '').replace(/\n\n请修改后重新提交。/, ''))}</div>
        <div class="reject-date">${relativeTime(data.rejectComment.date)} · ${data.rejectComment.author}</div>
      </div>`;
  } else {
    document.getElementById('info-reject').innerHTML = '<div class="list-empty">暂无驳回记录</div>';
  }

  // 版本历史（通过功能路径加载）
  if (data.featurePath) {
    loadHistory(data.featurePath);
  }
}

/* ── 已上线 / 已下架功能详情 ── */
async function loadFeatureDetail(feature) {
  document.getElementById('detail-title').textContent = feature.name;
  document.getElementById('detail-meta').textContent  = feature.description || '';

  setSkillLoading();
  setPreviewLoading();
  document.getElementById('info-history').innerHTML = '<div class="loading-spinner">加载中…</div>';

  const [skillRes, previewRes] = await Promise.all([
    apiFetch(`/api/skill?path=${encodeURIComponent(feature.path)}`),
    apiFetch(`/api/preview?path=${encodeURIComponent(feature.path)}`),
  ]);

  renderSkill(skillRes?.content || '');
  renderPreview(previewRes?.html || '');
  loadHistory(feature.path);
}

/* ── 版本历史 ── */
async function loadHistory(featurePath) {
  const data = await apiFetch(`/api/history?path=${encodeURIComponent(featurePath)}`);
  const container = document.getElementById('info-history');

  if (!data || !data.length) {
    container.innerHTML = '<div class="list-empty">暂无版本记录</div>';
    return;
  }

  container.innerHTML = data.map((c) => `
    <div class="history-item">
      <span class="history-sha">${c.sha}</span>
      <div class="history-info">
        <div class="history-msg">${escHtml(c.message.split('\n')[0])}</div>
        <div class="history-meta">${c.author} · ${relativeTime(c.date)}</div>
      </div>
    </div>`).join('');
}

/* ── Info Tab 切换 ── */
function switchInfoTab(tab) {
  currentInfoTab = tab;
  ['skill','history','reject'].forEach((t) => {
    document.getElementById(`itab-${t}`).classList.toggle('active', t === tab);
    document.getElementById(`info-${t}`).classList.toggle('active', t === tab);
  });
}

/* ── 预览 & SKILL 渲染 ── */
function renderPreview(html) {
  const frame = document.getElementById('preview-frame');
  frame.srcdoc = html || '<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888;font-size:14px">暂无预览文件</body>';
}

/**
 * 从 SKILL.md 中提取「有效的需求描述」一节的纯文本内容
 * @param {string} md
 * @returns {string}
 */
function extractPrompt(md) {
  const match = md.match(/##\s*有效的需求描述[\s\S]*?\n([\s\S]*?)(?=\n##\s|\s*$)/);
  if (match) return match[1].trim();
  // 兜底：返回去掉 frontmatter 后的全文
  return md.replace(/^---[\s\S]*?---\n?/, '').trim();
}

/** 一键复制需求描述到剪贴板 */
async function copyPrompt() {
  const prompt = extractPrompt(rawSkillContent);
  try {
    await navigator.clipboard.writeText(prompt);
    const btn = document.getElementById('copy-prompt-btn');
    btn.textContent = '✓ 已复制';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '复制需求描述';
      btn.classList.remove('copied');
    }, 2000);
  } catch {
    showToast('复制失败，请手动选中文字复制', 'error');
  }
}

function renderSkill(md) {
  rawSkillContent = md || '';
  const panel = document.getElementById('info-skill');
  panel.innerHTML = `
    <div class="skill-toolbar">
      <span class="skill-toolbar-label">粘贴到 OpenCode 对话框，AI 直接执行</span>
      <button id="copy-prompt-btn" class="btn-copy" onclick="copyPrompt()">复制需求描述</button>
    </div>
    ${markdownToHtml(md)}
  `;
}

function setSkillLoading()   { rawSkillContent = ''; document.getElementById('info-skill').innerHTML = '<div class="loading-spinner">加载中…</div>'; }
function setPreviewLoading() { document.getElementById('preview-frame').srcdoc = '<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888;font-size:14px">加载预览中…</body>'; }
function setSkillError()     { rawSkillContent = ''; document.getElementById('info-skill').innerHTML = '<div style="padding:20px;color:var(--danger);font-size:13px">加载失败，请刷新重试</div>'; }

function clearDetail() {
  selectedItem = null;
  document.getElementById('empty-state').style.display = 'flex';
  document.getElementById('detail-content').style.display = 'none';
}

/* ── 审核：通过 ── */
async function approveCurrentPR() {
  if (!selectedItem || selectedItem.type !== 'pending') return;
  const { id, title } = selectedItem.data;

  setBtnsDisabled(true);
  const res = await apiFetch(`/api/approve/${id}`, password, 'POST');
  setBtnsDisabled(false);

  if (res?.success) {
    showToast(`「${title}」已通过并合并`, 'success');
    clearDetail();
    await refreshAll();
    switchTab('approved');
  } else {
    showToast(res?.error || '操作失败', 'error');
  }
}

/* ── 审核：驳回 ── */
function openRejectModal() {
  document.getElementById('reject-reason').value = '';
  document.getElementById('reject-modal').classList.add('open');
  setTimeout(() => document.getElementById('reject-reason').focus(), 100);
}

function closeRejectModal() {
  document.getElementById('reject-modal').classList.remove('open');
}

async function confirmReject() {
  if (!selectedItem || selectedItem.type !== 'pending') return;
  const { id, title } = selectedItem.data;
  const reason = document.getElementById('reject-reason').value.trim();
  if (!reason) { document.getElementById('reject-reason').focus(); return; }

  const btn = document.querySelector('#reject-modal .btn-danger');
  btn.disabled = true;
  btn.textContent = '处理中…';

  const res = await apiFetch(`/api/reject/${id}`, password, 'POST', { reason });

  btn.disabled = false;
  btn.textContent = '确认驳回';
  closeRejectModal();

  if (res?.success) {
    showToast(`「${title}」已驳回`, 'error');
    clearDetail();
    await refreshAll();
    switchTab('rejected');
  } else {
    showToast(res?.error || '操作失败', 'error');
  }
}

/* ── 下架 ── */
async function archiveCurrent() {
  if (!selectedItem || selectedItem.type !== 'approved') return;
  const { path, name } = selectedItem.data;

  setBtnsDisabled(true);
  const res = await apiFetch('/api/archive', password, 'POST', { path });
  setBtnsDisabled(false);

  if (res?.success) {
    showToast(`「${name}」已下架`, 'info');
    clearDetail();
    await refreshAll();
    switchTab('archived');
  } else {
    showToast(res?.error || '操作失败', 'error');
  }
}

/* ── 恢复上线 ── */
async function restoreCurrent() {
  if (!selectedItem || selectedItem.type !== 'archived') return;
  const { path, name } = selectedItem.data;

  setBtnsDisabled(true);
  const res = await apiFetch('/api/restore', password, 'POST', { path });
  setBtnsDisabled(false);

  if (res?.success) {
    showToast(`「${name}」已恢复上线`, 'success');
    clearDetail();
    await refreshAll();
    switchTab('approved');
  } else {
    showToast(res?.error || '操作失败', 'error');
  }
}

/* ── 工具函数 ── */
function setBtnsDisabled(v) {
  document.querySelectorAll('.header-actions .btn').forEach((b) => (b.disabled = v));
}

async function apiFetch(url, pwd, method = 'GET', body = null) {
  try {
    const opts = {
      method,
      headers: { 'x-admin-password': pwd || password, 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (res.status === 401) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function markdownToHtml(md) {
  if (!md) return '<p style="color:var(--text-muted);font-size:13px">暂无内容</p>';
  return md
    .replace(/^---[\s\S]*?---\n?/, '')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/```[\s\S]*?```/g, (block) => {
      const code = block.replace(/```\w*\n?/, '').replace(/```$/, '');
      return `<pre><code>${escHtml(code.trim())}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hup\/])(.+)$/gm, (line) => line.trim() ? `<p>${line}</p>` : '');
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)    return '刚刚';
  if (diff < 3600)  return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

let toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

document.getElementById('reject-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeRejectModal();
});
