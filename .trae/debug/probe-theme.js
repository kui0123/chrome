// Headless probe: what theme does product-roadshow.html actually render on load?
// Uses Chrome's DevTools protocol via --dump-dom is not enough (no computed styles),
// so we inject a JS snippet by loading the page with --headless and evaluating via
// a data: bootstrap is complex; instead we use CDP through a minimal websocket.
// Simpler: use Chrome headless "--screenshot" won't give values. We use node's built-in
// to drive Chrome via remote debugging.

const { spawn } = require('child_process');
const http = require('http');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FILE = 'file:///Users/bytedance/Documents/trae_projects/Mark2AI/dev/pages/product-roadshow.html';
const PORT = 9222;

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

(async () => {
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    FILE
  ], { stdio: 'ignore' });

  // wait for chrome
  await new Promise(r => setTimeout(r, 2500));

  const listRaw = await get('/json');
  const list = JSON.parse(listRaw);
  const page = list.find(t => t.type === 'page');
  const wsUrl = page.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl); // Node v24 global WebSocket
  let id = 0;
  const pending = {};
  function send(method, params) {
    return new Promise((resolve) => {
      const mid = ++id;
      pending[mid] = resolve;
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  }
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending[msg.id]) { pending[msg.id](msg); delete pending[msg.id]; }
  });
  await new Promise(r => ws.addEventListener('open', r, { once: true }));

  await send('Runtime.enable', {});
  await new Promise(r => setTimeout(r, 800));

  const expr = `(function(){
    const cs = getComputedStyle(document.body);
    return JSON.stringify({
      dataTheme: document.body.getAttribute('data-theme'),
      themePrimary: cs.getPropertyValue('--theme-primary').trim(),
      themeGradient: cs.getPropertyValue('--theme-gradient').trim(),
      activeDot: (document.querySelector('.theme-dot.active')||{}).getAttribute ? document.querySelector('.theme-dot.active').getAttribute('data-theme-target') : null,
      activeCard: (function(){ var c=document.querySelector('.hdm-theme-card.active'); if(!c) return null; var n=c.querySelector('.hdm-theme-name'); return n?n.textContent:'?'; })(),
      logoDotBg: getComputedStyle(document.querySelector('.logo-dot')).backgroundImage
    });
  })()`;

  const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  console.log('RESULT:', res.result.result.value);

  ws.close();
  chrome.kill();
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
