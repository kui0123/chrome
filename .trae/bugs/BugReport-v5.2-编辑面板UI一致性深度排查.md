# BugReport — 编辑面板 UI 样式不一致深度排查

## 问题描述

编辑面板中文字样式区域和样式编辑区域的输入框、按钮高度异常导致画面不一致。滑块没有外圈。具体设计请参考 `ui-preview-v5.2-showcase.html` 进行复原。

### 影响范围
- 编辑面板（Inspector）的所有样式属性行
- 文字样式分组、样式编辑分组、位置调整分组等所有使用滑块/输入框/下拉框的分组
- 滑块组件的视觉呈现

### 相关文件
- 样式文件：`extension/content/content.css`
- 逻辑文件：`extension/content/content.js`
- 设计稿参考：`dev/pages/ui-preview-v5.2-showcase.html`

---

## 现场分析

### 设计稿（ui-preview-v5.2-showcase.html）关键规格

| 组件 | 类名 | 高度 | 宽度 | 边框 |
|------|------|------|------|------|
| 基础输入框 | `.hdm-text-input` | 32px | 100% | 1px solid var(--border-light) |
| 属性行输入框 | `.hdm-prop-control .hdm-text-input` | 30px | flex: 1 | 1px solid var(--border-light) |
| 属性行下拉框 | `.hdm-select` | 30px | flex: 1 | 1px solid var(--border-light) |
| 颜色选择器 | `.hdm-color-picker` | 30px | 30px | 1px solid var(--border-light) |
| 重置按钮 | `.hdm-prop-reset` | 28px | 28px | 1px solid transparent |
| 添加字体按钮 | `.hdm-add-font-btn` | 28px | 28px | 1px solid var(--success-border) |
| 滑块轨道 | `.hdm-slider-track` | 4px | 100% | 无，overflow: 可见，cursor: pointer（事件直接绑定在 track 上） |
| 滑块滑块 | `.hdm-slider-thumb` | 16px | 16px | 2px solid var(--theme-primary) |

> **设计稿滑块结构说明**：设计稿只有单层 `.hdm-slider-track`（4px 高，自身带 `cursor: pointer`，`mousedown` 事件直接绑定在 track 上），没有额外的 track-wrap 层。

### 当前实现（content.css）关键规格

| 组件 | 类名 | 高度 | 宽度 | 边框 |
|------|------|------|------|------|
| 基础输入框 | `.html-diff-marker-input` | 36px (--hdm-input-height-md) | 100% | 1px solid var(--hdm-border) |
| 小型输入框 | `.html-diff-marker-input--sm` | 30px (--hdm-input-height-sm) | 100% | 1px solid var(--hdm-border) |
| 小型下拉框包装 | `.html-diff-marker-select-wrap--sm` | 30px | 100% | 1px solid var(--hdm-border) |
| 颜色选择器（样式行内） | `.html-diff-marker-color-wrap` | 22px | 22px | 1px solid var(--hdm-border) |
| 样式属性重置按钮 | `.html-diff-marker-style-prop-reset` | 22px | 22px | 无（透明度控制） |
| 添加字体按钮 | `.html-diff-marker-btn--icon` | 28px | 28px | 无 |
| 滑块轨道 | `.html-diff-marker-slider-track` | 4px | 100% | **overflow: hidden** |
| 滑块滑块 | `.html-diff-marker-slider-thumb` | 16px | 16px | 2px solid var(--hdm-primary) |

---

## 根因分析

### 问题一：输入框、按钮高度不一致

#### 根因 1：颜色选择器重复定义导致尺寸被覆盖（P0）

**定位方式**：在 `content.css` 中搜索 `.html-diff-marker-color-wrap`，会找到**两处**定义：第一处（靠前）位于基础组件区，第二处（靠后）位于样式编辑区。行号仅供参考，以类名/选择器搜索为准。

**两处定义对比**：

| 定义顺序 | 所在区域 | 尺寸 | hover 边框色 | 说明 |
|----------|----------|------|-------------|------|
| 第一处（靠前） | 基础组件区 | 30×30px | `var(--hdm-primary)` | 与设计稿一致，包含完整样式（border、overflow、::before 等） |
| 第二处（靠后） | 样式编辑区 | 22×22px | `var(--hdm-primary-light)` | 重复定义，用 `!important` 覆盖了基础组件的尺寸和 hover 色 |

**第一处（基础组件区，正确）**：
```css
.html-diff-marker-color-wrap {
  position: relative !important;
  width: 30px !important;      /* 正确尺寸 */
  height: 30px !important;     /* 正确尺寸 */
  flex-shrink: 0 !important;
  background: var(--hdm-bg-white) !important;
  border: 1px solid var(--hdm-border) !important;
  border-radius: var(--hdm-radius-xs) !important;
  cursor: pointer !important;
  transition: all var(--hdm-transition-fast) !important;
  box-sizing: border-box !important;
  overflow: hidden !important;  /* 必要：防止内部色块溢出圆角 */
}
.html-diff-marker-color-wrap:hover {
  border-color: var(--hdm-primary) !important;  /* hover: 主题主色 */
}
```

**第二处（样式编辑区，重复且错误）**：
```css
.html-diff-marker-color-wrap {
  position: relative !important;
  width: 22px !important;      /* 错误：覆盖为 22px */
  height: 22px !important;     /* 错误：覆盖为 22px */
  border-radius: 4px !important;
  border: 1px solid var(--hdm-border) !important;
  overflow: hidden !important;  /* 正确：保留是必要的 */
  flex-shrink: 0 !important;
  cursor: pointer !important;
  box-sizing: border-box !important;
}
.html-diff-marker-color-wrap:hover {
  border-color: var(--hdm-primary-light) !important;  /* 与基础组件区不一致 */
}
```

**设计稿规格**：30px × 30px（`.hdm-color-picker`），同样带有 `overflow: hidden`，hover 边框色为 `var(--theme-primary)`（主题主色）。设计稿原文如下（第1038行）：
```css
.hdm-color-picker:hover { border-color: var(--theme-primary); }
```

**问题机制**：由于 CSS 层叠规则，**后定义的样式会覆盖先定义的同名样式**（在相同特异性下）。样式编辑区的重复定义位于文件后部，因此其 22×22px 的尺寸覆盖了基础组件区的 30×30px 正确尺寸。

> **关于 `overflow: hidden` 的说明**：设计稿 `.hdm-color-picker` 同样带有 `overflow: hidden`，这是必要的——用于防止内部色块（`::before` 伪元素）溢出圆角边框。因此保留该属性是正确的。

**影响范围**：样式编辑区域的「背景颜色」「文本颜色」等颜色属性行。

---

#### 根因 2：样式属性重置按钮尺寸过小且样式不匹配（P1）

**定位方式**：
- 在 `content.css` 中搜索 `.html-diff-marker-style-prop-reset` 找到样式定义
- 在 `content.js` 中搜索 `style-prop-reset` 找到类名赋值位置

行号仅供参考，以类名/选择器搜索为准。

**类名组合**：重置按钮的实际类名为 `html-diff-marker-btn--icon html-diff-marker-style-prop-reset`（两个类同时存在）。

**样式叠加关系**：

| 类 | 定位方式 | 提供的基础样式 | 尺寸 |
|----|---------|---------------|------|
| `.html-diff-marker-btn--icon` | 搜索 `.html-diff-marker-inspector .html-diff-marker-btn--icon` | 透明背景、灰色文字、无边框、圆角 | 28×28px |
| `.html-diff-marker-style-prop-reset` | 搜索 `.html-diff-marker-style-prop-reset` | 覆盖尺寸、opacity 控制、hover 变 error 色 | 22×22px（覆盖前者） |

**`btn--icon` 基础样式**（在编辑面板内的定义）：
```css
.html-diff-marker-inspector .html-diff-marker-btn--icon {
  background: transparent !important;
  color: var(--hdm-text-secondary) !important;
  border: none !important;
  width: 28px !important;       /* 基础尺寸 28px */
  height: 28px !important;      /* 基础尺寸 28px */
  padding: 0 !important;
  border-radius: var(--hdm-radius-sm) !important;
}
```

**`style-prop-reset` 覆盖样式**：
```css
.html-diff-marker-style-prop-reset {
  width: 22px !important;       /* 错误：覆盖为 22px */
  height: 22px !important;      /* 错误：覆盖为 22px */
  flex-shrink: 0 !important;
  opacity: 0.6 !important;      /* 用 opacity 控制视觉，而非背景色 */
  transition: opacity var(--hdm-transition-fast) !important;
}
.html-diff-marker-style-prop-reset:hover {
  opacity: 1 !important;
  color: var(--hdm-error) !important;  /* hover 变 error 色，与设计稿不符 */
}
```

**设计稿规格**：28px × 28px（`.hdm-prop-reset`），主题色柔和背景 + 主题色文字，hover 时背景加深 + 深色文字。

**设计稿 `.hdm-prop-reset` 完整样式**：
```css
.hdm-prop-reset {
  width: 28px;
  height: 28px;
  background: var(--theme-soft-bg);      /* 主题色柔和背景 */
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--theme-primary);            /* 主题色文字 */
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}
.hdm-prop-reset:hover {
  background: #e9e4f3;                    /* hover: 深紫色背景 */
  color: var(--theme-primary-dark);       /* hover: 深色文字 */
}
```

**问题**：
1. `style-prop-reset` 用 `!important` 将尺寸从基础类的 28px 覆盖为 22px，导致按钮偏小
2. 使用 `opacity` 控制视觉呈现（0.6 → 1），而非设计稿的主题色柔和背景
3. hover 时颜色变为 `error` 色（红色），与设计稿的深紫色背景 + 深色文字不符

**影响范围**：所有样式属性行（文字样式、样式编辑等区域）的重置按钮。

---

#### 根因 3：添加字体按钮类名不匹配（P2）

**定位方式**：在 `content.js` 中搜索 `addFontBtn.className` 即可定位。行号仅供参考，以变量名搜索为准。

```javascript
const addFontBtn = document.createElement('button');
addFontBtn.className = 'html-diff-marker-btn--icon';
addFontBtn.textContent = '+';
```

**设计稿规格**：使用专用类 `.hdm-add-font-btn`，绿色背景（success-bg），success 边框色。

**问题**：当前使用通用的 `btn--icon` 类（透明背景、灰色图标），而非设计稿中绿色的「添加字体」按钮样式。虽然尺寸 28px 与设计稿一致，但颜色和语义不匹配。

**影响范围**：文字样式区域的字体选择行。

---

### 问题二：滑块缺少外圈

#### 根因：滑块轨道（track）设置了 `overflow: hidden`，裁剪了滑块（P0）

**DOM 结构（当前实现）**：

```
.html-diff-marker-slider-track-wrap (高 16px, position: relative, cursor: pointer)
  └── .html-diff-marker-slider-track (高 4px, position: relative, overflow: hidden)
        ├── .html-diff-marker-slider-fill (高 4px, position: absolute)
        └── .html-diff-marker-slider-thumb (16×16px, position: absolute, top: 50%, transform: translate(-50%, -50%))
```

> **与设计稿的结构差异**：设计稿只有单层 `.hdm-slider-track`（直接作为轨道和定位容器），当前实现多了一层 `.html-diff-marker-slider-track-wrap`（16px 高的交互热区容器）。

**样式对比**：

| 层级 | 类名 | 高度 | position | overflow |
|------|------|------|----------|----------|
| 外层（当前实现多的） | `.html-diff-marker-slider-track-wrap` | 16px | relative | 未设置（可见） |
| 轨道层 | `.html-diff-marker-slider-track`（当前） / `.hdm-slider-track`（设计稿） | 4px | relative | **当前: hidden / 设计稿: 无** |
| 滑块 | `.html-diff-marker-slider-thumb` / `.hdm-slider-thumb` | 16px | absolute | — |

**track 层的样式**（搜索 `.html-diff-marker-slider-track {` 定位）：
```css
.html-diff-marker-slider-track {
  position: relative !important;
  width: 100% !important;
  height: 4px !important;
  background: var(--hdm-border) !important;
  border-radius: 2px !important;
  overflow: hidden !important;  /* <-- 罪魁祸首 */
}
```

**thumb 的样式**（搜索 `.html-diff-marker-slider-thumb {` 定位）：
```css
.html-diff-marker-slider-thumb {
  position: absolute !important;
  top: 50% !important;
  width: 16px !important;
  height: 16px !important;
  background: var(--hdm-text-white) !important;
  border: 2px solid var(--hdm-primary) !important;  /* 外圈本身是有的 */
  border-radius: 50% !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15) !important;
  transform: translate(-50%, -50%) !important;
  cursor: grab !important;
  /* ... */
}
```

**问题机制**：

thumb 是 `position: absolute`，其定位参照的是最近的 `position: relative` 祖先——即 `.html-diff-marker-slider-track`（4px 高）。thumb 通过 `top: 50%; transform: translate(-50%, -50%)` 垂直居中于 track。

但 track 高度仅 4px，且设置了 `overflow: hidden`，导致：

- thumb 尺寸 16×16px，在 track 的 4px 高度范围内居中
- 上下各超出 track `(16px - 4px) / 2 = 6px`
- `overflow: hidden` 将超出部分裁剪掉
- 可见部分仅中间 4px 高度的一条横向带
- 滑块的圆形外观被严重压扁，2px 的主题色边框（外圈）几乎看不见
- 最终效果：滑块看起来没有外圈，甚至不像圆形

> **关于 `track-wrap` 层的补充说明**：
> - `track-wrap` 高 16px、`position: relative`、`cursor: pointer`，作为交互热区容器
> - 但 thumb 的 `position: absolute` 参照的是内层 `track`（也是 `position: relative`），而非 `track-wrap`
> - 移除 `track` 上的 `overflow: hidden` 后，thumb 可以完整显示
> - 16px 高的 thumb + 2px border，在 16px 高的 `track-wrap` 范围内可以完整呈现（`box-sizing: border-box` 时总高恰好 16px）
> - **事件绑定位置**：`mousedown` 事件绑定在 `track` 和 `thumb` 上（在 `content.js` 中搜索 `slider-track` 或 `slider-thumb` 的事件监听），而非 `track-wrap`。`track-wrap` 仅提供 `cursor: pointer` 视觉提示

---

#### 根因（补充）：滑块 track-wrap 的视觉热区与事件绑定不一致（P1）

**问题现象**：`track-wrap` 高 16px 且设置了 `cursor: pointer`，视觉上整个 16px 高度区域都暗示可点击。但 `mousedown` 事件实际绑定在 `track` 上（仅 4px 高），导致上下各 6px 区域是"视觉欺骗"——鼠标指针显示为手型但点击无反应。

**DOM 结构与事件绑定**（来自 `content.js` 的 `createSlider` 函数）：

```
trackWrap (高 16px, cursor: pointer, 无事件绑定)  ← 视觉热区 16px
  └── track (高 4px, position: relative, mousedown 绑定于此)  ← 实际交互热区 4px
        ├── fill (高 4px, pointer-events: none)
        └── thumb (16×16px, mousedown 绑定于此)
```

**代码证据**（`content.js` 第 625-640 行）：
```javascript
thumb.addEventListener('mousedown', function(e) { ... });

track.addEventListener('mousedown', function(e) {  // ← 事件绑定在 track 上，而非 track-wrap
  e.preventDefault(); e.stopPropagation();
  if (e.button !== 0) return;
  dragging = true;
  updateFromEvent(e);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'ew-resize';
}, true);
```

**热区不匹配计算**：
- track-wrap 高度：16px
- track 高度：4px，在 track-wrap 中垂直居中
- 顶部死区：`(16px - 4px) / 2 = 6px`（鼠标显示 pointer 但点击无反应）
- 底部死区：6px
- 实际有效点击高度：仅中间 4px

**设计稿对照**：设计稿只有单层 `.hdm-slider-track`，4px 高且 `cursor: pointer`，事件直接绑定在 track 上，视觉热区与交互热区一致（均为 4px）。

**为什么当前实现多了一层 track-wrap**：推测是为了提供更大的点击热区，提升可用性。但实现不完整——只加了视觉层（cursor: pointer），没把事件移上去，导致"半吊子"效果。

**影响范围**：所有滑块组件。虽然不影响功能，但降低了交互体验，用户可能困惑为什么有些地方点了没反应。

**设计稿规格**：`.hdm-slider-track` 没有 `overflow: hidden`，thumb 完整显示为圆形，带 2px 主题色边框（外圈）。

**影响范围**：所有使用滑块的属性（字号、圆角、位置调整、宽高等）。

---

## 设计稿与当前实现完整差异对照表

### 组件级差异

| 组件 | 设计稿 | 当前实现 | 根因 | 差异等级 |
|------|--------|----------|------|----------|
| 颜色选择器（样式行内） | 30×30px | 22×22px | 基础组件定义（搜索 `.html-diff-marker-color-wrap` 第一处）被样式编辑区重复定义（第二处）覆盖 | P0 严重 |
| 滑块轨道 overflow | 无 hidden | overflow: hidden | track 层错误设置 overflow: hidden，裁剪了 thumb 的上下部分 | P0 严重 |
| 滑块点击热区 | 4px 热区（单层 track），视觉与交互一致 | 16px 视觉热区（track-wrap）+ 4px 实际热区（track），上下各 6px 死区 | mousedown 事件绑定在 track 上，而非 track-wrap | P1 主要 |
| 样式属性重置按钮 | 28×28px，主题色柔和背景，hover 深紫背景+深色文字 | 22×22px，透明背景+opacity 控制，hover 变 error 色 | style-prop-reset 覆盖 btn--icon 基础类的尺寸和样式 | P1 主要 |
| 添加字体按钮 | 绿色 success 样式 | 通用 icon 按钮样式 | 类名不匹配，使用 btn--icon 而非专用类 | P2 次要 |
| 基础输入框高度 | 32px | 36px | — | P3 轻微（属性行使用 sm 版本 30px 是对的） |
| 小型下拉框高度 | 30px | 30px | — | ✅ 一致 |
| 小型输入框高度 | 30px | 30px | — | ✅ 一致 |

### 布局结构差异

| 区域 | 设计稿结构 | 当前实现结构 | 备注 |
|------|------------|--------------|------|
| 文字样式 | 在「样式编辑」分组内，使用 `.hdm-prop-row` | 独立分组，使用 `.html-diff-marker-style-prop-row` | 结构不同但功能一致 |
| 滑块组件 | 单层 track 包裹 fill + thumb | track-wrap 包裹 track，track 包裹 fill + thumb | 多了一层 track-wrap |
| 重置按钮位置 | 属性行末尾，在控件行内 | 两种位置：滑块的在 header 内，其他的在控件行内 | 滑块的重置按钮位置不同 |

---

## 逐步排障记录

### 步骤 1：确认问题现象
- 用户反馈：编辑面板中文字样式和样式编辑区域输入框、按钮高度不一致；滑块没有外圈
- 读取 `content.css` 和 `ui-preview-v5.2-showcase.html` 进行对比

### 步骤 2：定位颜色选择器尺寸问题
- 搜索颜色选择器相关类名：`.html-diff-marker-color-wrap`
- 发现有**两处**定义：第一处（靠前，基础组件区，30×30px）和第二处（靠后，样式编辑区，22×22px）
- 验证 CSS 层叠规则：后定义的 22px 覆盖了先定义的 30px
- 设计稿中 `.hdm-color-picker` 为 30×30px，且带有 `overflow: hidden`（必要）
- 结论：样式编辑区的重复定义覆盖了基础组件的正确尺寸，导致颜色选择器偏小 8px

### 步骤 3：定位重置按钮尺寸问题
- 搜索样式属性重置按钮：`.html-diff-marker-style-prop-reset`
- 在 `content.js` 中确认实际类名为 `html-diff-marker-btn--icon html-diff-marker-style-prop-reset`（两叠加）
- `btn--icon` 基础类提供 28×28px，`style-prop-reset` 用 `!important` 覆盖为 22×22px
- 发现当前使用 `opacity` 控制视觉，hover 变 `error` 色，均与设计稿不符
- 设计稿中 `.hdm-prop-reset` 为 28×28px，主题色柔和背景，hover 深紫背景+深色文字
- 结论：`style-prop-reset` 对 `btn--icon` 基础类的覆盖存在多处错误

### 步骤 4：定位滑块外圈问题
- 搜索滑块相关样式：`.html-diff-marker-slider-thumb`
- thumb 本身有 `border: 2px solid var(--hdm-primary)`，边框样式正确
- 检查 DOM 结构：发现多了一层 `.html-diff-marker-slider-track-wrap`（16px 高）
- 检查父容器：发现 `.html-diff-marker-slider-track` 有 `overflow: hidden`
- 对比设计稿：`.hdm-slider-track` 没有 `overflow: hidden`，且只有单层 track
- 推论：track 上的 overflow: hidden 裁剪了 thumb 的上下部分，导致圆形滑块被压扁，边框（外圈）不可见

### 步骤 5：验证 overflow 假设与 track-wrap 影响
- 逻辑推演：thumb 16px 高，track 4px 高，thumb 以 track 为定位参照垂直居中
- 上下各超出 track 6px，overflow: hidden 会裁剪这部分
- 最终可见高度仅 4px，圆形变成横向条带
- 验证 track-wrap 影响：thumb 总高 16px（含 border），track-wrap 高 16px，移除 overflow 后可完整显示
- 验证事件绑定：`mousedown` 绑定在 track 和 thumb 上（content.js 第 625-640 行），不受 track-wrap 影响
- 结论：假设成立，track 的 overflow: hidden 是根因，track-wrap 不影响修复

### 步骤 6：发现滑块 track-wrap 点击热区与事件绑定不一致
- 检查 `track-wrap` 样式：高 16px，`cursor: pointer`，视觉上暗示整个区域可点击
- 检查事件绑定（content.js 第 633 行 `track.addEventListener('mousedown'`）：事件绑定在 track 上
- track 高度仅 4px，在 16px 的 track-wrap 中垂直居中
- 计算死区：上下各 6px 区域，鼠标显示 pointer 但点击无反应
- 对比设计稿：单层 track，4px 高，cursor: pointer 在 track 上，视觉与交互一致
- 结论：当前实现的 track-wrap 提供了更大的视觉热区，但事件未跟上，存在交互体验问题

### 步骤 7：检查添加字体按钮
- 搜索字体添加按钮的类名
- 当前使用 `html-diff-marker-btn--icon`（通用图标按钮）
- 设计稿使用专用类 `.hdm-add-font-btn`（绿色 success 样式）
- 结论：类名不匹配，样式语义不对应

---

## 解决方案

### 临时止血方案
无（纯样式问题，不影响功能，可直接修复）

### 永久修复方案

#### 修复 1：删除样式编辑区重复的颜色选择器定义（P0）

**根因回顾**：`content.css` 中有两处 `.html-diff-marker-color-wrap` 定义。基础组件区的定义是正确的 30×30px，样式编辑区的重复定义是错误的 22×22px，后者因 CSS 层叠规则（后定义覆盖先定义）覆盖了前者。

**定位方式**：在 `extension/content/content.css` 中搜索 `.html-diff-marker-color-wrap`，会找到**两处**定义：
- 第一处（靠前）：基础组件区定义，30×30px，正确，**保留**
- 第二处（靠后）：样式编辑区定义，22×22px，错误，**删除**

行号仅供参考（基础组件区约第 1051 行，样式编辑区约第 2496 行），以类名/选择器搜索结果为准。

**修复方案**：**删除样式编辑区的重复定义块**（即搜索结果中的第二处），保留基础组件区的定义即可。

**需删除的重复定义块（样式编辑区，第二处）**：
```css
/* 颜色选择器包装 */
.html-diff-marker-color-wrap {
  position: relative !important;
  width: 22px !important;
  height: 22px !important;
  border-radius: 4px !important;
  border: 1px solid var(--hdm-border) !important;
  overflow: hidden !important;
  flex-shrink: 0 !important;
  cursor: pointer !important;
  box-sizing: border-box !important;
}
.html-diff-marker-color-wrap:hover {
  border-color: var(--hdm-primary-light) !important;
}
```

**保留的基础组件定义（第一处）**：
```css
.html-diff-marker-color-wrap {
  position: relative !important;
  width: 30px !important;      /* ✅ 正确尺寸 */
  height: 30px !important;     /* ✅ 正确尺寸 */
  flex-shrink: 0 !important;
  background: var(--hdm-bg-white) !important;
  border: 1px solid var(--hdm-border) !important;
  border-radius: var(--hdm-radius-xs) !important;
  cursor: pointer !important;
  transition: all var(--hdm-transition-fast) !important;
  box-sizing: border-box !important;
  overflow: hidden !important;  /* ✅ 保留：防止内部色块溢出圆角 */
}
.html-diff-marker-color-wrap:hover {
  border-color: var(--hdm-primary) !important;  /* ✅ hover 边框色：主题主色 */
}
```

> **关于 `overflow: hidden`**：基础定义中的 `overflow: hidden` 是必要的，与设计稿 `.hdm-color-picker` 一致，用于防止内部色块（`::before` 伪元素）溢出圆角边框。**不需要删除**。

> **关于 `::before` 伪元素**：基础定义中 `::before` 的 `top/left/right/bottom: 3px` 已经适配 30×30px 的尺寸，无需额外调整。

> **⚠️ hover 边框色变更说明（设计稿一致性验证）**：
> 删除样式编辑区的重复定义后，颜色选择器的 hover 边框色会发生变化：
> - **变更前**：样式编辑区的颜色选择器 hover 边框为 `--hdm-primary-light`（浅紫色）
> - **变更后**：统一使用基础组件区的 `--hdm-primary`（主题主色）
>
> 这是**符合设计稿的预期变更**。设计稿原文证据（`ui-preview-v5.2-showcase.html` 第 1038 行）：
> ```css
> .hdm-color-picker:hover { border-color: var(--theme-primary); }
> ```
>
> 论证如下：
> 1. 设计稿明确使用 `var(--theme-primary)`（主色），与基础组件区的 `--hdm-primary` 一致
> 2. 样式编辑区的 `--hdm-primary-light` 是历史遗留的不一致实现，不符合设计稿
> 3. 全项目统一 hover 边框色为主题主色，符合语义化和一致性原则
> 4. 视觉差异极小（light 与 primary 同色系，深浅差异不明显）
>
> 若需要保持原样式编辑区的浅色 hover 效果，应修改基础组件区的 hover 定义为 `--hdm-primary-light`，而非保留重复定义。但从设计稿还原的角度，推荐采用当前方案（统一为主色）。

#### 修复 2：移除滑块轨道（track）的 overflow: hidden（P0）

**定位方式**：在 `extension/content/content.css` 中搜索 `.html-diff-marker-slider-track {` 即可定位到轨道定义块（约第 3751 行附近）。行号仅供参考，以类名/选择器搜索为准。

**修改**：删除 `overflow: hidden !important;` 这一行

```css
.html-diff-marker-slider-track {
  position: relative !important;
  width: 100% !important;
  height: 4px !important;
  background: var(--hdm-border) !important;
  border-radius: 2px !important;
  /* overflow: hidden !important;  <-- 删除此行 */
}
```

**track-wrap 层的兼容性验证**：

当前实现比设计稿多了一层 `.html-diff-marker-slider-track-wrap`（16px 高），需要验证移除 overflow: hidden 后的显示和交互：

| 验证项 | 结论 | 说明 |
|--------|------|------|
| thumb 完整显示在 track-wrap 内 | ✅ 正常 | thumb 高 16px + 2px border = 16px 总高（box-sizing: border-box），与 track-wrap 的 16px 高度恰好匹配 |
| thumb 垂直居中 | ✅ 正常 | thumb 以 track 为定位参照，`top: 50%; transform: translateY(-50%)`，track 本身在 track-wrap 中垂直居中（track-wrap 为 flex + align-items: center） |
| 事件绑定 | ⚠️ 需修复 | `mousedown` 当前绑定在 `track` 上（仅 4px 有效热区），与 track-wrap 的 16px 视觉热区不一致，需移到 `track-wrap` 上（见修复 3） |
| fill 溢出风险 | ✅ 安全 | `fill` 是 `position: absolute` 且高度 100%，宽度按百分比设置，不会垂直溢出 |
| border-radius 显示 | ✅ 正常 | 保留 `border-radius: 2px` 确保轨道圆角正确显示 |

**注意**：`track-wrap` 层（16px 高、`cursor: pointer`）作为交互热区保留，无需修改样式，但事件绑定需要调整（见修复 3）。

#### 修复 3：将滑块 mousedown 事件从 track 移到 track-wrap（P1）

**根因回顾**：`track-wrap` 高 16px 且有 `cursor: pointer`，视觉上暗示整个 16px 区域可点击。但 `mousedown` 事件绑定在 `track` 上（仅 4px 高），导致上下各 6px 区域点击无反应，是"视觉欺骗"。

**定位方式**：在 `extension/content/content.js` 中搜索 `createSlider` 函数，找到 `track.addEventListener('mousedown'` 这一行（约第 633 行）。行号仅供参考，以变量名/选择器搜索为准。

**修改步骤**：

##### 步骤 3.1：将 mousedown 事件从 track 移到 track-wrap

**修改前**：
```javascript
track.addEventListener('mousedown', function(e) {
  e.preventDefault(); e.stopPropagation();
  if (e.button !== 0) return;
  dragging = true;
  updateFromEvent(e);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'ew-resize';
}, true);
```

**修改后**：
```javascript
trackWrap.addEventListener('mousedown', function(e) {
  e.preventDefault(); e.stopPropagation();
  if (e.button !== 0) return;
  dragging = true;
  updateFromEvent(e);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'ew-resize';
}, true);
```

> **为何修改事件绑定目标而非移除 track-wrap**：
> - 设计稿只有单层 track（4px 高），热区较小
> - 当前实现增加 track-wrap 层的初衷是扩大点击热区，提升可用性
> - 16px 的点击热区符合 Fitts's Law，比设计稿的 4px 更易用
> - 因此选择保留 track-wrap 的视觉扩大热区设计，补全事件绑定，使其名副其实
> - 如果严格还原设计稿，应移除 track-wrap 层并将事件直接绑在 track 上，但会牺牲可用性

##### 步骤 3.2：验证 updateFromEvent 的坐标计算不受影响

`updateFromEvent` 函数使用 `track.getBoundingClientRect()` 计算点击位置的百分比：

```javascript
function updateFromEvent(e) {
  const rect = track.getBoundingClientRect();
  let pct = (e.clientX - rect.left) / rect.width;
  // ...
}
```

由于 `track` 和 `track-wrap` 宽度相同（均为 100%），且水平方向对齐，因此即使事件绑定在 `trackWrap` 上，`e.clientX` 相对于 `track.getBoundingClientRect()` 的水平计算仍然正确。垂直方向不影响滑块逻辑。

**验证要点**：
- 点击 track-wrap 的顶部区域（远离 track 的位置），滑块应能正常跳转
- 点击 track-wrap 的底部区域，滑块应能正常跳转
- thumb 的拖动不受影响（事件仍在 thumb 上）
- `updateFromEvent` 的水平计算精度不受影响

#### 修复 4：修正样式属性重置按钮的尺寸和样式（P1）

**前提说明**：重置按钮的类名为 `html-diff-marker-btn--icon html-diff-marker-style-prop-reset`，两个类同时存在。`btn--icon` 是基础类，提供 28×28px 尺寸、透明背景、灰色文字等基础样式；`style-prop-reset` 是修饰类，当前用 `!important` 错误地覆盖了尺寸和交互样式。

**修复策略**：保留 `btn--icon` 作为基础类，修正 `style-prop-reset` 的覆盖逻辑——尺寸恢复为 28px（与基础类一致或不覆盖），移除 `opacity` 控制，改用主题色背景方案，并修正 hover 状态。hover 背景色采用语义化 CSS 变量 `--hdm-primary-bg-hover`，与项目中已有的 `--hdm-success-bg-hover`、`--hdm-error-bg-hover` 模式保持一致。`border-radius` 使用 `--hdm-radius-xs`（4px），与设计稿 `.hdm-prop-reset` 的 4px 圆角一致。

> **变量体系遵循**：项目采用**两层变量体系**——主题层（`--hdm-theme-*`，随主题切换）与品牌语义别名层（`--hdm-primary-*`，指向主题变量）。新增的 hover 变量严格遵循此模式，与 `--hdm-primary-bg: var(--hdm-theme-soft-bg)` 的实现方式完全一致。

**定位方式**：在 `extension/content/content.css` 中搜索 `.html-diff-marker-style-prop-reset` 即可定位到该定义块（位于样式编辑区，约 2476 行附近）。行号仅供参考，以类名/选择器搜索为准。

**修改步骤**：

##### 步骤 4.1：按两层变量体系新增 soft-bg-hover 变量（CSS + JS 双端）

项目采用两层变量体系：
1. **主题层**：`--hdm-theme-soft-bg-hover`（在 `:root` 设默认，各 `[data-theme="xxx"]` 覆盖）
2. **品牌语义别名层**：`--hdm-primary-bg-hover: var(--hdm-theme-soft-bg-hover)`（仅在 `:root` 定义，指向主题变量）

同时，JS 端的动态自定义主题（`deriveColors` + `_applyCustomColors`）也需要同步添加 `softBgHover` 的计算与设置。

---

**4.1.1 CSS 端：主题层变量**

**文件**：`extension/content/content.css`

在 `:root` 的主题变量区（约第 14 行 `--hdm-theme-soft-bg` 之后）新增：
```css
  --hdm-theme-soft-bg-hover: #E9E4F3;  /* 柔和背景 hover 态（默认：暮紫，设计稿给定） */
```

在四套预设主题块中分别新增：

| 主题 | 色值 | 所在位置 |
|------|------|----------|
| deep-cyan（深海蓝） | `#E0DEEC` | `[data-theme="deep-cyan"]`，约第 235 行 `--hdm-theme-soft-bg` 之后 |
| gray-green（灰绿） | `#E0E6E1` | `[data-theme="gray-green"]`，约第 248 行 `--hdm-theme-soft-bg` 之后 |
| dusk-purple（暮紫） | `#E9E4F3` | `[data-theme="dusk-purple"]`，约第 261 行 `--hdm-theme-soft-bg` 之后 |
| warm-brown（暖棕） | `#EDE2E2` | `[data-theme="warm-brown"]`，约第 274 行 `--hdm-theme-soft-bg` 之后 |

---

**4.1.2 CSS 端：品牌语义别名层变量**

在 `:root` 的品牌色变量区（约第 27 行 `--hdm-primary-bg-soft` 之后）新增：
```css
  --hdm-primary-bg-hover: var(--hdm-theme-soft-bg-hover);
```

> **变量命名与层级说明**：
> - 主题层使用 `--hdm-theme-soft-bg-hover`，与 `--hdm-theme-soft-bg` 同属主题原生变量层级
> - 别名层使用 `--hdm-primary-bg-hover`，与 `--hdm-primary-bg` 同属品牌语义别名层级
> - 样式代码中统一引用别名层变量 `--hdm-primary-bg-hover`，与 `--hdm-primary-bg` 的引用模式一致
> - 此模式与 `--hdm-success-bg-hover`、`--hdm-error-bg-hover` 命名风格保持一致（功能色 hover 变量同样以 `bg-hover` 结尾）

---

**4.1.3 JS 端：动态自定义主题的 softBgHover 推导**

**文件**：`extension/content/content.js`

在 `deriveColors` 函数中，`softBg` 计算（搜索 `const softBg =`）之后新增 `softBgHover` 推导：

```javascript
// 柔和背景色：亮度极高（88%-92%），饱和度低
const softBgL = Math.min(95, l + 50);
const softBgS = Math.max(10, s - 30);
const softBg = hslToHex(h, softBgS, softBgL);

// 柔和背景 hover 态：在 softBg 基础上明度降 3%，饱和度升 8%
const softBgHoverL = Math.max(80, softBgL - 3);
const softBgHoverS = Math.min(60, softBgS + 8);
const softBgHover = hslToHex(h, softBgHoverS, softBgHoverL);
```

在 `deriveColors` 的 return 对象中（搜索 `softBg: softBg,`）新增字段：
```javascript
return {
  primary: safePrimary,
  light: light,
  dark: dark,
  gradient: gradient,
  softBg: softBg,
  softBgHover: softBgHover,    // 新增
  softText: softText,
  countText: countText,
  shadow: shadow,
  alpha20: alpha20
};
```

在 `_applyCustomColors` 函数中（搜索 `style.setProperty('--hdm-theme-soft-bg'`）新增设置：
```javascript
style.setProperty('--hdm-theme-soft-bg', colors.softBg);
style.setProperty('--hdm-theme-soft-bg-hover', colors.softBgHover);  // 新增
```

同时，在主题重置/清除处（搜索 `style.removeProperty('--hdm-theme-soft-bg'`）也需要同步新增：
```javascript
style.removeProperty('--hdm-theme-soft-bg');
style.removeProperty('--hdm-theme-soft-bg-hover');  // 新增
```

> **色值推导依据**：
> - **暮紫主题（dusk-purple）**：hover 色值 `#E9E4F3` 直接来自设计稿（`.hdm-prop-reset:hover { background: #e9e4f3; }`），为精确值
> - **其余三套预设主题**：色值为**近似值**，基于暮紫主题 soft-bg → hover 的 HSL 变化量统一推导
> - **推导方法**：以暮紫主题 soft-bg `#F0EEF7` → hover `#E9E4F3` 的 HSL 偏移为基准（明度 L 约 -3%，饱和度 S 约 +8%），在各主题 soft-bg 的基础上应用相同偏移量
> - **动态自定义主题**：`softBgHover` 采用完全相同的 HSL 推导公式（`softBgHoverL = softBgL - 3`，`softBgHoverS = softBgS + 8`），确保所有主题下 hover 态的视觉权重一致
>
> **四套主题 hover 色值推导表**：
> | 主题 | soft-bg（已知） | hover（推导/给定） | 说明 |
> |------|----------------|-------------------|------|
> | deep-cyan（深海蓝） | `#EDECF5` | `#E0DEEC` | HSL 近似推导值（L-3%, S+8%） |
> | gray-green（灰绿） | `#EEF2EF` | `#E0E6E1` | HSL 近似推导值（L-3%, S+8%） |
> | dusk-purple（暮紫） | `#F0EEF7` | `#E9E4F3` | 设计稿给定精确值 ✅ |
> | warm-brown（暖棕） | `#F5EFEF` | `#EDE2E2` | HSL 近似推导值（L-3%, S+8%） |
>
> ⚠️ **注**：暮紫以外主题的 hover 色值为基于 HSL 明度差的近似推导，最终需以设计稿确认为准。

##### 步骤 4.2：修改重置按钮样式

**修改前**：
```css
.html-diff-marker-style-prop-reset {
  width: 22px !important;       /* 错误：覆盖为 22px */
  height: 22px !important;      /* 错误：覆盖为 22px */
  flex-shrink: 0 !important;
  opacity: 0.6 !important;      /* 用 opacity 控制，非设计稿方案 */
  transition: opacity var(--hdm-transition-fast) !important;
}
.html-diff-marker-style-prop-reset:hover {
  opacity: 1 !important;
  color: var(--hdm-error) !important;  /* hover 变 error 色，错误 */
}
.html-diff-marker-style-prop-reset svg,
.html-diff-marker-style-prop-reset svg * {
  width: 14px !important;
  height: 14px !important;
  fill: none !important;
  stroke: currentColor !important;
}
```

**修改后（参考设计稿 `.hdm-prop-reset`）**：
```css
.html-diff-marker-style-prop-reset {
  width: 28px !important;       /* 恢复为 28px，与 btn--icon 基础类一致 */
  height: 28px !important;      /* 恢复为 28px */
  flex-shrink: 0 !important;
  background: var(--hdm-primary-bg) !important;  /* 覆盖 btn--icon 的 transparent，用语义化变量 */
  color: var(--hdm-primary) !important;          /* 覆盖 btn--icon 的 text-secondary，用语义化变量 */
  border: 1px solid transparent !important;
  border-radius: var(--hdm-radius-xs) !important;  /* 4px，与设计稿 .hdm-prop-reset 一致，用语义化变量 */
  opacity: 1 !important;        /* 移除 opacity 控制，改用背景色 */
  transition: all var(--hdm-transition-fast) !important;
}
.html-diff-marker-style-prop-reset:hover {
  background: var(--hdm-primary-bg-hover) !important;  /* 用语义化 hover 变量，浏览器兼容好 */
  color: var(--hdm-primary-hover) !important;           /* hover 文字用已有语义变量 */
  opacity: 1 !important;
}
.html-diff-marker-style-prop-reset svg,
.html-diff-marker-style-prop-reset svg * {
  width: 16px !important;      /* 图标略放大 */
  height: 16px !important;
  fill: none !important;
  stroke: currentColor !important;
}
```

> **样式覆盖关系说明**：
> - `btn--icon` 基础类提供：`background: transparent`、`color: text-secondary`、`border: none`、`width/height: 28px`
> - `style-prop-reset` 修饰类覆盖：`background: hdm-primary-bg`、`color: hdm-primary`、`border: 1px solid transparent`
> - 两者叠加后得到设计稿效果
>
> **为何使用 `--hdm-primary-bg` 而非 `--hdm-theme-soft-bg`**：项目已有 `--hdm-primary-bg` 品牌色别名（指向 `--hdm-theme-soft-bg`），使用语义化品牌色层（`--hdm-primary-*`）而非直接使用主题原生层（`--hdm-theme-*`），与 `--hdm-primary-bg-hover` 同属一个抽象层级，保持变量引用的一致性。

#### 修复 5：添加字体按钮使用专用样式（P2）

**定位方式**：
- CSS：在 `extension/content/content.css` 中搜索 `.html-diff-marker-btn--icon` 找到图标按钮基础定义区，在其后新增专用类
- JS：在 `extension/content/content.js` 中搜索 `addFontBtn.className` 即可定位（约第 3599 行附近）。行号仅供参考，以变量名搜索为准。

**修改**：新增 `.html-diff-marker-add-font-btn` 类，参考设计稿 `.hdm-add-font-btn`：

```css
.html-diff-marker-inspector .html-diff-marker-add-font-btn {
  width: 28px !important;
  height: 28px !important;
  background: var(--hdm-success-bg) !important;
  border: 1px solid var(--hdm-success-border) !important;
  border-radius: var(--hdm-radius-xs) !important;  /* 4px，与设计稿 .hdm-add-font-btn 一致 */
  color: var(--hdm-success) !important;
  font-size: 16px !important;
  font-weight: bold !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  transition: all var(--hdm-transition-fast) !important;
  padding: 0 !important;
  line-height: 1 !important;
}
.html-diff-marker-inspector .html-diff-marker-add-font-btn:hover {
  background: var(--hdm-success-bg-hover) !important;  /* 用语义化变量，与项目已有模式一致 */
}
```

> **选择器前缀说明**：使用 `.html-diff-marker-inspector` 前缀是为了提高 CSS 特异性（specificity），确保按钮样式在编辑面板内优先生效，防止被宿主页面的通用按钮样式覆盖。这与项目中同类按钮的选择器模式一致——例如 `.html-diff-marker-inspector .html-diff-marker-btn--icon` 也使用了相同的前缀模式。

**文件**：`extension/content/content.js`
**修改**：
```javascript
// 修改前
addFontBtn.className = 'html-diff-marker-btn--icon';

// 修改后
addFontBtn.className = 'html-diff-marker-add-font-btn';
```

---

## 验收手段

### 验证步骤

1. **滑块外圈验证（P0）**
   - 打开编辑面板，找到带滑块的属性（如字号、圆角）
   - 观察滑块是否为完整圆形，带有 2px 主题色边框
   - 拖动滑块，确认外圈在各种位置都完整显示
   - 验证 thumb 没有被 track-wrap 裁剪（16px thumb 在 16px track-wrap 内应完整显示）
   - 验证滑块仍可正常拖动（thumb 事件不受影响）

2. **滑块点击热区验证（P1）**
   - 在滑块轨道区域的**顶部边缘**（距离轨道中心约 6px 处）点击，验证滑块是否能正常跳转
   - 在滑块轨道区域的**底部边缘**点击，验证滑块是否能正常跳转
   - 在滑块轨道区域的**中间位置**点击，验证正常
   - 确认 track-wrap 的 16px 高度全域均可点击，与 `cursor: pointer` 视觉提示一致
   - 验证 thumb 拖动功能不受事件绑定位置变更的影响

3. **颜色选择器高度验证（P0）**
   - 找到「背景颜色」或「文本颜色」属性行
   - 观察颜色选择器与右侧输入框的高度是否一致（均为 30px）
   - 两者在 flex 布局中应垂直对齐
   - 确认颜色选择器仍有 `overflow: hidden`（内部色块不应溢出圆角）
   - 确认删除重复定义后，颜色选择器 hover 状态仍正常（border 变主题主色）
   - 验证 hover 边框色从 `--hdm-primary-light` 统一为 `--hdm-primary`（符合设计稿，设计稿第1038行 `.hdm-color-picker:hover { border-color: var(--theme-primary); }`）

4. **重置按钮尺寸与样式验证（P1）**
   - 观察各属性行末尾的重置按钮
   - 确认按钮尺寸为 28×28px，与输入框的 30px 高度接近
   - 按钮应有主题色柔和背景（非透明 + opacity）
   - hover 时背景使用 `--hdm-primary-bg-hover` 变量（底层指向 `--hdm-theme-soft-bg-hover`），文字使用 `--hdm-primary-hover` 变量（非 error 红色）
   - 验证 `btn--icon` 基础类与 `style-prop-reset` 修饰类的叠加效果正常
   - 验证 `border-radius` 使用 `--hdm-radius-xs` 变量（4px），与设计稿一致
   - 切换四套预设主题（暮紫、深藏青、灰绿、暖棕），确认重置按钮的背景色和 hover 态均正确显示，且 hover 态相对 normal 态的视觉深浅权重一致
   - 使用**自定义主题色**功能，验证动态生成的 `--hdm-theme-soft-bg-hover` 是否正确（hover 背景应比 normal 背景略深且同色系）

5. **添加字体按钮验证（P2）**
   - 找到文字样式区域的字体选择行
   - 确认「+」按钮为绿色 success 样式，28×28px
   - 验证 `border-radius` 使用 `--hdm-radius-xs` 变量（4px）
   - hover 时背景色变深

### 监控观察期
- 修复后在 3 个不同网站上测试，确认样式隔离未被破坏
- 特别关注 `all: unset` 重置规则对新样式的影响
- 验证滑块的可拖动区域是否正常（移除 overflow: hidden 后点击区域可能变化）
- 验证滑块 track-wrap 的点击热区是否在所有浏览器中表现一致

### 关键回归测试点
1. 滑块是否仍可正常拖动和响应点击（track-wrap 层的 cursor 指示是否正常）
2. 滑块 track-wrap 的顶部和底部边缘是否可点击（热区是否扩大到 16px）
3. 颜色选择器点击后是否正常弹出颜色面板
4. 所有按钮的 hover/active 状态是否正常（特别是重置按钮从 error 色改为深紫色后）
5. 四套主题切换时颜色是否正确
6. 在有强样式的宿主页面（如知乎、掘金）上测试，确保样式不被覆盖
7. 删除颜色选择器重复定义后，基础组件区的颜色选择器是否仍正常工作
8. 重置按钮的 `btn--icon` 基础类样式与 `style-prop-reset` 修饰类叠加是否正确
9. 添加字体按钮的 `border-radius` 是否正确使用 `--hdm-radius-xs` 变量（4px）
10. 滑块 mousedown 事件移到 track-wrap 后，`updateFromEvent` 的水平百分比计算是否仍然精确
11. 动态自定义主题下，`--hdm-theme-soft-bg-hover` 是否能正确生成并应用
12. 主题切换/重置时，`--hdm-theme-soft-bg-hover` 变量是否能正确设置和清除
13. 验证两层变量体系的正确性：修改 `--hdm-theme-soft-bg-hover` 后，`--hdm-primary-bg-hover` 是否同步变化
