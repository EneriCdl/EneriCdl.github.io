const ADMIN_PASSWORD = ['dsxx', '705', 'xzh'].join('');
const TOKEN_STORAGE_KEY = ['lab', '705', 'token'].join('_');

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

let articles = [];
let siteConfig = JSON.parse(JSON.stringify(defaultSiteConfig));

function uid() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function resetForm() {
  document.querySelector('#articleForm').reset();
  document.querySelector('#articleId').value = '';
  document.querySelector('#date').value = getToday();
  document.querySelector('#formTitle').textContent = '新建文章';
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadArticles() {
  try {
    const response = await fetch(`./articles.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return [];
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadSiteConfig() {
  try {
    const response = await fetch(`./site-config.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return JSON.parse(JSON.stringify(defaultSiteConfig));
    const parsed = await response.json();
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : defaultSiteConfig.projects,
      about: parsed.about || defaultSiteConfig.about,
      timeline: parsed.timeline || defaultSiteConfig.timeline
    };
  } catch {
    return JSON.parse(JSON.stringify(defaultSiteConfig));
  }
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
    const preview = previewSource.length > 100 ? `${previewSource.slice(0, 100)}...` : previewSource;
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

function upsertArticle(payload) {
  const idx = articles.findIndex((item) => item.id === payload.id);
  if (idx >= 0) articles[idx] = payload;
  else articles.unshift(payload);
}

function fillSiteConfigForm(config) {
  const p = Array.isArray(config.projects) ? config.projects : defaultSiteConfig.projects;
  document.querySelector('#projectTitle1').value = p[0]?.title || '';
  document.querySelector('#projectDesc1').value = p[0]?.desc || '';
  document.querySelector('#projectTitle2').value = p[1]?.title || '';
  document.querySelector('#projectDesc2').value = p[1]?.desc || '';
  document.querySelector('#projectTitle3').value = p[2]?.title || '';
  document.querySelector('#projectDesc3').value = p[2]?.desc || '';

  const about = config.about || defaultSiteConfig.about;
  document.querySelector('#aboutTitle').value = about.title || '';
  document.querySelector('#aboutText1').value = about.text1 || '';
  document.querySelector('#aboutText2').value = about.text2 || '';

  const timeline = config.timeline || defaultSiteConfig.timeline;
  document.querySelector('#timelineTitle').value = timeline.title || '';
  const items = Array.isArray(timeline.items) ? timeline.items : defaultSiteConfig.timeline.items;
  document.querySelector('#timelineItem1').value = `${items[0]?.bus || 'BUS-1'}|${items[0]?.text || ''}`;
  document.querySelector('#timelineItem2').value = `${items[1]?.bus || 'BUS-2'}|${items[1]?.text || ''}`;
  document.querySelector('#timelineItem3').value = `${items[2]?.bus || 'BUS-3'}|${items[2]?.text || ''}`;

  const ids = [
    'projectTitle1', 'projectDesc1',
    'projectTitle2', 'projectDesc2',
    'projectTitle3', 'projectDesc3',
    'aboutTitle', 'aboutText1', 'aboutText2',
    'timelineTitle', 'timelineItem1', 'timelineItem2', 'timelineItem3'
  ];
  ids.forEach((id) => {
    const el = document.querySelector(`#${id}`);
    if (!el) return;
    el.placeholder = el.value;
  });
}

function parseBusLine(value, fallbackBus) {
  const raw = String(value || '').trim();
  if (!raw) return { bus: fallbackBus, text: '' };
  const idx = raw.indexOf('|');
  if (idx < 0) return { bus: fallbackBus, text: raw };
  const bus = raw.slice(0, idx).trim() || fallbackBus;
  const text = raw.slice(idx + 1).trim();
  return { bus, text };
}

function getInputOrFallback(id, fallback) {
  const el = document.querySelector(`#${id}`);
  if (!el) return fallback;
  const value = String(el.value || '').trim();
  return value === '' ? fallback : value;
}

function collectSiteConfigFromForm(baseConfig) {
  const cfg = baseConfig || defaultSiteConfig;
  const baseProjects = Array.isArray(cfg.projects) ? cfg.projects : defaultSiteConfig.projects;
  const baseAbout = cfg.about || defaultSiteConfig.about;
  const baseTimeline = cfg.timeline || defaultSiteConfig.timeline;
  const baseItems = Array.isArray(baseTimeline.items) ? baseTimeline.items : defaultSiteConfig.timeline.items;

  return {
    projects: [
      {
        title: getInputOrFallback('projectTitle1', baseProjects[0]?.title || ''),
        desc: getInputOrFallback('projectDesc1', baseProjects[0]?.desc || '')
      },
      {
        title: getInputOrFallback('projectTitle2', baseProjects[1]?.title || ''),
        desc: getInputOrFallback('projectDesc2', baseProjects[1]?.desc || '')
      },
      {
        title: getInputOrFallback('projectTitle3', baseProjects[2]?.title || ''),
        desc: getInputOrFallback('projectDesc3', baseProjects[2]?.desc || '')
      }
    ],
    about: {
      title: getInputOrFallback('aboutTitle', baseAbout.title || ''),
      text1: getInputOrFallback('aboutText1', baseAbout.text1 || ''),
      text2: getInputOrFallback('aboutText2', baseAbout.text2 || '')
    },
    timeline: {
      title: getInputOrFallback('timelineTitle', baseTimeline.title || ''),
      items: [
        parseBusLine(getInputOrFallback('timelineItem1', `${baseItems[0]?.bus || 'BUS-1'}|${baseItems[0]?.text || ''}`), baseItems[0]?.bus || 'BUS-1'),
        parseBusLine(getInputOrFallback('timelineItem2', `${baseItems[1]?.bus || 'BUS-2'}|${baseItems[1]?.text || ''}`), baseItems[1]?.bus || 'BUS-2'),
        parseBusLine(getInputOrFallback('timelineItem3', `${baseItems[2]?.bus || 'BUS-3'}|${baseItems[2]?.text || ''}`), baseItems[2]?.bus || 'BUS-3')
      ]
    }
  };
}

function setPreviewText(id, value) {
  const el = document.querySelector(`#${id}`);
  if (!el) return;
  el.textContent = value || '-';
}

function renderConfigPreview() {
  const cfg = collectSiteConfigFromForm(siteConfig);

  setPreviewText('pvProjectTitle1', cfg.projects[0]?.title || '');
  setPreviewText('pvProjectDesc1', cfg.projects[0]?.desc || '');
  setPreviewText('pvProjectTitle2', cfg.projects[1]?.title || '');
  setPreviewText('pvProjectDesc2', cfg.projects[1]?.desc || '');
  setPreviewText('pvProjectTitle3', cfg.projects[2]?.title || '');
  setPreviewText('pvProjectDesc3', cfg.projects[2]?.desc || '');

  setPreviewText('pvAboutTitle', cfg.about.title || '');
  setPreviewText('pvAboutText1', cfg.about.text1 || '');
  setPreviewText('pvAboutText2', cfg.about.text2 || '');

  setPreviewText('pvTimelineTitle', cfg.timeline.title || '');
  setPreviewText('pvTimelineItem1', `${cfg.timeline.items[0]?.bus || 'BUS-1'} ${cfg.timeline.items[0]?.text || ''}`.trim());
  setPreviewText('pvTimelineItem2', `${cfg.timeline.items[1]?.bus || 'BUS-2'} ${cfg.timeline.items[1]?.text || ''}`.trim());
  setPreviewText('pvTimelineItem3', `${cfg.timeline.items[2]?.bus || 'BUS-3'} ${cfg.timeline.items[2]?.text || ''}`.trim());
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
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });

  if (response.status === 404) return '';
  if (!response.ok) throw new Error(`读取远程文件失败: ${response.status}`);

  const data = await response.json();
  return data.sha || '';
}

async function putFile(owner, repo, branch, path, content, token, messagePrefix) {
  const sha = await getContentSha(owner, repo, path, branch, token);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const body = {
    message: `${messagePrefix} ${new Date().toISOString()}`,
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
    const text = await response.text();
    throw new Error(`发布 ${path} 失败: ${response.status} ${text}`);
  }

  const data = await response.json();
  return {
    commitSha: data?.commit?.sha || '',
    commitUrl: data?.commit?.html_url || ''
  };
}

async function publishToGitHub() {
  const owner = document.querySelector('#owner').value.trim();
  const repo = document.querySelector('#repo').value.trim();
  const branch = document.querySelector('#branch').value.trim();
  const tokenInput = document.querySelector('#token');
  const rememberToken = document.querySelector('#rememberToken');
  const token = tokenInput.value.trim() || localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  const statusEl = document.querySelector('#publishStatus');

  if (!token) {
    statusEl.textContent = '请先输入 GitHub Token。';
    return;
  }

  siteConfig = collectSiteConfigFromForm(siteConfig);
  statusEl.textContent = '正在发布 articles.json + site-config.json ...';

  try {
    const articleResult = await putFile(owner, repo, branch, 'articles.json', JSON.stringify(articles, null, 2), token, 'update articles');
    const configResult = await putFile(owner, repo, branch, 'site-config.json', JSON.stringify(siteConfig, null, 2), token, 'update site config');

    if (rememberToken && rememberToken.checked) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }

    const aSha = articleResult.commitSha ? articleResult.commitSha.slice(0, 7) : '-';
    const cSha = configResult.commitSha ? configResult.commitSha.slice(0, 7) : '-';
    statusEl.textContent = `发布成功。articles: ${aSha}，config: ${cSha}。约 1-2 分钟后生效。`;
  } catch (err) {
    statusEl.textContent = String(err.message || err);
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

function downloadConfigJson() {
  const nextConfig = collectSiteConfigFromForm(siteConfig);
  const blob = new Blob([JSON.stringify(nextConfig, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'site-config.json';
  a.click();
  URL.revokeObjectURL(url);
}

function bindAppEvents() {
  document.querySelector('#articleForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const id = document.querySelector('#articleId').value || uid();
    const title = document.querySelector('#title').value.trim();
    const summary = document.querySelector('#summary').value.trim();
    const content = document.querySelector('#content').value.trim();
    const cover = document.querySelector('#cover').value.trim();
    const updatedAt = document.querySelector('#date').value;
    const status = document.querySelector('#status').value;
    const tags = document.querySelector('#tags').value.split(',').map((s) => s.trim()).filter(Boolean);

    if (!title || !content || !updatedAt) return;

    upsertArticle({ id, title, summary, content, cover, tags, status, updatedAt });
    resetForm();
    renderList();
  });

  document.querySelector('#resetBtn').addEventListener('click', () => resetForm());
  document.querySelector('#publishBtn').addEventListener('click', () => publishToGitHub());
  document.querySelector('#downloadBtn').addEventListener('click', () => downloadJson());
  document.querySelector('#downloadConfigBtn').addEventListener('click', () => downloadConfigJson());
  document.querySelector('#refreshPreviewBtn').addEventListener('click', () => renderConfigPreview());
  document.querySelector('#reloadConfigBtn').addEventListener('click', async () => {
    const latest = await loadSiteConfig();
    siteConfig = latest;
    fillSiteConfigForm(siteConfig);
    renderConfigPreview();
    document.querySelector('#publishStatus').textContent = '已重新载入当前线上内容。';
  });
  document.querySelector('#clearTokenBtn').addEventListener('click', () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    document.querySelector('#token').value = '';
    document.querySelector('#publishStatus').textContent = '已清除本机已记住 Token。';
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
      renderList();
      return;
    }

    if (action === 'delete') {
      articles = articles.filter((a) => a.id !== id);
      renderList();
    }
  });

  const configIds = [
    'projectTitle1', 'projectDesc1',
    'projectTitle2', 'projectDesc2',
    'projectTitle3', 'projectDesc3',
    'aboutTitle', 'aboutText1', 'aboutText2',
    'timelineTitle', 'timelineItem1', 'timelineItem2', 'timelineItem3'
  ];
  configIds.forEach((id) => {
    const el = document.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('input', () => renderConfigPreview());
  });
}

async function unlock() {
  const loaded = await Promise.all([loadArticles(), loadSiteConfig()]);
  articles = loaded[0];
  siteConfig = loaded[1];

  document.querySelector('#gate').classList.add('hidden');
  document.querySelector('#app').classList.remove('hidden');
  bindAppEvents();
  resetForm();
  fillSiteConfigForm(siteConfig);
  renderConfigPreview();

  const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (savedToken) {
    document.querySelector('#token').value = savedToken;
  }

  renderList();
}

document.querySelector('#gateEnter').addEventListener('click', () => {
  const input = document.querySelector('#gatePassword').value;
  const msg = document.querySelector('#gateMsg');

  if (input === ADMIN_PASSWORD) {
    msg.textContent = '';
    unlock();
    return;
  }

  msg.textContent = '密码错误。';
});

document.querySelector('#gatePassword').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    document.querySelector('#gateEnter').click();
  }
});
