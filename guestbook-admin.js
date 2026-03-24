const Common = window.AdminCommon || {};
const setTip = Common.setTip || ((id, message) => {
  const el = document.querySelector(`#${id}`);
  if (el) el.textContent = String(message || '');
});
const putFile = Common.putFile || (async () => {
  throw new Error('admin-common.js 加载失败，请 Ctrl+F5 强制刷新后重试。');
});
const loadSavedToken = Common.loadSavedToken || (() => localStorage.getItem('lab_705_token') || '');
const saveToken = Common.saveToken || ((token) => localStorage.setItem('lab_705_token', token));
const clearSavedToken = Common.clearSavedToken || (() => localStorage.removeItem('lab_705_token'));
let messages = [];
let isPublishing = false;

function uid() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function nowText() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeMessage(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const mode = raw.mode === 'real' ? 'real' : 'anonymous';
  const name = String(raw.name || '').trim() || (mode === 'real' ? '未命名访客' : '匿名访客');
  const status = raw.status === 'hidden' ? 'hidden' : 'approved';
  return {
    id: String(raw.id || '').trim() || uid(),
    mode,
    name,
    content: String(raw.content || '').trim(),
    createdAt: String(raw.createdAt || '').trim() || nowText(),
    status
  };
}

function validateMessages(next) {
  const errors = [];
  const ids = new Set();
  next.forEach((item, index) => {
    const row = index + 1;
    if (!item.id) errors.push(`第 ${row} 条留言缺少 id。`);
    if (item.id && ids.has(item.id)) errors.push(`留言 id 重复: ${item.id}`);
    ids.add(item.id);
    if (!item.content) errors.push(`第 ${row} 条留言内容为空。`);
    if (item.mode !== 'real' && item.mode !== 'anonymous') errors.push(`第 ${row} 条留言身份类型非法。`);
    if (item.status !== 'approved' && item.status !== 'hidden') errors.push(`第 ${row} 条留言状态非法。`);
  });
  return errors;
}

async function loadMessages() {
  try {
    const response = await fetch(`./guestbook.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return [];
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed.map(normalizeMessage) : [];
  } catch {
    return [];
  }
}

function resetForm() {
  document.querySelector('#guestForm').reset();
  document.querySelector('#guestId').value = '';
  document.querySelector('#guestMode').value = 'anonymous';
  document.querySelector('#guestName').value = '匿名访客';
  document.querySelector('#guestCreatedAt').value = nowText();
  document.querySelector('#guestStatus').value = 'approved';
  document.querySelector('#formTitle').textContent = '新建留言';
  document.querySelector('#saveGuestBtn').textContent = '保存到当前会话';
}

function fillForm(item) {
  document.querySelector('#guestId').value = item.id;
  document.querySelector('#guestMode').value = item.mode;
  document.querySelector('#guestName').value = item.name || '';
  document.querySelector('#guestContent').value = item.content || '';
  document.querySelector('#guestCreatedAt').value = item.createdAt || nowText();
  document.querySelector('#guestStatus').value = item.status || 'approved';
  document.querySelector('#formTitle').textContent = '编辑留言';
  document.querySelector('#saveGuestBtn').textContent = '保存修改';
  setTip('formStatus', `正在编辑：${item.name}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function upsertMessage(payload) {
  const normalized = normalizeMessage(payload);
  const idx = messages.findIndex((item) => item.id === normalized.id);
  if (idx >= 0) messages[idx] = normalized;
  else messages.unshift(normalized);
}

function renderList() {
  const list = document.querySelector('#manageList');
  const sorted = [...messages].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  if (!sorted.length) {
    list.innerHTML = '<p class="tip">暂无留言。</p>';
    return;
  }

  list.innerHTML = sorted.map((item) => {
    const statusText = item.status === 'approved' ? '公开' : '隐藏';
    return `
      <article class="item" data-id="${escapeHtml(item.id)}">
        <div class="item-head">
          <h3>${escapeHtml(item.name || '匿名访客')}</h3>
          <span class="status">${escapeHtml(statusText)}</span>
        </div>
        <p>${escapeHtml(item.createdAt || '')} · ${item.mode === 'real' ? '实名' : '匿名'}</p>
        <p>${escapeHtml(item.content || '')}</p>
        <div class="item-actions">
          <button class="small" data-action="edit">编辑</button>
          <button class="small" data-action="toggle">${item.status === 'approved' ? '设为隐藏' : '设为公开'}</button>
          <button class="small" data-action="delete">删除</button>
        </div>
      </article>
    `;
  }).join('');
}

async function publishMessages() {
  if (isPublishing) return;

  const owner = document.querySelector('#owner').value.trim();
  const repo = document.querySelector('#repo').value.trim();
  const branch = document.querySelector('#branch').value.trim();
  const tokenInput = document.querySelector('#token');
  const rememberToken = document.querySelector('#rememberToken');
  const token = tokenInput.value.trim() || loadSavedToken() || '';
  const publishBtn = document.querySelector('#publishBtn');

  if (!owner || !repo || !branch) {
    setTip('publishStatus', '请先填写 GitHub 用户名、仓库名和分支。', 'error');
    return;
  }
  if (!token) {
    setTip('publishStatus', '请先输入 GitHub Token。', 'error');
    return;
  }

  const normalized = messages.map(normalizeMessage);
  const errors = validateMessages(normalized);
  if (errors.length) {
    setTip('publishStatus', `发布前校验失败：${errors[0]}`, 'error');
    return;
  }

  isPublishing = true;
  if (publishBtn) publishBtn.disabled = true;
  setTip('publishStatus', '正在发布 guestbook.json ...');

  try {
    messages = normalized;
    const result = await putFile(owner, repo, branch, 'guestbook.json', JSON.stringify(messages, null, 2), token, 'update guestbook');
    if (rememberToken && rememberToken.checked) saveToken(token);
    const sha = result.commitSha ? result.commitSha.slice(0, 7) : '-';
    setTip('publishStatus', `发布成功。guestbook: ${sha}。约 1-2 分钟后生效。`, 'success');
  } catch (err) {
    setTip('publishStatus', String(err.message || err), 'error');
  } finally {
    isPublishing = false;
    if (publishBtn) publishBtn.disabled = false;
  }
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'guestbook.json';
  a.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.querySelector('#guestMode').addEventListener('change', (event) => {
    const mode = event.target.value;
    const nameInput = document.querySelector('#guestName');
    if (mode === 'anonymous' && !nameInput.value.trim()) {
      nameInput.value = '匿名访客';
    }
  });

  document.querySelector('#guestForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const currentId = document.querySelector('#guestId').value;
    const id = currentId || uid();
    const mode = document.querySelector('#guestMode').value;
    const inputName = document.querySelector('#guestName').value.trim();
    const name = inputName || (mode === 'real' ? '未命名访客' : '匿名访客');
    const content = document.querySelector('#guestContent').value.trim();
    const createdAt = document.querySelector('#guestCreatedAt').value.trim() || nowText();
    const status = document.querySelector('#guestStatus').value;

    if (!content) {
      setTip('formStatus', '留言内容不能为空。', 'error');
      return;
    }

    upsertMessage({ id, mode, name, content, createdAt, status });
    const action = currentId ? '已保存修改' : '已创建留言';
    resetForm();
    renderList();
    setTip('formStatus', `${action}：${name}`, 'success');
  });

  document.querySelector('#resetGuestBtn').addEventListener('click', () => {
    resetForm();
    setTip('formStatus', '表单已清空。');
  });

  document.querySelector('#publishBtn').addEventListener('click', () => {
    void publishMessages();
  });

  document.querySelector('#downloadBtn').addEventListener('click', () => downloadJson());

  document.querySelector('#reloadBtn').addEventListener('click', async () => {
    messages = await loadMessages();
    resetForm();
    renderList();
    setTip('publishStatus', '已重新载入线上留言。');
  });

  document.querySelector('#clearTokenBtn').addEventListener('click', () => {
    clearSavedToken();
    document.querySelector('#token').value = '';
    setTip('publishStatus', '已清除本机已记住 Token。');
  });

  document.querySelector('#manageList').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    const itemEl = event.target.closest('.item[data-id]');
    if (!itemEl) return;

    const id = itemEl.getAttribute('data-id');
    const item = messages.find((m) => m.id === id);
    if (!item) return;

    const action = btn.getAttribute('data-action');
    if (action === 'edit') {
      fillForm(item);
      return;
    }

    if (action === 'toggle') {
      item.status = item.status === 'approved' ? 'hidden' : 'approved';
      renderList();
      setTip('formStatus', `已切换状态：${item.name} -> ${item.status === 'approved' ? '公开' : '隐藏'}`, 'success');
      return;
    }

    if (action === 'delete') {
      const ok = window.confirm(`确认删除留言「${item.name}」吗？`);
      if (!ok) return;
      messages = messages.filter((m) => m.id !== id);
      if (document.querySelector('#guestId').value === id) resetForm();
      renderList();
      setTip('formStatus', `已删除：${item.name}`, 'success');
    }
  });
}

async function unlock() {
  messages = await loadMessages();

  bindEvents();
  resetForm();
  renderList();

  const savedToken = loadSavedToken();
  if (savedToken) document.querySelector('#token').value = savedToken;
}

window.addEventListener('error', (event) => {
  setTip('publishStatus', `页面脚本异常：${event.message || 'unknown error'}`, 'error');
});

void unlock().catch((err) => {
  setTip('publishStatus', String(err.message || err), 'error');
});



