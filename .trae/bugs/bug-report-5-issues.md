# 5个问题排查报告

**排查日期**：2026-07-11
**排查人**：hugo
**涉及文件**：
- `/Users/bytedance/Documents/trae_projects/HTML 排版插件/content/content.js`
- `/Users/bytedance/Documents/trae_projects/HTML 排版插件/content/content.css`

---

## 问题1：设置面板主题色切换 — 只有1个色板显示，形状不对

### 问题描述
设置面板中，4个预设主题色（暮紫/深海蓝/墨绿/暖棕）不能直接切换，截图显示只有1个色板，且形状像电视（有灰色条纹）。

### 根因分析

#### 核心根因：CSS `background: none !important` 覆盖了 JS 设置的内联背景色

**代码位置**：
- JS 生成色板：`content.js` 第2604-2625行（`openSettingsPanel` 函数中）
- CSS 样式定义：`content.css` 第3701-3715行（`.html-diff-marker-settings-swatch`）

**详细分析**：

1. **JS 侧**：`openSettingsPanel` 函数中，4个预设主题色 swatch 是通过 `document.createElement('button')` 创建的，然后用内联样式设置背景色：
   ```js
   swatch.style.backgroundColor = preset.color;  // 内联样式，无 !important
   ```

2. **CSS 侧**：`.html-diff-marker-settings-swatch` 定义了：
   ```css
   background: none !important;  /* 第3711行，有 !important */
   ```

3. **优先级冲突**：CSS 的 `background: none !important` 优先级高于 JS 设置的内联 `backgroundColor`（因为 `!important` 声明），导致预设主题的色板**完全没有背景色**。

4. **为什么只有1个色板可见**：
   - 4个预设主题色 swatch：背景透明 + 边框透明（`border: 2px solid transparent`）+ 白色面板背景 = **完全不可见**
   - 1个自定义颜色 swatch：有更具体的选择器 `.html-diff-marker-settings-swatch.html-diff-marker-settings-swatch--custom`，设置了 `background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red) !important`，所以**彩虹渐变色可见**
   - 用户看到的"只有1个色板"就是这个自定义颜色的彩虹色 swatch

5. **"电视形状/灰色条纹"是什么**：
   - 自定义颜色 swatch 内部有一个 `<input type="color">` 元素
   - 该 input 设置了 `opacity: 0`，但 `all: unset` 重置可能导致 input 的默认部分样式露出
   - 或者 `conic-gradient` 彩虹渐变的条纹效果被用户描述为"灰色条纹"
   - 形状不是圆形可能是因为 `border-radius: 50%` 被 `all: unset` 影响，或者 overflow 导致 input 的矩形边框可见

#### 次要问题：点击色板切换主题逻辑正确

点击事件绑定在 swatch 按钮上，调用 `themeManager.applyPreset(preset.id)`，逻辑正确。但由于色板不可见，用户无法点击。

### 修复建议

**方案A（推荐）**：移除 `.html-diff-marker-settings-swatch` 中的 `background: none !important;`，改为 `background-color: transparent !important;` 或直接删除，因为预设色板需要显示背景色。

**方案B**：在 JS 中不用 `style.backgroundColor`，而是设置 CSS 变量或使用 `style.background` 并通过更具体的方式覆盖。

**方案C**：使用 `!important` 强制设置内联样式（不推荐，难以维护）。

推荐方案A，修改 `content.css` 第3711行：
```css
/* 移除或修改这一行 */
/* background: none !important; */
```
预设色板的背景色通过 JS 内联设置，自定义色板的背景通过类名设置，两者不冲突。

---

## 问题2：编辑面板"元素编辑"标题框增加阴影，数据做一些切分

### 问题描述
编辑面板在"元素编辑"标题框增加阴影，数据做一些切分。

### 现状分析

**代码位置**：
- Header 结构：`content.js` 第3043-3052行
- Header 样式：`content.css` 第2014-2022行
- 面板整体样式：`content.css` 第1960-1980行

**当前状态**：
1. 编辑面板（`.html-diff-marker-inspector`）整体有阴影：`box-shadow: var(--hdm-shadow-lg)`
2. Header（`.html-diff-marker-inspector-header`）**没有阴影**，只有底部边框：`border-bottom: 1px solid var(--hdm-divider)`
3. Header 背景色为白色 `#ffffff`

### 需求解读

"元素编辑标题框增加阴影"：
- 给 `.html-diff-marker-inspector-header` 添加阴影效果，使标题区域与内容区有更明显的层级感

"数据做一些切分"：
- 推测是指 Header 和内容区（body）之间的视觉分隔需要更明显
- 当前已有 `border-bottom: 1px solid var(--hdm-divider)`，可能需要更粗的分隔线、或者结合阴影来实现"切分"效果

### 修复建议

给 `.html-diff-marker-inspector-header` 添加底部阴影，增强与内容区的视觉分隔：

```css
.html-diff-marker-inspector-header {
  /* 现有样式保留 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
  position: relative !important;  /* 确保阴影在内容上方 */
  z-index: 1 !important;
}
```

这样 Header 会有轻微的下沉阴影，与下方内容区形成"切分"的视觉效果。

---

## 问题3：重置按钮仍然是葡萄形状

### 问题描述
工具栏左下角重置按钮像葡萄形状，之前说改了 `fill: none` 但还是葡萄形状。

### 现状分析

**代码位置**：
- 重置按钮 HTML：`content.js` 第2850-2861行，使用 `SVG_ICONS.reset`
- SVG 图标定义：`content.js` 第2175行
- 按钮样式：`content.css` 第1793-1822行
- 全局 SVG 样式：`content.css` 第512-525行

**SVG 图标本身**：
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ...>
  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
  <path d="M3 3v5h5"/>
</svg>
```
SVG 本身设置了 `fill="none"`，应该是线框样式。

**CSS 样式层叠分析**：

| 选择器 | 位置 | fill 值 | 权重 |
|--------|------|---------|------|
| `.html-diff-marker-toolbar svg` | 第521行 | `currentColor !important` | (0,1,1) |
| `.html-diff-marker-side-btn svg` | 第1821行 | `none !important` | (0,1,1) |

两个选择器权重相同（都是 1个类 + 1个元素），按 CSS 层叠规则，后面的覆盖前面的。`.html-diff-marker-side-btn svg` 在第1821行，晚于第521行的全局样式，**理论上应该生效**。

### 可能性猜测（按概率排序）

1. **高概率：`all: unset` 对 SVG 子元素的影响**
   - `.html-diff-marker-toolbar * { all: unset !important; }` 会匹配 SVG 内部的 `<path>` 元素
   - `all: unset` 将可继承属性设为 inherit，不可继承属性设为 initial
   - `fill` 是可继承的，但 `all: unset` 可能导致 path 的 fill 被重置为初始值（black）
   - 后续全局 `svg { fill: currentColor }` 设置的是 svg 元素的 fill，path 应该继承
   - 但如果 `all: unset` 在某些浏览器中对 SVG 内部元素的处理不一致，可能导致 fill 不继承

2. **中概率：浏览器对 SVG 内联 fill 属性与 CSS fill 的优先级处理差异**
   - SVG 本身有 `fill="none"` 属性
   - CSS 有 `fill: currentColor !important`
   - CSS !important 应该覆盖 SVG 属性，但某些浏览器可能有差异

3. **低概率：stroke 宽度导致视觉上像实心圆**
   - 重置图标是一个圆形箭头，`stroke-width="2"` 在 14px 的 SVG 中可能看起来较粗
   - 但这不应该是"葡萄形状"（实心）

### 验证建议

在浏览器开发者工具中检查：
1. 选中重置按钮内的 `<svg>` 元素，查看 Computed 样式中的 `fill` 值
2. 选中 `<path>` 元素，查看 Computed 样式中的 `fill` 值
3. 如果 path 的 fill 不是 none，则说明继承出了问题

### 修复建议

**方案A（推荐）**：增强选择器的明确性，同时设置 path 的 fill：

```css
.html-diff-marker-side-btn svg,
.html-diff-marker-side-btn svg * {
  fill: none !important;
}
```

直接匹配 SVG 内部所有元素（path 等），确保 fill 为 none。

**方案B**：使用更高权重的选择器：
```css
.html-diff-marker-toolbar .html-diff-marker-side-btn svg {
  fill: none !important;
}
```

---

## 问题4：字体预览弹窗不会随着字体选项而变化，始终展示"系统默认字体"

### 问题描述
字体选择下拉框切换时，字体预览提示始终显示"系统默认字体"，不会随着选择的字体而变化。

### 根因分析

**核心根因：字体提示是面板打开时一次性渲染的，切换字体时不更新**

**代码位置**：
- 字体下拉框渲染：`content.js` 第3223-3265行
- 字体提示渲染：`content.js` 第3312-3337行
- `checkFontAvailable` 函数：`content.js` 第84-129行

**详细分析**：

1. **面板打开时**：遍历 `FONT_PROPS` 渲染字体属性行，同时渲染字体提示（font-hint）
   ```js
   // 字体三态提示（放在字体选择框下方）—— 仅在面板打开时执行一次
   if (sp.key === 'fontFamily') {
     const fontHint = document.createElement('div');
     const curFont = val || '';
     const fontInfo = checkFontAvailable(curFont);
     // ... 渲染提示
   }
   ```

2. **切换字体时**：select 的 change 事件只调用 `applyStyleChange`
   ```js
   sel.addEventListener('change', function() {
     applyStyleChange(entry, sp.key, this.value);
     // 没有更新字体提示！
   });
   ```

3. **`applyStyleChange` 函数**（第2022-2035行）只做了：
   - 更新 `entry.modifiedStyles`
   - 应用样式到元素
   - 保存状态
   - **没有重新渲染面板**

4. **初始状态**：如果当前没有设置字体，`curFont` 为空字符串，`checkFontAvailable('')` 返回 `{ status: 'default', message: '系统默认字体' }`，所以提示显示"系统默认字体"。

5. **切换字体后**：字体应用到了元素上，但提示文字没有更新，仍然显示面板刚打开时的"系统默认字体"。

### 修复建议

**方案A（推荐）**：在 select 的 change 事件中动态更新字体提示：

```js
sel.addEventListener('change', function() {
  applyStyleChange(entry, sp.key, this.value);
  // 动态更新字体提示
  if (sp.key === 'fontFamily') {
    const fontHint = fontGroup.querySelector('.html-diff-marker-font-hint');
    if (fontHint) {
      const fontInfo = checkFontAvailable(this.value);
      // 更新提示的样式和文字
      fontHint.className = 'html-diff-marker-font-hint ' + fontInfo.status;
      fontHint.querySelector('span:last-child').textContent = fontInfo.message;
    }
  }
});
```

**方案B**：切换字体后重新打开面板（`openInspector(entry.id)`），但这样会有闪烁，不推荐。

---

## 问题5：自定义字体只让输入字体名称，输入后保存无对应选项

### 问题描述
点击"+"按钮添加自定义字体后，字体列表中没有新选项，下拉框里找不到刚添加的字体。

### 根因分析

**核心根因：自定义字体仅应用到当前元素，没有添加到全局字体列表，下拉框选项不包含自定义字体**

**代码位置**：
- 自定义字体按钮：`content.js` 第3249-3265行
- 下拉框选项渲染：`content.js` 第3228-3238行
- `FONT_OPTIONS` 常量：`content.js` 第10-29行

**详细分析**：

1. **FONT_OPTIONS 是常量数组**，包含预设的中文字体和英文字体，定义后不会动态变化。

2. **添加自定义字体的逻辑**：
   ```js
   addFontBtn.addEventListener('click', function(e) {
     showPrompt('请输入自定义字体名称...', '', '添加自定义字体', function(customFont) {
       if (customFont) {
         applyStyleChange(entry, 'fontFamily', customFont);  // 仅应用到当前元素
         openInspector(entry.id);  // 重新打开面板
       }
     });
   });
   ```
   
   只是调用 `applyStyleChange` 将字体应用到当前元素，**没有将字体添加到任何全局列表中**。

3. **下拉框选项来源**：
   ```js
   sp.options.forEach(opt => {  // sp.options 就是 FONT_OPTIONS
     const o = document.createElement('option');
     // ...
   });
   ```
   下拉框从 `FONT_OPTIONS` 读取选项，这是一个静态常量，不包含自定义字体。

4. **重新打开面板后**：由于 `FONT_OPTIONS` 没有变化，下拉框中仍然只有预设字体。
   - 虽然字体已经应用到了元素上（`entry.modifiedStyles.fontFamily = customFont`）
   - 但下拉框中找不到匹配的 option，所以 select 显示为空或默认值
   - 用户感觉"保存无对应选项"

5. **没有持久化存储**：自定义字体只存在于当前元素的 `modifiedStyles` 中，刷新页面或切换元素后就丢失了（对当前元素来说刷新后从 storage 恢复还在，但下拉框中仍然没有）。

### 修复建议

需要实现完整的自定义字体管理：

**1. 添加全局自定义字体状态**
```js
// 在 state 或全局添加
let customFonts = [];  // 存储自定义字体列表，如 [{ name: 'MyFont', value: '"MyFont", sans-serif' }]
```

**2. 添加自定义字体时更新列表**
```js
// 在添加自定义字体的回调中
if (customFont) {
  // 添加到全局列表（去重）
  const exists = customFonts.some(f => f.value === customFont);
  if (!exists) {
    customFonts.push({ value: customFont, label: customFont + ' (自定义)' });
    // 可选：持久化到 chrome.storage.local
  }
  applyStyleChange(entry, 'fontFamily', customFont);
  openInspector(entry.id);
}
```

**3. 渲染下拉框时合并预设字体和自定义字体**
```js
// 构建完整的选项列表
const allFontOptions = [
  ...FONT_OPTIONS,
  { value: '', label: '── 自定义字体 ──', disabled: true },
  ...customFonts
];
allFontOptions.forEach(opt => { ... });
```

**4. 可选：添加删除自定义字体的功能**
在每个自定义字体选项旁边添加删除按钮。

---

## 总结

| 问题 | 严重程度 | 根因类型 | 修复复杂度 |
|------|----------|----------|------------|
| 1. 主题色板不可见 | 高 | CSS !important 覆盖内联样式 | 低 |
| 2. Header 阴影 | 低 | 缺少样式 | 低 |
| 3. 重置按钮葡萄形 | 中 | SVG fill 继承问题 | 低 |
| 4. 字体预览不更新 | 高 | 缺少动态更新逻辑 | 中 |
| 5. 自定义字体无选项 | 高 | 缺少全局字体列表管理 | 中 |

### 修复优先级建议
1. **问题1**（主题色板）- 一行 CSS 修复，立竿见影
2. **问题3**（重置按钮）- 增强 CSS 选择器即可
3. **问题4**（字体预览）- 添加 change 事件更新逻辑
4. **问题5**（自定义字体）- 需要新增全局状态管理
5. **问题2**（Header 阴影）- 纯样式优化
