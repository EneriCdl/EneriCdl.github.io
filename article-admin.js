const { getToday, escapeHtml, setTip, putFile, loadSavedToken, saveToken, clearSavedToken } = window.AdminCommon;

const ALLOWED_STATUS = new Set(['draft', 'published']);
let articles = [];
let isPublishing = false;

function uid() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeArticle(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const id = String(raw.id || '').trim() || uid();
  const title = String(raw.title || '').trim();
  const summary = String(raw.summary || '').trim();
  const content = String(raw.content || '').trim();
  const cover = String(raw.cover || '').trim();
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((tag) => String(tag || '').trim()).filter(Boolean)
    : [];
  const status = ALLOWED_STATUS.has(raw.status) ? raw.status : 'draft';
  const updatedAt = String(raw.updatedAt || '').trim() || getToday();

  return { id, title, summary, content, cover, tags, status, updatedAt };
}

function validateArticles(nextArticles) {
  const errors = [];
  const idSet = new Set();

  nextArticles.forEach((item, index) => {
    const row = index + 1;
    if (!item.id) errors.push(`第 ${row} 篇文章缺少 id。`);
    if (item.id && idSet.has(item.id)) errors.push(`文章 id 重复: ${item.id}`);
    idSet.add(item.id);
    if (!item.title) errors.push(`第 ${row} 篇文章标题为空。`);
    if (!item.content) errors.push(`第 ${row} 篇文章正文为空。`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.updatedAt || '')) {
      errors.push(`第 ${row} 篇文章日期格式错误（需 YYYY-MM-DD）。`);
    }
    if (!ALLOWED_STATUS.has(item.status)) {
      errors.push(`第 ${row} 篇文章状态非法（只能是 draft 或 published）。`);
    }
  });

  return errors;
}

async function loadArticles() {
  try {
    const response = await fetch(`./articles.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) {
      const fallback = await fetch('./articles.json', { cache: 'no-store' });
      if (!fallback.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const parsed = await fallback.json();
      return Array.isArray(parsed) ? parsed.map(normalizeArticle) : [];
    }
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed.map(normalizeArticle) : [];
  } catch (err) {
    setTip('publishStatus', `读取文章失败：${String(err.message || err)}`, 'error');
    return [];
  }
}

function updateSaveButton() {
  const saveBtn = document.querySelector('#saveBtn');
  const isEditing = Boolean(document.querySelector('#articleId').value);
  if (saveBtn) saveBtn.textContent = isEditing ? '保存修改' : '保存到当前会话';
}

function resetForm() {
  document.querySelector('#articleForm').reset();
  document.querySelector('#articleId').value = '';
  document.querySelector('#date').value = getToday();
  document.querySelector('#formTitle').textContent = '新建文章';
  updateSaveButton();
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
  updateSaveButton();
  setTip('formStatus', `正在编辑：${article.title || article.id}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function upsertArticle(payload) {
  const normalized = normalizeArticle(payload);
  const idx = articles.findIndex((item) => item.id === normalized.id);
  if (idx >= 0) articles[idx] = normalized;
  else articles.unshift(normalized);
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
    const preview = previewSource.length > 120 ? `${previewSource.slice(0, 120)}...` : previewSource;
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

async function publishArticles() {
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

  const normalized = articles.map(normalizeArticle);
  const errors = validateArticles(normalized);
  if (errors.length) {
    setTip('publishStatus', `发布前校验失败：${errors[0]}`, 'error');
    return;
  }

  isPublishing = true;
  if (publishBtn) publishBtn.disabled = true;
  setTip('publishStatus', '正在发布 articles.json ...');

  try {
    articles = normalized;
    const articleResult = await putFile(owner, repo, branch, 'articles.json', JSON.stringify(articles, null, 2), token, 'update articles');

    if (rememberToken && rememberToken.checked) {
      saveToken(token);
    }

    const aSha = articleResult.commitSha ? articleResult.commitSha.slice(0, 7) : '-';
    setTip('publishStatus', `发布成功。articles: ${aSha}。约 1-2 分钟后生效。`, 'success');
  } catch (err) {
    setTip('publishStatus', String(err.message || err), 'error');
  } finally {
    isPublishing = false;
    if (publishBtn) publishBtn.disabled = false;
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

function bindEvents() {
  document.querySelector('#articleForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const currentId = document.querySelector('#articleId').value;
    const id = currentId || uid();
    const title = document.querySelector('#title').value.trim();
    const summary = document.querySelector('#summary').value.trim();
    const content = document.querySelector('#content').value.trim();
    const cover = document.querySelector('#cover').value.trim();
    const updatedAt = document.querySelector('#date').value;
    const status = document.querySelector('#status').value;
    const tags = document.querySelector('#tags').value.split(',').map((s) => s.trim()).filter(Boolean);

    if (!title || !content || !updatedAt) {
      setTip('formStatus', '请填写标题、正文、日期后再保存。', 'error');
      return;
    }

    if (!ALLOWED_STATUS.has(status)) {
      setTip('formStatus', '状态非法，请选择草稿或发布。', 'error');
      return;
    }

    const previous = articles.find((a) => a.id === id);
    upsertArticle({ id, title, summary, content, cover, tags, status, updatedAt });
    const isEdit = Boolean(currentId && previous);
    resetForm();
    setTip('formStatus', `${isEdit ? '已保存修改' : '已创建文章'}：${title}`, 'success');
    renderList();
  });

  document.querySelector('#resetBtn').addEventListener('click', () => {
    resetForm();
    setTip('formStatus', '表单已清空。');
  });

  document.querySelector('#publishBtn').addEventListener('click', () => {
    void publishArticles();
  });

  document.querySelector('#downloadBtn').addEventListener('click', () => downloadJson());

  document.querySelector('#reloadBtn').addEventListener('click', async () => {
    articles = await loadArticles();
    resetForm();
    renderList();
    setTip('publishStatus', '已重新载入线上文章。');
  });

  document.querySelector('#clearTokenBtn').addEventListener('click', () => {
    clearSavedToken();
    document.querySelector('#token').value = '';
    setTip('publishStatus', '已清除本机已记住 Token。');
  });

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
      if (article.status === 'published') article.updatedAt = getToday();
      renderList();
      setTip('formStatus', `已切换状态：${article.title || article.id} -> ${article.status === 'published' ? '发布' : '草稿'}`, 'success');
      return;
    }

    if (action === 'delete') {
      const ok = window.confirm(`确认删除文章「${article.title || article.id}」吗？`);
      if (!ok) return;
      articles = articles.filter((a) => a.id !== id);
      if (document.querySelector('#articleId').value === id) resetForm();
      renderList();
      setTip('formStatus', `已删除：${article.title || article.id}`, 'success');
    }
  });
}

async function unlock() {
  articles = await loadArticles();

  bindEvents();
  resetForm();
  renderList();

  const savedToken = loadSavedToken();
  if (savedToken) document.querySelector('#token').value = savedToken;
}

void unlock().catch((err) => {
  setTip('publishStatus', String(err.message || err), 'error');
});


