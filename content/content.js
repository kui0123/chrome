// ============================================================
// HTML Diff Marker - Content Script
// ============================================================
(function() {
  'use strict';

  // ================ 常量与状态 ================
  const STATE_KEY = 'htmlDiffMarker_' + location.href;
  const POS_KEY = 'htmlDiffMarkerPos_' + location.href;
  const FONT_OPTIONS = [
    { value: '', label: '(默认字体)' },
    { value: '', label: '── 中文字体 ──', disabled: true },
    { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: '微软雅黑 - 经典商务' },
    { value: '"PingFang SC", "苹方", sans-serif', label: '苹方 - 现代简约' },
    { value: '"Source Han Sans CN", "思源黑体", sans-serif', label: '思源黑体 - 开源专业' },
    { value: '"SimSun", "宋体", serif', label: '宋体 - 传统正式' },
    { value: '"SimHei", "黑体", sans-serif', label: '黑体 - 醒目有力' },
    { value: '"KaiTi", "楷体", serif', label: '楷体 - 优雅手写' },
    { value: '"YouYuan", "幼圆", sans-serif', label: '幼圆 - 圆润亲和' },
    { value: '"STXihei", "华文细黑", sans-serif', label: '华文细黑 - 精致细腻' },
    { value: '"LiSu", "隶书", serif', label: '隶书 - 古典韵味' },
    { value: '"FZShuTi", "方正舒体", cursive', label: '方正舒体 - 艺术风格' },
    { value: '', label: '── 英文字体 ──', disabled: true },
    { value: 'Arial, sans-serif', label: 'Arial - 经典商务' },
    { value: 'Helvetica, sans-serif', label: 'Helvetica - 现代极简' },
    { value: 'Georgia, serif', label: 'Georgia - 优雅衬线' },
    { value: 'Roboto, sans-serif', label: 'Roboto - Material 设计' },
    { value: 'Inter, sans-serif', label: 'Inter - 屏幕优化' }
  ];

  const FONT_WEIGHT_OPTIONS = [
    { value: '', label: '(默认)' },
    { value: '300', label: '300 - 细体 (Light)' },
    { value: '400', label: '400 - 常规 (Normal)' },
    { value: '500', label: '500 - 中等 (Medium)' },
    { value: '600', label: '600 - 半粗 (Semibold)' },
    { value: '700', label: '700 - 粗体 (Bold)' },
    { value: '800', label: '800 - 特粗 (ExtraBold)' }
  ];

  const STYLE_PROPS = [
    { key: 'backgroundColor', type: 'color', label: '背景颜色' },
    { key: 'color', type: 'color', label: '文本颜色' },
    { key: 'fontFamily', type: 'select', options: FONT_OPTIONS, label: '字体' },
    { key: 'fontWeight', type: 'select', options: FONT_WEIGHT_OPTIONS, label: '字体粗细' },
    { key: 'fontSize', type: 'text', label: '字体大小 (如 14px)' },
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
    toolbarEl: null, inspectorEl: null, currentEditId: null,
    isVisualEditing: false, wakeBtn: null,
    inspectorPos: null, inspectorSize: null,
    domChanges: [],
    multiSelectedEls: [],
    multiSelectToolbar: null
  };

  // ================ 工具函数 ================
  function uid() { return 'm_' + Math.random().toString(36).slice(2, 10); }
  function cssProp(k) { return k.replace(/([A-Z])/g, '-$1').toLowerCase(); }
  function escapeHtml(s) { if (!s) return ''; return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ---------- HSL 颜色衍生算法 ----------
  function hexToHsl(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToHex(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    function toHex(x) {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  // 基于主色衍生全套主题色（带黑白边界保护）
  function deriveColors(primaryHex) {
    try {
      const hsl = hexToHsl(primaryHex);
      let { h, s, l } = hsl;

      // 边界保护：饱和度下限 20%，亮度范围 15%-75%
      s = Math.max(20, Math.min(s, 100));
      l = Math.max(15, Math.min(l, 75));

      // 浅色版本：亮度 +20%，饱和度 -10%
      const lightL = Math.min(85, l + 20);
      const lightS = Math.max(15, s - 10);
      const light = hslToHex(h, lightS, lightL);

      // 深色版本：亮度 -15%，饱和度 +5%
      const darkL = Math.max(10, l - 15);
      const darkS = Math.min(95, s + 5);
      const dark = hslToHex(h, darkS, darkL);

      // 渐变：从浅色到主色
      const gradient = 'linear-gradient(135deg, ' + light + ' 0%, ' + primaryHex + ' 100%)';

      // 柔和背景色：亮度极高（88%-92%），饱和度低
      const softBgL = Math.min(95, l + 50);
      const softBgS = Math.max(10, s - 30);
      const softBg = hslToHex(h, softBgS, softBgL);

      // 柔和文字色：主色降饱和提亮
      const softTextL = Math.min(70, l + 15);
      const softTextS = Math.max(25, s - 20);
      const softText = hslToHex(h, softTextS, softTextL);

      // 计数文字色：使用主色
      const countText = primaryHex;

      return {
        primary: primaryHex,
        light: light,
        dark: dark,
        gradient: gradient,
        softBg: softBg,
        softText: softText,
        countText: countText
      };
    } catch (e) {
      // 兜底：返回默认暮紫
      return {
        primary: '#70649A',
        light: '#8B7FB3',
        dark: '#5A4F7D',
        gradient: 'linear-gradient(135deg, #8B7FB3 0%, #70649A 100%)',
        softBg: '#F0EEF7',
        softText: '#70649A',
        countText: '#70649A'
      };
    }
  }

  // 判断 hex 颜色是否有效
  function isValidHex(hex) {
    return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  }

  // ================ 状态持久化 ================
  function saveState() {
    try {
      const markedElements = state.markedElements.map(m => ({
        id: m.id, selector: m.selector, tag: m.tag || '',
        note: m.note || '', description: m.description || '',
        originalHTML: m.originalHTML, modifiedHTML: m.modifiedHTML || null,
        modifiedStyles: m.modifiedStyles || {},
        originalHref: m.originalHref !== undefined ? m.originalHref : undefined,
        modifiedHref: m.modifiedHref !== undefined ? m.modifiedHref : undefined,
        type: m.type || 'element',
        children: m.children || undefined
      }));
      const data = { markedElements: markedElements, domChanges: state.domChanges || [] };
      sessionStorage.setItem(STATE_KEY, JSON.stringify(data));
    } catch(e) {}
  }
  function loadState() {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.markedElements = parsed;
        state.domChanges = [];
      } else {
        state.markedElements = parsed.markedElements || [];
        state.domChanges = parsed.domChanges || [];
      }
    } catch(e) {}
  }
  // ================ 工具函数（续） ================
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
    const clone = el.cloneNode(true);
    stripMarkerChildren(clone);
    clone.classList.remove('html-diff-marker-selected', 'html-diff-marker-modified', 'html-diff-marker-highlight-hover', 'html-diff-marker-visual-edit');
    return clone.outerHTML;
  }

  // ================ 样式管理 ================
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

  // ---------- 滑块组件 ----------
  function createSlider(opts) {
    const { label, value, min, max, step, unit, onChange } = opts;
    const wrap = document.createElement('div');
    wrap.className = 'html-diff-marker-slider-wrap';

    const header = document.createElement('div');
    header.className = 'html-diff-marker-slider-header';

    const labelEl = document.createElement('span');
    labelEl.className = 'html-diff-marker-slider-label';
    labelEl.textContent = label;
    header.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.className = 'html-diff-marker-slider-value';
    valueEl.textContent = value + (unit || '');
    header.appendChild(valueEl);

    wrap.appendChild(header);

    const trackWrap = document.createElement('div');
    trackWrap.className = 'html-diff-marker-slider-track-wrap';

    const track = document.createElement('div');
    track.className = 'html-diff-marker-slider-track';

    const fill = document.createElement('div');
    fill.className = 'html-diff-marker-slider-fill';

    const thumb = document.createElement('div');
    thumb.className = 'html-diff-marker-slider-thumb';

    track.appendChild(fill);
    track.appendChild(thumb);
    trackWrap.appendChild(track);
    wrap.appendChild(trackWrap);

    // 计算百分比
    const range = max - min;
    const pct = ((value - min) / range) * 100;
    fill.style.width = pct + '%';
    thumb.style.left = pct + '%';

    let dragging = false;

    function updateFromEvent(e) {
      const rect = track.getBoundingClientRect();
      let pct = (e.clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      let val = min + pct * range;
      val = Math.round(val / step) * step;
      val = Math.max(min, Math.min(max, val));
      fill.style.width = (pct * 100) + '%';
      thumb.style.left = (pct * 100) + '%';
      valueEl.textContent = val + (unit || '');
      if (onChange) onChange(val);
    }

    thumb.addEventListener('mousedown', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (e.button !== 0) return;
      dragging = true;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    }, true);

    track.addEventListener('mousedown', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (e.button !== 0) return;
      dragging = true;
      updateFromEvent(e);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    }, true);

    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      e.preventDefault(); e.stopPropagation();
      updateFromEvent(e);
    }, true);

    document.addEventListener('mouseup', function() {
      if (dragging) {
        dragging = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    }, true);

    // 双击数值编辑
    valueEl.addEventListener('dblclick', function(e) {
      e.preventDefault(); e.stopPropagation();
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'html-diff-marker-slider-value-input';
      input.value = value;
      valueEl.textContent = '';
      valueEl.appendChild(input);
      valueEl.classList.add('html-diff-marker-editing');
      input.focus();
      input.select();

      function finish(save) {
        if (save) {
          let newVal = parseFloat(input.value);
          if (!isNaN(newVal)) {
            newVal = Math.max(min, Math.min(max, newVal));
            newVal = Math.round(newVal / step) * step;
            const pct = ((newVal - min) / range) * 100;
            fill.style.width = pct + '%';
            thumb.style.left = pct + '%';
            valueEl.textContent = newVal + (unit || '');
            if (onChange) onChange(newVal);
          } else {
            valueEl.textContent = value + (unit || '');
          }
        } else {
          valueEl.textContent = value + (unit || '');
        }
        valueEl.classList.remove('html-diff-marker-editing');
      }

      input.addEventListener('blur', function() { finish(true); }, true);
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      }, true);
    }, true);

    return wrap;
  }

  // ================ 选择模式 ================
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
    if (e.shiftKey) {
      toggleMultiSelect(el);
    } else {
      clearMultiSelect();
      markElement(el);
    }
  }
  function onKey(e) {
    if (e.key === 'Escape' && state.isSelecting) {
      clearMultiSelect();
      stopSelecting();
    }
  }

  function isInMultiSelect(el) {
    return state.multiSelectedEls.indexOf(el) >= 0;
  }
  function toggleMultiSelect(el) {
    if (!el) return;
    const idx = state.multiSelectedEls.indexOf(el);
    if (idx >= 0) {
      state.multiSelectedEls.splice(idx, 1);
      el.classList.remove('html-diff-marker-multi-selected');
    } else {
      state.multiSelectedEls.push(el);
      el.classList.add('html-diff-marker-multi-selected');
    }
    updateMultiSelectToolbar();
  }
  function clearMultiSelect() {
    state.multiSelectedEls.forEach(el => {
      if (el && el.classList) el.classList.remove('html-diff-marker-multi-selected');
    });
    state.multiSelectedEls = [];
    updateMultiSelectToolbar();
  }

  function createGroupMark() {
    if (state.multiSelectedEls.length < 2) {
      alert('请至少选择 2 个元素来创建组合标记');
      return;
    }
    const childEntries = [];
    state.multiSelectedEls.forEach(el => {
      const selector = buildSelector(el);
      const childEntry = {
        id: uid(), selector: selector, tag: el.tagName.toLowerCase(),
        note: elementInfo(el),
        originalHTML: getOuterHTML(el), modifiedHTML: null,
        originalStyles: null, modifiedStyles: {},
        originalHref: el.tagName === 'A' ? el.getAttribute('href') : undefined,
        modifiedHref: undefined,
        type: 'element',
        _el: el
      };
      childEntries.push(childEntry);
      state.markedElements.push(childEntry);
    });
    const groupEntry = {
      id: 'g_' + Math.random().toString(36).slice(2, 10),
      type: 'group',
      children: childEntries.map(e => e.id),
      note: '组合标记（' + childEntries.length + ' 个元素）',
      description: '',
      groupScale: 1,
      groupOffset: { left: 0, top: 0 },
      _groupEl: null
    };
    state.markedElements.push(groupEntry);
    childEntries.forEach(entry => { recordOriginalStyles(entry); applyMarkVisual(entry); });
    applyGroupMarkVisual(groupEntry);
    clearMultiSelect();
    stopSelecting();
    saveState();
    openGroupInspector(groupEntry.id);
  }
  function getMultiSelectBounds() {
    if (state.multiSelectedEls.length === 0) return null;
    let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
    state.multiSelectedEls.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.left < minLeft) minLeft = r.left;
      if (r.top < minTop) minTop = r.top;
      if (r.right > maxRight) maxRight = r.right;
      if (r.bottom > maxBottom) maxBottom = r.bottom;
    });
    return { left: minLeft + window.scrollX, top: minTop + window.scrollY,
             width: maxRight - minLeft, height: maxBottom - minBottom };
  }
  function updateMultiSelectToolbar() {
    if (!state.multiSelectToolbar) {
      const bar = document.createElement('div');
      bar.className = 'html-diff-marker-multi-toolbar';
      const markBtn = document.createElement('button');
      markBtn.className = 'html-diff-marker-btn-success';
      markBtn.style.cssText = 'font-size:12px; padding:4px 10px; margin-right:6px;';
      markBtn.textContent = '✓ 组合标记';
      markBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        createGroupMark();
      }, true);
      bar.appendChild(markBtn);
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'html-diff-marker-btn-secondary';
      cancelBtn.style.cssText = 'font-size:12px; padding:4px 10px;';
      cancelBtn.textContent = '取消选择';
      cancelBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        clearMultiSelect();
      }, true);
      bar.appendChild(cancelBtn);
      const countLabel = document.createElement('span');
      countLabel.className = 'html-diff-marker-multi-count';
      countLabel.style.cssText = 'margin-left:8px; font-size:11px; color:#666;';
      bar.appendChild(countLabel);
      bar._countLabel = countLabel;
      document.body.appendChild(bar);
      state.multiSelectToolbar = bar;
    }
    const bar = state.multiSelectToolbar;
    if (state.multiSelectedEls.length === 0) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';
    bar._countLabel.textContent = '已选 ' + state.multiSelectedEls.length + ' 个元素';
    const bounds = getMultiSelectBounds();
    if (bounds) {
      bar.style.position = 'absolute';
      bar.style.left = (bounds.left + bounds.width / 2 - 100) + 'px';
      bar.style.top = (bounds.top - 36) + 'px';
      bar.style.zIndex = '2147483645';
    }
  }

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
    clearMultiSelect();
    document.removeEventListener('mouseover', onHover, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    if (state.toolbarEl) updateToolbarCounts();
  }

  // ================ 标记管理 ================
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

  // ---------- 视觉标记（applyMarkVisual） ----------
  function applyMarkVisual(entry) {
    const el = entry._el || document.querySelector(entry.selector);
    if (!el) return;
    entry._el = el;
    recordOriginalStyles(entry);

    // 清除旧的标记装饰
    stripMarkerChildren(el);
    entry._dragEnabled = false;
    entry._resizeEnabled = false;
    entry._wheelEnabled = false;
    entry._textEditEnabled = false;
    entry._hrefClickEnabled = false;

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

    // 非链接元素的跳转链接功能（始终注册事件，在 handler 内判断是否有链接）
    if (el.tagName !== 'A' && !entry._hrefClickEnabled) {
      entry._hrefClickEnabled = true;
      el.addEventListener('click', function(e) {
        if (state.isVisualEditing || state.isSelecting) return;
        const t = e.target;
        if (t && t.classList && (t.classList.contains('html-diff-marker-badge') || t.classList.contains('html-diff-marker-resize-handle') || t.classList.contains('html-diff-marker-remove-badge'))) return;
        if (!entry.modifiedHref || entry.modifiedHref === '') return;
        e.preventDefault(); e.stopPropagation();
        window.open(entry.modifiedHref, '_blank');
      }, true);
    }
    // 根据是否有跳转链接设置光标样式
    if (el.tagName !== 'A') {
      el.style.cursor = (entry.modifiedHref && entry.modifiedHref !== '') ? 'pointer' : '';
    }
  }

  // ---------- 组合标记 ----------
  function getGroupChildren(groupEntry) {
    if (!groupEntry || !groupEntry.children) return [];
    return groupEntry.children
      .map(id => state.markedElements.find(m => m.id === id))
      .filter(Boolean);
  }
  function getGroupBounds(groupEntry) {
    const children = getGroupChildren(groupEntry);
    if (children.length === 0) return null;
    let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
    children.forEach(child => {
      const el = child._el || document.querySelector(child.selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const s = child._scale || 1;
      const offLeft = parseFloat(child.modifiedStyles && child.modifiedStyles.left) || 0;
      const offTop = parseFloat(child.modifiedStyles && child.modifiedStyles.top) || 0;
      const left = r.left + window.scrollX + offLeft;
      const top = r.top + window.scrollY + offTop;
      const w = r.width;
      const h = r.height;
      if (left < minLeft) minLeft = left;
      if (top < minTop) minTop = top;
      if (left + w > maxRight) maxRight = left + w;
      if (top + h > maxBottom) maxBottom = top + h;
    });
    if (minLeft === Infinity) return null;
    return { left: minLeft, top: minTop, width: maxRight - minLeft, height: maxBottom - minTop };
  }
  function applyGroupMarkVisual(groupEntry) {
    const children = getGroupChildren(groupEntry);
    if (children.length === 0) return;
    const bounds = getGroupBounds(groupEntry);
    if (!bounds) return;

    let groupEl = groupEntry._groupEl;
    if (groupEl) groupEl.remove();
    groupEl = document.createElement('div');
    groupEl.className = 'html-diff-marker-group-wrap';
    groupEl.style.position = 'absolute';
    groupEl.style.left = bounds.left + 'px';
    groupEl.style.top = bounds.top + 'px';
    groupEl.style.width = bounds.width + 'px';
    groupEl.style.height = bounds.height + 'px';
    groupEl.style.pointerEvents = 'none';
    groupEl.style.zIndex = '2147483644';
    groupEl.style.transformOrigin = 'top left';
    if (groupEntry.groupScale && groupEntry.groupScale !== 1) {
      groupEl.style.transform = 'scale(' + groupEntry.groupScale + ')';
    }
    document.body.appendChild(groupEl);
    groupEntry._groupEl = groupEl;

    const outline = document.createElement('div');
    outline.className = 'html-diff-marker-group-outline';
    outline.style.cssText = 'position:absolute; inset:0; outline:2px solid #8b5cf6; outline-offset:2px; border-radius:2px; pointer-events:none;';
    groupEl.appendChild(outline);

    const badge = document.createElement('div');
    badge.className = 'html-diff-marker-badge html-diff-marker-group-badge';
    badge.style.cssText = 'position:absolute; top:-12px; right:-12px; background:#8b5cf6; color:white; font-size:11px; font-weight:700; padding:3px 8px; border-radius:12px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; box-shadow:0 2px 4px rgba(0,0,0,0.3); cursor:pointer; user-select:none; min-width:18px; text-align:center; line-height:1.2; pointer-events:auto;';
    const idx = state.markedElements.filter(m => m.type !== 'group').indexOf(children[0]) + 1;
    badge.textContent = 'G' + idx + '+' + children.length;
    badge.title = '组合标记（' + children.length + ' 个元素）- 点击编辑';
    badge.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      openGroupInspector(groupEntry.id);
    }, true);
    groupEl.appendChild(badge);

    const handles = [
      { pos: 'nw', cursor: 'nwse-resize', style: 'top:-5px; left:-5px;' },
      { pos: 'n', cursor: 'ns-resize', style: 'top:-5px; left:50%; transform:translateX(-50%);' },
      { pos: 'ne', cursor: 'nesw-resize', style: 'top:-5px; right:-5px;' },
      { pos: 'w', cursor: 'ew-resize', style: 'top:50%; left:-5px; transform:translateY(-50%);' },
      { pos: 'e', cursor: 'ew-resize', style: 'top:50%; right:-5px; transform:translateY(-50%);' },
      { pos: 'sw', cursor: 'nesw-resize', style: 'bottom:-5px; left:-5px;' },
      { pos: 's', cursor: 'ns-resize', style: 'bottom:-5px; left:50%; transform:translateX(-50%);' },
      { pos: 'se', cursor: 'nwse-resize', style: 'bottom:-5px; right:-5px;' }
    ];
    handles.forEach(h => {
      const handle = document.createElement('div');
      handle.className = 'html-diff-marker-resize-handle html-diff-marker-group-handle';
      handle.style.cssText = 'position:absolute; width:10px; height:10px; background:white; border:2px solid #8b5cf6; border-radius:50%; cursor:' + h.cursor + '; pointer-events:auto; box-shadow:0 1px 3px rgba(0,0,0,0.3); ' + h.style;
      handle.setAttribute('data-pos', h.pos);
      handle.addEventListener('mousedown', function(e) {
        e.preventDefault(); e.stopPropagation();
        startGroupResize(groupEntry, h.pos, e);
      }, true);
      groupEl.appendChild(handle);
    });

    groupEl.addEventListener('mousedown', function(e) {
      if (e.target.classList.contains('html-diff-marker-resize-handle')) return;
      if (e.target.classList.contains('html-diff-marker-badge')) return;
      e.preventDefault(); e.stopPropagation();
      startGroupDrag(groupEntry, e);
    }, true);

    groupEl.addEventListener('wheel', function(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault(); e.stopPropagation();
      const factor = e.deltaY > 0 ? 0.98 : 1.02;
      let newScale = (groupEntry.groupScale || 1) * factor;
      newScale = Math.max(0.1, Math.min(10, newScale));
      groupEntry.groupScale = newScale;
      groupEl.style.transform = 'scale(' + newScale + ')';
      saveState();
    }, true);
  }

  function startGroupDrag(groupEntry, e) {
    const children = getGroupChildren(groupEntry);
    if (children.length === 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startOffsets = children.map(child => ({
      id: child.id,
      left: parseFloat(child.modifiedStyles && child.modifiedStyles.left) || 0,
      top: parseFloat(child.modifiedStyles && child.modifiedStyles.top) || 0
    }));
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'move';

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      startOffsets.forEach(so => {
        const child = state.markedElements.find(m => m.id === so.id);
        if (!child) return;
        const newLeft = (so.left + dx) + 'px';
        const newTop = (so.top + dy) + 'px';
        applyStyleChange(child, 'left', newLeft);
        applyStyleChange(child, 'top', newTop);
      });
      applyGroupMarkVisual(groupEntry);
    }
    function onUp() {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      saveState();
    }
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
  }

  function startGroupResize(groupEntry, pos, e) {
    const children = getGroupChildren(groupEntry);
    if (children.length === 0) return;
    const groupEl = groupEntry._groupEl;
    if (!groupEl) return;
    const bounds = getGroupBounds(groupEntry);
    if (!bounds) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startScale = groupEntry.groupScale || 1;
    const startW = bounds.width;
    const startH = bounds.height;
    const startChildInfos = children.map(child => {
      const el = child._el || document.querySelector(child.selector);
      const r = el ? el.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      const offLeft = parseFloat(child.modifiedStyles && child.modifiedStyles.left) || 0;
      const offTop = parseFloat(child.modifiedStyles && child.modifiedStyles.top) || 0;
      return {
        id: child.id,
        relLeft: (r.left + window.scrollX + offLeft - bounds.left) / bounds.width,
        relTop: (r.top + window.scrollY + offTop - bounds.top) / bounds.height,
        relWidth: r.width / bounds.width,
        relHeight: r.height / bounds.height
      };
    });
    document.body.style.userSelect = 'none';
    document.body.style.cursor = e.target.style.cursor || 'nwse-resize';

    function onMove(ev) {
      let dx = ev.clientX - startX;
      let dy = ev.clientY - startY;
      let scaleX = 1, scaleY = 1;
      if (pos.indexOf('e') >= 0) scaleX = (startW + dx) / startW;
      if (pos.indexOf('w') >= 0) scaleX = (startW - dx) / startW;
      if (pos.indexOf('s') >= 0) scaleY = (startH + dy) / startH;
      if (pos.indexOf('n') >= 0) scaleY = (startH - dy) / startH;
      if (pos === 'n' || pos === 's') scaleX = scaleY;
      if (pos === 'w' || pos === 'e') scaleY = scaleX;
      let newScale = startScale * ((scaleX + scaleY) / 2);
      newScale = Math.max(0.1, Math.min(10, newScale));
      groupEntry.groupScale = newScale;
      groupEl.style.transform = 'scale(' + newScale + ')';
    }
    function onUp() {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      saveState();
    }
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
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
      if (el.contentEditable === 'true') return;
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
    // 确保 _scale 已初始化（可能从持久化恢复或复制元素而来）
    if (entry._scale === undefined) {
      if (entry.modifiedStyles && entry.modifiedStyles.transform) {
        const match = entry.modifiedStyles.transform.match(/scale\(([\d.]+)\)/);
        entry._scale = match ? parseFloat(match[1]) : 1;
      } else {
        const cs = window.getComputedStyle(el);
        const t = cs.transform;
        if (t && t !== 'none') {
          const m = t.match(/matrix\(([^)]+)\)/);
          if (m) {
            const parts = m[1].split(',').map(s => parseFloat(s.trim()));
            entry._scale = parts.length >= 1 ? parts[0] : 1;
          } else { entry._scale = 1; }
        } else { entry._scale = 1; }
      }
    }
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
        if (e.button !== 0) return;
        if (el.contentEditable === 'true') return;
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX; const startY = e.clientY;
        // 如果有 transform: scale，先将缩放效果吸收到真实样式中，再重置 scale
        const scale = entry._scale || 1;
        if (scale !== 1) {
          const beforeRect = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          const boxSizing = cs.boxSizing || 'content-box';
          // 需要按比例缩放的尺寸属性（camelCase）
          const sizeProps = [
            'fontSize',
            'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
            'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
            'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'
          ];
          function scaleElementStyles(targetEl) {
            const targetCs = window.getComputedStyle(targetEl);
            sizeProps.forEach(function(prop) {
              const val = targetCs[prop];
              if (!val || !val.endsWith('px')) return;
              const num = parseFloat(val);
              if (isNaN(num) || num === 0) return;
              const newVal = (num * scale) + 'px';
              targetEl.style[prop] = newVal;
            });
          }
          scaleElementStyles(el);
          if (entry.modifiedStyles) {
            entry.modifiedStyles.fontSize = el.style.fontSize;
            entry.modifiedStyles.paddingTop = el.style.paddingTop;
            entry.modifiedStyles.paddingRight = el.style.paddingRight;
            entry.modifiedStyles.paddingBottom = el.style.paddingBottom;
            entry.modifiedStyles.paddingLeft = el.style.paddingLeft;
            entry.modifiedStyles.marginTop = el.style.marginTop;
            entry.modifiedStyles.marginRight = el.style.marginRight;
            entry.modifiedStyles.marginBottom = el.style.marginBottom;
            entry.modifiedStyles.marginLeft = el.style.marginLeft;
            entry.modifiedStyles.borderTopWidth = el.style.borderTopWidth;
            entry.modifiedStyles.borderRightWidth = el.style.borderRightWidth;
            entry.modifiedStyles.borderBottomWidth = el.style.borderBottomWidth;
            entry.modifiedStyles.borderLeftWidth = el.style.borderLeftWidth;
            entry.modifiedStyles.borderTopLeftRadius = el.style.borderTopLeftRadius;
            entry.modifiedStyles.borderTopRightRadius = el.style.borderTopRightRadius;
            entry.modifiedStyles.borderBottomRightRadius = el.style.borderBottomRightRadius;
            entry.modifiedStyles.borderBottomLeftRadius = el.style.borderBottomLeftRadius;
          }
          // 设置宽高（考虑 box-sizing）
          if (boxSizing === 'border-box') {
            el.style.width = beforeRect.width + 'px';
            el.style.height = beforeRect.height + 'px';
          } else {
            const pl = parseFloat(el.style.paddingLeft) || 0;
            const pr = parseFloat(el.style.paddingRight) || 0;
            const pt = parseFloat(el.style.paddingTop) || 0;
            const pb = parseFloat(el.style.paddingBottom) || 0;
            const bl = parseFloat(el.style.borderLeftWidth) || 0;
            const br = parseFloat(el.style.borderRightWidth) || 0;
            const bt = parseFloat(el.style.borderTopWidth) || 0;
            const bb = parseFloat(el.style.borderBottomWidth) || 0;
            el.style.width = Math.max(0, beforeRect.width - pl - pr - bl - br) + 'px';
            el.style.height = Math.max(0, beforeRect.height - pt - pb - bt - bb) + 'px';
          }
          if (entry.modifiedStyles) {
            entry.modifiedStyles.width = el.style.width;
            entry.modifiedStyles.height = el.style.height;
          }
          el.style.transform = '';
          el.style.transformOrigin = '';
          // 调整 left/top 保证视觉位置不变（scale 以 center 为原点，清除后左上角会偏移）
          const afterRect = el.getBoundingClientRect();
          const dx = beforeRect.left - afterRect.left;
          const dy = beforeRect.top - afterRect.top;
          if (dx !== 0 || dy !== 0) {
            const curLeft = parseFloat(el.style.left) || 0;
            const curTop = parseFloat(el.style.top) || 0;
            const newLeft = curLeft + dx;
            const newTop = curTop + dy;
            el.style.left = newLeft + 'px';
            el.style.top = newTop + 'px';
            if (entry.modifiedStyles) {
              entry.modifiedStyles.left = newLeft + 'px';
              entry.modifiedStyles.top = newTop + 'px';
            }
          }
          entry._scale = 1;
          if (entry.modifiedStyles) {
            entry.modifiedStyles.transform = '';
            delete entry.modifiedStyles.transform;
          }
        }
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

  // ---------- 滚轮缩放（使用 transform: scale 实现视觉缩放） ----------
  function enableWheelResize(entry) {
    const el = entry._el;
    if (!el || entry._wheelEnabled) return;
    entry._wheelEnabled = true;

    // 从持久化样式中恢复 scale 值
    if (entry._scale === undefined) {
      if (entry.modifiedStyles && entry.modifiedStyles.transform) {
        const match = entry.modifiedStyles.transform.match(/scale\(([\d.]+)\)/);
        entry._scale = match ? parseFloat(match[1]) : 1;
      } else {
        entry._scale = 1;
      }
    }

    el.addEventListener('wheel', function(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault(); e.stopPropagation();
      const factor = e.deltaY > 0 ? 0.98 : 1.02;
      let newScale = entry._scale * factor;
      newScale = Math.max(0.1, Math.min(10, newScale));
      entry._scale = newScale;
      el.style.transformOrigin = 'center center';
      el.style.transform = 'scale(' + newScale + ')';
      if (!entry.modifiedStyles) entry.modifiedStyles = {};
      entry.modifiedStyles.transform = 'scale(' + newScale + ')';
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
      const clickX = e.clientX;
      const clickY = e.clientY;
      const savedHtml = el.innerHTML;
      stripMarkerChildren(el);
      el.contentEditable = 'true';
      el.style.outline = '2px dashed #3b82f6';
      // 将光标放置在用户双击的精确位置（避免全选文本）
      try {
        let range = null;
        if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(clickX, clickY);
        }
        if (!range && document.caretPositionFromPoint) {
          const pos = document.caretPositionFromPoint(clickX, clickY);
          if (pos && pos.offsetNode) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
          }
        }
        if (range && el.contains(range.startContainer)) {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } else {
          el.focus();
        }
      } catch(err) {
        el.focus();
      }

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
          const newOuter = getOuterHTML(el);
          if (newOuter !== entry.originalHTML) {
            entry.modifiedHTML = newOuter;
            el.classList.add('html-diff-marker-modified');
          }
          saveState();
          if (state.currentEditId === entry.id) openInspector(entry.id);
          entry._dragEnabled = false; entry._resizeEnabled = false;
          entry._wheelEnabled = false; entry._textEditEnabled = false;
          applyMarkVisual(entry);
        } else {
          el.innerHTML = savedHtml;
          entry._dragEnabled = false; entry._resizeEnabled = false;
          entry._wheelEnabled = false; entry._textEditEnabled = false;
          applyMarkVisual(entry);
        }
      }
      document.addEventListener('keydown', onKeyDown, true);
      setTimeout(function() { document.addEventListener('click', onClickOut, true); }, 100);
    }, true);
  }

  // ---------- 删除标记 ----------
  function removeMark(id) {
    const idx = state.markedElements.findIndex(m => m.id === id);
    if (idx < 0) return;
    const entry = state.markedElements[idx];
    if (entry.type === 'group') {
      const childIds = entry.children || [];
      if (entry._groupEl) { entry._groupEl.remove(); entry._groupEl = null; }
      childIds.forEach(cid => {
        const cIdx = state.markedElements.findIndex(m => m.id === cid);
        if (cIdx >= 0) {
          const child = state.markedElements[cIdx];
          const childEl = child._el || document.querySelector(child.selector);
          if (childEl) {
            childEl.classList.remove('html-diff-marker-selected', 'html-diff-marker-modified', 'html-diff-marker-visual-edit');
            if (child.originalStyles) {
              Object.keys(child.modifiedStyles || {}).forEach(prop => {
                childEl.style.removeProperty(cssProp(prop));
              });
            }
            if (child.tag === 'a') {
              if (child.originalHref !== undefined && child.originalHref !== null) childEl.setAttribute('href', child.originalHref);
              else childEl.removeAttribute('href');
            } else {
              childEl.style.cursor = '';
            }
            stripMarkerChildren(childEl);
          }
          state.markedElements.splice(cIdx, 1);
        }
      });
      const gIdx = state.markedElements.findIndex(m => m.id === id);
      if (gIdx >= 0) state.markedElements.splice(gIdx, 1);
    } else {
      const el = entry._el || document.querySelector(entry.selector);
      if (el) {
        el.classList.remove('html-diff-marker-selected', 'html-diff-marker-modified', 'html-diff-marker-visual-edit');
        if (entry.originalStyles) {
          Object.keys(entry.modifiedStyles || {}).forEach(prop => {
            el.style.removeProperty(cssProp(prop));
          });
        }
        if (entry.tag === 'a') {
          if (entry.originalHref !== undefined && entry.originalHref !== null) el.setAttribute('href', entry.originalHref);
          else el.removeAttribute('href');
        } else {
          el.style.cursor = '';
        }
        stripMarkerChildren(el);
      }
      state.markedElements.splice(idx, 1);
    }
    saveState();
    if (state.currentEditId === id) closeInspector();
    updateToolbarCounts();
  }
  function clearAll() {
    if (state.inspectorEl) closeInspector();
    const ids = state.markedElements.map(m => m.id);
    ids.forEach(id => removeMark(id));
    if (state.domChanges && state.domChanges.length > 0) {
      for (let i = state.domChanges.length - 1; i >= 0; i--) {
        const change = state.domChanges[i];
        try {
          if (change.type === 'delete') {
            const container = document.createElement('div');
            container.innerHTML = change.deletedHTML;
            const restoredEl = container.firstElementChild;
            if (restoredEl) {
              let parentEl = null;
              if (change.parentSelector) {
                parentEl = document.querySelector(change.parentSelector);
              }
              if (!parentEl) parentEl = document.body;
              if (change.nextSiblingSelector) {
                const nextSibling = document.querySelector(change.nextSiblingSelector);
                if (nextSibling && nextSibling.parentNode === parentEl) {
                  parentEl.insertBefore(restoredEl, nextSibling);
                } else {
                  parentEl.appendChild(restoredEl);
                }
              } else {
                parentEl.appendChild(restoredEl);
              }
            }
          } else if (change.type === 'duplicate') {
            const target = document.querySelector(change.targetSelector);
            if (target && target.parentNode && target.nextElementSibling) {
              target.parentNode.removeChild(target.nextElementSibling);
            }
          } else if (change.type === 'add') {
            if (change.afterSelector) {
              const ref = document.querySelector(change.afterSelector);
              if (ref && ref.parentNode && ref.nextElementSibling) {
                ref.parentNode.removeChild(ref.nextElementSibling);
              }
            } else if (document.body.lastElementChild) {
              document.body.removeChild(document.body.lastElementChild);
            }
          }
        } catch(e) {
          console.warn('clearAll undo error:', change.type, e);
        }
      }
    }
    state.domChanges = [];
    sessionStorage.removeItem(STATE_KEY);
    updateToolbarCounts();
  }

  // ---------- 元素操作（复制、添加、删除） ----------
  function getCurrentEntry() {
    if (state.currentEditId) {
      return state.markedElements.find(m => m.id === state.currentEditId);
    }
    return null;
  }

  function duplicateSelectedElement() {
    const entry = getCurrentEntry();
    if (!entry || !entry._el) {
      alert('请先在编辑面板中选择一个组件');
      return;
    }
    const el = entry._el;
    try {
      const clone = el.cloneNode(true);
      clone.classList.remove('html-diff-marker-selected', 'html-diff-marker-modified', 'html-diff-marker-highlight-hover', 'html-diff-marker-visual-edit');
      stripMarkerChildren(clone);
      if (entry.modifiedStyles) {
        Object.keys(entry.modifiedStyles).forEach(prop => {
          clone.style.removeProperty(cssProp(prop));
        });
      }
      clone.style.left = '';
      clone.style.top = '';
      if (el.parentNode) {
        el.parentNode.insertBefore(clone, el.nextSibling);
      } else {
        document.body.appendChild(clone);
      }
      const cloneHTML = clone.outerHTML;
      const targetSelector = buildSelector(el);
      const newEntry = {
        id: uid(), selector: buildSelector(clone), tag: clone.tagName.toLowerCase(),
        note: (entry.note || '') + '（复制）',
        description: entry.description || '',
        originalHTML: getOuterHTML(clone), modifiedHTML: entry.modifiedHTML ? getOuterHTML(clone) : null,
        originalStyles: null,
        modifiedStyles: entry.modifiedStyles ? JSON.parse(JSON.stringify(entry.modifiedStyles)) : {},
        originalHref: entry.originalHref !== undefined ? (clone.tagName === 'A' ? clone.getAttribute('href') : undefined) : undefined,
        modifiedHref: entry.modifiedHref,
        _el: clone
      };
      if (newEntry.modifiedStyles) {
        delete newEntry.modifiedStyles.left;
        delete newEntry.modifiedStyles.top;
      }
      state.markedElements.push(newEntry);
      state.domChanges.push({ type: 'duplicate', targetSelector: targetSelector, cloneHTML: cloneHTML });
      applyMarkVisual(newEntry);
      saveState();
      updateToolbarCounts();
      alert('已复制该组件，新组件已标记');
    } catch(e) {
      alert('复制失败：' + e.message);
    }
  }

  function addNewElement() {
    const html = prompt('请输入要插入的 HTML 代码（如 <div class="card">新卡片</div>）：', '<div>新组件</div>');
    if (!html) return;
    try {
      const container = document.createElement('div');
      container.innerHTML = html;
      const newEl = container.firstElementChild;
      if (!newEl) { alert('请输入有效的 HTML 代码'); return; }
      const referenceEntry = getCurrentEntry();
      const refEl = referenceEntry && referenceEntry._el ? referenceEntry._el : null;
      let afterSelector = null;
      if (refEl && refEl.parentNode) {
        afterSelector = buildSelector(refEl);
        refEl.parentNode.insertBefore(newEl, refEl.nextSibling);
      } else {
        document.body.appendChild(newEl);
      }
      const entry = {
        id: uid(), selector: buildSelector(newEl), tag: newEl.tagName.toLowerCase(),
        note: '新添加的组件',
        description: '',
        originalHTML: getOuterHTML(newEl), modifiedHTML: null,
        originalStyles: null, modifiedStyles: {},
        originalHref: newEl.tagName === 'A' ? newEl.getAttribute('href') : undefined,
        modifiedHref: undefined,
        _el: newEl
      };
      state.markedElements.push(entry);
      state.domChanges.push({ type: 'add', html: html, afterSelector: afterSelector });
      applyMarkVisual(entry);
      saveState();
      if (!state.toolbarEl) renderToolbar(); else updateToolbarCounts();
      openInspector(entry.id);
    } catch(e) {
      alert('添加失败：' + e.message);
    }
  }

  function deleteSelectedElement() {
    const entry = getCurrentEntry();
    if (!entry || !entry._el) {
      alert('请先在编辑面板中选择一个组件');
      return;
    }
    if (!confirm('确定删除此组件及其 DOM 元素吗？（删除后不可恢复）')) return;
    const el = entry._el;
    const selector = entry.selector;
    const id = entry.id;
    stripMarkerChildren(el);
    const deletedHTML = el.outerHTML;
    const parentSelector = el.parentNode ? buildSelector(el.parentNode) : null;
    const nextSiblingSelector = el.nextSibling && el.nextSibling.nodeType === 1 ? buildSelector(el.nextSibling) : null;
    state.markedElements = state.markedElements.filter(m => m.id !== id);
    state.domChanges.push({ type: 'delete', selector: selector, deletedHTML: deletedHTML, parentSelector: parentSelector, nextSiblingSelector: nextSiblingSelector });
    if (el && el.parentNode) el.parentNode.removeChild(el);
    if (state.currentEditId === id) closeInspector();
    saveState();
    updateToolbarCounts();
  }

  function replayDomChanges() {
    if (!state.domChanges || state.domChanges.length === 0) return;
    for (let i = 0; i < state.domChanges.length; i++) {
      const change = state.domChanges[i];
      try {
        if (change.type === 'delete') {
          const el = document.querySelector(change.selector);
          if (el && el.parentNode) el.parentNode.removeChild(el);
        } else if (change.type === 'duplicate') {
          const target = document.querySelector(change.targetSelector);
          if (target && target.parentNode) {
            const container = document.createElement('div');
            container.innerHTML = change.cloneHTML;
            const clone = container.firstElementChild;
            if (clone) {
              target.parentNode.insertBefore(clone, target.nextSibling);
            }
          }
        } else if (change.type === 'add') {
          const container = document.createElement('div');
          container.innerHTML = change.html;
          const newEl = container.firstElementChild;
          if (newEl) {
            if (change.afterSelector) {
              const ref = document.querySelector(change.afterSelector);
              if (ref && ref.parentNode) {
                ref.parentNode.insertBefore(newEl, ref.nextSibling);
              } else {
                document.body.appendChild(newEl);
              }
            } else {
              document.body.appendChild(newEl);
            }
          }
        }
      } catch(e) {
        console.warn('replayDomChanges error:', change.type, e);
      }
    }
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

  // ================ 主题管理器 ================
  const THEME_KEY = 'htmlDiffMarker_theme';
  const PRESET_THEMES = [
    { id: 'dusk-purple', name: '柔雾紫', color: '#70649A' },
    { id: 'deep-cyan', name: '深海蓝', color: '#211E55' },
    { id: 'gray-green', name: '墨绿', color: '#6A8372' },
    { id: 'warm-brown', name: '暖棕', color: '#9E7A7A' }
  ];

  let themeManager = {
    currentTheme: 'dusk-purple',
    customColor: null,
    _ready: false,

    // 初始化：从存储中加载主题
    init: function(callback) {
      const self = this;
      // 先尝试从 chrome.storage.local 读取
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([THEME_KEY], function(result) {
            if (result && result[THEME_KEY]) {
              const saved = result[THEME_KEY];
              if (saved.type === 'preset' && saved.themeId) {
                self.applyPreset(saved.themeId);
              } else if (saved.type === 'custom' && saved.color) {
                self.applyCustom(saved.color);
              } else {
                self.applyPreset('dusk-purple');
              }
            } else {
              self.applyPreset('dusk-purple');
            }
            self._ready = true;
            // 同时存一份到 sessionStorage 作为 fallback
            try {
              sessionStorage.setItem(THEME_KEY, JSON.stringify({
                type: saved && saved.type || 'preset',
                themeId: saved && saved.themeId || 'dusk-purple',
                color: saved && saved.color || null
              }));
            } catch (e) {}
            if (callback) callback();
          });
          return;
        }
      } catch (e) {}
      // Fallback：从 sessionStorage 读取
      try {
        const raw = sessionStorage.getItem(THEME_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.type === 'preset' && saved.themeId) {
            self.applyPreset(saved.themeId);
          } else if (saved.type === 'custom' && saved.color) {
            self.applyCustom(saved.color);
          } else {
            self.applyPreset('dusk-purple');
          }
        } else {
          self.applyPreset('dusk-purple');
        }
      } catch (e) {
        self.applyPreset('dusk-purple');
      }
      self._ready = true;
      if (callback) callback();
    },

    // 应用预设主题
    applyPreset: function(themeId) {
      const preset = PRESET_THEMES.find(function(t) { return t.id === themeId; });
      if (!preset) themeId = 'dusk-purple';
      this.currentTheme = themeId;
      this.customColor = null;
      document.body.setAttribute('data-theme', themeId);
      this._saveToStorage({ type: 'preset', themeId: themeId });
    },

    // 应用自定义颜色
    applyCustom: function(hexColor) {
      if (!hexColor || !isValidHex(hexColor)) return false;
      if (!hexColor.startsWith('#')) hexColor = '#' + hexColor;
      hexColor = hexColor.toUpperCase();
      this.currentTheme = 'custom';
      this.customColor = hexColor;
      // 计算衍生色并应用到 body 的 CSS 变量
      const colors = deriveColors(hexColor);
      this._applyCustomColors(colors);
      document.body.setAttribute('data-theme', 'custom');
      this._saveToStorage({ type: 'custom', color: hexColor });
      return true;
    },

    // 应用自定义颜色的 CSS 变量
    _applyCustomColors: function(colors) {
      const style = document.body.style;
      style.setProperty('--hdm-theme-primary', colors.primary);
      style.setProperty('--hdm-theme-primary-light', colors.light);
      style.setProperty('--hdm-theme-primary-dark', colors.dark);
      style.setProperty('--hdm-theme-gradient', colors.gradient);
      style.setProperty('--hdm-theme-soft-bg', colors.softBg);
      style.setProperty('--hdm-theme-soft-text', colors.softText);
      style.setProperty('--hdm-theme-count-text', colors.countText);
    },

    // 保存到存储（chrome.storage.local + sessionStorage fallback）
    _saveToStorage: function(data) {
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          const saveObj = {};
          saveObj[THEME_KEY] = data;
          chrome.storage.local.set(saveObj);
        }
      } catch (e) {}
      try {
        sessionStorage.setItem(THEME_KEY, JSON.stringify(data));
      } catch (e) {}
    },

    // 获取当前主题信息
    getCurrentTheme: function() {
      if (this.currentTheme === 'custom') {
        return { type: 'custom', color: this.customColor };
      }
      return { type: 'preset', themeId: this.currentTheme };
    },

    // 获取所有预设主题
    getPresets: function() {
      return PRESET_THEMES.slice();
    }
  };

  // ---------- 工具栏 ----------
  function updateToolbarCounts() {
    if (!state.toolbarEl) return;
    const elementEntries = state.markedElements.filter(m => m.type !== 'group');
    const countEl = state.toolbarEl.querySelector('.html-diff-marker-count');
    if (countEl) countEl.textContent = elementEntries.length + ' 标记';
    const modifiedEl = state.toolbarEl.querySelector('.html-diff-marker-modified-count');
    if (modifiedEl) modifiedEl.textContent = elementEntries.filter(m => m.modifiedHTML || hasStyleChanges(m)).length + ' 修改';
  }

  function renderToolbar() {
    if (state.toolbarEl) state.toolbarEl.remove();
    const bar = document.createElement('div');
    bar.className = 'html-diff-marker-toolbar';
    // 清除 CSS 默认 top/right，防止与 JS 位置冲突
    bar.style.top = '';
    bar.style.right = '';
    bar.style.left = '';
    bar.style.bottom = '';
    // 标题栏（可拖拽）
    const header = document.createElement('div');
    header.className = 'html-diff-marker-toolbar-header';
    header.innerHTML = '<span style="font-weight:600; font-size:13px;">✎ HTML Diff Marker</span>';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'html-diff-marker-toolbar-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('title', '隐藏工具栏（快捷键 Ctrl+Shift+E）');
    closeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      showWakeOnly();
    }, true);
    header.appendChild(closeBtn);
    bar.appendChild(header);
    // Body 区域
    const body = document.createElement('div');
    body.className = 'html-diff-marker-toolbar-body';
    // 第一行按钮：选择/复制/添加/删除
    const btnRow1 = document.createElement('div');
    btnRow1.style.cssText = 'display:flex; gap:6px; margin-bottom:8px;';
    const buttons1 = [
      { action: 'select', label: '🎯 选择元素', cls: 'html-diff-marker-btn-primary' },
      { action: 'duplicate', label: '📋 复制当前', cls: 'html-diff-marker-btn-secondary' },
      { action: 'add', label: '➕ 添加元素', cls: 'html-diff-marker-btn-secondary' },
      { action: 'delete', label: '🗑 删除当前', cls: 'html-diff-marker-btn-danger' }
    ];
    buttons1.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'html-diff-marker-toolbar-btn ' + b.cls;
      btn.textContent = b.label;
      btn.setAttribute('data-action', b.action);
      btn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        const action = this.getAttribute('data-action');
        if (action === 'select') state.isSelecting ? stopSelecting() : startSelecting();
        else if (action === 'duplicate') duplicateSelectedElement();
        else if (action === 'add') addNewElement();
        else if (action === 'delete') deleteSelectedElement();
      }, true);
      btnRow1.appendChild(btn);
    });
    body.appendChild(btnRow1);
    // 第二行按钮：清空/导出
    const btnRow2 = document.createElement('div');
    btnRow2.style.cssText = 'display:flex; gap:6px; margin-bottom:8px;';
    const buttons2 = [
      { action: 'clear', label: '🗑 清空所有', cls: 'html-diff-marker-btn-secondary' },
      { action: 'export', label: '📄 导出 Diff', cls: 'html-diff-marker-btn-success' }
    ];
    buttons2.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'html-diff-marker-toolbar-btn ' + b.cls;
      btn.textContent = b.label;
      btn.setAttribute('data-action', b.action);
      btn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        const action = this.getAttribute('data-action');
        if (action === 'clear') { if (confirm('确定清除所有标记吗？')) clearAll(); }
        else if (action === 'export') exportDiffMessage();
      }, true);
      btnRow2.appendChild(btn);
    });
    body.appendChild(btnRow2);
    // 计数/提示行
    const infoRow = document.createElement('div');
    infoRow.style.cssText = 'display:flex; justify-content:space-between; font-size:11px; color:rgba(255,255,255,0.7);';
    infoRow.innerHTML = '<span class="html-diff-marker-count">0 标记</span><span class="html-diff-marker-modified-count">0 修改</span><span style="font-size:10px;">快捷键 Ctrl+Shift+E</span>';
    body.appendChild(infoRow);
    bar.appendChild(body);

    document.body.appendChild(bar);
    state.toolbarEl = bar;
    // 恢复位置（先应用保存的位置，确保 JS 样式覆盖 CSS 默认样式）
    let hasSavedPos = false;
    try {
      const pos = JSON.parse(sessionStorage.getItem(POS_KEY) || '{}');
      if (pos && pos.left !== undefined && pos.top !== undefined) {
        bar.style.left = pos.left + 'px';
        bar.style.top = pos.top + 'px';
        bar.style.right = 'auto';
        bar.style.bottom = 'auto';
        hasSavedPos = true;
      }
    } catch(e) {}
    // 如果没有保存的位置，使用默认：右上角（与唤醒按钮一致）
    if (!hasSavedPos) {
      const defaultRight = 20;
      const defaultTop = 20;
      // 使用 left = window.innerWidth - width - right
      setTimeout(function() {
        if (!bar || !bar.parentNode) return;
        const barRect = bar.getBoundingClientRect();
        const leftPos = Math.max(0, window.innerWidth - barRect.width - defaultRight);
        bar.style.left = leftPos + 'px';
        bar.style.top = defaultTop + 'px';
        bar.style.right = 'auto';
        bar.style.bottom = 'auto';
      }, 10);
    }
    makeDraggable(bar, header, function(l, t) {
      try { sessionStorage.setItem(POS_KEY, JSON.stringify({ left: l, top: t })); } catch(e) {}
    });
    updateToolbarCounts();
  }

  function showWakeOnly() {
    if (state.inspectorEl) closeInspector();
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
    if (state.inspectorEl) {
      const rect = state.inspectorEl.getBoundingClientRect();
      if (rect && rect.left > 0 && rect.top > 0) {
        state.inspectorPos = { left: rect.left, top: rect.top };
      }
      state.inspectorEl.remove();
      state.inspectorEl = null;
    }
    state.currentEditId = null;
  }

  function openInspector(id) {
    const savedPos = state.inspectorPos;
    closeInspector();
    const entry = state.markedElements.find(m => m.id === id);
    if (!entry) return;
    recordOriginalStyles(entry);
    state.currentEditId = id;
    const el = entry._el || document.querySelector(entry.selector);
    if (el) entry._el = el;

    const panel = document.createElement('div');
    panel.className = 'html-diff-marker-inspector';

    // 顶部色条（3px）
    const topBar = document.createElement('div');
    topBar.className = 'html-diff-marker-inspector-top-bar';
    topBar.style.cssText = 'height:3px; width:100%; background:var(--hdm-theme-primary); flex-shrink:0;';
    panel.appendChild(topBar);

    // 窗口控制栏（最小化/关闭）
    const windowControls = document.createElement('div');
    windowControls.className = 'html-diff-marker-inspector-controls';
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'html-diff-marker-collapse-btn';
    collapseBtn.innerHTML = '−';
    collapseBtn.setAttribute('title', '最小化');
    collapseBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      panel.classList.toggle('html-diff-marker-collapsed');
      collapseBtn.innerHTML = panel.classList.contains('html-diff-marker-collapsed') ? '+' : '−';
    }, true);
    windowControls.appendChild(collapseBtn);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'html-diff-marker-close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('title', '关闭');
    closeBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); closeInspector(); }, true);
    windowControls.appendChild(closeBtn);
    panel.appendChild(windowControls);

    // Header（标题+选择器）
    const header = document.createElement('div');
    header.className = 'html-diff-marker-inspector-header';
    
    const title = document.createElement('span');
    title.className = 'html-diff-marker-inspector-title';
    title.textContent = '元素编辑';
    header.appendChild(title);
    
    const selectorBadge = document.createElement('span');
    selectorBadge.className = 'html-diff-marker-inspector-selector';
    selectorBadge.textContent = entry.selector;
    header.appendChild(selectorBadge);
    panel.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'html-diff-marker-inspector-body';

    // ===== 用户指定的顺序 =====

    // 1. 组件标签 (noteWrap)
    const noteWrap = document.createElement('div');
    noteWrap.className = 'html-diff-marker-field-row';
    const noteLabel = document.createElement('label');
    noteLabel.textContent = '组件标签';
    noteWrap.appendChild(noteLabel);
    const noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.className = 'html-diff-marker-text-input';
    noteInput.value = entry.note || '';
    noteInput.addEventListener('input', function() { entry.note = this.value; saveState(); });
    noteWrap.appendChild(noteInput);
    body.appendChild(noteWrap);

    // 2. 链接href/跳转链接 (hrefWrap/jumpWrap)
    // 链接 href 编辑（对 <a> 元素显示）
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

    // 跳转链接（对非 <a> 元素显示，点击该元素时跳转）
    if (entry.tag !== 'a') {
      const jumpWrap = document.createElement('div');
      jumpWrap.className = 'html-diff-marker-field-row';
      const jumpLabel = document.createElement('label');
      jumpLabel.textContent = '跳转链接 (点击元素时跳转)';
      jumpWrap.appendChild(jumpLabel);
      const jumpInput = document.createElement('input');
      jumpInput.type = 'text';
      jumpInput.className = 'html-diff-marker-text-input';
      jumpInput.value = entry.modifiedHref || '';
      jumpInput.placeholder = '输入链接地址，如 https://example.com（为空则不跳转）';
      jumpInput.addEventListener('input', function() {
        entry.modifiedHref = this.value;
        el.style.cursor = this.value ? 'pointer' : '';
        if (this.value) el.classList.add('html-diff-marker-modified');
        else if (!hasStyleChanges(entry) && !entry.modifiedHTML) el.classList.remove('html-diff-marker-modified');
        saveState();
      });
      jumpWrap.appendChild(jumpInput);
      body.appendChild(jumpWrap);
    }

    // 3. 图片上传
    if (entry.tag === 'img') {
      const imgSection = document.createElement('div');
      imgSection.className = 'html-diff-marker-style-section';
      const imgHeader = document.createElement('div');
      imgHeader.className = 'html-diff-marker-style-header';
      const imgLabel = document.createElement('label');
      imgLabel.textContent = '🖼️ 图片上传';
      imgHeader.appendChild(imgLabel);
      imgSection.appendChild(imgHeader);

      const imgPreview = document.createElement('div');
      imgPreview.className = 'html-diff-marker-image-preview';
      if (el && el.src) {
        imgPreview.style.backgroundImage = 'url(' + el.src + ')';
      } else {
        imgPreview.classList.add('empty');
        imgPreview.textContent = '暂无图片预览';
      }
      imgSection.appendChild(imgPreview);

      const imgInput = document.createElement('input');
      imgInput.type = 'file';
      imgInput.accept = 'image/*';
      imgInput.style.cssText = 'width:100%; margin-top:8px;';
      imgInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
          const url = ev.target.result;
          if (el) el.src = url;
          entry.modifiedStyles.content = 'url(' + url + ')';
          imgPreview.style.backgroundImage = 'url(' + url + ')';
          imgPreview.classList.remove('empty');
          saveState();
        };
        reader.readAsDataURL(file);
      });
      imgSection.appendChild(imgInput);

      body.appendChild(imgSection);
    }

    // 4. 样式编辑 (styleSection)包含字体、颜色等
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
          const optDisabled = typeof opt === 'object' && opt.disabled;
          o.value = optVal;
          o.textContent = optLabel;
          if (optDisabled) {
            o.disabled = true;
            o.style.color = '#888';
            o.style.fontWeight = '600';
            o.style.background = '#f5f5f5';
          }
          if (val === optVal) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', function() { applyStyleChange(entry, this.getAttribute('data-prop'), this.value); });
        inpWrap.appendChild(sel);

        // 添加自定义字体"+"按钮（针对字体选择）
        if (sp.key === 'fontFamily') {
          const addFontBtn = document.createElement('button');
          addFontBtn.className = 'html-diff-marker-add-font-btn';
          addFontBtn.textContent = '+';
          addFontBtn.setAttribute('title', '添加自定义字体');
          addFontBtn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const customFont = prompt('请输入自定义字体名称（如 "Custom Font, sans-serif"）：');
            if (customFont) {
              applyStyleChange(entry, 'fontFamily', customFont);
              openInspector(entry.id);
            }
          }, true);
          inpWrap.appendChild(addFontBtn);
        }
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

      // 统一重置按钮UI设计，使用最新设计（替换红色的R）
      const resetBtn = document.createElement('button');
      resetBtn.className = 'html-diff-marker-style-reset';
      resetBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
      resetBtn.setAttribute('title', '重置');
      resetBtn.setAttribute('data-prop', sp.key);
      resetBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        applyStyleChange(entry, this.getAttribute('data-prop'), '');
        openInspector(entry.id);
      }, true);
      inpWrap.appendChild(resetBtn);
      row.appendChild(inpWrap);
      styleSection.appendChild(row);

      // 添加字体预览不可用的提示（针对字体选择）
      if (sp.key === 'fontFamily') {
        const fontHint = document.createElement('div');
        fontHint.className = 'html-diff-marker-font-hint';
        fontHint.innerHTML = '<span>⚠️</span><span>字体预览功能暂不可用，所选字体会直接应用到目标元素上。</span>';
        styleSection.appendChild(fontHint);
      }
    });

    const stats = document.createElement('div');
    stats.className = 'html-diff-marker-style-stats';
    stats.textContent = '已修改 ' + Object.keys(entry.modifiedStyles || {}).length + ' 个样式属性';
    styleSection.appendChild(stats);
    body.appendChild(styleSection);

    // 5. 位置调整 (posSection)
    const posSection = document.createElement('div');
    posSection.className = 'html-diff-marker-style-section';
    const posHeader = document.createElement('div');
    posHeader.className = 'html-diff-marker-style-header';
    const posLabel = document.createElement('label');
    posLabel.textContent = '位置调整';
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

    const curLeft = Math.round(parseFloat(entry.modifiedStyles.left || entry.originalStyles.left) || 0);
    const curTop = Math.round(parseFloat(entry.modifiedStyles.top || entry.originalStyles.top) || 0);

    const leftSlider = createSlider({
      label: 'X (左偏移)',
      value: curLeft,
      min: -500,
      max: 500,
      step: 1,
      unit: 'px',
      onChange: function(val) {
        applyStyleChange(entry, 'left', val + 'px');
      }
    });
    posSection.appendChild(leftSlider);

    const topSlider = createSlider({
      label: 'Y (上偏移)',
      value: curTop,
      min: -500,
      max: 500,
      step: 1,
      unit: 'px',
      onChange: function(val) {
        applyStyleChange(entry, 'top', val + 'px');
      }
    });
    posSection.appendChild(topSlider);

    body.appendChild(posSection);

    // 6. 大小调整 (sizeSection)
    const sizeSection = document.createElement('div');
    sizeSection.className = 'html-diff-marker-style-section';
    const sizeHeader = document.createElement('div');
    sizeHeader.className = 'html-diff-marker-style-header';
    const sizeLabel = document.createElement('label');
    sizeLabel.textContent = '大小调整';
    sizeHeader.appendChild(sizeLabel);
    const sizeResetRow = document.createElement('div');
    sizeResetRow.style.cssText = 'display:flex; gap:6px; align-items:center;';
    const unitToggleBtn = document.createElement('button');
    unitToggleBtn.className = 'html-diff-marker-style-reset-all';
    unitToggleBtn.textContent = 'px';
    unitToggleBtn.style.cssText = 'font-size:11px; padding:2px 6px; min-width:auto;';
    unitToggleBtn.setAttribute('title', '切换单位 px / %');
    const sizeReset = document.createElement('button');
    sizeReset.className = 'html-diff-marker-style-reset-all';
    sizeReset.textContent = '↺ 重置';
    sizeReset.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      applyStyleChange(entry, 'width', '');
      applyStyleChange(entry, 'height', '');
      openInspector(entry.id);
    }, true);
    sizeResetRow.appendChild(unitToggleBtn);
    sizeResetRow.appendChild(sizeReset);
    sizeHeader.appendChild(sizeResetRow);
    sizeSection.appendChild(sizeHeader);

    function isPctVal(v) { return typeof v === 'string' && v.indexOf('%') >= 0; }

    const curWidthVal = isPctVal(entry.modifiedStyles.width) 
      ? parseFloat(entry.modifiedStyles.width) 
      : Math.round(parseFloat(entry.modifiedStyles.width || entry.originalStyles.width) || el.getBoundingClientRect().width);
    const curHeightVal = isPctVal(entry.modifiedStyles.height) 
      ? parseFloat(entry.modifiedStyles.height) 
      : Math.round(parseFloat(entry.modifiedStyles.height || entry.originalStyles.height) || el.getBoundingClientRect().height);

    let displayUnitPx = !isPctVal(entry.modifiedStyles.width);
    unitToggleBtn.textContent = displayUnitPx ? 'px' : '%';

    const widthSlider = createSlider({
      label: '宽度',
      value: displayUnitPx ? curWidthVal : curWidthVal,
      min: 0,
      max: displayUnitPx ? 2000 : 200,
      step: displayUnitPx ? 1 : 0.1,
      unit: displayUnitPx ? 'px' : '%',
      onChange: function(val) {
        applyStyleChange(entry, 'width', val + (displayUnitPx ? 'px' : '%'));
      }
    });
    sizeSection.appendChild(widthSlider);

    const heightSlider = createSlider({
      label: '高度',
      value: displayUnitPx ? curHeightVal : curHeightVal,
      min: 0,
      max: displayUnitPx ? 2000 : 200,
      step: displayUnitPx ? 1 : 0.1,
      unit: displayUnitPx ? 'px' : '%',
      onChange: function(val) {
        applyStyleChange(entry, 'height', val + (displayUnitPx ? 'px' : '%'));
      }
    });
    sizeSection.appendChild(heightSlider);

    unitToggleBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      displayUnitPx = !displayUnitPx;
      unitToggleBtn.textContent = displayUnitPx ? 'px' : '%';
      openInspector(entry.id);
    });

    body.appendChild(sizeSection);

    // 7. 修改说明 (descWrap)
    const descWrap = document.createElement('div');
    descWrap.className = 'html-diff-marker-field-row';
    const descHeader = document.createElement('div');
    descHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;';
    const descLabel = document.createElement('label');
    descLabel.textContent = '修改说明（给 AI Agent 看）';
    descHeader.appendChild(descLabel);
    const descPreviewBtn = document.createElement('button');
    descPreviewBtn.className = 'html-diff-marker-style-reset-all';
    descPreviewBtn.style.cssText = 'font-size:11px; padding:2px 6px; min-width:auto;';
    descPreviewBtn.textContent = '预览内容';
    descPreviewBtn.setAttribute('title', '预览修改说明内容');
    descHeader.appendChild(descPreviewBtn);
    descWrap.appendChild(descHeader);
    const descTa = document.createElement('textarea');
    descTa.rows = 3;
    descTa.className = 'html-diff-marker-textarea';
    descTa.placeholder = '请描述这次修改的目的、设计意图或具体变更内容，便于 AI Agent 理解并应用相同风格的修改...\n\n支持 Markdown 链接格式：[链接文字](https://example.com)';
    descTa.value = entry.description || '';
    descTa.addEventListener('input', function() { entry.description = this.value; saveState(); });
    descWrap.appendChild(descTa);
    const descPreview = document.createElement('div');
    descPreview.className = 'html-diff-marker-desc-preview';
    descPreview.style.cssText = 'display:none; margin-top:4px; padding:6px; background:#f8f9fa; border:1px solid #e9ecef; border-radius:4px; font-size:12px; color:#333; word-break:break-all;';
    descWrap.appendChild(descPreview);
    descPreviewBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (descPreview.style.display === 'none') {
        let html = descTa.value || '';
        html = escapeHtml(html);
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" style="color:#007bff; text-decoration:underline;">$1</a>');
        html = html.replace(/\n/g, '<br>');
        descPreview.innerHTML = html;
        descPreview.style.display = 'block';
        descPreviewBtn.textContent = '隐藏预览';
      } else {
        descPreview.style.display = 'none';
        descPreviewBtn.textContent = '预览内容';
      }
    }, true);
    body.appendChild(descWrap);

    // 8. HTML编辑区 (htmlInfo + htmlEdit)
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

    // 9. 元素信息 (infoBox)
    const infoBox = document.createElement('div');
    infoBox.className = 'html-diff-marker-element-info';
    infoBox.textContent = elementInfo(el) + ' | selector: ' + entry.selector;
    body.appendChild(infoBox);

    panel.appendChild(body);

    // 10. 底部操作栏 (footer)
    const footer = document.createElement('div');
    footer.className = 'html-diff-marker-inspector-actions';
    const removeBtn = document.createElement('button');
    removeBtn.className = 'html-diff-marker-btn-danger';
    removeBtn.textContent = '删除';
    removeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (confirm('确定删除此标记吗？')) removeMark(entry.id);
    }, true);
    footer.appendChild(removeBtn);
    const saveBtn = document.createElement('button');
    saveBtn.className = 'html-diff-marker-btn-success';
    saveBtn.textContent = '保存修改';
    saveBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      saveState();
      applyMarkVisual(entry);
      closeInspector();
    }, true);
    footer.appendChild(saveBtn);
    panel.appendChild(footer);

    // 快捷键提示区域（工具栏底部）
    const shortcutBar = document.createElement('div');
    shortcutBar.className = 'html-diff-marker-toolbar-shortcut';
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcutKey = isMac ? '⌥+E' : 'Alt+E';
    shortcutBar.textContent = shortcutKey + ' 切换';
    panel.appendChild(shortcutBar);

    // 右下角拖拽调整大小把手
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'html-diff-marker-resize-handle-se';
    resizeHandle.setAttribute('title', '拖拽调整面板大小');
    let resizing = false, rStartX = 0, rStartY = 0, rStartW = 0, rStartH = 0;
    resizeHandle.addEventListener('mousedown', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (e.button !== 0) return;
      resizing = true;
      rStartX = e.clientX; rStartY = e.clientY;
      const rect = panel.getBoundingClientRect();
      rStartW = rect.width; rStartH = rect.height;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'nwse-resize';
    }, true);
    document.addEventListener('mousemove', function(e) {
      if (!resizing) return;
      e.preventDefault(); e.stopPropagation();
      const newW = Math.max(300, rStartW + (e.clientX - rStartX));
      const newH = Math.max(120, rStartH + (e.clientY - rStartY));
      panel.style.width = newW + 'px';
      panel.style.height = newH + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }, true);
    document.addEventListener('mouseup', function() {
      if (resizing) {
        resizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        const rect = panel.getBoundingClientRect();
        state.inspectorSize = { width: rect.width, height: rect.height };
      }
    }, true);
    panel.appendChild(resizeHandle);

    document.body.appendChild(panel);
    state.inspectorEl = panel;

    // 恢复之前拖拽的位置（先清除 CSS 默认定位）
    if (savedPos && savedPos.left !== undefined && savedPos.top !== undefined) {
      panel.style.position = 'fixed';
      panel.style.left = savedPos.left + 'px';
      panel.style.top = savedPos.top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    } else {
      panel.style.right = '';
      panel.style.bottom = '';
    }

    // 恢复面板大小
    if (state.inspectorSize && state.inspectorSize.width && state.inspectorSize.height) {
      panel.style.width = state.inspectorSize.width + 'px';
      panel.style.height = state.inspectorSize.height + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }

    // 面板可拖拽（拖拽时保存位置到 state.inspectorPos）
    makeDraggable(panel, header, function(l, t) {
      state.inspectorPos = { left: l, top: t };
    });
    // 阻止点击面板冒泡到 document（使用 bubble 阶段，让内部按钮事件先触发）
    panel.addEventListener('click', function(e) { e.stopPropagation(); }, false);
  }

  // ---------- 组合编辑面板 ----------
  function openGroupInspector(groupId) {
    const savedPos = state.inspectorPos;
    closeInspector();
    const groupEntry = state.markedElements.find(m => m.id === groupId);
    if (!groupEntry || groupEntry.type !== 'group') return;
    state.currentEditId = groupId;
    const children = getGroupChildren(groupEntry);

    const panel = document.createElement('div');
    panel.className = 'html-diff-marker-inspector';

    const header = document.createElement('div');
    header.className = 'html-diff-marker-inspector-header';
    const title = document.createElement('span');
    title.textContent = '组合标记（' + children.length + ' 个元素）';
    header.appendChild(title);
    const btnGroup = document.createElement('div');
    btnGroup.className = 'html-diff-marker-header-btns';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'html-diff-marker-close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('title', '关闭');
    closeBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); closeInspector(); }, true);
    btnGroup.appendChild(closeBtn);
    header.appendChild(btnGroup);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'html-diff-marker-inspector-body';

    const groupInfo = document.createElement('div');
    groupInfo.className = 'html-diff-marker-element-info';
    groupInfo.textContent = '共 ' + children.length + ' 个元素 · 缩放比例: ' + Math.round((groupEntry.groupScale || 1) * 100) + '%';
    body.appendChild(groupInfo);

    const noteWrap = document.createElement('div');
    noteWrap.className = 'html-diff-marker-field-row';
    const noteLabel = document.createElement('label');
    noteLabel.textContent = '组合标签';
    noteWrap.appendChild(noteLabel);
    const noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.className = 'html-diff-marker-text-input';
    noteInput.value = groupEntry.note || '';
    noteInput.addEventListener('input', function() { groupEntry.note = this.value; saveState(); });
    noteWrap.appendChild(noteInput);
    body.appendChild(noteWrap);

    const descWrap = document.createElement('div');
    descWrap.className = 'html-diff-marker-field-row';
    const descLabel = document.createElement('label');
    descLabel.textContent = '修改说明（给 AI Agent 看）';
    descWrap.appendChild(descLabel);
    const descTa = document.createElement('textarea');
    descTa.rows = 3;
    descTa.className = 'html-diff-marker-textarea';
    descTa.placeholder = '描述这个组合标记的整体修改意图...';
    descTa.value = groupEntry.description || '';
    descTa.addEventListener('input', function() { groupEntry.description = this.value; saveState(); });
    descWrap.appendChild(descTa);
    body.appendChild(descWrap);

    const scaleSection = document.createElement('div');
    scaleSection.className = 'html-diff-marker-style-section';
    const scaleHeader = document.createElement('div');
    scaleHeader.className = 'html-diff-marker-style-header';
    const scaleLabel = document.createElement('label');
    scaleLabel.textContent = '📐 整体缩放';
    scaleHeader.appendChild(scaleLabel);
    const scaleReset = document.createElement('button');
    scaleReset.className = 'html-diff-marker-style-reset-all';
    scaleReset.textContent = '↺ 重置';
    scaleReset.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      groupEntry.groupScale = 1;
      applyGroupMarkVisual(groupEntry);
      saveState();
      openGroupInspector(groupId);
    }, true);
    scaleHeader.appendChild(scaleReset);
    scaleSection.appendChild(scaleHeader);

    const scaleRow = document.createElement('div');
    scaleRow.className = 'html-diff-marker-style-row';
    const scaleLab = document.createElement('label');
    scaleLab.className = 'html-diff-marker-style-label';
    scaleLab.textContent = '缩放比例';
    scaleRow.appendChild(scaleLab);
    const scaleInpWrap = document.createElement('div');
    scaleInpWrap.className = 'html-diff-marker-style-input-wrap';
    const scaleRange = document.createElement('input');
    scaleRange.type = 'range';
    scaleRange.min = '0.1';
    scaleRange.max = '10';
    scaleRange.step = '0.01';
    scaleRange.value = groupEntry.groupScale || 1;
    scaleRange.style.flex = '1';
    scaleRange.addEventListener('input', function() {
      const v = parseFloat(this.value);
      groupEntry.groupScale = v;
      applyGroupMarkVisual(groupEntry);
      saveState();
      scaleVal.textContent = Math.round(v * 100) + '%';
    });
    scaleInpWrap.appendChild(scaleRange);
    const scaleVal = document.createElement('span');
    scaleVal.style.cssText = 'min-width:48px; text-align:right; font-size:12px; color:#555;';
    scaleVal.textContent = Math.round((groupEntry.groupScale || 1) * 100) + '%';
    scaleInpWrap.appendChild(scaleVal);
    scaleRow.appendChild(scaleInpWrap);
    scaleSection.appendChild(scaleRow);
    body.appendChild(scaleSection);

    const childrenSection = document.createElement('div');
    childrenSection.className = 'html-diff-marker-style-section';
    const childrenHeader = document.createElement('div');
    childrenHeader.className = 'html-diff-marker-style-header';
    const childrenLabel = document.createElement('label');
    childrenLabel.textContent = '📋 子元素列表';
    childrenHeader.appendChild(childrenLabel);
    childrenSection.appendChild(childrenHeader);

    children.forEach((child, idx) => {
      const row = document.createElement('div');
      row.className = 'html-diff-marker-child-row';
      row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border-bottom:1px solid #eee; cursor:pointer; font-size:12px;';
      row.addEventListener('mouseenter', function() { row.style.background = '#f8f9fa'; });
      row.addEventListener('mouseleave', function() { row.style.background = ''; });
      row.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        openInspector(child.id);
      }, true);
      const leftInfo = document.createElement('div');
      leftInfo.style.cssText = 'display:flex; align-items:center; gap:8px;';
      const idxSpan = document.createElement('span');
      idxSpan.style.cssText = 'display:inline-block; width:20px; height:20px; line-height:20px; text-align:center; background:#10b981; color:white; border-radius:10px; font-size:11px; font-weight:700;';
      idxSpan.textContent = idx + 1;
      leftInfo.appendChild(idxSpan);
      const tagSpan = document.createElement('span');
      tagSpan.style.cssText = 'color:#555;';
      tagSpan.textContent = child.tag + (child.selector ? ' · ' + child.selector.split(' > ').slice(-1)[0] : '');
      leftInfo.appendChild(tagSpan);
      row.appendChild(leftInfo);
      const editBtn = document.createElement('button');
      editBtn.className = 'html-diff-marker-style-reset-all';
      editBtn.style.cssText = 'font-size:11px; padding:2px 6px; min-width:auto;';
      editBtn.textContent = '编辑';
      editBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        openInspector(child.id);
      }, true);
      row.appendChild(editBtn);
      childrenSection.appendChild(row);
    });
    body.appendChild(childrenSection);

    panel.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'html-diff-marker-inspector-actions';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'html-diff-marker-btn-danger';
    deleteBtn.textContent = '🗑 删除组合';
    deleteBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (confirm('确定删除此组合标记吗？子元素标记也会一并删除。')) removeGroupMark(groupId);
    }, true);
    footer.appendChild(deleteBtn);
    const ungroupBtn = document.createElement('button');
    ungroupBtn.className = 'html-diff-marker-btn-secondary';
    ungroupBtn.textContent = '🔓 解散组合';
    ungroupBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      ungroupMark(groupId);
    }, true);
    footer.appendChild(ungroupBtn);
    const saveBtn = document.createElement('button');
    saveBtn.className = 'html-diff-marker-btn-success';
    saveBtn.textContent = '✓ 完成';
    saveBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      saveState();
      applyGroupMarkVisual(groupEntry);
      closeInspector();
    }, true);
    footer.appendChild(saveBtn);
    panel.appendChild(footer);

    document.body.appendChild(panel);
    state.inspectorEl = panel;

    if (savedPos && savedPos.left !== undefined && savedPos.top !== undefined) {
      panel.style.position = 'fixed';
      panel.style.left = savedPos.left + 'px';
      panel.style.top = savedPos.top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    } else {
      panel.style.right = '';
      panel.style.bottom = '';
    }
    if (state.inspectorSize && state.inspectorSize.width && state.inspectorSize.height) {
      panel.style.width = state.inspectorSize.width + 'px';
      panel.style.height = state.inspectorSize.height + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }
    makeDraggable(panel, header, function(l, t) {
      state.inspectorPos = { left: l, top: t };
    });
    panel.addEventListener('click', function(e) { e.stopPropagation(); }, false);
  }

  function removeGroupMark(groupId) {
    const groupEntry = state.markedElements.find(m => m.id === groupId);
    if (!groupEntry || groupEntry.type !== 'group') return;
    const childIds = groupEntry.children || [];
    if (groupEntry._groupEl) {
      groupEntry._groupEl.remove();
      groupEntry._groupEl = null;
    }
    childIds.forEach(cid => {
      const idx = state.markedElements.findIndex(m => m.id === cid);
      if (idx >= 0) {
        const child = state.markedElements[idx];
        if (child._el) stripMarkerChildren(child._el);
        state.markedElements.splice(idx, 1);
      }
    });
    const gIdx = state.markedElements.findIndex(m => m.id === groupId);
    if (gIdx >= 0) state.markedElements.splice(gIdx, 1);
    closeInspector();
    saveState();
    updateToolbarCounts();
  }

  function ungroupMark(groupId) {
    const groupEntry = state.markedElements.find(m => m.id === groupId);
    if (!groupEntry || groupEntry.type !== 'group') return;
    if (groupEntry._groupEl) {
      groupEntry._groupEl.remove();
      groupEntry._groupEl = null;
    }
    const gIdx = state.markedElements.findIndex(m => m.id === groupId);
    if (gIdx >= 0) state.markedElements.splice(gIdx, 1);
    closeInspector();
    saveState();
    updateToolbarCounts();
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
    const elementEntries = state.markedElements.filter(m => m.type !== 'group');
    const items = elementEntries.map((m, i) => {
      let html = '';
      if (m._el) {
        // 克隆元素副本后清理标记装饰，不操作原始 DOM，避免页面原有事件监听器丢失
        const clone = m._el.cloneNode(true);
        stripMarkerChildren(clone);
        clone.classList.remove('html-diff-marker-selected', 'html-diff-marker-modified',
          'html-diff-marker-highlight-hover', 'html-diff-marker-visual-edit');
        html = clone.outerHTML;
      }
      const currentOuter = html || m.originalHTML;
      const hasHrefChange = m.modifiedHref !== undefined && m.modifiedHref !== null && m.modifiedHref !== '';
      return {
        index: i + 1, tag: m.tag || '', selector: m.selector,
        element: m._el ? elementInfo(m._el) : '',
        note: m.note || '',
        description: m.description || '',
        originalHTML: m.originalHTML,
        modifiedHTML: m.modifiedHTML || ((hasStyleChanges(m) || hasHrefChange) ? currentOuter : null),
        styleChanges: m.modifiedStyles || {},
        hrefChange: m.tag === 'a' ? { original: m.originalHref, modified: m.modifiedHref } : null,
        hasChange: !!(m.modifiedHTML || hasStyleChanges(m) || hasHrefChange)
      };
    });
    const deletedItems = (state.domChanges || []).filter(c => c.type === 'delete').map((c, i) => {
      let tag = 'unknown';
      try {
        const container = document.createElement('div');
        container.innerHTML = c.deletedHTML || '';
        const el = container.firstElementChild;
        if (el) tag = el.tagName.toLowerCase();
      } catch(e) {}
      return {
        index: i + 1, tag: tag, selector: c.selector,
        element: '',
        note: '已删除的组件',
        description: '',
        originalHTML: c.deletedHTML || '',
        modifiedHTML: null,
        styleChanges: {},
        hrefChange: null,
        hasChange: true,
        deleted: true
      };
    });
    return {
      url: location.href, title: document.title, timestamp: new Date().toISOString(),
      totalMarked: items.length, totalModified: items.filter(i => i.hasChange).length + deletedItems.length, items: items,
      deletedItems: deletedItems
    };
  }

  function formatDiffAsMarkdown(d) {
    let out = '# HTML Diff Report\n\n';
    out += '- **页面**: [' + (d.title || '') + '](' + (d.url || '') + ')\n';
    out += '- **生成时间**: ' + d.timestamp + '\n';
    out += '- **标记组件数**: ' + d.totalMarked + '\n';
    out += '- **包含修改的组件**: ' + d.totalModified + '\n';
    if (d.deletedItems && d.deletedItems.length > 0) {
      out += '- **已删除的组件**: ' + d.deletedItems.length + '\n';
    }
    out += '\n';
    out += '---\n\n';
    out += '## 给 AI Agent 的指令\n\n';
    out += '请根据以下每个组件的 "原始 HTML" 和 "修改后的 HTML/样式"，分析差异并理解设计意图，对项目中相应组件进行同样风格的代码修改。\n\n';
    out += '---\n\n';
    d.items.forEach(item => {
      out += '## ' + (item.tag ? item.tag + ' - ' : '') + '组件 #' + item.index + '\n\n';
      out += '- **元素**: ' + item.element + '\n';
      out += '- **CSS 选择器**: `' + item.selector + '`\n';
      out += '- **状态**: ' + (item.hasChange ? '**已修改**' : '仅标记，无修改') + '\n';
      if (item.note) out += '- **组件标签**: ' + item.note + '\n';
      if (item.description) out += '- **修改说明（给 AI Agent 看）**: ' + item.description + '\n';
      if (item.hrefChange && item.hrefChange.modified !== undefined && item.hrefChange.modified !== item.hrefChange.original) {
        out += '- **href 变更**: `' + (item.hrefChange.original || '(空)') + '` → `' + item.hrefChange.modified + '`\n';
      } else if (item.hrefChange && item.hrefChange.modified !== undefined && item.hrefChange.modified !== '') {
        out += '- **跳转链接**: `' + item.hrefChange.modified + '`\n';
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
    if (d.deletedItems && d.deletedItems.length > 0) {
      out += '## 已删除的组件\n\n';
      out += '以下组件已从 DOM 中删除，请参考原始 HTML 进行相应处理。\n\n';
      out += '---\n\n';
      d.deletedItems.forEach(item => {
        out += '## 🗑 ' + (item.tag ? item.tag + ' - ' : '') + '已删除组件 #' + item.index + '\n\n';
        out += '- **CSS 选择器**: `' + item.selector + '`\n';
        out += '- **状态**: **已删除**\n';
        out += '\n';
        out += '### 被删除的原始 HTML\n\n```html\n' + item.originalHTML + '\n```\n\n';
        out += '---\n\n';
      });
    }
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
      toggleThreeState();
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

  // ---------- 三态切换（快捷键 & 扩展图标） ----------
  function toggleThreeState() {
    if (!state.toolbarEl && !state.wakeBtn) {
      showWakeOnly();
    } else if (state.wakeBtn) {
      state.wakeBtn.remove();
      state.wakeBtn = null;
      renderToolbar();
    } else {
      if (state.toolbarEl) { state.toolbarEl.remove(); state.toolbarEl = null; }
      if (state.inspectorEl) {
        closeInspector();
      }
    }
  }

  // ---------- 初始化 ----------
  function init() {
    if (window.__htmlDiffMarkerLoaded) return;
    window.__htmlDiffMarkerLoaded = true;
    // 先初始化主题（异步加载，带兜底）
    themeManager.init(function() {
      loadState();
      // 先重放 DOM 结构变更（删除/复制/添加）
      replayDomChanges();
      // 恢复标记元素的视觉样式（但不自动显示工具栏）
      state.markedElements.forEach(m => {
        if (m.type === 'group') return;
        const el = document.querySelector(m.selector);
        if (el) { m._el = el; recordOriginalStyles(m); applyMarkVisual(m); }
      });
      state.markedElements.forEach(m => {
        if (m.type !== 'group') return;
        applyGroupMarkVisual(m);
      });
      // 不自动显示工具栏，点击扩展图标 -> 显示唤醒按钮 -> 显示工具栏
      chrome.runtime.onMessage.addListener(onMessage);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
