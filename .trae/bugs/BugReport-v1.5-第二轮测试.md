# HTML 排版插件 BugReport (v1.5 第二轮测试)

**报告生成时间**: 2026-07-07
**排查范围**: content/content.js, content/content.css, background/background.js, manifest.json
**排查人**: Hugo
**对应版本**: v1.5.0

---

## 问题总览

| 序号 | 问题编号 | 严重程度 | 模块 | 类型 | 状态 |
|------|---------|---------|------|------|------|
| 1 | #22 | P0 | 多选元素 | BUG | 1轮修复不完整 |
| 2 | #24 | P0 | 图片/背景图 | BUG | 1轮修复失败 |
| 3 | #2 | P0 | 快捷键 | BUG | 2轮修复失败 |
| 4 | #26 | P0 | 滚轮缩放 | BUG | 新发现 |
| 5 | #4 | P1 | 多选元素/同步缩放 | BUG | 1轮修复失败 |
| 6 | #25 | P2 | 编辑面板/字体 | 优化 | 新发现 |
| 7 | #27 | P2 | 字体/自定义字体 | 优化 | 新发现 |

---

## 问题 #22（P0）- 多选元素：多选后无组合标记选项、不能编辑

### 问题描述
- **现象**: 多选元素后有紫色虚线高亮（`.html-diff-marker-multi-selected` 样式生效），但缺少「组合标记」的入口按钮，用户无法创建组合标记；同时多选状态下不能进行编辑操作
- **备注**: 1轮修复不完整，仅实现了批量删/增
- **影响范围**: 多选模式下的核心功能（组合标记）缺失，多选元素无法编辑

### 现场分析
**复现路径**:
1. 点击工具栏「选择元素」进入选择模式
2. 点击页面上多个元素（每个点击都触发 toggleMultiSelect）
3. 观察选中元素 → 紫色虚线出现（样式正确）
4. 观察是否有组合标记按钮 / 是否能进行编辑

### 代码定位

| 函数 | 文件位置 | 作用 |
|------|---------|------|
| `toggleMultiSelect()` | content.js:766-777 | 切换元素多选状态 |
| `updateMultiSelectToolbar()` | content.js:840-884 | 渲染多选浮动工具栏 |
| `createGroupMark()` | content.js:786-826 | 创建组合标记 |
| `onClick()` | content.js:705-713 | 选择模式下的点击处理 |

### 根因分析

#### 根因1：选择模式点击逻辑变更导致多选工具栏时机异常

**关键代码**（content.js:705-713）：
```js
function onClick(e) {
  if (!state.isSelecting) return;
  if (e.target.closest('.html-diff-marker-toolbar') || e.target.closest('.html-diff-marker-inspector')) return;
  e.preventDefault(); e.stopPropagation();
  const el = e.target;
  el.classList.remove('html-diff-marker-highlight-hover');
  // 选择模式下所有点击都加入多选列表，不再区分 Shift 键
  toggleMultiSelect(el);
}
```

**问题分析**:
- 注释明确写了"选择模式下所有点击都加入多选列表，不再区分 Shift 键"
- 但 `startSelecting()` 时没有初始化多选工具栏
- `toggleMultiSelect(el)` 每次调用都会触发 `updateMultiSelectToolbar()`，理论上应该显示工具栏
- 需要验证：多选工具栏是否被正确渲染、是否被其他元素遮挡、z-index 是否足够

#### 根因2：多选工具栏可能被遮挡或位置计算错误

**关键代码**（content.js:877-883）：
```js
const bounds = getMultiSelectBounds();
if (bounds) {
  bar.style.position = 'absolute';
  bar.style.left = (bounds.left + bounds.width / 2 - 100) + 'px';
  bar.style.top = (bounds.top - 36) + 'px';
  bar.style.zIndex = '2147483645';
}
```

**潜在问题**:
- 工具栏使用 `position: absolute`，但如果父元素有 `position: relative` 等定位上下文，位置会错乱
- `z-index` 虽大，但若 body 或父元素有 `overflow: hidden`，工具栏可能被裁剪

#### 根因3：多选状态下元素不能编辑——设计缺失

多选状态下，元素只是添加了 `html-diff-marker-multi-selected` 类名，但：
- 元素没有被真正标记（不在 `state.markedElements` 中）
- 没有编号徽章、没有删除角标、没有拖拽/缩放功能
- 这是设计上的问题：多选只是"预选"状态，创建组合标记后才是正式标记

### 可能性猜测（按概率排序）

| 排序 | 假设 | 概率 | 说明 |
|------|------|------|------|
| 1 | 多选浮动工具栏因定位问题不可见 | 高 | position:absolute 在复杂页面中易受父元素影响 |
| 2 | 多选工具栏被其他页面元素遮挡 | 中 | z-index 虽高，但可能受 stacking context 影响 |
| 3 | 用户误操作，未进入正确的多选流程 | 低 | 需结合实际操作确认 |

### 修复建议

**临时止血**: 多选后点击「组合标记」生成组合标记，通过组合面板进行编辑

**永久修复**:
1. 修复多选浮动工具栏的定位问题：改用 `position: fixed`，或确保定位上下文正确
2. 在主工具栏中也增加「组合标记」按钮（多选状态下显示），作为备用入口
3. 多选工具栏应包含：组合标记、批量复制、批量删除、取消选择
4. 验证：在多种页面布局下测试多选工具栏的可见性

### 验收手段
1. 进入选择模式，点击 2 个以上元素 → 多选浮动工具栏应正确显示在选区上方
2. 工具栏应包含「组合标记」按钮，点击后成功创建组合标记
3. 主工具栏在多选状态下也应显示组合标记入口
4. 复杂页面（多层定位元素）下工具栏仍可见

---

## 问题 #24（P0）- 图片：新增元素添加背景图片看不到预览

### 问题描述
- **现象**: 新增元素后，在编辑面板中添加背景图片，呈现效果是一条「新组件」，看不到图片预览
- **备注**: 1轮修复失败
- **影响范围**: 新增元素的背景图片功能完全不可用

### 现场分析
**复现路径**:
1. 标记一个元素，点击「添加元素」新增组件
2. 在弹出的编辑面板中找到「背景图片」选项
3. 点击「选择本地图片」上传一张图片
4. 观察页面上的新元素 → 只显示文字「新组件」，看不到背景图片

### 代码定位

| 函数/代码段 | 文件位置 | 作用 |
|------------|---------|------|
| `addNewElement()` | content.js:1895-1933 | 添加新元素 |
| `applyStyleChange()` | content.js:1999-2028 | 应用样式变更 |
| `applyMarkVisual()` | content.js:932-1040+ | 应用标记视觉效果 |
| `openInspector()` 中 image 分支 | content.js:2713-2793 | 背景图片编辑区渲染 |

### 根因分析

#### 根因1（高概率）：新增元素 originalStyles 为 null 导致预览逻辑异常

**关键代码**（content.js:1912-1923）：
```js
const entry = {
  id: uid(), selector: buildSelector(newEl), tag: newEl.tagName.toLowerCase(),
  note: '新添加的组件',
  description: '',
  originalHTML: getOuterHTML(newEl), modifiedHTML: null,
  originalStyles: null, modifiedStyles: {},  // ← originalStyles 为 null
  ...
};
```

**编辑面板中图片预览代码**（content.js:2721-2732）：
```js
const currentVal = entry.modifiedStyles[sp.key] || (entry.originalStyles ? entry.originalStyles[sp.key] : '') || '';
if (currentVal && currentVal !== 'none' && currentVal !== '') {
  if (isSimpleBgImageUrl(currentVal) || /gradient\s*\(/i.test(currentVal) || currentVal.indexOf(',') >= 0) {
    preview.style.backgroundImage = currentVal;
  } else {
    preview.style.backgroundImage = 'url("' + currentVal + '")';
  }
}
```

这里的逻辑看起来是正确的（有 fallback），但是...

#### 根因2（主因）：isSimpleBgImageUrl 判断错误，导致 base64 图片预览失败

**关键代码**（content.js:372-381）：
```js
function isSimpleBgImageUrl(value) {
  if (!value || value === 'none') return false;
  if (/gradient\s*\(/i.test(value)) return false;
  if (value.indexOf(',') >= 0) return false;  // ← 关键问题！
  if (/^url\s*\(/i.test(value)) return true;
  return false;
}
```

**问题机制**:
- 上传的 base64 图片格式为 `data:image/png;base64,iVBORw0KG...`
- base64 字符串中包含逗号（`,`），因此 `value.indexOf(',') >= 0` 返回 `true`
- `isSimpleBgImageUrl()` 返回 `false`
- 然后代码走 `else` 分支：`preview.style.backgroundImage = 'url("' + currentVal + '")'`
- 对于 base64 数据，`url("data:image/...")` 应该是正确的，所以这个不影响预览

等等，让我重新分析...

`applyStyleChange` 中的逻辑（content.js:2007-2017）：
```js
if (prop === 'backgroundImage') {
  if (value && value !== 'none') {
    if (isSimpleBgImageUrl(value) || /gradient\s*\(/i.test(value) || value.indexOf(',') >= 0) {
      entry._el.style.backgroundImage = value;  // ← base64 有逗号，走这里，直接赋值
    } else {
      entry._el.style.backgroundImage = 'url("' + value + '")';
    }
  }
}
```

**真正的问题**: base64 图片（`data:image/...`）含有逗号，所以 `value.indexOf(',') >= 0` 为 true，走了第一个分支——**直接把 `data:image/...` 赋值给 `backgroundImage`**。但 `backgroundImage` 的值必须是 `url(...)` 格式，直接赋值 `data:image/...` 是无效的！

#### 根因3：同样的问题也影响编辑面板中的预览

content.js:2724 行：
```js
if (isSimpleBgImageUrl(currentVal) || /gradient\s*\(/i.test(currentVal) || currentVal.indexOf(',') >= 0) {
  preview.style.backgroundImage = currentVal;  // ← 同样的 bug
}
```

### 可能性猜测

| 排序 | 假设 | 概率 | 说明 |
|------|------|------|------|
| 1 | base64 图片因含逗号被误判，未包裹 url() | 极高 | isSimpleBgImageUrl 设计未考虑 data: URI 场景 |
| 2 | 新增元素的 DOM 渲染时序问题 | 低 | applyStyleChange 立即生效，不太有时序问题 |
| 3 | 上传功能本身失败 | 低 | 若失败会有 toast 提示 |

### 修复建议

**核心修复**：修正 `isSimpleBgImageUrl()` 及所有使用 `value.indexOf(',') >= 0` 判断的地方，增加对 `data:` URI 的识别。

**具体方案**:
1. 新增一个辅助函数 `isDataUrl(value)`，判断是否为 `data:image/...` 格式
2. 在 `applyStyleChange()`、`applyMarkVisual()`、编辑面板预览三处，对 data URL 正确包裹 `url()`
3. 修正判断逻辑：data URL 应该走"需要包裹 url()"的分支，而不是"直接使用原始值"的分支

**参考修复代码**:
```js
function isDataUrl(value) {
  return /^data:image\//i.test(value);
}

// 在判断时增加：
if (isDataUrl(val)) {
  el.style.backgroundImage = 'url("' + val + '")';
} else if (isSimpleBgImageUrl(val) || /gradient\s*\(/i.test(val) || val.indexOf(',') >= 0) {
  el.style.backgroundImage = val;
} else {
  el.style.backgroundImage = 'url("' + val + '")';
}
```

### 验收手段
1. 新增元素 → 上传背景图片（base64）→ 页面元素应立即显示背景图片
2. 编辑面板中的背景图片预览区应正确显示缩略图
3. 对已有元素添加背景图片 → 同样正常显示
4. 使用 URL 形式的背景图片 → 仍然正常工作
5. 使用渐变背景 → 仍然正常工作

---

## 问题 #2（P0）- 快捷键：工具栏中快捷键提示有误

### 问题描述
- **现象**: 工具栏中显示的快捷键提示与实际不符。Mac 系统应统一显示 Option，Windows 显示 Alt
- **备注**: 2轮修复失败
- **影响范围**: 用户体验、操作指引错误

### 现场分析
**当前状态**:
- manifest.json 中配置：`default: "Alt+E"`, `mac: "Alt+E"` —— Mac 也是 Alt，不是 Option
- 工具栏信息行显示：`快捷键 Ctrl+Shift+E`（content.js:2121）
- 关闭按钮 title 显示：`隐藏工具栏（快捷键 Ctrl+Shift+E）`（content.js:2062）
- README 文档描述：`Alt+E`（Windows/Linux）/ `Option+E`（macOS）

**问题**: 三处不一致！
1. manifest.json 配置的快捷键是 Alt+E（Mac 也是 Alt）
2. 工具栏显示的是 Ctrl+Shift+E
3. README 写的是 Option+E（Mac）

### 代码定位

| 位置 | 文件 | 行号 | 当前内容 |
|------|------|------|---------|
| manifest commands | manifest.json | 57-63 | `default: Alt+E`, `mac: Alt+E` |
| 关闭按钮 title | content.js | 2062 | `Ctrl+Shift+E` |
| 工具栏信息行 | content.js | 2121 | `Ctrl+Shift+E` |
| README 文档 | README.md | 23/48/107/174 | `Alt+E` / `Option+E` |
| Project_Rule 测试清单 | Project_Rule.md | 451 | `Ctrl/Cmd + Shift + E` |

### 根因分析

#### 根因1：多轮修复中代码与文档不同步

这是一个典型的"代码-文档不一致"问题：
- manifest.json 配置了 Alt+E（实际生效的快捷键）
- 但 UI 提示仍然是旧的 Ctrl+Shift+E
- README 又是另一个版本（Option+E for Mac）

#### 根因2：manifest.json 中 Mac 快捷键错误

manifest.json 第 60 行：
```json
"mac": "Alt+E"
```
Chrome 扩展中，Mac 系统的 Option 键应该用 `Alt` 表示（Chrome API 的约定），但用户感知的是 "Option" 键。所以配置是对的，但 UI 显示时应该根据系统显示不同的名称。

#### 根因3：缺少动态判断用户操作系统的逻辑

工具栏硬编码了 `Ctrl+Shift+E`，没有根据操作系统动态显示正确的快捷键名称。

### 修复建议

**永久修复**:
1. 确认实际生效的快捷键：以 manifest.json 为准 —— `Alt+E`（Chrome API 中 Mac 也是 Alt）
2. UI 显示时根据操作系统动态显示：
   - macOS → `Option+E`
   - Windows/Linux → `Alt+E`
3. 同步更新所有出现快捷键提示的地方：
   - content.js 第 2062 行（关闭按钮 title）
   - content.js 第 2121 行（工具栏信息行）
   - README.md 文档
   - Project_Rule.md 测试清单
4. 检测操作系统的方法：`navigator.platform` 或 `navigator.userAgent`

**参考实现**:
```js
function isMac() {
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}
const shortcutKey = isMac() ? 'Option+E' : 'Alt+E';
```

### 验收手段
1. Mac 系统上 → 工具栏显示 `快捷键 Option+E`
2. Windows 系统上 → 工具栏显示 `快捷键 Alt+E`
3. 关闭按钮 title 与工具栏显示一致
4. README 描述与实际一致
5. Project_Rule 测试清单与实际一致

---

## 问题 #26（P0）- 滚轮缩放：滚轮缩放失效

### 问题描述
- **现象**: 滚轮缩放失效，仅能通过 shift+触控面板可以缩放
- **影响范围**: 核心交互功能（滚轮缩放）完全失效

### 现场分析
**复现路径**:
1. 标记一个元素
2. 按住 Ctrl/Cmd + 滚轮滚动
3. 观察元素 → 大小没有变化
4. 使用 Shift + 触控板双指手势 → 可能可以缩放

### 代码定位

| 函数 | 文件位置 | 作用 |
|------|---------|------|
| `enableWheelResize()` | content.js:1609-1639 | 启用滚轮缩放 |
| `applyMarkVisual()` | content.js:1013 | 调用 enableWheelResize |
| wheel 事件条件判断 | content.js:1624-1625 | 判断是否触发缩放 |

### 根因分析

#### 根因1（高概率）：滚轮事件使用捕获阶段，但事件被页面自身消费

**关键代码**（content.js:1624-1638）：
```js
el.addEventListener('wheel', function(e) {
  if (!e.ctrlKey && !e.metaKey) return;  // ← 只响应 Ctrl 或 Cmd + 滚轮
  e.preventDefault(); e.stopPropagation();
  // ... 缩放逻辑
}, true);  // ← 捕获阶段
```

**问题分析**:
- 代码要求 `e.ctrlKey` 或 `e.metaKey` 才触发缩放
- 但在 Mac 触控板上，双指捏合缩放手势触发的 wheel 事件中，`ctrlKey` 可能为 false
- 同时，很多页面自身有 wheel 事件处理（如滚动页面），即使在捕获阶段监听，如果 `ctrlKey` 为 false，我们的 handler 直接 return 了

等等，让我重新看用户的描述："仅能通过shift+触控面板可以缩放"

如果用户说的是 Shift + 触控板手势可以缩放，那说明 wheel 事件本身是能触发的，只是条件判断有问题。

**但代码中判断的是 ctrlKey / metaKey，不是 shiftKey！**

#### 根因2（主因）：Ctrl/Cmd 键检测与实际操作习惯不匹配

用户说"shift+触控面板可以缩放"，这暗示：
1. 触控板的双指缩放可能触发 wheel 事件，且 `e.ctrlKey === true`（某些浏览器/系统设置下）
2. 但普通的鼠标滚轮 + Ctrl 键可能因为某些原因没有被正确检测
3. 或者，用户的操作方式是 Shift + 滚轮，但代码监听的是 Ctrl/Cmd

#### 根因3：wheel 事件可能被页面其他元素拦截

- 如果元素内部有可滚动的子元素，wheel 事件可能被子元素消费
- `stopPropagation()` 在捕获阶段调用，可以阻止向下传播，但如果页面在捕获阶段也有监听...

#### 根因4：Passive event listener 冲突

现代浏览器中，`wheel` 事件默认是 passive 的，调用 `preventDefault()` 会被忽略。但代码使用了 `addEventListener(..., true)`（捕获阶段），通常不受 passive 默认值影响。不过需要验证。

### 可能性猜测

| 排序 | 假设 | 概率 | 说明 |
|------|------|------|------|
| 1 | 用户操作习惯与代码监听的修饰键不匹配 | 高 | 用户可能用 Shift 而非 Ctrl/Cmd |
| 2 | wheel 事件被页面原生滚动消费 | 中 | 页面滚动优先级高于元素缩放 |
| 3 | passive listener 导致 preventDefault 失效 | 低 | 捕获阶段通常不受影响 |
| 4 | enableWheelResize 未被正确调用 | 低 | applyMarkVisual 中明确调用了 |

### 修复建议

**诊断步骤**:
1. 在 `enableWheelResize` 开头加 `console.log` 确认是否被调用
2. 在 wheel handler 开头加 `console.log(e.ctrlKey, e.metaKey, e.deltaY, e.deltaMode)` 观察事件参数
3. 确认用户是用鼠标滚轮还是触控板操作

**永久修复**:
1. 增加对更多修饰键的支持，或提供配置选项
2. 确保 wheel 事件正确拦截和响应
3. 如果是 Mac 触控板缩放手势，可能需要监听 `gesturestart/gesturechange/gestureend` 事件
4. 考虑增加 Shift + 滚轮作为备选缩放方式

### 验收手段
1. Ctrl + 鼠标滚轮 → 元素缩放
2. Cmd + 鼠标滚轮（Mac）→ 元素缩放
3. 触控板双指缩放（Mac）→ 元素缩放
4. 缩放时页面不滚动
5. 缩放比例合理（每次滚动缩放 2%）

---

## 问题 #4（P1）- 多选元素：拖拽大小同步修改子元素未生效

### 问题描述
- **现象**: 勾选「同步缩放子元素」后，拖拽调整父元素大小时，子元素样式未同步变化。上下高度调整子元素未发生变化
- **额外问题**: 模块标题叫「缩放选项」，但实际应用于拖拽大小，表述不一致
- **备注**: 1轮修复失败
- **影响范围**: 同步缩放子元素功能在拖拽场景下完全失效

### 现场分析
**复现路径**:
1. 标记一个包含子元素的容器
2. 打开编辑面板，勾选「同步缩放子元素」
3. 拖拽元素边缘把手调整高度/宽度
4. 观察子元素 → 子元素大小未变化

### 代码定位

| 函数/代码段 | 文件位置 | 作用 |
|------------|---------|------|
| `syncChildrenScale` 复选框 | content.js:2353-2370 | 同步缩放开关 |
| 拖拽大小 onMove/onUp | content.js:1564-1602 | 拖拽调整大小 |
| scaleElement + syncChildren | content.js:1474-1493 | 滚轮 scale 吸收时的子元素缩放 |
| 缩放选项 section 标题 | content.js:2347 附近 | "缩放选项" |

### 根因分析

#### 根因1（主因）：拖拽大小逻辑中完全没有实现同步缩放子元素

**关键发现**: `syncChildrenScale` 只在一个地方被使用 —— 滚轮缩放的 scale 值吸收到真实样式时（content.js:1486-1493）：

```js
// 这段代码在 addResizeHandles 的 mousedown 中，
// 当有 transform: scale 时才执行，用于把 scale 吸收为真实尺寸
scaleElementStyles(el);
if (entry.syncChildrenScale) {
  const children = el.querySelectorAll('*');
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.classList && child.classList.value && child.classList.value.indexOf('html-diff-marker-') >= 0) continue;
    scaleElementStyles(child);
  }
}
```

**而在真正的拖拽大小逻辑中**（onMove 函数，content.js:1564-1582）：
```js
function onMove(ev) {
  const dx = ev.clientX - startX;
  const dy = ev.clientY - startY;
  let newW = startW, newH = startH, newLeft = startLeft, newTop = startTop;
  // ... 计算 newW, newH ...
  el.style.width = newW + 'px';
  el.style.height = newH + 'px';
  // ↑↑↑ 只修改了父元素的 width/height，完全没有处理子元素！
}
```

**结论**: 拖拽大小时，`syncChildrenScale` 标志完全没有被读取和使用！只修改了父元素的 `width` / `height`，子元素没有任何联动。

#### 根因2：功能命名与实际行为不匹配

- UI 上叫「缩放选项」→ 用户以为是滚轮缩放的开关
- 实际只在"滚轮 scale 吸收到真实样式"这一个场景生效
- 而用户更常用的"拖拽调整大小"场景完全不生效

#### 根因3：实现难度——拖拽缩放子元素需要比例计算

滚轮缩放是基于 `transform: scale()` 的等比缩放，吸收时可以直接按比例相乘。
但拖拽大小可以不等比（只调宽度或只调高度），子元素的缩放比例计算更复杂：
- 宽度变化 → 子元素的 width/paddingLeft/paddingRight/marginLeft/marginRight 等要按比例缩放
- 高度变化 → 子元素的 height/paddingTop/paddingBottom/fontSize 等要按比例缩放
- 同时变化 → 按各自比例分别缩放

### 可能性猜测

| 排序 | 假设 | 概率 | 说明 |
|------|------|------|------|
| 1 | 拖拽大小逻辑中遗漏了 syncChildrenScale 处理 | 极高 | onMove/onUp 中找不到相关代码 |
| 2 | 功能设计只针对滚轮缩放，拖拽不在范围内 | 中 | 但标签描述含糊 |
| 3 | 实现了但条件判断有误 | 低 | 代码中完全找不到 |

### 修复建议

**永久修复**:
1. 在拖拽大小的 `onMove` 或 `onUp` 中增加 `syncChildrenScale` 处理逻辑
2. 按宽高缩放比例分别计算子元素的样式：
   - `scaleX = newW / startW`
   - `scaleY = newH / startH`
   - 水平方向属性（width, paddingLeft, paddingRight, marginLeft, marginRight, borderLeftWidth, borderRightWidth）乘以 scaleX
   - 垂直方向属性（height, paddingTop, paddingBottom, marginTop, marginBottom, borderTopWidth, borderBottomWidth, fontSize, lineHeight, borderRadius 各角）乘以 scaleY
3. 修正模块标题为「同步缩放子元素」或「大小调整选项」，避免与"滚轮缩放"混淆
4. 修改 label 描述为"拖拽调整大小时，子元素样式同步缩放"更准确

### 验收手段
1. 勾选「同步缩放子元素」→ 拖拽宽度 → 子元素宽度等比例变化
2. 勾选「同步缩放子元素」→ 拖拽高度 → 子元素高度/字体等比例变化
3. 勾选「同步缩放子元素」→ 拖拽角落（同时改宽高）→ 子元素按各自比例变化
4. 不勾选 → 拖拽大小 → 子元素不变
5. 模块标题与功能描述一致，不引起歧义

---

## 问题 #25（P2）- 编辑面板-字体：预览不可用提示位置优化

### 问题描述
- **现象**: 编辑面板中字体的"预览不可用"提示当前在字体选项框的上方，希望挪到下方
- **类型**: 优化（UI/UX 改进）
- **影响范围**: 用户体验，不影响功能

### 现场分析
**当前布局**:
```
┌─────────────────────────────┐
│ 字体 [下拉选择框 ▼]          │
│ ⚠ 当前预览不可用...          │  ← hintRow 在上方
│ ➕ 添加自定义字体            │
│ [删除此自定义字体]           │
└─────────────────────────────┘
```

**期望布局**:
```
┌─────────────────────────────┐
│ 字体 [下拉选择框 ▼]          │
│ ➕ 添加自定义字体            │
│ ⚠ 当前预览不可用...          │  ← hintRow 在下方
│ [删除此自定义字体]           │
└─────────────────────────────┘
```

### 代码定位

**关键代码**（content.js:2658-2711）：
```js
var fontGroup = document.createElement('div');
fontGroup.className = 'html-diff-marker-font-group';

var hintRow = document.createElement('div');  // 1. 先创建 hintRow
hintRow.className = 'html-diff-marker-font-hint';
hintRow.style.display = 'none';
hintRow.textContent = '⚠ 当前预览不可用...';
fontGroup.appendChild(hintRow);  // ← 先添加到 fontGroup

// ... updateFontHint 函数 ...

var addFontBtn = document.createElement('button');  // 2. 再创建添加按钮
addFontBtn.textContent = '➕ 添加自定义字体';
fontGroup.appendChild(addFontBtn);  // ← 后添加到 fontGroup

// 3. 最后是删除按钮（异步添加）
isCustomFont(val).then(function(isCustom) {
  if (isCustom && val) {
    var delBtn = document.createElement('button');
    fontGroup.appendChild(delBtn);
  }
});
```

### 根因分析
#### 根因：DOM 元素创建顺序导致提示在上方

`hintRow` 在 `addFontBtn` 之前被 `appendChild` 到 `fontGroup` 中，因此在视觉上出现在添加按钮上方。

### 修复建议

**简单修复**: 调整 DOM 元素的 append 顺序，将 `hintRow` 移到 `addFontBtn` 之后添加

**具体操作**:
1. 把 hintRow 的创建和 append 移到 addFontBtn 的 append 之后
2. 注意：`updateFontHint()` 函数在 `addFontBtn` 创建之前就被调用了，但函数只操作 hintRow 的 display 属性，不依赖 DOM 顺序，所以可以调整

**CSS 验证**: 检查 `.html-diff-marker-font-group .html-diff-marker-font-hint` 的 margin-top 是否需要调整（当前是 0）

### 验收手段
1. 选择一个系统不可用的字体 → 提示出现在下拉框下方、添加按钮下方
2. 选择可用字体 → 提示不显示
3. 自定义字体时 → 删除按钮在最下方
4. 整体布局美观，间距合理

---

## 问题 #27（P2）- 字体：添加/选择自定义字体后面板滚动位置重置

### 问题描述
- **现象**: 添加自定义字体、或选中自定义字体后，编辑面板会回到最上方展示子元素勾选的位置，没有保持在字体选项的位置
- **类型**: 优化（UX 改进）
- **影响范围**: 用户体验，操作流程被打断

### 现场分析
**复现路径**:
1. 打开编辑面板，滚动到字体选项处
2. 点击「➕ 添加自定义字体」，输入信息后确认
3. 观察面板 → 自动滚动回顶部
4. 或：在字体下拉框中选择一个自定义字体
5. 观察面板 → 自动滚动回顶部

### 代码定位

| 代码位置 | 文件 | 行为 |
|---------|------|------|
| `openInspector()` | content.js:2190-2980+ | 每次调用都重新创建整个面板 |
| 添加自定义字体回调 | content.js:2687-2689 | `setTimeout(function() { openInspector(entry.id); }, 200);` |
| 删除自定义字体回调 | content.js:2703-2704 | `setTimeout(function() { openInspector(entry.id); }, 200);` |
| 上传图片回调 | content.js:2760-2761 | `openInspector(entry.id);` |

### 根因分析

#### 根因1（主因）：openInspector 每次都重建整个面板，不保存滚动位置

**关键代码**（content.js:2190-2196）：
```js
function openInspector(id) {
  const savedPos = state.inspectorPos;
  closeInspector();  // ← 关闭（销毁）当前面板
  const entry = state.markedElements.find(m => m.id === id);
  if (!entry) return;
  recordOriginalStyles(entry);
  state.currentEditId = id;
  // ... 重新创建整个面板 DOM ...
}
```

**问题机制**:
1. 用户滚动到面板中部的字体选项
2. 点击「添加自定义字体」
3. 字体添加成功后，调用 `openInspector(entry.id)` 刷新面板
4. `openInspector` 先调用 `closeInspector()` 销毁旧面板
5. 然后从头创建新面板
6. 新面板的 scrollTop 自然是 0（顶部）
7. 用户看到的效果就是"回到最上方"

#### 根因2：所有需要刷新面板的操作都有这个问题

不仅是自定义字体，以下操作都会调用 `openInspector()` 导致面板回顶：
- 样式修改（`applyStyleChange` 后手动调用）
- 拖拽大小结束后
- 滚轮缩放后
- 文本编辑结束后
- 上传背景图片后
- 添加/删除自定义字体后

只是有些操作（如拖拽）用户预期面板会刷新，而字体选择这类操作用户期望保持滚动位置。

### 可能性猜测

| 排序 | 假设 | 概率 | 说明 |
|------|------|------|------|
| 1 | openInspector 重建面板，不保存滚动位置 | 极高 | 代码明确 close + 重建 |
| 2 | 没有保存滚动位置的状态变量 | 高 | state 中只有 inspectorPos（位置），没有 scrollTop |
| 3 | 设计上认为每次刷新都该回到顶部 | 低 | 不符合 UX 最佳实践 |

### 修复建议

**方案 A（推荐）：保存并恢复滚动位置**

1. 在 `state` 中增加 `inspectorScrollTop` 变量
2. 在 `closeInspector()` 中保存当前滚动位置
3. 在 `openInspector()` 末尾，面板渲染完成后恢复滚动位置
4. 仅对"编辑类操作"（修改字体、上传图片等）恢复滚动位置
5. 对"切换编辑对象"的操作（点击不同元素）重置到顶部

**方案 B：局部刷新，不重建整个面板**

- 难度较大，因为面板结构复杂
- 需评估工作量

**具体实现（方案 A）**:
```js
// closeInspector 中保存
function closeInspector() {
  if (state.inspectorEl) {
    const body = state.inspectorEl.querySelector('.html-diff-marker-inspector-body');
    if (body) state.inspectorScrollTop = body.scrollTop;
  }
  // ... 原有关闭逻辑 ...
}

// openInspector 末尾恢复
function openInspector(id) {
  // ... 原有创建逻辑 ...
  setTimeout(function() {
    const body = panel.querySelector('.html-diff-marker-inspector-body');
    if (body && state.inspectorScrollTop) {
      body.scrollTop = state.inspectorScrollTop;
    }
  }, 10);
}
```

### 验收手段
1. 打开编辑面板 → 滚动到字体选项 → 添加自定义字体 → 面板保持在字体区域
2. 打开编辑面板 → 滚动到字体选项 → 选择自定义字体 → 面板保持在字体区域
3. 打开编辑面板 → 滚动到背景图片 → 上传背景图片 → 面板保持在背景图片区域
4. 点击不同元素的徽章 → 面板从顶部开始显示（切换编辑对象应重置）
5. 关闭后重新打开 → 面板从顶部开始显示

---

## 总结与修复优先级建议

### 按优先级排序

| 优先级 | 问题 | 预估修复难度 | 影响 |
|--------|------|------------|------|
| P0 | #26 滚轮缩放失效 | 中 | 核心交互功能完全失效 |
| P0 | #24 背景图片预览失败 | 低 | 新增元素无法设置背景图 |
| P0 | #2 快捷键提示错误 | 低 | 用户指引错误 |
| P0 | #22 多选无组合选项 | 中 | 多选核心功能缺失 |
| P1 | #4 同步缩放子元素未生效 | 中高 | 功能与描述不符 |
| P2 | #25 字体提示位置 | 极低 | UI 细节优化 |
| P2 | #27 面板滚动位置重置 | 低 | UX 体验优化 |

### 建议修复顺序

1. **先修 #24（背景图片）** — 难度最低，`isSimpleBgImageUrl` 增加 data URL 判断
2. **再修 #2（快捷键）** — 难度低，统一文案 + 动态判断系统
3. **再修 #25（字体提示位置）** — 难度极低，调整 append 顺序
4. **再修 #26（滚轮缩放）** — 需先确认根因，可能涉及事件机制调整
5. **再修 #22（多选组合选项）** — 需排查工具栏显示问题
6. **再修 #4（同步缩放子元素）** — 工作量较大，需实现拖拽时的子元素比例计算
7. **最后修 #27（面板滚动位置）** — UX 优化，可作为收尾

---

**报告结束**
