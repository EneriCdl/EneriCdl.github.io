function normalizeArticles(data) {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: item.id || '',
      title: item.title || '未命名文章',
      summary: item.summary || '',
      content: item.content || '',
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
      return `
      <article class="article-item">
        <p class="article-meta">${item.updatedAt || '未设置日期'} · ${tags}</p>
        <h3>${item.title}</h3>
        <p>${item.summary || item.content || ''}</p>
      </article>`;
    })
    .join('');
}

const revealSeq = ['.hero', '#projects', '#about', '#timeline', '#articles', '.footer'];
revealSeq.forEach((selector, i) => {
  const el = document.querySelector(selector);
  if (!el) return;
  setTimeout(() => el.classList.add('reveal'), i * 120);
});

const projectsLink = document.querySelector('.btn-primary[href="#projects"]');
const projectsSection = document.querySelector('#projects');

if (projectsLink && projectsSection) {
  projectsLink.addEventListener('click', (event) => {
    event.preventDefault();
    projectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#projects');
  });
}

loadArticles().then((articles) => renderArticles(articles));
