# Bug Report：清除确认、删除确认弹窗样式问题

## 问题描述

清除确认、删除确认弹窗存在两个 UI 问题：
1. **弹窗顶部显示了不应有的"x"关闭按钮** - 按照设计规范，confirm 类型弹窗不应有关闭按钮，用户必须明确选择"确认"或"取消"
2. **取消和确认按钮挤在一起** - 按钮样式不正确，视觉上显得拥挤

## 现场分析

### 对比演示文件设计规范

参考文件：`dev/pages/ui-preview-v5.2-showcase.html`（第1657-1735行）

演示文件中的模态弹窗设计规范：
- **无关闭按钮**：`.hdm-modal-header` 仅包含标题，没有关闭按钮
- **按钮分离清晰**：`.hdm-modal-btn.cancel`（白底灰边）和 `.hdm-modal-btn.confirm`（渐变背景），间距合理

### 当前实际实现分析

#### 问题1：关闭按钮

**位置**：`extension/content/content.js` 第2583-2589行

```javascript
// 当前代码：所有弹窗类型都添加了关闭按钮
const closeBtn = document.createElement('button');
closeBtn.className = 'html-diff-marker-modal-header-close';
insertSvgIcon(closeBtn, SVG_ICONS.close);
closeBtn.addEventListener('click', function() {
  closeModal(overlay, null, onCancel);
}, true);
header.appendChild(closeBtn);  // 无条件添加
```

**根因**：代码没有区分弹窗类型，不管是 alert、confirm 还是 prompt，都统一添加了关闭按钮。

#### 问题2：按钮挤在一起

**位置**：`extension/content/content.js` 第2633-2650行

```javascript
// 当前代码：按钮同时使用了通用按钮类和弹窗按钮类
const cancelBtn = document.createElement('button');
cancelBtn.className = 'html-diff-marker-btn html-diff-marker-btn--secondary html-diff-marker-modal-btn html-diff-marker-modal-btn-cancel';

const confirmBtn = document.createElement('button');
confirmBtn.className = 'html-diff-marker-btn html-diff-marker-btn--primary html-diff-marker-modal-btn html-diff-marker-modal-btn-confirm';
```

**根因**：按钮同时应用了通用按钮样式（`.html-diff-marker-btn--secondary`）和弹窗专用样式（`.html-diff-marker-modal-btn-cancel`），导致样式冲突。

CSS 中的弹窗按钮专用样式（`extension/content/content.css` 第3283-3324行）：
- `.html-diff-marker-modal-btn-cancel`：白底、灰色文字、灰色边框
- `.html-diff-marker-modal-btn-confirm`：渐变背景、白色文字

但由于同时应用了 `.html-diff-marker-btn--secondary`，可能导致样式覆盖和冲突。

## 逐步排障记录

1. **确认问题现象**：对比演示文件与实际弹窗的 HTML 结构和 CSS 样式
2. **定位关闭按钮代码**：在 `showModal` 函数中发现无条件创建关闭按钮的逻辑
3. **定位按钮样式问题**：发现按钮类名同时包含通用按钮和弹窗专用类
4. **验证 CSS 样式**：确认弹窗专用样式存在且正确，但被通用样式干扰

## 解决方案

### 修复方案1：移除 confirm/prompt 类型弹窗的关闭按钮

修改 `extension/content/content.js`，仅在 alert 类型时创建关闭按钮：

```javascript
// 修改前（第2583-2589行）：
const closeBtn = document.createElement('button');
closeBtn.className = 'html-diff-marker-modal-header-close';
insertSvgIcon(closeBtn, SVG_ICONS.close);
closeBtn.addEventListener('click', function() {
  closeModal(overlay, null, onCancel);
}, true);
header.appendChild(closeBtn);

// 修改后：
// 仅 alert 类型弹窗显示关闭按钮，confirm/prompt 必须明确选择
if (type === 'alert') {
  const closeBtn = document.createElement('button');
  closeBtn.className = 'html-diff-marker-modal-header-close';
  insertSvgIcon(closeBtn, SVG_ICONS.close);
  closeBtn.addEventListener('click', function() {
    closeModal(overlay, null, onCancel);
  }, true);
  header.appendChild(closeBtn);
}
```

### 修复方案2：修正按钮类名，仅使用弹窗专用样式

修改 `extension/content/content.js`，移除通用按钮类名：

```javascript
// 修改前（第2635行）：
cancelBtn.className = 'html-diff-marker-btn html-diff-marker-btn--secondary html-diff-marker-modal-btn html-diff-marker-modal-btn-cancel';

// 修改后：
cancelBtn.className = 'html-diff-marker-modal-btn html-diff-marker-modal-btn-cancel';

// 修改前（第2644行）：
confirmBtn.className = 'html-diff-marker-btn html-diff-marker-btn--primary html-diff-marker-modal-btn html-diff-marker-modal-btn-confirm';

// 修改后：
confirmBtn.className = 'html-diff-marker-modal-btn html-diff-marker-modal-btn-confirm';
```

## 验收手段

1. **清除确认弹窗**：触发清除确认操作，验证弹窗无关闭按钮，取消和确认按钮样式清晰分离
2. **删除确认弹窗**：触发删除确认操作，验证弹窗无关闭按钮，取消和确认按钮样式清晰分离
3. **普通 alert 弹窗**：验证 alert 类型弹窗仍保留关闭按钮功能

## 涉及文件

- `extension/content/content.js`：弹窗 HTML 创建逻辑（第2555-2680行）
- `extension/content/content.css`：弹窗样式定义（第3080-3324行）
- `dev/pages/ui-preview-v5.2-showcase.html`：设计规范参考（第1657-1735行）
