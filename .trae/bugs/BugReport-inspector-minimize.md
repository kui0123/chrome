# Bug Report：编辑面板最小化点击后变长而非折叠

## 问题描述

用户点击编辑面板（Inspector）右上角的最小化按钮（`−`）后，面板没有按预期折叠为只保留标题栏的状态，反而变得更长了。

## 现场分析

### 核心问题定位

通过代码分析，发现问题出在 **CSS 优先级冲突** 上：

**1. CSS 折叠状态定义**（`content.css` 第 2018-2021 行）：
```css
.html-diff-marker-inspector.html-diff-marker-collapsed {
  height: auto !important;
  min-height: 0 !important;
}
```

**2. JavaScript 折叠逻辑**（`content.js` 第 3282-3286 行）：
```javascript
collapseBtn.addEventListener('click', function(e) {
  e.preventDefault(); e.stopPropagation();
  panel.classList.toggle('html-diff-marker-collapsed');
  collapseBtn.innerHTML = panel.classList.contains('html-diff-marker-collapsed') ? SVG_ICONS.plus : SVG_ICONS.minus;
}, true);
```

**3. 问题根源：`hdmSetStyle` 函数**（`content.js` 第 85-89 行）：
```javascript
function hdmSetStyle(el, prop, value) {
  if (!el) return;
  var cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
  el.style.setProperty(cssProperty, value, 'important');  // 第三个参数设置了 !important
}
```

**4. 面板尺寸保存与恢复机制**：

当用户拖拽调整面板大小时（第 4106-4112 行），会保存尺寸到 `state.inspectorSize`：
```javascript
const rect = panel.getBoundingClientRect();
state.inspectorSize = { width: rect.width, height: rect.height };
```

打开面板时（第 4134-4140 行），会恢复之前保存的尺寸：
```javascript
hdmSetStyles(panel, {
  width: state.inspectorSize.width + 'px',
  height: state.inspectorSize.height + 'px',
  right: 'auto',
  bottom: 'auto'
});
```

### 根因分析

**CSS 优先级冲突链：**

1. 用户拖拽调整面板高度 → `state.inspectorSize` 保存了具体高度值（如 `620px`）
2. 下次打开面板 → `hdmSetStyles` 通过内联样式设置 `height: 620px !important`
3. 用户点击最小化 → 添加 `html-diff-marker-collapsed` 类 → CSS 规则 `height: auto !important`

**关键问题**：根据 CSS 优先级规则，**内联样式 + `!important`** 的优先级高于 **选择器 + `!important`**，因此折叠状态的 `height: auto !important` 无法覆盖内联样式的 `height: 620px !important`。

**面板变长的原因**：由于 `height` 被锁定为之前拖拽调整的较大值（可能是用户之前拖拽放大了面板），而折叠时 `display: none` 隐藏了 body 内容，但高度仍被内联样式强制设置为固定值，导致面板高度没有变化，视觉上看起来"没有折叠"甚至可能变长。

## 可能性猜测

| 序号 | 猜测 | 概率 | 验证结果 |
|------|------|------|----------|
| 1 | CSS 优先级冲突：内联 !important 覆盖选择器 !important | 95% | ✅ 已确认 |
| 2 | 折叠类名应用时机错误 | 3% | ❌ 排除 |
| 3 | body 内容隐藏逻辑有问题 | 2% | ❌ 排除 |
| 4 | 尺寸保存逻辑异常 | 0% | ❌ 排除 |

## 解决方案

### 方案一（推荐）：折叠时清除内联样式，展开时智能恢复

修改折叠按钮的点击事件处理，在添加折叠类后清除内联样式中的高度和宽度，展开时根据保存的尺寸智能恢复：

```javascript
collapseBtn.addEventListener('click', function(e) {
  e.preventDefault(); e.stopPropagation();
  panel.classList.toggle('html-diff-marker-collapsed');
  collapseBtn.innerHTML = panel.classList.contains('html-diff-marker-collapsed') ? SVG_ICONS.plus : SVG_ICONS.minus;
  
  // 折叠时清除内联样式（高度和宽度），让 CSS 规则生效
  if (panel.classList.contains('html-diff-marker-collapsed')) {
    panel.style.removeProperty('height');
    panel.style.removeProperty('width');
  } else {
    // 展开时恢复之前保存的尺寸（如果有）
    if (state.inspectorSize && state.inspectorSize.width && state.inspectorSize.height) {
      hdmSetStyles(panel, {
        width: state.inspectorSize.width + 'px',
        height: state.inspectorSize.height + 'px'
      });
    }
    // 如果没有保存的尺寸，不设置内联样式，让 CSS 默认值生效
  }
}, true);
```

**优点**：
- 最小化修改范围，只影响折叠/展开逻辑
- 同时处理高度和宽度问题，确保折叠状态CSS规则完整生效
- 展开时智能判断，有保存尺寸则恢复，无则不设置内联样式让CSS默认值生效
- 不影响其他功能（包括按钮排列相关的修改）
- 保持尺寸持久化功能正常

**缺点**：无明显缺点

### 方案二：修改 `hdmSetStyle` 函数不使用 `!important`

将 `hdmSetStyle` 函数中的第三个参数移除：

```javascript
function hdmSetStyle(el, prop, value) {
  if (!el) return;
  var cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
  el.style.setProperty(cssProperty, value);  // 移除 'important'
}
```

**优点**：从根本上解决优先级冲突问题

**缺点**：
- 可能影响其他依赖 `!important` 的样式设置（如样式隔离、宿主页面样式覆盖等）
- 风险较高，需要全面测试

### 方案三：使用更高优先级的 CSS 选择器

增加 CSS 选择器的特异性：

```css
.html-diff-marker-inspector.html-diff-marker-collapsed[style] {
  height: auto !important;
  min-height: 0 !important;
}
```

**优点**：纯 CSS 修复，不修改 JS 逻辑

**缺点**：
- 选择器特异性仍然无法超过内联样式 + `!important`
- 实际上无法解决问题（优先级不够）

## 推荐修复方案

**采用方案一**，在折叠按钮点击事件中添加清除内联高度的逻辑。

需要修改的文件：
- `/Users/bytedance/Documents/trae_projects/HTML 排版插件/extension/content/content.js`

需要修改的两处代码：
1. **普通编辑面板**：第 3282-3286 行（`openInspector` 函数中的折叠按钮）
2. **组合编辑面板**：第 4174-4178 行（`openGroupInspector` 函数中的折叠按钮）

## 验收手段

1. **基础折叠验证**：打开编辑面板，点击最小化按钮 → 面板应折叠为只显示头部
2. **高度恢复验证**：拖拽调整面板高度为任意值（如 500px），点击最小化 → 点击展开 → 面板应恢复到之前调整的高度
3. **宽度恢复验证**：拖拽调整面板宽度为任意值（如 400px），点击最小化 → 点击展开 → 面板应恢复到之前调整的宽度
4. **边界情况验证**：
   - 首次打开面板（无保存尺寸），点击最小化 → 点击展开 → 面板应使用 CSS 默认尺寸，不出现异常
   - 清除浏览器缓存后打开面板，重复上述验证
5. **组合面板验证**：验证组合编辑面板（`openGroupInspector`）的折叠/展开功能同样正常
6. **重复验证**：多次折叠/展开，确保功能稳定

## 关联文件

- `extension/content/content.js` - 编辑面板逻辑
- `extension/content/content.css` - 编辑面板样式