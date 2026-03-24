const { bindGate } = window.AdminCommon;

async function unlock() {
  document.querySelector('#gate').classList.add('hidden');
  document.querySelector('#app').classList.remove('hidden');
}

bindGate(unlock);
