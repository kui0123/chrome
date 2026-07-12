# BugReport — 编号/把手不可见 & 编辑面板无法折叠

| 项目 | HTML 排版插件 |
|------|--------------|
| 报告日期 | 2026-07-10 |
| 涉及文件 | `content/content.css`、`content/content.js` |

---

## Bug 1 & 2：编号徽章不可见 + 拖拽把手不可见

### 问题描述

被标记的元素上，右上角的编号徽章（#1、#2...）和四周的大小调整把手（8 个小圆点）看不到。鼠标悬停在元素上时光标会变化，但看不到任何视觉标记。

**影响范围**：所有被标记元素（已选中 / 已修改 / 多选高亮）的编号徽章与拖拽把手。
**复现路径**：对任意带有 `overflow: hidden` 样式的元素（如卡片容器、图片裁剪容器等）进行标记，观察标记装饰元素。

### 现场分析

编号徽章（`.html-diff-marker-badge`）和大小调整把手（`.html-diff-marker-resize-handle`）的共同特征：
- 都是**绝对定位**（`position: absolute`），定位在被标记元素**边界之外**（如 `top: -12px; right: -12px`、`top: -6px; left: -6px`）。
- 都是作为**子元素**通过 `el.appendChild(...)` 挂载到被标记元素内部。
- 被标记元素添加了 `.html-diff-marker-selected` 或 `.html-diff-marker-modified` 类，设置了 `position: relative` 作为定位参照。

### 根因确认

当被标记元素的原始样式（页面 CSS）含有 `overflow: hidden` 时，超出元素边界的子元素（绝对定位的徽章、把手）会被**裁剪**，从而不可见。

**证据链**：

1. `content.css` 第 797-812 行，`.html-diff-marker-selected` 和 `.html-diff-marker-modified` 只设置了：
   - `outline`、`background-color`、`position: relative`、`transition`
   - **没有设置 `overflow: visible`**

2. 编号徽章样式（`content.css` 第 959-985 行）：
   - `position: absolute; top: -12px; right: -12px;`
   - 位置在元素右上角外侧 12px 处

3. 拖拽把手样式（`content.css` 第 1021-1048 行）：
   - `position: absolute;` 各方向位置均在元素外（如 `top: -6px`、`bottom: -6px` 等）

4. 把手挂载代码（`content.js` 第 1799 行）：
   - `el.appendChild(handle);` —— 作为被标记元素的子元素

5. 编号徽章挂载代码（`content.js` 第 1121 行）：
   - `el.appendChild(badge);` —— 作为被标记元素的子元素

**结论**：初步排查结论**正确**。被标记元素的 `overflow: hidden` 裁剪了超出边界的绝对定位子元素，而标记类未强制覆盖 `overflow` 属性。

### 严重程度

**高** —— 核心视觉反馈缺失，用户无法确认元素是否被标记，也无法使用拖拽调整大小功能。

### 修复建议

在以下三个标记类中添加 `overflow: visible !important`：

```css
/* content.css */
.html-diff-marker-selected {
  outline: 2px solid var(--hdm-success) !important;
  outline-offset: 2px !important;
  background-color: var(--hdm-mark-selected-bg) !important;
  position: relative !important;
  overflow: visible !important;   /* 新增：确保徽章和把手可见 */
  transition: all var(--hdm-transition-base) !important;
}

.html-diff-marker-modified {
  outline: 2px solid var(--hdm-warning) !important;
  outline-offset: 2px !important;
  background-color: var(--hdm-mark-modified-bg) !important;
  position: relative !important;
  overflow: visible !important;   /* 新增 */
  transition: all var(--hdm-transition-base) !important;
}

.html-diff-marker-multi-selected {
  outline: 2px dashed var(--hdm-primary) !important;
  outline-offset: 2px !important;
  background-color: var(--hdm-mark-multi-bg) !important;
  position: relative !important;
  overflow: visible !important;   /* 新增：多选高亮也要保证子元素可见 */
  transition: all var(--hdm-transition-base) !important;
}
```

### 验收手段

1. 对一个带有 `overflow: hidden` 的容器元素（如 `<div style="overflow:hidden; width:200px; height:200px;">`）进行标记。
2. 验证右上角编号徽章完整可见，无裁剪。
3. 验证 8 个方向的大小调整把手完整可见，无裁剪。
4. 对 `img`、`button` 等本身不具有 `overflow: hidden` 的元素标记也验证无异常。

---

## Bug 3：编辑面板无法折叠

### 问题描述

点击编辑面板（Inspector Panel）头部的最小化按钮（−）没有反应，面板无法折叠。点击按钮的边缘有时能触发，但点击按钮中间的文本区域完全无效。

**影响范围**：编辑面板（单元素编辑、组合标记编辑）的折叠/展开功能；工具栏头部按钮同理。
**复现路径**：打开任意元素的编辑面板，点击头部右上角的「−」按钮（尤其是按钮的中间文本区域）。

### 现场分析

编辑面板头部同时承担两个功能：
1. **拖拽手柄**：整个 header 区域都可以拖动面板
2. **控制按钮**：header 右侧有「折叠」和「关闭」两个按钮

两者通过 `makeDraggable` 函数中的按钮检测逻辑来区分：如果点击的是按钮，则不触发拖拽，让按钮的 click 事件正常工作。

### 根因确认

`makeDraggable` 函数中的按钮检测逻辑存在缺陷。

**代码位置**：`content/content.js` 第 692-719 行，第 698 行

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

1. `e.target` 指向**实际触发事件的最内层元素**。
2. 折叠按钮的 HTML 结构是 `<button>−</button>`，内部包含文本节点（Text Node）。
3. 当用户点击按钮文本（"−" 或 "×"）时，`e.target` 是**文本节点**，不是 `BUTTON` 元素。
4. 文本节点的 `tagName` 为 `undefined`，因此 `t.tagName === 'BUTTON'` 判断失败。
5. 判断失败后代码继续执行：
   - `e.preventDefault()` 和 `e.stopPropagation()` 被调用（捕获阶段）
   - 事件停止向下传播，按钮本身收不到 `mousedown`
   - `dragging = true`，进入拖拽模式
   - 因为按钮没有收到完整的 mousedown→mouseup 序列，`click` 事件不会在按钮上触发

**结论**：初步排查结论**正确**。按钮检测仅判断了 `e.target.tagName`，未考虑点击到按钮内部文本节点（或其他子元素）的情况。

### 受影响范围

不仅是编辑面板的折叠按钮，以下位置的头部按钮都受同一问题影响：

| 面板 | makeDraggable 调用位置 | 头部按钮 |
|------|----------------------|----------|
| 主工具栏 | 第 2722 行 | 最小化、关闭 |
| 单元素编辑面板 | 第 3741 行 | 折叠、关闭 |
| 组合标记编辑面板 | 第 3959 行 | 关闭 |

### 严重程度

**中** —— 折叠功能是常用交互，按钮点击区域不稳定影响体验。但关闭按钮和其他功能不受影响，面板可通过关闭按钮关闭后重新打开。

### 修复建议

使用 `closest()` 方法向上遍历，检测点击目标是否位于按钮内部：

```javascript
// content.js - makeDraggable 函数
handle.addEventListener('mousedown', function(e) {
  if (e.button !== 0) return;
  // 如果点击的是按钮，不触发拖拽（让按钮的 click 事件正常工作）
  const t = e.target;
  // 使用 closest 向上查找，兼容点击到按钮内部文本节点或图标子元素的情况
  if (t && t.closest && t.closest('BUTTON')) return;
  // 兼容不支持 closest 的极端情况
  if (t && t.tagName === 'BUTTON') return;
  e.preventDefault(); e.stopPropagation();
  dragging = true;
  // ...
}, true);
```

更简洁且更健壮的写法（推荐）：

```javascript
if (t && (t.tagName === 'BUTTON' || t.closest && t.closest('button'))) return;
```

### 验收手段

1. 打开编辑面板，将鼠标精准悬停在「−」按钮的文本中心位置，单击：
   - 预期：面板折叠，按钮变为「+」
2. 再次点击按钮文本中心：
   - 预期：面板展开，按钮变为「−」
3. 点击按钮的边缘（非文本区域）：
   - 预期：正常折叠/展开
4. 点击头部非按钮区域并拖动：
   - 预期：面板正常跟随鼠标移动，拖拽功能不受影响
5. 同样验证工具栏的最小化、关闭按钮，以及组合标记面板的关闭按钮。

---

## 问题汇总

| 编号 | 问题 | 根因 | 严重程度 | 代码位置 |
|------|------|------|----------|----------|
| 1 | 编号徽章不可见 | 被标记元素 `overflow: hidden` 裁剪了绝对定位子元素；标记类未设置 `overflow: visible` | 高 | `content.css` L797-L821 |
| 2 | 拖拽把手不可见 | 同上（同一根因） | 高 | `content.css` L797-L821 |
| 3 | 编辑面板无法折叠 | `makeDraggable` 按钮检测仅判断 `e.target.tagName`，点击按钮内文本节点时判断失败 | 中 | `content.js` L698 |
