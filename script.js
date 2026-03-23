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

const defaultSiteConfig = {
  projects: [
    { title: 'C 语言学习记录', desc: '语法、指针、数组、数据结构、算法练习，按阶段沉淀可复查笔记。' },
    { title: 'STM32 嵌入式学习记录', desc: '聚焦 GPIO、定时器、中断、串口通信与驱动调试流程。' },
    { title: '项目实战与复盘', desc: '每个小项目输出问题清单、解决路径、优化版本与经验总结。' }
  ],
  about: {
    title: '关于我',
    text1: '我把网页当作一个数字化实验台：每写完一个模块，就补一篇记录；每踩一次坑，就沉淀一套排查路径。',
    text2: '目标是把“会做”逐步升级到“能讲清、能复用、能迁移”。'
  },
  timeline: {
    title: '学习总线',
    items: [
      { bus: 'BUS-1', text: 'C 语言基础 + 指针与内存模型' },
      { bus: 'BUS-2', text: 'STM32 外设驱动 + 中断通信' },
      { bus: 'BUS-3', text: '项目整合 + 性能优化 + 文档化复盘' }
    ]
  }
};

async function loadSiteConfig() {
  try {
    const response = await fetch(`./site-config.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return defaultSiteConfig;
    const parsed = await response.json();
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : defaultSiteConfig.projects,
      about: parsed.about || defaultSiteConfig.about,
      timeline: parsed.timeline || defaultSiteConfig.timeline
    };
  } catch {
    return defaultSiteConfig;
  }
}

function setText(id, value) {
  const el = document.querySelector(`#${id}`);
  if (!el || typeof value !== 'string') return;
  el.textContent = value;
}

function applySiteConfig(config) {
  const projects = Array.isArray(config.projects) ? config.projects : [];
  for (let i = 0; i < 3; i += 1) {
    const row = projects[i] || defaultSiteConfig.projects[i];
    setText(`projectTitle${i + 1}`, row.title || defaultSiteConfig.projects[i].title);
    setText(`projectDesc${i + 1}`, row.desc || defaultSiteConfig.projects[i].desc);
  }

  const about = config.about || defaultSiteConfig.about;
  setText('aboutTitle', about.title || defaultSiteConfig.about.title);
  setText('aboutText1', about.text1 || defaultSiteConfig.about.text1);
  setText('aboutText2', about.text2 || defaultSiteConfig.about.text2);

  const timeline = config.timeline || defaultSiteConfig.timeline;
  setText('timelineTitle', timeline.title || defaultSiteConfig.timeline.title);
  const items = Array.isArray(timeline.items) ? timeline.items : defaultSiteConfig.timeline.items;
  for (let i = 0; i < 3; i += 1) {
    const row = items[i] || defaultSiteConfig.timeline.items[i];
    const target = document.querySelector(`#timelineItem${i + 1}`);
    if (!target) continue;
    target.innerHTML = `<span>${escapeHtml(row.bus || defaultSiteConfig.timeline.items[i].bus)}</span> ${escapeHtml(row.text || defaultSiteConfig.timeline.items[i].text)}`;
  }
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
    const response = await fetch(`./articles.json?v=${Date.now()}`, { cache: 'no-store' });
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

function initWidgets() {
  const powerValue = document.querySelector('#powerValue');
  const powerBar = document.querySelector('#powerBar');
  const liveClock = document.querySelector('#liveClock');
  const liveDate = document.querySelector('#liveDate');
  const logStream = document.querySelector('#logStream');
  const sigButtons = document.querySelectorAll('.sig-btn');
  const signalState = document.querySelector('#signalState');

  if (powerValue && powerBar) {
    setInterval(() => {
      const next = Math.round(45 + Math.random() * 38 + Math.sin(Date.now() / 1000) * 12);
      const safeValue = Math.max(0, Math.min(next, 100));
      powerValue.textContent = String(safeValue);
      powerBar.style.width = `${safeValue}%`;
    }, 620);
  }

  if (liveClock && liveDate) {
    const updateClock = () => {
      const now = new Date();
      liveClock.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
      liveDate.textContent = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  if (logStream) {
    const baseLogs = [
      'UART RX stable @ 115200',
      'ADC sample captured: CH2',
      'PWM duty adjusted to 42%',
      'I2C bus scan complete',
      'ISR tick synced',
      'DMA transfer pass'
    ];

    const renderLogLine = (text) => {
      const line = document.createElement('li');
      const stamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      line.textContent = `[${stamp}] ${text}`;
      logStream.prepend(line);
      while (logStream.children.length > 6) {
        logStream.removeChild(logStream.lastChild);
      }
    };

    baseLogs.slice(0, 4).forEach((line) => renderLogLine(line));
    setInterval(() => {
      const next = baseLogs[Math.floor(Math.random() * baseLogs.length)];
      renderLogLine(next);
    }, 2600);
  }

  if (sigButtons.length && signalState) {
    sigButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        sigButtons.forEach((node) => node.classList.remove('active'));
        btn.classList.add('active');
        const next = btn.getAttribute('data-signal') || 'UART';
        signalState.textContent = `当前激活：${next.toUpperCase()}`;
      });
    });
  }
}

const revealSeq = ['.hero', '.widgets', '#projects', '#about', '#timeline', '#articles', '.footer'];
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

Promise.all([loadArticles(), loadSiteConfig()]).then(([articles, siteConfig]) => {
  state.allPublished = articles
    .filter((item) => item.status === 'published')
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  applySiteConfig(siteConfig);
  renderTagFilters();
  bindArticleInteractions();
  renderArticles();
  initWidgets();
});
