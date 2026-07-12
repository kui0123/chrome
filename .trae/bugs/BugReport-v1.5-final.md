# HTML 排版插件 BugReport (v1.5 Final)

**报告生成时间**: 2026-07-08
**排查范围**: content/content.js, content/content.css
**排查人**: Hugo
**对应版本**: v1.5.0

---

## 问题总览

| 序号 | 问题编号 | 严重程度 | 模块 | 类型 | 状态 |
|------|---------|---------|------|------|------|
| 1 | #6 | P1 | 编辑面板 | 优化 | 待修复 |
| 2 | #20 | P0 | 字体/弹窗 | BUG | 待修复 |
| 3 | #26 | P0 | 滚轮缩放 | BUG | 待修复 |
| 4 | #28 | P0 | 多选元素 | BUG | 待修复 |
| 5 | #29 | P0 | 图片/弹窗 | BUG | 待修复 |
| 6 | #30 | P2 | 快捷键 | 优化 | 待修复 |
| 7 | #31 | P1 | 图片/背景图 | 优化 | 待修复 |
| 8 | #32 | P0 | 删除标记 | BUG | 待修复 |

---

## 问题 #6（P1）- 编辑面板：功能模块重新排序

### 问题描述
编辑面板功能模块需要重新排序，调整为：缩放选项、组件标签、修改说明、链接href/跳转链接、样式编辑、位置调整、大小调整、HTML编辑区、元素信息、底部操作栏；字体预览不可用提示挪到字体选项框下方；添加自定义字体按钮集成在字体选项右侧。

### 当前代码状态

当前编辑面板的模块顺序（content.js:2354-3102）：
1. 元素信息（infoBox）— 第2355行
2. 组件标签（noteWrap）— 第2361行
3. 修改说明（descWrap）— 第2375行
4. 链接 href / 跳转链接 — 第2418行
5. 大小调整选项（scaleOptSection）— 第2464行
6. 位置调整（posSection）— 第2494行
7. 大小调整（sizeSection）— 第2555行
8. 样式编辑区（styleSection）— 第2687行
9. HTML编辑区 — 第3054行
10. 底部操作栏（footer）— 第3082行

字体相关区域（content.js:2773-2832）：
- 字体选择下拉框
- `fontGroup` 容器（包含添加按钮、提示、删除按钮）
- 当前添加按钮在下拉框下方

### 根因分析
这是一个UI布局优化需求，当前代码中的模块顺序与用户期望不一致：
1. 缩放选项（大小调整选项）在链接编辑之后，需要移到最前面
2. 元素信息在最前面，需要移到HTML编辑区之后
3. 位置调整在大小调整之前，需要调整顺序
4. 字体预览提示和添加按钮的位置需要调整

### 修复建议

**修改 `openInspector` 函数中的模块添加顺序**（content.js）：

```js
// 修改前的顺序（第2354-3102行）
body.appendChild(infoBox);         // 1. 元素信息
body.appendChild(noteWrap);        // 2. 组件标签
body.appendChild(descWrap);        // 3. 修改说明
body.appendChild(hrefWrap/jumpWrap); // 4. 链接
body.appendChild(scaleOptSection); // 5. 大小调整选项
body.appendChild(posSection);      // 6. 位置调整
body.appendChild(sizeSection);     // 7. 大小调整
body.appendChild(styleSection);    // 8. 样式编辑
body.appendChild(htmlInfo);        // 9. HTML原始
body.appendChild(htmlEdit);        // 10. HTML修改

// 修改后的顺序
body.appendChild(scaleOptSection); // 1. 缩放选项（移到最前）
body.appendChild(noteWrap);        // 2. 组件标签
body.appendChild(descWrap);        // 3. 修改说明
body.appendChild(hrefWrap/jumpWrap); // 4. 链接href/跳转链接
body.appendChild(styleSection);    // 5. 样式编辑（提到位置/大小调整之前）
body.appendChild(posSection);      // 6. 位置调整
body.appendChild(sizeSection);     // 7. 大小调整
body.appendChild(htmlInfo);        // 8. HTML编辑区（原始）
body.appendChild(htmlEdit);        // 9. HTML编辑区（修改）
body.appendChild(infoBox);         // 10. 元素信息（移到最后）
```

**字体相关调整**（content.js:2773-2832）：
- 将字体预览不可用提示（hintRow）移到字体选择下拉框的父级（inpWrap）内，放在下拉框下方
- 将添加自定义字体按钮（addFontBtn）放在字体选择下拉框的右侧（水平布局）

### 验收手段
1. 打开编辑面板，确认模块顺序为：缩放选项 → 组件标签 → 修改说明 → 链接 → 样式编辑 → 位置调整 → 大小调整 → HTML编辑区 → 元素信息
2. 字体预览不可用提示显示在字体下拉框正下方
3. 添加自定义字体按钮显示在字体下拉框右侧

---

## 问题 #20（P0）- 字体：自定义字体弹窗无法点击取消和确认

### 问题描述
点击「添加自定义字体」弹出的弹窗中，「确定」和「取消」按钮点击无任何反应。

### 根因分析

**根本原因：modal 和 overlay 在捕获阶段阻止了 click 事件传播**

关键代码（content.js:475-545）：

```js
// content.js:478-480 — overlay 捕获阶段阻止事件
overlay.addEventListener('mousedown', function(e) { e.stopPropagation(); }, true);
overlay.addEventListener('mouseup', function(e) { e.stopPropagation(); }, true);
overlay.addEventListener('click', function(e) { e.stopPropagation(); }, true);

// content.js:485-487 — modal 捕获阶段阻止事件  
modal.addEventListener('mousedown', function(e) { e.stopPropagation(); }, true);
modal.addEventListener('mouseup', function(e) { e.stopPropagation(); }, true);
modal.addEventListener('click', function(e) { e.stopPropagation(); }, true);
```

**事件流分析**：
1. DOM事件流分为三个阶段：捕获阶段（从上到下）→ 目标阶段 → 冒泡阶段（从下到上）
2. `addEventListener` 的第三个参数为 `true` 表示在**捕获阶段**触发
3. 在捕获阶段调用 `event.stopPropagation()` 会阻止事件继续**向下**传播到子元素
4. 由于 modal 和 overlay 都在捕获阶段阻止了 click 事件，内部的按钮永远收不到 click 事件

### 修复建议

**将 modal 和 overlay 的事件绑定从捕获阶段改为冒泡阶段**：

```js
// 修改前（捕获阶段，错误）
overlay.addEventListener('click', function(e) { e.stopPropagation(); }, true);
modal.addEventListener('click', function(e) { e.stopPropagation(); }, true);

// 修改后（冒泡阶段，正确）
overlay.addEventListener('click', function(e) { e.stopPropagation(); }, false);
modal.addEventListener('click', function(e) { e.stopPropagation(); }, false);
```

同理修改 mousedown 和 mouseup 事件（第478-487行）。

### 验收手段
1. 点击「添加自定义字体」→ 弹窗打开
2. 点击「取消」按钮 → 弹窗关闭
3. 输入字体名称和 CSS 值，点击「确定」→ 字体保存成功，弹窗关闭
4. 点击弹窗外部背景 → 不触发元素标记（事件不穿透）

---

## 问题 #26（P0）- 滚轮缩放：滚轮缩放失效

### 问题描述
滚轮缩放失效，仅能通过shift+触控面板可以缩放。

### 根因分析

**根因1（主因）：Wheel 事件 passive 监听器冲突导致 preventDefault 失效**

当前代码（content.js:1733-1747）：

```js
el.addEventListener('wheel', function(e) {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault(); e.stopPropagation();
  const factor = e.deltaY > 0 ? 0.98 : 1.02;
  let newScale = entry._scale * factor;
  // ... 缩放逻辑
}, true);  // ← 第三个参数 true 表示 capture 阶段，但未显式指定 passive
```

**问题核心**：
1. 第三个参数 `true` 只指定了 `capture: true`，没有显式指定 `passive`
2. 在 Chrome 中，对于 `wheel` 事件，某些场景下 passive 默认为 `true`
3. 如果 `passive: true`，`preventDefault()` 调用会被浏览器忽略
4. 页面仍然滚动，缩放效果被滚动干扰，用户感知为"失效"

**组合标记同样存在此问题**（content.js:1178-1187）。

### 修复建议

**显式声明 passive: false，确保 preventDefault 生效**：

```js
// 修改前
el.addEventListener('wheel', function(e) {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  e.stopPropagation();
  // ... 缩放逻辑
}, true);

// 修改后
el.addEventListener('wheel', function(e) {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  e.stopPropagation();
  // ... 缩放逻辑
}, { capture: true, passive: false });  // ← 显式指定 passive: false
```

同样修改组合标记的 wheel 监听器（content.js:1178行）。

### 验收手段
1. Ctrl + 鼠标滚轮 → 元素缩放且页面不滚动
2. Cmd + 鼠标滚轮（Mac）→ 元素缩放且页面不滚动
3. 触控板双指缩放（Mac）→ 元素缩放正常
4. 缩放时页面完全静止（preventDefault 生效的标志）

---

## 问题 #28（P0）- 多选元素：选择元素shift多选后，没有编辑面板也没有组合按钮

### 问题描述
选择元素shift多选后，没有编辑面板也没有组合按钮。再次点击复制/删除元素，提示「先在编辑面板中选择一个组件」。

### 根因分析

**根因1（主因）：多选浮动工具栏定位方式脆弱，易受页面环境影响而不可见**

当前代码（content.js:901-920）：

```js
const bounds = getMultiSelectBounds();
if (bounds) {
  bar.style.position = 'absolute';  // ← 使用 absolute 定位
  const viewportLeft = bounds.left - window.scrollX;
  const viewportTop = bounds.top - window.scrollY;
  let left = viewportLeft + bounds.width / 2 - 100;
  let top = viewportTop - 36;
  // ... 边界保护
  bar.style.left = left + 'px';
  bar.style.top = top + 'px';
  bar.style.zIndex = '2147483645';
}
```

虽然代码已经有 `position: fixed` 的设置（第903行），但问题可能在于：
- `getMultiSelectBounds()` 返回的坐标可能有问题
- 边界保护逻辑可能不完整

**根因2：onClick 捕获阶段拦截导致工具栏按钮点击失效**

关键代码（content.js:717-729）：

```js
function onClick(e) {
  if (!state.isSelecting) return;
  // 检查排除的类名
  if (e.target.closest('.html-diff-marker-toolbar') || 
      e.target.closest('.html-diff-marker-multi-toolbar') ||  // ← 已修复？
      e.target.closest('.html-diff-marker-inspector')) return;
  e.preventDefault(); e.stopPropagation();
  const el = e.target;
  // ...
}
```

**根因3：主工具栏的复制/删除按钮不支持多选状态**

关键代码（content.js:1951-1956）：

```js
function duplicateSelectedElement() {
  const entry = getCurrentEntry();
  if (!entry || !entry._el) {
    alert('请先在编辑面板中选择一个组件');  // ← 仅支持单个编辑元素
    return;
  }
  // ...
}
```

`getCurrentEntry()` 只返回 `state.currentEditId` 对应的元素，多选状态下 `currentEditId` 为 null，因此提示"未选中元素"。

### 修复建议

**修复1：确保多选工具栏使用 fixed 定位**

```js
// content.js:901-920 — 确保使用 fixed 定位
bar.style.position = 'fixed';
bar.style.left = left + 'px';
bar.style.top = top + 'px';
bar.style.right = 'auto';
bar.style.bottom = 'auto';
bar.style.zIndex = '2147483645';
```

**修复2：为复制/删除函数增加多选支持**

```js
function duplicateSelectedElement() {
  // 优先处理多选状态
  if (state.multiSelectedEls.length > 0) {
    state.multiSelectedEls.forEach(el => {
      // 创建每个多选元素的副本
      const clone = el.cloneNode(true);
      // ... 复制逻辑
    });
    return;
  }
  
  // 回退到单个编辑元素
  const entry = getCurrentEntry();
  if (!entry || !entry._el) {
    alert('请先选择一个组件');
    return;
  }
  // ... 原有逻辑
}
```

**修复3：在主工具栏中增加多选状态下的组合标记入口**

### 验收手段
1. 进入选择模式，Shift+点击 2 个以上元素 → 多选浮动工具栏应正确显示在选区上方
2. 工具栏应包含「组合标记」按钮，点击后成功创建组合标记
3. 多选状态下点击主工具栏「复制当前」→ 批量复制所有多选元素
4. 多选状态下点击主工具栏「删除当前」→ 批量删除所有多选元素

---

## 问题 #29（P0）- 图片：上传图片，图片大小提示弹窗后无法关闭

### 问题描述
上传图片，图片大小提示弹窗后无法关闭。

### 根因分析
这与问题 #20 是同一个根因——弹窗按钮无法点击。

当选择的图片超过 500KB 时，`uploadImage()` 会调用 `showModal()` 创建确认弹窗（content.js:654-667）：

```js
if (sizeKB > limit) {
  showModal({
    title: '图片大小提示',
    body: confirmMsg,
    confirmText: '继续',
    cancelText: '取消',
    onConfirm: function() { /* ... */ },
    onCancel: function() { /* ... */ }
  });
}
```

由于 `showModal()` 中的 overlay 和 modal 在捕获阶段阻止了 click 事件（见问题 #20 的根因分析），弹窗内的「继续」和「取消」按钮无法点击，导致弹窗无法关闭。

### 修复建议
同问题 #20 的修复方案——将 modal 和 overlay 的事件绑定从捕获阶段改为冒泡阶段。

### 验收手段
1. 选择大于 500KB 的图片 → 弹出确认弹窗
2. 点击「取消」→ 弹窗关闭，上传流程中止
3. 点击「继续」→ 弹窗关闭，图片上传继续

---

## 问题 #30（P2）- 快捷键：快捷键提示文案修改

### 问题描述
快捷键提示文案修改，用Mac系统中Option按键的图表+E标识，Win系统还用Alt。选择元素的快捷键提示增加标识，Option按键的图表 + "+"。

### 当前代码状态

**快捷键处理逻辑**（content.js:761-783）：

```js
// Option + "+" 快捷键：开始选择元素
if (e.altKey && (e.key === '+' || e.key === '=' || e.code === 'Equal' || e.code === 'NumpadAdd')) {
  // ...
}

// Alt+E / Option+E 快捷键：三态切换
if (e.altKey && (e.key === 'e' || e.key === 'E' || e.code === 'KeyE')) {
  // ...
}
```

**快捷键提示显示**（content.js:2141-2145, 2236）：

```js
function getShortcutLabel() {
  const platform = navigator.platform || '';
  const isMac = /Mac|iPod|iPhone|iPad/.test(platform);
  return isMac ? 'Option+E' : 'Alt+E';
}

// 工具栏信息行
infoRow.innerHTML = '<span class="html-diff-marker-count">0 标记</span>...<span style="font-size:10px;">快捷键 ' + getShortcutLabel() + '</span>';
```

### 根因分析
当前代码已经实现了系统检测（`getShortcutLabel`），但存在以下问题：
1. 工具栏信息行只显示了三态切换快捷键（Alt+E/Option+E），没有显示选择元素的快捷键（Option+"+"）
2. 需要使用实际的按键符号（⌥）来替代"Option"文字

### 修复建议

**修改 `getShortcutLabel` 函数，增加选择元素快捷键的提示**：

```js
function getShortcutLabel() {
  const platform = navigator.platform || '';
  const isMac = /Mac|iPod|iPhone|iPad/.test(platform);
  
  if (isMac) {
    // Mac 使用 Option 符号（⌥）
    return {
      toggle: '⌥+E',           // 三态切换
      select: '⌥+"+"'          // 选择元素
    };
  } else {
    // Windows 使用 Alt
    return {
      toggle: 'Alt+E',         // 三态切换
      select: 'Alt+"+"'        // 选择元素
    };
  }
}
```

**修改工具栏信息行，显示完整的快捷键提示**：

```js
const shortcuts = getShortcutLabel();
infoRow.innerHTML = '<span class="html-diff-marker-count">0 标记</span>' +
  '<span class="html-diff-marker-modified-count">0 修改</span>' +
  '<span style="font-size:10px;">' + shortcuts.toggle + ' 切换 ' + shortcuts.select + ' 选择</span>';
```

### 验收手段
1. Mac 系统下工具栏显示：`⌥+E 切换 ⌥+"+" 选择`
2. Windows 系统下工具栏显示：`Alt+E 切换 Alt+"+" 选择`
3. 按对应快捷键 → 功能正常触发

---

## 问题 #31（P1）- 图片：插入背景图片后可以预览，但不会跟随元素块区域缩放

### 问题描述
插入背景图片后可以预览，但不会跟随元素块区域缩放，会被截断。

### 根因分析

**背景图片的 CSS background-size 属性默认值为 auto**，不会自动适应元素尺寸。

当前代码中，`applyMarkVisual` 函数对 backgroundImage 的处理（content.js:995-1006）：

```js
if (prop === 'backgroundImage') {
  if (val && val !== 'none' && val !== '') {
    if (isSimpleBgImageUrl(val) || /gradient\s*\(/i.test(val) || (val.indexOf(',') >= 0 && !isDataUrl(val))) {
      el.style.backgroundImage = val;
    } else {
      el.style.backgroundImage = 'url("' + val + '")';
    }
  } else {
    el.style.backgroundImage = 'none';
  }
}
```

这段代码只设置了 `backgroundImage`，没有设置 `backgroundSize` 和 `backgroundRepeat` 属性，导致：
- `background-size: auto` — 图片保持原始尺寸，超出部分被裁剪
- `background-repeat: repeat` — 图片重复平铺

### 修复建议

**在设置 backgroundImage 时，同时设置 backgroundSize 和 backgroundRepeat**：

```js
if (prop === 'backgroundImage') {
  if (val && val !== 'none' && val !== '') {
    if (isSimpleBgImageUrl(val) || /gradient\s*\(/i.test(val) || (val.indexOf(',') >= 0 && !isDataUrl(val))) {
      el.style.backgroundImage = val;
    } else {
      el.style.backgroundImage = 'url("' + val + '")';
    }
    // 添加背景图适配属性
    el.style.backgroundSize = 'contain';      // 图片适应元素尺寸，保持比例
    el.style.backgroundRepeat = 'no-repeat'; // 不重复
    el.style.backgroundPosition = 'center';  // 居中显示
  } else {
    el.style.backgroundImage = 'none';
    el.style.backgroundSize = '';
    el.style.backgroundRepeat = '';
    el.style.backgroundPosition = '';
  }
}
```

同时在 `applyStyleChange` 函数中也需要做相同的处理（content.js:2117-2131）。

### 验收手段
1. 为元素设置背景图片 → 图片在元素内完整显示，不被截断
2. 调整元素大小 → 背景图片跟随缩放，保持比例
3. 移除背景图片 → 背景相关属性恢复默认

---

## 问题 #32（P0）- 删除标记：删除一个标记后，出现页面排布错乱的问题

### 问题描述
删除一个标记后，出现页面排布错乱的问题。其他标记部分消失。

### 根因分析

**根因1：removeMark 函数中修改数组时的索引偏移问题**

当前代码（content.js:1829-1889）：

```js
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
        // ... 移除子元素的样式
        state.markedElements.splice(cIdx, 1);  // ← 问题：splice 会改变数组长度，影响后续索引
      }
    });
    
    const gIdx = state.markedElements.findIndex(m => m.id === id);
    if (gIdx >= 0) state.markedElements.splice(gIdx, 1);
  } else {
    // ... 单元素删除逻辑
    state.markedElements.splice(idx, 1);
  }
  
  saveState();
  // ...
}
```

**问题机制**：
1. 删除组合标记时，遍历 `childIds` 数组
2. 每次调用 `state.markedElements.splice(cIdx, 1)` 都会改变数组长度
3. 如果子元素在数组中的位置是 [0, 1, 2]，删除索引0后，原来的索引1变成0，索引2变成1
4. 下次循环查找的 cIdx 是基于原始数组的，可能指向错误的元素

**根因2：removeMark 删除组合标记时，子元素的 badge 编号没有重新更新**

删除标记后，`applyMarkVisual` 不会被调用重新渲染其他标记的编号徽章，导致编号错乱。

**根因3：可能存在 DOM 元素被错误移除的问题**

如果 `entry._el` 为 null（元素不在当前页面），`document.querySelector(entry.selector)` 可能返回错误的元素。

### 修复建议

**修复1：反向遍历子元素数组，避免索引偏移**

```js
// 修改前：正向遍历，splice 导致索引偏移
childIds.forEach(cid => {
  const cIdx = state.markedElements.findIndex(m => m.id === cid);
  if (cIdx >= 0) {
    // ...
    state.markedElements.splice(cIdx, 1);
  }
});

// 修改后：反向遍历，从后往前删除，避免索引偏移
for (let i = childIds.length - 1; i >= 0; i--) {
  const cid = childIds[i];
  const cIdx = state.markedElements.findIndex(m => m.id === cid);
  if (cIdx >= 0) {
    const child = state.markedElements[cIdx];
    // ... 移除子元素的样式
    state.markedElements.splice(cIdx, 1);
  }
}
```

**修复2：删除标记后重新渲染所有标记的编号徽章**

```js
function removeMark(id) {
  // ... 删除逻辑 ...
  
  saveState();
  
  // 重新渲染所有标记的编号徽章
  state.markedElements.forEach(entry => {
    if (entry.type !== 'group') {
      applyMarkVisual(entry);
    }
  });
  
  if (state.currentEditId === id) closeInspector();
  updateToolbarCounts();
}
```

**修复3：增加元素匹配的安全检查**

```js
const el = entry._el || document.querySelector(entry.selector);
if (!el) {
  console.warn('[HTML Diff Marker] removeMark: element not found for', entry.selector);
  state.markedElements.splice(idx, 1);
  return;
}
```

### 验收手段
1. 创建多个标记（至少3个）
2. 删除中间的标记 → 其他标记的编号徽章正确更新
3. 删除组合标记 → 所有子元素的标记正确移除，其他标记不受影响
4. 页面布局保持正常，没有元素错位或消失

---

## 总结与修复优先级建议

### 按优先级排序

| 优先级 | 问题 | 预估修复难度 | 影响 |
|--------|------|------------|------|
| P0 | #20 自定义字体弹窗按钮无效 | 低 | 弹窗无法关闭，影响字体功能 |
| P0 | #26 滚轮缩放失效 | 低 | 核心交互功能完全失效 |
| P0 | #28 多选元素无组合按钮 | 低 | 多选核心功能缺失 |
| P0 | #29 图片大小提示弹窗无法关闭 | 低 | 大图片无法上传 |
| P0 | #32 删除标记后页面错乱 | 中 | 数据一致性问题 |
| P1 | #6 编辑面板模块重排 | 中 | UI 体验优化 |
| P1 | #31 背景图片不跟随缩放 | 低 | 图片显示异常 |
| P2 | #30 快捷键提示文案 | 低 | 用户指引优化 |

### 建议修复顺序

1. **先修 #20（弹窗按钮）** — 修复简单，影响多个功能（字体、图片）
2. **再修 #29（图片弹窗）** — 与 #20 同根因，修复 #20 后自动解决
3. **再修 #26（滚轮缩放 passive）** — 只需改 addEventListener 参数
4. **再修 #28（多选工具栏）** — 定位改为 fixed + 补充类名排除
5. **再修 #32（删除标记索引问题）** — 反向遍历 + 重新渲染徽章
6. **再修 #31（背景图片缩放）** — 设置 backgroundSize 属性
7. **再修 #6（编辑面板重排）** — 调整模块添加顺序
8. **最后修 #30（快捷键提示）** — 调整文案和符号

---

**报告结束**