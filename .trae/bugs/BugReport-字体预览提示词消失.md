# BugReport - 编辑面板字体预览提示词消失/位置错误

## 问题描述

- **现象**: 编辑面板中字体预览不成功的提示词不显示了（或位置不对）
- **预期**: 当字体预览不成功时，提示应该显示在字体选项框的下方
- **实际**: 提示词位置在字体选项框的上方，且用户反馈"消失了"
- **影响范围**: 编辑面板-字体选项区域，UI/UX 体验问题
- **发生时间**: 近期修复后出现（v1.5 版本模块重构期间）

---

## 严重程度

**P2（主要）** - 次要功能异常，UI 体验问题，不影响核心功能，但用户无法正确获取字体预览状态的反馈。

---

## 现场分析

### 当前 DOM 结构

```
row (.html-diff-marker-style-row)
├── lab (.html-diff-marker-style-label)      "字体"
├── hintRow (.html-diff-marker-font-hint)    ⚠ 预览不可用提示  ← 在上方（错误位置）
└── inpWrap (.html-diff-marker-style-input-wrap, flex)
    ├── sel (.html-diff-marker-style-input)   下拉选择框
    ├── addFontBtn (+ 按钮)                   添加自定义字体
    └── resetBtn (R 按钮)                     重置
```

### 预期 DOM 结构

```
row (.html-diff-marker-style-row)
├── lab (.html-diff-marker-style-label)      "字体"
└── inpWrap (.html-diff-marker-style-input-wrap, flex)
    ├── sel (.html-diff-marker-style-input)   下拉选择框
    ├── addFontBtn (+ 按钮)                   添加自定义字体
    └── resetBtn (R 按钮)                     重置
    ↓（下方）
└── hintRow (.html-diff-marker-font-hint)    ⚠ 预览不可用提示  ← 在下方（正确位置）
```

### 历史结构（v1.5 之前）

```
row
├── lab
├── inpWrap (包含 select)
└── fontGroup (.html-diff-marker-font-group)
    ├── hintRow     ← 在 fontGroup 内
    ├── addFontBtn
    └── delBtn
```

---

## 日志分析

无运行时日志，基于代码静态分析。

---

## 根因分析

### 根因 1（主因）：重构时 fontGroup 容器被移除，hintRow 放置位置错误

**代码位置**: `content/content.js` 第 2670-2734 行（fontFamily 特殊处理块）

**详细说明**:

在 v1.5 版本的修复中（问题 #6 编辑面板模块重新排序），原有的 `fontGroup` 容器被移除，字体区域的布局进行了重构：
- `addFontBtn` 从 `fontGroup` 移到了 `inpWrap` 中（水平布局，右侧）—— 这部分是正确的
- `hintRow` 从 `fontGroup` 移到了 `row` 中 —— 但放置时机错误

**关键执行顺序**:

1. 第 2612 行：`row.appendChild(lab)` — label 先添加到 row
2. 第 2642-2734 行：进入 `sp.type === 'select'` 分支
   - 第 2668 行：`inpWrap.appendChild(sel)` — select 添加到 inpWrap
   - 第 2670 行：进入 `if (sp.key === 'fontFamily')` 块
     - 第 2689 行：`inpWrap.appendChild(addFontBtn)` — 按钮添加到 inpWrap
     - **第 2696 行：`row.appendChild(hintRow)` — hintRow 添加到 row** ← 此时 row 只有 lab 和 hintRow
3. 第 2826-2835 行：resetBtn 添加到 inpWrap
4. **第 2836 行：`row.appendChild(inpWrap)` — inpWrap 添加到 row** ← 在 hintRow 之后

**结果**: hintRow 比 inpWrap 先添加到 row，因此在视觉上出现在字体选项框的**上方**，而不是预期的**下方**。

### 根因 2（辅因）：用户感知为"消失"

用户习惯了在字体选项框**下方**寻找预览提示，当提示跑到**上方**后，用户在原位置找不到，误以为提示"消失了"。

### 根因 3（潜在）：提示隐藏条件的触发

`updateFontHint()` 函数逻辑：
- 如果字体预览失败 → 显示"预览不可用"提示
- 否则如果没有自定义字体 → 显示"暂无自定义字体"提示
- 否则 → 隐藏提示

如果用户有自定义字体且当前字体可用，提示会正常隐藏。这是预期行为，但可能与"消失"的感知混淆。

---

## 逐步排障记录

| 步骤 | 操作 | 观测结果 | 假设验证 |
|------|------|---------|---------|
| 1 | 搜索"字体"、"font"、"hint"、"提示"等关键词 | 定位到 content.js 第 2691-2715 行的字体提示代码 | 确认提示相关代码存在 |
| 2 | 检查 hintRow 的 DOM 父元素 | hintRow 被 append 到 row，而非 inpWrap | 发现位置异常 |
| 3 | 检查 inpWrap 的 append 时机 | inpWrap 在 forEach 循环末尾（第2836行）才添加到 row | 确认执行顺序问题 |
| 4 | 搜索 fontGroup 相关代码 | JS 中已无 fontGroup，CSS 中仍有相关样式 | 证实 fontGroup 被移除 |
| 5 | 查阅历史 BugReport | v1.5-final.md 记录了 #25（提示位置优化）和 #6（模块重新排序） | 确认是重构引入的问题 |
| 6 | 检查 updateFontHint 逻辑 | 逻辑本身正确，能正确设置 display | 排除函数逻辑问题 |
| 7 | 检查 CSS 样式 | .html-diff-marker-font-hint 样式完整，无 display:none 覆盖 | 排除 CSS 隐藏问题 |

---

## 修复建议

### 方案一（推荐）：调整 append 顺序，将 hintRow 移到 inpWrap 之后

**思路**: 保持当前结构（不恢复 fontGroup），只需调整 hintRow 的添加时机，确保它在 inpWrap 之后被添加到 row 中。

**修改点**:
- 将 `row.appendChild(hintRow)` 从 `if (sp.key === 'fontFamily')` 块内移到 `row.appendChild(inpWrap)` 之后
- 或者在 forEach 循环末尾判断 `sp.key === 'fontFamily'` 再追加 hintRow

**优点**: 改动小，保持现有结构
**缺点**: hintRow 和 delBtn 都散落在 row 中，结构不够清晰

### 方案二：恢复 fontGroup 容器

**思路**: 恢复 `fontGroup` 容器，将 hintRow、addFontBtn（从 inpWrap 移出）、delBtn 都放在 fontGroup 中，fontGroup 放在 inpWrap 之后。

**修改点**:
- 恢复 `var fontGroup = document.createElement('div'); fontGroup.className = 'html-diff-marker-font-group';`
- 将 addFontBtn 从 inpWrap 移回 fontGroup
- hintRow 放在 addFontBtn 之后（确保在下方）
- delBtn 放在 fontGroup 中
- `row.appendChild(fontGroup)` 放在 `row.appendChild(inpWrap)` 之后

**优点**: 结构清晰，CSS 样式已有对应定义
**缺点**: 改动较大，addFontBtn 位置会从"下拉框右侧"变回"下拉框下方"，可能不符合 #6 的设计

### 方案三（折中）：hintRow 放入 inpWrap 但独占一行

**思路**: 保持 addFontBtn 在 inpWrap 右侧，将 hintRow 也放入 inpWrap，但设置 `width: 100%` 使其换行到下一行。

**修改点**:
- 将 hintRow append 到 inpWrap 而非 row
- 设置 hintRow 样式：`width: 100%; flex-basis: 100%;` 确保换行

**优点**: hintRow 和字体控件在同一容器内，结构合理
**缺点**: 需要修改 flex 布局，可能影响其他样式属性

### 推荐方案：方案一

理由：
1. 改动最小，风险最低
2. 保持 addFontBtn 在下拉框右侧的设计（符合 #6 修复目标）
3. 只需调整 DOM 添加顺序，不涉及布局大改

---

## 验收手段

### 功能验证

1. **初始状态（无自定义字体）**:
   - 打开编辑面板 → 滚动到字体选项
   - 预期：显示"暂无自定义字体，点击右侧 + 按钮添加。"提示
   - 提示位置：字体下拉框的**正下方**

2. **选择不可用字体**:
   - 添加一个系统中不存在的自定义字体（如"不存在的字体"）
   - 在下拉框中选择该字体
   - 预期：显示"⚠ 当前预览不可用，Diff 中可以保存选项字体，AI 将依照选项修改。"提示
   - 提示位置：字体下拉框的**正下方**

3. **选择可用字体**:
   - 在下拉框中选择一个系统存在的字体（如"Arial"或"sans-serif"）
   - 预期：提示隐藏
   - 如果有自定义字体，则不显示任何提示

4. **选择默认字体**:
   - 选择"(默认字体)"选项
   - 预期：如果有自定义字体，提示隐藏；如果没有，显示"暂无自定义字体"提示

### 布局验证

1. 提示文字在字体选项框（含 + 按钮）的正下方，左对齐
2. 提示与下拉框之间有适当间距（6px 左右）
3. 提示背景色为浅黄色，边框为浅橙色，文字为深棕色
4. 删除自定义字体按钮（如有）在提示的下方

### 回归测试

1. 添加自定义字体功能正常
2. 删除自定义字体功能正常
3. 字体选择后页面元素实时更新
4. 其他样式属性（颜色、大小等）的布局不受影响

---

## 关联信息

- **关联问题**: #25（字体提示位置优化）、#6（编辑面板模块重新排序）
- **关联文件**: 
  - `content/content.js` 第 2670-2734 行（字体特殊处理块）
  - `content/content.js` 第 2836 行（inpWrap append 位置）
  - `content/content.css` 第 551-562 行（.html-diff-marker-font-hint）
  - `content/content.css` 第 600-610 行（.html-diff-marker-font-group，当前未使用）
- **历史报告**: `.trae/bugs/BugReport-v1.5-final.md`、`.trae/bugs/BugReport-v1.5-第二轮测试.md`

---

**报告生成时间**: 2026-07-08
**报告人**: hugo
**状态**: 待修复
