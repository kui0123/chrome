# HTML 排版插件 BugReport (v1.5 第二轮测试 - 修正版)

**报告生成时间**: 2026-07-07
**排查范围**: content/content.js, content/content.css, background/background.js, manifest.json
**排查人**: Hugo
**对应版本**: v1.5.0
**修订说明**: 针对 #22 和 #26 两个 P0 问题重新进行根因分析，补充代码验证结论

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
| `getMultiSelectBounds()` | content.js:827-839 | 计算多选区域边界 |

---

### 根因分析（修订版）

#### 关键验证点 1：toggleMultiSelect 是否调用 updateMultiSelectToolbar

**验证结论：已调用，函数调用链完整。**

**代码证据**（content.js:766-777）：
```js
function toggleMultiSelect(el) {
  if (!el) return;
  const idx = state.multiSelectedEls.indexOf(el);
  if (idx >= 0) {
    state.multiSelectedEls.splice(idx, 1);
    el.classList.remove('html-diff-marker-multi-selected');
  } else {
    state.multiSelectedEls.push(el);
    el.classList.add('html-diff-marker-multi-selected');
  }
  updateMultiSelectToolbar();  // ← 第776行：明确调用
}
```

**排除假设**：「函数调用遗漏」假设不成立。`toggleMultiSelect` 的两个分支（添加/移除）最终都会走到第776行的 `updateMultiSelectToolbar()` 调用。紫色高亮生效也从侧面证明函数被正确执行。

---

#### 根因 1（高概率，主因）：工具栏定位方式脆弱，易受页面环境影响而不可见

既然函数调用链完整，工具栏 DOM 一定被创建了，但用户看不到。问题出在**定位与可见性**上。

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

**问题机制分析**:

1. **`position: absolute` + `document.body` 子节点的定位上下文风险**
   - 工具栏通过 `document.body.appendChild(bar)` 添加到 body 末尾（第867行）
   - 使用 `position: absolute` 定位
   - 绝对定位元素的 containing block 是「最近的非 static 定位祖先」
   - 如果 body 或 html 设置了 `position: relative/absolute/fixed/sticky`，定位基准会偏移
   - 如果祖先有 `overflow: hidden`，工具栏可能被裁剪

2. **`bounds.top - 36` 可能将工具栏推出视口外**
   - `getMultiSelectBounds()` 返回文档坐标系（加了 `window.scrollY`，第837行）
   - 当选中元素靠近视口顶部时，`bounds.top - 36` 可能计算出负值或接近 0 的值
   - 用户向下滚动后选择顶部元素时，工具栏会出现在视口上方（不可见区域）
   - 多元素选区分散时，`minTop` 可能对应一个不在当前视口中的元素顶部

3. **坐标系统不一致的潜在问题**
   - `getBoundingClientRect()` 返回视口坐标系
   - 加上 `window.scrollX/scrollY` 转为文档坐标系
   - 但 `position: absolute` 的元素如果其 containing block 不是初始包含块（ICB），坐标基准会不同
   - 这导致：在不同页面布局下，工具栏位置可能完全错乱

---

#### 根因 2（中概率）：onClick 捕获阶段拦截导致工具栏按钮点击失效

**这是一个独立但相关的 Bug**：即使工具栏可见，用户点击「组合标记」按钮也无法触发动作。

**关键代码**（content.js:705-713）：
```js
function onClick(e) {
  if (!state.isSelecting) return;
  if (e.target.closest('.html-diff-marker-toolbar') || e.target.closest('.html-diff-marker-inspector')) return;
  e.preventDefault(); e.stopPropagation();
  const el = e.target;
  el.classList.remove('html-diff-marker-highlight-hover');
  toggleMultiSelect(el);
}
```

**问题机制**:
1. `onClick` 注册在 `document` 上，**捕获阶段**（第891行：`document.addEventListener('click', onClick, true)`）
2. 它检查的排除类是 `.html-diff-marker-toolbar`（主工具栏），但**多选工具栏的类名是 `.html-diff-marker-multi-toolbar`**
3. 当用户点击多选工具栏上的「组合标记」按钮时：
   - 捕获阶段先到达 document 的 onClick
   - `e.target.closest('.html-diff-marker-toolbar')` 返回 `null`（类名不匹配）
   - `e.stopPropagation()` 被调用，事件停止向下传播
   - `toggleMultiSelect(buttonElement)` 被调用——按钮被加入多选列表！
   - 按钮自身的 `click` 监听器永远不会触发
4. 结果：点击按钮反而把按钮加入多选，组合标记功能完全无法触发

**代码验证**：搜索 `html-diff-marker-toolbar` 共 9 处（第2049行等），但多选工具栏使用的类名是 `html-diff-marker-multi-toolbar`（第843行），两者完全不同。`onClick` 的排除判断中**没有包含多选工具栏的类名**。

---

#### 根因 3：多选状态下元素不能编辑——设计缺失

多选状态下，元素只是添加了 `html-diff-marker-multi-selected` 类名，但：
- 元素没有被真正标记（不在 `state.markedElements` 中）
- 没有编号徽章、没有删除角标、没有拖拽/缩放功能
- 这是设计上的问题：多选只是"预选"状态，创建组合标记后才是正式标记

---

### 可能性猜测（按概率排序，修订版）

| 排序 | 假设 | 概率 | 验证方式 | 说明 |
|------|------|------|---------|------|
| 1 | 多选浮动工具栏因定位问题不可见 | 高 | DevTools 搜索 `.html-diff-marker-multi-toolbar` 元素，检查其 computed style 和实际位置 | position:absolute 在复杂页面中易受父元素影响，且可能被推出视口 |
| 2 | 工具栏可见但按钮点击无效（onClick 类名不匹配） | 高 | 在工具栏按钮上打断点，或在 onClick 中加日志观察 e.target | 捕获阶段 stopPropagation 导致按钮自身 handler 不触发 |
| 3 | 多选工具栏被 stacking context 遮挡 | 中 | 检查 z-index 和 stacking context | z-index 虽高（2147483645），但若父元素在低层级 stacking context 中仍可能被挡 |
| 4 | 父元素 overflow:hidden 裁剪了工具栏 | 低 | 向上遍历祖先检查 overflow 属性 | body/html 设置 overflow:hidden 的页面较少见 |

---

### 修复建议（修订版）

**核心修复 1：改用 position: fixed + 视口坐标，保证定位稳健**

```js
// 改 getMultiSelectBounds 返回视口坐标（不加 scrollX/scrollY）
// 或在 updateMultiSelectToolbar 中转换为视口坐标
function updateMultiSelectToolbar() {
  // ...
  const bounds = getMultiSelectBounds();  // 当前返回文档坐标
  if (bounds) {
    // 改用 fixed 定位，使用视口坐标
    bar.style.position = 'fixed';
    bar.style.left = (bounds.left - window.scrollX + bounds.width / 2 - 100) + 'px';
    bar.style.top = (bounds.top - window.scrollY - 36) + 'px';
    // 确保不超出视口顶部
    const viewportTop = 10;
    if (parseFloat(bar.style.top) < viewportTop) {
      bar.style.top = viewportTop + 'px';
    }
    bar.style.zIndex = '2147483645';
  }
}
```

**核心修复 2：在 onClick 排除判断中增加多选工具栏类名**

```js
function onClick(e) {
  if (!state.isSelecting) return;
  // 增加对多选工具栏的排除
  if (e.target.closest('.html-diff-marker-toolbar') || 
      e.target.closest('.html-diff-marker-multi-toolbar') ||  // ← 新增
      e.target.closest('.html-diff-marker-inspector')) return;
  e.preventDefault(); e.stopPropagation();
  // ...
}
```

**永久修复（完整方案）**:
1. 多选浮动工具栏改用 `position: fixed` + 视口坐标系，添加视口边界保护
2. 在 `onClick` 的排除判断中增加 `.html-diff-marker-multi-toolbar` 类名
3. 在主工具栏中也增加「组合标记」按钮（多选状态下显示），作为备用入口
4. 多选工具栏应包含：组合标记、批量删除、取消选择

### 验收手段
1. 进入选择模式，点击 2 个以上元素 → 多选浮动工具栏应正确显示在选区上方且在视口内
2. 工具栏应包含「组合标记」按钮，点击后成功创建组合标记
3. 主工具栏在多选状态下也应显示组合标记入口
4. 复杂页面（多层定位元素、overflow 容器）下工具栏仍可见且可点击
5. 点击多选工具栏的其他按钮（如取消选择）也应正常工作

---

## 问题 #24（P0）- 图片：新增元素添加背景图片看不到预览

（内容同原报告，已通过审查，略）

---

## 问题 #2（P0）- 快捷键：工具栏中快捷键提示有误

（内容同原报告，已通过审查，略）

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
| `enableWheelResize()` | content.js:1609-1639 | 启用滚轮缩放（单元素） |
| `applyMarkVisual()` | content.js:1013 | 调用 enableWheelResize |
| 组合标记 wheel 监听 | content.js:1141-1150 | 组合标记的滚轮缩放 |
| wheel 事件条件判断 | content.js:1624-1625 | 判断是否触发缩放 |

---

### 根因分析（修订版）

#### 关键验证点说明

原报告最高概率假设是"用户操作习惯与代码监听的修饰键不匹配"，但这是纯用户侧假设，缺乏代码证据。经重新审查，**wheel 事件 passive 冲突问题有明确的代码机制支撑，且与用户现象高度吻合**，应提升为最高优先级假设。

---

#### 根因 1（最高概率，主因）：Wheel 事件 passive 监听器冲突导致 preventDefault 失效

**问题机制**:

现代浏览器（Chrome 为主）为了提升滚动性能，对 `wheel` 和 `touch` 类事件引入了 passive listener 机制：
- 当一个事件监听器被标记为 `passive: true` 时，`preventDefault()` 调用会被浏览器忽略
- 页面仍然滚动，开发者无法阻止默认行为

**当前代码**（content.js:1624-1638）：
```js
el.addEventListener('wheel', function(e) {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault(); e.stopPropagation();  // ← 如果是 passive，这行无效！
  const factor = e.deltaY > 0 ? 0.98 : 1.02;
  let newScale = entry._scale * factor;
  // ... 缩放逻辑
}, true);  // ← 第三个参数 true 表示 capture 阶段，但未显式指定 passive
```

**问题核心**:
1. 第三个参数 `true` 只指定了 `capture: true`，没有显式指定 `passive`
2. 在 Chrome 中，对于 `wheel` 事件，某些场景下 passive 默认为 `true`
3. 如果 `preventDefault()` 被忽略，页面正常滚动，但**缩放逻辑仍然执行**
4. 用户看到的现象：页面在滚动，元素似乎没有缩放——实际上缩放可能正在发生，但被滚动动作干扰，用户感知为"失效"

**与用户报告的吻合度**:
- 用户说"滚轮缩放失效"——如果页面同时在滚动，用户很难注意到元素在缩放
- "Shift + 触控面板可以缩放"——触控板手势触发的 wheel 事件特性与鼠标滚轮不同（deltaMode、事件频率等），可能绕过 passive 限制

**代码层面的被动证据**:
- 代码调用了 `e.preventDefault()`，说明开发者预期能阻止页面滚动
- 如果 preventDefault 生效，滚轮缩放时页面应该保持静止，缩放效果清晰可见
- 用户报告"失效"暗示页面在滚动（否则用户会看到元素在缩放，只是伴随滚动）

**组合标记同样的问题**（content.js:1141-1150）：
```js
groupEl.addEventListener('wheel', function(e) {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault(); e.stopPropagation();
  // ...
}, true);  // 同样未显式指定 passive: false
```

---

#### 根因 2（中概率）：修饰键检测与用户实际操作不匹配

**用户描述分析**:
用户说"仅能通过 shift+触控面板可以缩放"，这里有两种解读：

**解读 A：用户误记了修饰键**
- Mac 触控板双指捏合手势在 Chrome 中生成的 wheel 事件带有 `ctrlKey: true`（系统级行为）
- 用户可能把"双指捏合"当成了"Shift + 触控板"
- 如果是这样，说明 `ctrlKey` 检测是有效的（触控板缩放手势正常工作）
- 问题就集中在：为什么鼠标滚轮 + Ctrl 不行？→ 指向 passive 问题或浏览器级别的 Ctrl+滚轮拦截

**解读 B：用户确实按了 Shift 且能缩放**
- 如果 Shift + 触控板滚动可以缩放，那代码的修饰键判断有问题（因为代码检测的是 ctrlKey/metaKey，不是 shiftKey）
- 但这与代码逻辑矛盾，除非...用户按下的实际上是 Ctrl，但系统显示/用户感知为 Shift
- 或者，触控板驱动将 Shift + 手势映射为带 ctrlKey 的 wheel 事件

**当前代码的修饰键逻辑**:
```js
if (!e.ctrlKey && !e.metaKey) return;  // Ctrl 或 Cmd 任一按下才继续
```

这个逻辑本身是正确的，问题可能在于：
- 鼠标滚轮 + Ctrl 的场景下，事件可能被浏览器用于页面缩放，未正常派发
- 或事件派发了但 passive 导致 preventDefault 失效，用户感知为不工作

---

#### 根因 3（低概率）：浏览器级 Ctrl+滚轮 用于页面缩放，事件被拦截

某些浏览器/操作系统中，Ctrl + 鼠标滚轮被用于**整页缩放**（浏览器级功能），可能在事件派发到页面之前就被浏览器消费了。

但这与「触控板缩放正常」不矛盾——因为触控板捏合手势是另一条事件路径。

---

#### 根因 4（低概率）：enableWheelResize 未被正确调用

`applyMarkVisual` 第1013行明确调用了 `enableWheelResize(entry)`，且有 `entry._wheelEnabled` 标志防止重复注册。除非 `applyMarkVisual` 本身未被调用，否则此路径不太可能出问题。

---

### 可能性猜测（按概率排序，修订版）

| 排序 | 假设 | 概率 | 代码/现象证据 | 验证方式 |
|------|------|------|-------------|---------|
| 1 | wheel 事件 passive 冲突导致 preventDefault 失效，页面滚动干扰了缩放感知 | 高 | 代码调用 preventDefault() 但未显式 passive: false；用户描述"失效"暗示伴随滚动 | 在 handler 中 log e.cancelable 和 e.defaultPrevented |
| 2 | 修饰键匹配问题（鼠标滚轮 Ctrl 与触控板手势的事件特性不同） | 中 | 代码检测 ctrlKey/metaKey；触控板 pinch 手势确实设置 ctrlKey=true | log e.ctrlKey/e.metaKey/e.shiftKey，对比鼠标滚轮与触控板 |
| 3 | 浏览器级 Ctrl+滚轮 被用于页面缩放，事件未派发 | 低 | 与系统/浏览器设置相关 | 在不同浏览器测试，或检查 chrome://settings 中的缩放设置 |
| 4 | enableWheelResize 未调用 | 低 | applyMarkVisual 中明确调用 | 在函数入口加日志 |

---

### 修复建议（修订版）

**诊断步骤（必须先做）**:
1. 在 `enableWheelResize` 开头加 `console.log('[WheelResize] enabled for', entry.selector)` 确认是否被调用
2. 在 wheel handler 开头加日志：
   ```js
   console.log('[WheelEvent]', {
     ctrlKey: e.ctrlKey,
     metaKey: e.metaKey,
     shiftKey: e.shiftKey,
     deltaY: e.deltaY,
     deltaMode: e.deltaMode,
     cancelable: e.cancelable,
     defaultPrevented: e.defaultPrevented,
     type: e.type
   });
   ```
3. 在 `e.preventDefault()` 后立即 log `e.defaultPrevented` 确认是否生效

**核心修复 1：显式声明 passive: false，确保 preventDefault 生效**

```js
// 将第三个参数从 true 改为 options 对象
el.addEventListener('wheel', function(e) {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  e.stopPropagation();
  // ... 原有缩放逻辑
}, { capture: true, passive: false });  // ← 显式指定 passive: false
```

同样修改组合标记的 wheel 监听器（第1141行）。

**核心修复 2：增加修饰键支持，降低用户操作门槛**

考虑到用户可能习惯用 Shift 或不加修饰键，提供更灵活的触发方式：
- 方案 A：增加 Shift + 滚轮作为备选缩放方式
- 方案 B：提供设置项，让用户选择缩放的修饰键
- 方案 C：鼠标悬停在元素上时，滚轮直接缩放（无需修饰键），但需谨慎处理与页面滚动的冲突

**修复优先级**:
1. 先修 passive: false → 立竿见影解决 preventDefault 失效
2. 再根据诊断结果决定是否需要调整修饰键逻辑

### 验收手段
1. Ctrl + 鼠标滚轮 → 元素缩放且页面不滚动
2. Cmd + 鼠标滚轮（Mac）→ 元素缩放且页面不滚动
3. 触控板双指缩放（Mac）→ 元素缩放正常
4. 缩放时页面完全静止（preventDefault 生效的标志）
5. 缩放比例合理（每次滚动缩放 2%）
6. `e.cancelable === true` 且调用 preventDefault 后 `e.defaultPrevented === true`

---

## 问题 #4（P1）- 多选元素：拖拽大小同步修改子元素未生效

（内容同原报告，已通过审查，略）

---

## 问题 #25（P2）- 编辑面板-字体：预览不可用提示位置优化

（内容同原报告，已通过审查，略）

---

## 问题 #27（P2）- 字体：添加/选择自定义字体后面板滚动位置重置

（内容同原报告，已通过审查，略）

---

## 总结与修复优先级建议

### 按优先级排序

| 优先级 | 问题 | 预估修复难度 | 影响 |
|--------|------|------------|------|
| P0 | #26 滚轮缩放失效 | 低（先修 passive） | 核心交互功能完全失效 |
| P0 | #22 多选无组合选项 | 低（定位+类名修复） | 多选核心功能缺失 |
| P0 | #24 背景图片预览失败 | 低 | 新增元素无法设置背景图 |
| P0 | #2 快捷键提示错误 | 低 | 用户指引错误 |
| P1 | #4 同步缩放子元素未生效 | 中高 | 功能与描述不符 |
| P2 | #25 字体提示位置 | 极低 | UI 细节优化 |
| P2 | #27 面板滚动位置重置 | 低 | UX 体验优化 |

### 建议修复顺序

1. **先修 #26（滚轮缩放 passive）** — 难度最低，只需改 addEventListener 参数
2. **再修 #22（多选工具栏定位 + 类名）** — 难度低，定位改为 fixed + 补充类名排除
3. **再修 #24（背景图片）** — 难度低，isSimpleBgImageUrl 增加 data URL 判断
4. **再修 #2（快捷键）** — 难度低，统一文案 + 动态判断系统
5. **再修 #25（字体提示位置）** — 难度极低，调整 append 顺序
6. **再修 #4（同步缩放子元素）** — 工作量较大，需实现拖拽时的子元素比例计算
7. **最后修 #27（面板滚动位置）** — UX 优化，可作为收尾

---

**报告结束**
