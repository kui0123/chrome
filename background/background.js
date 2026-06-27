// 扩展图标点击：发送消息切换唤醒按钮/工具栏状态
chrome.action.onClicked.addListener(function(tab) {
  if (!tab || !tab.id) return;
  try {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_WAKE' }, function(resp) {
      if (chrome.runtime.lastError) {
        // content script 尚未注入，先注入它
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] }, function() {
          chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_WAKE' });
        });
      }
    });
  } catch(e) { console.error('Action click failed:', e); }
});

// 快捷键命令：三态切换
chrome.commands.onCommand.addListener(function(command) {
  if (command !== 'toggle-three-state') return;
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) return;
    try {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_WAKE' }, function(resp) {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] }, function() {
            chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_WAKE' });
          });
        }
      });
    } catch(e) { console.error('Command failed:', e); }
  });
});

// 安装时创建右键菜单
chrome.runtime.onInstalled.addListener(function() {
  try {
    chrome.contextMenus.removeAll(function() {
      chrome.contextMenus.create({
        id: 'html-diff-marker-toggle',
        title: '🎯 开始/停止 选择组件',
        contexts: ['all']
      });
      chrome.contextMenus.create({
        id: 'html-diff-marker-export',
        title: '📄 生成 Diff 文件',
        contexts: ['all']
      });
      chrome.contextMenus.create({
        id: 'html-diff-marker-separator',
        type: 'separator',
        contexts: ['all']
      });
      chrome.contextMenus.create({
        id: 'html-diff-marker-clear',
        title: '🗑️ 清除所有标记',
        contexts: ['all']
      });
    });
  } catch(e) { console.error('Context menu create failed:', e); }
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (!tab) return;
  try {
    if (info.menuItemId === 'html-diff-marker-toggle') {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SELECT' });
    } else if (info.menuItemId === 'html-diff-marker-export') {
      chrome.tabs.sendMessage(tab.id, { type: 'EXPORT_NOW' });
    } else if (info.menuItemId === 'html-diff-marker-clear') {
      chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_ALL' });
    }
  } catch(e) { console.error('Context menu click failed:', e); }
});

// 处理来自 content script 的 Diff 导出请求
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (!msg) return;
  if (msg.type === 'EXPORT_DIFF') {
    try {
      const payload = msg.payload || {};
      const timestamp = payload.timestamp || new Date().toISOString();
      const safeTs = timestamp.replace(/[:.]/g, '-');
      const mdText = buildMarkdown(payload);
      const jsonText = JSON.stringify(payload, null, 2);
      const mdBlob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
      const mdUrl = URL.createObjectURL(mdBlob);
      const mdFilename = 'html-diff-' + safeTs + '.md';
      chrome.downloads.download({ url: mdUrl, filename: mdFilename, saveAs: true }, function(downloadId) {
        const jsonBlob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        chrome.downloads.download({ url: jsonUrl, filename: 'html-diff-' + safeTs + '.json', saveAs: false });
        setTimeout(function() {
          try { URL.revokeObjectURL(mdUrl); URL.revokeObjectURL(jsonUrl); } catch(e) {}
        }, 5000);
      });
      sendResponse({ ok: true, filename: mdFilename });
    } catch(err) {
      console.error('Export failed:', err);
      sendResponse({ ok: false, error: String(err) });
    }
    return true;
  }
});

function buildMarkdown(d) {
  const items = d.items || [];
  let out = '# HTML Diff Report\n\n';
  out += '- **页面**: [' + (d.title || '') + '](' + (d.url || '') + ')\n';
  out += '- **生成时间**: ' + (d.timestamp || '') + '\n';
  out += '- **标记组件数**: ' + (d.totalMarked || 0) + '\n';
  out += '- **包含修改的组件**: ' + (d.totalModified || 0) + '\n\n';
  out += '---\n\n';
  out += '## 给 AI Agent 的指令\n\n';
  out += '请根据以下每个组件的 "原始 HTML" 和 "修改后的 HTML"，分析代码差异并理解设计意图，然后对项目中相应组件进行同样风格的代码修改。保持组件的可维护性和一致性。\n\n';
  out += '---\n\n';
  items.forEach(function(item) {
    out += '## ' + (item.tag ? item.tag + ' - ' : '') + '组件 #' + item.index + '\n\n';
    out += '- **元素**: ' + (item.element || '') + '\n';
    out += '- **CSS 选择器**: `' + (item.selector || '') + '`\n';
    out += '- **状态**: ' + (item.hasChange ? '**已修改**' : '仅标记，无修改') + '\n';
    if (item.note) out += '- **组件标签**: ' + item.note + '\n';
    if (item.description) out += '- **修改说明（给 AI Agent 看）**: ' + item.description + '\n';
    out += '\n';
    if (item.hasChange) {
      out += '### 原始 HTML\n\n```html\n' + (item.originalHTML || '') + '\n```\n\n';
      out += '### 修改后的 HTML\n\n```html\n' + (item.modifiedHTML || '') + '\n```\n\n';
      out += '### Diff\n\n```diff\n' + lineDiff(item.originalHTML, item.modifiedHTML) + '\n```\n\n';
    } else {
      out += '### 原始 HTML\n\n```html\n' + (item.originalHTML || '') + '\n```\n\n';
    }
    out += '---\n\n';
  });
  out += '## 完整 JSON 数据\n\n';
  out += '```json\n' + JSON.stringify(d, null, 2) + '\n```\n';
  return out;
}

function lineDiff(a, b) {
  const aa = (a || '').split('\n');
  const bb = (b || '').split('\n');
  const m = aa.length, n = bb.length;
  const dp = [];
  for (let i = 0; i <= m; i++) dp.push(new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = aa[i-1] === bb[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  const out = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aa[i-1] === bb[j-1]) { out.push(' ' + aa[i-1]); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { out.push('+' + bb[j-1]); j--; }
    else { out.push('-' + aa[i-1]); i--; }
  }
  return out.reverse().join('\n');
}
