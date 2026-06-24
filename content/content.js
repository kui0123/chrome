// ============================================================
// HTML Diff Marker - Content Script
// ============================================================
(function() {
  'use strict';
  const STATE_KEY = 'htmlDiffMarker_' + location.href;
  const POS_KEY = 'htmlDiffMarkerPos_' + location.href;
  const STYLE_PROPS = [
    { key: 'backgroundColor', type: 'color', label: '背景颜色' },
    { key: 'color', type: 'color', label: '文本颜色' },
    { key: 'fontSize', type: 'text', label: '字体大小 (如 14px)' },
    { key: 'fontWeight', type: 'text', label: '字体粗细 (400-700)' },
    { key: 'padding', type: 'text', label: '内边距 (如 10px 20px)' },
    { key: 'margin', type: 'text', label: '外边距 (如 5px 10px)' },
    { key: 'borderRadius', type: 'text', label: '圆角 (如 8px)' },
    { key: 'border', type: 'text', label: '边框 (如 1px solid #ccc)' },
    { key: 'display', type: 'select',
      options: [
        { value: '', label: '(默认)' },
        { value: 'block', label: 'block - 块级元素（独占一行）' },
        { value: 'inline-block', label: 'inline-block - 行内块（同行可排）' },
        { value: 'inline', label: 'inline - 行内元素（无宽高）' },
        { value: 'flex', label: 'flex - 弹性布局' },
        { value: 'grid', label: 'grid - 网格布局' },
        { value: 'none', label: 'none - 隐藏元素' }
      ],
      label: '显示方式' }
  ];

  let state = {
    isSelecting: false, hoveredEl: null, markedElements: [],
    addedElements: [],
    toolbarEl: null, inspectorEl: null, currentEditId: null,
    isVisualEditing: false, wakeBtn: null
  };

  function uid() { return 'm_' + Math.random().toString(36).slice(2, 10); }
  function cssProp(k) { return k.replace(/([A-Z])/g, '-$1').toLowerCase(); }
  function escapeHtml(s) { if (!s) return ''; return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function saveState() {
    try {
      const markedData = state.markedElements.map(m => ({
        id: m.id, selector: m.selector, tag: m.tag || '',
        note: m.note || '', originalHTML: m.originalHTML, modifiedHTML: m.modifiedHTML || null,
        modifiedStyles: m.modifiedStyles || {},
        originalHref: m.originalHref !== undefined ? m.originalHref : undefined,
        modifiedHref: m.modifiedHref !== undefined ? m.modifiedHref : undefined,
        isAdded: !!m._isAdded
      }));
      const addedData = state.addedElements.map(a => ({
        id: a.id,
        parentSelector: a.parentSelector,
        nextSiblingSelector: a.nextSiblingSelector || null,
        outerHTML: a.outerHTML,
        originalMarkedId: a.originalMarkedId || null
      }));
      const data = { marked: markedData, added: addedData };
      sessionStorage.setItem(STATE_KEY, JSON.stringify(data));
    } catch(e) {}
  }
  function loadState() {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          state.markedElements = parsed;
          state.addedElements = [];
        } else {
          state.markedElements = parsed.marked || [];
          state.addedElements = parsed.added || [];
        }
      }
    } catch(e) {}
  }
  function buildSelector(el) {
    if (!(el instanceof Element)) return '';
    if (el.id) return '#' + el.id;
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 6) {
      let part = cur.tagName.toLowerCase();
      if (cur.id) { parts.unshift('#' + cur.id); break; }
      if (cur.className && typeof cur.className === 'string') {
        const cls = cur.className.split(/\s+/).filter(c => c && !c.startsWith('html-diff-marker')).slice(0, 2);
        if (cls.length) part += '.' + cls.join('.');
      }
      const parent = cur.parentNode;
      if (parent && parent.children) {
        const sibs = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
        if (sibs.length > 1) { const idx = sibs.indexOf(cur) + 1; part += ':nth-of-type(' + idx + ')'; }
      }
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }
  function elementInfo(el) {
    return el.tagName.toLowerCase() +
      (el.id ? '#' + el.id : '') +
      (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '');
  }
  function stripMarkerChildren(el) {
    if (!el) return;
    el.querySelectorAll('.html-diff-marker-badge, .html-diff-marker-overlay, .html-diff-marker-resize-handle, .html-diff-marker-remove-badge').forEach(b => b.remove());
  }
  function getOuterHTML(el) {
    stripMarkerChildren(el);
    const cls = el.className;
    el.classList.remove('html-diff-marker-selected', 'html-diff-marker-modified', 'html-diff-marker-highlight-hover', 'html-diff-marker-visual-edit');
    const html = el.outerHTML;
    el.className = cls;
    return html;
  }
  function recordOriginalStyles(entry) {
    if (!entry._el || entry.originalStyles) return;
    const cs = window.getComputedStyle(entry._el);
    entry.originalStyles = {
      left: entry._el.style.left || '', top: entry._el.style.top || '',
      width: entry._el.style.width || '', height: entry._el.style.height || '',
      position: entry._el.style.position || '',
      display: cs.display, backgroundColor: cs.backgroundColor, color: cs.color,
      fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      padding: cs.padding, margin: cs.margin,
      borderRadius: cs.borderRadius, border: cs.border
    };
  }
  function hasStyleChanges(entry) {
    if (!entry.modifiedStyles) return false;
    for (const k in entry.modifiedStyles) {
      const v = entry.modifiedStyles[k];
      if (v !== undefined && v !== null && v !== '') return true;
    }
    return false;
  }

  // ---------- 工具栏拖拽 ----------
  function makeDraggable(el, handle, onPos) {
    let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
    handle.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      // 如果点击的是按钮，不触发拖拽（让按钮的 click 事件正常工作）
      const t = e.target;
      if (t && t.tagName === 'BUTTON') return;
      e.preventDefault(); e.stopPropagation();
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = el.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      el.style.left = origX + 'px'; el.style.top = origY + 'px';
      el.style.right = 'auto'; el.style.bottom = 'auto';
      document.body.style.userSelect = 'none';
    }, true);
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      e.preventDefault(); e.stopPropagation();
      const nx = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, origX + (e.clientX - startX)));
      const ny = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, origY + (e.clientY - startY)));
      el.style.left = nx + 'px'; el.style.top = ny + 'px';
      if (onPos) onPos(nx, ny);
    }, true);
    document.addEventListener('mouseup', function() {
      if (dragging) { dragging = false; document.body.style.userSelect = ''; }
    }, true);
  }

  // ---------- 选择模式 ----------
  function onHover(e) {
    if (!state.isSelecting) return;
    if (e.target.closest('.html-diff-marker-toolbar') || e.target.closest('.html-diff-marker-inspector')) return;
    if (state.hoveredEl && state.hoveredEl !== e.target)
      state.hoveredEl.classList.remove('html-diff-marker-highlight-hover');
    state.hoveredEl = e.target;
    e.target.classList.add('html-diff-marker-highlight-hover');
  }
  function onClick(e) {
    if (!state.isSelecting) return;
    if (e.target.closest('.html-diff-marker-toolbar') || e.target.closest('.html-diff-marker-inspector')) return;
    e.preventDefault(); e.stopPropagation();
    const el = e.target;
    el.classList.remove('html-diff-marker-highlight-hover');
    markElement(el);
  }
  function onKey(e) { if (e.key === 'Escape' && state.isSelecting) { stopSelecting(); } }

  function startSelecting() {
    state.isSelecting = true;
    document.body.style.cursor = 'crosshair';
    document.body.classList.add('html-diff-marker-selecting');
    document.addEventListener('mouseover', onHover, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    if (state.wakeBtn) { state.wakeBtn.remove(); state.wakeBtn = null; }
    if (!state.toolbarEl) renderToolbar(); else updateToolbarCounts();
  }
  function stopSelecting() {
    state.isSelecting = false;
    document.body.style.cursor = '';
    document.body.classList.remove('html-diff-marker-selecting');
    if (state.hoveredEl) state.hoveredEl.classList.remove('html-diff-marker-highlight-hover');
    state.hoveredEl = null;
    document.removeEventListener('mouseover', onHover, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    if (state.toolbarEl) updateToolbarCounts();
  }

  // ---------- 标记元素 ----------
  function markElement(el) {
    if (!el || el.closest('.html-diff-marker-toolbar, .html-diff-marker-inspector')) return;
    stopSelecting();
    const selector = buildSelector(el);
    const entry = {
      id: uid(), selector: selector, tag: el.tagName.toLowerCase(),
      note: elementInfo(el),
      originalHTML: getOuterHTML(el), modifiedHTML: null,
      originalStyles: null, modifiedStyles: {},
      originalHref: el.tagName === 'A' ? el.getAttribute('href') : undefined,
      modifiedHref: undefined,
      _el: el
    };
    state.markedElements.push(entry);
    applyMarkVisual(entry);
    saveState();
    if (!state.toolbarEl) renderToolbar(); else updateToolbarCounts();
    // 标记后自动打开编辑面板
    openInspector(entry.id);
  }

  // ---------- 视觉标记 ----------
  function applyMarkVisual(entry) {
    const el = entry._el || document.querySelector(entry.selector);
    if (!el) return;
    entry._el = el;
    recordOriginalStyles(entry);

    // 清除旧的标记装饰
    stripMarkerChildren(el);

    // 添加选中状态样式
    if (entry.modifiedHTML || hasStyleChanges(entry)) {
      el.classList.remove('html-diff-marker-selected');
      el.classList.add('html-diff-marker-modified');
    } else {
      el.classList.remove('html-diff-marker-modified');
      el.classList.add('html-diff-marker-selected');
    }

    // 应用已修改的样式
    Object.keys(entry.modifiedStyles || {}).forEach(prop => {
      el.style.setProperty(cssProp(prop), entry.modifiedStyles[prop]);
    });
    // 应用 href 修改
    if (entry.tag === 'a') {
      if (entry.modifiedHref !== undefined && entry.modifiedHref !== null && entry.modifiedHref !== '') {
        el.setAttribute('href', entry.modifiedHref);
      }
    }

    // 添加编号徽章
    const idx = state.markedElements.indexOf(entry) + 1;
    const badge = document.createElement('div');
    badge.className = 'html-diff-marker-badge' + ((entry.modifiedHTML || hasStyleChanges(entry)) ? ' modified' : '');
    badge.setAttribute('data-entry-id', entry.id);
    badge.textContent = '#' + idx;
    badge.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      openInspector(entry.id);
    }, true);
    el.appendChild(badge);

    // 添加删除角标
    const removeBtn = document.createElement('div');
    removeBtn.className = 'html-diff-marker-remove-badge';
    removeBtn.setAttribute('data-entry-id', entry.id);
    removeBtn.setAttribute('title', '删除此标记');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (confirm('确定删除此标记吗？')) { removeMark(entry.id); }
    }, true);
    el.appendChild(removeBtn);

    // 启用交互功能
    enableElementDrag(entry);
    addResizeHandles(entry);
    enableWheelResize(entry);
    enableTextEdit(entry);

    // 阻止链接元素的默认点击跳转（除非在编辑内容中点击）
    if (el.tagName === 'A') {
      el.addEventListener('click', function(e) {
        if (state.isVisualEditing || state.isSelecting) return;
        const t = e.target;
        // 如果点击的是徽章或把手，让它们自己的 handler 处理
        if (t && t.classList && (t.classList.contains('html-diff-marker-badge') || t.classList.contains('html-diff-marker-resize-handle') || t.classList.contains('html-diff-marker-remove-badge'))) return;
        e.preventDefault(); e.stopPropagation();
      }, true);
    }
  }

  // ---------- 元素拖拽（带位置辅助线） ----------
  function enableElementDrag(entry) {
    const el = entry._el;
    if (!el || entry._dragEnabled) return;
    entry._dragEnabled = true;

    let posDisplay = null; let posGuideLines = [];
    function clearPosInfo() {
      if (posDisplay) { posDisplay.remove(); posDisplay = null; }
      posGuideLines.forEach(gl => gl.remove());
      posGuideLines = [];
    }
    function checkPosAlignment(curLeft, curTop, curW, curH) {
      clearPosInfo();
      const THRESHOLD = 5;
      let matchedX = null, matchedY = null;
      state.markedElements.forEach(other => {
        if (other.id === entry.id) return;
        const otherEl = other._el;
        if (!otherEl) return;
        const oRect = otherEl.getBoundingClientRect();
        if (matchedX === null) {
          if (Math.abs(curLeft - oRect.left) <= THRESHOLD) matchedX = Math.round(oRect.left);
          else if (Math.abs((curLeft + curW) - (oRect.left + oRect.width)) <= THRESHOLD) matchedX = Math.round(oRect.left + oRect.width);
          else if (Math.abs((curLeft + curW / 2) - (oRect.left + oRect.width / 2)) <= THRESHOLD) matchedX = Math.round(oRect.left + oRect.width / 2);
        }
        if (matchedY === null) {
          if (Math.abs(curTop - oRect.top) <= THRESHOLD) matchedY = Math.round(oRect.top);
          else if (Math.abs((curTop + curH) - (oRect.top + oRect.height)) <= THRESHOLD) matchedY = Math.round(oRect.top + oRect.height);
          else if (Math.abs((curTop + curH / 2) - (oRect.top + oRect.height / 2)) <= THRESHOLD) matchedY = Math.round(oRect.top + oRect.height / 2);
        }
      });
      if (matchedX !== null) {
        const v = document.createElement('div');
        v.className = 'html-diff-marker-guide-line html-diff-marker-guide-line-v';
        v.style.left = matchedX + 'px';
        document.body.appendChild(v); posGuideLines.push(v);
      }
      if (matchedY !== null) {
        const h = document.createElement('div');
        h.className = 'html-diff-marker-guide-line html-diff-marker-guide-line-h';
        h.style.top = matchedY + 'px';
        document.body.appendChild(h); posGuideLines.push(h);
      }
      posDisplay = document.createElement('div');
      posDisplay.className = 'html-diff-marker-size-display';
      let text = '位置 X:' + Math.round(curLeft) + ' Y:' + Math.round(curTop);
      if (matchedX !== null) text += ' ↔ 对齐!';
      if (matchedY !== null) text += ' ↕ 对齐!';
      posDisplay.textContent = text;
      posDisplay.style.left = (curLeft + curW / 2 - 100) + 'px';
      posDisplay.style.top = (curTop - 35) + 'px';
      document.body.appendChild(posDisplay);
    }

    el.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      const target = e.target;
      if (target && target.classList) {
        if (target.classList.contains('html-diff-marker-badge')) return;
        if (target.classList.contains('html-diff-marker-resize-handle')) return;
        if (target.classList.contains('html-diff-marker-remove-badge')) return;
      }
      e.preventDefault(); e.stopPropagation();

      const startX = e.clientX; const startY = e.clientY;
      const rect = el.getBoundingClientRect();
      const currentPos = window.getComputedStyle(el).position;
      if (currentPos === 'static') { el.style.position = 'relative'; entry.modifiedStyles.position = 'relative'; }
      const curLeft = parseFloat(el.style.left) || 0;
      const curTop = parseFloat(el.style.top) || 0;

      document.body.style.cursor = 'move'; el.style.userSelect = 'none';

      function onMove(ev) {
        ev.preventDefault(); ev.stopPropagation();
        const dx = ev.clientX - startX; const dy = ev.clientY - startY;
        el.style.left = (curLeft + dx) + 'px';
        el.style.top = (curTop + dy) + 'px';
        const curRect = el.getBoundingClientRect();
        checkPosAlignment(curRect.left, curRect.top, curRect.width, curRect.height);
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove, true);
        document.removeEventListener('mouseup', onUp, true);
        document.body.style.cursor = ''; el.style.userSelect = '';
        clearPosInfo();
        const newLeft = parseFloat(el.style.left) || 0;
        const newTop = parseFloat(el.style.top) || 0;
        if (newLeft !== 0 || entry.modifiedStyles.left) entry.modifiedStyles.left = newLeft + 'px';
        if (newTop !== 0 || entry.modifiedStyles.top) entry.modifiedStyles.top = newTop + 'px';
        saveState();
        el.classList.add('html-diff-marker-modified');
        if (state.currentEditId === entry.id) openInspector(entry.id);
      }
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup', onUp, true);
    }, true);
  }

  // ---------- 大小调整把手（带尺寸和辅助线） ----------
  function addResizeHandles(entry) {
    const el = entry._el;
    if (!el || entry._resizeEnabled) return;
    entry._resizeEnabled = true;
    const currentPos = window.getComputedStyle(el).position;
    if (currentPos === 'static') { el.style.position = 'relative'; entry.modifiedStyles.position = 'relative'; }

    const dirs = [
      { name: 'n', cursor: 'ns-resize', dx: 0, dy: -1, w: 0, h: 1 },
      { name: 's', cursor: 'ns-resize', dx: 0, dy: 1, w: 0, h: 1 },
      { name: 'e', cursor: 'ew-resize', dx: 1, dy: 0, w: 1, h: 0 },
      { name: 'w', cursor: 'ew-resize', dx: -1, dy: 0, w: 1, h: 0 },
      { name: 'ne', cursor: 'nesw-resize', dx: 1, dy: -1, w: 1, h: 1 },
      { name: 'nw', cursor: 'nwse-resize', dx: -1, dy: -1, w: 1, h: 1 },
      { name: 'se', cursor: 'nwse-resize', dx: 1, dy: 1, w: 1, h: 1 },
      { name: 'sw', cursor: 'nesw-resize', dx: -1, dy: 1, w: 1, h: 1 }
    ];

    let sizeDisplay = null; let guideLines = [];
    function clearSizeInfo() {
      if (sizeDisplay) { sizeDisplay.remove(); sizeDisplay = null; }
      guideLines.forEach(gl => gl.remove()); guideLines = [];
    }
    function checkAlignment(curW, curH, rect) {
      clearSizeInfo();
      const THRESHOLD = 5;
      let matchedW = null, matchedH = null;
      state.markedElements.forEach(other => {
        if (other.id === entry.id) return;
        const otherEl = other._el;
        if (!otherEl) return;
        const otherRect = otherEl.getBoundingClientRect();
        if (Math.abs(curW - otherRect.width) <= THRESHOLD) matchedW = Math.round(otherRect.width);
        if (Math.abs(curH - otherRect.height) <= THRESHOLD) matchedH = Math.round(otherRect.height);
      });
      if (matchedW !== null) {
        const v = document.createElement('div');
        v.className = 'html-diff-marker-guide-line html-diff-marker-guide-line-v';
        v.style.left = rect.left + 'px';
        document.body.appendChild(v); guideLines.push(v);
        const v2 = document.createElement('div');
        v2.className = 'html-diff-marker-guide-line html-diff-marker-guide-line-v';
        v2.style.left = (rect.left + curW) + 'px';
        document.body.appendChild(v2); guideLines.push(v2);
      }
      if (matchedH !== null) {
        const h = document.createElement('div');
        h.className = 'html-diff-marker-guide-line html-diff-marker-guide-line-h';
        h.style.top = rect.top + 'px';
        document.body.appendChild(h); guideLines.push(h);
        const h2 = document.createElement('div');
        h2.className = 'html-diff-marker-guide-line html-diff-marker-guide-line-h';
        h2.style.top = (rect.top + curH) + 'px';
        document.body.appendChild(h2); guideLines.push(h2);
      }
      sizeDisplay = document.createElement('div');
      sizeDisplay.className = 'html-diff-marker-size-display';
      let text = Math.round(curW) + ' × ' + Math.round(curH);
      if (matchedW !== null) text += ' ↔ ' + matchedW + ' 对齐!';
      if (matchedH !== null) text += ' ↕ ' + matchedH + ' 对齐!';
      sizeDisplay.textContent = text;
      sizeDisplay.style.left = (rect.left + rect.width / 2 - 100) + 'px';
      sizeDisplay.style.top = (rect.top - 35) + 'px';
      document.body.appendChild(sizeDisplay);
    }

    dirs.forEach(dir => {
      const handle = document.createElement('div');
      handle.className = 'html-diff-marker-resize-handle html-diff-marker-handle-' + dir.name;
      handle.setAttribute('data-entry-id', entry.id);
      handle.addEventListener('mousedown', function(e) {
        e.preventDefault(); e.stopPropagation();
        if (e.button !== 0) return;
        const startX = e.clientX; const startY = e.clientY;
        const startRect = el.getBoundingClientRect();
        const startW = startRect.width; const startH = startRect.height;
        const startLeft = parseFloat(el.style.left) || 0;
        const startTop = parseFloat(el.style.top) || 0;
        document.body.style.cursor = dir.cursor;
        el.style.userSelect = 'none';

        function onMove(ev) {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          let newW = startW, newH = startH, newLeft = startLeft, newTop = startTop;
          if (dir.w) {
            if (dir.dx > 0) newW = Math.max(20, startW + dx);
            else { newW = Math.max(20, startW - dx); newLeft = startLeft + (startW - newW); }
          }
          if (dir.h) {
            if (dir.dy > 0) newH = Math.max(20, startH + dy);
            else { newH = Math.max(20, startH - dy); newTop = startTop + (startH - newH); }
          }
          el.style.width = newW + 'px';
          el.style.height = newH + 'px';
          if (dir.w && dir.dx < 0) el.style.left = newLeft + 'px';
          if (dir.h && dir.dy < 0) el.style.top = newTop + 'px';
          const curRect = el.getBoundingClientRect();
          checkAlignment(newW, newH, curRect);
        }
        function onUp() {
          document.removeEventListener('mousemove', onMove, true);
          document.removeEventListener('mouseup', onUp, true);
          document.body.style.cursor = '';
          el.style.userSelect = '';
          clearSizeInfo();
          const finalW = el.getBoundingClientRect().width;
          const finalH = el.getBoundingClientRect().height;
          const finalLeft = parseFloat(el.style.left) || 0;
          const finalTop = parseFloat(el.style.top) || 0;
          if (finalW !== startW || entry.modifiedStyles.width) entry.modifiedStyles.width = finalW + 'px';
          if (finalH !== startH || entry.modifiedStyles.height) entry.modifiedStyles.height = finalH + 'px';
          if (finalLeft !== 0 || entry.modifiedStyles.left) entry.modifiedStyles.left = finalLeft + 'px';
          if (finalTop !== 0 || entry.modifiedStyles.top) entry.modifiedStyles.top = finalTop + 'px';
          saveState();
          el.classList.add('html-diff-marker-modified');
          if (state.currentEditId === entry.id) openInspector(entry.id);
        }
        document.addEventListener('mousemove', onMove, true);
        document.addEventListener('mouseup', onUp, true);
      }, true);
      el.appendChild(handle);
    });
  }

  // ---------- 滚轮缩放 ----------
  function enableWheelResize(entry) {
    const el = entry._el;
    if (!el || entry._wheelEnabled) return;
    entry._wheelEnabled = true;
    el.addEventListener('wheel', function(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault(); e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const startW = rect.width; const startH = rect.height;
      const scale = e.deltaY > 0 ? 0.95 : 1.05;
      const newW = Math.max(20, startW * scale);
      const newH = Math.max(20, startH * scale);
      const currentPos = window.getComputedStyle(el).position;
      if (currentPos === 'static') { el.style.position = 'relative'; entry.modifiedStyles.position = 'relative'; }
      el.style.width = newW + 'px';
      el.style.height = newH + 'px';
      entry.modifiedStyles.width = newW + 'px';
      entry.modifiedStyles.height = newH + 'px';
      saveState();
      el.classList.add('html-diff-marker-modified');
      if (state.currentEditId === entry.id) openInspector(entry.id);
    }, true);
  }

  // ---------- 文本编辑（双击） ----------
  function enableTextEdit(entry) {
    const el = entry._el;
    if (!el || entry._textEditEnabled) return;
    entry._textEditEnabled = true;
    el.addEventListener('dblclick', function(e) {
      if (state.isSelecting) return;
      const t = e.target;
      if (t && t.classList && (t.classList.contains('html-diff-marker-badge') || t.classList.contains('html-diff-marker-resize-handle') || t.classList.contains('html-diff-marker-remove-badge'))) return;
      e.preventDefault(); e.stopPropagation();
      const savedHtml = el.innerHTML;
      stripMarkerChildren(el);
      const cleanedHtml = el.innerHTML;
      el.contentEditable = 'true';
      el.style.outline = '2px dashed #3b82f6';
      el.focus();
      // 不自动全选文本，用户点击定位光标位置编辑

      function onKeyDown(ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); finishEdit(false); }
        else if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); ev.stopPropagation(); finishEdit(true); }
      }
      function onClickOut(ev) {
        if (!el.contains(ev.target)) finishEdit(true);
      }
      function finishEdit(save) {
        el.contentEditable = 'false';
        el.style.outline = '';
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('click', onClickOut, true);
        if (save) {
          const newHtml = el.innerHTML;
          const newOuter = getOuterHTML(el);
          if (newOuter !== entry.originalHTML) {
            entry.modifiedHTML = newOuter;
            el.classList.add('html-diff-marker-modified');
          }
          saveState();
          if (state.currentEditId === entry.id) openInspector(entry.id);
          // 重新应用标记（恢复徽章）
          entry._dragEnabled = false; entry._resizeEnabled = false;
          entry._wheelEnabled = false; entry._textEditEnabled = false;
          applyMarkVisual(entry);
        } else {
          el.innerHTML = savedHtml;
          // 恢复徽章
          entry._dragEnabled = false; entry._resizeEnabled = false;
          entry._wheelEnabled = false; entry._textEditEnabled = false;
          applyMarkVisual(entry);
        }
      }
      document.addEventListener('keydown', onKeyDown, true);
      setTimeout(function() { document.addEventListener('click', onClickOut, true); }, 100);
    }, true);
  }

  // ---------- 复制元素 ----------
  function duplicateElement(id) {
    const entry = state.markedElements.find(m => m.id === id);
    if (!entry) return null;
    const el = entry._el || document.querySelector(entry.selector);
    if (!el) return null;
    const parent = el.parentNode;
    if (!parent) return null;
    const clone = el.cloneNode(true);
    stripMarkerChildren(clone);
    const nextSibling = el.nextElementSibling;
    if (nextSibling) parent.insertBefore(clone, nextSibling);
    else parent.appendChild(clone);
    const addedId = 'a_' + Math.random().toString(36).slice(2, 10);
    const parentSelector = buildSelector(parent);
    const nextSiblingSelector = nextSibling ? buildSelector(nextSibling) : null;
    const addedEntry = {
      id: addedId,
      parentSelector: parentSelector,
      nextSiblingSelector: nextSiblingSelector,
      outerHTML: clone.outerHTML,
      originalMarkedId: id
    };
    state.addedElements.push(addedEntry);
    const newEntry = {
      id: uid(),
      selector: buildSelector(clone),
      tag: clone.tagName.toLowerCase(),
      note: (entry.note || elementInfo(clone)) + ' (副本)',
      originalHTML: getOuterHTML(clone),
      modifiedHTML: null,
      originalStyles: null,
      modifiedStyles: {},
      originalHref: clone.tagName === 'A' ? clone.getAttribute('href') : undefined,
      modifiedHref: undefined,
      _el: clone,
      _isAdded: true,
      _addedId: addedId
    };
    state.markedElements.push(newEntry);
    applyMarkVisual(newEntry);
    saveState();
    if (!state.toolbarEl) renderToolbar(); else updateToolbarCounts();
    openInspector(newEntry.id);
    return newEntry;
  }

  function rebuildAddedElements() {
    const rebuilt = [];
    state.addedElements.forEach(added => {
      try {
        const parent = document.querySelector(added.parentSelector);
        if (!parent) return;
        const template = document.createElement('template');
        template.innerHTML = added.outerHTML.trim();
        const el = template.content.firstElementChild;
        if (!el) return;
        let nextSibling = null;
        if (added.nextSiblingSelector) {
          nextSibling = parent.querySelector(added.nextSiblingSelector);
        }
        if (nextSibling) parent.insertBefore(el, nextSibling);
        else parent.appendChild(el);
        rebuilt.push({ id: added.id, el: el });
      } catch(e) {}
    });
    return rebuilt;
  }

  // ---------- 删除标记 ----------
  function removeMark(id) {
    const idx = state.markedElements.findIndex(m => m.id === id);
    if (idx < 0) return;
    const entry = state.markedElements[idx];
    const el = entry._el || document.querySelector(entry.selector);
    const isAdded = entry._isAdded;
    const addedId = entry._addedId;
    if (el) {
      if (isAdded) {
        el.remove();
      } else {
        el.classList.remove('html-diff-marker-selected', 'html-diff-marker-modified', 'html-diff-marker-visual-edit');
        if (entry.originalStyles) {
          Object.keys(entry.modifiedStyles || {}).forEach(prop => {
            el.style.removeProperty(cssProp(prop));
          });
        }
        if (entry.tag === 'a') {
          if (entry.originalHref !== undefined && entry.originalHref !== null) el.setAttribute('href', entry.originalHref);
          else el.removeAttribute('href');
        }
        stripMarkerChildren(el);
      }
    }
    if (isAdded && addedId) {
      const aIdx = state.addedElements.findIndex(a => a.id === addedId);
      if (aIdx >= 0) state.addedElements.splice(aIdx, 1);
    }
    state.markedElements.splice(idx, 1);
    saveState();
    if (state.currentEditId === id) closeInspector();
    updateToolbarCounts();
  }
  function clearAll() {
    const ids = state.markedElements.map(m => m.id);
    ids.forEach(id => removeMark(id));
    sessionStorage.removeItem(STATE_KEY);
    updateToolbarCounts();
  }

  // ---------- 样式编辑辅助 ----------
  function applyStyleChange(entry, prop, value) {
    if (value === undefined || value === null || value === '') {
      delete entry.modifiedStyles[prop];
      if (entry._el) entry._el.style.removeProperty(cssProp(prop));
    } else {
      entry.modifiedStyles[prop] = value;
      if (entry._el) entry._el.style.setProperty(cssProp(prop), value);
    }
    if (entry._el) {
      if (hasStyleChanges(entry) || entry.modifiedHTML) entry._el.classList.add('html-diff-marker-modified');
      else entry._el.classList.remove('html-diff-marker-modified');
    }
    saveState();
  }

  // ---------- 工具栏 ----------
  function updateToolbarCounts() {
    if (!state.toolbarEl) return;
    const countEl = state.toolbarEl.querySelector('.html-diff-marker-count');
    if (countEl) countEl.textContent = state.markedElements.length + ' 标记';
    const modifiedEl = state.toolbarEl.querySelector('.html-diff-marker-modified-count');
    if (modifiedEl) modifiedEl.textContent = state.markedElements.filter(m => m.modifiedHTML || hasStyleChanges(m)).length + ' 修改';
  }

  function renderToolbar() {
    if (state.toolbarEl) state.toolbarEl.remove();
    const bar = document.createElement('div');
    bar.className = 'html-diff-marker-toolbar';
    // 标题栏（可拖拽）
    const header = document.createElement('div');
    header.className = 'html-diff-marker-toolbar-header';
    header.innerHTML = '<span style="font-weight:600; font-size:13px;">✎ HTML Diff Marker</span>';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'html-diff-marker-toolbar-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('title', '隐藏工具栏');
    closeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      showWakeOnly();
    }, true);
    header.appendChild(closeBtn);
    bar.appendChild(header);
    // Body 区域
    const body = document.createElement('div');
    body.className = 'html-diff-marker-toolbar-body';
    // 按钮行
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:8px; margin-bottom:8px;';
    const buttons = [
      { action: 'select', label: '选择元素', cls: 'html-diff-marker-btn-primary' },
      { action: 'clear', label: '清空', cls: 'html-diff-marker-btn-secondary' },
      { action: 'export', label: '导出 Diff', cls: 'html-diff-marker-btn-success' }
    ];
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'html-diff-marker-toolbar-btn ' + b.cls;
      btn.textContent = b.label;
      btn.setAttribute('data-action', b.action);
      btn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        const action = this.getAttribute('data-action');
        if (action === 'select') state.isSelecting ? stopSelecting() : startSelecting();
        else if (action === 'clear') { if (confirm('确定清除所有标记吗？')) clearAll(); }
        else if (action === 'export') exportDiffMessage();
      }, true);
      btnRow.appendChild(btn);
    });
    body.appendChild(btnRow);
    // 计数/提示行
    const infoRow = document.createElement('div');
    infoRow.style.cssText = 'display:flex; justify-content:space-between; font-size:11px; color:rgba(255,255,255,0.7);';
    infoRow.innerHTML = '<span class="html-diff-marker-count">0 标记</span><span class="html-diff-marker-modified-count">0 修改</span><span style="font-size:10px;">提示:点击标记元素可编辑</span>';
    body.appendChild(infoRow);
    bar.appendChild(body);

    document.body.appendChild(bar);
    state.toolbarEl = bar;
    makeDraggable(bar, header, function(l, t) {
      try { sessionStorage.setItem(POS_KEY, JSON.stringify({ left: l, top: t })); } catch(e) {}
    });
    // 恢复位置
    try {
      const pos = JSON.parse(sessionStorage.getItem(POS_KEY) || '{}');
      if (pos.left) bar.style.left = pos.left + 'px';
      if (pos.top) bar.style.top = pos.top + 'px';
    } catch(e) {}
    updateToolbarCounts();
  }

  function showWakeOnly() {
    if (state.toolbarEl) { state.toolbarEl.remove(); state.toolbarEl = null; }
    if (state.wakeBtn) return;
    const btn = document.createElement('div');
    btn.className = 'html-diff-marker-wake-btn';
    btn.setAttribute('title', 'HTML Diff Marker - 点击显示工具栏');
    btn.innerHTML = '✎';
    btn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      btn.remove();
      state.wakeBtn = null;
      renderToolbar();
    }, true);
    document.body.appendChild(btn);
    state.wakeBtn = btn;
  }

  // ---------- 编辑面板 ----------
  function closeInspector() {
    if (state.inspectorEl) { state.inspectorEl.remove(); state.inspectorEl = null; }
    state.currentEditId = null;
  }

  function openInspector(id) {
    closeInspector();
    const entry = state.markedElements.find(m => m.id === id);
    if (!entry) return;
    recordOriginalStyles(entry);
    state.currentEditId = id;
    const el = entry._el || document.querySelector(entry.selector);
    if (el) entry._el = el;

    const panel = document.createElement('div');
    panel.className = 'html-diff-marker-inspector';

    // Header
    const header = document.createElement('div');
    header.className = 'html-diff-marker-inspector-header';
    const title = document.createElement('span');
    title.textContent = '编辑组件 #' + (state.markedElements.indexOf(entry) + 1) + ' (' + entry.tag + ')';
    header.appendChild(title);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'html-diff-marker-close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('title', '关闭');
    closeBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); closeInspector(); }, true);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'html-diff-marker-inspector-body';

    // 元素信息
    const infoBox = document.createElement('div');
    infoBox.className = 'html-diff-marker-element-info';
    infoBox.textContent = elementInfo(el) + ' | selector: ' + entry.selector;
    body.appendChild(infoBox);

    // 备注标签
    const noteWrap = document.createElement('div');
    noteWrap.className = 'html-diff-marker-field-row';
    const noteLabel = document.createElement('label');
    noteLabel.textContent = '组件标签 / 备注';
    noteWrap.appendChild(noteLabel);
    const noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.className = 'html-diff-marker-text-input';
    noteInput.value = entry.note || '';
    noteInput.addEventListener('input', function() { entry.note = this.value; saveState(); });
    noteWrap.appendChild(noteInput);
    body.appendChild(noteWrap);

    // 链接 href 编辑（仅对 <a> 元素显示）
    if (entry.tag === 'a') {
      const hrefWrap = document.createElement('div');
      hrefWrap.className = 'html-diff-marker-field-row';
      const hrefLabel = document.createElement('label');
      hrefLabel.textContent = '链接地址 (href)';
      hrefWrap.appendChild(hrefLabel);
      const hrefInput = document.createElement('input');
      hrefInput.type = 'text';
      hrefInput.className = 'html-diff-marker-text-input';
      const curHref = entry.modifiedHref !== undefined && entry.modifiedHref !== null ? entry.modifiedHref : (entry.originalHref || '');
      hrefInput.value = curHref;
      hrefInput.placeholder = '输入链接地址，如 https://example.com';
      hrefInput.addEventListener('input', function() {
        entry.modifiedHref = this.value;
        if (el) el.setAttribute('href', this.value);
        if (this.value) el.classList.add('html-diff-marker-modified');
        saveState();
      });
      hrefWrap.appendChild(hrefInput);
      body.appendChild(hrefWrap);
    }

    // 位置调整
    const posSection = document.createElement('div');
    posSection.className = 'html-diff-marker-style-section';
    const posHeader = document.createElement('div');
    posHeader.className = 'html-diff-marker-style-header';
    const posLabel = document.createElement('label');
    posLabel.textContent = '📍 位置调整';
    posHeader.appendChild(posLabel);
    const posReset = document.createElement('button');
    posReset.className = 'html-diff-marker-style-reset-all';
    posReset.textContent = '↺ 重置';
    posReset.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      applyStyleChange(entry, 'left', '');
      applyStyleChange(entry, 'top', '');
      openInspector(entry.id);
    }, true);
    posHeader.appendChild(posReset);
    posSection.appendChild(posHeader);

    const curLeft = entry.modifiedStyles.left !== undefined ? entry.modifiedStyles.left : (parseFloat(entry.originalStyles.left) || 0) + 'px';
    const curTop = entry.modifiedStyles.top !== undefined ? entry.modifiedStyles.top : (parseFloat(entry.originalStyles.top) || 0) + 'px';

    const posRows = [
      { label: 'X (左偏移)', prop: 'left', val: curLeft, nudges: [-10, -1, 1, 10] },
      { label: 'Y (上偏移)', prop: 'top', val: curTop, nudges: [-10, -1, 1, 10] }
    ];
    posRows.forEach(pr => {
      const row = document.createElement('div');
      row.className = 'html-diff-marker-style-row';
      const lab = document.createElement('label');
      lab.className = 'html-diff-marker-style-label';
      lab.textContent = pr.label;
      row.appendChild(lab);
      const inpWrap = document.createElement('div');
      inpWrap.className = 'html-diff-marker-style-input-wrap';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'html-diff-marker-style-input';
      inp.setAttribute('data-prop', pr.prop);
      inp.value = pr.val;
      inp.addEventListener('input', function() { applyStyleChange(entry, this.getAttribute('data-prop'), this.value); });
      inpWrap.appendChild(inp);
      pr.nudges.forEach(n => {
        const nb = document.createElement('button');
        nb.className = 'html-diff-marker-nudge-btn';
        nb.textContent = (n > 0 ? '+' : '') + n;
        nb.addEventListener('click', function(e) {
          e.preventDefault(); e.stopPropagation();
          let curPx = parseFloat(entry.modifiedStyles[pr.prop] || entry.originalStyles[pr.prop]) || 0;
          const newVal = (curPx + n) + 'px';
          applyStyleChange(entry, pr.prop, newVal);
          openInspector(entry.id);
        }, true);
        inpWrap.appendChild(nb);
      });
      row.appendChild(inpWrap);
      posSection.appendChild(row);
    });
    body.appendChild(posSection);

    // 大小调整
    const sizeSection = document.createElement('div');
    sizeSection.className = 'html-diff-marker-style-section';
    const sizeHeader = document.createElement('div');
    sizeHeader.className = 'html-diff-marker-style-header';
    const sizeLabel = document.createElement('label');
    sizeLabel.textContent = '📐 大小调整';
    sizeHeader.appendChild(sizeLabel);
    const sizeReset = document.createElement('button');
    sizeReset.className = 'html-diff-marker-style-reset-all';
    sizeReset.textContent = '↺ 重置';
    sizeReset.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      applyStyleChange(entry, 'width', '');
      applyStyleChange(entry, 'height', '');
      openInspector(entry.id);
    }, true);
    sizeHeader.appendChild(sizeReset);
    sizeSection.appendChild(sizeHeader);

    const curWidth = entry.modifiedStyles.width !== undefined ? entry.modifiedStyles.width : (parseFloat(entry.originalStyles.width) || el.getBoundingClientRect().width) + 'px';
    const curHeight = entry.modifiedStyles.height !== undefined ? entry.modifiedStyles.height : (parseFloat(entry.originalStyles.height) || el.getBoundingClientRect().height) + 'px';

    const sizeRows = [
      { label: '宽度', prop: 'width', val: curWidth, nudges: [-10, -1, 1, 10] },
      { label: '高度', prop: 'height', val: curHeight, nudges: [-10, -1, 1, 10] }
    ];
    sizeRows.forEach(sr => {
      const row = document.createElement('div');
      row.className = 'html-diff-marker-style-row';
      const lab = document.createElement('label');
      lab.className = 'html-diff-marker-style-label';
      lab.textContent = sr.label;
      row.appendChild(lab);
      const inpWrap = document.createElement('div');
      inpWrap.className = 'html-diff-marker-style-input-wrap';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'html-diff-marker-style-input';
      inp.setAttribute('data-prop', sr.prop);
      inp.value = sr.val;
      inp.addEventListener('input', function() { applyStyleChange(entry, this.getAttribute('data-prop'), this.value); });
      inpWrap.appendChild(inp);
      sr.nudges.forEach(n => {
        const nb = document.createElement('button');
        nb.className = 'html-diff-marker-nudge-btn';
        nb.textContent = (n > 0 ? '+' : '') + n;
        nb.addEventListener('click', function(e) {
          e.preventDefault(); e.stopPropagation();
          let curPx = parseFloat(entry.modifiedStyles[sr.prop]) || parseFloat(sr.val) || 0;
          const newVal = (curPx + n) + 'px';
          applyStyleChange(entry, sr.prop, newVal);
          openInspector(entry.id);
        }, true);
        inpWrap.appendChild(nb);
      });
      row.appendChild(inpWrap);
      sizeSection.appendChild(row);
    });
    body.appendChild(sizeSection);

    // 样式编辑区
    const styleSection = document.createElement('div');
    styleSection.className = 'html-diff-marker-style-section';
    const styleHeader = document.createElement('div');
    styleHeader.className = 'html-diff-marker-style-header';
    const styleLabel = document.createElement('label');
    styleLabel.textContent = '🎨 样式编辑';
    styleHeader.appendChild(styleLabel);
    const styleReset = document.createElement('button');
    styleReset.className = 'html-diff-marker-style-reset-all';
    styleReset.textContent = '↺ 重置全部';
    styleReset.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      Object.keys(entry.modifiedStyles || {}).forEach(prop => {
        if (prop !== 'position' && prop !== 'left' && prop !== 'top' && prop !== 'width' && prop !== 'height')
          applyStyleChange(entry, prop, '');
      });
      openInspector(entry.id);
    }, true);
    styleHeader.appendChild(styleReset);
    styleSection.appendChild(styleHeader);

    const visualProps = STYLE_PROPS;
    visualProps.forEach(sp => {
      const row = document.createElement('div');
      row.className = 'html-diff-marker-style-row';
      const lab = document.createElement('label');
      lab.className = 'html-diff-marker-style-label';
      lab.textContent = sp.label;
      row.appendChild(lab);
      const inpWrap = document.createElement('div');
      inpWrap.className = 'html-diff-marker-style-input-wrap';
      let val = entry.modifiedStyles[sp.key] !== undefined ? entry.modifiedStyles[sp.key] : (entry.originalStyles ? entry.originalStyles[sp.key] : '');
      if (sp.type === 'color') {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'html-diff-marker-style-color';
        colorInput.setAttribute('data-prop', sp.key);
        // 转换为 hex
        function toHex(c) {
          if (!c) return '#000000';
          if (c.startsWith('#')) return c;
          const m = c.match(/\d+/g);
          if (m && m.length >= 3) {
            return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
          }
          return '#000000';
        }
        colorInput.value = toHex(val);
        colorInput.addEventListener('input', function() { applyStyleChange(entry, this.getAttribute('data-prop'), this.value); });
        inpWrap.appendChild(colorInput);
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'html-diff-marker-style-input';
        textInput.setAttribute('data-prop', sp.key);
        textInput.placeholder = sp.placeholder || '';
        textInput.value = val || '';
        textInput.addEventListener('input', function() { applyStyleChange(entry, this.getAttribute('data-prop'), this.value); });
        inpWrap.appendChild(textInput);
      } else if (sp.type === 'select') {
        const sel = document.createElement('select');
        sel.className = 'html-diff-marker-style-input';
        sel.setAttribute('data-prop', sp.key);
        sp.options.forEach(opt => {
          const o = document.createElement('option');
          const optVal = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : (opt || '(默认)');
          o.value = optVal;
          o.textContent = optLabel;
          if (val === optVal) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', function() { applyStyleChange(entry, this.getAttribute('data-prop'), this.value); });
        inpWrap.appendChild(sel);
      } else {
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'html-diff-marker-style-input';
        textInput.setAttribute('data-prop', sp.key);
        textInput.placeholder = sp.placeholder || '';
        textInput.value = val || '';
        textInput.addEventListener('input', function() { applyStyleChange(entry, this.getAttribute('data-prop'), this.value); });
        inpWrap.appendChild(textInput);
      }
      const resetBtn = document.createElement('button');
      resetBtn.className = 'html-diff-marker-style-reset';
      resetBtn.textContent = 'R';
      resetBtn.setAttribute('data-prop', sp.key);
      resetBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        applyStyleChange(entry, this.getAttribute('data-prop'), '');
        openInspector(entry.id);
      }, true);
      inpWrap.appendChild(resetBtn);
      row.appendChild(inpWrap);
      styleSection.appendChild(row);
    });

    const stats = document.createElement('div');
    stats.className = 'html-diff-marker-style-stats';
    stats.textContent = '已修改 ' + Object.keys(entry.modifiedStyles || {}).length + ' 个样式属性';
    styleSection.appendChild(stats);
    body.appendChild(styleSection);

    // HTML 编辑区
    const htmlInfo = document.createElement('div');
    htmlInfo.className = 'html-diff-marker-field-row';
    const htmlLabel1 = document.createElement('label');
    htmlLabel1.textContent = '原始 HTML（参考）';
    htmlInfo.appendChild(htmlLabel1);
    const origTa = document.createElement('textarea');
    origTa.rows = 3;
    origTa.readOnly = true;
    origTa.value = entry.originalHTML;
    htmlInfo.appendChild(origTa);
    body.appendChild(htmlInfo);

    const htmlEdit = document.createElement('div');
    htmlEdit.className = 'html-diff-marker-field-row';
    const htmlLabel2 = document.createElement('label');
    htmlLabel2.textContent = '修改后的 HTML';
    htmlEdit.appendChild(htmlLabel2);
    const modTa = document.createElement('textarea');
    modTa.rows = 3;
    modTa.placeholder = '在此输入修改后的 HTML 代码...';
    modTa.value = entry.modifiedHTML || '';
    modTa.addEventListener('input', function() { entry.modifiedHTML = this.value || null; saveState(); });
    htmlEdit.appendChild(modTa);
    body.appendChild(htmlEdit);

    panel.appendChild(body);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'html-diff-marker-inspector-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'html-diff-marker-btn-primary';
    copyBtn.textContent = '📋 复制';
    copyBtn.setAttribute('title', '复制此元素并插入到它后面');
    copyBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      duplicateElement(entry.id);
    }, true);
    footer.appendChild(copyBtn);
    const removeBtn = document.createElement('button');
    removeBtn.className = 'html-diff-marker-btn-danger';
    removeBtn.textContent = '🗑 删除';
    removeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (confirm('确定删除此标记吗？')) removeMark(entry.id);
    }, true);
    footer.appendChild(removeBtn);
    const saveBtn = document.createElement('button');
    saveBtn.className = 'html-diff-marker-btn-success';
    saveBtn.textContent = '✓ 保存修改';
    saveBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      saveState();
      applyMarkVisual(entry);
      closeInspector();
    }, true);
    footer.appendChild(saveBtn);
    panel.appendChild(footer);

    document.body.appendChild(panel);
    state.inspectorEl = panel;

    // 面板可拖拽
    makeDraggable(panel, header, null);
    // 阻止点击面板冒泡到 document（使用 bubble 阶段，让内部按钮事件先触发）
    panel.addEventListener('click', function(e) { e.stopPropagation(); }, false);
  }

  // ---------- Diff 导出 ----------
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

  function buildDiffData() {
    const items = state.markedElements.map((m, i) => {
      let html = '';
      if (m._el) {
        const old = m._el.innerHTML;
        stripMarkerChildren(m._el);
        html = m._el.outerHTML;
        // 恢复 innerHTML
        m._el.innerHTML = old;
        // 重新添加徽章等（applyMarkVisual）
        m._dragEnabled = false; m._resizeEnabled = false;
        m._wheelEnabled = false; m._textEditEnabled = false;
        applyMarkVisual(m);
      }
      const currentOuter = html || m.originalHTML;
      const hasHrefChange = m.tag === 'a' && m.modifiedHref !== undefined && m.modifiedHref !== null && m.modifiedHref !== m.originalHref;
      return {
        index: i + 1, tag: m.tag || '', selector: m.selector,
        element: m._el ? elementInfo(m._el) : '',
        note: m.note || '',
        originalHTML: m.originalHTML,
        modifiedHTML: m.modifiedHTML || ((hasStyleChanges(m) || hasHrefChange) ? currentOuter : null),
        styleChanges: m.modifiedStyles || {},
        hrefChange: m.tag === 'a' ? { original: m.originalHref, modified: m.modifiedHref } : null,
        hasChange: !!(m.modifiedHTML || hasStyleChanges(m) || hasHrefChange)
      };
    });
    return {
      url: location.href, title: document.title, timestamp: new Date().toISOString(),
      totalMarked: items.length, totalModified: items.filter(i => i.hasChange).length, items: items
    };
  }

  function formatDiffAsMarkdown(d) {
    let out = '# HTML Diff Report\n\n';
    out += '- **页面**: [' + (d.title || '') + '](' + (d.url || '') + ')\n';
    out += '- **生成时间**: ' + d.timestamp + '\n';
    out += '- **标记组件数**: ' + d.totalMarked + '\n';
    out += '- **包含修改的组件**: ' + d.totalModified + '\n\n';
    out += '---\n\n';
    out += '## 给 AI Agent 的指令\n\n';
    out += '请根据以下每个组件的 "原始 HTML" 和 "修改后的 HTML/样式"，分析差异并理解设计意图，对项目中相应组件进行同样风格的代码修改。\n\n';
    out += '---\n\n';
    d.items.forEach(item => {
      out += '## ' + (item.tag ? item.tag + ' - ' : '') + '组件 #' + item.index + '\n\n';
      out += '- **元素**: ' + item.element + '\n';
      out += '- **CSS 选择器**: `' + item.selector + '`\n';
      out += '- **状态**: ' + (item.hasChange ? '**已修改**' : '仅标记，无修改') + '\n';
      if (item.note) out += '- **修改说明**: ' + item.note + '\n';
      if (item.hrefChange && item.hrefChange.modified !== undefined && item.hrefChange.modified !== item.hrefChange.original) {
        out += '- **href 变更**: `' + (item.hrefChange.original || '(空)') + '` → `' + item.hrefChange.modified + '`\n';
      }
      const styleKeys = Object.keys(item.styleChanges || {}).filter(k => item.styleChanges[k]);
      if (styleKeys.length) {
        out += '- **样式变更**:\n';
        styleKeys.forEach(k => out += '  - `' + cssProp(k) + '`: `' + item.styleChanges[k] + '`\n');
      }
      out += '\n';
      if (item.hasChange) {
        out += '### 原始 HTML\n\n```html\n' + item.originalHTML + '\n```\n\n';
        if (item.modifiedHTML && item.modifiedHTML !== item.originalHTML) {
          out += '### 修改后的 HTML\n\n```html\n' + item.modifiedHTML + '\n```\n\n';
          out += '### Diff\n\n```diff\n' + lineDiff(item.originalHTML, item.modifiedHTML) + '\n```\n\n';
        } else {
          out += '_仅有样式变更，HTML 结构未改变_\n\n';
        }
      } else {
        out += '### 原始 HTML\n\n```html\n' + item.originalHTML + '\n```\n\n';
      }
      out += '---\n\n';
    });
    out += '## 完整 JSON 数据\n\n';
    out += '```json\n' + JSON.stringify(d, null, 2) + '\n```\n';
    return out;
  }

  function exportDiffMessage() {
    if (state.markedElements.length === 0) {
      alert('请先选择并标记一些元素。点击工具栏中的 "选择元素" 按钮。');
      return;
    }
    const diffData = buildDiffData();
    try {
      chrome.runtime.sendMessage({ type: 'EXPORT_DIFF', payload: diffData }, function(resp) {
        if (resp && resp.ok) alert('✓ Diff 文件已导出！\n\n共标记 ' + diffData.totalMarked + ' 个组件，' + diffData.totalModified + ' 个有修改。');
        else showTextExport(diffData);
      });
    } catch(err) {
      showTextExport(diffData);
    }
  }

  function showTextExport(diffData) {
    const md = formatDiffAsMarkdown(diffData);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'html-diff-' + Date.now() + '.md'; a.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- 消息监听 ----------
  function onMessage(msg, sender, sendResponse) {
    if (!msg) return;
    if (msg.type === 'TOGGLE_WAKE') {
      // 三态切换：隐藏 -> 唤醒按钮 -> 完整工具栏 -> 隐藏
      if (!state.toolbarEl && !state.wakeBtn) {
        // 隐藏态 -> 显示唤醒按钮
        showWakeOnly();
      } else if (state.wakeBtn) {
        // 唤醒按钮态 -> 显示完整工具栏
        state.wakeBtn.remove();
        state.wakeBtn = null;
        renderToolbar();
      } else {
        // 工具栏态 -> 隐藏
        if (state.toolbarEl) { state.toolbarEl.remove(); state.toolbarEl = null; }
        if (state.inspectorEl) { state.inspectorEl.remove(); state.inspectorEl = null; }
      }
      sendResponse({ ok: true });
      return true;
    }
    if (msg.type === 'TOGGLE_SELECT') state.isSelecting ? stopSelecting() : startSelecting();
    else if (msg.type === 'EXPORT_NOW') exportDiffMessage();
    else if (msg.type === 'CLEAR_ALL') clearAll();
    else if (msg.type === 'GET_STATUS') {
      sendResponse({
        isSelecting: state.isSelecting, total: state.markedElements.length,
        modified: state.markedElements.filter(m => m.modifiedHTML || hasStyleChanges(m)).length
      });
      return true;
    }
    sendResponse({ ok: true });
    return true;
  }

  // ---------- 初始化 ----------
  function init() {
    if (window.__htmlDiffMarkerLoaded) return;
    window.__htmlDiffMarkerLoaded = true;
    loadState();
    // 先重建新增的元素（复制的元素）
    const rebuiltEls = rebuildAddedElements();
    const rebuiltMap = {};
    rebuiltEls.forEach(r => { rebuiltMap[r.id] = r.el; });
    // 恢复标记元素的视觉样式
    state.markedElements.forEach(m => {
      let el = null;
      if (m._isAdded && m._addedId && rebuiltMap[m._addedId]) {
        el = rebuiltMap[m._addedId];
      } else {
        el = document.querySelector(m.selector);
      }
      if (el) { m._el = el; recordOriginalStyles(m); applyMarkVisual(m); }
    });
    // 不自动显示工具栏，点击扩展图标 -> 显示唤醒按钮 -> 显示工具栏
    chrome.runtime.onMessage.addListener(onMessage);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
