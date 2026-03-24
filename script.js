function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const PAGE_SIZE = 4;
const GUEST_PENDING_KEY = 'guestbook_pending_messages';
const state = {
  allPublished: [],
  filtered: [],
  page: 1,
  keyword: '',
  tag: 'all',
  loading: true,
  error: ''
};
const guestbookState = {
  published: [],
  pending: []
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

async function fetchJsonWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadSiteConfig() {
  try {
    const parsed = await fetchJsonWithTimeout(`./site-config.json?v=${Date.now()}`);
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : defaultSiteConfig.projects,
      about: parsed.about || defaultSiteConfig.about,
      timeline: parsed.timeline || defaultSiteConfig.timeline
    };
  } catch {
    return defaultSiteConfig;
  }
}

async function loadArticles() {
  const parsed = await fetchJsonWithTimeout(`./articles.json?v=${Date.now()}`);
  return normalizeArticles(parsed);
}

function normalizeGuestbook(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: item.id || '',
      mode: item.mode === 'real' ? 'real' : 'anonymous',
      name: item.name || '匿名访客',
      content: item.content || '',
      createdAt: item.createdAt || '',
      status: item.status === 'hidden' ? 'hidden' : 'approved'
    }));
}

async function loadGuestbook() {
  try {
    const parsed = await fetchJsonWithTimeout(`./guestbook.json?v=${Date.now()}`);
    return normalizeGuestbook(parsed);
  } catch {
    return [];
  }
}

function loadPendingGuestbook() {
  try {
    const raw = localStorage.getItem(GUEST_PENDING_KEY);
    if (!raw) return [];
    return normalizeGuestbook(JSON.parse(raw)).map((item) => ({ ...item, status: 'pending' }));
  } catch {
    return [];
  }
}

function savePendingGuestbook(list) {
  localStorage.setItem(GUEST_PENDING_KEY, JSON.stringify(list));
}

function renderGuestbookLists() {
  const publishedRoot = document.querySelector('#guestbookList');
  const pendingRoot = document.querySelector('#guestPendingList');
  if (!publishedRoot || !pendingRoot) return;

  const approved = guestbookState.published
    .filter((item) => item.status !== 'hidden')
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  if (!approved.length) {
    publishedRoot.innerHTML = '<p class="empty">暂无公开留言，来写第一条吧。</p>';
  } else {
    publishedRoot.innerHTML = approved.map((item) => `
      <article class="guest-item">
        <p class="guest-meta"><span class="guest-author">${escapeHtml(item.name || '匿名访客')}</span> · ${escapeHtml(item.createdAt || '')}</p>
        <p>${escapeHtml(item.content || '')}</p>
      </article>
    `).join('');
  }

  const pending = [...guestbookState.pending].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (!pending.length) {
    pendingRoot.innerHTML = '<p class="empty">暂无待审核留言。</p>';
  } else {
    pendingRoot.innerHTML = pending.map((item) => `
      <article class="guest-item">
        <p class="guest-meta"><span class="guest-author">${escapeHtml(item.name || '匿名访客')}</span> · ${escapeHtml(item.createdAt || '')} · 待审核</p>
        <p>${escapeHtml(item.content || '')}</p>
      </article>
    `).join('');
  }
}

function bindGuestbookInteractions() {
  const form = document.querySelector('#guestbookForm');
  const nameInput = document.querySelector('#guestName');
  const messageInput = document.querySelector('#guestMessage');
  const resetBtn = document.querySelector('#guestResetBtn');
  const statusEl = document.querySelector('#guestFormStatus');
  const modeInputs = document.querySelectorAll('input[name="guestMode"]');

  if (!form || !nameInput || !messageInput || !statusEl || !modeInputs.length) return;

  const refreshMode = () => {
    const mode = document.querySelector('input[name="guestMode"]:checked')?.value || 'anonymous';
    const isReal = mode === 'real';
    nameInput.disabled = !isReal;
    nameInput.placeholder = isReal ? '请输入你的称呼' : '匿名模式无需填写';
    if (!isReal) nameInput.value = '';
  };
  modeInputs.forEach((input) => {
    input.addEventListener('change', refreshMode);
  });
  refreshMode();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const mode = document.querySelector('input[name="guestMode"]:checked')?.value || 'anonymous';
    const name = mode === 'real' ? nameInput.value.trim() : '匿名访客';
    const content = messageInput.value.trim();
    const createdAt = new Date().toLocaleString('zh-CN', { hour12: false });

    if (mode === 'real' && !name) {
      statusEl.textContent = '实名留言请填写称呼。';
      return;
    }
    if (!content) {
      statusEl.textContent = '留言内容不能为空。';
      return;
    }

    const next = {
      id: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      mode,
      name,
      content,
      createdAt,
      status: 'pending'
    };

    guestbookState.pending.unshift(next);
    savePendingGuestbook(guestbookState.pending);
    renderGuestbookLists();
    messageInput.value = '';
    if (mode === 'real') nameInput.value = '';
    statusEl.textContent = '留言已提交到本机待审核列表，站长审核后会出现在公开留言中。';
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      messageInput.value = '';
      nameInput.value = '';
      statusEl.textContent = '已清空输入内容。';
    });
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
  const count = document.querySelector('#articleCount');
  if (!list) return;

  if (state.loading) {
    list.innerHTML = '<p class="empty">正在加载文章...</p>';
    if (count) count.textContent = '加载中...';
    return;
  }

  if (state.error) {
    list.innerHTML = `<p class="empty">加载失败：${escapeHtml(state.error)}</p>`;
    if (count) count.textContent = '加载失败';
    return;
  }

  state.filtered = getFilteredArticles();
  renderPager(state.filtered.length);

  if (count) count.textContent = `共 ${state.filtered.length} 篇匹配`;

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
      <a class="article-card" href="${href}" aria-label="阅读 ${escapeHtml(item.title)}">
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

function debounce(fn, wait = 180) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function bindArticleInteractions() {
  const searchInput = document.querySelector('#articleSearch');
  const tagFilters = document.querySelector('#tagFilters');
  const pager = document.querySelector('#articlePager');
  const resetBtn = document.querySelector('#resetFiltersBtn');

  if (searchInput) {
    const onSearch = debounce((value) => {
      state.keyword = value || '';
      state.page = 1;
      renderArticles();
    });

    searchInput.addEventListener('input', (event) => {
      onSearch(event.target.value || '');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.keyword = '';
      state.tag = 'all';
      state.page = 1;
      if (searchInput) searchInput.value = '';
      renderTagFilters();
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
      window.scrollTo({ top: document.querySelector('#articles')?.offsetTop || 0, behavior: 'smooth' });
    });
  }
}

function setSystemStatus(text, isWarn = false) {
  const target = document.querySelector('#sysStatus');
  if (!target) return;
  target.textContent = text;
  target.style.color = isWarn ? 'var(--warn)' : 'var(--accent-2)';
}

function initWidgets() {
  const powerValue = document.querySelector('#powerValue');
  const powerBar = document.querySelector('#powerBar');
  const liveClock = document.querySelector('#liveClock');
  const liveDate = document.querySelector('#liveDate');
  const logStream = document.querySelector('#logStream');
  const sigButtons = document.querySelectorAll('.sig-btn');
  const signalState = document.querySelector('#signalState');

  let powerTimer = null;
  let clockTimer = null;
  let logTimer = null;

  const baseLogs = [
    'UART RX stable @ 115200',
    'ADC sample captured: CH2',
    'PWM duty adjusted to 42%',
    'I2C bus scan complete',
    'ISR tick synced',
    'DMA transfer pass'
  ];

  const renderLogLine = (text) => {
    if (!logStream) return;
    const line = document.createElement('li');
    const stamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    line.textContent = `[${stamp}] ${text}`;
    logStream.prepend(line);
    while (logStream.children.length > 6) {
      logStream.removeChild(logStream.lastChild);
    }
  };

  const run = () => {
    if (powerValue && powerBar && !powerTimer) {
      powerTimer = setInterval(() => {
        const next = Math.round(45 + Math.random() * 38 + Math.sin(Date.now() / 1000) * 12);
        const safeValue = Math.max(0, Math.min(next, 100));
        powerValue.textContent = String(safeValue);
        powerBar.style.width = `${safeValue}%`;
      }, 620);
    }

    if (liveClock && liveDate && !clockTimer) {
      const updateClock = () => {
        const now = new Date();
        liveClock.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
        liveDate.textContent = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
      };
      updateClock();
      clockTimer = setInterval(updateClock, 1000);
    }

    if (logStream && !logTimer) {
      if (!logStream.children.length) {
        baseLogs.slice(0, 4).forEach((line) => renderLogLine(line));
      }
      logTimer = setInterval(() => {
        const next = baseLogs[Math.floor(Math.random() * baseLogs.length)];
        renderLogLine(next);
      }, 2600);
    }
  };

  const stop = () => {
    if (powerTimer) { clearInterval(powerTimer); powerTimer = null; }
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
    if (logTimer) { clearInterval(logTimer); logTimer = null; }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else run();
  });

  run();

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

const revealSeq = ['.hero', '.widgets', '#projects', '#about', '#timeline', '#articles', '#guestbook', '.footer'];
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

(async function init() {
  try {
    const [articles, siteConfig, guestbook] = await Promise.all([loadArticles(), loadSiteConfig(), loadGuestbook()]);

    state.allPublished = articles
      .filter((item) => item.status === 'published')
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

    applySiteConfig(siteConfig);
    guestbookState.published = guestbook;
    guestbookState.pending = loadPendingGuestbook();
    bindGuestbookInteractions();
    renderGuestbookLists();
    renderTagFilters();
    bindArticleInteractions();
    state.loading = false;
    state.error = '';
    renderArticles();
    initWidgets();
    setSystemStatus('ONLINE');
  } catch (err) {
    state.loading = false;
    state.error = '数据读取异常，请稍后刷新重试';
    guestbookState.published = [];
    guestbookState.pending = loadPendingGuestbook();
    bindGuestbookInteractions();
    renderGuestbookLists();
    renderArticles();
    setSystemStatus('DEGRADED', true);
  }
})();
