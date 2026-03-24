const FALLBACK_PASSWORD = ['dsxx', '705', 'xzh'].join('');

async function unlock() {
  document.querySelector('#gate').classList.add('hidden');
  document.querySelector('#app').classList.remove('hidden');
}

function bindGateFallback() {
  const enterBtn = document.querySelector('#gateEnter');
  const passwordInput = document.querySelector('#gatePassword');
  const message = document.querySelector('#gateMsg');
  if (!enterBtn || !passwordInput) return;

  const tryUnlock = async () => {
    const input = String(passwordInput.value || '').trim();
    if (input === FALLBACK_PASSWORD) {
      if (message) message.textContent = '';
      await unlock();
      return;
    }
    if (message) message.textContent = '密码错误。';
  };

  enterBtn.addEventListener('click', () => { void tryUnlock(); });
  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void tryUnlock();
    }
  });
}

if (window.AdminCommon && typeof window.AdminCommon.bindGate === 'function') {
  window.AdminCommon.bindGate(unlock);
} else {
  bindGateFallback();
}
