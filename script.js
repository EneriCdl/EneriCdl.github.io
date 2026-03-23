function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const PAGE_SIZE = 4;
const state = {
  allPublished: [],
  filtered: [],
  page: 1,
  keyword: '',
  tag: 'all'
};

function normalizeArticles(data) {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: item.id || '',
      title: item.title || '未命名文章',
      summary: item.summary || '',
      content: item.content || '',
      cover: item.cover || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      status: item.status || 'draft',
      updatedAt: item.updatedAt || ''
    }));
}

async function loadArticles() {
  try {
    const response = await fetch('./articles.json', { cache: 'no-store' });
    if (!response.ok) return [];
    const parsed = await response.json();
    return normalizeArticles(parsed);
  } catch {
    return [];
  }
}

function getFilteredArticles() {
  const keyword = state.keyword.trim().toLowerCase();

  return state.allPublished.filter((item) => {
    const tagOk = state.tag === 'all' || item.tags.includes(state.tag);
    if (!tagOk) return false;

    if (!keyword) return true;
    const text = `${item.title} ${item.summary} ${item.content} ${item.tags.join(' ')}`.toLowerCase();
    return text.includes(keyword);
  });
}

function renderTagFilters() {
  const root = document.querySelector('#tagFilters');
  if (!root) return;

  const tagSet = new Set();
  state.allPublished.forEach((item) => item.tags.forEach((tag) => tagSet.add(tag)));
  const tags = ['all', ...Array.from(tagSet)];

  root.innerHTML = tags
    .map((tag) => {
      const active = state.tag === tag ? ' active' : '';
      const label = tag === 'all' ? '全部' : tag;
      return `<button class="tag-btn${active}" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(label)}</button>`;
    })
    .join('');
}

function renderPager(totalItems) {
  const root = document.querySelector('#articlePager');
  if (!root) return;

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (state.page > totalPages) state.page = totalPages;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  root.innerHTML = [
    `<button class="page-btn" type="button" data-page="prev" ${state.page === 1 ? 'disabled' : ''}>上一页</button>`,
    ...pages.map((p) => `<button class="page-btn${p === state.page ? ' active' : ''}" type="button" data-page="${p}">${p}</button>`),
    `<button class="page-btn" type="button" data-page="next" ${state.page === totalPages ? 'disabled' : ''}>下一页</button>`
  ].join('');
}

function renderArticles() {
  const list = document.querySelector('#articleList');
  if (!list) return;

  state.filtered = getFilteredArticles();
  renderPager(state.filtered.length);

  if (!state.filtered.length) {
    list.innerHTML = '<p class="empty">没有匹配结果，试试更换关键词或标签。</p>';
    return;
  }

  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = state.filtered.slice(start, start + PAGE_SIZE);

  list.innerHTML = pageItems
    .map((item) => {
      const tags = item.tags.length ? `#${item.tags.join(' #')}` : '#未分类';
      const cover = item.cover || 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80';
      const href = `./article.html?id=${encodeURIComponent(item.id)}`;

      return `
      <a class="article-card" href="${href}">
        <img class="article-cover" src="${escapeHtml(cover)}" alt="${escapeHtml(item.title)}" loading="lazy" />
        <div class="article-body">
          <p class="article-meta">${escapeHtml(item.updatedAt || '未设置日期')} · ${escapeHtml(tags)}</p>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary || item.content || '')}</p>
        </div>
      </a>`;
    })
    .join('');
}

function bindArticleInteractions() {
  const searchInput = document.querySelector('#articleSearch');
  const tagFilters = document.querySelector('#tagFilters');
  const pager = document.querySelector('#articlePager');

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      state.keyword = event.target.value || '';
      state.page = 1;
      renderArticles();
    });
  }

  if (tagFilters) {
    tagFilters.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-tag]');
      if (!btn) return;
      state.tag = btn.getAttribute('data-tag') || 'all';
      state.page = 1;
      renderTagFilters();
      renderArticles();
    });
  }

  if (pager) {
    pager.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-page]');
      if (!btn) return;

      const totalPages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
      const value = btn.getAttribute('data-page');

      if (value === 'prev') state.page = Math.max(1, state.page - 1);
      else if (value === 'next') state.page = Math.min(totalPages, state.page + 1);
      else state.page = Number(value) || 1;

      renderArticles();
    });
  }
}

const revealSeq = ['.hero', '#projects', '#about', '#timeline', '#articles', '.footer'];
revealSeq.forEach((selector, i) => {
  const el = document.querySelector(selector);
  if (!el) return;
  setTimeout(() => el.classList.add('reveal'), i * 120);
});

const secretPattern = ['d', 's', 'x', 'x'];
let secretBuffer = [];
window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  const key = String(event.key || '').toLowerCase();
  if (!/^[a-z]$/.test(key)) return;

  secretBuffer.push(key);
  if (secretBuffer.length > secretPattern.length) {
    secretBuffer = secretBuffer.slice(-secretPattern.length);
  }

  const matched = secretPattern.every((ch, idx) => secretBuffer[idx] === ch);
  if (matched) {
    secretBuffer = [];
    window.location.href = './lab-705.html';
  }
});

loadArticles().then((articles) => {
  state.allPublished = articles
    .filter((item) => item.status === 'published')
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  renderTagFilters();
  bindArticleInteractions();
  renderArticles();
});
