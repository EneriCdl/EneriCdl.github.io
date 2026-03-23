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
  try {
    const response = await fetch('./articles.json', { cache: 'no-store' });
    if (!response.ok) return [];
    const parsed = await response.json();
    return normalizeArticles(parsed);
  } catch {
    return [];
  }
}

function renderArticles(articles) {
  const list = document.querySelector('#articleList');
  if (!list) return;

  const publishedArticles = articles
    .filter((item) => item.status === 'published')
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  if (!publishedArticles.length) {
    list.innerHTML = '<p class="empty">还没有已发布文章，站长正在准备中。</p>';
    return;
  }

  list.innerHTML = publishedArticles
    .map((item) => {
      const tags = Array.isArray(item.tags) && item.tags.length ? `#${item.tags.join(' #')}` : '#未分类';
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

const revealSeq = ['.hero', '#projects', '#about', '#timeline', '#articles', '.footer'];
revealSeq.forEach((selector, i) => {
  const el = document.querySelector(selector);
  if (!el) return;
  setTimeout(() => el.classList.add('reveal'), i * 120);
});

loadArticles().then((articles) => renderArticles(articles));
