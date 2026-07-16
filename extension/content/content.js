// ============================================================
// Mark2AI - Content Script
// ============================================================
(function() {
  'use strict';

  // ================ 常量与状态 ================
  const STATE_KEY = 'htmlDiffMarker_' + location.href;
  const POS_KEY = 'htmlDiffMarkerPos_' + location.href;
  const INSPECTOR_STATE_KEY = 'htmlDiffMarker_inspectorState_' + location.href;
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

  // 自定义字体列表（运行时动态添加）
  let customFonts = [];

  const FONT_WEIGHT_OPTIONS = [
    { value: '', label: '(默认)' },
    { value: '300', label: '300 - 细体 (Light)' },
    { value: '400', label: '400 - 常规 (Normal)' },
    { value: '500', label: '500 - 中等 (Medium)' },
    { value: '600', label: '600 - 半粗 (Semibold)' },
    { value: '700', label: '700 - 粗体 (Bold)' },
    { value: '800', label: '800 - 特粗 (ExtraBold)' }
  ];

  const FONT_PROPS = [
    { key: 'fontFamily', type: 'select', options: FONT_OPTIONS, label: '字体' },
    { key: 'fontWeight', type: 'select', options: FONT_WEIGHT_OPTIONS, label: '字体粗细' },
    { key: 'fontSize', type: 'slider', label: '字体大小', min: 8, max: 200, step: 1, unit: 'px' }
  ];

  const STYLE_PROPS = [
    { key: 'backgroundColor', type: 'color', label: '背景颜色' },
    { key: 'color', type: 'color', label: '文本颜色' },
    { key: 'padding', type: 'text', label: '内边距 (如 10px 20px)' },
    { key: 'margin', type: 'text', label: '外边距 (如 5px 10px)' },
    { key: 'borderRadius', type: 'slider', label: '圆角', min: 0, max: 100, step: 1, unit: 'px' },
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
    multiSelectToolbar: null,
    initCompleted: false
  };

  // ================ 工具函数 ================
  function uid() { return 'm_' + Math.random().toString(36).slice(2, 10); }
  function cssProp(k) { return k.replace(/([A-Z])/g, '-$1').toLowerCase(); }
  function escapeHtml(s) { if (!s) return ''; return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function isInPluginUI(target) {
    if (!target || !target.closest) return false;
    return !!(target.closest('.html-diff-marker-toolbar') ||
           target.closest('.html-diff-marker-inspector') ||
           target.closest('.html-diff-marker-multi-toolbar') ||
           target.closest('.html-diff-marker-settings-panel') ||
           target.closest('.html-diff-marker-modal-overlay') ||
           target.closest('.html-diff-marker-toast-container') ||
           target.closest('.html-diff-marker-badge') ||
           target.closest('.html-diff-marker-resize-handle') ||
           target.closest('.html-diff-marker-remove-badge') ||
           target.closest('.html-diff-marker-group-wrap') ||
           target.closest('.html-diff-marker-group-outline') ||
           target.closest('.html-diff-marker-wake-btn') ||
           target.closest('.html-diff-marker-size-display') ||
           target.closest('.html-diff-marker-guide-line'));
  }
  function hdmSetStyle(el, prop, value) {
    if (!el) return;
    var cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
    el.style.setProperty(cssProperty, value, 'important');
  }
  function hdmSetStyles(el, props) {
    if (!el || !props) return;
    for (var key in props) {
      if (props.hasOwnProperty(key)) {
        hdmSetStyle(el, key, props[key]);
      }
    }
  }

  function loadInspectorState() {
    try {
      const raw = sessionStorage.getItem(INSPECTOR_STATE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      return {
        pos: parsed.pos || null,
        size: parsed.size || null,
        collapsed: !!parsed.collapsed
      };
    } catch (e) {
      return {};
    }
  }

  function saveInspectorState(patch) {
    try {
      const current = loadInspectorState();
      const next = {
        pos: current.pos || null,
        size: current.size || null,
        collapsed: !!current.collapsed
      };
      if (patch && Object.prototype.hasOwnProperty.call(patch, 'pos')) next.pos = patch.pos;
      if (patch && Object.prototype.hasOwnProperty.call(patch, 'size')) next.size = patch.size;
      if (patch && Object.prototype.hasOwnProperty.call(patch, 'collapsed')) next.collapsed = !!patch.collapsed;
      sessionStorage.setItem(INSPECTOR_STATE_KEY, JSON.stringify(next));
    } catch (e) {}
  }

  // ---------- 字体预览检测 ----------
  // 检测字体是否可用（三态：success/info/warning）
  function checkFontAvailable(fontFamily) {
    if (!fontFamily || !fontFamily.trim()) {
      return { available: false, status: 'default', message: '系统默认字体' };
    }
    // 检查是否为预设系统字体
    const presetFonts = [
      'Microsoft YaHei', '微软雅黑',
      'PingFang SC', '苹方',
      'Source Han Sans CN', '思源黑体',
      'SimSun', '宋体',
      'SimHei', '黑体',
      'KaiTi', '楷体',
      'YouYuan', '幼圆',
      'STXihei', '华文细黑',
      'LiSu', '隶书',
      'FZShuTi', '方正舒体',
      'Arial', 'Helvetica', 'Georgia', 'Roboto', 'Inter'
    ];
    const lowerFont = fontFamily.toLowerCase();
    const isPreset = presetFonts.some(function(f) {
      return lowerFont.indexOf(f.toLowerCase()) > -1;
    });
    if (isPreset) {
      return { available: true, status: 'success', message: '系统字体，可预览' };
    }
    // 自定义字体：尝试检测
    try {
      var testStr = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      var baseFont = 'monospace';
      var testFont = fontFamily + ', ' + baseFont;
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      // 测量基准宽度
      ctx.font = '72px ' + baseFont;
      var baseWidth = ctx.measureText(testStr).width;
      // 测量目标字体宽度
      ctx.font = '72px ' + testFont;
      var testWidth = ctx.measureText(testStr).width;
      if (baseWidth !== testWidth) {
        return { available: true, status: 'success', message: '自定义字体（已添加）' };
      }
      return { available: false, status: 'warning', message: '预览不可用：字体未安装，将应用到目标元素' };
    } catch (e) {
      return { available: false, status: 'warning', message: '预览不可用：字体未安装，将应用到目标元素' };
    }
  }

  // 获取合并后的字体选项（预设 + 自定义）
  function getMergedFontOptions() {
    if (customFonts.length === 0) return FONT_OPTIONS;
    const customGroup = [{ value: '', label: '── 自定义字体 ──', disabled: true }].concat(
      customFonts.map(function(f) { return { value: f.value, label: f.label, isCustom: true }; })
    );
    return FONT_OPTIONS.concat(customGroup);
  }

  // 添加自定义字体（去重）
  function addCustomFont(fontValue) {
    if (!fontValue || !fontValue.trim()) return false;
    // 检查是否已存在于预设或自定义列表中
    const existsInPreset = FONT_OPTIONS.some(function(opt) {
      return !opt.disabled && opt.value === fontValue;
    });
    if (existsInPreset) return false;
    const existsInCustom = customFonts.some(function(f) { return f.value === fontValue; });
    if (existsInCustom) return false;
    // 提取字体名称作为 label
    let fontName = fontValue.split(',')[0].replace(/["']/g, '').trim();
    if (!fontName) fontName = fontValue;
    customFonts.push({ value: fontValue, label: fontName + '（自定义）', isCustom: true });
    // 持久化到 chrome.storage.local
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ htmlDiffMarker_customFonts: customFonts });
      }
    } catch (e) { /* 忽略持久化错误 */ }
    return true;
  }

  // 删除自定义字体，并尽量只影响当前正在编辑的元素。
  function removeCustomFont(fontValue, currentEntry) {
    if (!fontValue) return false;
    const beforeLen = customFonts.length;
    customFonts = customFonts.filter(function(f) { return f.value !== fontValue; });
    if (customFonts.length === beforeLen) return false;

    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ htmlDiffMarker_customFonts: customFonts });
      }
    } catch (e) { /* 忽略持久化错误 */ }

    let currentCleared = false;
    if (currentEntry && currentEntry.modifiedStyles && currentEntry.modifiedStyles.fontFamily === fontValue) {
      applyStyleChange(currentEntry, 'fontFamily', '');
      applyMarkVisual(currentEntry);
      currentCleared = true;
    }

    const otherRefs = state.markedElements.filter(function(m) {
      return (!currentEntry || m.id !== currentEntry.id) &&
        m.modifiedStyles &&
        m.modifiedStyles.fontFamily === fontValue;
    }).length;

    if (otherRefs > 0) {
      showToast('自定义字体已删除；' + otherRefs + ' 个其他标记仍保留该字体值', 'warning');
    } else if (currentCleared) {
      showToast('自定义字体已删除，并已清理当前元素字体', 'success');
    } else {
      showToast('自定义字体已删除', 'success');
    }
    saveState();
    return true;
  }

  // 更新字体提示条
  function updateFontHint(fontHintEl, fontFamily) {
    if (!fontHintEl) return;
    const fontInfo = checkFontAvailable(fontFamily);
    let hintClass = 'html-diff-marker-font-hint';
    let iconHtml = '<span>i</span>';
    let msgText = '';
    if (fontInfo.status === 'success') {
      hintClass += ' success';
      iconHtml = SVG_ICONS.check;
      msgText = fontInfo.message;
    } else if (fontInfo.status === 'default') {
      hintClass += ' info';
      iconHtml = '<span>i</span>';
      msgText = fontInfo.message;
    } else {
      hintClass += ' warning';
      iconHtml = '<span>!</span>';
      msgText = fontInfo.message;
    }
    fontHintEl.className = hintClass;
    fontHintEl.innerHTML = '<span class="font-hint-icon"></span><span>' + escapeHtml(msgText) + '</span>';
    const iconEl = fontHintEl.querySelector('.font-hint-icon');
    if (fontInfo.status === 'success') {
      insertSvgIcon(iconEl, SVG_ICONS.check, { strokeWidth: 2.5 });
    } else {
      iconEl.innerHTML = iconHtml;
    }
  }

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

      // 纯黑纯白专项检测：接近黑色或白色时直接兜底，避免衍生色不可用
      if (l < 10 || l > 90) {
        return {
          primary: '#70649A',
          light: '#8B7FB3',
          dark: '#5A4F7D',
          gradient: 'linear-gradient(135deg, #8B7FB3 0%, #70649A 100%)',
          softBg: '#F0EEF7',
          softBgHover: '#E9E4F3',
          softText: '#5A4F7D',
          countText: '#70649A',
          shadow: '0 2px 8px rgba(112,100,154,0.3)',
          alpha20: 'rgba(112, 100, 154, 0.2)'
        };
      }

      // 边界保护：饱和度下限 20%，亮度范围 15%-75%
      s = Math.max(20, Math.min(s, 100));
      l = Math.max(15, Math.min(l, 75));

      // 边界保护后的安全主色（所有衍生计算均基于此）
      const safePrimary = hslToHex(h, s, l);

      // 浅色版本：亮度 +25%，饱和度 -10%
      const lightL = Math.min(90, l + 25);
      const lightS = Math.max(15, s - 10);
      const light = hslToHex(h, lightS, lightL);

      // 深色版本：亮度 -20%，饱和度 +5%
      const darkL = Math.max(10, l - 20);
      const darkS = Math.min(95, s + 5);
      const dark = hslToHex(h, darkS, darkL);

      // 渐变：从浅色到安全主色
      const gradient = 'linear-gradient(135deg, ' + light + ' 0%, ' + safePrimary + ' 100%)';

      // 柔和背景色：亮度极高（88%-92%），饱和度低
      const softBgL = Math.min(95, l + 50);
      const softBgS = Math.max(10, s - 30);
      const softBg = hslToHex(h, softBgS, softBgL);

      // 柔和背景色 hover 态：比 softBg 稍深（明度 -3%）
      const softBgHoverL = Math.max(80, softBgL - 3);
      const softBgHover = hslToHex(h, softBgS, softBgHoverL);

      // 柔和文字色：使用深色版本
      const softText = dark;

      // 计数文字色：使用安全主色
      const countText = safePrimary;

      // 主色 20% 透明度版本
      const alpha20 = hexToRgba(safePrimary, 0.2);

      // 主题阴影
      const shadow = '0 2px 8px ' + hexToRgba(safePrimary, 0.3);

      return {
        primary: safePrimary,
        light: light,
        dark: dark,
        gradient: gradient,
        softBg: softBg,
        softBgHover: softBgHover,
        softText: softText,
        countText: countText,
        shadow: shadow,
        alpha20: alpha20
      };
    } catch (e) {
      // 兜底：返回默认暮紫
      return {
        primary: '#70649A',
        light: '#8B7FB3',
        dark: '#5A4F7D',
        gradient: 'linear-gradient(135deg, #8B7FB3 0%, #70649A 100%)',
        softBg: '#F0EEF7',
        softBgHover: '#E9E4F3',
        softText: '#5A4F7D',
        countText: '#70649A',
        shadow: '0 2px 8px rgba(112,100,154,0.3)',
        alpha20: 'rgba(112, 100, 154, 0.2)'
      };
    }
  }

  // 判断 hex 颜色是否有效
  function isValidHex(hex) {
    return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  }

  // hex 转 rgba 字符串
  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  // ================ 状态持久化 ================
  // 过滤对象中 _ 开头的内部字段（深拷贝时使用）
  function filterInternalFields(obj) {
    if (Array.isArray(obj)) {
      return obj.map(filterInternalFields);
    }
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        if (key.startsWith('_')) continue;
        result[key] = filterInternalFields(obj[key]);
      }
      return result;
    }
    return obj;
  }

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
        children: m.children || undefined,
        groupScale: m.groupScale || undefined,
        groupOffset: m.groupOffset || undefined
      }));
      const data = { markedElements: markedElements, domChanges: state.domChanges || [] };
      const cleanData = filterInternalFields(data);
      const jsonStr = JSON.stringify(cleanData);
      // 优先存 chrome.storage.local
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          const saveObj = {};
          saveObj[STATE_KEY] = cleanData;
          chrome.storage.local.set(saveObj);
        }
      } catch (e) {}
      // 同时存 sessionStorage 作为 fallback
      try {
        sessionStorage.setItem(STATE_KEY, jsonStr);
      } catch (e) {}
    } catch(e) {}
  }

  function loadState(callback) {
    let callbackCalled = false;
    function done() {
      if (callbackCalled) return;
      callbackCalled = true;
      if (callback) {
        try { callback(); } catch (e) {}
      }
    }
    // 优先从 chrome.storage.local 读取
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        // 超时兜底：2秒内没回调则走 sessionStorage fallback
        const timeoutId = setTimeout(function() {
          if (!callbackCalled) {
            loadStateFromSession();
            done();
          }
        }, 2000);
        chrome.storage.local.get([STATE_KEY], function(result) {
          clearTimeout(timeoutId);
          try {
            let parsed = null;
            if (result && result[STATE_KEY]) {
              parsed = result[STATE_KEY];
            }
            if (parsed) {
              applyLoadedState(parsed);
            } else {
              // fallback：从 sessionStorage 读取
              loadStateFromSession();
            }
            // 同步到 sessionStorage
            if (parsed) {
              try { sessionStorage.setItem(STATE_KEY, JSON.stringify(parsed)); } catch (e) {}
            }
          } catch (e) {
            // 解析失败时走 sessionStorage 兜底
            try { loadStateFromSession(); } catch (e2) {}
          }
          done();
        });
        return;
      }
    } catch (e) {}
    // Fallback：从 sessionStorage 读取
    try { loadStateFromSession(); } catch (e) {}
    done();
  }

  function loadStateFromSession() {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      applyLoadedState(parsed);
    } catch(e) {}
  }

  function applyLoadedState(parsed) {
    if (Array.isArray(parsed)) {
      state.markedElements = parsed;
      state.domChanges = [];
    } else {
      state.markedElements = parsed.markedElements || [];
      state.domChanges = parsed.domChanges || [];
    }
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
      if (t && t.closest && t.closest('button')) return;
      e.preventDefault(); e.stopPropagation();
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = el.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      hdmSetStyle(el, 'left', origX + 'px');
      hdmSetStyle(el, 'top', origY + 'px');
      hdmSetStyle(el, 'right', 'auto');
      hdmSetStyle(el, 'bottom', 'auto');
      document.body.style.userSelect = 'none';
    }, true);
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      e.preventDefault(); e.stopPropagation();
      const nx = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, origX + (e.clientX - startX)));
      const ny = Math.max(8, Math.min(window.innerHeight - el.offsetHeight, origY + (e.clientY - startY)));
      hdmSetStyle(el, 'left', nx + 'px');
      hdmSetStyle(el, 'top', ny + 'px');
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
    hdmSetStyle(fill, 'width', pct + '%');
    hdmSetStyle(thumb, 'left', pct + '%');

    let dragging = false;

    function updateFromEvent(e) {
      const rect = trackWrap.getBoundingClientRect();
      let pct = (e.clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      let val = min + pct * range;
      val = Math.round(val / step) * step;
      val = Math.max(min, Math.min(max, val));
      hdmSetStyle(fill, 'width', (pct * 100) + '%');
      hdmSetStyle(thumb, 'left', (pct * 100) + '%');
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

    trackWrap.addEventListener('mousedown', function(e) {
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
            hdmSetStyle(fill, 'width', pct + '%');
            hdmSetStyle(thumb, 'left', pct + '%');
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
    if (isInPluginUI(e.target)) return;
    if (state.hoveredEl && state.hoveredEl !== e.target)
      state.hoveredEl.classList.remove('html-diff-marker-highlight-hover');
    state.hoveredEl = e.target;
    e.target.classList.add('html-diff-marker-highlight-hover');
  }
  function onClick(e) {
    if (!state.isSelecting) return;
    if (isInPluginUI(e.target)) return;
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
      showToast('请至少选择 2 个元素来创建组合标记', 'warning');
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
    return { left: minLeft, top: minTop,
             width: maxRight - minLeft, height: maxBottom - minBottom };
  }
  function updateMultiSelectToolbar() {
    if (!state.multiSelectToolbar) {
      const bar = document.createElement('div');
      bar.className = 'html-diff-marker-multi-toolbar';

      // 组合标记按钮
      const markBtn = document.createElement('button');
      markBtn.className = 'html-diff-marker-multi-btn html-diff-marker-multi-btn--primary';
      markBtn.textContent = '组合标记';
      markBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        createGroupMark();
      }, true);
      bar.appendChild(markBtn);

      // 复制按钮
      const copyBtn = document.createElement('button');
      copyBtn.className = 'html-diff-marker-multi-btn html-diff-marker-multi-btn--secondary';
      copyBtn.innerHTML = '<span class="multi-btn-icon"></span><span>复制选中</span>';
      insertSvgIcon(copyBtn.querySelector('.multi-btn-icon'), SVG_ICONS.duplicate);
      copyBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        batchDuplicateSelected();
      }, true);
      bar.appendChild(copyBtn);

      // 删除按钮
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'html-diff-marker-multi-btn html-diff-marker-multi-btn--danger';
      deleteBtn.innerHTML = '<span class="multi-btn-icon"></span><span>删除选中</span>';
      insertSvgIcon(deleteBtn.querySelector('.multi-btn-icon'), SVG_ICONS.trash);
      deleteBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        batchRemoveMarks();
      }, true);
      bar.appendChild(deleteBtn);

      // 取消选择按钮
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'html-diff-marker-multi-btn html-diff-marker-multi-btn--ghost';
      cancelBtn.textContent = '取消选择';
      cancelBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        clearMultiSelect();
      }, true);
      bar.appendChild(cancelBtn);

      const countLabel = document.createElement('span');
      countLabel.className = 'html-diff-marker-multi-count';
      bar.appendChild(countLabel);
      bar._countLabel = countLabel;
      document.body.appendChild(bar);
      state.multiSelectToolbar = bar;
    }
    const bar = state.multiSelectToolbar;
    if (state.multiSelectedEls.length === 0) {
      hdmSetStyle(bar, 'display', 'none');
      return;
    }
    hdmSetStyle(bar, 'display', 'flex');
    bar._countLabel.innerHTML = '已选 <b>' + state.multiSelectedEls.length + '</b>';
    const bounds = getMultiSelectBounds();
    if (bounds) {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      hdmSetStyle(bar, 'transform', 'none');
      requestAnimationFrame(function() {
        const barRect = bar.getBoundingClientRect();
        const barHeight = barRect.height || 40;
        const barWidth = bar.offsetWidth || barRect.width || 300;
        let topPos = bounds.top - barHeight - 8;
        let flipped = false;
        if (topPos < 8) {
          topPos = bounds.bottom + 8;
          flipped = true;
        }
        if (topPos + barHeight > vh - 8) {
          if (flipped) {
            topPos = Math.max(8, bounds.top - barHeight - 8);
          } else {
            topPos = Math.max(8, vh - barHeight - 8);
          }
        }
        if (topPos < 8) topPos = 8;
        hdmSetStyle(bar, 'top', topPos + 'px');
        let leftPos = bounds.left + bounds.width / 2 - barWidth / 2;
        if (leftPos < 8) leftPos = 8;
        if (leftPos + barWidth > vw - 8) {
          leftPos = vw - barWidth - 8;
        }
        if (leftPos < 8) leftPos = 8;
        hdmSetStyle(bar, 'left', leftPos + 'px');
      });
    }
  }

  // ---------- 批量操作 ----------
  function batchDuplicateSelected() {
    const els = state.multiSelectedEls;
    if (els.length === 0) {
      showToast('请先选择要复制的元素', 'warning');
      return;
    }
    let successCount = 0;
    let failCount = 0;
    els.forEach(function(el) {
      try {
        let entry = state.markedElements.find(m => m._el === el && m.type !== 'group');
        // 如果元素未标记，先标记再操作
        if (!entry) {
          const selector = buildSelector(el);
          entry = {
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
        }
        const clone = el.cloneNode(true);
        clone.classList.remove('html-diff-marker-selected', 'html-diff-marker-modified', 'html-diff-marker-highlight-hover', 'html-diff-marker-visual-edit', 'html-diff-marker-multi-selected');
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
        state.domChanges.push({ type: 'duplicate', targetSelector: buildSelector(el), cloneHTML: clone.outerHTML });
        applyMarkVisual(newEntry);
        successCount++;
      } catch (e) {
        failCount++;
      }
    });
    saveState();
    clearMultiSelect();
    updateToolbarCounts();
    if (failCount === 0) {
      showToast('已复制 ' + successCount + ' 个元素', 'success');
    } else {
      showToast('复制完成：成功 ' + successCount + ' 个，失败 ' + failCount + ' 个', failCount > 0 && successCount === 0 ? 'error' : 'warning');
    }
  }

  function batchRemoveMarks() {
    // §7.1.1 防御性拷贝，避免引用被 clearMultiSelect 影响
    const rawEls = state.multiSelectedEls.slice();
    if (rawEls.length === 0) {
      showToast('请先选择要删除的元素', 'warning');
      return;
    }
    // §7.1.1 前置分流：过滤掉属于任何 group 的成员元素
    const skippedGroupEls = [];
    const els = rawEls.filter(function(el) {
      const entry = state.markedElements.find(m => m._el === el && m.type !== 'group');
      if (entry && isEntryInGroup(entry.id)) {
        skippedGroupEls.push(el);
        return false;
      }
      return true;
    });
    // 全跳过：不弹 confirm，直接 toast 提示
    if (els.length === 0 && skippedGroupEls.length > 0) {
      showToast('选中的元素均为组合成员，请先在组合面板中操作', 'warning');
      return;
    }
    if (els.length === 0) {
      showToast('请先选择要删除的元素', 'warning');
      return;
    }
    // §7.1.4 弹窗数字使用过滤后的 els.length
    showConfirm('确定要删除这 ' + els.length + ' 个元素吗？删除后对应的所有修改也将一并清除。如需恢复请点击"↺"+刷新页面。', '批量删除确认', function(ok) {
      if (!ok) return;
      // §7.1.2 主流程：逐个删除 DOM 元素并写入 domChanges
      els.forEach(function(el) {
        const entry = state.markedElements.find(m => m._el === el && m.type !== 'group');
        // 在 removeChild 之前计算删除元数据
        stripMarkerChildren(el);
        const deletedHTML = el.outerHTML;
        const selector = entry ? entry.selector : buildSelector(el);
        const parentSelector = el.parentNode ? buildSelector(el.parentNode) : null;
        const nextSiblingSelector = el.nextSibling && el.nextSibling.nodeType === 1 ? buildSelector(el.nextSibling) : null;
        state.domChanges.push({ type: 'delete', selector: selector, deletedHTML: deletedHTML, parentSelector: parentSelector, nextSiblingSelector: nextSiblingSelector });
        if (entry) {
          state.markedElements = state.markedElements.filter(m => m.id !== entry.id);
          if (state.currentEditId === entry.id) closeInspector();
        }
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      // §7.1.3 末尾收尾（顺序不可颠倒）
      saveState();
      clearMultiSelect();
      updateToolbarCounts();
      // toast 文案（三态）
      if (skippedGroupEls.length === 0) {
        showToast('已删除 ' + els.length + ' 个元素', 'success');
      } else {
        showToast('已删除 ' + els.length + ' 个元素，另有 ' + skippedGroupEls.length + ' 个组合成员已跳过', 'warning');
      }
    });
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
    // 选择按钮激活态
    if (state.toolbarEl) {
      var selectBtn = state.toolbarEl.querySelector('[data-action="select"]');
      if (selectBtn) selectBtn.classList.add('html-diff-marker-btn--active');
    }
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
    // 移除选择按钮激活态
    if (state.toolbarEl) {
      var selectBtn = state.toolbarEl.querySelector('[data-action="select"]');
      if (selectBtn) selectBtn.classList.remove('html-diff-marker-btn--active');
    }
    if (state.toolbarEl) updateToolbarCounts();
  }

  // ================ 标记管理 ================
  function markElement(el) {
    if (!el || isInPluginUI(el)) return;
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
      hdmSetStyle(el, prop, entry.modifiedStyles[prop]);
    });
    // 应用 href 修改
    if (entry.tag === 'a') {
      if (entry.modifiedHref !== undefined && entry.modifiedHref !== null && entry.modifiedHref !== '') {
        el.setAttribute('href', entry.modifiedHref);
      }
    }

    // 添加编号徽章（组合标记的子元素不显示独立徽章）
    if (!isEntryInGroup(entry.id)) {
      const idx = state.markedElements.indexOf(entry) + 1;
      const badge = document.createElement('div');
      badge.className = 'html-diff-marker-badge' + ((entry.modifiedHTML || hasStyleChanges(entry)) ? ' modified' : '');
      badge.setAttribute('data-entry-id', entry.id);
      badge.textContent = idx;
      badge.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        openInspector(entry.id);
      }, true);
      el.appendChild(badge);
    }

    // 添加删除角标
    const removeBtn = document.createElement('div');
    removeBtn.className = 'html-diff-marker-remove-badge';
    removeBtn.setAttribute('data-entry-id', entry.id);
    removeBtn.setAttribute('title', '删除此标记');
    insertSvgIcon(removeBtn, SVG_ICONS.close);
    removeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      showConfirm('确定要删除这个标记吗？删除后对应的所有修改也将一并清除。如需恢复请点击"↺"+刷新页面。', '删除确认', function(ok) {
        if (ok) removeMark(entry.id);
      });
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
      hdmSetStyle(el, 'cursor', (entry.modifiedHref && entry.modifiedHref !== '') ? 'pointer' : '');
    }
  }

  // ---------- 组合标记 ----------
  function isEntryInGroup(entryId) {
    return state.markedElements.some(m => m.type === 'group' && m.children && m.children.indexOf(entryId) >= 0);
  }
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
    hdmSetStyles(groupEl, {
      position: 'absolute',
      left: bounds.left + 'px',
      top: bounds.top + 'px',
      width: bounds.width + 'px',
      height: bounds.height + 'px',
      pointerEvents: 'none',
      zIndex: '2147483644',
      transformOrigin: 'top left'
    });
    if (groupEntry.groupScale && groupEntry.groupScale !== 1) {
      hdmSetStyle(groupEl, 'transform', 'scale(' + groupEntry.groupScale + ')');
    }
    document.body.appendChild(groupEl);
    groupEntry._groupEl = groupEl;

    const outline = document.createElement('div');
    outline.className = 'html-diff-marker-group-outline';
    hdmSetStyles(outline, {
      position: 'absolute',
      inset: '0',
      outline: '2px solid var(--hdm-theme-primary)',
      outlineOffset: '2px',
      borderRadius: '2px',
      pointerEvents: 'none'
    });
    groupEl.appendChild(outline);

    const badge = document.createElement('div');
    badge.className = 'html-diff-marker-badge html-diff-marker-group-badge';
    hdmSetStyles(badge, {
      position: 'absolute',
      top: '-12px',
      right: '-12px',
      background: 'var(--hdm-theme-primary)',
      color: 'white',
      fontSize: '11px',
      fontWeight: '700',
      padding: '2px 10px',
      borderRadius: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      cursor: 'pointer',
      userSelect: 'none',
      minWidth: 'auto',
      width: 'auto',
      height: 'auto',
      lineHeight: '18px',
      textAlign: 'center',
      whiteSpace: 'nowrap',
      pointerEvents: 'auto',
      zIndex: '2147483647'
    });
    badge.textContent = 'G' + children.length;
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
      const baseStyles = {
        position: 'absolute',
        width: '10px',
        height: '10px',
        background: 'white',
        border: '2px solid var(--hdm-theme-primary)',
        borderRadius: '50%',
        cursor: h.cursor,
        pointerEvents: 'auto',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      };
      if (h.pos === 'nw') { baseStyles.top = '-5px'; baseStyles.left = '-5px'; }
      else if (h.pos === 'n') { baseStyles.top = '-5px'; baseStyles.left = '50%'; baseStyles.transform = 'translateX(-50%)'; }
      else if (h.pos === 'ne') { baseStyles.top = '-5px'; baseStyles.right = '-5px'; }
      else if (h.pos === 'w') { baseStyles.top = '50%'; baseStyles.left = '-5px'; baseStyles.transform = 'translateY(-50%)'; }
      else if (h.pos === 'e') { baseStyles.top = '50%'; baseStyles.right = '-5px'; baseStyles.transform = 'translateY(-50%)'; }
      else if (h.pos === 'sw') { baseStyles.bottom = '-5px'; baseStyles.left = '-5px'; }
      else if (h.pos === 's') { baseStyles.bottom = '-5px'; baseStyles.left = '50%'; baseStyles.transform = 'translateX(-50%)'; }
      else if (h.pos === 'se') { baseStyles.bottom = '-5px'; baseStyles.right = '-5px'; }
      hdmSetStyles(handle, baseStyles);
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
      hdmSetStyle(groupEl, 'transform', 'scale(' + newScale + ')');
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
      hdmSetStyle(groupEl, 'transform', 'scale(' + newScale + ')');
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
        hdmSetStyle(v, 'left', matchedX + 'px');
        document.body.appendChild(v); posGuideLines.push(v);
      }
      if (matchedY !== null) {
        const h = document.createElement('div');
        h.className = 'html-diff-marker-guide-line html-diff-marker-guide-line-h';
        hdmSetStyle(h, 'top', matchedY + 'px');
        document.body.appendChild(h); posGuideLines.push(h);
      }
      posDisplay = document.createElement('div');
      posDisplay.className = 'html-diff-marker-size-display';
      let text = '位置 X:' + Math.round(curLeft) + ' Y:' + Math.round(curTop);
      if (matchedX !== null) text += ' ↔ 对齐!';
      if (matchedY !== null) text += ' ↕ 对齐!';
      posDisplay.textContent = text;
      hdmSetStyle(posDisplay, 'left', (curLeft + curW / 2 - 100) + 'px');
      hdmSetStyle(posDisplay, 'top', (curTop - 35) + 'px');
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
      if (currentPos === 'static') { hdmSetStyle(el, 'position', 'relative'); entry.modifiedStyles.position = 'relative'; }
      const curLeft = parseFloat(el.style.left) || 0;
      const curTop = parseFloat(el.style.top) || 0;

      document.body.style.cursor = 'move'; hdmSetStyle(el, 'userSelect', 'none');

      function onMove(ev) {
        ev.preventDefault(); ev.stopPropagation();
        const dx = ev.clientX - startX; const dy = ev.clientY - startY;
        hdmSetStyle(el, 'left', (curLeft + dx) + 'px');
        hdmSetStyle(el, 'top', (curTop + dy) + 'px');
        const curRect = el.getBoundingClientRect();
        checkPosAlignment(curRect.left, curRect.top, curRect.width, curRect.height);
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove, true);
        document.removeEventListener('mouseup', onUp, true);
        document.body.style.cursor = ''; hdmSetStyle(el, 'userSelect', '');
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
    if (currentPos === 'static') { hdmSetStyle(el, 'position', 'relative'); entry.modifiedStyles.position = 'relative'; }

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
        hdmSetStyle(v, 'left', rect.left + 'px');
        document.body.appendChild(v); guideLines.push(v);
        const v2 = document.createElement('div');
        v2.className = 'html-diff-marker-guide-line html-diff-marker-guide-line-v';
        hdmSetStyle(v2, 'left', (rect.left + curW) + 'px');
        document.body.appendChild(v2); guideLines.push(v2);
      }
      if (matchedH !== null) {
        const h = document.createElement('div');
        h.className = 'html-diff-marker-guide-line html-diff-marker-guide-line-h';
        hdmSetStyle(h, 'top', rect.top + 'px');
        document.body.appendChild(h); guideLines.push(h);
        const h2 = document.createElement('div');
        h2.className = 'html-diff-marker-guide-line html-diff-marker-guide-line-h';
        hdmSetStyle(h2, 'top', (rect.top + curH) + 'px');
        document.body.appendChild(h2); guideLines.push(h2);
      }
      sizeDisplay = document.createElement('div');
      sizeDisplay.className = 'html-diff-marker-size-display';
      let text = Math.round(curW) + ' × ' + Math.round(curH);
      if (matchedW !== null) text += ' ↔ ' + matchedW + ' 对齐!';
      if (matchedH !== null) text += ' ↕ ' + matchedH + ' 对齐!';
      sizeDisplay.textContent = text;
      hdmSetStyle(sizeDisplay, 'left', (rect.left + rect.width / 2 - 100) + 'px');
      hdmSetStyle(sizeDisplay, 'top', (rect.top - 35) + 'px');
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
              hdmSetStyle(targetEl, prop, newVal);
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
            hdmSetStyle(el, 'width', beforeRect.width + 'px');
            hdmSetStyle(el, 'height', beforeRect.height + 'px');
          } else {
            const pl = parseFloat(el.style.paddingLeft) || 0;
            const pr = parseFloat(el.style.paddingRight) || 0;
            const pt = parseFloat(el.style.paddingTop) || 0;
            const pb = parseFloat(el.style.paddingBottom) || 0;
            const bl = parseFloat(el.style.borderLeftWidth) || 0;
            const br = parseFloat(el.style.borderRightWidth) || 0;
            const bt = parseFloat(el.style.borderTopWidth) || 0;
            const bb = parseFloat(el.style.borderBottomWidth) || 0;
            hdmSetStyle(el, 'width', Math.max(0, beforeRect.width - pl - pr - bl - br) + 'px');
            hdmSetStyle(el, 'height', Math.max(0, beforeRect.height - pt - pb - bt - bb) + 'px');
          }
          if (entry.modifiedStyles) {
            entry.modifiedStyles.width = el.style.width;
            entry.modifiedStyles.height = el.style.height;
          }
          hdmSetStyle(el, 'transform', '');
          hdmSetStyle(el, 'transformOrigin', '');
          // 调整 left/top 保证视觉位置不变（scale 以 center 为原点，清除后左上角会偏移）
          const afterRect = el.getBoundingClientRect();
          const dx = beforeRect.left - afterRect.left;
          const dy = beforeRect.top - afterRect.top;
          if (dx !== 0 || dy !== 0) {
            const curLeft = parseFloat(el.style.left) || 0;
            const curTop = parseFloat(el.style.top) || 0;
            const newLeft = curLeft + dx;
            const newTop = curTop + dy;
            hdmSetStyle(el, 'left', newLeft + 'px');
            hdmSetStyle(el, 'top', newTop + 'px');
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
        hdmSetStyle(el, 'userSelect', 'none');

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
          hdmSetStyle(el, 'width', newW + 'px');
          hdmSetStyle(el, 'height', newH + 'px');
          if (dir.w && dir.dx < 0) hdmSetStyle(el, 'left', newLeft + 'px');
          if (dir.h && dir.dy < 0) hdmSetStyle(el, 'top', newTop + 'px');
          const curRect = el.getBoundingClientRect();
          checkAlignment(newW, newH, curRect);
        }
        function onUp() {
          document.removeEventListener('mousemove', onMove, true);
          document.removeEventListener('mouseup', onUp, true);
          document.body.style.cursor = '';
          hdmSetStyle(el, 'userSelect', '');
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
      hdmSetStyle(el, 'transformOrigin', 'center center');
      hdmSetStyle(el, 'transform', 'scale(' + newScale + ')');
      if (!entry.modifiedStyles) entry.modifiedStyles = {};
      entry.modifiedStyles.transform = 'scale(' + newScale + ')';
      saveState();
      el.classList.add('html-diff-marker-modified');
      if (state.currentEditId === entry.id) openInspector(entry.id);
    }, true);
  }

  // ---------- 文本编辑（双击文本触发） ----------
  // 检查点击位置是否在文本节点上
  function isClickOnTextNode(el, clientX, clientY) {
    try {
      let range = null;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(clientX, clientY);
      }
      if (!range && document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(clientX, clientY);
        if (pos && pos.offsetNode) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      }
      if (range && range.startContainer && el.contains(range.startContainer)) {
        // 起始节点是文本节点，且有实际内容
        if (range.startContainer.nodeType === 3 && range.startContainer.textContent.trim().length > 0) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function enableTextEdit(entry) {
    const el = entry._el;
    if (!el || entry._textEditEnabled) return;
    entry._textEditEnabled = true;
    el.addEventListener('dblclick', function(e) {
      if (state.isSelecting) return;
      const t = e.target;
      if (t && t.classList && (t.classList.contains('html-diff-marker-badge') || t.classList.contains('html-diff-marker-resize-handle') || t.classList.contains('html-diff-marker-remove-badge'))) return;
      // 只有双击在文本节点上才进入文本编辑，否则让事件冒泡以触发打开面板
      if (!isClickOnTextNode(el, e.clientX, e.clientY)) return;
      e.preventDefault(); e.stopPropagation();
      const clickX = e.clientX;
      const clickY = e.clientY;
      const savedHtml = el.innerHTML;
      stripMarkerChildren(el);
      el.contentEditable = 'true';
      hdmSetStyle(el, 'outline', '2px dashed var(--hdm-theme-primary)');
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
        hdmSetStyle(el, 'outline', '');
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

  // ---------- 双击打开面板（事件委托到 body） ----------
  function onBodyDblClick(e) {
    if (state.isSelecting) return;
    const t = e.target;
    if (!t) return;
    // 忽略工具栏和面板内的双击
    if (isInPluginUI(t)) return;

    // 查找被标记的元素（向上找有 html-diff-marker-selected 或 modified 类的元素）
    let markedEl = t.closest('.html-diff-marker-selected, .html-diff-marker-modified');
    if (!markedEl) return;

    // 查找对应的 entry
    const entry = state.markedElements.find(m => m._el === markedEl && m.type !== 'group');
    if (!entry) return;

    // 如果双击在文本节点上，由 enableTextEdit 处理（它会先执行并 stopPropagation）
    if (isClickOnTextNode(markedEl, e.clientX, e.clientY)) return;

    e.preventDefault();
    e.stopPropagation();
    openInspector(entry.id);
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
              hdmSetStyle(childEl, 'cursor', '');
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
          hdmSetStyle(el, 'cursor', '');
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
    // 同时清除 chrome.storage.local 和 sessionStorage
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(STATE_KEY);
      }
    } catch (e) {}
    try {
      sessionStorage.removeItem(STATE_KEY);
    } catch (e) {}
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
      showToast('请先在编辑面板中选择一个组件', 'warning');
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
      showToast('已复制该组件，新组件已标记', 'success');
    } catch(e) {
      showToast('复制失败：' + e.message, 'error');
    }
  }

  function addNewElement() {
    showPrompt('请输入要插入的 HTML 代码（如 &lt;div class="card"&gt;新卡片&lt;/div&gt;）：', '<div>新组件</div>', '新增组件', function(html) {
      if (!html) return;
      try {
        const container = document.createElement('div');
        container.innerHTML = html;
        const newEl = container.firstElementChild;
        if (!newEl) { showToast('请输入有效的 HTML 代码', 'warning'); return; }
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
        showToast('添加失败：' + e.message, 'error');
      }
    });
  }

  function deleteSelectedElement() {
    const entry = getCurrentEntry();
    if (!entry || !entry._el) {
      showToast('请先在编辑面板中选择一个组件', 'warning');
      return;
    }
    showConfirm('确定要删除这个元素吗？删除后对应的所有修改也将一并清除。如需恢复请点击"↺"+刷新页面。', '删除确认', function(ok) {
      if (!ok) return;
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
    });
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
      if (entry._el) hdmSetStyle(entry._el, prop, value);
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
    { id: 'dusk-purple', name: '暮紫', color: '#70649A' },
    { id: 'deep-cyan', name: '深藏青', color: '#211E55' },
    { id: 'gray-green', name: '灰绿', color: '#6A8372' },
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
            let saved = null;
            if (result && result[THEME_KEY]) {
              saved = result[THEME_KEY];
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
      // 清除 documentElement 上的自定义主题内联变量，让 CSS 类选择器的预设主题生效
      const style = document.documentElement.style;
      style.removeProperty('--hdm-theme-primary');
      style.removeProperty('--hdm-theme-primary-light');
      style.removeProperty('--hdm-theme-primary-dark');
      style.removeProperty('--hdm-theme-gradient');
      style.removeProperty('--hdm-theme-soft-bg');
      style.removeProperty('--hdm-theme-soft-bg-hover');
      style.removeProperty('--hdm-theme-soft-text');
      style.removeProperty('--hdm-theme-count-text');
      style.removeProperty('--hdm-theme-shadow');
      style.removeProperty('--hdm-theme-alpha-20');
      document.documentElement.setAttribute('data-theme', themeId);
      this._saveToStorage({ type: 'preset', themeId: themeId });
    },

    // 应用自定义颜色
    applyCustom: function(hexColor) {
      if (!hexColor || !isValidHex(hexColor)) return false;
      if (!hexColor.startsWith('#')) hexColor = '#' + hexColor;
      hexColor = hexColor.toUpperCase();
      this.currentTheme = 'custom';
      this.customColor = hexColor;
      // 计算衍生色并应用到 documentElement 的 CSS 变量
      const colors = deriveColors(hexColor);
      this._applyCustomColors(colors);
      document.documentElement.setAttribute('data-theme', 'custom');
      this._saveToStorage({ type: 'custom', color: hexColor });
      return true;
    },

    // 应用自定义颜色的 CSS 变量
    _applyCustomColors: function(colors) {
      const style = document.documentElement.style;
      style.setProperty('--hdm-theme-primary', colors.primary);
      style.setProperty('--hdm-theme-primary-light', colors.light);
      style.setProperty('--hdm-theme-primary-dark', colors.dark);
      style.setProperty('--hdm-theme-gradient', colors.gradient);
      style.setProperty('--hdm-theme-soft-bg', colors.softBg);
      style.setProperty('--hdm-theme-soft-bg-hover', colors.softBgHover);
      style.setProperty('--hdm-theme-soft-text', colors.softText);
      style.setProperty('--hdm-theme-count-text', colors.countText);
      style.setProperty('--hdm-theme-shadow', colors.shadow);
      style.setProperty('--hdm-theme-alpha-20', colors.alpha20);
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

  // ---------- SVG 图标常量 ----------
  const SVG_ICONS = {
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M5 12h14"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;"><path d="m6 9 6 6 6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M20 6 9 17l-5-5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    duplicate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>'
  };

  // ---------- SVG 图标样式强制修复 ----------
  function enforceSvgIconStyles(svgEl, options) {
    if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') return svgEl;
    options = options || {};
    var color = options.color || 'currentColor';
    var strokeWidth = options.strokeWidth || 2;
    var fill = options.fill || 'none';
    var size = options.size || null;

    svgEl.style.setProperty('display', 'block', 'important');
    if (size) {
      svgEl.style.setProperty('width', size, 'important');
      svgEl.style.setProperty('height', size, 'important');
    }

    var children = svgEl.querySelectorAll('*');
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      var tag = el.tagName.toLowerCase();

      el.style.setProperty('fill', fill, 'important');
      el.style.setProperty('stroke', color, 'important');
      el.style.setProperty('stroke-width', strokeWidth + 'px', 'important');
      el.style.setProperty('stroke-linecap', 'round', 'important');
      el.style.setProperty('stroke-linejoin', 'round', 'important');
      el.style.setProperty('display', 'block', 'important');

      switch (tag) {
        case 'circle':
          if (el.getAttribute('cx') !== null)
            el.style.setProperty('cx', el.getAttribute('cx') + 'px', 'important');
          if (el.getAttribute('cy') !== null)
            el.style.setProperty('cy', el.getAttribute('cy') + 'px', 'important');
          if (el.getAttribute('r') !== null)
            el.style.setProperty('r', el.getAttribute('r') + 'px', 'important');
          break;
        case 'ellipse':
          ['cx', 'cy', 'rx', 'ry'].forEach(function(a) {
            if (el.getAttribute(a) !== null)
              el.style.setProperty(a, el.getAttribute(a) + 'px', 'important');
          });
          break;
        case 'rect':
          ['x', 'y', 'width', 'height', 'rx', 'ry'].forEach(function(a) {
            if (el.getAttribute(a) !== null)
              el.style.setProperty(a, el.getAttribute(a) + 'px', 'important');
          });
          break;
        case 'path':
          if (el.getAttribute('d') !== null) {
            var dValue = el.getAttribute('d');
            var escapedD = dValue
              .replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, ' ');
            el.style.setProperty('d', 'path("' + escapedD + '")', 'important');
          }
          break;
        case 'line':
          ['x1', 'y1', 'x2', 'y2'].forEach(function(a) {
            if (el.getAttribute(a) !== null)
              el.style.setProperty(a, el.getAttribute(a) + 'px', 'important');
          });
          break;
        case 'polyline':
        case 'polygon':
          if (el.getAttribute('points') !== null)
            el.style.setProperty('points', el.getAttribute('points'), 'important');
          break;
      }
    }

    return svgEl;
  }

  function insertSvgIcon(container, svgHtml, options) {
    container.innerHTML = svgHtml;
    var svg = container.querySelector('svg');
    if (svg) enforceSvgIconStyles(svg, options);
    return svg;
  }

  // ================ Toast 通知系统 ================
  let toastContainer = null;
  let toastStack = [];

  function ensureToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'html-diff-marker-toast-container';
      hdmSetStyles(toastContainer, {
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      });
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function showToast(message, type, duration) {
    if (!message) return;
    type = type || 'info';
    duration = duration || 3000;

    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = 'html-diff-marker-toast html-diff-marker-toast--' + type;
    hdmSetStyle(toast, 'pointerEvents', 'auto');

    // 图标
    const icon = document.createElement('div');
    icon.className = 'html-diff-marker-toast-icon';
    if (type === 'success') insertSvgIcon(icon, SVG_ICONS.check, { strokeWidth: 2.5 });
    else if (type === 'error') insertSvgIcon(icon, SVG_ICONS.error, { strokeWidth: 2.5 });
    else if (type === 'warning') insertSvgIcon(icon, SVG_ICONS.warning, { strokeWidth: 2.5 });
    else insertSvgIcon(icon, SVG_ICONS.info, { strokeWidth: 2.5 });
    toast.appendChild(icon);

    // 消息文本
    const msg = document.createElement('div');
    msg.className = 'html-diff-marker-toast-message';
    msg.textContent = message;
    toast.appendChild(msg);

    container.appendChild(toast);
    toastStack.push(toast);

    // 自动消失
    if (duration > 0) {
      setTimeout(function() {
        dismissToast(toast);
      }, duration);
    }

    return toast;
  }

  function dismissToast(toast) {
    if (!toast || toast.__leaving) return;
    toast.__leaving = true;
    toast.classList.add('html-diff-marker-toast--leaving');
    setTimeout(function() {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      const idx = toastStack.indexOf(toast);
      if (idx > -1) toastStack.splice(idx, 1);
      // 清理容器
      if (toastStack.length === 0 && toastContainer && toastContainer.parentNode) {
        toastContainer.parentNode.removeChild(toastContainer);
        toastContainer = null;
      }
    }, 200);
  }

  // ================ 模态弹窗 ================
  let modalStack = [];

  function showModal(options) {
    options = options || {};
    const title = options.title || '提示';
    const content = options.content || '';
    const type = options.type || 'alert'; // alert / confirm / prompt
    const confirmText = options.confirmText || '确定';
    const cancelText = options.cancelText || '取消';
    const inputPlaceholder = options.inputPlaceholder || '';
    const inputValue = options.inputValue || '';
    const onConfirm = options.onConfirm || null;
    const onCancel = options.onCancel || null;

    // 遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'html-diff-marker-modal-overlay';

    // 弹窗容器
    const modal = document.createElement('div');
    modal.className = 'html-diff-marker-modal';

    // 头部
    const header = document.createElement('div');
    header.className = 'html-diff-marker-modal-header';
    const headerTitle = document.createElement('div');
    headerTitle.className = 'html-diff-marker-modal-header-title';
    headerTitle.textContent = title;
    header.appendChild(headerTitle);

    // 仅 alert 类型显示关闭按钮
    if (type === 'alert') {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'html-diff-marker-modal-header-close';
      insertSvgIcon(closeBtn, SVG_ICONS.close);
      closeBtn.addEventListener('click', function() {
        closeModal(overlay, null, onCancel);
      }, true);
      header.appendChild(closeBtn);
    }
    modal.appendChild(header);

    // 内容区
    const body = document.createElement('div');
    body.className = 'html-diff-marker-modal-body';

    if (typeof content === 'string') {
      const contentP = document.createElement('p');
      contentP.textContent = content;
      hdmSetStyles(contentP, {
        margin: '0',
        paddingLeft: '16px',
        paddingRight: '16px',
        fontSize: '13px',
        lineHeight: '1.6'
      });
      body.appendChild(contentP);
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }

    // prompt 模式：输入框
    let inputEl = null;
    if (type === 'prompt') {
      const field = document.createElement('div');
      field.className = 'html-diff-marker-modal-field';
      hdmSetStyles(field, {
        marginTop: '14px',
        paddingLeft: '16px',
        paddingRight: '16px'
      });
      inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.className = 'html-diff-marker-input';
      inputEl.placeholder = inputPlaceholder;
      inputEl.value = inputValue;
      field.appendChild(inputEl);
      body.appendChild(field);
      // 聚焦
      setTimeout(function() { inputEl.focus(); inputEl.select(); }, 100);
    }

    modal.appendChild(body);

    // 底部按钮
    const footer = document.createElement('div');
    footer.className = 'html-diff-marker-modal-footer';

    if (type === 'confirm' || type === 'prompt') {
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'html-diff-marker-modal-btn html-diff-marker-modal-btn-cancel';
      cancelBtn.textContent = cancelText;
      cancelBtn.addEventListener('click', function() {
        closeModal(overlay, null, onCancel);
      }, true);
      footer.appendChild(cancelBtn);
    }

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'html-diff-marker-modal-btn html-diff-marker-modal-btn-confirm';
    confirmBtn.textContent = confirmText;
    confirmBtn.addEventListener('click', function() {
      const val = type === 'prompt' ? (inputEl ? inputEl.value : '') : true;
      closeModal(overlay, val, onConfirm);
    }, true);
    footer.appendChild(confirmBtn);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modalStack.push(overlay);

    // 点击遮罩关闭（仅 alert 类型）
    if (type === 'alert') {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          closeModal(overlay, null, onCancel);
        }
      }, true);
    }

    // Enter 键确认
    const onKeyDown = function(e) {
      if (e.key === 'Escape') {
        closeModal(overlay, null, onCancel);
      } else if (e.key === 'Enter' && (type === 'alert' || type === 'confirm' || type === 'prompt')) {
        const val = type === 'prompt' ? (inputEl ? inputEl.value : '') : true;
        closeModal(overlay, val, onConfirm);
      }
    };
    overlay.addEventListener('keydown', onKeyDown, true);
    overlay.setAttribute('tabindex', '-1');
    setTimeout(function() { overlay.focus(); }, 10);

    return overlay;
  }

  function closeModal(overlay, result, callback) {
    if (!overlay || overlay.__closing) return;
    overlay.__closing = true;
    // 退场动画：添加 CSS 类控制动画
    overlay.classList.add('hdm-modal-closing');
    setTimeout(function() {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      const idx = modalStack.indexOf(overlay);
      if (idx > -1) modalStack.splice(idx, 1);
      if (callback) {
        try { callback(result); } catch (e) {}
      }
    }, 180);
  }

  // 便捷方法：替代原生 alert / confirm / prompt
  function showAlert(message, title, onClose) {
    return showModal({
      title: title || '提示',
      content: message,
      type: 'alert',
      confirmText: '知道了',
      onConfirm: onClose || null
    });
  }

  function showConfirm(message, title, onConfirm, onCancel) {
    return showModal({
      title: title || '确认',
      content: message,
      type: 'confirm',
      confirmText: '确认删除',
      cancelText: '取消',
      onConfirm: function() { if (onConfirm) onConfirm(true); },
      onCancel: function() { if (onCancel) onCancel(false); }
    });
  }

  function showPrompt(message, defaultValue, title, onConfirm, onCancel) {
    return showModal({
      title: title || '请输入',
      content: message,
      type: 'prompt',
      inputValue: defaultValue || '',
      confirmText: '确定',
      cancelText: '取消',
      onConfirm: function(val) { if (onConfirm) onConfirm(val); },
      onCancel: function() { if (onCancel) onCancel(null); }
    });
  }

  // ================ 显示设置管理器 ================
  const DISPLAY_SETTINGS_KEY = 'htmlDiffMarker_displaySettings';
  const DEFAULT_DISPLAY_SETTINGS = {
    showBadges: true,
    showHandles: true,
    showShortcutHint: true
  };

  let displaySettingsManager = {
    settings: Object.assign({}, DEFAULT_DISPLAY_SETTINGS),
    _ready: false,

    init: function(callback) {
      const self = this;
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([DISPLAY_SETTINGS_KEY], function(result) {
            if (result && result[DISPLAY_SETTINGS_KEY]) {
              self.settings = Object.assign({}, DEFAULT_DISPLAY_SETTINGS, result[DISPLAY_SETTINGS_KEY]);
            }
            self._applyAll();
            self._ready = true;
            // sessionStorage fallback
            try {
              sessionStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(self.settings));
            } catch (e) {}
            if (callback) callback();
          });
          return;
        }
      } catch (e) {}
      // Fallback: sessionStorage
      try {
        const raw = sessionStorage.getItem(DISPLAY_SETTINGS_KEY);
        if (raw) {
          this.settings = Object.assign({}, DEFAULT_DISPLAY_SETTINGS, JSON.parse(raw));
        }
      } catch (e) {}
      this._applyAll();
      this._ready = true;
      if (callback) callback();
    },

    // 获取单个设置值
    get: function(key) {
      return this.settings[key] !== undefined ? this.settings[key] : true;
    },

    // 设置单个值并应用
    set: function(key, value) {
      this.settings[key] = value;
      this._applyOne(key, value);
      this._saveToStorage();
    },

    // 应用所有设置
    _applyAll: function() {
      this._applyOne('showBadges', this.settings.showBadges);
      this._applyOne('showHandles', this.settings.showHandles);
      this._applyOne('showShortcutHint', this.settings.showShortcutHint);
    },

    // 应用单个设置
    _applyOne: function(key, value) {
      if (key === 'showBadges') {
        if (value) {
          document.body.classList.remove('html-diff-marker-hide-badges');
        } else {
          document.body.classList.add('html-diff-marker-hide-badges');
        }
      } else if (key === 'showHandles') {
        if (value) {
          document.body.classList.remove('html-diff-marker-hide-handles');
        } else {
          document.body.classList.add('html-diff-marker-hide-handles');
        }
      } else if (key === 'showShortcutHint') {
        if (value) {
          document.body.classList.remove('html-diff-marker-hide-shortcut-hint');
        } else {
          document.body.classList.add('html-diff-marker-hide-shortcut-hint');
        }
      }
    },

    // 保存到存储
    _saveToStorage: function() {
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          const saveObj = {};
          saveObj[DISPLAY_SETTINGS_KEY] = this.settings;
          chrome.storage.local.set(saveObj);
        }
      } catch (e) {}
      try {
        sessionStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(this.settings));
      } catch (e) {}
    }
  };

  // ================ 设置面板 ================
  let settingsPanelEl = null;

  function openSettingsPanel(anchorEl) {
    if (settingsPanelEl) {
      closeSettingsPanel();
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'html-diff-marker-settings-panel';

    // 头部
    const header = document.createElement('div');
    header.className = 'html-diff-marker-settings-header';

    const title = document.createElement('div');
    title.className = 'html-diff-marker-settings-title';
    title.innerHTML = '<span class="settings-title-icon"></span><span>设置</span>';
    insertSvgIcon(title.querySelector('.settings-title-icon'), SVG_ICONS.settings);
    header.appendChild(title);

    panel.appendChild(header);

    // 内容区
    const body = document.createElement('div');
    body.className = 'html-diff-marker-settings-body';

    // --- 开关列表 ---
    const switchItems = [
      { label: '显示编号徽章', key: 'showBadges' },
      { label: '显示拖拽把手', key: 'showHandles' },
      { label: '启用快捷键提示', key: 'showShortcutHint' }
    ];

    switchItems.forEach(function(item, index) {
      const row = document.createElement('div');
      row.className = 'html-diff-marker-settings-row';
      if (index === switchItems.length - 1) {
        row.classList.add('html-diff-marker-settings-row--last');
      }

      const label = document.createElement('span');
      label.textContent = item.label;
      row.appendChild(label);

      // iOS 风格开关
      const toggle = document.createElement('div');
      toggle.className = 'html-diff-marker-settings-toggle';
      if (displaySettingsManager.get(item.key)) {
        toggle.classList.add('html-diff-marker-settings-toggle--on');
      }
      row.appendChild(toggle);

      row.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOn = toggle.classList.contains('html-diff-marker-settings-toggle--on');
        const newValue = !isOn;
        if (newValue) {
          toggle.classList.add('html-diff-marker-settings-toggle--on');
        } else {
          toggle.classList.remove('html-diff-marker-settings-toggle--on');
        }
        displaySettingsManager.set(item.key, newValue);
        showToast(item.label + (newValue ? '已开启' : '已关闭'), 'success', 1500);
      }, true);

      body.appendChild(row);
    });

    // --- 主题选择区域（浅灰背景） ---
    const themeSection = document.createElement('div');
    themeSection.className = 'html-diff-marker-settings-section';

    const themeLabel = document.createElement('div');
    themeLabel.className = 'html-diff-marker-settings-section-title';
    themeLabel.textContent = '主题选择';
    themeSection.appendChild(themeLabel);

    // 2×2 卡片网格
    const themeGrid = document.createElement('div');
    themeGrid.className = 'html-diff-marker-settings-theme-grid';

    const presets = themeManager.getPresets();
    const currentTheme = themeManager.getCurrentTheme();

    presets.forEach(function(preset) {
      const card = document.createElement('button');
      card.className = 'html-diff-marker-settings-theme-card';
      if (currentTheme.type === 'preset' && currentTheme.themeId === preset.id) {
        card.classList.add('html-diff-marker-settings-theme-card--active');
      }
      card.title = preset.name;

      // 渐变预览条（用主题色模拟渐变效果）
      const preview = document.createElement('div');
      preview.className = 'html-diff-marker-settings-theme-preview';
      hdmSetStyle(preview, 'background', 'linear-gradient(135deg, ' + preset.color + ', ' + preset.color + 'dd)');
      card.appendChild(preview);

      // 主题名称
      const nameEl = document.createElement('div');
      nameEl.className = 'html-diff-marker-settings-theme-name';
      nameEl.textContent = preset.name;
      card.appendChild(nameEl);

      // HEX 色值
      const hexEl = document.createElement('div');
      hexEl.className = 'html-diff-marker-settings-theme-hex';
      hexEl.textContent = preset.color.toUpperCase();
      card.appendChild(hexEl);

      card.addEventListener('click', function(e) {
        e.stopPropagation();
        themeManager.applyPreset(preset.id);
        // 更新选中状态
        themeGrid.querySelectorAll('.html-diff-marker-settings-theme-card').forEach(function(c) {
          c.classList.remove('html-diff-marker-settings-theme-card--active');
        });
        card.classList.add('html-diff-marker-settings-theme-card--active');
        showToast('已切换到' + preset.name + '主题', 'success', 1500);
      }, true);

      themeGrid.appendChild(card);
    });

    themeSection.appendChild(themeGrid);

    // 自定义颜色行
    const customRow = document.createElement('div');
    customRow.className = 'html-diff-marker-settings-custom-row';

    // 颜色预览方块
    const customPreview = document.createElement('div');
    customPreview.className = 'html-diff-marker-settings-custom-preview';
    var customColorVal = currentTheme.type === 'custom' && currentTheme.color ? currentTheme.color : '#70649A';
    var customColors = deriveColors(customColorVal);
    hdmSetStyle(customPreview, 'background', customColors.gradient);
    customRow.appendChild(customPreview);

    // HEX 输入框
    const customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.className = 'html-diff-marker-settings-custom-input';
    customInput.value = customColorVal.toUpperCase();
    customInput.placeholder = '#70649A';
    customInput.addEventListener('click', function(e) { e.stopPropagation(); });
    customInput.addEventListener('input', function(e) {
      e.stopPropagation();
      var val = this.value.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        var inputColors = deriveColors(val);
        hdmSetStyle(customPreview, 'background', inputColors.gradient);
      }
    });
    customInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        applyCustomColor();
      }
    });
    customRow.appendChild(customInput);

    // 应用按钮
    const customApply = document.createElement('button');
    customApply.className = 'html-diff-marker-settings-custom-apply';
    customApply.innerHTML = '→';
    customApply.title = '应用自定义颜色';
    customApply.addEventListener('click', function(e) {
      e.stopPropagation();
      applyCustomColor();
    }, true);
    customRow.appendChild(customApply);

    function applyCustomColor() {
      var val = customInput.value.trim();
      if (!/^#[0-9A-Fa-f]{6}$/.test(val)) {
        showToast('请输入有效的 HEX 颜色，如 #70649A', 'error', 2000);
        return;
      }
      var ok = themeManager.applyCustom(val);
      if (ok) {
        // 更新卡片选中状态
        themeGrid.querySelectorAll('.html-diff-marker-settings-theme-card').forEach(function(c) {
          c.classList.remove('html-diff-marker-settings-theme-card--active');
        });
        var appliedColors = deriveColors(val);
        hdmSetStyle(customPreview, 'background', appliedColors.gradient);
        customInput.value = val.toUpperCase();
        showToast('已应用自定义主题色', 'success', 1500);
      } else {
        showToast('颜色格式不正确', 'error', 2000);
      }
    }

    themeSection.appendChild(customRow);
    body.appendChild(themeSection);

    panel.appendChild(body);
    document.body.appendChild(panel);
    settingsPanelEl = panel;

    // 定位：贴齐工具栏下边缘，左边缘与工具栏左边缘对齐
    const toolbarEl = state.toolbarEl;
    if (toolbarEl) {
      const toolbarRect = toolbarEl.getBoundingClientRect();
      const panelWidth = 300;
      let left = toolbarRect.left;
      // 边界检测
      if (left < 8) left = 8;
      if (left + panelWidth > window.innerWidth - 8) left = window.innerWidth - panelWidth - 8;

      // 临时禁用动画以准确测量面板高度（防动画干扰）
      const prevAnimation = panel.style.animation;
      panel.style.animation = 'none';
      // 触发 reflow 确保获取准确高度
      const panelHeight = panel.offsetHeight;
      panel.style.animation = prevAnimation;

      // 计算上下可用空间
      const spaceBelow = window.innerHeight - toolbarRect.bottom - 8;
      const spaceAbove = toolbarRect.top - 8;

      let top;
      let maxHeight = null;

      if (spaceBelow >= panelHeight) {
        // 下方够放，优先放下方
        top = toolbarRect.bottom;
      } else if (spaceAbove >= panelHeight) {
        // 上方够放，放上方
        top = toolbarRect.top - panelHeight;
      } else {
        // 上下都不够，优先放下方并限高
        top = toolbarRect.bottom;
        maxHeight = spaceBelow;
      }

      // 确保 top 值不小于 8px
      if (top < 8) top = 8;

      const panelStyles = {
        position: 'fixed',
        left: left + 'px',
        top: top + 'px',
        transform: 'none'
      };
      if (maxHeight !== null) {
        panelStyles.maxHeight = maxHeight + 'px';
      }
      hdmSetStyles(panel, panelStyles);
    } else {
      hdmSetStyles(panel, {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      });
    }

    // 点击外部关闭
    setTimeout(function() {
      document.addEventListener('click', onSettingsOutsideClick, true);
    }, 10);

    return panel;
  }

  function onSettingsOutsideClick(e) {
    if (!settingsPanelEl) return;
    if (!settingsPanelEl.contains(e.target)) {
      closeSettingsPanel();
    }
  }

  function closeSettingsPanel() {
    if (!settingsPanelEl) return;
    document.removeEventListener('click', onSettingsOutsideClick, true);
    const panel = settingsPanelEl;
    settingsPanelEl = null;
    panel.classList.add('closing');
    panel.addEventListener('animationend', function() {
      if (panel.parentNode) panel.parentNode.removeChild(panel);
    }, true);
  }

  // ---------- 工具栏 ----------
  function updateToolbarCounts() {
    if (!state.toolbarEl) return;
    const elementEntries = state.markedElements.filter(m => m.type !== 'group');
    const countEl = state.toolbarEl.querySelector('.html-diff-marker-count-num');
    if (countEl) countEl.textContent = elementEntries.length;
    const modifiedEl = state.toolbarEl.querySelector('.html-diff-marker-modified-num');
    if (modifiedEl) modifiedEl.textContent = elementEntries.filter(m => m.modifiedHTML || hasStyleChanges(m)).length;
  }

  function renderToolbar() {
    if (state.toolbarEl) state.toolbarEl.remove();

    const bar = document.createElement('div');
    bar.className = 'html-diff-marker-toolbar';

    // ===== 头部（渐变 + 标题 + 窗口控制） =====
    const header = document.createElement('div');
    header.className = 'html-diff-marker-toolbar-header';

    const title = document.createElement('div');
    title.className = 'html-diff-marker-toolbar-title';
    title.textContent = 'Mark2AI';
    header.appendChild(title);

    const windowCtrl = document.createElement('div');
    windowCtrl.className = 'html-diff-marker-toolbar-window-ctrl';

    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'html-diff-marker-ctrl-btn';
    insertSvgIcon(minimizeBtn, SVG_ICONS.minus);
    minimizeBtn.setAttribute('title', '最小化');
    minimizeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      bar.classList.add('html-diff-marker-collapsed');
    }, true);
    windowCtrl.appendChild(minimizeBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'html-diff-marker-ctrl-btn';
    insertSvgIcon(closeBtn, SVG_ICONS.close);
    closeBtn.setAttribute('title', '隐藏工具栏');
    closeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      showWakeOnly();
    }, true);
    windowCtrl.appendChild(closeBtn);

    header.appendChild(windowCtrl);
    bar.appendChild(header);

    // 折叠状态下点击头部展开
    header.addEventListener('click', function(e) {
      if (bar.classList.contains('html-diff-marker-collapsed')) {
        e.preventDefault(); e.stopPropagation();
        bar.classList.remove('html-diff-marker-collapsed');
      }
    }, true);

    // ===== Body 区域 =====
    const body = document.createElement('div');
    body.className = 'html-diff-marker-toolbar-body';

    // --- 第一行：4 个操作按钮 ---
    const btnRow = document.createElement('div');
    btnRow.className = 'html-diff-marker-toolbar-btn-row';

    const actionButtons = [
      { action: 'select', label: '选择', cls: '' },
      { action: 'duplicate', label: '复制', cls: '' },
      { action: 'add', label: '新增', cls: '' },
      { action: 'delete', label: '删除', cls: 'html-diff-marker-btn--danger' }
    ];
    actionButtons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'html-diff-marker-action-btn ' + b.cls;
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
      btnRow.appendChild(btn);
    });
    body.appendChild(btnRow);

    // --- 第二行：重置 + 导出 + 设置 ---
    const exportRow = document.createElement('div');
    exportRow.className = 'html-diff-marker-export-row';

    // 重置按钮
    const resetBtn = document.createElement('button');
    resetBtn.className = 'html-diff-marker-side-btn';
    insertSvgIcon(resetBtn, SVG_ICONS.reset);
    resetBtn.setAttribute('title', '重置（清除所有标记）');
    resetBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      showConfirm('确定清除所有标记吗？', '清除确认', function(ok) {
        if (ok) clearAll();
      });
    }, true);
    exportRow.appendChild(resetBtn);

    // 导出按钮
    const exportBtn = document.createElement('button');
    exportBtn.className = 'html-diff-marker-export-btn';
    exportBtn.innerHTML = '<span class="html-diff-marker-export-icon"></span><span>导出 Diff</span>';
    insertSvgIcon(exportBtn.querySelector('.html-diff-marker-export-icon'), SVG_ICONS.export);
    exportBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      exportDiffMessage();
    }, true);
    exportRow.appendChild(exportBtn);

    // 设置按钮
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'html-diff-marker-side-btn';
    insertSvgIcon(settingsBtn, SVG_ICONS.settings);
    settingsBtn.setAttribute('title', '设置');
    settingsBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      openSettingsPanel(settingsBtn);
    }, true);
    exportRow.appendChild(settingsBtn);

    body.appendChild(exportRow);
    bar.appendChild(body);

    // ===== 底部信息栏 =====
    const footer = document.createElement('div');
    footer.className = 'html-diff-marker-toolbar-footer';

    // 左侧：快捷键提示（区分平台）
    const shortcut = document.createElement('div');
    shortcut.className = 'html-diff-marker-shortcut';
    var isMac = /Mac|iPhone|iPad/i.test(navigator.platform);
    var modKey = isMac ? '⌥' : 'Alt';
    shortcut.innerHTML =
      '<kbd class="html-diff-marker-kbd">' + modKey + '</kbd>' +
      '<kbd class="html-diff-marker-kbd">+</kbd>' +
      '<span class="html-diff-marker-shortcut-label">快速选择</span>';
    footer.appendChild(shortcut);

    // 右侧：计数
    const counts = document.createElement('div');
    counts.className = 'html-diff-marker-counts';
    counts.innerHTML = '<b class="html-diff-marker-count-num">0</b> 标记 <span class="html-diff-marker-counts-sep">·</span> <b class="html-diff-marker-modified-num">0</b> 修改';
    footer.appendChild(counts);

    bar.appendChild(footer);

    document.body.appendChild(bar);
    state.toolbarEl = bar;
    const br = bar.getBoundingClientRect();
    const bs = getComputedStyle(bar);

    // 恢复位置（先应用保存的位置，确保 JS 样式覆盖 CSS 默认样式）
    let hasSavedPos = false;
    try {
      const pos = JSON.parse(sessionStorage.getItem(POS_KEY) || '{}');
      if (pos && pos.left !== undefined && pos.top !== undefined) {
        hdmSetStyles(bar, {
          left: pos.left + 'px',
          top: pos.top + 'px',
          right: 'auto',
          bottom: 'auto'
        });
        hasSavedPos = true;
      }
    } catch(e) {}

    // 检查是否在视口内，不在则重置到默认位置
    function ensureToolbarInViewport() {
      if (!bar || !bar.parentNode) return;
      const rect = bar.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isOutOfView = rect.left < -rect.width || rect.left > vw ||
                         rect.top < -rect.height || rect.top > vh;
      if (isOutOfView) {
        const defaultRight = 20;
        const defaultTop = 20;
        const leftPos = Math.max(0, vw - rect.width - defaultRight);
        hdmSetStyles(bar, {
          left: leftPos + 'px',
          top: defaultTop + 'px',
          right: 'auto',
          bottom: 'auto'
        });
        try { sessionStorage.setItem(POS_KEY, JSON.stringify({ left: leftPos, top: defaultTop })); } catch(e) {}
      }
    }

    // 如果没有保存的位置，使用默认：右上角
    if (!hasSavedPos) {
      const defaultRight = 20;
      const defaultTop = 20;
      setTimeout(function() {
        if (!bar || !bar.parentNode) return;
        const barRect = bar.getBoundingClientRect();
        const leftPos = Math.max(0, window.innerWidth - barRect.width - defaultRight);
        hdmSetStyles(bar, {
          left: leftPos + 'px',
          top: defaultTop + 'px',
          right: 'auto',
          bottom: 'auto'
        });
      }, 10);
    }
    // 无论是否有保存位置，都检查是否在视口内
    setTimeout(ensureToolbarInViewport, 50);
    setTimeout(ensureToolbarInViewport, 200);
    makeDraggable(bar, header, function(l, t) {
      try { sessionStorage.setItem(POS_KEY, JSON.stringify({ left: l, top: t })); } catch(e) {}
    });
    updateToolbarCounts();
  }

  function showWakeOnly() {
    if (state.inspectorEl) closeInspector();
    if (state.toolbarEl) { state.toolbarEl.remove(); state.toolbarEl = null; }
    if (state.wakeBtn) { return; }
    const btn = document.createElement('div');
    btn.className = 'html-diff-marker-wake-btn';
    btn.setAttribute('title', 'Mark2AI - 点击显示工具栏');
    insertSvgIcon(btn, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>', { size: '18px' });
    btn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      btn.remove();
      state.wakeBtn = null;
      renderToolbar();
    }, true);
    document.body.appendChild(btn);
    state.wakeBtn = btn;
    const r = btn.getBoundingClientRect();
    const s = getComputedStyle(btn);
    const htmlTransform = getComputedStyle(document.documentElement).transform;
    const bodyTransform = getComputedStyle(document.body).transform;
    btn.classList.add('html-diff-marker-wake-pulse');
    setTimeout(function() { btn.classList.remove('html-diff-marker-wake-pulse'); }, 500);
  }

  // ---------- 编辑面板 ----------
  function closeInspector() {
    if (state.inspectorEl) {
      const rect = state.inspectorEl.getBoundingClientRect();
      if (rect && rect.left > 0 && rect.top > 0) {
        state.inspectorPos = { left: rect.left, top: rect.top };
        saveInspectorState({ pos: state.inspectorPos });
      }
      state.inspectorEl.remove();
      state.inspectorEl = null;
    }
    state.currentEditId = null;
  }

  // 创建编辑面板分组（V5 风格）
  function createInspectorGroup(title, showReset, onReset) {
    const group = document.createElement('div');
    group.className = 'html-diff-marker-group';

    const groupHeader = document.createElement('div');
    groupHeader.className = 'html-diff-marker-group-header';

    const groupTitle = document.createElement('div');
    groupTitle.className = 'html-diff-marker-group-title';
    groupTitle.textContent = title;
    groupHeader.appendChild(groupTitle);

    if (showReset) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'html-diff-marker-group-reset';
      resetBtn.textContent = '重置';
      resetBtn.setAttribute('title', '重置' + title);
      resetBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        if (onReset) onReset();
      }, true);
      groupHeader.appendChild(resetBtn);
    }

    group.appendChild(groupHeader);
    return group;
  }

  function openInspector(id) {
    const savedInspectorState = loadInspectorState();
    const savedPos = savedInspectorState.pos || state.inspectorPos;
    const savedSize = savedInspectorState.size || state.inspectorSize;
    const savedCollapsed = !!savedInspectorState.collapsed;
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
    panel.appendChild(topBar);

    // Header（标题 + 右侧控制按钮）
    const header = document.createElement('div');
    header.className = 'html-diff-marker-inspector-header';

    const title = document.createElement('span');
    title.className = 'html-diff-marker-inspector-title';
    title.textContent = '元素编辑';
    header.appendChild(title);

    // 右侧控制按钮组（折叠/关闭）
    const headerBtns = document.createElement('div');
    headerBtns.className = 'html-diff-marker-inspector-header-btns';

    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'html-diff-marker-inspector-header-btn html-diff-marker-collapse-btn';
    collapseBtn.innerHTML = '<span class="collapse-icon"></span>';
    insertSvgIcon(collapseBtn.querySelector('.collapse-icon'), SVG_ICONS.minus);
    collapseBtn.setAttribute('title', '最小化');
    let savedInlineHeight = '';
    let savedInlineWidth = '';
    collapseBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      const isCollapsed = panel.classList.toggle('html-diff-marker-collapsed');
      const iconEl = collapseBtn.querySelector('.collapse-icon');
      insertSvgIcon(iconEl, isCollapsed ? SVG_ICONS.plus : SVG_ICONS.minus);
      if (isCollapsed) {
        // 折叠时清除内联高度和宽度，让 CSS 的 height:auto 生效
        savedInlineHeight = panel.style.getPropertyValue('height') || '';
        savedInlineWidth = panel.style.getPropertyValue('width') || '';
        panel.style.removeProperty('height');
        panel.style.removeProperty('width');
        saveInspectorState({ collapsed: true });
      } else {
        // 展开时优先从持久化的 state.inspectorSize 恢复高度
        // 局部变量 savedInlineHeight 仅用于同一次打开内的折叠/展开快速恢复
        let restoreHeight = savedInlineHeight;
        let restoreWidth = savedInlineWidth;
        const storedState = loadInspectorState();
        const storedSize = storedState.size || state.inspectorSize;
        if (!restoreHeight && storedSize && storedSize.height) {
          restoreHeight = storedSize.height + 'px';
        }
        if (!restoreWidth && storedSize && storedSize.width) {
          restoreWidth = storedSize.width + 'px';
        }
        if (restoreHeight) {
          panel.style.setProperty('height', restoreHeight, 'important');
        }
        if (restoreWidth) {
          panel.style.setProperty('width', restoreWidth, 'important');
        }
        saveInspectorState({ collapsed: false });
      }
    }, true);
    headerBtns.appendChild(collapseBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'html-diff-marker-inspector-header-btn html-diff-marker-close-btn';
    insertSvgIcon(closeBtn, SVG_ICONS.close);
    closeBtn.setAttribute('title', '关闭');
    closeBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); closeInspector(); }, true);
    headerBtns.appendChild(closeBtn);

    header.appendChild(headerBtns);
    panel.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'html-diff-marker-inspector-body';

    // ===== 10 个分组（严格按顺序）=====

    // ① 组件标签
    const noteGroup = createInspectorGroup('组件标签', false);
    const noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.className = 'html-diff-marker-input';
    noteInput.value = entry.note || '';
    noteInput.placeholder = '简短备注文字，用于标识这个组件';
    noteInput.addEventListener('input', function() { entry.note = this.value; saveState(); });
    noteGroup.appendChild(noteInput);
    body.appendChild(noteGroup);

    // ② 修改说明（给 AI）
    const descGroup = createInspectorGroup('修改说明', false);

    const descTa = document.createElement('textarea');
    descTa.className = 'html-diff-marker-textarea';
    descTa.rows = 3;
    descTa.placeholder = '给 AI 看的修改说明...\n描述这次修改的目的、设计意图或具体变更内容';
    descTa.value = entry.description || '';
    descTa.addEventListener('input', function() { entry.description = this.value; saveState(); });
    descGroup.appendChild(descTa);

    const descPreviewBtn = document.createElement('button');
    descPreviewBtn.className = 'html-diff-marker-btn--ghost';
    hdmSetStyle(descPreviewBtn, 'marginTop', '8px');
    descPreviewBtn.textContent = '预览内容';
    descPreviewBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      const existing = descGroup.querySelector('.html-diff-marker-desc-preview');
      if (existing) {
        existing.remove();
        descPreviewBtn.textContent = '预览内容';
        return;
      }
      let html = descTa.value || '';
      html = escapeHtml(html);
      html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2" target="_blank" style="color:var(--hdm-primary);text-decoration:underline;">$1</a>');
      html = html.replace(/\n/g, '<br>');
      const preview = document.createElement('div');
      preview.className = 'html-diff-marker-desc-preview';
      preview.innerHTML = html;
      descGroup.appendChild(preview);
      descPreviewBtn.textContent = '隐藏预览';
    }, true);
    descGroup.appendChild(descPreviewBtn);

    body.appendChild(descGroup);

    // ③ 链接地址（a标签 或 有跳转的元素显示）
    const showLinkGroup = entry.tag === 'a' || (entry.modifiedHref && entry.modifiedHref !== '');
    if (showLinkGroup) {
      const linkGroup = createInspectorGroup('链接地址', true, function() {
        entry.modifiedHref = '';
        if (entry.tag === 'a' && el) {
          if (entry.originalHref) el.setAttribute('href', entry.originalHref);
          else el.removeAttribute('href');
        }
        if (entry.tag !== 'a' && el) {
          hdmSetStyle(el, 'cursor', '');
        }
        if (!hasStyleChanges(entry) && !entry.modifiedHTML) {
          el.classList.remove('html-diff-marker-modified');
        }
        saveState();
        openInspector(entry.id);
      });

      const linkInputWrap = document.createElement('div');
      linkInputWrap.className = 'html-diff-marker-link-input-wrap';

      const linkInput = document.createElement('input');
      linkInput.type = 'text';
      linkInput.className = 'html-diff-marker-input';
      const curHref = entry.modifiedHref !== undefined && entry.modifiedHref !== null
        ? entry.modifiedHref
        : (entry.originalHref || '');
      linkInput.value = curHref;
      linkInput.placeholder = entry.tag === 'a'
        ? '输入 href 链接地址，如 https://example.com'
        : '输入跳转链接，点击元素时在新窗口打开';
      linkInput.addEventListener('input', function() {
        entry.modifiedHref = this.value;
        if (entry.tag === 'a' && el) {
          el.setAttribute('href', this.value);
        }
        if (entry.tag !== 'a' && el) {
          hdmSetStyle(el, 'cursor', this.value ? 'pointer' : '');
        }
        if (this.value) {
          el.classList.add('html-diff-marker-modified');
        } else if (!hasStyleChanges(entry) && !entry.modifiedHTML) {
          el.classList.remove('html-diff-marker-modified');
        }
        saveState();
      });
      linkInputWrap.appendChild(linkInput);

      const previewBtn = document.createElement('button');
      previewBtn.className = 'html-diff-marker-btn--ghost';
      previewBtn.textContent = '预览';
      previewBtn.setAttribute('title', '预览链接内容');
      previewBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        const url = linkInput.value;
        if (url && url !== '') {
          window.open(url, '_blank');
        }
      }, true);
      linkInputWrap.appendChild(previewBtn);

      linkGroup.appendChild(linkInputWrap);
      body.appendChild(linkGroup);
    }

    // ③ 图片上传（仅限 img 元素）
    if (entry.tag === 'img') {
      const imgGroup = createInspectorGroup('图片上传', true, function() {
        if (el && entry.originalHTML) {
          const tmp = document.createElement('div');
          tmp.innerHTML = entry.originalHTML;
          const origImg = tmp.querySelector('img');
          if (origImg && origImg.src) {
            el.src = origImg.src;
            hdmSetStyle(imgPreview, 'backgroundImage', 'url(' + origImg.src + ')');
            imgPreview.classList.remove('empty');
          }
        }
        delete entry.modifiedStyles.content;
        saveState();
        openInspector(entry.id);
      });

      const imgPreview = document.createElement('div');
      imgPreview.className = 'html-diff-marker-image-preview';
      if (el && el.src) {
        hdmSetStyle(imgPreview, 'backgroundImage', 'url(' + el.src + ')');
      } else {
        imgPreview.classList.add('empty');
        imgPreview.textContent = '暂无图片预览';
      }
      imgGroup.appendChild(imgPreview);

      const imgUploadBtn = document.createElement('button');
      imgUploadBtn.className = 'html-diff-marker-btn--secondary';
      hdmSetStyle(imgUploadBtn, 'width', '100%');
      imgUploadBtn.textContent = '上传图片';
      imgUploadBtn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', function(ev) {
          const file = ev.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = function(ev2) {
            const url = ev2.target.result;
            if (el) el.src = url;
            entry.modifiedStyles.content = 'url(' + url + ')';
            hdmSetStyle(imgPreview, 'backgroundImage', 'url(' + url + ')');
            imgPreview.classList.remove('empty');
            saveState();
          };
          reader.readAsDataURL(file);
        });
        document.body.appendChild(fileInput);
        fileInput.click();
        setTimeout(function() { fileInput.remove(); }, 100);
      }, true);
      imgGroup.appendChild(imgUploadBtn);

      body.appendChild(imgGroup);
    }

    // ③ 文字样式已整合到样式编辑分组中，此处不再创建独立分组

    // ④ 位置调整
    const posGroup = createInspectorGroup('位置调整', true, function() {
      applyStyleChange(entry, 'left', '');
      applyStyleChange(entry, 'top', '');
      openInspector(entry.id);
    });

    const curLeft = Math.round(parseFloat(entry.modifiedStyles.left || entry.originalStyles.left) || 0);
    const curTop = Math.round(parseFloat(entry.modifiedStyles.top || entry.originalStyles.top) || 0);

    const leftSlider = createSlider({
      label: 'X（左偏移）',
      value: curLeft,
      min: -500,
      max: 500,
      step: 1,
      unit: 'px',
      onChange: function(val) {
        applyStyleChange(entry, 'left', val + 'px');
      }
    });
    posGroup.appendChild(leftSlider);

    const topSlider = createSlider({
      label: 'Y（上偏移）',
      value: curTop,
      min: -500,
      max: 500,
      step: 1,
      unit: 'px',
      onChange: function(val) {
        applyStyleChange(entry, 'top', val + 'px');
      }
    });
    posGroup.appendChild(topSlider);

    body.appendChild(posGroup);

    // ⑥ 大小调整
    const sizeGroup = document.createElement('div');
    sizeGroup.className = 'html-diff-marker-group';

    const sizeHeader = document.createElement('div');
    sizeHeader.className = 'html-diff-marker-group-header';
    const sizeTitle = document.createElement('div');
    sizeTitle.className = 'html-diff-marker-group-title';
    sizeTitle.textContent = '大小调整';
    sizeHeader.appendChild(sizeTitle);

    const sizeActions = document.createElement('div');
    sizeActions.className = 'html-diff-marker-group-actions';

    // 单位切换
    const unitToggle = document.createElement('div');
    unitToggle.className = 'html-diff-marker-unit-toggle';
    const pxBtn = document.createElement('button');
    pxBtn.className = 'html-diff-marker-unit-btn html-diff-marker-unit-btn--active';
    pxBtn.textContent = 'px';
    const pctBtn = document.createElement('button');
    pctBtn.className = 'html-diff-marker-unit-btn';
    pctBtn.textContent = '%';

    function isPctVal(v) { return typeof v === 'string' && v.indexOf('%') >= 0; }
    let displayUnitPx = !isPctVal(entry.modifiedStyles.width);
    if (!displayUnitPx) {
      pxBtn.classList.remove('html-diff-marker-unit-btn--active');
      pctBtn.classList.add('html-diff-marker-unit-btn--active');
    }

    unitToggle.appendChild(pxBtn);
    unitToggle.appendChild(pctBtn);

    // 重置按钮（放在单位切换容器内）
    const sizeReset = document.createElement('button');
    sizeReset.className = 'html-diff-marker-unit-reset';
    sizeReset.textContent = '重置';
    sizeReset.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      applyStyleChange(entry, 'width', '');
      applyStyleChange(entry, 'height', '');
      openInspector(entry.id);
    }, true);
    unitToggle.appendChild(sizeReset);

    sizeActions.appendChild(unitToggle);
    sizeHeader.appendChild(sizeActions);
    sizeGroup.appendChild(sizeHeader);

    const curWidthVal = isPctVal(entry.modifiedStyles.width)
      ? parseFloat(entry.modifiedStyles.width)
      : Math.round(parseFloat(entry.modifiedStyles.width || entry.originalStyles.width) || el.getBoundingClientRect().width);
    const curHeightVal = isPctVal(entry.modifiedStyles.height)
      ? parseFloat(entry.modifiedStyles.height)
      : Math.round(parseFloat(entry.modifiedStyles.height || entry.originalStyles.height) || el.getBoundingClientRect().height);

    const widthSlider = createSlider({
      label: '宽度',
      value: curWidthVal,
      min: 10,
      max: displayUnitPx ? 2000 : 200,
      step: displayUnitPx ? 1 : 0.1,
      unit: displayUnitPx ? 'px' : '%',
      onChange: function(val) {
        applyStyleChange(entry, 'width', val + (displayUnitPx ? 'px' : '%'));
      }
    });
    sizeGroup.appendChild(widthSlider);

    const heightSlider = createSlider({
      label: '高度',
      value: curHeightVal,
      min: 10,
      max: displayUnitPx ? 2000 : 200,
      step: displayUnitPx ? 1 : 0.1,
      unit: displayUnitPx ? 'px' : '%',
      onChange: function(val) {
        applyStyleChange(entry, 'height', val + (displayUnitPx ? 'px' : '%'));
      }
    });
    sizeGroup.appendChild(heightSlider);

    pxBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (displayUnitPx) return;
      displayUnitPx = true;
      pxBtn.classList.add('html-diff-marker-unit-btn--active');
      pctBtn.classList.remove('html-diff-marker-unit-btn--active');
      openInspector(entry.id);
    }, true);
    pctBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (!displayUnitPx) return;
      displayUnitPx = false;
      pctBtn.classList.add('html-diff-marker-unit-btn--active');
      pxBtn.classList.remove('html-diff-marker-unit-btn--active');
      openInspector(entry.id);
    }, true);

    body.appendChild(sizeGroup);

    // ⑥ 样式编辑
    const styleGroup = createInspectorGroup('样式编辑', true, function() {
      Object.keys(entry.modifiedStyles || {}).forEach(prop => {
        if (prop !== 'position' && prop !== 'left' && prop !== 'top'
          && prop !== 'width' && prop !== 'height') {
          applyStyleChange(entry, prop, '');
        }
      });
      openInspector(entry.id);
    });

    // 文字样式属性列表（整合到样式编辑分组）
    let fontHintEl = null;
    FONT_PROPS.forEach(sp => {
      const propRow = document.createElement('div');
      propRow.className = 'html-diff-marker-style-prop-row';

      const propLabel = document.createElement('span');
      propLabel.className = 'html-diff-marker-style-prop-label';
      propLabel.textContent = sp.label;
      propRow.appendChild(propLabel);

      const propControl = document.createElement('div');
      propControl.className = 'html-diff-marker-style-prop-control';

      let val = entry.modifiedStyles[sp.key] !== undefined
        ? entry.modifiedStyles[sp.key]
        : (entry.originalStyles ? entry.originalStyles[sp.key] : '');

      if (sp.type === 'select') {
        const selWrap = document.createElement('div');
        selWrap.className = 'html-diff-marker-select-wrap html-diff-marker-select-wrap--sm';
        const sel = document.createElement('select');
        sel.className = 'html-diff-marker-select';
        // 字体选项使用合并后的列表（预设 + 自定义）
        const options = sp.key === 'fontFamily' ? getMergedFontOptions() : sp.options;
        options.forEach(opt => {
          const o = document.createElement('option');
          const optVal = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : (opt || '(默认)');
          const optDisabled = typeof opt === 'object' && opt.disabled;
          o.value = optVal;
          o.textContent = optLabel;
          if (optDisabled) { o.disabled = true; }
          if (val === optVal) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', function() {
          applyStyleChange(entry, sp.key, this.value);
          // 字体选择变化时，更新字体提示条
          if (sp.key === 'fontFamily' && fontHintEl) {
            updateFontHint(fontHintEl, this.value);
          }
          const removeBtn = propControl.querySelector('.html-diff-marker-remove-font-btn');
          if (removeBtn) {
            const selectedValue = this.value;
            const isCustomFont = customFonts.some(function(f) { return f.value === selectedValue; });
            hdmSetStyle(removeBtn, 'display', isCustomFont ? 'inline-flex' : 'none');
          }
        });
        selWrap.appendChild(sel);
        const arrow = document.createElement('span');
        arrow.className = 'html-diff-marker-select-arrow';
        insertSvgIcon(arrow, SVG_ICONS.chevronDown);
        selWrap.appendChild(arrow);
        propControl.appendChild(selWrap);

        // 自定义字体按钮
        if (sp.key === 'fontFamily') {
          const addFontBtn = document.createElement('button');
          addFontBtn.className = 'html-diff-marker-btn--icon html-diff-marker-add-font-btn';
          addFontBtn.textContent = '+';
          addFontBtn.setAttribute('title', '添加自定义字体');
          addFontBtn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            showPrompt('请输入自定义字体名称（如 "Custom Font, sans-serif"）：', '', '添加自定义字体', function(customFont) {
              if (customFont) {
                const added = addCustomFont(customFont);
                if (added) {
                  showToast('自定义字体已添加', 'success');
                  applyStyleChange(entry, 'fontFamily', customFont);
                  openInspector(entry.id);
                } else {
                  showToast('该字体已存在于预设列表中', 'warning');
                }
              }
            });
          }, true);
          propControl.appendChild(addFontBtn);

          const removeFontBtn = document.createElement('button');
          removeFontBtn.className = 'html-diff-marker-btn--icon html-diff-marker-remove-font-btn';
          removeFontBtn.textContent = '−';
          removeFontBtn.setAttribute('title', '删除当前自定义字体');
          const selectedIsCustomFont = customFonts.some(function(f) { return f.value === sel.value; });
          hdmSetStyle(removeFontBtn, 'display', selectedIsCustomFont ? 'inline-flex' : 'none');
          removeFontBtn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const currentFont = sel.value;
            const isCustomFont = customFonts.some(function(f) { return f.value === currentFont; });
            if (!isCustomFont) {
              showToast('只能删除自定义字体', 'warning');
              return;
            }
            if (removeCustomFont(currentFont, entry)) {
              openInspector(entry.id);
            }
          }, true);
          propControl.appendChild(removeFontBtn);
        }

        propRow.appendChild(propControl);
        styleGroup.appendChild(propRow);

        // 字体三态提示（放在字体选择框下方）
        if (sp.key === 'fontFamily') {
          const fontHint = document.createElement('div');
          const curFont = val || '';
          const fontInfo = checkFontAvailable(curFont);
          let hintClass = 'html-diff-marker-font-hint';
          let iconHtml = '<span>i</span>';
          let msgText = '';
          if (fontInfo.status === 'success') {
            hintClass += ' success';
            iconHtml = SVG_ICONS.check;
            msgText = fontInfo.message;
          } else if (fontInfo.status === 'default') {
            hintClass += ' info';
            iconHtml = '<span>i</span>';
            msgText = fontInfo.message;
          } else {
            hintClass += ' warning';
            iconHtml = '<span>!</span>';
            msgText = fontInfo.message;
          }
          fontHint.className = hintClass;
          fontHint.innerHTML = '<span class="font-hint-icon"></span><span>' + escapeHtml(msgText) + '</span>';
          const iconEl = fontHint.querySelector('.font-hint-icon');
          if (fontInfo.status === 'success') {
            insertSvgIcon(iconEl, SVG_ICONS.check, { strokeWidth: 2.5 });
          } else {
            iconEl.innerHTML = iconHtml;
          }
          fontHintEl = fontHint;
          styleGroup.appendChild(fontHint);
        }
      } else if (sp.type === 'slider') {
        // 滑块类型：使用 createSlider 创建完整滑块行
        const numVal = parseFloat(val) || 0;
        const slider = createSlider({
          label: sp.label,
          value: numVal,
          min: sp.min,
          max: sp.max,
          step: sp.step,
          unit: sp.unit,
          onChange: function(v) {
            applyStyleChange(entry, sp.key, v + sp.unit);
          }
        });
        styleGroup.appendChild(slider);
      }
    });

    // 样式属性列表
    STYLE_PROPS.forEach(sp => {
      const propRow = document.createElement('div');
      propRow.className = 'html-diff-marker-style-prop-row';

      const propLabel = document.createElement('span');
      propLabel.className = 'html-diff-marker-style-prop-label';
      propLabel.textContent = sp.label;
      propRow.appendChild(propLabel);

      const propControl = document.createElement('div');
      propControl.className = 'html-diff-marker-style-prop-control';

      let val = entry.modifiedStyles[sp.key] !== undefined
        ? entry.modifiedStyles[sp.key]
        : (entry.originalStyles ? entry.originalStyles[sp.key] : '');

      if (sp.type === 'color') {
        // 颜色选择器包装
        const colorWrap = document.createElement('div');
        colorWrap.className = 'html-diff-marker-color-wrap';
        hdmSetStyle(colorWrap, 'backgroundColor', val || '#ffffff');

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'html-diff-marker-style-color';
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
        colorInput.addEventListener('input', function() {
          applyStyleChange(entry, sp.key, this.value);
          hdmSetStyle(colorWrap, 'backgroundColor', this.value);
        });
        colorWrap.appendChild(colorInput);
        propControl.appendChild(colorWrap);

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'html-diff-marker-input html-diff-marker-input--sm';
        textInput.value = val || '';
        textInput.placeholder = '';
        textInput.addEventListener('input', function() {
          applyStyleChange(entry, sp.key, this.value);
          if (this.value && this.value.startsWith('#')) {
            hdmSetStyle(colorWrap, 'backgroundColor', this.value);
          }
        });
        propControl.appendChild(textInput);

        propRow.appendChild(propControl);
        styleGroup.appendChild(propRow);
      } else if (sp.type === 'select') {
        const selWrap = document.createElement('div');
        selWrap.className = 'html-diff-marker-select-wrap html-diff-marker-select-wrap--sm';
        const sel = document.createElement('select');
        sel.className = 'html-diff-marker-select';
        sp.options.forEach(opt => {
          const o = document.createElement('option');
          const optVal = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : (opt || '(默认)');
          const optDisabled = typeof opt === 'object' && opt.disabled;
          o.value = optVal;
          o.textContent = optLabel;
          if (optDisabled) { o.disabled = true; }
          if (val === optVal) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', function() {
          applyStyleChange(entry, sp.key, this.value);
        });
        selWrap.appendChild(sel);
        const arrow = document.createElement('span');
        arrow.className = 'html-diff-marker-select-arrow';
        insertSvgIcon(arrow, SVG_ICONS.chevronDown);
        selWrap.appendChild(arrow);
        propControl.appendChild(selWrap);

        propRow.appendChild(propControl);
        styleGroup.appendChild(propRow);
      } else if (sp.type === 'slider') {
        // 滑块类型：使用 createSlider 创建完整滑块行
        const numVal = parseFloat(val) || 0;
        const slider = createSlider({
          label: sp.label,
          value: numVal,
          min: sp.min,
          max: sp.max,
          step: sp.step,
          unit: sp.unit,
          onChange: function(v) {
            applyStyleChange(entry, sp.key, v + sp.unit);
          }
        });
        styleGroup.appendChild(slider);
      } else {
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'html-diff-marker-input html-diff-marker-input--sm';
        textInput.value = val || '';
        textInput.placeholder = '';
        textInput.addEventListener('input', function() {
          applyStyleChange(entry, sp.key, this.value);
        });
        propControl.appendChild(textInput);

        propRow.appendChild(propControl);
        styleGroup.appendChild(propRow);
      }
    });

    // 样式统计
    const styleStats = document.createElement('div');
    styleStats.className = 'html-diff-marker-style-stats';
    styleStats.textContent = '已修改 ' + Object.keys(entry.modifiedStyles || {}).length + ' 个样式属性';
    styleGroup.appendChild(styleStats);

    body.appendChild(styleGroup);

    // 背景图分组（独立分组）
    const bgImageGroup = createInspectorGroup('背景图', true, function() {
      applyStyleChange(entry, 'backgroundImage', '');
      applyStyleChange(entry, 'backgroundSize', '');
      applyStyleChange(entry, 'backgroundRepeat', '');
      applyStyleChange(entry, 'backgroundPosition', '');
      openInspector(entry.id);
    });

    // 背景图预览区域
    const bgPreview = document.createElement('div');
    bgPreview.className = 'html-diff-marker-image-preview html-diff-marker-bg-preview';
    const curBgImage = entry.modifiedStyles.backgroundImage || (entry.originalStyles ? entry.originalStyles.backgroundImage : '');
    if (curBgImage && curBgImage !== 'none') {
      hdmSetStyle(bgPreview, 'backgroundImage', curBgImage);
    } else {
      bgPreview.classList.add('empty');
      bgPreview.textContent = '暂无背景图';
    }
    bgImageGroup.appendChild(bgPreview);

    // 上传按钮
    const bgImageBtn = document.createElement('button');
    bgImageBtn.className = 'html-diff-marker-btn--secondary';
    hdmSetStyle(bgImageBtn, 'width', '100%');
    hdmSetStyle(bgImageBtn, 'marginTop', '10px');
    bgImageBtn.textContent = '上传背景图';
    bgImageBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      fileInput.addEventListener('change', function(ev) {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev2) {
          const url = ev2.target.result;
          applyStyleChange(entry, 'backgroundImage', 'url(' + url + ')');
          applyStyleChange(entry, 'backgroundSize', 'contain');
          applyStyleChange(entry, 'backgroundRepeat', 'no-repeat');
          applyStyleChange(entry, 'backgroundPosition', 'center');
          openInspector(entry.id);
        };
        reader.readAsDataURL(file);
      });
      document.body.appendChild(fileInput);
      fileInput.click();
      setTimeout(function() { fileInput.remove(); }, 100);
    }, true);
    bgImageGroup.appendChild(bgImageBtn);

    // 说明文字
    const bgHint = document.createElement('div');
    bgHint.className = 'html-diff-marker-font-hint';
    bgHint.innerHTML = '<span>i</span><span>背景图将以 contain 模式居中显示，不会重复平铺。</span>';
    bgImageGroup.appendChild(bgHint);

    body.appendChild(bgImageGroup);

    // ⑧ HTML 编辑
    const htmlGroup = createInspectorGroup('HTML 编辑', false);

    const origLabel = document.createElement('div');
    origLabel.className = 'html-diff-marker-html-label';
    origLabel.textContent = '原始 HTML（只读）';
    htmlGroup.appendChild(origLabel);

    const origTa = document.createElement('textarea');
    origTa.className = 'html-diff-marker-textarea html-diff-marker-textarea--mono';
    origTa.rows = 3;
    origTa.readOnly = true;
    origTa.value = entry.originalHTML;
    htmlGroup.appendChild(origTa);

    const modLabel = document.createElement('div');
    modLabel.className = 'html-diff-marker-html-label';
    modLabel.textContent = '修改后的 HTML';
    htmlGroup.appendChild(modLabel);

    const modTa = document.createElement('textarea');
    modTa.className = 'html-diff-marker-textarea html-diff-marker-textarea--mono';
    modTa.rows = 3;
    modTa.placeholder = '在此输入修改后的 HTML 代码...';
    modTa.value = entry.modifiedHTML || '';
    modTa.addEventListener('input', function() {
      entry.modifiedHTML = this.value || null;
      saveState();
    });
    htmlGroup.appendChild(modTa);

    body.appendChild(htmlGroup);

    panel.appendChild(body);

    // ⑩ 底部操作栏
    const footer = document.createElement('div');
    footer.className = 'html-diff-marker-inspector-actions';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'html-diff-marker-btn html-diff-marker-btn--danger';
    removeBtn.textContent = '删除标记';
    removeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      showConfirm('确定要删除这个标记吗？删除后对应的所有修改也将一并清除。如需恢复请点击"↺"+刷新页面。', '删除确认', function(ok) {
        if (ok) removeMark(entry.id);
      });
    }, true);
    footer.appendChild(removeBtn);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'html-diff-marker-btn html-diff-marker-btn--primary';
    saveBtn.textContent = '保存修改';
    saveBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      saveState();
      applyMarkVisual(entry);
      closeInspector();
    }, true);
    footer.appendChild(saveBtn);

    panel.appendChild(footer);

    // 右下角拖拽调整大小把手
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'html-diff-marker-resize-handle-se';
    resizeHandle.setAttribute('title', '拖拽调整面板大小');
    let resizing = false, rStartX = 0, rStartY = 0, rStartW = 0, rStartH = 0, rStartTop = 0, rStartLeft = 0;
    resizeHandle.addEventListener('mousedown', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (e.button !== 0) return;
      resizing = true;
      rStartX = e.clientX; rStartY = e.clientY;
      const rect = panel.getBoundingClientRect();
      rStartW = rect.width; rStartH = rect.height;
      rStartTop = rect.top; rStartLeft = rect.left;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'nwse-resize';
    }, true);
    document.addEventListener('mousemove', function(e) {
      if (!resizing) return;
      e.preventDefault(); e.stopPropagation();
      const newW = Math.max(300, rStartW + (e.clientX - rStartX));
      const newH = Math.max(200, rStartH + (e.clientY - rStartY));
      hdmSetStyles(panel, {
        width: newW + 'px',
        height: newH + 'px',
        left: rStartLeft + 'px',
        top: rStartTop + 'px',
        right: 'auto',
        bottom: 'auto'
      });
    }, true);
    document.addEventListener('mouseup', function() {
      if (resizing) {
        resizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        const rect = panel.getBoundingClientRect();
        state.inspectorSize = { width: rect.width, height: rect.height };
        if (!panel.classList.contains('html-diff-marker-collapsed')) {
          saveInspectorState({ size: state.inspectorSize });
        }
      }
    }, true);
    panel.appendChild(resizeHandle);

    if (savedCollapsed) {
      panel.classList.add('html-diff-marker-collapsed');
      insertSvgIcon(collapseBtn.querySelector('.collapse-icon'), SVG_ICONS.plus);
    }

    document.body.appendChild(panel);
    state.inspectorEl = panel;

    // 恢复之前拖拽的位置
    if (savedPos && savedPos.left !== undefined && savedPos.top !== undefined) {
      hdmSetStyles(panel, {
        position: 'fixed',
        left: savedPos.left + 'px',
        top: savedPos.top + 'px',
        right: 'auto',
        bottom: 'auto'
      });
    }

    // 恢复面板大小
    if (!savedCollapsed && savedSize && savedSize.width && savedSize.height) {
      const sizeStyles = {
        width: savedSize.width + 'px',
        height: savedSize.height + 'px'
      };
      // 仅在已有自定义位置时清除 bottom/right，避免覆盖默认 CSS 位置
      if (savedPos && savedPos.left !== undefined && savedPos.top !== undefined) {
        sizeStyles.right = 'auto';
        sizeStyles.bottom = 'auto';
      }
      hdmSetStyles(panel, sizeStyles);
    }

    // 面板可拖拽
    makeDraggable(panel, header, function(l, t) {
      state.inspectorPos = { left: l, top: t };
      saveInspectorState({ pos: state.inspectorPos });
    });
    panel.addEventListener('click', function(e) { e.stopPropagation(); }, false);
  }

  // ---------- 组合编辑面板 ----------
  function openGroupInspector(groupId) {
    const savedInspectorState = loadInspectorState();
    const savedPos = savedInspectorState.pos || state.inspectorPos;
    const savedCollapsed = !!savedInspectorState.collapsed;
    closeInspector();
    const groupEntry = state.markedElements.find(m => m.id === groupId);
    if (!groupEntry || groupEntry.type !== 'group') return;
    state.currentEditId = groupId;
    const children = getGroupChildren(groupEntry);

    const panel = document.createElement('div');
    panel.className = 'html-diff-marker-inspector html-diff-marker-group-inspector';

    const header = document.createElement('div');
    header.className = 'html-diff-marker-inspector-header';
    const title = document.createElement('span');
    title.textContent = '组合标记（' + children.length + ' 个元素）';
    header.appendChild(title);
    const btnGroup = document.createElement('div');
    btnGroup.className = 'html-diff-marker-inspector-header-btns';

    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'html-diff-marker-inspector-header-btn html-diff-marker-collapse-btn';
    collapseBtn.innerHTML = '<span class="collapse-icon"></span>';
    insertSvgIcon(collapseBtn.querySelector('.collapse-icon'), SVG_ICONS.minus);
    collapseBtn.setAttribute('title', '最小化');
    let groupSavedInlineHeight = '';
    let groupSavedInlineWidth = '';
    collapseBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      const isCollapsed = panel.classList.toggle('html-diff-marker-collapsed');
      const iconEl = collapseBtn.querySelector('.collapse-icon');
      insertSvgIcon(iconEl, isCollapsed ? SVG_ICONS.plus : SVG_ICONS.minus);
      if (isCollapsed) {
        // 折叠时清除内联高度和宽度，让 CSS 的 height:auto 生效
        groupSavedInlineHeight = panel.style.getPropertyValue('height') || '';
        groupSavedInlineWidth = panel.style.getPropertyValue('width') || '';
        panel.style.removeProperty('height');
        panel.style.removeProperty('width');
        saveInspectorState({ collapsed: true });
      } else {
        // 展开时优先从持久化的 state.inspectorSize 恢复高度
        // 局部变量 groupSavedInlineHeight 仅用于同一次打开内的折叠/展开快速恢复
        let restoreHeight = groupSavedInlineHeight;
        let restoreWidth = groupSavedInlineWidth;
        if (!restoreHeight && state.inspectorSize && state.inspectorSize.height) {
          restoreHeight = state.inspectorSize.height + 'px';
        }
        if (!restoreWidth && state.inspectorSize && state.inspectorSize.width) {
          restoreWidth = state.inspectorSize.width + 'px';
        }
        if (restoreHeight) {
          panel.style.setProperty('height', restoreHeight, 'important');
        }
        if (restoreWidth) {
          panel.style.setProperty('width', restoreWidth, 'important');
        }
        saveInspectorState({ collapsed: false });
      }
    }, true);
    btnGroup.appendChild(collapseBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'html-diff-marker-inspector-header-btn html-diff-marker-close-btn';
    insertSvgIcon(closeBtn, SVG_ICONS.close);
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
    descLabel.textContent = '修改说明';
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
    scaleLabel.textContent = '整体缩放';
    scaleHeader.appendChild(scaleLabel);
    const scaleReset = document.createElement('button');
    scaleReset.className = 'html-diff-marker-style-reset-all';
    scaleReset.textContent = '重置';
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
    hdmSetStyle(scaleRange, 'flex', '1');
    scaleRange.addEventListener('input', function() {
      const v = parseFloat(this.value);
      groupEntry.groupScale = v;
      applyGroupMarkVisual(groupEntry);
      saveState();
      scaleVal.textContent = Math.round(v * 100) + '%';
    });
    scaleInpWrap.appendChild(scaleRange);
    const scaleVal = document.createElement('span');
    hdmSetStyles(scaleVal, {
      minWidth: '48px',
      textAlign: 'right',
      fontSize: '12px',
      color: 'var(--hdm-text-secondary)'
    });
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
    childrenLabel.textContent = '子元素列表';
    childrenHeader.appendChild(childrenLabel);
    childrenSection.appendChild(childrenHeader);

    children.forEach((child, idx) => {
      const row = document.createElement('div');
      row.className = 'html-diff-marker-child-row';
      hdmSetStyles(row, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 8px',
        borderBottom: '1px solid var(--hdm-divider)',
        cursor: 'pointer',
        fontSize: '12px'
      });
      row.addEventListener('mouseenter', function() { hdmSetStyle(row, 'background', 'var(--hdm-bg-hover)'); });
      row.addEventListener('mouseleave', function() { hdmSetStyle(row, 'background', ''); });
      row.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        openInspector(child.id);
      }, true);
      const leftInfo = document.createElement('div');
      hdmSetStyles(leftInfo, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });
      const idxSpan = document.createElement('span');
      hdmSetStyles(idxSpan, {
        display: 'inline-block',
        width: '20px',
        height: '20px',
        lineHeight: '20px',
        textAlign: 'center',
        background: 'var(--hdm-theme-primary)',
        color: 'white',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: '700'
      });
      idxSpan.textContent = idx + 1;
      leftInfo.appendChild(idxSpan);
      const tagSpan = document.createElement('span');
      hdmSetStyle(tagSpan, 'color', 'var(--hdm-text-secondary)');
      tagSpan.textContent = child.tag + (child.selector ? ' · ' + child.selector.split(' > ').slice(-1)[0] : '');
      leftInfo.appendChild(tagSpan);
      row.appendChild(leftInfo);
      const editBtn = document.createElement('button');
      editBtn.className = 'html-diff-marker-style-reset-all';
      hdmSetStyles(editBtn, {
        fontSize: '11px',
        padding: '2px 6px',
        minWidth: 'auto'
      });
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
    deleteBtn.className = 'html-diff-marker-btn html-diff-marker-btn--danger';
    deleteBtn.textContent = '删除组合';
    deleteBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      showConfirm('确定删除此组合标记吗？子元素标记也会一并删除。', '删除组合', function(ok) {
        if (ok) removeGroupMark(groupId);
      });
    }, true);
    footer.appendChild(deleteBtn);
    const ungroupBtn = document.createElement('button');
    ungroupBtn.className = 'html-diff-marker-btn html-diff-marker-btn--secondary';
    ungroupBtn.textContent = '解散组合';
    ungroupBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      ungroupMark(groupId);
    }, true);
    footer.appendChild(ungroupBtn);
    const saveBtn = document.createElement('button');
    saveBtn.className = 'html-diff-marker-btn html-diff-marker-btn--primary';
    saveBtn.textContent = '完成';
    saveBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      saveState();
      applyGroupMarkVisual(groupEntry);
      closeInspector();
    }, true);
    footer.appendChild(saveBtn);
    panel.appendChild(footer);

    if (savedCollapsed) {
      panel.classList.add('html-diff-marker-collapsed');
      insertSvgIcon(collapseBtn.querySelector('.collapse-icon'), SVG_ICONS.plus);
    }

    document.body.appendChild(panel);
    state.inspectorEl = panel;

    if (savedPos && savedPos.left !== undefined && savedPos.top !== undefined) {
      hdmSetStyles(panel, {
        position: 'fixed',
        left: savedPos.left + 'px',
        top: savedPos.top + 'px',
        right: 'auto',
        bottom: 'auto'
      });
    }
    if (state.inspectorSize && state.inspectorSize.width && state.inspectorSize.height) {
      const sizeStyles = {
        width: state.inspectorSize.width + 'px',
        height: state.inspectorSize.height + 'px'
      };
      if (savedPos && savedPos.left !== undefined && savedPos.top !== undefined) {
        sizeStyles.right = 'auto';
        sizeStyles.bottom = 'auto';
      }
      hdmSetStyles(panel, sizeStyles);
    }
    makeDraggable(panel, header, function(l, t) {
      state.inspectorPos = { left: l, top: t };
      saveInspectorState({ pos: state.inspectorPos });
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
    out += '请根据以下每个组件的 "原始 HTML" 和 "修改后的 HTML/样式" 逐一执行代码修改。在开始修改前，请先仔细阅读提供的修改说明，充分理解设计意图后再进行操作。执行过程中，如果发现不确认的修改内容，或者当前修改与项目中其他设计存在冲突，请立即停止修改并先与用户确认相关问题，得到明确答复后再继续执行修改操作。确保每一处修改都准确无误，符合设计要求，不会影响项目其他部分的正常功能。\n\n';
    out += '---\n\n';
    d.items.forEach(item => {
      out += '## ' + (item.tag ? item.tag + ' - ' : '') + '组件 #' + item.index + '\n\n';
      out += '- **元素**: ' + item.element + '\n';
      out += '- **CSS 选择器**: `' + item.selector + '`\n';
      out += '- **状态**: ' + (item.hasChange ? '**已修改**' : '仅标记，无修改') + '\n';
      if (item.note) out += '- **组件标签**: ' + item.note + '\n';
      if (item.description) out += '- **修改说明**: ' + item.description + '\n';
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
        out += '## 已删除 - ' + (item.tag ? item.tag + ' - ' : '') + '组件 #' + item.index + '\n\n';
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
      showToast('请先选择并标记一些元素。点击工具栏中的 "选择元素" 按钮。', 'warning');
      return;
    }
    const diffData = buildDiffData();
    try {
      chrome.runtime.sendMessage({ type: 'EXPORT_DIFF', payload: diffData }, function(resp) {
        if (resp && resp.ok) {
          showToast('Diff 文件已导出！共标记 ' + diffData.totalMarked + ' 个组件，' + diffData.totalModified + ' 个有修改。', 'success', 4000);
        } else {
          showTextExport(diffData);
        }
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
      try {
        toggleThreeState();
      } catch (e) { console.error('[HDM] toggleThreeState error:', e); }
      sendResponse({ ok: true });
      return true;
    }
    if (msg.type === 'QUICK_SELECT') {
      // 快速进入选择模式：确保工具栏显示，并进入选择模式
      if (!state.toolbarEl) {
        if (state.wakeBtn) {
          state.wakeBtn.remove();
          state.wakeBtn = null;
        }
        renderToolbar();
      }
      if (!state.isSelecting) startSelecting();
      sendResponse({ ok: true });
      return true;
    }
    // 初始化完成前，修改状态的操作直接返回（不执行）
    if (!state.initCompleted) {
      if (msg.type === 'GET_STATUS') {
        sendResponse({
          isSelecting: state.isSelecting, total: state.markedElements.length,
          modified: state.markedElements.filter(m => m.modifiedHTML || hasStyleChanges(m)).length
        });
        return true;
      }
      sendResponse({ ok: false, error: 'initializing' });
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
    if (window.__htmlDiffMarkerLoaded) { return; }
    window.__htmlDiffMarkerLoaded = true;
    try {
      if (document.body) {
        document.body.addEventListener('dblclick', onBodyDblClick, true);
      }
    } catch (e) { console.error('[HDM] dblclick bind error:', e); }
    try {
      chrome.runtime.onMessage.addListener(onMessage);
    } catch (e) { console.error('[HDM] onMessage register error:', e); }
    // 全局快捷键：Alt+"+" 快速进入选择模式
    document.addEventListener('keydown', function(e) {
      if (e.altKey && (e.key === '+' || e.key === '=' || e.code === 'Equal')) {
        e.preventDefault();
        if (!state.toolbarEl) {
          if (state.wakeBtn) { state.wakeBtn.remove(); state.wakeBtn = null; }
          renderToolbar();
        }
        if (!state.isSelecting) startSelecting();
      }
    }, true);
    // 先初始化主题和显示设置（异步加载，带兜底）
    let themeReady = false, displayReady = false, customFontsReady = false;
    function tryFinishInit() {
      if (themeReady && displayReady && customFontsReady) {
        // 异步加载状态（chrome.storage.local 优先，sessionStorage 兜底）
        loadState(function() {
          try {
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
          } catch (e) {
            // 恢复标记失败时，清空状态避免后续异常
            state.markedElements = [];
            state.domChanges = [];
          }
          // 标记初始化完成
          state.initCompleted = true;
        });
      }
    }
    // 加载自定义字体
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('htmlDiffMarker_customFonts', function(result) {
          if (result && result.htmlDiffMarker_customFonts && Array.isArray(result.htmlDiffMarker_customFonts)) {
            customFonts = result.htmlDiffMarker_customFonts;
          }
          customFontsReady = true; tryFinishInit();
        });
      } else {
        customFontsReady = true; tryFinishInit();
      }
    } catch (e) { customFontsReady = true; tryFinishInit(); }
    themeManager.init(function() { themeReady = true; tryFinishInit(); });
    displaySettingsManager.init(function() { displayReady = true; tryFinishInit(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // 全局错误捕获
  window.addEventListener('error', function(e) {
    console.error('[HDM] global error:', e.message, 'at', e.filename + ':' + e.lineno + ':' + e.colno, e.error);
  });
  window.addEventListener('unhandledrejection', function(e) {
    console.error('[HDM] unhandled rejection:', e.reason);
  });
})();
