const { setTip, putFile, loadSavedToken, saveToken, clearSavedToken, bindGate } = window.AdminCommon;
const ADMIN_SESSION_KEY = 'lab705_admin_session_ok';

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

let siteConfig = JSON.parse(JSON.stringify(defaultSiteConfig));
let isPublishing = false;

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
    if (el) el.placeholder = el.value;
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

async function publishConfig() {
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

  isPublishing = true;
  if (publishBtn) publishBtn.disabled = true;
  setTip('publishStatus', '正在发布 site-config.json ...');

  try {
    siteConfig = collectSiteConfigFromForm(siteConfig);
    const result = await putFile(owner, repo, branch, 'site-config.json', JSON.stringify(siteConfig, null, 2), token, 'update site config');

    if (rememberToken && rememberToken.checked) {
      saveToken(token);
    }

    const sha = result.commitSha ? result.commitSha.slice(0, 7) : '-';
    setTip('publishStatus', `发布成功。config: ${sha}。约 1-2 分钟后生效。`, 'success');
  } catch (err) {
    setTip('publishStatus', String(err.message || err), 'error');
  } finally {
    isPublishing = false;
    if (publishBtn) publishBtn.disabled = false;
  }
}

function bindEvents() {
  document.querySelector('#refreshPreviewBtn').addEventListener('click', () => renderConfigPreview());

  document.querySelector('#reloadConfigBtn').addEventListener('click', async () => {
    siteConfig = await loadSiteConfig();
    fillSiteConfigForm(siteConfig);
    renderConfigPreview();
    setTip('publishStatus', '已重新载入线上配置。');
  });

  document.querySelector('#publishBtn').addEventListener('click', () => {
    void publishConfig();
  });

  document.querySelector('#downloadConfigBtn').addEventListener('click', () => downloadConfigJson());

  document.querySelector('#clearTokenBtn').addEventListener('click', () => {
    clearSavedToken();
    document.querySelector('#token').value = '';
    setTip('publishStatus', '已清除本机已记住 Token。');
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
  siteConfig = await loadSiteConfig();

  document.querySelector('#gate').classList.add('hidden');
  document.querySelector('#app').classList.remove('hidden');

  bindEvents();
  fillSiteConfigForm(siteConfig);
  renderConfigPreview();

  const savedToken = loadSavedToken();
  if (savedToken) document.querySelector('#token').value = savedToken;
}

if (sessionStorage.getItem(ADMIN_SESSION_KEY) === '1') {
  void unlock();
} else {
  bindGate(async () => {
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    await unlock();
  });
}

