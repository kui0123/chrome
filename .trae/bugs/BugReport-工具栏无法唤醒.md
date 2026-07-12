# Bug 报告：工具栏无法唤醒

## 问题描述

**故障现象**：点击浏览器扩展图标或使用快捷键 `Alt+E` / `⌥+E` 时，工具栏完全无响应，无法唤醒。

**影响范围**：核心功能完全不可用，用户无法使用扩展的任何功能（选择元素、编辑样式、导出 diff 等）。

**复现路径**：
1. 安装扩展到 Chrome 浏览器
2. 打开任意网页
3. 点击浏览器工具栏中的扩展图标 → 无任何反应
4. 使用快捷键 `Alt+E`（macOS 为 `⌥+E`）→ 无任何反应

---

## 现场分析

### 环境状态
- 扩展版本：v1.7.0
- Manifest V3
- 涉及文件：
  - `content/content.js` — 核心逻辑（问题所在）
  - `content/content.css` — 样式文件（完整）
  - `background/background.js` — 后台脚本（完整）
  - `manifest.json` — 扩展配置（完整）

### 初步诊断
通过检查各文件的完整性，发现 `content.js` 文件内容严重不完整：

| 文件 | 预期状态 | 实际状态 |
|------|---------|---------|
| `manifest.json` | 正常 | 正常，配置了 `toggle-three-state` 命令和 content_scripts |
| `background.js` | 正常 | 正常，正确发送 `TOGGLE_WAKE` 消息 |
| `content.css` | 正常 | 正常，包含完整的工具栏和唤醒按钮样式 |
| `content.js` | **完整功能代码** | **仅包含 openInspector 一个函数** |

---

## 根因分析

### 核心问题：content.js 文件严重缺损

`content/content.js` 文件只有 **636 行**，且整个文件就是一个 `openInspector(id)` 函数。文件第一行直接是：

```javascript
function openInspector(id) {
```

**缺少的核心模块（全部丢失）**：

#### 1. 全局状态管理
- `state` 对象 — 包含 `toolbarState`、`markedElements`、`inspectorPos`、`inspectorSize`、`currentEditId` 等
- `STYLE_PROPS` 常量 — 样式属性配置数组

#### 2. 消息监听机制
- **`chrome.runtime.onMessage.addListener`** — 完全缺失
  - 无法接收 `TOGGLE_WAKE`（三态切换）消息
  - 无法接收 `TOGGLE_SELECT`（切换选择模式）消息
  - 无法接收 `EXPORT_NOW`（导出 diff）消息
  - 无法接收 `CLEAR_ALL`（清除所有标记）消息

#### 3. 工具栏相关逻辑
- `createToolbar()` — 工具栏 DOM 创建函数
- `showToolbar()` — 显示工具栏
- `hideToolbar()` — 隐藏工具栏
- `createWakeButton()` — 唤醒按钮创建函数
- `showWakeButton()` — 显示唤醒按钮
- `hideWakeButton()` — 隐藏唤醒按钮
- 三态切换状态机：`hidden → wake → active`

#### 4. 被引用但未定义的函数
`openInspector` 函数内部引用了以下函数/变量，但它们在文件中完全不存在：

| 引用 | 位置（行号） | 说明 |
|------|-------------|------|
| `state.inspectorPos` | 2 | 全局状态对象 |
| `closeInspector()` | 3, 37, 558 | 关闭检查面板 |
| `state.markedElements` | 4 | 已标记元素列表 |
| `recordOriginalStyles(entry)` | 6 | 记录原始样式 |
| `state.currentEditId` | 7 | 当前编辑 ID |
| `saveState()` | 72, 94, 117, 158, 452, 483, 528, 556 | 保存状态到 storage |
| `hasStyleChanges(entry)` | 116 | 判断是否有样式变更 |
| `STYLE_PROPS` | 189 | 样式属性配置数组 |
| `applyStyleChange()` | 182, 216, 224, 246, 259, 272, 284, 319, 320, 337, 350, 377, 378, 406, 419 | 应用样式变更 |
| `createSlider()` | 329, 342, 398, 411 | 创建滑块组件 |
| `escapeHtml()` | 493 | HTML 转义 |
| `elementInfo()` | 535 | 获取元素信息 |
| `removeMark()` | 548 | 删除标记 |
| `applyMarkVisual()` | 557 | 应用标记视觉 |
| `state.inspectorEl` | 608 | 面板 DOM 引用 |
| `state.inspectorSize` | 602, 623 | 面板尺寸 |
| `makeDraggable()` | 631 | 使元素可拖拽 |

**总计缺失**：至少 15+ 个核心函数和多个全局变量。

---

## 可能性猜测

按概率排序：

1. **文件误删除/截断（高概率）**：在某次代码编辑或版本操作中，`content.js` 文件的前面部分被意外删除，只保留了最后的 `openInspector` 函数。

2. **合并冲突未正确解决（中概率）**：Git 合并时发生冲突，解决冲突时误删了大部分代码。

3. **错误的文件保存（中概率）**：编辑器故障或误操作，导致文件只保存了部分内容。

4. **剪切粘贴失误（低概率）**：重构代码时的剪切粘贴操作失误。

---

## 逐步排障记录

### 步骤 1：检查 manifest 配置
- 确认 `content_scripts` 正确配置了 `content.js` 和 `content.css`
- 确认 `commands` 中定义了 `toggle-three-state` 命令
- 结论：manifest 配置正常

### 步骤 2：检查 background.js
- 确认 `chrome.action.onClicked` 正确发送 `TOGGLE_WAKE` 消息
- 确认 `chrome.commands.onCommand` 正确监听并转发 `TOGGLE_WAKE` 消息
- 结论：background.js 逻辑正常，消息发送链路正常

### 步骤 3：检查 content.css
- 搜索 toolbar、wake 等样式类
- 确认 `.html-diff-marker-toolbar` 和 `.html-diff-marker-wake-btn` 样式完整
- 结论：CSS 样式完整，设计正常

### 步骤 4：检查 content.js
- 发现文件只有 636 行，第一行直接是 `function openInspector(id) {`
- 搜索 `chrome.runtime.onMessage` — 未找到
- 搜索 `TOGGLE_WAKE` — 未找到
- 搜索 `createToolbar` — 未找到
- 搜索 `state` 变量定义 — 未找到
- 结论：content.js 文件内容严重缺失，是问题根因

### 步骤 5：验证缺失函数
- 在 `openInspector` 函数内统计引用的外部函数/变量
- 发现 15+ 个未定义的函数和变量
- 结论：即使面板能打开，也会因为缺少依赖而无法工作

---

## 解决方案

### 临时止血方案
无。核心代码丢失，无法通过简单配置修复。

### 永久修复方案
需要完整重写或从版本历史中恢复 `content.js` 的完整代码。需要恢复/实现以下模块：

#### 必须恢复的核心模块：

1. **全局状态管理**
   ```javascript
   const state = {
     toolbarState: 'hidden', // hidden | wake | active
     markedElements: [],
     currentEditId: null,
     inspectorEl: null,
     inspectorPos: null,
     inspectorSize: null,
     // ... 其他状态
   };
   ```

2. **消息监听器**
   ```javascript
   chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
     if (msg.type === 'TOGGLE_WAKE') {
       toggleThreeState();
       sendResponse({ ok: true });
     } else if (msg.type === 'TOGGLE_SELECT') {
       toggleSelectMode();
       sendResponse({ ok: true });
     }
     // ... 其他消息
     return true;
   });
   ```

3. **三态切换逻辑**
   - `toggleThreeState()` — 循环切换 hidden → wake → active → hidden
   - `createWakeButton()` — 创建唤醒按钮
   - `showWakeButton()` / `hideWakeButton()`
   - `createToolbar()` — 创建完整工具栏
   - `showToolbar()` / `hideToolbar()`

4. **基础工具函数**
   - `saveState()` / `loadState()` — 状态持久化
   - `closeInspector()` — 关闭检查面板
   - `makeDraggable()` — 拖拽功能
   - `applyStyleChange()` — 应用样式变更
   - `recordOriginalStyles()` — 记录原始样式
   - `createSlider()` — 滑块组件
   - `escapeHtml()` — HTML 转义
   - `elementInfo()` — 元素信息
   - `removeMark()` — 删除标记
   - `applyMarkVisual()` — 应用标记视觉
   - `hasStyleChanges()` — 判断样式变更
   - `toggleSelectMode()` — 切换选择模式

5. **初始化代码**
   - DOMContentLoaded 或 IIFE 包裹
   - 初始加载状态

#### 修复步骤：
1. 从 Git 历史中查找最近的完整版本的 `content.js`
2. 如果无法恢复，根据 CSS 类名和 manifest 配置重新实现完整逻辑
3. 确保所有 `openInspector` 引用的函数都有定义
4. 测试三态切换、元素选择、样式编辑、导出等功能

---

## 验收手段

1. **基础唤醒测试**
   - [ ] 点击扩展图标 → 显示唤醒按钮
   - [ ] 再次点击 → 显示完整工具栏
   - [ ] 再次点击 → 隐藏所有界面
   - [ ] 快捷键 `Alt+E` / `⌥+E` 三态切换正常

2. **功能完整性测试**
   - [ ] 工具栏中"开始选择"按钮正常工作
   - [ ] 点击元素后可以打开检查面板（openInspector）
   - [ ] 检查面板中的所有功能（样式编辑、大小调整、HTML编辑等）正常
   - [ ] 导出 Diff 文件功能正常
   - [ ] 清除所有标记功能正常

3. **状态持久化测试**
   - [ ] 刷新页面后标记内容保留
   - [ ] 工具栏位置/大小保留
