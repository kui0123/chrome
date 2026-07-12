# Bug Report — V5.2 UI 布局系统性根因排查报告

**报告日期**：2026-07-12  
**排查范围**：工具栏、设置面板、元素编辑面板的布局错乱问题  
**核心文件**：
- `extension/content/content.css`
- `extension/content/content.js`
- `dev/pages/ui-preview-v5.2-showcase.html`

---

## 一、问题总览

| 区域 | 严重程度 | 核心现象 |
|------|----------|----------|
| 工具栏 | 🔴 严重 | 重置/设置按钮内容不可见（仅蓝色边框轮廓）、导出 Diff 文字不居中 |
| 设置面板 | 🔴 严重 | 开关与文字垂直排列、主题色卡片布局错乱、自定义颜色行布局异常 |
| 元素编辑面板 | 🟠 中等 | 标题"元素编辑"与右侧 "− / ×" 按钮垂直排列 |

---

## 二、已确认根因（高置信度）

### 根因 1：全局 button 恢复样式优先级高于组件级 button 样式 → theme-card 布局异常

**问题描述**：
设置面板的主题卡片（`.html-diff-marker-settings-theme-card`）是 `<button>` 元素，但全局 button 恢复样式（`.html-diff-marker-settings-panel button`）的优先级高于组件级样式，导致 `align-items: center` 和 `justify-content: center` 强制生效，与设计意图（左对齐）不符。

**涉及代码**：

```css
/* content.css 第 341-364 行：全局 button 恢复 */
.html-diff-marker-toolbar button,
.html-diff-marker-inspector button,
.html-diff-marker-settings-panel button,
... {
  display: inline-flex !important;
  align-items: center !important;    /* ← 强制居中对齐 */
  justify-content: center !important; /* ← 强制居中对齐 */
  ...
  line-height: 1 !important;
}

/* content.css 第 3881-3892 行：theme-card 组件样式 */
.html-diff-marker-settings-theme-card {
  background: #fff !important;
  border: 1.5px solid var(--hdm-border) !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  cursor: pointer !important;
  transition: all var(--hdm-transition-fast) !important;
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  box-sizing: border-box !important;
}
```

**优先级对比**：
- 全局 button 恢复：`.html-diff-marker-settings-panel button` = 1类 + 1元素 = **0-1-1**
- theme-card 组件样式：`.html-diff-marker-settings-theme-card` = 1类 = **0-1-0**

**全局 button 恢复优先级更高！**

**具体影响**：
| 属性 | 全局 button 恢复值 | theme-card 期望值 | 实际生效 | 是否冲突 |
|------|-------------------|------------------|----------|----------|
| display | inline-flex | flex | inline-flex | ⚠️ 轻微（flex 布局仍可用） |
| align-items | center | stretch（默认） | center | 🔴 冲突！子元素水平居中而非拉伸 |
| justify-content | center | flex-start（默认） | center | 🟡 column 方向上垂直居中而非顶部对齐 |
| line-height | 1 | normal | 1 | 🟡 文字行高可能偏小 |

**视觉表现**：
- 主题卡片内的预览条（`settings-theme-preview`）虽然显式设置了 `width: 100% !important`，宽度不会被压缩，但 `align-items: center` 会导致子元素在水平方向居中（对 width:100% 的元素无视觉影响）
- 主题名称（theme-name）和 HEX 文字（theme-hex）因 `align-items: center` 而水平居中，而非设计期望的左对齐（虽然它们自身设置了 `text-align: left`，但作为 flex item 整体居中了）
- 整个卡片内容因 `justify-content: center` 而垂直居中，而非顶部对齐
- `line-height: 1` 可能导致文字行高偏小，影响垂直间距

**影响范围**：
- 设置面板的 4 个主题卡片
- 所有面板中作为 button 元素且需要非居中布局的组件

**修复方向**：将 theme-card 的选择器改为 `.html-diff-marker-settings-panel .html-diff-marker-settings-theme-card`（提升到 0-2-0），并显式设置 `align-items: stretch` 和 `justify-content: flex-start`。

---

### 根因 2：导出按钮 SVG 样式未覆盖 fill 属性 → 线性图标被填充为实心色块（已确认根因）

**问题描述**：
导出按钮的 SVG 图标是 stroke-based 线性图标（`fill="none" stroke="currentColor"`），但导出按钮的 SVG 样式（`.html-diff-marker-export-btn svg`）只设置了 width、height、display，**没有设置 `fill: none`**。由于全局 SVG 恢复样式设置了 `fill: currentColor !important`，而导出按钮的 SVG 样式没有覆盖 fill 属性，导致线性图标被填充为实心色块。

**图标类型确认（来自 content.js 第 2333 行）**：
```js
// SVG_ICONS.export 定义 — 明确是线性图标（stroke-based）
export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>',
```
- `fill="none"`：无填充
- `stroke="currentColor" stroke-width="2"`：用描边绘制
- 结论：**确认为 stroke-based 线性图标，根因成立**

**涉及代码**：

```css
/* content.css 第 520-533 行：全局 SVG 恢复 */
.html-diff-marker-toolbar svg,
... {
  display: inline-block !important;
  width: 1em !important;
  height: 1em !important;
  fill: currentColor !important;   /* ← 全局填充（破坏线性图标） */
  stroke: currentColor !important;
  ...
}

/* content.css 第 2027-2031 行：导出按钮 SVG 样式（缺少 fill 覆盖！） */
.html-diff-marker-export-btn svg {
  width: 14px !important;
  height: 14px !important;
  display: block !important;
  /* ← 没有 fill: none */
  /* ← 没有 stroke: currentColor */
}
```

**优先级分析**：
- 全局 SVG 恢复：`.html-diff-marker-toolbar svg` = 1类 + 1元素 = **0-1-1**
- 导出按钮 SVG：`.html-diff-marker-export-btn svg` = 1类 + 1元素 = **0-1-1**

两者优先级相同。导出按钮 SVG 样式在文件中位置更靠后（第 2027 行 > 第 520 行），理论上应该覆盖全局样式。**但问题在于：导出按钮的 SVG 样式根本没有设置 fill 属性，所以 fill 的值仍然由全局恢复样式决定。**

**视觉表现**：
- 导出按钮的线性图标（导出箭头）被 `fill: currentColor` 填充成实心色块
- 由于图标是描边设计，填充后路径内部被颜色填满，箭头形状变成一团色块，难以辨认

**影响范围**：
- 工具栏导出按钮的 SVG 图标
- 导出按钮内的文字对齐也可能受 SVG 尺寸异常的间接影响

**修复方向**：为 `.html-diff-marker-export-btn svg` 添加 `fill: none !important; stroke: currentColor !important;`

---

### 根因 3：`:not()` 排除列表包含不存在的类名 + 遗漏关键容器

**问题描述**：
`div:not(...) { display: block }` 的排除列表与实际 DOM 结构不一致，存在"有其名无其实"和"有其实无其名"的问题。

#### 3.1 inspector 面板排除列表包含不存在的类名

**CSS 排除列表中**有 `html-diff-marker-inspector-title-row`（content.css 第 429 行）

**但实际 DOM 中**（content.js 第 3271-3301 行），inspector-header 内部结构是：
```html
<div class="html-diff-marker-inspector-header">
  <span class="html-diff-marker-inspector-title">元素编辑</span>
  <div class="html-diff-marker-inspector-header-btns">
    <button>−</button>
    <button>×</button>
  </div>
</div>
```

没有 `inspector-title-row` 这个中间层！

**影响**：
- CSS 中定义的 `.html-diff-marker-inspector-title-row` 样式完全浪费（第 2210-2215 行定义了 display: flex 等）
- 说明某次重构移除了 title-row 包裹层，但忘记更新 CSS 和排除列表
- 不直接导致布局问题，但说明代码存在不一致

#### 3.2 inspector 面板排除列表遗漏了关键容器

**遗漏 `html-diff-marker-inspector-body`**：
- inspector-body 是面板的主体滚动区域，需要作为 flex item 参与 inspector 的 flex 布局
- inspector-body 是 div 且不在排除列表中，所以 `div:not()` 规则会给它设置 `display: block`
- 但 `.html-diff-marker-inspector-body` 组件样式设置了 `flex: 1 !important`，没有设置 `display`
- `flex: 1` 作为 flex item 属性仍然有效（父容器 inspector 是 display: flex），但 inspector-body 自身的 display 是 block
- **影响待确认**：inspector-body 是否需要自身是 flex 容器？目前内部子元素用 block 布局即可正常工作（详见待验证假设 4）
- **修复建议**：建议在排除列表中添加 `inspector-body`，避免 `div:not()` 规则对其产生意外影响（即使当前无明显问题，也属于防御性修复）

#### 3.3 settings 面板排除列表遗漏多个 div

| 遗漏的类名 | 元素类型 | 期望 display | 影响评估 |
|-----------|----------|-------------|----------|
| `settings-toggle` | div | block（position: relative） | 🟡 中 — position: relative 由组件样式设置，应该正常 |
| `settings-section-title` | div | block | ✅ 无影响 |
| `settings-theme-preview` | div | block | ✅ 无影响 |
| `settings-theme-name` | div | block | ✅ 无影响 |
| `settings-theme-hex` | div | block | ✅ 无影响 |
| `settings-custom-preview` | div | block | ✅ 无影响 |

---

## 三、待验证假设（需要浏览器实测确认）

### 假设 1：工具栏重置/设置按钮内容不可见 → 原因待查（原优先级冲突假设已证伪）

**用户现象**：重置和设置按钮显示为"只有蓝色边框轮廓，内容为空"（只有按钮边框，内部 SVG 图标不可见）

**side-btn 按钮结构确认（来自 content.js）**：

```js
// 重置按钮（第 3060-3063 行）：只有 SVG，没有文字
const resetBtn = document.createElement('button');
resetBtn.className = 'html-diff-marker-side-btn';
resetBtn.innerHTML = SVG_ICONS.reset;  // ← 仅 SVG 图标
resetBtn.setAttribute('title', '重置（清除所有标记）');

// 设置按钮（第 3083-3086 行）：只有 SVG，没有文字
const settingsBtn = document.createElement('button');
settingsBtn.className = 'html-diff-marker-side-btn';
settingsBtn.innerHTML = SVG_ICONS.settings;  // ← 仅 SVG 图标
settingsBtn.setAttribute('title', '设置');
```

**SVG 图标类型确认**：
```js
// SVG_ICONS.reset（第 2331 行）— 线性图标
reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">...',

// SVG_ICONS.settings（同文件）— 线性图标
settings: '<svg ... fill="none" stroke="currentColor" stroke-width="2" ...>',
```

结论：**side-btn 内部只有 SVG 图标，无文字标签**。因此"内容为空"即 SVG 不可见。

**side-btn 样式确认（来自 content.css）**：

```css
/* 按钮容器（第 1966-1981 行）— 带面板前缀，优先级 0-2-0 */
.html-diff-marker-toolbar .html-diff-marker-side-btn {
  width: 36px !important;
  height: 40px !important;
  border: 1.5px solid var(--hdm-border) !important;
  background: var(--hdm-bg-white) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: var(--hdm-text-secondary) !important;
  ...
}

/* SVG 样式（第 1990-1997 行）— 无面板前缀，优先级 0-1-1 */
.html-diff-marker-side-btn svg,
.html-diff-marker-side-btn svg * {
  width: 14px !important;
  height: 14px !important;
  display: block !important;
  fill: none !important;
  stroke: currentColor !important;
}
```

**原假设证伪说明**：
此前认为组件级 SVG 样式选择器缺少面板前缀导致优先级不足，但经详细验证：
- 全局 SVG 恢复：`.html-diff-marker-toolbar svg` = **0-1-1**
- side-btn SVG 样式：`.html-diff-marker-side-btn svg` = **0-1-1**
- 两者优先级相同，文件中位置靠后的胜出
- side-btn SVG 样式在第 1990 行，全局 SVG 恢复在第 520 行
- **side-btn 明显在后，因此 `fill: none !important` 应当稳定覆盖 `fill: currentColor !important`**
- 结论：纯优先级冲突不是根因，原假设不成立

**`all: unset` 对 SVG 影响的深度分析**：

全局重置规则（第 316-338 行）：
```css
.html-diff-marker-toolbar *,
.html-diff-marker-inspector *,
... {
  all: unset !important;
  box-sizing: border-box !important;
}
```

`all: unset` 对 SVG 的作用机制：
1. **HTML 属性不受影响**：SVG 标签上的 `viewBox`、`fill="none"`、`stroke="currentColor"` 等**作为 HTML 属性**不受 CSS `all: unset` 影响
2. **CSS 属性被重置**：`width`、`height`、`display`、`fill`、`stroke` 等 CSS 属性会被重置为初始值
3. **内联 style 被清除**：SVG 上的 `style="width:14px;height:14px;"` 会被 `all: unset` 清除（因为内联样式也是 CSS 属性的来源之一）
4. **外部 CSS 规则仍然生效**：`!important` 的外部样式（如 `.html-diff-marker-side-btn svg { width: 14px !important }`）优先级高于 `all: unset`，应当正常生效

**新的可能原因（按概率排序）**：

1. **`all: unset` 导致 SVG 尺寸归 0（最高概率）**：
   - `all: unset` 将 SVG 的 `width` 和 `height` 重置为初始值 `auto`
   - 然后 side-btn SVG 样式设置 `width: 14px !important; height: 14px !important;` 应该恢复尺寸
   - 但在某些浏览器中，SVG 的 `width`/`height` 初始值行为可能与普通元素不同
   - 如果 `all: unset` 后 SVG 暂时变成 0x0，且外部 CSS 因某些原因未生效（如选择器不匹配），图标就不可见
   - **验证点**：DevTools 检查 SVG 的 computed width/height 是否为 14px

2. **`stroke: currentColor` 的 color 继承链断裂**：
   - 按钮设置了 `color: var(--hdm-text-secondary) !important`
   - SVG 设置了 `stroke: currentColor !important`
   - 但 `all: unset` 可能影响 color 的继承（color 是 inherited 属性，`all: unset` 会将其设为继承值）
   - 如果父链上某个元素的 color 被重置为 `transparent` 或与背景相同，图标就不可见
   - **验证点**：DevTools 检查 SVG 的 computed stroke 值和 color 值

3. **SVG 内部 path 元素的 stroke 未正确继承**：
   - CSS 规则 `.html-diff-marker-side-btn svg *` 选择了 SVG 内部所有元素（包括 path）
   - 理论上 `stroke: currentColor !important` 会应用到 path 上
   - 但 `all: unset` 先清除了所有属性，然后 `svg *` 规则再恢复
   - 如果选择器优先级或源顺序有问题，path 可能没有 stroke
   - **验证点**：DevTools 检查 path 元素的 computed stroke 值

4. **`display: block` 与 flex 布局的交互问题**：
   - 全局 SVG 恢复设置 `display: inline-block`
   - side-btn SVG 样式设置 `display: block`
   - side-btn 容器是 `display: flex`，SVG 作为 flex item，block 和 inline-block 差异不大
   - 但 `all: unset` 后 SVG 的 display 初始值是什么？在 SVG 命名空间中，display 的初始值可能不同
   - **验证点**：DevTools 检查 SVG 的 computed display 值

5. **SVG 命名空间导致 CSS 选择器不匹配**：
   - 内联 SVG 属于 SVG 命名空间
   - 某些浏览器中，`svg` 元素选择器的匹配可能有特殊行为
   - 极低概率，但理论上存在可能

**最可能的修复方案（按可能性排序）**：

| 方案 | 操作 | 针对假设 | 风险 |
|------|------|----------|------|
| 方案 A | 为 side-btn SVG 样式添加面板前缀：`.html-diff-marker-toolbar .html-diff-marker-side-btn svg` | 优先级/选择器问题 | 低 — 防御性修复，即使不是根因也无害 |
| 方案 B | 为 side-btn 显式设置 `overflow: visible` 并确保 SVG 尺寸 | 尺寸归 0 | 低 |
| 方案 C | 在 SVG 内联属性中保留尺寸，或用 CSS 变量确保尺寸 | 尺寸归 0 | 中 — 改动面较大 |
| 方案 D | 为 SVG 元素添加 `color: inherit` 确保继承链 | color 继承断裂 | 低 |

**建议的优先排查路径**：先用 DevTools 检查 SVG 的 computed width/height 和 stroke/fill 值，确认是尺寸问题还是颜色问题，再针对性修复。

**验证方法**：
1. DevTools 选中 side-btn → Computed → 检查 width(36px)、height(40px)、color、display(flex)
2. DevTools 选中 side-btn 内的 SVG → Computed → 检查 width、height、fill、stroke、display、visibility
3. 检查 SVG 内部的 path 元素 → Computed → 检查 fill、stroke、d 属性
4. 检查 side-btn 的 innerHTML，确认内部结构是否正确（应为单个 SVG）

---

### 假设 2：settings-row 的 flex 布局被破坏 → 开关与文字垂直排列

**用户现象**：开关按钮与文字说明不在一行（垂直排列）

**静态分析结论**：
- `settings-row` 在 `:not()` 排除列表中，所以 `display: block` 规则不生效
- 组件样式 `.html-diff-marker-settings-row` 设置了 `display: flex !important`（第 3976-3985 行）
- `all: unset` 后 display 变成 initial (inline)，然后被组件样式覆盖为 flex
- 理论上应该正常工作

**可能的隐藏原因**：
1. 某个未被发现的 CSS 规则覆盖了 display
2. settings-row 的父容器（settings-body 或 settings-section）有宽度问题导致 flex 换行
3. settings-row 内部的 span 或 toggle 宽度异常，撑满整行

**验证方法**：DevTools 选中 settings-row → Computed → 查看 display, flex-direction, flex-wrap, width

---

### 假设 3：inspector-header 的 flex 布局被破坏 → 标题与按钮垂直排列

**用户现象**："元素编辑"标题与 "− / ×" 按钮垂直排列

**静态分析结论**：
- `inspector-header` 在 `:not()` 排除列表中
- 组件样式设置了 `display: flex; justify-content: space-between; align-items: center`（第 2198-2207 行）
- 理论上应该正常工作

**可能的隐藏原因**：
1. `inspector-title`（span）的宽度异常（如 width: 100%）
2. `inspector-header-btns` 的宽度异常
3. flex-wrap 被设为 wrap 且宽度不够
4. 某个未被发现的 CSS 规则干扰

**验证方法**：DevTools 选中 inspector-header → Computed → 查看 display, flex-direction, flex-wrap

---

### 假设 4：inspector-body 缺少 display: flex → 内部布局影响待确认

**问题描述**：
`.html-diff-marker-inspector-body` 设置了 `flex: 1 !important`，但**没有设置 `display` 属性**。

**当前状态**：
- inspector-body 是 div 且不在 `:not()` 排除列表中
- 因此 `div:not()` 规则会给它设置 `display: block !important`
- `flex: 1` 作为 flex item 属性仍然有效（父容器 inspector 是 display: flex）
- 但 inspector-body 自身的 display 是 block，不是 flex
- **影响待确认**：需要验证 inspector-body 作为 flex item 和作为 flex 容器两个维度的表现

**inspector-body 内部子元素布局分析**：

通过检查 content.js 中 inspector-body 的 DOM 构建逻辑（第 3304-3319 行及后续），inspector-body 内部结构为：

```html
<div class="html-diff-marker-inspector-body">
  <div class="html-diff-marker-group">  <!-- 分组 1：组件标签 -->
    <div class="html-diff-marker-group-header">...</div>
    <input class="html-diff-marker-input">
  </div>
  <div class="html-diff-marker-group">  <!-- 分组 2：修改说明 -->
    ...
  </div>
  <!-- 共 10 个分组，垂直堆叠 -->
</div>
```

**group 分组样式（content.css 第 2303-2311 行）**：
```css
.html-diff-marker-group {
  padding: 14px 16px !important;
  border-bottom: 1px solid var(--hdm-divider) !important;  /* 下边框分隔 */
  box-sizing: border-box !important;
  background: var(--hdm-bg-white) !important;
}
.html-diff-marker-group:last-child {
  border-bottom: none !important;
}
```

**布局方式分析**：
- inspector-body 内部是 10 个 `.html-diff-marker-group` 分组垂直堆叠
- 分组之间通过 `border-bottom` 分隔，最后一个分组去掉下边框
- 分组没有设置 `margin-top` 或 `margin-bottom`
- 这种设计下，**`display: block` 即可满足垂直堆叠需求**，不需要 flex 布局
- 对比 settings-body（显式设置了 `display: flex; flex-direction: column; gap: 0`），inspector-body 没有 gap 需求，因为分隔是通过 border 实现的

**风险评估**：
| 维度 | 风险等级 | 说明 |
|------|----------|------|
| 作为 flex item（flex: 1） | ✅ 低 | 父容器 inspector 是 flex，flex:1 正常生效，block 元素作为 flex item 完全没问题 |
| 作为容器（内部 group 布局） | ✅ 低 | group 垂直堆叠 + border 分隔，block 布局正常工作 |
| 未来扩展风险 | 🟡 中 | 如果未来需要在 inspector-body 内使用 flex 特有功能（如 gap、justify-content 等），会出问题 |

**结论**：
- inspector-body 当前用 `display: block` 可以正常工作
- 缺少 `display: flex` **不构成阻断性问题**
- 但建议添加到 `:not()` 排除列表中作为防御性修复，并显式设置 `display: block`（或 `display: flex` 与 settings-body 保持一致）

**验证方法**：
1. DevTools 选中 inspector-body → Computed → 查看 display（应为 block）
2. 检查 inspector-body 内第一个 group 的 margin-top 和最后一个 group 的 margin-bottom
3. 对比 settings-body 的 display 和 gap 值
4. 验证分组之间的分隔线是否正常显示

---

### 假设 5：导出按钮文字不居中 → line-height 或 vertical-align 问题

**用户现象**："导出 Diff"文字在按钮中不居中

**可能原因**：
1. span 的 `display: inline` + `line-height` 与 flex 布局不协调
2. SVG 图标的 vertical-align 影响了文字基线
3. font-size 与按钮高度的比例问题
4. 全局 span 恢复设置了 `display: inline !important`，但 flex 容器内的 inline 元素对齐方式可能与预期不符

**验证方法**：DevTools 选中导出按钮内的 span → 查看 box model 和对齐情况

---

## 四、父容器 Computed 样式验证清单

为了系统性排查布局问题，需要验证以下父容器的 Computed 样式：

| 父容器 | 期望 display | 期望 flex-direction | 期望宽度 | 验证点 |
|--------|-------------|--------------------|---------|--------|
| `.html-diff-marker-toolbar` | flex | column | 固定宽度 | 整体布局是否为 column |
| `.html-diff-marker-toolbar-body` | flex | column | 100% | 内部按钮行是否垂直排列 |
| `.html-diff-marker-toolbar-btn-row` | flex | row | 100% | 操作按钮是否水平排列 |
| `.html-diff-marker-inspector` | flex | column | 340px | 整体布局是否为 column |
| `.html-diff-marker-inspector-header` | flex | row | 100% | 标题 + 按钮是否水平排列 |
| `.html-diff-marker-inspector-body` | block 或 flex？ | - | 100% | 自身 display 是什么？内部如何布局？ |
| `.html-diff-marker-settings-panel` | flex？ | column？ | 300px | 整体布局结构 |
| `.html-diff-marker-settings-body` | flex | column | 100% | 内部 section 是否垂直排列 |
| `.html-diff-marker-settings-row` | flex | row | 100% | 文字 + 开关是否水平排列 |

---

## 五、优先级排序与修复建议

### 🔴 P0：主题卡片布局错乱（设置面板）
- **根因**：全局 button 恢复样式优先级高于组件样式，强制 `align-items: center` 和 `justify-content: center` 生效
- **修复方案 A（快速修复）**：为 `.html-diff-marker-settings-theme-card` 添加 `.html-diff-marker-settings-panel` 前缀，并显式设置 `align-items: stretch` 和 `justify-content: flex-start`
- **修复方案 B（结构性修复）**：执行 P1「全局 button 恢复样式去激进化」，从根源上避免此类问题再次发生

### 🔴 P0：工具栏重置/设置按钮内容不可见
- **根因**：待确认（原优先级冲突假设已证伪）
- **建议**：先用 DevTools 实测确认真实原因，再针对性修复
- **排查重点**：`all: unset` 对 SVG 的影响、color 继承链、按钮内容结构

### 🔴 P0：导出按钮 SVG 图标填充问题
- **根因**：导出按钮 SVG 是线性图标（stroke-based），但 SVG 样式未设置 `fill: none`，全局恢复的 `fill: currentColor` 生效导致图标被填充为实心色块
- **确认依据**：content.js 中 `SVG_ICONS.export` 定义为 `fill="none" stroke="currentColor"`，确认为线性图标
- **修复**：为 `.html-diff-marker-export-btn svg` 添加 `fill: none !important; stroke: currentColor !important;`

### 🟡 P1：全局 button 恢复样式去激进化（结构性修复）

**问题**：全局 button 恢复样式（第 341-364 行）设置了 `align-items: center !important` 和 `justify-content: center !important`，但并非所有 button 都需要居中对齐（如主题卡片需要左对齐、垂直排列）。这会强制覆盖组件级样式，导致布局错乱（已确认导致 theme-card 布局异常）。

**当前全局 button 恢复属性**：
```css
.html-diff-marker-toolbar button,
.html-diff-marker-inspector button,
.html-diff-marker-settings-panel button,
... {
  display: inline-flex !important;   /* ← 保留：基础布局 */
  align-items: center !important;    /* ← 移除：交由各组件定义 */
  justify-content: center !important; /* ← 移除：交由各组件定义 */
  cursor: pointer !important;        /* ← 保留 */
  border: none !important;           /* ← 保留 */
  background: none !important;       /* ← 保留 */
  font: inherit !important;          /* ← 保留 */
  color: inherit !important;         /* ← 保留 */
  padding: 0 !important;             /* ← 保留 */
  margin: 0 !important;              /* ← 保留 */
  line-height: 1 !important;         /* ← 保留或视情况调整 */
  user-select: none !important;      /* ← 保留 */
  white-space: nowrap !important;    /* ← 保留 */
  text-align: center !important;     /* ← 移除：交由各组件定义 */
  -webkit-appearance: none !important; /* ← 保留 */
  appearance: none !important;       /* ← 保留 */
}
```

**修复方案**：
- 全局 button 恢复仅保留最基础属性：`display`, `cursor`, `border`, `background`, `font`, `color`, `padding`, `margin`, `user-select`, `appearance`
- **移除** `align-items: center`、`justify-content: center`、`text-align: center`
- 交由各组件自行定义对齐方式和 flex 布局方向
- 需要检查所有 button 组件是否显式设置了 `align-items` 和 `justify-content`，确保移除全局居中后不会出现新的对齐问题

**影响范围**：
- 直接修复：theme-card 布局异常（P0 的根因之一）
- 预防未来：所有作为 button 元素且需要非居中布局的组件
- 需验证：所有现有 button 组件是否自行定义了对齐方式

### 🟡 P1：inspector-body display 属性确认与防御性修复
- **状态**：静态分析显示当前 `display: block` 可正常工作，不构成阻断性问题
- **建议**：将 inspector-body 添加到 `:not()` 排除列表，并显式设置 `display: block`（或与 settings-body 保持一致设为 `display: flex; flex-direction: column`）
- **理由**：防御性修复，避免 `div:not()` 规则意外影响，提高代码可维护性

### 🟡 P1：`:not()` 排除列表清理与完善
- **根因**：排除列表与实际 DOM 不一致
- **修复**：
  - 删除不存在的 `inspector-title-row`
  - 添加 `inspector-body`
  - 系统性审查所有面板的 div 类名

### 🟡 P1：设置面板开关行垂直排列（待验证）
- **根因**：待确认
- **建议**：先用 DevTools 确认 settings-row 的 computed display

### 🟡 P1：inspector 头部垂直排列（待验证）
- **根因**：待确认
- **建议**：先用 DevTools 确认 inspector-header 的 computed display

---

## 六、系统性风险

### 风险 1："黑名单"模式的 `:not()` 排除列表难以维护
当前采用 `div:not(.a):not(.b):not(.c) { display: block }` 的黑名单模式，每新增一个需要特殊 display 的 div，都必须手动添加到排除列表中，否则会被强制设为 block。

**建议**：考虑改为白名单模式，即默认所有 div 都是 block，然后为需要 flex/grid 的容器单独设置 display（组件样式已经在做这件事了，只是需要确保优先级足够）。

### 风险 2：组件样式选择器前缀不统一导致优先级不一致
有些组件样式加了面板前缀（如 `.html-diff-marker-toolbar .html-diff-marker-side-btn`），有些没有（如 `.html-diff-marker-side-btn svg`、`.html-diff-marker-export-btn svg`），导致优先级不一致，且容易遗漏属性覆盖。

**建议**：制定规范，所有组件级样式都必须包含面板前缀，确保优先级一致且足够高。

### 风险 3：全局 SVG 恢复采用"一刀切"的 fill: currentColor 策略
全局 SVG 恢复设置了 `fill: currentColor !important`，这对于填充型图标是正确的，但对于 stroke-based 的线性图标（如重置、设置、导出等）会造成破坏。线性图标需要 `fill: none` 才能正确显示。

**当前问题**：
- 线性图标的组件级样式必须显式覆盖 `fill: none`，否则会被全局填充破坏
- 导出按钮就是因为遗漏了 fill 属性而出现问题
- 这种"一刀切 + 逐个覆盖"的模式容易遗漏，维护成本高

**建议**：
- 方案 A：全局 SVG 恢复不设置 fill（或设为 initial），由各组件根据需要自行设置 fill 和 stroke
- 方案 B：全局 SVG 恢复使用更通用的默认值（如 `fill: inherit`），并在设计规范中明确线性图标必须设置 `fill: none`
- 方案 C：为线性图标定义统一的工具类（如 `.hdm-svg-stroke`），集中管理

---

## 七、验证步骤清单

1. ⬜ **工具栏重置按钮**：DevTools 选中 SVG → Computed → 检查 fill / stroke / width / height / display
2. ⬜ **工具栏重置按钮**：DevTools 选中 side-btn → Computed → 检查 color / width / height
3. ⬜ **工具栏导出按钮 SVG**：DevTools 选中 SVG → Computed → 检查 fill / stroke
4. ✅ **设置面板主题卡片**：DevTools 选中 theme-card → Computed → 检查 align-items / justify-content / flex-direction
5. ⬜ **设置面板开关行**：DevTools 选中 settings-row → Computed → 检查 display / flex-direction
6. ⬜ **inspector 头部**：DevTools 选中 inspector-header → Computed → 检查 display / flex-direction / flex-wrap
7. ⬜ **inspector-body**：DevTools 选中 inspector-body → Computed → 检查 display
8. ⬜ **导出按钮文字**：DevTools 选中导出按钮 span → 检查对齐与位置

---

**报告结束**
