const STORAGE_KEY = 'enericdl_articles_v1';

const seedArticles = [
  {
    id: 'a1',
    title: 'C 语言学习第 1 周：指针入门',
    summary: '记录指针声明、解引用和数组关系的基础理解与常见错误。',
    content: '本周主要完成了指针基础语法复习，重点练习了指针与数组下标互换写法，并整理了空指针与野指针的排查思路。',
    tags: ['C 语言', '基础'],
    status: 'published',
    updatedAt: '2026-03-24'
  },
  {
    id: 'a2',
    title: 'STM32 学习记录：GPIO 与串口通信',
    summary: '完成 GPIO 点灯实验与串口打印调试，梳理时钟配置流程。',
    content: '本次重点在于理解 CubeMX 生成代码结构，明确 main 循环与中断回调之间的职责分离，后续会继续加上按键消抖。',
    tags: ['STM32', '嵌入式'],
    status: 'published',
    updatedAt: '2026-03-23'
  }
];

function getArticles() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedArticles));
    return [...seedArticles];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderArticles() {
  const list = document.querySelector('#articleList');
  if (!list) return;

  const articles = getArticles()
    .filter((item) => item.status === 'published')
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  if (!articles.length) {
    list.innerHTML = '<p class="empty">还没有已发布文章，前往“文章管理”创建第一篇。</p>';
    return;
  }

  list.innerHTML = articles
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

renderArticles();
