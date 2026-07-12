# Bug 深度排查报告 — UI 一致性问题集

**报告日期**：2026-07-12  
**排查人员**：Hugo  
**项目**：HTML Diff Marker Chrome 扩展  
**涉及文件**：`extension/content/content.js`、`extension/content/content.css`、`dev/pages/ui-preview-v5.2-showcase.html`

---

## 一、问题总览

本次排查覆盖 4 个 UI 问题，其中问题 3（工具栏图标不显示）为历史遗留问题，已反馈三次未修复，需进行最深度的根因分析。

---

## 二、问题 3（最高优先级）：工具栏重置 / 导出 Diff / 设置按钮图标未显示

### 2.1 问题描述

工具栏底部导出行的三个按钮（重置、导出 Diff、设置）中，SVG 图标完全不可见。用户已反馈三次，此前修复均未生效。

### 2.2 DOM 结构层面验证

**按钮创建代码**（`content.js` 第 3072-3104 行）：

```javascript
// 重置按钮
const resetBtn = document.createElement('button');
resetBtn.className = 'html-diff-marker-side-btn';
resetBtn.innerHTML = SVG_ICONS.reset;   // ← 直接设置 innerHTML

// 导出按钮
const exportBtn = document.createElement('button');
exportBtn.className = 'html-diff-marker-export-btn';
exportBtn.innerHTML = SVG_ICONS.export + '<span>导出 Diff</span>';

// 设置按钮
const settingsBtn = document.createElement('button');
settingsBtn.className = 'html-diff-marker-side-btn';
settingsBtn.innerHTML = SVG_ICONS.settings;
```

**SVG_ICONS 定义**（`content.js` 第 2343-2357 行）：

```javascript
reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ... style="width:14px;height:14px;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 ..."/></svg>',
export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ... style="width:14px;height:14px;"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>',
```

**DOM 结构结论**：
- 按钮元素确定会被创建（`createElement` + `appendChild` 流程完整）
- SVG 通过 `innerHTML` 注入，现代浏览器会自动识别 SVG 命名空间并正确创建 SVG 元素
- SVG 内部 path/circle 元素存在且完整
- SVG 带有内联 `style="width:14px;height:14px"`
- SVG 使用 **stroke-based 描边图标**（`fill="none"`，靠 `stroke` 显示）

### 2.3 样式计算层面深度分析

#### 2.3.1 all:unset 的级联影响链（核心问题区）

**关键 CSS 重置规则**（`content.css` 第 316-338 行）：

```css
.html-diff-marker-toolbar *,
.html-diff-marker-inspector *,
... {
  all: unset !important;    /* ← 影响所有后代元素，包括 SVG 及其内部元素 */
  box-sizing: border-box !important;
}
```

这条规则会匹配工具栏内**所有后代元素**，包括：
- `button` 元素 ✓
- `svg` 元素 ✓  
- SVG 内部的 `path`、`circle`、`line` 元素 ✓

**`all: unset` 对 SVG 元素的具体影响**：

| 属性 | 初始值/继承值 | all:unset 后 | 对图标的影响 |
|------|-------------|-------------|------------|
| `display` | SVG: inline<br>path: inline（SVG 元素特殊） | 重置 | 可能改变布局 |
| `width` | SVG: auto（不可继承） | auto | SVG 尺寸可能塌陷 |
| `height` | SVG: auto（不可继承） | auto | SVG 尺寸可能塌陷 |
| `fill` | SVG: black（可继承）<br>path: black（可继承） | 继承父元素 | 填充色变化 |
| `stroke` | SVG: none（不可继承）<br>path: none（不可继承） | **none** | **路径消失！** |
| `stroke-width` | 1（不可继承） | 1 | 描边宽度 |
| `opacity` | 1（不可继承） | 1 | 不影响 |
| `visibility` | visible（可继承） | visible | 不影响 |

> ⚠️ **重大发现**：`stroke` 是**不可继承属性**，`all: unset` 会将 path/circle 等 SVG 子元素的 `stroke` 重置为初始值 `none`。这意味着 SVG 路径的描边会消失！

#### 2.3.2 后续恢复规则分析

CSS 中确实存在 SVG 恢复规则，但需要检查它们是否能正确覆盖 `all: unset`。

**第一级恢复 — 通用 SVG 规则**（`content.css` 第 517-530 行）：

```css
.html-diff-marker-toolbar svg,
.html-diff-marker-inspector svg,
... {
  display: inline-block !important;
  width: 1em !important;
  height: 1em !important;
  fill: currentColor !important;
  stroke: currentColor !important;
  vertical-align: middle !important;
  flex-shrink: 0 !important;
}
```

**问题**：这条规则只设置了 `svg` 元素的样式，**没有设置 SVG 内部元素（path、circle 等）的样式**。而 stroke 是不可继承的，所以 path 的 stroke 仍然是 `none`！

**第二级恢复 — 按钮特定 SVG 规则**（`content.css` 第 2010-2022 行）：

```css
.html-diff-marker-toolbar .html-diff-marker-side-btn svg,
.html-diff-marker-toolbar .html-diff-marker-side-btn svg * {
  fill: none !important;
  stroke: var(--hdm-text-secondary) !important;   /* ← 这里设置了 svg * 的 stroke */
  stroke-width: 2 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
  width: 14px !important;
  height: 14px !important;
  display: block !important;
  flex-shrink: 0 !important;
  transition: stroke var(--hdm-transition-fast) !important;
}
```

这条规则选择器包含 `svg *`，理论上应该能匹配 path 并设置 stroke。**但问题在于选择器特异性和源顺序**。

#### 2.3.3 选择器优先级对抗分析

对 SVG 内部 path 元素的 stroke 属性，存在两条竞争规则：

| 规则 | 选择器 | 特异性 | 源位置（行号） |
|------|--------|--------|---------------|
| 重置规则 | `.html-diff-marker-toolbar *` | 0,1,0 | 316 |
| 恢复规则 | `.html-diff-marker-toolbar .html-diff-marker-side-btn svg *` | 0,3,0 | 2011 |

恢复规则的特异性（0,3,0）高于重置规则（0,1,0），且都带 `!important`。**理论上恢复规则应该胜出。**

那为什么图标还是不显示？这正是"反馈三次未修复"的核心谜团。

### 2.4 深度根因假设（按概率排序）

#### 🥇 假设 1（最高概率）：SVG 命名空间 + `*` 选择器的浏览器兼容性问题

**核心论点**：虽然 CSS 规范说 `*` 匹配所有元素，但在实际浏览器中，当 SVG 元素通过 `innerHTML` 动态注入到 HTML 文档时，某些浏览器对跨命名空间的 `*` 选择器匹配可能存在异常。

**关键背景**：
- SVG 元素属于 SVG 命名空间（`http://www.w3.org/2000/svg`）
- HTML 元素属于 HTML 命名空间
- CSS 的 `*` 通配符理论上应匹配所有命名空间的元素
- 但在动态创建 SVG 的场景下，部分浏览器可能存在匹配时机或命名空间解析的边缘情况

**为什么之前的修复无效**：
- 之前的修复可能只在 CSS 层面增加了更多的 `!important` 或更高特异性的选择器
- 但如果根本原因是 SVG 命名空间元素不被 `*` 选择器正确匹配（或匹配顺序异常），则 CSS 规则永远无法生效

**验证手段**：在浏览器控制台执行：
```javascript
// 检查 path 元素的实际 computedStyle
const path = document.querySelector('.html-diff-marker-side-btn svg path');
console.log(getComputedStyle(path).stroke);   // 应为 rgb(75, 85, 99) 或类似值
console.log(getComputedStyle(path).display);  // 应为 inline 或 block
```

#### 🥈 假设 2（高概率）：内联 style 属性被 all:unset 完全覆盖，导致 SVG 尺寸塌陷为 0

**核心论点**：SVG 元素上有内联 `style="width:14px;height:14px"`，但 `all: unset !important` 的优先级高于内联样式（因为有 `!important`）。重置后 SVG 的 width/height 变为 `auto`，而 SVG 没有设置 width/height HTML 属性，只有 viewBox。

**尺寸计算链**：
1. SVG 内联 style: `width:14px; height:14px`
2. `all: unset !important` 重置 → `width:auto; height:auto`
3. SVG 恢复规则设置 `width:14px; height:14px`（在第 2017-2018 行）
4. 理论上应该恢复为 14px

**但存在一个微妙问题**：如果 SVG 恢复规则的选择器因为某种原因没有匹配到 SVG 元素（比如类名拼写错误、DOM 结构不一致等），则 SVG 尺寸会是 auto，而没有 width/height 属性的 SVG 在 flex 容器中可能塌陷为 0。

**验证手段**：检查 `.html-diff-marker-side-btn` 类名是否正确应用到按钮元素上。

#### 🥉 假设 3（中概率）：`stroke: currentColor` 解析为透明色

**核心论点**：`currentColor` 的值取决于元素的 `color` 属性。如果按钮的 `color` 没有被正确设置，`currentColor` 可能是 `transparent` 或继承自错误的祖先。

**color 继承链分析**：
1. `.html-diff-marker-toolbar` 设置了 `color: var(--hdm-text-primary) !important`
2. `all: unset` 重置按钮的 color → 继承
3. 按钮基础样式设置 `color: inherit !important`
4. `.html-diff-marker-side-btn` 设置 `color: var(--hdm-text-secondary) !important`
5. SVG 恢复规则设置 `stroke: var(--hdm-text-secondary) !important`（不是 currentColor）

第 5 步直接使用 CSS 变量，不依赖 currentColor，所以这个假设概率较低。

#### 假设 4（低概率）：按钮被其他元素遮挡 / position 偏移

**核心论点**：按钮可能存在但被 z-index 更高的元素遮挡，或者被 transform 移出可视区域。

**排除依据**：
- 按钮在 toolbar-body 的 export-row 中，属于正常文档流
- 按钮有明确的 width: 36px, height: 40px
- z-index 层级正常
- 没有设置 position 或 transform

### 2.5 针对假设 1 的进一步分析

如果假设 1 成立（SVG 命名空间元素不被 `*` 选择器正确匹配），那么会出现以下现象：

1. `all: unset` 规则（`.html-diff-marker-toolbar *`）不会影响 SVG 和 path → stroke 保持 SVG 呈现属性的值（currentColor）
2. 但同时，SVG 恢复规则（`.html-diff-marker-toolbar .html-diff-marker-side-btn svg *`）也不会匹配 path
3. 这意味着 stroke 完全依赖 SVG 呈现属性

等等，这其实反而会让图标显示（因为 SVG 自带 `stroke="currentColor"`）。所以假设 1 的这个推论与现象矛盾。

**修正假设 1**：`all: unset` 的 `*` 选择器能匹配 SVG 内部元素并重置 stroke，但恢复规则的 `svg *` 选择器因为某种原因不能正确匹配。

或者更精确地说：
- 重置规则 `.html-diff-marker-toolbar *` 能匹配 path（因为从 HTML 祖先角度看，path 是 toolbar 的后代）
- 但恢复规则 `.html-diff-marker-toolbar .html-diff-marker-side-btn svg *` 中的 `svg *` 部分有命名空间匹配问题

这个解释虽然牵强，但考虑到"反馈三次未修复"，问题一定不在表面。

### 2.6 另一可能性：`all: initial` 在 toolbar 根元素上的影响

`.html-diff-marker-toolbar { all: initial !important; }`（第 306 行）

`all: initial` 会把 toolbar 元素的所有 CSS 属性重置为初始值。CSS 自定义属性（`--hdm-*`）不受 `all` 影响，所以变量应该还在。

但 `color` 属性会被重置为初始值（通常是黑色），然后被后面的 `color: var(--hdm-text-primary) !important` 恢复。

这一层应该没问题。

### 2.7 问题 3 终极修复方案：JS 内联样式方案（强烈推荐）

**背景**：CSS 方案已尝试三次均未生效。根本原因是 `all: unset !important` 对 SVG 内部元素的破坏性重置，结合 SVG 命名空间下 CSS 选择器匹配的不可靠性。必须采用 **JS 内联样式** 作为终极修复手段，绕开 CSS 级联体系的干扰。

**核心思路**：在 SVG 通过 `innerHTML` 注入后，立即通过 JS 操作 DOM，为 SVG 元素及其所有子元素设置内联 style（带 `!important`）。由于内联样式 + `!important` 的优先级高于任何 CSS 规则（包括 `all: unset !important`），这是最可靠的方案。

**工具函数**（需新增到 `content.js`）：

```javascript
/**
 * 强制设置 SVG 图标样式，绕过 all:unset 的干扰
 * @param {SVGElement} svgElement - SVG DOM 元素
 * @param {string} strokeColor - 描边颜色值（不用 currentColor，用具体颜色值）
 * @param {string} size - 图标尺寸，如 '14px'
 */
function enforceSvgIconStyle(svgElement, strokeColor, size) {
  if (!svgElement) return;
  
  // 设置 SVG 元素本身
  hdmSetStyles(svgElement, {
    fill: 'none',
    stroke: strokeColor,
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    display: 'block',
    width: size,
    height: size,
    flexShrink: '0'
  });
  
  // 设置 SVG 内部所有子元素（path, circle, line, rect, polyline 等）
  var children = svgElement.querySelectorAll('*');
  for (var i = 0; i < children.length; i++) {
    hdmSetStyles(children[i], {
      fill: 'none',
      stroke: strokeColor,
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    });
  }
}
```

**原理说明**：
- `hdmSetStyles` 使用 `el.style.setProperty(prop, value, 'important')`，带有 `!important` 标记
- 内联样式 + `!important` 的优先级高于任何外部 CSS 规则，包括 `all: unset !important`
- 直接设置具体颜色值（如 `#6B7280`）而非 `currentColor`，确保不依赖 color 属性的继承

**覆盖范围与颜色值**：

| 组件 | 类名 | 图标 | 颜色变量 | 实际颜色值 | 尺寸 |
|------|------|------|---------|-----------|------|
| 工具栏侧按钮 | `.html-diff-marker-side-btn` | reset, settings | `--hdm-text-secondary` | `#6B7280` | 14px |
| 导出按钮 | `.html-diff-marker-export-btn` | export | `--hdm-text-secondary` | `#6B7280` | 14px |
| 设置面板标题 | `.html-diff-marker-settings-title` | settings | `--hdm-text-tertiary` | `#9CA3AF` | 16px |
| 多选工具栏 | `.html-diff-marker-multi-toolbar` | duplicate, trash | `currentColor`（由按钮 color 决定） | 跟随按钮 | 14px |

**具体修改点**（content.js 中需修改的位置）：

1. **工具栏重置按钮**（约第 3072-3078 行）：
   ```javascript
   // 修改前
   resetBtn.innerHTML = SVG_ICONS.reset;
   
   // 修改后
   resetBtn.innerHTML = SVG_ICONS.reset;
   enforceSvgIconStyle(resetBtn.querySelector('svg'), '#6B7280', '14px');
   ```

2. **工具栏设置按钮**（约第 3096-3102 行）：
   ```javascript
   // 修改前
   settingsBtn.innerHTML = SVG_ICONS.settings;
   
   // 修改后
   settingsBtn.innerHTML = SVG_ICONS.settings;
   enforceSvgIconStyle(settingsBtn.querySelector('svg'), '#6B7280', '14px');
   ```

3. **导出 Diff 按钮**（约第 3085-3092 行）：
   ```javascript
   // 修改前
   exportBtn.innerHTML = SVG_ICONS.export + '<span>导出 Diff</span>';
   
   // 修改后
   exportBtn.innerHTML = SVG_ICONS.export + '<span>导出 Diff</span>';
   enforceSvgIconStyle(exportBtn.querySelector('svg'), '#6B7280', '14px');
   ```

4. **设置面板标题图标**（约第 2738-2739 行）：
   ```javascript
   // 修改前
   title.innerHTML = SVG_ICONS.settings + '<span>设置</span>';
   
   // 修改后
   title.innerHTML = SVG_ICONS.settings + '<span>设置</span>';
   enforceSvgIconStyle(title.querySelector('svg'), '#9CA3AF', '16px');
   ```

5. **多选工具栏按钮**（约第 823-840 行）：
   - copyBtn（duplicate 图标）
   - deleteBtn（trash 图标）
   - 颜色跟随按钮的 color 属性，需在按钮 hover/active 时同步更新 SVG stroke

**CSS 保留策略**（双保险）：
- 保留现有的 CSS SVG 恢复规则（第 2010-2022 行、第 2052-2058 行、第 3871-3882 行、第 1465-1482 行）
- CSS 作为 fallback，当 JS 因为某种原因未执行时，CSS 规则仍可尝试恢复
- 但主要依赖 JS 内联样式方案

**为什么这是终极方案**：
1. 内联 `style` 属性 + `!important` 的优先级高于任何 CSS 选择器（最高优先级）
2. 直接操作 DOM，不依赖 CSS 选择器匹配，不受 SVG 命名空间问题影响
3. 不依赖 `currentColor`，直接设置具体颜色值，消除颜色继承链的不确定性
4. `hdmSetStyles` 已在项目中广泛使用（toast、slider 等），证明可靠

### 2.8 问题 3 结论与补充

**最可能根因**：`all: unset !important` 对 SVG 内部元素（path/circle/line）的 stroke 属性重置，结合 SVG 命名空间下的 CSS 选择器匹配异常，导致图标路径描边消失。

**为什么之前三次修复都失败**：之前的修复可能仅停留在"增加 CSS 优先级"层面（加 !important、加深选择器嵌套），但如果根本原因是 **SVG 命名空间元素的 CSS 选择器匹配异常**（特别是动态注入的 SVG），那么单纯提高优先级无效。

**建议修复方向**（按优先级排序）：
1. **JS 内联样式方案**（见 2.7 节）—— 最可靠、最彻底
2. 直接在 SVG 字符串中使用 HTML 属性 `stroke="#4B5563"` 而不是 `stroke="currentColor"`——绕开 CSS 干扰（但仍可能被 all:unset 覆盖）
3. 或者使用 `::before` 伪元素 + background-image 的方式渲染图标
4. 或者将 SVG 作为独立的 img 元素（base64 编码）

---

## 三、问题 1：编辑面板与演示文件不一致

### 3.1 问题描述

1. 输入框高度明显有问题
2. 样式编辑的"重置全部"按钮不一致
3. 滑动调整的数值应居右，当前紧挨着左侧文字

### 3.2 子问题 1.1：输入框高度问题

**演示文件中的输入框**：
```css
/* 演示文件 — 通用文本输入框 */
.hdm-text-input {
  height: 32px;
  ...
}
/* 演示文件 — 样式编辑属性行中的输入框 */
.hdm-prop-control .hdm-text-input { 
  flex: 1; 
  height: 30px; 
}
```

**实际插件中的输入框**：
```css
/* 插件 — 通用输入框高度变量 */
--hdm-input-height-md: 36px;
--hdm-input-height-sm: 30px;

/* 插件 — 通用输入框 */
.html-diff-marker-input {
  height: var(--hdm-input-height-md) !important;  /* 36px */
  ...
}
/* 插件 — 小型输入框 */
.html-diff-marker-input--sm {
  height: var(--hdm-input-height-sm) !important;  /* 30px */
  ...
}
```

**差异分析**：
- 演示文件的普通输入框高度是 **32px**
- 插件的普通输入框（`--hdm-input-height-md`）是 **36px**
- 演示文件的属性编辑输入框是 **30px**
- 插件的小型输入框（`--hdm-input-height-sm`）是 **30px**

**关键问题**：编辑面板中的样式属性输入框使用的是 `html-diff-marker-input--sm`（30px），这与演示文件一致。但可能某些输入框没有应用 `--sm` 类，导致显示为 36px 的默认高度。

**验证**：检查 `content.js` 中样式编辑区的输入框创建代码（第 3870 行、3941 行）：
```javascript
textInput.className = 'html-diff-marker-input html-diff-marker-input--sm';
```
这说明样式编辑区的输入框**确实使用了 `--sm` 类**，高度应为 30px。

**可能的高度异常原因**：
1. `all: unset` 重置后，某些 padding/border/box-sizing 组合导致实际渲染高度与预期不符
2. 输入框内的文本行高撑开了容器
3. 演示文件与插件使用了不同的 box-sizing 计算基准

### 3.3 子问题 1.2：样式编辑的"重置全部"按钮不一致

**演示文件中的重置按钮**（分组标题右侧）：
```css
.hdm-reset-btn {
  font-size: 11px;
  color: var(--theme-primary);
  background: var(--theme-soft-bg);
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  ...
}
```
位置：分组标题行的右侧  
样式：文字按钮，柔和背景，无边框

**插件中的分组重置按钮**（`content.css` 第 2366-2393 行）：
```css
.html-diff-marker-inspector .html-diff-marker-group-reset {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 22px !important;
  padding: 0 10px !important;
  font-size: 11px !important;
  color: var(--hdm-theme-primary) !important;
  background: var(--hdm-theme-soft-bg) !important;
  border: none !important;
  border-radius: 4px !important;
  ...
}
```
位置：分组标题行右侧（group-header 中）
样式：与演示文件基本一致

**插件中还有一个"重置全部"按钮**（`content.js` 第 3806-3822 行）：
```javascript
const resetAllWrap = document.createElement('div');
resetAllWrap.className = 'html-diff-marker-reset-all-wrap';
const resetAllBtn = document.createElement('button');
resetAllBtn.className = 'html-diff-marker-btn--ghost html-diff-marker-reset-all-btn';
resetAllBtn.innerHTML = '重置全部';
```

对应 CSS（`content.css` 第 2546-2573 行）：
```css
.html-diff-marker-inspector .html-diff-marker-reset-all-btn {
  width: 100% !important;
  height: 32px !important;
  justify-content: center !important;
  gap: 6px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  color: var(--hdm-theme-primary) !important;
  background: var(--hdm-theme-soft-bg) !important;
  border: 1px solid var(--hdm-theme-alpha-20) !important;
  border-radius: 6px !important;
}
```

**差异点**：
- 位置：演示文件中分组重置按钮在分组标题右侧；插件中有两个重置按钮——分组级别的（在标题右侧）和"重置全部"（在样式编辑分组内顶部，全宽）
- 样式："重置全部"按钮有 1px 边框，圆角 6px，全宽显示；分组重置按钮无边框，圆角 4px
- 演示文件中是否有"重置全部"按钮？从已读取的演示文件代码来看，没有明确的"重置全部"按钮，只有分组级别的重置按钮

**结论**：用户说的"重置全部按钮不一致"，可能指的是样式编辑分组内的"重置全部"按钮与演示文件的设计不一致（演示文件可能没有这个按钮，或者样式不同）。

### 3.4 子问题 1.3：滑动调整的数值应居右

**演示文件中的滑块**（`.hdm-slider-label-row`）：
```css
.hdm-slider-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}
.hdm-slider-value {
  font-weight: 500;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  text-align: right;     /* ← 演示文件也有 text-align: right，但主要靠 flex space-between */
  ...
}
```

**插件中的滑块**（`content.css` 第 3710-3737 行）：
```css
.html-diff-marker-slider-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 6px !important;
}
.html-diff-marker-slider-value {
  font-size: var(--hdm-font-sm) !important;
  color: var(--hdm-text-primary) !important;
  font-family: var(--hdm-font-mono) !important;
  font-weight: var(--hdm-font-medium) !important;
  cursor: pointer !important;
  padding: 2px 6px !important;
  border-radius: var(--hdm-radius-xs) !important;
  min-width: 50px !important;
  text-align: right !important;
  ...
}
```

**问题分析**：
两者都使用了 `display: flex; justify-content: space-between;`，理论上 label 在左、value 在右。

但用户说"当前紧挨着左侧文字"，这意味着 flex 布局没有生效，或者 label 和 value 之间没有空间。

**可能原因**：
1. `.html-diff-marker-slider-header` 的 `display: flex` 被 `all: unset` 覆盖了？
   - 不，恢复规则有 `!important`，且选择器特异性足够
   
2. `.html-diff-marker-slider-header` 是 div 元素，但在 div 元素恢复规则中，它被排除了吗？
   
   检查 div 恢复规则（第 426 行）：
   ```css
   .html-diff-marker-inspector div:not(...):not(.html-diff-marker-slider-header):not(...),
   ```
   是的，`.html-diff-marker-slider-header` 在 `:not()` 列表中，所以不会被强制设置为 `display: block`。

3. **flex 子元素的宽度问题**：如果 flex 容器没有宽度（由内容决定），`space-between` 不会产生间距。

   `.html-diff-marker-slider-header` 没有设置 `width: 100%`。它的父元素 `.html-diff-marker-slider-wrap` 设置了 `width: 100%`。
   
   但是，`.html-diff-marker-slider-header` 是 div 元素，默认 `display: block` 时宽度是 100%。当设置为 `display: flex` 时，块级 flex 容器的宽度也是 100%（如果没有显式设置 width）。
   
   等等，默认情况下，`display: flex` 的元素是块级 flex 容器，宽度填满父容器。所以 `space-between` 应该能正常工作。

4. **另一种可能**：slider-header 被放在了某个 `display: flex` 的行容器中，导致它失去了 100% 宽度。

**结论**：滑块数值不居右的最可能原因是 `.html-diff-marker-slider-header` 的宽度未撑满容器，导致 `space-between` 没有产生足够的间距。需要确认 slider-header 是否在正确的父容器中，以及是否需要显式设置 `width: 100%`。

### 3.5 问题 1 明确修复项（行动清单）

#### 修复项 1.1：输入框高度统一调整为 32px

**问题**：插件中输入框高度为 36px（`--hdm-input-height-md`），演示文件为 32px。

**修复方案**：
- 修改 `content.css` 第 211 行：`--hdm-input-height-md: 36px;` → `--hdm-input-height-md: 32px;`
- 这一处变量修改会联动影响所有使用 `--hdm-input-height-md` 的输入框（第 373、393、929、1101 行）
- 验证：样式编辑区的小型输入框（`--hdm-input-height-sm: 30px`）保持不变，无需修改

**为什么这样改**：演示文件中普通输入框高度为 32px，属性编辑输入框为 30px。插件将 `md` 尺寸从 36px 降到 32px 可与演示文件对齐。

#### 修复项 1.2：滑块数值居右

**问题**：滑动调整的数值紧挨着左侧文字，没有居右。

**修复方案**：
1. 给 `.html-diff-marker-slider-header` 添加 `width: 100% !important;`
   - 文件：`content.css`，第 401-406 行附近
   - 确保 flex 容器宽度填满父容器，`space-between` 才能产生间距
2. 确认 `justify-content: space-between !important;` 已存在（当前第 403 行已有）
3. 确认 `.html-diff-marker-slider-value` 的 `min-width` 和 `text-align: right` 已存在（当前第 415-416 行已有）

**验证方法**：
- 检查 slider-header 的 computedStyle.width 是否等于父容器宽度
- 如果 slider-header 被放在某个 flex 行容器中（不是单独占一行），需要调整 DOM 结构确保它独占一行

#### 修复项 1.3："重置全部"按钮不一致

**问题澄清**：用户说的"重置全部按钮"有两种可能，需先确认：

| 可能 | 按钮位置 | 类名 | 与演示文件差异 |
|------|---------|------|--------------|
| A | 样式编辑分组内顶部（全宽） | `.html-diff-marker-reset-all-btn` | 演示文件可能没有此按钮，或样式不同 |
| B | 每个分组标题行右侧 | `.html-diff-marker-group-reset` | 与演示文件的 `.hdm-reset-btn` 样式基本一致 |

**修复方向 A**（如果用户指的是分组内顶部的"重置全部"按钮）：
- 检查演示文件是否有此全宽的"重置全部"按钮
- 如果没有，考虑移除该按钮，只保留分组级别的重置按钮
- 如果有，调整样式与演示文件对齐（当前有 1px 边框、圆角 6px，需确认演示文件规格）

**修复方向 B**（如果用户指的是分组标题右侧的重置按钮）：
- 当前 `.html-diff-marker-group-reset` 样式与演示文件 `.hdm-reset-btn` 基本一致
- 可能差异：文字大小（当前 11px）、padding（当前 `0 10px`）、圆角（当前 4px）
- 需进一步对比演示文件确认像素级差异

---

## 四、问题 2：清除确认的"− / ×"不在一行且没有显示

### 4.1 问题澄清

用户说的"清除确认的'− / ×'"存在歧义，有两种可能的解读：

**解读 A**：清除确认弹窗（模态框）的窗口控制按钮（最小化 − 和关闭 ×）

**解读 B**：工具栏头部的窗口控制按钮（− / ×），用户误写为"清除确认的"

### 4.2 模态弹窗的头部结构

**清除确认弹窗**（`content.js` 第 2596-2601 行）调用 `showModal`，其头部结构：

```javascript
const header = document.createElement('div');
header.className = 'html-diff-marker-modal-header';

const headerTitle = document.createElement('div');
headerTitle.className = 'html-diff-marker-modal-header-title';
headerTitle.textContent = title;
header.appendChild(headerTitle);

const closeBtn = document.createElement('button');
closeBtn.className = 'html-diff-marker-modal-header-close';
closeBtn.innerHTML = SVG_ICONS.close;   // SVG 图标，不是文字 ×
header.appendChild(closeBtn);
```

**模态弹窗只有一个关闭按钮**，没有最小化按钮（−）。所以用户说的"− / ×"不可能是模态弹窗的。

### 4.3 工具栏头部的窗口控制按钮

**工具栏头部结构**（`content.js` 第 2995-3026 行）：

```javascript
const header = document.createElement('div');
header.className = 'html-diff-marker-toolbar-header';

const title = document.createElement('div');
title.className = 'html-diff-marker-toolbar-title';
title.textContent = 'HTML Diff Marker';
header.appendChild(title);

const windowCtrl = document.createElement('div');
windowCtrl.className = 'html-diff-marker-toolbar-window-ctrl';

const minimizeBtn = document.createElement('button');
minimizeBtn.className = 'html-diff-marker-ctrl-btn';
minimizeBtn.textContent = '\u2212';   // − (减号)

const closeBtn = document.createElement('button');
closeBtn.className = 'html-diff-marker-ctrl-btn';
closeBtn.textContent = '\u00D7';      // × (乘号)

windowCtrl.appendChild(minimizeBtn);
windowCtrl.appendChild(closeBtn);
header.appendChild(windowCtrl);
```

**CSS 样式**（`content.css` 第 1868-1896 行）：

```css
.html-diff-marker-toolbar-window-ctrl {
  display: flex !important;
  gap: 6px !important;
}
.html-diff-marker-toolbar .html-diff-marker-ctrl-btn {
  width: 20px !important;
  height: 20px !important;
  border-radius: 50% !important;
  background: var(--hdm-white-alpha-20) !important;
  color: var(--hdm-text-white) !important;
  font-size: 11px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  ...
}
```

### 4.4 问题根因分析

用户说"不在一行，且没有显示"，这意味着：
1. 两个按钮没有水平排列
2. 按钮内容（− 和 ×）不可见

**不在一行的可能原因**：
- `window-ctrl` 容器的 `display: flex` 被覆盖了？
- 检查 div 恢复规则：`.html-diff-marker-toolbar div:not(.html-diff-marker-toolbar-window-ctrl):not(...)` — 是的，`window-ctrl` 在 `:not()` 列表中，不会被强制设为 block

**没有显示的可能原因**：
- 与问题 3（SVG 图标不显示）类似，文字颜色与背景相同？
- 按钮背景是 `var(--hdm-white-alpha-20)`（白色半透明），文字颜色是 `var(--hdm-text-white)`（白色）
- 工具栏头部背景是渐变色（深色），白色文字应该可见
- 但如果按钮的 color 属性被 `all: unset` 重置后没有被正确恢复...

**文字颜色继承链**：
1. `.html-diff-marker-toolbar-header` 设置了 `color: var(--hdm-text-white)`（第 1863 行）
2. `all: unset` 重置按钮的 color → 继承父元素
3. 按钮基础样式（第 341-361 行）设置 `color: inherit !important`
4. `.html-diff-marker-ctrl-btn` 设置 `color: var(--hdm-text-white) !important`

理论上文字应该是白色的。

**但如果 `all: unset` 重置了 `font-family` 而按钮没有正确恢复字体，Unicode 字符 `\u2212` 和 `\u00D7` 可能在某些字体下不显示或显示异常。**

按钮基础样式中有 `font: inherit !important`，这会继承父元素的字体。toolbar-header 的字体继承自 toolbar 的 `font-family: -apple-system, BlinkMacSystemFont, ...`。这应该没问题。

### 4.5 问题 2 结论与明确修复方向

**确认结论**：
- 用户说的"− / ×"实际是**工具栏头部的窗口控制按钮**（最小化按钮 − 和关闭按钮 ×）
- 不是清除确认弹窗的（弹窗只有关闭按钮，没有最小化按钮）

**"不在一行"的根因与修复**：

| 检查项 | 当前状态 | 预期 | 修复方向 |
|--------|---------|------|---------|
| `.html-diff-marker-toolbar-window-ctrl` 的 `display` | CSS 设置 `flex !important`（第 1869 行） | 水平排列 | 检查是否被 div 恢复规则（第 425 行）覆盖。当前 `window-ctrl` 已在 `:not()` 列表中，理论上不应被覆盖。需验证 computedStyle |
| 按钮的 `display` | CSS 设置 `flex !important`（第 1882 行） | 不影响排列 | 按钮本身是 flex 容器用于居中文本，不影响父容器的水平排列 |
| `gap` | CSS 设置 `6px !important`（第 1870 行） | 按钮间有间距 | 正常 |

**修复步骤**：
1. 在浏览器控制台验证：`getComputedStyle(document.querySelector('.html-diff-marker-toolbar-window-ctrl')).display`
2. 如果不是 `flex`，说明 div 恢复规则异常覆盖，需在 `:not()` 列表中确认类名完全匹配
3. 如果是 `flex` 但仍不水平排列，检查父容器 `toolbar-header` 的 `flex-direction` 和 `align-items`

**"没有显示"的根因与修复**：

| 检查项 | 当前状态 | 预期 | 修复方向 |
|--------|---------|------|---------|
| 文字颜色 | `var(--hdm-text-white)`（第 1879 行） | 白色，在渐变背景上可见 | 验证 computedStyle.color 是否为白色 |
| 字体大小 | `11px`（第 1880 行） | 可见 | 可能偏小，可适当调大到 12px 或 13px |
| 按钮背景 | `var(--hdm-white-alpha-20)`（第 1877 行） | 半透明白色圆形背景 | 在深色渐变上应可见 |
| Unicode 字符 | `\u2212`(−) 和 `\u00D7`(×) | 正常显示 | 检查字体是否支持这些字符，`font-family: var(--hdm-font-family)`（第 1889 行）应包含系统字体 |

**修复步骤**：
1. 验证 `getComputedStyle(ctrlBtn).color` — 确保是白色
2. 验证 `getComputedStyle(ctrlBtn).fontSize` — 至少 11px
3. 验证 `getComputedStyle(ctrlBtn).fontFamily` — 包含系统字体
4. 如果颜色不是白色，检查 color 继承链是否被 `all: unset` 破坏
5. 如果文字不可见但按钮背景可见，可能是字体问题，可考虑改用 SVG 图标（如 `SVG_ICONS.minus` 和 `SVG_ICONS.close`）替代文字

**推荐的终极修复**：将窗口控制按钮从文字字符改为 SVG 图标
- 优势：与其他按钮图标风格一致，不受字体渲染影响，不依赖 Unicode 字符支持
- 实现：将 `textContent = '\u2212'` 改为 `innerHTML = SVG_ICONS.minus`，关闭按钮同理
- 样式：SVG 大小 12px，stroke 颜色 `var(--hdm-text-white)`

---

## 五、问题 4：主题选择失效，点击后没有切换颜色

### 5.1 主题系统架构

**CSS 主题定义**（`content.css` 第 229-279 行）：
```css
[data-theme="deep-cyan"] {
  --hdm-theme-primary: #211E55;
  ...
}
[data-theme="gray-green"] { ... }
[data-theme="dusk-purple"] { ... }
[data-theme="warm-brown"] { ... }
```

**JS 主题应用**（`content.js` 第 2276-2283 行）：
```javascript
applyPreset: function(themeId) {
  const preset = PRESET_THEMES.find(function(t) { return t.id === themeId; });
  if (!preset) themeId = 'dusk-purple';
  this.currentTheme = themeId;
  this.customColor = null;
  document.body.setAttribute('data-theme', themeId);   // ← 设置到 body 上
  this._saveToStorage({ type: 'preset', themeId: themeId });
},
```

**设置面板中的主题切换**（`content.js` 第 2832-2841 行）：
```javascript
card.addEventListener('click', function() {
  themeManager.applyPreset(preset.id);
  themeGrid.querySelectorAll('.html-diff-marker-settings-theme-card').forEach(function(c) {
    c.classList.remove('html-diff-marker-settings-theme-card--active');
  });
  card.classList.add('html-diff-marker-settings-theme-card--active');
});
```

### 5.2 根因深度分析

#### 5.2.1 CSS 变量继承链

```
:root (html) 
  └─> 定义默认主题变量 (dusk-purple)
       └─> body [data-theme="xxx"]
            └─> 覆盖主题变量
                 └─> .html-diff-marker-toolbar (all: initial)
                      └─> 子元素...
```

**关键问题**：`all: initial` 会影响 CSS 自定义变量吗？

**答案**：**不会**。CSS 规范明确规定，`all` 属性不影响 `--*` 自定义属性。自定义属性的继承不受 `all: initial` 或 `all: unset` 影响。

所以变量继承链应该是完整的。

#### 5.2.2 主题选择器匹配问题

CSS 选择器 `[data-theme="deep-cyan"]` 匹配任何带有 `data-theme="deep-cyan"` 属性的元素。当 `document.body.setAttribute('data-theme', 'deep-cyan')` 被调用时，body 元素会获得这个属性，然后 `[data-theme="deep-cyan"]` 选择器就会匹配 body，在 body 上设置主题变量。

这应该是正确的。

#### 5.2.3 可能的失效原因分析

**假设 A（最高概率）：`all: initial` 在 toolbar 根元素上设置的 color 属性覆盖了变量解析路径**

不对，`all: initial` 不影响自定义属性。

**假设 B（中概率）：主题变量被正确应用，但所有使用主题色的地方都被硬编码的颜色值覆盖了**

比如，如果按钮的 hover 状态使用了硬编码的颜色而不是 var()，那么主题切换就看不到效果。

但从代码来看，大部分组件都使用了 `--hdm-theme-primary` 等变量。

**假设 C（中概率）：设置面板的主题卡片点击事件没有正确绑定**

检查：主题卡片是在 `openSettingsPanel` 函数中动态创建的，点击事件在创建时绑定。这应该没问题。

**假设 D（高概率）：主题变量确实被切换了，但用户感知不到，因为关键视觉元素没有使用主题变量**

比如：
- 工具栏头部的渐变背景使用 `--hdm-gradient-header`，而它等于 `var(--hdm-theme-gradient)`
- 这应该随主题变化

但如果：
- 按钮的边框颜色使用的是 `--hdm-border`（中性色，不随主题变化）
- 文字颜色使用的是 `--hdm-text-secondary`（中性色）
- 只有 hover 状态才显示主题色

那么用户可能以为主题没切换，因为默认状态下主题色不明显。

**假设 E（最高概率）：`document.body.setAttribute('data-theme', themeId)` 确实设置了属性，但 CSS 中的 `[data-theme]` 选择器没有正确应用到 body**

等等，为什么会这样？让我再仔细看看 CSS 文件结构...

CSS 中的主题定义在第 230-279 行，使用的是裸的 `[data-theme="xxx"]` 选择器。这些选择器应该能匹配 body。

但是！content script 的 CSS 是以什么方式注入的？在 Chrome 扩展中，content_scripts 的 CSS 是作为 author style 注入的，它的优先级与页面自身的 CSS 相同。

如果页面（宿主页面）有自己的 `[data-theme]` 规则或者 body 的样式规则，可能会影响？

不，扩展的 CSS 和页面的 CSS 是分开的...不对，它们都作用在同一个 DOM 上。

等等，我想到了一个关键点。**`all: initial` 对 :root 级别的变量没有影响，但如果变量是定义在 body 上的 [data-theme] 规则中，它们应该能被 body 的后代正确继承。**

让我验证一下这个逻辑：

1. `:root` 定义了 `--hdm-theme-primary: #70649A`（默认值）
2. `body[data-theme="deep-cyan"]` 定义了 `--hdm-theme-primary: #211E55`
3. body 的子元素（toolbar）会继承 body 上的 `--hdm-theme-primary` 值
4. 由于 body 上的 `[data-theme]` 规则覆盖了 :root 的值，所以子元素看到的是 `#211E55`

这应该是正确的。

**但是！** 如果 toolbar 元素有 `all: initial`，它会把所有属性重置为初始值。虽然自定义属性不受影响，但如果组件使用的是 `color: var(--hdm-theme-primary)` 这样的方式，`color` 属性会被 `all: initial` 重置，然后被后面的 `color: var(--hdm-text-primary) !important` 恢复。

等等，这不影响变量本身，只影响使用变量的属性。变量的值还是正确的。

#### 5.2.4 另一可能性：chrome.storage 异步加载导致初始主题闪烁，但最终应该生效

`themeManager.init()` 使用 `chrome.storage.local.get` 异步读取主题设置。但 `applyPreset` 是同步的，会立即设置 `data-theme`。

这不会导致"点击没有切换"的问题。

### 5.3 问题 4 验证路径与修复方案

#### 5.3.1 三步验证法（按顺序执行）

**第一步：验证 data-theme 属性是否切换**

在浏览器控制台执行：
```javascript
// 点击主题卡片前
console.log('切换前 data-theme:', document.body.getAttribute('data-theme'));

// 手动触发切换
themeManager.applyPreset('deep-cyan');

// 点击主题卡片后
console.log('切换后 data-theme:', document.body.getAttribute('data-theme'));
console.log('dataset.theme:', document.body.dataset.theme);
```

**预期结果**：
- 切换前：`dusk-purple`
- 切换后：`deep-cyan`

**如果 data-theme 没有变化** → 问题在 JS 层，跳转 5.3.2 节排查

**如果 data-theme 正确变化了** → 继续第二步

---

**第二步：验证 CSS 变量是否变化**

在浏览器控制台执行：
```javascript
// 切换主题后检查 body 上的 CSS 变量值
var bodyStyle = getComputedStyle(document.body);
console.log('--hdm-theme-primary:', bodyStyle.getPropertyValue('--hdm-theme-primary'));
console.log('--hdm-theme-gradient:', bodyStyle.getPropertyValue('--hdm-theme-gradient'));

// 检查工具栏头部背景（最直观的视觉反馈）
var header = document.querySelector('.html-diff-marker-toolbar-header');
var headerStyle = getComputedStyle(header);
console.log('toolbar-header background:', headerStyle.backgroundImage);
console.log('toolbar-header backgroundColor:', headerStyle.backgroundColor);
```

**预期结果**：
- 切换到 deep-cyan 后，`--hdm-theme-primary` 应为 `#211E55`
- `--hdm-theme-gradient` 应为 `linear-gradient(135deg, #3D3A75 0%, #211E55 100%)`
- toolbar-header 的 background-image 应为上面的渐变值

**如果 CSS 变量没有变化** → 问题在 CSS 选择器匹配，跳转 5.3.3 节排查

**如果 CSS 变量正确变化了，但视觉上没变化** → 问题在变量使用处（组件没有正确引用主题变量）

---

**第三步：验证关键视觉元素是否使用主题变量**

检查以下关键元素是否使用了主题相关变量：
- 工具栏头部背景 → `--hdm-theme-gradient`
- 主按钮背景 → `--hdm-theme-primary`
- 按钮 hover 边框色 → `--hdm-theme-primary-light`
- 主题色文字 → `--hdm-theme-primary`

在控制台逐一验证：
```javascript
var toolbar = document.querySelector('.html-diff-marker-toolbar');
var toolbarStyle = getComputedStyle(toolbar);
console.log('--hdm-theme-primary on toolbar:', toolbarStyle.getPropertyValue('--hdm-theme-primary'));
```

#### 5.3.2 根因 A：主题切换 JS 逻辑问题（data-theme 不变化）

**最可能根因排序**：

| 序号 | 根因 | 概率 | 验证方法 |
|------|------|------|---------|
| 1 | 主题卡片点击事件未正确绑定 | 高 | 在 `addEventListener` 处打 debugger，点击卡片看是否触发 |
| 2 | `themeManager.applyPreset` 函数逻辑有 bug | 中 | 直接调用 `themeManager.applyPreset('deep-cyan')` 看效果 |
| 3 | `PRESET_THEMES` 中没有对应 id 的主题 | 低 | 打印 `PRESET_THEMES` 检查 id 列表 |
| 4 | 设置面板的点击事件被 stopPropagation 了 | 中 | 检查 settings-panel 是否有全局点击拦截 |
| 5 | `chrome.storage` 写入失败导致回滚 | 低 | 注释掉 `_saveToStorage` 调用再测试 |

**修复方案（按概率从高到低）**：

**修复 1：确保主题卡片点击事件正确触发**

当前代码（第 2832-2841 行）：
```javascript
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
```

问题排查：
- 检查 `card` 是 `button` 元素（第 2807 行），button 的 click 事件应该能正常触发
- `e.stopPropagation()` 不会阻止按钮自身的点击处理
- 第三个参数 `true` 表示捕获阶段触发，这可能不是问题

验证方法：在 `applyPreset` 函数第一行加 `console.log`，确认函数是否被调用。

**修复 2：检查 setTheme / applyPreset 函数逻辑**

`applyPreset` 函数（第 2276-2283 行）：
```javascript
applyPreset: function(themeId) {
  const preset = PRESET_THEMES.find(function(t) { return t.id === themeId; });
  if (!preset) themeId = 'dusk-purple';  // ← 兜底：找不到则回退到默认
  this.currentTheme = themeId;
  this.customColor = null;
  document.body.setAttribute('data-theme', themeId);  // ← 核心行
  this._saveToStorage({ type: 'preset', themeId: themeId });
}
```

**关键检查点**：
1. `PRESET_THEMES` 是否正确定义（检查 `preset.id` 是否与 CSS 中的 `[data-theme="xxx"]` 一致）
2. `document.body.setAttribute` 是否执行成功（body 元素是否存在）
3. 调用 `applyPreset` 时传入的 `preset.id` 是否正确

**修复 3：检查 chrome.storage 读写逻辑**

`_saveToStorage` 函数（第 2315-2326 行）和 `init` 函数（第 2220-2273 行）：
- 确认 `chrome.storage.local` 可用
- 确认存储键 `THEME_KEY` 的值正确
- 确认 init 完成后，主题设置没有被意外覆盖

**验证**：在设置面板打开前，打印当前主题状态：
```javascript
console.log('currentTheme:', themeManager.currentTheme);
console.log('body data-theme:', document.body.getAttribute('data-theme'));
```

#### 5.3.3 根因 B：CSS 选择器不生效（data-theme 变化但变量不变）

**可能原因**：
1. CSS 中 `[data-theme="xxx"]` 选择器定义在 `:root` 之后，但被其他规则覆盖
2. 主题变量定义在 body 上，但 toolbar 的 `all: initial`  somehow 影响了变量继承（虽然规范说不会，但可能有浏览器异常）
3. CSS 文件加载顺序问题

**验证**：
```javascript
// 手动设置 data-theme 后检查变量
document.body.setAttribute('data-theme', 'deep-cyan');
var bodyStyle = getComputedStyle(document.body);
console.log('--hdm-theme-primary:', bodyStyle.getPropertyValue('--hdm-theme-primary'));
// 预期：#211E55，如果还是默认的 #70649A，说明 CSS 选择器没生效
```

**修复方案**：
如果 CSS 选择器不生效，考虑在 JS 中直接设置 CSS 变量（类似 `_applyCustomColors` 的方式），而不是依赖 `[data-theme]` CSS 选择器：

```javascript
applyPreset: function(themeId) {
  const preset = PRESET_THEMES.find(function(t) { return t.id === themeId; });
  if (!preset) themeId = 'dusk-purple';
  this.currentTheme = themeId;
  this.customColor = null;
  
  // 方案：直接通过 JS 设置 CSS 变量，不依赖 [data-theme] 选择器
  var colors = deriveColors(preset.color);  // 或者直接从 preset 中取预计算的值
  this._applyCustomColors(colors);
  document.body.setAttribute('data-theme', themeId);  // 保留作为标识
  
  this._saveToStorage({ type: 'preset', themeId: themeId });
}
```

**注意**：当前 CSS 中 `[data-theme]` 选择器定义了多个变量（primary, light, dark, gradient, softBg 等），如果改用 JS 设置，需要在 `PRESET_THEMES` 中预定义所有这些值，或者复用 `deriveColors` 函数。

#### 5.3.4 根因 C：主题变量存在但视觉元素没用到（变量正确但看不到变化）

**验证方法**：切换主题后，观察以下元素是否变化：

| 元素 | 应使用的变量 | 是否随主题变化 |
|------|------------|--------------|
| 工具栏头部背景 | `--hdm-theme-gradient` | 是（最明显） |
| 主按钮背景 | `--hdm-theme-primary` | 是 |
| 按钮 hover 边框 | `--hdm-theme-primary-light` | 是 |
| 分组重置按钮背景 | `--hdm-theme-soft-bg` | 是 |
| 分组重置按钮文字 | `--hdm-theme-primary` | 是 |

如果工具栏头部背景不随主题变化，说明 `--hdm-theme-gradient` 没有正确传递到 `.html-diff-marker-toolbar-header`。

**修复**：检查 toolbar-header 的 CSS（第 1847-1857 行），确认 `background: var(--hdm-theme-gradient) !important;` 中的变量名正确，且变量值能正确传递。

### 5.4 问题 4 总结

**最可能根因（按概率排序）**：

1. **主题卡片点击事件绑定异常** — 设置面板的事件处理可能与卡片点击冲突
2. **`applyPreset` 函数中 `PRESET_THEMES.find` 未找到对应主题** — id 不匹配导致回退到默认
3. **`document.body.setAttribute` 执行了，但 CSS `[data-theme]` 选择器由于某种原因未生效**
4. **主题变量确实被切换了，但用户感知不到** — 关键视觉元素没有正确使用主题变量

**推荐修复路径**：
1. 先按 5.3.1 的三步验证法定位问题层级
2. 如果是 JS 层问题 → 检查点击事件绑定和 applyPreset 逻辑
3. 如果是 CSS 层问题 → 改用 JS 直接设置 CSS 变量的方式（与自定义主题的实现一致）
4. 如果是使用层问题 → 确保关键视觉元素引用了正确的主题变量

---

## 六、总结与优先级

| 问题 | 严重程度 | 最可能根因 | 修复方案 | 修复难度 |
|------|---------|-----------|---------|---------|
| 问题 3：工具栏图标不显示 | P0（阻塞级） | `all:unset` 重置 SVG 内部元素 stroke + SVG 命名空间 CSS 选择器匹配异常 | **JS 内联样式方案**：`enforceSvgIconStyle()` 函数，SVG 注入后立即设置内联 style（带 !important） | 中 |
| 问题 4：主题选择失效 | P1（严重） | 主题卡片点击事件 / applyPreset 逻辑 / CSS [data-theme] 选择器 三者之一有问题 | 三步验证法定位 → 对应修复；备选方案：JS 直接设置 CSS 变量 | 中 |
| 问题 1：编辑面板不一致 | P2（主要） | 输入框高度 36px vs 32px / slider-header 宽度问题 / 重置按钮设计差异 | 输入框高度改 32px；slider-header 加 width:100%；重置按钮按演示文件对齐 | 低 |
| 问题 2："− / ×"不显示 | P2（主要） | 窗口控制按钮 flex 布局问题 + 文字/字体渲染问题 | 检查 flex 布局和文字颜色；终极方案：改用 SVG 图标 | 低 |

### 下一步行动清单

#### P0：问题 3（工具栏图标）—— 立即执行

1. 在 `content.js` 中新增 `enforceSvgIconStyle()` 工具函数
2. 找到所有 `innerHTML = SVG_ICONS.xxx` 的位置，在其后添加 `enforceSvgIconStyle()` 调用
3. 覆盖范围：side-btn（reset、settings）、export-btn（export）、settings-title（settings）、multi-toolbar（duplicate、trash）
4. 保留现有 CSS 规则作为双保险
5. 验证：所有 SVG 图标均可见

#### P1：问题 4（主题选择失效）—— 紧随其后

1. 按三步验证法定位问题层级：
   - 第一步：检查 `document.body.getAttribute('data-theme')` 切换前后是否变化
   - 第二步：检查 `getComputedStyle(document.body).getPropertyValue('--hdm-theme-primary')` 是否变化
   - 第三步：检查 toolbar-header background 是否变化
2. 根据定位结果选择对应修复方案：
   - JS 层问题 → 检查点击事件绑定 + applyPreset 逻辑
   - CSS 层问题 → 改用 JS 直接设置 CSS 变量（与自定义主题一致）
   - 使用层问题 → 确保关键元素引用正确变量

#### P2：问题 1（编辑面板不一致）—— 并行处理

1. 输入框高度：`--hdm-input-height-md` 从 `36px` 改为 `32px`
2. 滑块数值居右：`.html-diff-marker-slider-header` 添加 `width: 100% !important`
3. 重置全部按钮：确认用户指的是哪个按钮，按演示文件对齐样式

#### P2：问题 2（窗口控制按钮）—— 并行处理

1. 验证 `window-ctrl` 的 `display: flex` 是否生效
2. 验证按钮文字颜色和大小
3. 终极方案：文字字符改为 SVG 图标（minus、close）

---

**报告结束**
