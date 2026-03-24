const ADMIN_PASSWORD = ['dsxx', '705', 'xzh'].join('');
const TOKEN_STORAGE_KEY = ['lab', '705', 'token'].join('_');

function getToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setTip(id, message, type = 'info') {
  const el = document.querySelector(`#${id}`);
  if (!el) return;
  el.textContent = message || '';
  el.classList.remove('success', 'error');
  if (type === 'success' || type === 'error') {
    el.classList.add(type);
  }
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

function loadSavedToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
}

function saveToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function clearSavedToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function bindGate(onUnlock) {
  const enterBtn = document.querySelector('#gateEnter');
  const passwordInput = document.querySelector('#gatePassword');
  const message = document.querySelector('#gateMsg');

  if (!enterBtn || !passwordInput) {
    onUnlock();
    return;
  }

  const tryUnlock = async () => {
    const input = String(passwordInput.value || '').trim();
    if (input === ADMIN_PASSWORD) {
      if (message) message.textContent = '';
      await onUnlock();
      return;
    }

    if (message) message.textContent = '密码错误。';
  };

  enterBtn.addEventListener('click', () => {
    void tryUnlock();
  });

  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void tryUnlock();
    }
  });
}

window.AdminCommon = {
  TOKEN_STORAGE_KEY,
  getToday,
  escapeHtml,
  setTip,
  putFile,
  loadSavedToken,
  saveToken,
  clearSavedToken,
  bindGate
};
