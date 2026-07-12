# HTML 排版插件 - 问题排查报告

**排查日期**：2026-07-11
**排查人**：Hugo
**涉及文件**：
- `manifest.json`
- `background/background.js`
- `content/content.js`
- `content/content.css`

---

## 问题1（P0 阻断）：插件加载失败 - commands 快捷键格式不合法

### 问题描述
错误信息：`Invalid value for 'commands[1].default': Alt+Plus. 无法加载清单。`

### 现场分析
**位置**：`manifest.json` 第64-70行

```json
"quick-select": {
  "suggested_key": {
    "default": "Alt+Plus",
    "mac": "Alt+Plus"
  },
  "description": "快速进入选择模式"
}
```

### 根因分析

**Chrome Extension Commands API 支持的快捷键格式规范**：

Chrome 扩展的 `commands` API 对快捷键字符串有严格的格式要求：

1. **修饰键（Modifier keys）**：`Ctrl`、`Alt`、`Shift`、`MacCtrl`（Mac专用）、`Command`（Mac专用）
2. **主键（Primary key）** 支持以下类型：
   - 字母键：`A` - `Z`
   - 数字键：`0` - `9`
   - 功能键：`F1` - `F12`
   - 特殊键：`Comma`、`Period`、`Home`、`End`、`PageUp`、`PageDown`、`Space`、`Insert`、`Delete`、`ArrowUp`、`ArrowDown`、`ArrowLeft`、`ArrowRight`
   - 符号键（注意：**没有 `Plus` 这个键名**）：
     - `=` 键直接写 `=`（等号键，对应键盘上 + = 那个键）
     - `-` 键直接写 `-`（减号键）

3. **组合方式**：修饰键 + 主键，用 `+` 连接，如 `Ctrl+Shift+Y`

**"Alt+Plus" 不合法的原因**：
- `Plus` **不是** Chrome commands API 认可的有效键名
- Chrome 中表示 "+" 键应该使用 `=`（因为 + 和 = 共享同一个物理按键，Chrome 统一用 `=` 表示该键）

### 修复方案

将 `"Alt+Plus"` 改为 `"Alt+="`：

```json
"quick-select": {
  "suggested_key": {
    "default": "Alt+=",
    "mac": "Alt+="
  },
  "description": "快速进入选择模式"
}
```

### 验收手段
1. 修改 manifest.json 后，在 Chrome 扩展管理页面重新加载扩展
2. 确认不再报 "Invalid value" 错误
3. 按 Alt+= 快捷键，确认能触发快速选择模式

---

## 问题2：设置面板切换颜色功能检查

### 问题描述
设置切换颜色功能需要检查修复。

### 代码审查

#### 2.1 主题切换调用链

**设置面板主题色方块点击**（`content.js` 第2554-2574行）：
```javascript
presets.forEach(function(preset) {
  // ...
  swatch.addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation();
    themeManager.applyPreset(preset.id);  // ✓ 正确调用
    // 更新激活状态 + toast 提示
  });
  presetsRow.appendChild(swatch);
});
```

**applyPreset 函数**（`content.js` 第2059-2066行）：
```javascript
applyPreset: function(themeId) {
  const preset = PRESET_THEMES.find(function(t) { return t.id === themeId; });
  if (!preset) themeId = 'dusk-purple';
  this.currentTheme = themeId;
  this.customColor = null;
  document.body.setAttribute('data-theme', themeId);  // ✓ 正确设置 data-theme
  this._saveToStorage({ type: 'preset', themeId: themeId });
}
```

#### 2.2 CSS 四套主题变量定义（`content.css` 第226-267行）

| 主题 ID | 主色 | 变量定义 | 状态 |
|---------|------|----------|------|
| `deep-cyan` | #211E55（深海蓝） | 7个主题变量全部定义 | ✓ 完整 |
| `gray-green` | #6A8372（墨绿） | 7个主题变量全部定义 | ✓ 完整 |
| `dusk-purple` | #70649A（柔雾紫） | 7个主题变量全部定义 | ✓ 完整 |
| `warm-brown` | #9E7A7A（暖棕） | 7个主题变量全部定义 | ✓ 完整 |

主题定义的7个变量：
- `--hdm-theme-primary`
- `--hdm-theme-primary-light`
- `--hdm-theme-primary-dark`
- `--hdm-theme-gradient`
- `--hdm-theme-soft-bg`
- `--hdm-theme-soft-text`
- `--hdm-theme-count-text`

#### 2.3 发现的问题（P2 级）

**缺少 `--hdm-theme-alpha-20` 变量定义**

CSS 中有3处使用了 `--hdm-theme-alpha-20` 变量，但在所有预设主题和默认变量中都**没有定义**这个变量：

| 文件 | 行号 | 位置 |
|------|------|------|
| `content.css` | 2181 | `.html-diff-marker-group-reset:hover` 的背景色 |
| `content.css` | 2321 | `.html-diff-marker-reset-all-btn` 的边框 |
| `content.css` | 2325 | `.html-diff-marker-reset-all-btn:hover` 的背景色 |

**影响**：使用该变量的样式会回退到浏览器默认值（透明/无颜色），导致：
- 分组重置按钮 hover 时背景色不变化
- 重置全部按钮的边框不显示
- 重置全部按钮 hover 时背景色不变化

### 修复方案

在4套主题和 `:root` 默认变量中，各增加一行：
```css
--hdm-theme-alpha-20: rgba(..., ..., ..., 0.2);
```

以各主题的主色为基础，透明度 20%。具体值参考：

| 主题 | alpha-20 建议值 |
|------|----------------|
| deep-cyan | `rgba(33, 30, 85, 0.2)` |
| gray-green | `rgba(106, 131, 114, 0.2)` |
| dusk-purple | `rgba(112, 100, 154, 0.2)` |
| warm-brown | `rgba(158, 122, 122, 0.2)` |

另外，`applyCustom` 自定义主题也需要同步设置这个变量（在 `_applyCustomColors` 中增加）。

### 验收手段
1. 点击设置面板4个主题色方块，确认插件界面颜色正确切换
2. 鼠标悬停在分组重置按钮上，确认背景色有变化
3. 查看重置全部按钮，确认边框正常显示

---

## 问题3：多选复制/删除功能检查

### 问题描述
多选复制/删除功能需要检查修复。

### 代码审查

#### 3.1 发现的问题1（P1 级）：点击多选工具栏按钮会被 onClick 拦截

**位置**：`content.js` 第591-603行 `onClick` 函数

```javascript
function onClick(e) {
    if (!state.isSelecting) return;
    // ⚠️ 只排除了 toolbar 和 inspector，没有排除 multi-toolbar
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
```

同样的问题也存在于 `onHover` 函数（第583-589行）：
```javascript
function onHover(e) {
    if (!state.isSelecting) return;
    // ⚠️ 也没有排除 multi-toolbar
    if (e.target.closest('.html-diff-marker-toolbar') || e.target.closest('.html-diff-marker-inspector')) return;
    // ...
}
```

**根因**：选择模式下，`onClick` 和 `onHover` 在捕获阶段监听了整个 document 的事件，但只排除了主工具栏（`.html-diff-marker-toolbar`）和编辑面板（`.html-diff-marker-inspector`），**没有排除多选工具栏（`.html-diff-marker-multi-toolbar`）**。

**导致的后果**：
1. 鼠标悬停在多选工具栏上时，工具栏按钮会被加上 `html-diff-marker-highlight-hover` 高亮样式
2. 点击多选工具栏上的"复制"、"删除"等按钮时，点击事件被 `onClick` 捕获：
   - `e.preventDefault()` 和 `e.stopPropagation()` 被执行（但按钮自己的 listener 因为也是捕获阶段且先绑定？需要确认绑定顺序）
   - 更严重的是，点击后会触发 `markElement(el)` 或 `toggleMultiSelect(el)`，把工具栏按钮当作页面元素来标记/多选
   - 多选工具栏可能会意外关闭或行为异常

#### 3.2 发现的问题2（P2 级）：batchDuplicateSelected 对未标记元素无效

**位置**：`content.js` 第757-815行 `batchDuplicateSelected` 函数

```javascript
function batchDuplicateSelected() {
    const els = state.multiSelectedEls;
    // ...
    els.forEach(function(el) {
      try {
        // ⚠️ 从 markedElements 中查找，未标记的元素找不到
        const entry = state.markedElements.find(m => m._el === el && m.type !== 'group');
        if (!entry) { failCount++; return; }
        // ... 复制逻辑
      } catch (e) { failCount++; }
    });
}
```

**根因**：多选操作是在选择模式下通过 Shift+点击触发的，选中的元素**可能还没有被标记**（不在 `state.markedElements` 中）。而 `batchDuplicateSelected` 和 `batchRemoveMarks` 都假设元素已经被标记过。

`batchRemoveMarks` 也有同样的问题（第817-835行）。

### 修复方案

**问题1修复**：在 `onClick` 和 `onHover` 的排除条件中，增加多选工具栏的判断：

```javascript
// onClick 函数
if (e.target.closest('.html-diff-marker-toolbar') 
    || e.target.closest('.html-diff-marker-inspector')
    || e.target.closest('.html-diff-marker-multi-toolbar')) return;

// onHover 函数
if (e.target.closest('.html-diff-marker-toolbar') 
    || e.target.closest('.html-diff-marker-inspector')
    || e.target.closest('.html-diff-marker-multi-toolbar')) return;
```

**问题2修复**：
- 方案A（推荐）：对于未标记的元素，先标记再复制/操作
- 方案B：调整多选工具栏的按钮文案和行为，明确只对已标记元素有效，未标记元素时禁用按钮

### 验收手段
1. 进入选择模式，Shift+点击选中多个元素
2. 鼠标悬停在多选工具栏按钮上，确认按钮不被高亮
3. 点击"复制"按钮，确认能正常复制元素
4. 点击"删除"按钮，确认能正常删除标记

---

## 问题4：选择元素快捷键（Alt+"+"）实现检查

### 问题描述
选择元素快捷键功能需要检查修复。

### 三端对接审查

#### 4.1 manifest 定义（有问题，同问题1）

**位置**：`manifest.json` 第64-70行

```json
"quick-select": {
  "suggested_key": {
    "default": "Alt+Plus",   // ❌ 格式不合法
    "mac": "Alt+Plus"        // ❌ 格式不合法
  },
  "description": "快速进入选择模式"
}
```

**问题**：`Alt+Plus` 不是合法的快捷键格式。

#### 4.2 background.js 命令监听（正确）

**位置**：`background.js` 第17-38行

```javascript
chrome.commands.onCommand.addListener(function(command) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) return;
    try {
      let msgType = null;
      if (command === 'toggle-three-state') {
        msgType = 'TOGGLE_WAKE';
      } else if (command === 'quick-select') {   // ✓ 正确匹配
        msgType = 'QUICK_SELECT';
      }
      if (!msgType) return;
      chrome.tabs.sendMessage(tab.id, { type: msgType }, function(resp) {
        // content script 未注入时的兜底逻辑 ✓
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript(...);
        }
      });
    } catch(e) { console.error('Command failed:', e); }
  });
});
```

#### 4.3 content.js 消息响应（正确）

**位置**：`content.js` 第4264-4276行

```javascript
if (msg.type === 'QUICK_SELECT') {
    // 快速进入选择模式：确保工具栏显示，并进入选择模式
    if (!state.toolbarEl) {
      if (state.wakeBtn) {
        state.wakeBtn.remove();
        state.wakeBtn = null;
      }
      renderToolbar();
    }
    if (!state.isSelecting) startSelecting();  // ✓ 正确进入选择模式
    sendResponse({ ok: true });
    return true;
}
```

### 总结

| 端 | 状态 | 问题 |
|----|------|------|
| manifest | ❌ 有问题 | `Alt+Plus` 格式不合法 |
| background.js | ✓ 正确 | 命令监听和消息转发逻辑正确 |
| content.js | ✓ 正确 | QUICK_SELECT 消息响应逻辑正确 |

### 修复方案
同问题1，将 manifest.json 中的 `"Alt+Plus"` 改为 `"Alt+="`。

### 验收手段
1. 加载扩展，打开任意网页
2. 按 Alt+= 快捷键
3. 确认进入元素选择模式（光标变十字）

---

## 问题5：编辑面板元素信息位置

### 问题描述
编辑面板最上方不应展示元素信息（CSS选择器路径显示在顶部，应该在底部）。

### 代码审查

**位置**：`content.js` 第2954-3819行 `openInspector` 函数

#### 5.1 当前面板结构（从上到下）

```
┌─────────────────────────────────┐
│  顶部色条（topBar）              │
├─────────────────────────────────┤
│  窗口控制栏（最小化/关闭按钮）    │
├─────────────────────────────────┤
│  Header（标题 + 选择器） ← 问题所在│
│  元素编辑  div.container > p    │  ← CSS选择器在标题旁边
├─────────────────────────────────┤
│  Body（10个分组）               │
│  ① 组件标签                     │
│  ② 链接地址（条件显示）          │
│  ③ 字体设置                     │
│  ④ 大小位置                     │
│  ⑤ 样式调整                     │
│  ⑥ 边框阴影                     │
│  ⑦ 变换特效                     │
│  ⑧ HTML 编辑                    │
│  ⑨ 元素信息（CSS选择器）         │  ← 底部也有一个
│  ⑩ 底部操作栏（删除/保存）       │
└─────────────────────────────────┘
```

#### 5.2 Header 中的选择器（第2993-3006行）

```javascript
// Header（标题+选择器）
const header = document.createElement('div');
header.className = 'html-diff-marker-inspector-header';

const title = document.createElement('span');
title.className = 'html-diff-marker-inspector-title';
title.textContent = '元素编辑';
header.appendChild(title);

const selectorBadge = document.createElement('span');
selectorBadge.className = 'html-diff-marker-inspector-selector';
selectorBadge.textContent = entry.selector;   // ← 顶部的CSS选择器
header.appendChild(selectorBadge);
panel.appendChild(header);
```

#### 5.3 元素信息分组中的选择器（第3734-3741行）

```javascript
// ⑨ 元素信息
const infoGroup = createInspectorGroup('元素信息', false);
const infoContent = document.createElement('div');
infoContent.className = 'html-diff-marker-element-info-v5';
infoContent.innerHTML = '<span class="info-label">CSS 选择器</span><span class="info-value">' + escapeHtml(entry.selector) + '</span>';
infoGroup.appendChild(infoContent);
body.appendChild(infoGroup);
```

### 根因分析

1. **重复显示**：CSS选择器在 Header 和 元素信息分组中各显示了一次
2. **位置不符合用户期望**：Header 中的选择器显示在面板最上方（标题旁边），用户认为应该在底部
3. 第⑨个分组"元素信息"已经在比较靠下的位置（HTML编辑之后、底部操作栏之前）

### 修复方案

**推荐方案**：移除 Header 中的选择器显示（`selectorBadge`），保留底部第⑨分组的元素信息即可。

修改 `openInspector` 函数，删除以下代码（约第3002-3005行）：
```javascript
const selectorBadge = document.createElement('span');
selectorBadge.className = 'html-diff-marker-inspector-selector';
selectorBadge.textContent = entry.selector;
header.appendChild(selectorBadge);
```

如果希望元素信息在**最底部**（操作栏之后），则需要把第⑨组移到 footer 之后。但当前 footer 是操作按钮（删除/保存），通常操作按钮放在最底部更合理。建议保持元素信息在第⑨位（倒数第二），只移除 Header 中的重复显示。

### 验收手段
1. 标记一个元素，打开编辑面板
2. 确认面板顶部（标题旁边）不再显示CSS选择器
3. 确认下方"元素信息"分组中仍有CSS选择器显示

---

## 问题6：重置按钮符号（葡萄形状）问题

### 问题描述
重置的符号需要整体修复（截图显示重置按钮图标不对，像个葡萄形状）。

### 代码审查

#### 6.1 SVG 图标定义（正确）

**位置**：`content.js` 第2125行

```javascript
reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">
  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
  <path d="M3 3v5h5"/>
</svg>',
```

这是一个标准的**刷新/重置图标**（逆时针箭头循环），SVG 代码本身没有问题。
- `fill="none"` — 不填充，只用线条描边
- `stroke="currentColor"` — 线条颜色继承当前文字颜色
- 视觉上应该是一个圆形箭头

#### 6.2 CSS 中的问题（根因）

有两处 CSS 规则给重置按钮的 SVG 设置了 `fill: currentColor !important;`，**覆盖了 SVG 本身的 `fill="none"`**：

**位置1**：`content.css` 第2183-2188行 — 分组重置按钮

```css
.html-diff-marker-group-reset svg {
  width: 12px !important;
  height: 12px !important;
  fill: currentColor !important;   /* ❌ 错误：线条图标不应该被填充 */
  flex-shrink: 0 !important;
}
```

**位置2**：`content.css` 第2328-2332行 — 重置全部按钮

```css
.html-diff-marker-reset-all-btn svg {
  width: 14px !important;
  height: 14px !important;
  fill: currentColor !important;   /* ❌ 错误：线条图标不应该被填充 */
}
```

#### 6.3 为什么看起来像"葡萄"

reset 图标的路径是一个圆弧形加箭头：
```
<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
<path d="M3 3v5h5"/>
```

当 `fill: currentColor` 被应用后：
- 原本空心的圆弧路径被实心填充
- 加上小箭头的形状
- 整体变成一个不规则的、被填满的封闭形状
- 视觉上类似一串葡萄或一个奇怪的填充图形

#### 6.4 哪些重置按钮受影响

| 按钮位置 | 类名 | 受影响 | 原因 |
|---------|------|--------|------|
| 侧边栏（工具栏）重置按钮 | `.html-diff-marker-side-btn` | ❌ 不受影响 | 其 svg 样式没有设置 fill |
| 各分组标题旁的重置按钮 | `.html-diff-marker-group-reset` | ✅ 受影响 | CSS 设置了 `fill: currentColor` |
| 样式区的单个属性重置 | `.html-diff-marker-style-prop-reset` | 待确认 | 需检查其 CSS |
| 大小位置分组的重置按钮 | `.html-diff-marker-group-reset` | ✅ 受影响 | 同上 |
| 重置全部按钮 | `.html-diff-marker-reset-all-btn` | ✅ 受影响 | CSS 设置了 `fill: currentColor` |

### 修复方案

移除或修改以下两处 CSS 规则中的 `fill` 属性：

**修复1**：`.html-diff-marker-group-reset svg`
```css
.html-diff-marker-group-reset svg {
  width: 12px !important;
  height: 12px !important;
  /* fill: currentColor !important;  ← 删除这行，或改为 fill: none */
  flex-shrink: 0 !important;
}
```

**修复2**：`.html-diff-marker-reset-all-btn svg`
```css
.html-diff-marker-reset-all-btn svg {
  width: 14px !important;
  height: 14px !important;
  /* fill: currentColor !important;  ← 删除这行，或改为 fill: none */
}
```

**推荐**：改为 `fill: none !important;` 更明确，也能防止其他地方的 fill 样式意外继承过来。

### 验收手段
1. 打开编辑面板
2. 查看各分组标题旁的重置按钮，确认图标是正常的刷新箭头形状（线条风格）
3. 查看"重置全部"按钮，确认图标正常
4. 查看侧边栏重置按钮，确认不受影响

---

## 汇总：问题优先级与修复清单

| 编号 | 问题 | 优先级 | 根因 | 修复位置 |
|------|------|--------|------|----------|
| 1 | 插件加载失败（Alt+Plus不合法） | P0 | manifest commands 键名错误 | `manifest.json` 第66-67行 |
| 2 | 主题切换时部分hover样式不生效 | P2 | 缺少 `--hdm-theme-alpha-20` 变量 | `content.css` 4套主题定义处 |
| 3-1 | 多选工具栏按钮点击被拦截 | P1 | onClick/onHover 未排除多选工具栏 | `content.js` 第585、593行 |
| 3-2 | 批量复制对未标记元素无效 | P2 | 函数假设元素已标记 | `content.js` batchDuplicateSelected |
| 4 | 快捷键不生效 | P0 | 同问题1 | `manifest.json` |
| 5 | 编辑面板顶部显示选择器 | P2 | Header中有重复的selectorBadge | `content.js` openInspector |
| 6 | 重置图标像葡萄 | P1 | CSS fill 属性覆盖了 SVG 的 fill=none | `content.css` 两处 svg 规则 |

### P0 阻断级（必须先修复）
- 问题1/4：manifest.json 中 `Alt+Plus` → `Alt+=`

### P1 严重级
- 问题3-1：多选工具栏按钮点击事件被拦截
- 问题6：重置图标填充错误导致显示异常

### P2 主要级
- 问题2：缺少 --hdm-theme-alpha-20 变量
- 问题3-2：批量复制对未标记元素的处理
- 问题5：编辑面板顶部选择器重复显示
