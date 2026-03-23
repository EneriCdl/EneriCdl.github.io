function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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
  const response = await fetch(`./articles.json?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const parsed = await response.json();
  return normalizeArticles(parsed);
}

function getArticleId() {
  const query = new URLSearchParams(window.location.search);
  return query.get('id') || '';
}

function render(article) {
  const root = document.querySelector('#article');
  if (!root) return;

  if (!article) {
    root.innerHTML = '<p class="empty">文章不存在，或尚未发布。</p>';
    return;
  }

  const cover = article.cover || 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80';
  const tags = article.tags.length ? `#${article.tags.join(' #')}` : '#未分类';

  document.title = `${article.title} · EneriCdl`;
  root.innerHTML = `
    <img class="cover" src="${escapeHtml(cover)}" alt="${escapeHtml(article.title)}" />
    <div class="content">
      <p class="meta">${escapeHtml(article.updatedAt || '未设置日期')} · ${escapeHtml(tags)}</p>
      <h1>${escapeHtml(article.title)}</h1>
      <p class="summary">${escapeHtml(article.summary || '暂无摘要')}</p>
      <div class="body">${escapeHtml(article.content || '')}</div>
    </div>
  `;
}

function initProgressBar() {
  const bar = document.querySelector('#progressBar');
  if (!bar) return;
  const onScroll = () => {
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    const ratio = total > 0 ? (h.scrollTop / total) * 100 : 0;
    bar.style.width = `${Math.max(0, Math.min(100, ratio))}%`;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initCopyLink() {
  const btn = document.querySelector('#copyLinkBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      btn.textContent = '链接已复制';
      setTimeout(() => { btn.textContent = '复制文章链接'; }, 1400);
    } catch {
      btn.textContent = '复制失败';
      setTimeout(() => { btn.textContent = '复制文章链接'; }, 1400);
    }
  });
}

(async function init() {
  const id = getArticleId();
  initProgressBar();
  initCopyLink();

  try {
    const articles = await loadArticles();
    const target = articles.find((item) => item.id === id && item.status === 'published');
    render(target);
  } catch {
    render(null);
  }
})();
