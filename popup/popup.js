(function() {
  const $ = (id) => document.getElementById(id);
  const err = $('error');
  const btnToggle = $('btnToggle');
  const btnExport = $('btnExport');
  const btnClear = $('btnClear');
  const pStatus = $('pStatus');
  const pTotal = $('pTotal');
  const pModified = $('pModified');
  const pMode = $('pMode');

  function showError(msg) {
    err.innerHTML = '<div class="error-box">' + msg + '</div>';
  }
  function clearError() { err.innerHTML = ''; }

  function refresh() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs || !tabs.length) return;
      const tab = tabs[0];
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        pStatus.textContent = '不支持此页面';
        pTotal.textContent = pModified.textContent = pMode.textContent = '-';
        showError('请在普通网页（http/https）中使用此扩展。');
        [btnToggle, btnExport, btnClear].forEach(b => b.disabled = true);
        return;
      }
      clearError();
      pStatus.textContent = '已连接';
      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] }, function() {
        chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' }, function(resp) {
          if (chrome.runtime.lastError || !resp) {
            pTotal.textContent = '0'; pModified.textContent = '0'; pMode.textContent = '关闭';
            return;
          }
          pTotal.textContent = resp.total;
          pModified.textContent = resp.modified;
          pMode.textContent = resp.isSelecting ? '开启中' : '关闭';
          btnToggle.textContent = resp.isSelecting ? '停止选择 (Esc)' : '开始选择元素';
          btnToggle.classList.toggle('active', !!resp.isSelecting);
        });
      });
    });
  }

  function sendMsg(type, cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs || !tabs.length) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: type }, function(resp) {
        if (cb) cb(resp);
        setTimeout(refresh, 100);
      });
    });
  }

  btnToggle.addEventListener('click', function() { sendMsg('TOGGLE_SELECT'); });
  btnExport.addEventListener('click', function() { sendMsg('EXPORT_NOW'); });
  btnClear.addEventListener('click', function() {
    if (confirm('确定清除当前页面的所有标记？')) sendMsg('CLEAR_ALL');
  });

  refresh();
  setInterval(refresh, 2000);
})();