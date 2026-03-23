const ADMIN_PASSWORD = ['dsxx', '705', 'xzh'].join('');

let articles = [];

function uid() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function resetForm() {
  document.querySelector('#articleForm').reset();
  document.querySelector('#articleId').value = '';
  document.querySelector('#date').value = getToday();
  document.querySelector('#formTitle').textContent = '新建文章';
}

function fillForm(article) {
  document.querySelector('#articleId').value = article.id;
  document.querySelector('#title').value = article.title || '';
  document.querySelector('#summary').value = article.summary || '';
  document.querySelector('#content').value = article.content || '';
  document.querySelector('#cover').value = article.cover || '';
  document.querySelector('#tags').value = Array.isArray(article.tags) ? article.tags.join(', ') : '';
  document.querySelector('#date').value = article.updatedAt || getToday();
  document.querySelector('#status').value = article.status || 'draft';
  document.querySelector('#formTitle').textContent = '编辑文章';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadArticles() {
  try {
    const response = await fetch('./articles.json', { cache: 'no-store' });
    if (!response.ok) return [];
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderList() {
  const list = document.querySelector('#manageList');
  const sorted = [...articles].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  if (!sorted.length) {
    list.innerHTML = '<p class="tip">暂无文章。</p>';
    return;
  }

  list.innerHTML = sorted.map((article) => {
    const statusText = article.status === 'published' ? '已发布' : '草稿';
    const previewSource = article.summary || article.content || '';
    const preview = previewSource.length > 100 ? `${previewSource.slice(0, 100)}...` : previewSource;
    return `
      <article class="item" data-id="${escapeHtml(article.id || '')}">
        <div class="item-head">
          <h3>${escapeHtml(article.title || '未命名文章')}</h3>
          <span class="status">${statusText}</span>
        </div>
        <p>${escapeHtml(article.updatedAt || '未设置日期')} · ${escapeHtml((article.tags || []).join(', ') || '未分类')}</p>
        <p>${escapeHtml(preview)}</p>
        <div class="item-actions">
          <button class="small" data-action="edit">编辑</button>
          <button class="small" data-action="toggle">${article.status === 'published' ? '设为草稿' : '发布'}</button>
          <button class="small" data-action="delete">删除</button>
        </div>
      </article>`;
  }).join('');
}

function upsertArticle(payload) {
  const idx = articles.findIndex((item) => item.id === payload.id);
  if (idx >= 0) articles[idx] = payload;
  else articles.unshift(payload);
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function getContentSha(owner, repo, path, branch, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });

  if (response.status === 404) return '';
  if (!response.ok) throw new Error(`读取远程文件失败: ${response.status}`);

  const data = await response.json();
  return data.sha || '';
}

async function publishToGitHub() {
  const owner = document.querySelector('#owner').value.trim();
  const repo = document.querySelector('#repo').value.trim();
  const branch = document.querySelector('#branch').value.trim();
  const path = document.querySelector('#path').value.trim();
  const token = document.querySelector('#token').value.trim();
  const statusEl = document.querySelector('#publishStatus');

  if (!token) {
    statusEl.textContent = '请先输入 GitHub Token。';
    return;
  }

  statusEl.textContent = '正在发布...';

  try {
    const sha = await getContentSha(owner, repo, path, branch, token);
    const content = JSON.stringify(articles, null, 2);
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const body = {
      message: `update articles ${new Date().toISOString()}`,
      content: utf8ToBase64(content),
      branch
    };
    if (sha) body.sha = sha;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`发布失败: ${response.status} ${text}`);
    }

    statusEl.textContent = '发布成功。约 1-2 分钟后生效。';
  } catch (err) {
    statusEl.textContent = String(err.message || err);
  }
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(articles, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'articles.json';
  a.click();
  URL.revokeObjectURL(url);
}

function bindAppEvents() {
  document.querySelector('#articleForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const id = document.querySelector('#articleId').value || uid();
    const title = document.querySelector('#title').value.trim();
    const summary = document.querySelector('#summary').value.trim();
    const content = document.querySelector('#content').value.trim();
    const cover = document.querySelector('#cover').value.trim();
    const updatedAt = document.querySelector('#date').value;
    const status = document.querySelector('#status').value;
    const tags = document.querySelector('#tags').value.split(',').map((s) => s.trim()).filter(Boolean);

    if (!title || !content || !updatedAt) return;

    upsertArticle({ id, title, summary, content, cover, tags, status, updatedAt });
    resetForm();
    renderList();
  });

  document.querySelector('#resetBtn').addEventListener('click', () => resetForm());
  document.querySelector('#publishBtn').addEventListener('click', () => publishToGitHub());
  document.querySelector('#downloadBtn').addEventListener('click', () => downloadJson());

  document.querySelector('#manageList').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    const item = event.target.closest('.item[data-id]');
    if (!item) return;

    const id = item.getAttribute('data-id');
    const article = articles.find((a) => a.id === id);
    if (!article) return;

    const action = btn.getAttribute('data-action');
    if (action === 'edit') {
      fillForm(article);
      return;
    }

    if (action === 'toggle') {
      article.status = article.status === 'published' ? 'draft' : 'published';
      renderList();
      return;
    }

    if (action === 'delete') {
      articles = articles.filter((a) => a.id !== id);
      renderList();
    }
  });
}

async function unlock() {
  articles = await loadArticles();
  document.querySelector('#gate').classList.add('hidden');
  document.querySelector('#app').classList.remove('hidden');
  bindAppEvents();
  resetForm();
  renderList();
}

document.querySelector('#gateEnter').addEventListener('click', () => {
  const input = document.querySelector('#gatePassword').value;
  const msg = document.querySelector('#gateMsg');

  if (input === ADMIN_PASSWORD) {
    msg.textContent = '';
    unlock();
    return;
  }

  msg.textContent = '密码错误。';
});

document.querySelector('#gatePassword').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    document.querySelector('#gateEnter').click();
  }
});
