# BugReport — 编辑面板最小化失效 & 主题切换失效 深度排查

| 项目 | HTML 排版插件 |
|------|--------------|
| 报告日期 | 2026-07-12 |
| 排查人员 | Hugo |
| 涉及文件 | `extension/content/content.js`、`extension/content/content.css` |

---

## 问题总览

本次排查覆盖两类问题：
1. **编辑面板最小化功能失效** — 点击编辑面板头部的最小化按钮（−）面板不折叠
2. **主题选择颜色切换失效** — 预设主题切换无反应；自定义颜色时，编辑面板底部按钮、清除确认弹窗未跟随切换

---

## 一、问题 1：编辑面板最小化功能失效

### 1.1 问题描述

点击编辑面板（Inspector Panel）头部右上角的最小化按钮（−），面板没有按预期折叠为只保留标题栏的状态。可能表现为：
- 点击按钮中心完全没反应
- 点击按钮边缘偶尔能触发
- 点击后面板高度不变甚至变长

**影响范围**：单元素编辑面板、组合标记编辑面板

---

### 1.2 根因分析

#### 根因 1（P0 级）：`makeDraggable` 按钮检测逻辑缺陷 — 点击按钮文本区域被拦截为拖拽

**代码位置**：`content/content.js` 第 534-564 行，具体在第 540 行

```javascript
function makeDraggable(el, handle, onPos) {
  let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
  handle.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    // 如果点击的是按钮，不触发拖拽（让按钮的 click 事件正常工作）
    const t = e.target;
    if (t && t.tagName === 'BUTTON') return;   // ← 问题在这里
    e.preventDefault(); e.stopPropagation();    // ← 阻止了事件继续传播
    dragging = true;
    // ...
  }, true);
  // ...
}
```

**问题详解**：

1. `e.target` 指向**实际触发事件的最内层元素**
2. 折叠按钮的 HTML 结构是 `<button>−</button>`，内部包含文本节点（Text Node）
3. 当用户点击按钮中心的文本（"−" 或 "×"）时，`e.target` 是**文本节点**，不是 `BUTTON` 元素
4. 文本节点的 `tagName` 为 `undefined`，因此 `t.tagName === 'BUTTON'` 判断失败
5. 判断失败后代码继续执行：
   - `e.preventDefault()` 和 `e.stopPropagation()` 被调用（捕获阶段）
   - 事件停止向下传播，按钮本身收不到 `mousedown`
   - `dragging = true`，进入拖拽模式
   - 因为按钮没有收到完整的 mousedown→mouseup 序列，`click` 事件不会在按钮上触发

**受影响的位置**：

| 面板 | makeDraggable 调用位置 | 头部按钮 |
|------|----------------------|----------|
| 主工具栏 | 第 3127 行附近 | 最小化、关闭 |
| 单元素编辑面板 | 第 4152 行 | 折叠、关闭 |
| 组合标记编辑面板 | 第 4420 行附近 | 折叠、关闭 |

**历史背景**：此问题在之前的排查报告（`BugReport-编号把手不可见-面板无法折叠.md`）中已经识别，但代码未修复，属于复发病例。

---

#### 根因 2（P1 级）：CSS 优先级冲突 — 内联 `!important` 覆盖了折叠样式

**代码位置**：
- `content.css` 第 2174-2182 行（折叠样式定义）
- `content.js` 第 4138-4148 行（面板尺寸恢复）
- `content.js` 第 85-89 行（`hdmSetStyle` 函数）

**折叠样式**：
```css
.html-diff-marker-inspector.html-diff-marker-collapsed {
  height: auto !important;
  min-height: 0 !important;
}
.html-diff-marker-inspector.html-diff-marker-collapsed .html-diff-marker-inspector-body,
.html-diff-marker-inspector.html-diff-marker-collapsed .html-diff-marker-inspector-actions,
.html-diff-marker-inspector.html-diff-marker-collapsed .html-diff-marker-resize-handle-se {
  display: none !important;
}
```

**面板尺寸恢复**：
```javascript
if (state.inspectorSize && state.inspectorSize.width && state.inspectorSize.height) {
  const sizeStyles = {
    width: state.inspectorSize.width + 'px',
    height: state.inspectorSize.height + 'px'
  };
  // ...
  hdmSetStyles(panel, sizeStyles);  // ← 内联样式 + !important
}
```

**`hdmSetStyle` 函数**：
```javascript
function hdmSetStyle(el, prop, value) {
  var cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
  el.style.setProperty(cssProperty, value, 'important');  // 第三个参数设置了 !important
}
```

**优先级冲突链**：

1. 用户拖拽调整了面板高度 → `state.inspectorSize` 保存了具体高度值
2. 下次打开面板 → `hdmSetStyles` 通过内联样式设置 `height: 620px !important`
3. 用户点击最小化 → 添加 `html-diff-marker-collapsed` 类 → CSS 规则 `height: auto !important`

**关键问题**：根据 CSS 优先级规则，**内联样式 + `!important`** 的优先级高于 **类选择器 + `!important`**，因此折叠状态的 `height: auto !important` 无法覆盖内联样式的 `height: 620px !important`。

**面板"变长"的原因**：由于 `height` 被锁定为之前拖拽调整的较大值，而折叠时 `display: none` 隐藏了 body 内容，但高度仍被内联样式强制设置为固定值，导致面板高度没有变化，视觉上看起来"没有折叠"甚至可能因为内容隐藏而显得"变长"。

**历史背景**：此问题在之前的排查报告（`BugReport-inspector-minimize.md`）中已经详细分析，但代码未修复，属于复发病例。

---

### 1.3 修复建议

#### 修复 1.1：`makeDraggable` 按钮检测使用 `closest()`

将 `t.tagName === 'BUTTON'` 改为使用 `closest()` 向上查找，兼容点击到按钮内部文本节点或图标子元素的情况：

```javascript
// 修改前（第 540 行）
if (t && t.tagName === 'BUTTON') return;

// 修改后
if (t && t.closest && t.closest('button')) return;
// 兜底：兼容不支持 closest 的极端情况
if (t && t.tagName === 'BUTTON') return;
```

**影响范围**：所有使用 `makeDraggable` 的面板（工具栏、单元素编辑面板、组合标记编辑面板）的头部按钮

---

#### 修复 1.2：折叠时清除内联高度样式

在折叠按钮的点击事件处理中，添加清除内联高度的逻辑：

**单元素编辑面板**（第 3287-3291 行）：
```javascript
collapseBtn.addEventListener('click', function(e) {
  e.preventDefault(); e.stopPropagation();
  panel.classList.toggle('html-diff-marker-collapsed');
  collapseBtn.textContent = panel.classList.contains('html-diff-marker-collapsed') ? '+' : '\u2212';
  
  // 新增：折叠时清除内联样式，让 CSS 规则生效
  if (panel.classList.contains('html-diff-marker-collapsed')) {
    panel.style.removeProperty('height');
    panel.style.removeProperty('width');
  } else {
    // 展开时恢复之前保存的尺寸
    if (state.inspectorSize && state.inspectorSize.width && state.inspectorSize.height) {
      hdmSetStyles(panel, {
        width: state.inspectorSize.width + 'px',
        height: state.inspectorSize.height + 'px'
      });
    }
  }
}, true);
```

**组合标记编辑面板**（第 4182-4186 行）同理修改。

---

### 1.4 验收手段

1. **按钮点击区域测试**：
   - 打开编辑面板，将鼠标精准悬停在「−」按钮的文本中心位置，单击
   - 预期：面板折叠，按钮变为「+」
   - 再次点击按钮文本中心：面板展开，按钮变为「−」

2. **折叠后高度测试**：
   - 拖拽调整面板高度为任意值（如 500px）
   - 点击最小化 → 面板应折叠为只显示头部（高度约 40-50px）
   - 点击展开 → 面板应恢复到之前调整的高度

3. **组合面板测试**：验证组合标记编辑面板的折叠/展开功能同样正常

4. **拖拽功能回归测试**：点击头部非按钮区域并拖动，面板应正常跟随鼠标移动，拖拽功能不受影响

---

## 二、问题 2：主题选择颜色切换失效

### 2.1 问题描述

1. 预设主题切换（点击设置面板中的 4 个主题卡片）后，界面颜色没有变化
2. 自定义颜色应用后，编辑面板下方按钮、清除确认弹窗的颜色没有跟随切换

**影响范围**：
- 预设主题（暮紫、深海蓝、墨绿、暖棕）切换
- 自定义主题色下的编辑面板底部按钮、模态弹窗

---

### 2.2 根因分析

#### 根因 1（P0 级）：`applyPreset` 未清除 `body.style` 上的自定义主题变量

**代码位置**：`content/content.js` 第 2263-2269 行

```javascript
applyPreset: function(themeId) {
  const preset = PRESET_THEMES.find(function(t) { return t.id === themeId; });
  if (!preset) themeId = 'dusk-purple';
  this.currentTheme = themeId;
  this.customColor = null;
  document.body.setAttribute('data-theme', themeId);
  this._saveToStorage({ type: 'preset', themeId: themeId });
  // ← 缺少：清除 body.style 上的自定义变量
},
```

**问题机制**：

1. 用户先应用自定义颜色 → `_applyCustomColors()` 通过 `body.style.setProperty()` 设置了 `--hdm-theme-primary` 等 9 个变量
2. 用户再切换到预设主题 → 只设置了 `data-theme` 属性，**没有清除** `body.style` 上的变量
3. 根据 CSS 优先级规则，**内联样式（`style` 属性）优先级高于 CSS 选择器规则（`[data-theme="xxx"]`）**
4. 因此 `body.style` 上的自定义变量覆盖了预设主题的变量，导致主题切换看起来"失效"

**证据链**：

| 步骤 | 操作 | body 上的变量来源 | 实际生效的颜色 |
|------|------|------------------|---------------|
| 1 | 初始状态 | `:root` 上的默认值 | 暮紫 #70649A |
| 2 | 应用自定义颜色 #E74C3C | `body.style`（内联） | 红色 #E74C3C |
| 3 | 切换到深海蓝主题 | `body.style` 仍在，优先级高于 `[data-theme]` | **还是红色**（bug） |
| 4 | （预期）切换到深海蓝 | `[data-theme="deep-cyan"]` CSS 规则 | 深海蓝 #211E55 |

---

#### 根因 2（P1 级）：`--hdm-shadow-primary-active` 等阴影变量未被主题化

**代码位置**：`content/content.css` 第 134-136 行、第 161-165 行

```css
/* 主色阴影（按钮/组件用） */
--hdm-shadow-primary: 0 4px 12px rgba(139, 92, 246, 0.3);       /* ← 硬编码紫色 */
--hdm-shadow-primary-hover: 0 4px 16px rgba(139, 92, 246, 0.4);  /* ← 硬编码紫色 */
--hdm-shadow-primary-active: 0 2px 8px rgba(139, 92, 246, 0.3);  /* ← 硬编码紫色 */

/* 主色半透明（紫） */
--hdm-primary-alpha-10: rgba(139, 92, 246, 0.1);   /* ← 硬编码紫色 */
--hdm-primary-alpha-15: rgba(139, 92, 246, 0.15);  /* ← 硬编码紫色 */
--hdm-primary-alpha-30: rgba(139, 92, 246, 0.3);   /* ← 硬编码紫色 */
--hdm-primary-alpha-40: rgba(139, 92, 246, 0.4);   /* ← 硬编码紫色 */
--hdm-primary-alpha-50: rgba(139, 92, 246, 0.5);   /* ← 硬编码紫色 */
```

这些变量在 `:root` 上硬编码为紫色（`rgba(139, 92, 246, x)`），没有被主题化。

**影响的组件**：

| 组件 | 使用的变量 | 视觉影响 |
|------|----------|---------|
| 主按钮默认状态阴影 | `--hdm-shadow-primary-active` | 按钮阴影永远是紫色 |
| 主按钮 hover 阴影 | `--hdm-primary-alpha-40` | hover 时阴影还是紫色 |
| 主按钮 active 阴影 | `--hdm-primary-alpha-30` | active 时阴影还是紫色 |
| 编辑面板底部按钮 | 同上 | 同上 |
| 模态弹窗确认按钮 | 同上 | 同上 |

虽然按钮的背景色（`--hdm-gradient-btn-primary`）会随主题变化，但阴影颜色不变，会导致"主题切换不彻底"的视觉感受。尤其是在自定义颜色与紫色差异较大时（如红色、绿色），紫色的阴影会显得很突兀。

---

#### 根因 3（P1 级）：自定义颜色变量设置不完整 — 缺少派生阴影变量

**代码位置**：`content/content.js` 第 2288-2299 行

```javascript
_applyCustomColors: function(colors) {
  const style = document.body.style;
  style.setProperty('--hdm-theme-primary', colors.primary);
  style.setProperty('--hdm-theme-primary-light', colors.light);
  style.setProperty('--hdm-theme-primary-dark', colors.dark);
  style.setProperty('--hdm-theme-gradient', colors.gradient);
  style.setProperty('--hdm-theme-soft-bg', colors.softBg);
  style.setProperty('--hdm-theme-soft-text', colors.softText);
  style.setProperty('--hdm-theme-count-text', colors.countText);
  style.setProperty('--hdm-theme-shadow', colors.shadow);
  style.setProperty('--hdm-theme-alpha-20', colors.alpha20);
},
```

`_applyCustomColors` 只设置了 9 个 `--hdm-theme-*` 变量，但没有设置 `--hdm-shadow-primary`、`--hdm-primary-alpha-40` 等桥接变量。

虽然 `--hdm-gradient-btn-primary` 等变量在 `:root` 上定义为 `var(--hdm-theme-gradient)`（可以正确继承），但 `--hdm-shadow-primary-active`、`--hdm-primary-alpha-40` 等变量是硬编码的紫色，**不是从 `--hdm-theme-*` 派生的**，因此自定义颜色时不会变化。

---

#### 根因 4（P2 级）：编辑面板底部按钮类名风格不统一 — 单元素面板使用 BEM 双连字符，组合面板使用单连字符

**代码位置**：
- 单元素编辑面板：第 4062 行（`html-diff-marker-btn--danger`）、第 4073 行（`html-diff-marker-btn--primary`）
- 组合编辑面板：第 4364 行（`html-diff-marker-btn-danger`）、第 4382 行（`html-diff-marker-btn-success`）

**类名风格差异**：
- 单元素面板使用 BEM 双连字符风格（`btn--danger`、`btn--primary`），与项目中主按钮等主流命名方式一致
- 组合面板使用单连字符风格（`btn-danger`、`btn-success`），属于旧风格命名

**`inspector-actions` 区域的特殊样式**（第 2985-3013 行）使用的是单连字符类名：
```css
.html-diff-marker-inspector-actions .html-diff-marker-btn-danger { ... }
.html-diff-marker-inspector-actions .html-diff-marker-btn-success { ... }
```

**视觉影响评估**：
虽然单元素面板的底部按钮类名（双连字符）与 `inspector-actions` 特殊样式的选择器（单连字符）不匹配，但由于 CSS 中同时存在 `button:first-child` / `button:last-child` 等位置选择器作为兜底，且两个面板底部都恰好有 2 个按钮（第一个为危险/删除按钮，第二个为主操作按钮），位置选择器能够正确命中两个按钮，因此**目前视觉上完全无差异**。

**风险说明**：
类名风格不统一本身属于代码维护风险（BEM 双连字符 vs 单连字符），但当前因 CSS 位置选择器兜底，功能与视觉均不受影响。优先级维持 P2。

---

### 2.3 关于 "自定义颜色时弹窗未跟随切换" 的补充说明

清除确认弹窗（`showConfirm` → `showModal`）的按钮样式使用了 `--hdm-gradient-btn-primary`，这个变量是从 `--hdm-theme-gradient` 派生的。理论上，如果 `--hdm-theme-gradient` 在 body 上被正确设置，弹窗按钮应该能继承到。

但是，如果用户在**应用自定义颜色之前**已经打开过弹窗（或弹出过其他模态框），那可能没有问题。但如果用户在**应用自定义颜色之后**才打开弹窗，新创建的弹窗应该能从 body 继承到正确的变量值。

**真正可能导致弹窗颜色不变的原因**：
1. 根因 1：如果之前设置了自定义颜色，再切换预设主题时不生效，用户可能误以为是"弹窗不变"
2. 根因 2：弹窗按钮的阴影是硬编码紫色的，背景色变了但阴影还是紫色，给人"没切换"的错觉
3. 根因 3：`--hdm-shadow-primary-active` 等阴影变量未被主题化

---

### 2.4 修复建议

#### 修复 2.1：`applyPreset` 中清除 `body.style` 上的自定义变量

在 `applyPreset` 函数中添加清除内联样式变量的逻辑：

```javascript
applyPreset: function(themeId) {
  const preset = PRESET_THEMES.find(function(t) { return t.id === themeId; });
  if (!preset) themeId = 'dusk-purple';
  this.currentTheme = themeId;
  this.customColor = null;
  
  // 新增：清除 body.style 上的自定义主题变量，让 CSS [data-theme] 规则生效
  const style = document.body.style;
  style.removeProperty('--hdm-theme-primary');
  style.removeProperty('--hdm-theme-primary-light');
  style.removeProperty('--hdm-theme-primary-dark');
  style.removeProperty('--hdm-theme-gradient');
  style.removeProperty('--hdm-theme-soft-bg');
  style.removeProperty('--hdm-theme-soft-text');
  style.removeProperty('--hdm-theme-count-text');
  style.removeProperty('--hdm-theme-shadow');
  style.removeProperty('--hdm-theme-alpha-20');
  
  document.body.setAttribute('data-theme', themeId);
  this._saveToStorage({ type: 'preset', themeId: themeId });
},
```

**注意**：必须使用 `style.removeProperty()` 而不是设置为空值，因为空值不等于"清除"。

---

#### 修复 2.2：将阴影等派生变量纳入主题化体系（推荐方案）

有两种实现方式：

**方案 A（推荐）：在 `:root` 中将阴影变量改为从 `--hdm-theme-*` 派生**

```css
/* 修改前 */
--hdm-shadow-primary: 0 4px 12px rgba(139, 92, 246, 0.3);
--hdm-shadow-primary-hover: 0 4px 16px rgba(139, 92, 246, 0.4);
--hdm-shadow-primary-active: 0 2px 8px rgba(139, 92, 246, 0.3);
--hdm-primary-alpha-10: rgba(139, 92, 246, 0.1);
--hdm-primary-alpha-30: rgba(139, 92, 246, 0.3);
--hdm-primary-alpha-40: rgba(139, 92, 246, 0.4);
--hdm-primary-alpha-50: rgba(139, 92, 246, 0.5);

/* 修改后 */
--hdm-shadow-primary: 0 4px 12px var(--hdm-theme-alpha-20);
--hdm-shadow-primary-hover: 0 4px 16px var(--hdm-theme-alpha-30);
--hdm-shadow-primary-active: var(--hdm-theme-shadow);
--hdm-primary-alpha-10: var(--hdm-theme-alpha-10);
--hdm-primary-alpha-30: var(--hdm-theme-alpha-20);
--hdm-primary-alpha-40: var(--hdm-theme-alpha-30);
--hdm-primary-alpha-50: var(--hdm-theme-alpha-40);
```

但这需要在 `deriveColors` 函数和 `_applyCustomColors` 中增加更多的派生变量（alpha-10, alpha-30, alpha-40 等）。

**方案 B（快速修复）：在 `_applyCustomColors` 中直接设置阴影变量**

```javascript
_applyCustomColors: function(colors) {
  const style = document.body.style;
  // ... 现有 9 个变量 ...
  
  // 新增：设置阴影派生变量
  style.setProperty('--hdm-shadow-primary', colors.shadow);
  style.setProperty('--hdm-shadow-primary-hover', '0 4px 16px ' + colors.alpha20.replace('0.2', '0.4'));
  style.setProperty('--hdm-shadow-primary-active', colors.shadow);
  style.setProperty('--hdm-primary-alpha-30', colors.alpha20);
  style.setProperty('--hdm-primary-alpha-40', colors.alpha20.replace('0.2', '0.4'));
  // ... 更多派生变量
},
```

方案 A 更优雅、更彻底，推荐采用。方案 B 是快速修复，但维护成本高。

---

#### 修复 2.3：完善 `deriveColors` 函数，增加 alpha 变量

如果采用方案 A，需要在 `deriveColors` 函数中增加更多透明度级别的派生色：

```javascript
// 现有：alpha20
// 新增：alpha-10, alpha-30, alpha-40, alpha-50
const alpha10 = hexToRgba(safePrimary, 0.1);
const alpha30 = hexToRgba(safePrimary, 0.3);
const alpha40 = hexToRgba(safePrimary, 0.4);
const alpha50 = hexToRgba(safePrimary, 0.5);

return {
  // ... 现有字段 ...
  alpha10: alpha10,
  alpha30: alpha30,
  alpha40: alpha40,
  alpha50: alpha50
};
```

同时在 4 套预设主题的 CSS 中也补充这些变量（虽然 `[data-theme]` 规则中已经定义了 `--hdm-theme-alpha-20`，但需要增加其他透明度级别）。

---

#### 修复 2.4：统一编辑面板底部按钮的类名

将单元素编辑面板底部按钮的类名从双连字符（BEM 风格）改为单连字符（与组合面板和 `inspector-actions` 特殊样式一致）：

```javascript
// 单元素编辑面板（第 4062 行）
// 修改前
removeBtn.className = 'html-diff-marker-btn--danger';
// 修改后
removeBtn.className = 'html-diff-marker-btn-danger';

// 第 4073 行
// 修改前
saveBtn.className = 'html-diff-marker-btn--primary';
// 修改后
saveBtn.className = 'html-diff-marker-btn-primary';
```

或者反过来，将组合面板和 CSS 特殊样式统一为双连字符风格。建议统一为双连字符（BEM 风格），与项目中主流命名方式一致。

---

### 2.5 验收手段

1. **预设主题切换测试**：
   - 先应用一个自定义颜色（如红色 #E74C3C）
   - 再点击深海蓝主题卡片
   - 验证：工具栏头部、主按钮、编辑面板顶部色条等都变为深海蓝色调
   - 依次切换 4 个预设主题，验证颜色都能正确切换

2. **自定义颜色 + 编辑面板按钮测试**：
   - 设置自定义颜色（如 #E74C3C 红色）
   - 打开编辑面板，观察底部按钮
   - 验证：按钮背景色为红色渐变，阴影也是红色系（不再是紫色）

3. **自定义颜色 + 清除确认弹窗测试**：
   - 设置自定义颜色
   - 点击"删除标记"或"清除所有标记"，弹出确认弹窗
   - 验证：弹窗头部渐变、确认按钮背景色都跟随自定义颜色

4. **按钮阴影主题化测试**：
   - 切换到暖棕主题
   - 观察主按钮的阴影颜色
   - 验证：阴影为暖棕色调，而不是紫色

5. **切换循环测试**：
   - 默认暮紫 → 自定义红 → 深海蓝 → 自定义绿 → 墨绿 → 自定义黄 → 暖棕
   - 每一步都验证颜色正确切换，无残留

---

## 三、问题汇总与优先级

| 编号 | 问题 | 根因 | 严重程度 | 代码位置 | 备注 |
|------|------|------|---------|---------|------|
| 1.1 | 编辑面板最小化按钮点击无效 | `makeDraggable` 按钮检测仅判断 `tagName`，点击文本节点失效 | P0 | `content.js` L540 | |
| 1.2 | 编辑面板折叠后高度不变 | 内联样式 `height:xxx !important` 优先级高于 CSS 类选择器 | P1 | `content.js` L4138-4148; `content.css` L2174-2182 | |
| 2.1 | 预设主题切换失效（从自定义切回时） | `applyPreset` 未清除 `body.style` 上的自定义变量 | P0 | `content.js` L2263-2269 | |
| 2.2 | 按钮阴影颜色不随主题变化 | `--hdm-shadow-primary-active` 等变量硬编码紫色 | P1 | `content.css` L134-136, L161-165 | 🔗 与 2.3 为关联根因（CSS 侧硬编码） |
| 2.3 | 自定义颜色时阴影不变 | `_applyCustomColors` 未设置阴影派生变量 | P1 | `content.js` L2288-2299 | 🔗 与 2.2 为关联根因（JS 侧未设置） |
| 2.4 | 编辑面板底部按钮类名风格不统一 | 单元素用 BEM 双连字符，组合面板用单连字符 | P2 | `content.js` L4062/4073 vs L4364/4382 | 目前因 CSS 位置选择器兜底，视觉无差异 |

---

## 四、修复优先级建议

### 第一优先级（必须修复）
1. **1.1 `makeDraggable` 按钮检测修复** — 影响所有面板的头部按钮交互
2. **1.2 折叠时清除内联高度** — 折叠功能的核心修复
3. **2.1 `applyPreset` 清除自定义变量** — 预设主题切换失效的核心修复

### 第二优先级（强烈建议修复）
4. **2.2/2.3 阴影变量主题化** — 提升主题切换的完整性和视觉一致性

### 第三优先级（建议优化）
5. **2.4 类名风格统一** — 代码一致性与可维护性优化，当前视觉无差异

---

## 五、关联文件

- `/Users/bytedance/Documents/trae_projects/HTML 排版插件/extension/content/content.js`
  - L534-564: `makeDraggable` 函数
  - L2263-2299: `themeManager.applyPreset` 和 `_applyCustomColors`
  - L3283-3292: 单元素编辑面板折叠按钮
  - L4058-4083: 单元素编辑面板底部按钮
  - L4127-4149: 面板尺寸恢复（内联样式）
  - L4178-4187: 组合编辑面板折叠按钮
  - L4361-4391: 组合编辑面板底部按钮
  - L2442-2528: 模态弹窗创建（`showModal`）

- `/Users/bytedance/Documents/trae_projects/HTML 排版插件/extension/content/content.css`
  - L8-18: `:root` 主题变量
  - L21-34: 桥接变量（`--hdm-primary`, `--hdm-gradient-btn-primary` 等）
  - L134-136: 硬编码的阴影变量（未主题化）
  - L161-165: 硬编码的 alpha 变量（未主题化）
  - L229-279: 4 套预设主题 `[data-theme]` 规则
  - L612-655: 主按钮样式（双连字符 `--primary`）
  - L883-919: 旧风格按钮样式（单连字符）
  - L2174-2182: 编辑面板折叠样式
  - L2953-3013: 编辑面板底部按钮特殊样式
  - L3123-3320: 模态弹窗样式
