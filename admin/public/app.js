/* ─────────────────────────────────────────────
   状态
───────────────────────────────────────────── */
let password = '';
let currentTab = 'pending';
let pendingList = [];
let approvedList = [];
let selectedItem = null;   // { type: 'pending'|'approved', data }

/* ─────────────────────────────────────────────
   登录
───────────────────────────────────────────── */
async function doLogin() {
  const pwd = document.getElementById('pwd-input').value.trim();
  if (!pwd) return;

  /** 用一个轻量请求验证密码 */
  const res = await apiFetch('/api/pending', pwd);
  if (res === null) {
    document.getElementById('login-err').textContent = '密码错误，请重试';
    return;
  }
  password = pwd;
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('main-app').style.display = 'flex';
  refreshAll();
}

document.getElementById('pwd-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});

/* ─────────────────────────────────────────────
   数据加载
───────────────────────────────────────────── */
async function refreshAll() {
  await Promise.all([loadPending(), loadApproved()]);
  renderList();
}

async function loadPending() {
  const data = await apiFetch('/api/pending');
  pendingList = Array.isArray(data) ? data : [];
  document.getElementById('badge-pending').textContent = `待审核 ${pendingList.length}`;
}

async function loadApproved() {
  const data = await apiFetch('/api/approved');
  approvedList = Array.isArray(data) ? data : [];
  document.getElementById('badge-approved').textContent = `已上线 ${approvedList.length}`;
}

/* ─────────────────────────────────────────────
   Tab 切换
───────────────────────────────────────────── */
function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-pending').classList.toggle('active', tab === 'pending');
  document.getElementById('tab-approved').classList.toggle('active', tab === 'approved');
  document.getElementById('search-input').value = '';
  renderList();
  clearDetail();
}

/* ─────────────────────────────────────────────
   列表渲染
───────────────────────────────────────────── */
function renderList(keyword = '') {
  const list = currentTab === 'pending' ? pendingList : approvedList;
  const kw = keyword.toLowerCase();
  const filtered = kw
    ? list.filter((item) => (item.title || item.name || '').toLowerCase().includes(kw))
    : list;

  const container = document.getElementById('feature-list');

  if (!filtered.length) {
    container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">${
      kw ? '没有匹配的功能' : currentTab === 'pending' ? '暂无待审核功能' : '暂无已上线功能'
    }</div>`;
    return;
  }

  container.innerHTML = filtered
    .map((item) => {
      const name = currentTab === 'pending' ? item.title : item.name;
      const meta = currentTab === 'pending'
        ? `<span class="dot-pending">●</span> 待审核 · ${relativeTime(item.createdAt)}`
        : `<span class="dot-approved">●</span> 已上线 · ${(item.tags || []).slice(0, 2).join(', ')}`;
      const id = currentTab === 'pending' ? item.id : item.path;
      const isActive = selectedItem && (
        currentTab === 'pending' ? selectedItem.data.id === item.id : selectedItem.data.path === item.path
      );
      return `<div class="feature-item${isActive ? ' active' : ''}" onclick="selectItem(${JSON.stringify(JSON.stringify(item))})">
        <div class="feature-item-name">${name}</div>
        <div class="feature-item-meta">${meta}</div>
      </div>`;
    })
    .join('');
}

function filterList() {
  renderList(document.getElementById('search-input').value);
}

/* ─────────────────────────────────────────────
   选中功能卡片
───────────────────────────────────────────── */
async function selectItem(jsonStr) {
  const item = JSON.parse(jsonStr);
  selectedItem = { type: currentTab, data: item };
  renderList(document.getElementById('search-input').value);

  document.getElementById('empty-state').style.display = 'none';
  const dc = document.getElementById('detail-content');
  dc.style.display = 'flex';

  /* 审核按钮仅待审核状态显示 */
  document.getElementById('review-actions').style.display =
    currentTab === 'pending' ? 'flex' : 'none';

  if (currentTab === 'pending') {
    await loadPendingDetail(item);
  } else {
    await loadApprovedDetail(item);
  }
}

async function loadPendingDetail(pr) {
  document.getElementById('detail-title').textContent = pr.title;
  document.getElementById('detail-meta').textContent =
    `提交人：${pr.author} · ${relativeTime(pr.createdAt)}`;

  setSkillLoading();
  setPreviewLoading();

  const data = await apiFetch(`/api/pr-files/${pr.id}`);
  if (!data) { setSkillError(); return; }

  renderSkill(data.skillContent || '');
  renderPreview(data.previewHtml || '');
}

async function loadApprovedDetail(feature) {
  document.getElementById('detail-title').textContent = feature.name;
  document.getElementById('detail-meta').textContent =
    `已上线 · ${feature.description}`;

  setSkillLoading();
  setPreviewLoading();

  const [skillRes, previewRes] = await Promise.all([
    apiFetch(`/api/skill?path=${encodeURIComponent(feature.path)}`),
    apiFetch(`/api/preview?path=${encodeURIComponent(feature.path)}`),
  ]);

  renderSkill(skillRes?.content || '');
  renderPreview(previewRes?.html || '');
}

/* ─────────────────────────────────────────────
   预览 & SKILL.md 渲染
───────────────────────────────────────────── */
function renderPreview(html) {
  const frame = document.getElementById('preview-frame');
  if (!html) {
    frame.srcdoc = '<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888">暂无预览文件</body>';
    return;
  }
  frame.srcdoc = html;
}

function renderSkill(md) {
  document.getElementById('skill-content').innerHTML = markdownToHtml(md);
}

function setSkillLoading() {
  document.getElementById('skill-content').innerHTML =
    '<div class="loading-spinner">加载中…</div>';
}

function setPreviewLoading() {
  document.getElementById('preview-frame').srcdoc =
    '<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888">加载预览中…</body>';
}

function setSkillError() {
  document.getElementById('skill-content').innerHTML =
    '<div style="padding:20px;color:var(--danger)">加载失败，请刷新重试</div>';
}

function clearDetail() {
  selectedItem = null;
  document.getElementById('empty-state').style.display = 'flex';
  document.getElementById('detail-content').style.display = 'none';
}

/* ─────────────────────────────────────────────
   审核操作
───────────────────────────────────────────── */
async function approveCurrentPR() {
  if (!selectedItem || selectedItem.type !== 'pending') return;
  const { id, title } = selectedItem.data;

  const btns = document.querySelectorAll('#review-actions .btn');
  btns.forEach((b) => (b.disabled = true));

  const res = await apiFetch(`/api/approve/${id}`, password, 'POST');
  btns.forEach((b) => (b.disabled = false));

  if (res?.success) {
    showToast(`✅ 「${title}」已通过并合并`, 'success');
    clearDetail();
    await refreshAll();
    switchTab('approved');
  } else {
    showToast(res?.error || '操作失败，请重试', 'error');
  }
}

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
  if (!reason) {
    document.getElementById('reject-reason').focus();
    return;
  }

  const confirmBtn = document.querySelector('#reject-modal .btn-danger');
  confirmBtn.disabled = true;
  confirmBtn.textContent = '处理中…';

  const res = await apiFetch(`/api/reject/${id}`, password, 'POST', { reason });

  confirmBtn.disabled = false;
  confirmBtn.textContent = '确认驳回';
  closeRejectModal();

  if (res?.success) {
    showToast(`「${title}」已驳回`, 'error');
    clearDetail();
    await loadPending();
    renderList();
  } else {
    showToast(res?.error || '操作失败，请重试', 'error');
  }
}

/* ─────────────────────────────────────────────
   工具函数
───────────────────────────────────────────── */

/**
 * 统一 API 请求，自动带密码头
 * @param {string} url
 * @param {string} [pwd]
 * @param {'GET'|'POST'} [method]
 * @param {object} [body]
 */
async function apiFetch(url, pwd, method = 'GET', body = null) {
  try {
    const opts = {
      method,
      headers: {
        'x-admin-password': pwd || password,
        'Content-Type': 'application/json',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (res.status === 401) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** 简单 Markdown → HTML 转换（只处理常见语法） */
function markdownToHtml(md) {
  if (!md) return '<p style="color:var(--text-muted)">暂无内容</p>';

  return md
    .replace(/^---[\s\S]*?---\n?/, '')            // 去掉 frontmatter
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```[\s\S]*?```/g, (block) => {
      const code = block.replace(/```\w*\n?/, '').replace(/```$/, '');
      return `<pre><code>${escHtml(code.trim())}</code></pre>`;
    })
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hup])(.+)$/gm, (line) =>
      line.trim() ? `<p>${line}</p>` : ''
    );
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
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

/* 点击遮罩关闭驳回弹窗 */
document.getElementById('reject-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeRejectModal();
});
