const STORAGE_KEY = 'enericdl_articles_v1';

function uid() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function readArticles() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveArticles(articles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

function resetForm() {
  const form = document.querySelector('#articleForm');
  form.reset();
  document.querySelector('#articleId').value = '';
  document.querySelector('#date').value = new Date().toISOString().slice(0, 10);
  document.querySelector('#formTitle').textContent = '新建文章';
}

function fillForm(article) {
  document.querySelector('#articleId').value = article.id;
  document.querySelector('#title').value = article.title || '';
  document.querySelector('#summary').value = article.summary || '';
  document.querySelector('#content').value = article.content || '';
  document.querySelector('#tags').value = Array.isArray(article.tags) ? article.tags.join(', ') : '';
  document.querySelector('#date').value = article.updatedAt || new Date().toISOString().slice(0, 10);
  document.querySelector('#status').value = article.status || 'draft';
  document.querySelector('#formTitle').textContent = '编辑文章';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderList() {
  const list = document.querySelector('#manageList');
  const articles = readArticles().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  if (!articles.length) {
    list.innerHTML = '<p class="empty">暂无文章，先创建第一篇。</p>';
    return;
  }

  list.innerHTML = articles
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
  const articles = readArticles();
  const idx = articles.findIndex((item) => item.id === payload.id);

  if (idx >= 0) {
    articles[idx] = payload;
  } else {
    articles.push(payload);
  }

  saveArticles(articles);
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

document.querySelector('#manageList').addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;

  const item = event.target.closest('.item[data-id]');
  if (!item) return;

  const action = btn.getAttribute('data-action');
  const id = item.getAttribute('data-id');
  const articles = readArticles();
  const target = articles.find((article) => article.id === id);
  if (!target) return;

  if (action === 'edit') {
    fillForm(target);
    return;
  }

  if (action === 'toggle') {
    target.status = target.status === 'published' ? 'draft' : 'published';
    saveArticles(articles);
    renderList();
    return;
  }

  if (action === 'delete') {
    const next = articles.filter((article) => article.id !== id);
    saveArticles(next);
    renderList();
  }
});

resetForm();
renderList();
