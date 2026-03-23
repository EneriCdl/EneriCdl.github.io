const DEFAULT_OWNER = 'EneriCdl';
const DEFAULT_REPO = 'EneriCdl.github.io';
const DEFAULT_BRANCH = 'main';
const DEFAULT_PATH = 'articles.json';

let articles = [];

function uid() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchArticlesFromRepo() {
  try {
    const response = await fetch(`./${DEFAULT_PATH}`, { cache: 'no-store' });
    if (!response.ok) return [];
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function resetForm() {
  const form = document.querySelector('#articleForm');
  form.reset();
  document.querySelector('#articleId').value = '';
  document.querySelector('#date').value = getToday();
  document.querySelector('#formTitle').textContent = '新建文章';
}

function fillForm(article) {
  document.querySelector('#articleId').value = article.id;
  document.querySelector('#title').value = article.title || '';
  document.querySelector('#summary').value = article.summary || '';
  document.querySelector('#content').value = article.content || '';
  document.querySelector('#tags').value = Array.isArray(article.tags) ? article.tags.join(', ') : '';
  document.querySelector('#date').value = article.updatedAt || getToday();
  document.querySelector('#status').value = article.status || 'draft';
  document.querySelector('#formTitle').textContent = '编辑文章';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderList() {
  const list = document.querySelector('#manageList');
  const sorted = [...articles].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  if (!sorted.length) {
    list.innerHTML = '<p class="empty">暂无文章，先创建第一篇。</p>';
    return;
  }

  list.innerHTML = sorted
    .map((article) => {
      const statusText = article.status === 'published' ? '已发布' : '草稿';
      const summary = article.summary || article.content || '';
      const preview = summary.length > 120 ? `${summary.slice(0, 120)}...` : summary;

      return `
      <article class="item" data-id="${article.id}">
        <div class="item-head">
          <h3>${article.title}</h3>
          <span class="status">${statusText}</span>
        </div>
        <p>${article.updatedAt || '未设置日期'} · ${Array.isArray(article.tags) && article.tags.length ? article.tags.join(', ') : '未分类'}</p>
        <p>${preview}</p>
        <div class="item-actions">
          <button class="btn ghost small" data-action="edit">编辑</button>
          <button class="btn ghost small" data-action="toggle">${article.status === 'published' ? '设为草稿' : '发布'}</button>
          <button class="btn ghost small" data-action="delete">删除</button>
        </div>
      </article>`;
    })
    .join('');
}

function upsertArticle(payload) {
  const index = articles.findIndex((item) => item.id === payload.id);
  if (index >= 0) {
    articles[index] = payload;
  } else {
    articles.push(payload);
  }
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
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    }
  });

  if (response.status === 404) return '';
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`读取远程文件失败: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.sha || '';
}

async function publishToGitHub() {
  const statusEl = document.querySelector('#publishStatus');
  const owner = document.querySelector('#owner').value.trim() || DEFAULT_OWNER;
  const repo = document.querySelector('#repo').value.trim() || DEFAULT_REPO;
  const branch = document.querySelector('#branch').value.trim() || DEFAULT_BRANCH;
  const path = document.querySelector('#path').value.trim() || DEFAULT_PATH;
  const token = document.querySelector('#token').value.trim();

  if (!token) {
    statusEl.textContent = '请先填入 GitHub Token。';
    return;
  }

  statusEl.textContent = '正在发布到 GitHub...';

  try {
    const sha = await getContentSha(owner, repo, path, branch, token);
    const content = JSON.stringify(articles, null, 2);
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const body = {
      message: `update articles: ${new Date().toISOString()}`,
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
      const errText = await response.text();
      throw new Error(`发布失败: ${response.status} ${errText}`);
    }

    statusEl.textContent = '发布成功。约 1-2 分钟后首页会更新。';
  } catch (error) {
    statusEl.textContent = String(error.message || error);
  }
}

function downloadBackup() {
  const blob = new Blob([JSON.stringify(articles, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'articles.json';
  a.click();
  URL.revokeObjectURL(url);
}

document.querySelector('#articleForm').addEventListener('submit', (event) => {
  event.preventDefault();

  const id = document.querySelector('#articleId').value || uid();
  const title = document.querySelector('#title').value.trim();
  const summary = document.querySelector('#summary').value.trim();
  const content = document.querySelector('#content').value.trim();
  const updatedAt = document.querySelector('#date').value;
  const status = document.querySelector('#status').value;
  const tags = document
    .querySelector('#tags')
    .value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!title || !content || !updatedAt) return;

  upsertArticle({ id, title, summary, content, tags, status, updatedAt });
  resetForm();
  renderList();
});

document.querySelector('#resetBtn').addEventListener('click', () => resetForm());
document.querySelector('#publishBtn').addEventListener('click', () => publishToGitHub());
document.querySelector('#downloadBtn').addEventListener('click', () => downloadBackup());

document.querySelector('#manageList').addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;

  const item = event.target.closest('.item[data-id]');
  if (!item) return;

  const action = btn.getAttribute('data-action');
  const id = item.getAttribute('data-id');
  const target = articles.find((article) => article.id === id);
  if (!target) return;

  if (action === 'edit') {
    fillForm(target);
    return;
  }

  if (action === 'toggle') {
    target.status = target.status === 'published' ? 'draft' : 'published';
    renderList();
    return;
  }

  if (action === 'delete') {
    articles = articles.filter((article) => article.id !== id);
    renderList();
  }
});

async function init() {
  articles = await fetchArticlesFromRepo();
  resetForm();
  renderList();
}

init();
