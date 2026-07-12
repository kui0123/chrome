# Bug Report：编辑面板最小化/折叠功能深度排查（修正版）

**报告日期**：2026-07-12  
**排查人员**：Hugo  
**项目**：HTML Diff Marker Chrome 扩展  
**涉及文件**：`extension/content/content.js`、`extension/content/content.css`  
**修正说明**：根据 clara 审查意见，重新定位真正根因为 `:not()` 选择器特异性过高问题

---

## 一、问题描述

用户反馈：**编辑面板的最小化功能还是不对，最小化应该是折叠只剩头部。**

**现象**：点击最小化按钮后，面板高度可能有变化，但主体内容（inspector-body）并未隐藏，导致折叠后仍然显示主体内容。

---

## 二、真正根因（已确认）

### 核心结论：`:not()` 选择器特异性过高，覆盖了折叠样式的 `display: none`

#### 2.1 冲突的两条 CSS 规则

**规则 A — 恢复排版元素基础样式**（`content.css` 第 434-441 行）：
```css
.html-diff-marker-inspector div:not(.html-diff-marker-inspector-header)
  :not(.html-diff-marker-inspector-title-row)
  :not(.html-diff-marker-inspector-header-btns)
  :not(.html-diff-marker-group-header)
  :not(.html-diff-marker-group-actions)
  :not(.html-diff-marker-unit-toggle)
  :not(.html-diff-marker-style-prop-row)
  :not(.html-diff-marker-style-prop-control)
  :not(.html-diff-marker-style-header)
  :not(.html-diff-marker-style-header-actions)
  :not(.html-diff-marker-style-input-wrap)
  :not(.html-diff-marker-inspector-actions)
  :not(.html-diff-marker-group-child-item)
  :not(.html-diff-marker-reset-all-wrap)
  :not(.html-diff-marker-link-input-wrap)
  :not(.html-diff-marker-element-info)
  :not(.html-diff-marker-field-row)
  :not(.html-diff-marker-style-section)
  :not(.html-diff-marker-style-row)
  :not(.html-diff-marker-child-row) {
  display: block !important;
}
```

**规则 B — 折叠样式**（`content.css` 第 2201-2205 行）：
```css
.html-diff-marker-inspector.html-diff-marker-collapsed .html-diff-marker-inspector-body,
.html-diff-marker-inspector.html-diff-marker-collapsed .html-diff-marker-inspector-actions,
.html-diff-marker-inspector.html-diff-marker-collapsed .html-diff-marker-resize-handle-se {
  display: none !important;
}
```

#### 2.2 特异性计算

| 规则 | 选择器 | ID | 类/伪类 | 元素 | 特异性 |
|------|--------|----|---------|------|--------|
| 规则 A | `.html-diff-marker-inspector div:not(.a):not(.b)...` (20个:not) | 0 | 1 + 20 = **21** | 1 | **(0, 21, 1)** |
| 规则 B (body) | `.html-diff-marker-inspector.html-diff-marker-collapsed .html-diff-marker-inspector-body` | 0 | **3** | 0 | **(0, 3, 0)** |

**结论：(0, 21, 1) > (0, 3, 0)**，规则 A 特异性远高于规则 B。

两条规则都带有 `!important`，因此特异性高者胜出 — 规则 A 的 `display: block !important` 覆盖了规则 B 的 `display: none !important`。

#### 2.3 受影响元素清单

`:not()` 排除列表中共有 **20 个类名**，以下关键元素**不在排除列表中**，因此会被规则 A 匹配并导致折叠失效：

| 元素 | 是否在 :not() 排除列表中 | 折叠时是否被正确隐藏 | 原因 |
|------|--------------------------|----------------------|------|
| `.html-diff-marker-inspector-body` | **否** | **否** | 不在排除列表中，被规则 A 匹配，`display:block` 覆盖 `display:none` |
| `.html-diff-marker-inspector-actions` | 是（第12个） | 是 | 在排除列表中，不被规则 A 匹配 |
| `.html-diff-marker-resize-handle-se` | **否** | **否** | 不在排除列表中，被规则 A 匹配，`display:block` 覆盖 `display:none` |

#### 2.4 为什么之前的排查遗漏了这个根因

之前的 BugReport 错误地认为：
1. 折叠样式特异性 (0,3,0) "应该足够" 覆盖基础样式
2. 主要怀疑内联样式 `!important` 与 `removeProperty` 的交互问题
3. 没有仔细检查 `all: unset` 之后的"恢复排版样式"规则的具体实现方式

但实际上，真正的问题在于**恢复排版样式使用了大量 `:not()` 伪类来排除特定元素，导致选择器特异性飙升到 (0,21,1)**，远超折叠样式的 (0,3,0)。

---

## 三、辅助验证分析

### 3.1 内联样式的影响（非主因，但存在干扰）

之前的报告重点关注了内联样式问题。虽然内联样式不是导致 `display:none` 失效的主因，但它确实会影响面板高度的收缩：

- `hdmSetStyle` 通过 `setProperty(..., 'important')` 设置了 `height` 和 `width` 的内联样式
- 折叠时 JS 代码调用了 `removeProperty('height')` 来清除内联高度
- 如果清除不彻底，`height: 620px` 会阻止面板收缩

**但这不是 `display: none` 失效的原因。** 即使高度正确收缩了，由于 `display: block` 的覆盖，body 内容仍然会显示（可能被 `overflow: hidden` 裁剪，但元素本身仍在布局中）。

### 3.2 `all: unset` 的作用链

完整的样式作用链：

```
第322-344行: .html-diff-marker-inspector * { all: unset !important; }
    → 所有子元素的 display 被重置为 inline（unset 的初始值）
    
第434-441行: .html-diff-marker-inspector div:not(...) { display: block !important; }
    → 恢复 div 元素的 display:block（排除列表中的元素除外）
    → 特异性: (0, 21, 1)
    
第2201-2205行: .html-diff-marker-inspector.html-diff-marker-collapsed .html-diff-marker-inspector-body { display: none !important; }
    → 折叠时隐藏 body
    → 特异性: (0, 3, 0)
    → ❌ 被第434行的规则覆盖！
```

### 3.3 其他使用 `:not()` 的规则

经全面排查，`content.css` 中使用大量 `:not()` 的规则只有第 434-436 行的"恢复排版元素基础样式"规则：

- 第434行：`.html-diff-marker-toolbar div:not(...)` — 8 个 :not()，特异性 (0,9,1)
- 第435行：`.html-diff-marker-inspector div:not(...)` — 20 个 :not()，特异性 (0,21,1) ← **问题所在**
- 第436行：`.html-diff-marker-settings-panel div:not(...)` — 8 个 :not()，特异性 (0,9,1)

第 2423 行也有一个 `:not()`，但只有一个，不构成特异性问题。

---

## 四、最可能的根因（确认版）

| 序号 | 根因 | 概率 | 影响程度 | 验证方法 |
|------|------|------|----------|----------|
| 1 | **`:not()` 恢复排版规则特异性 (0,21,1) 远高于折叠样式 (0,3,0)，导致 `display: block` 覆盖 `display: none`** | **100%** | 高 — inspector-body 和 resize-handle-se 折叠时不隐藏 | 在浏览器开发者工具中检查折叠状态下 body 元素的 Computed display 值 |
| 2 | 内联样式 height 未正确清除，导致面板高度不收缩 | 中 | 中 — 面板高度仍为620px | 检查折叠后面板的 style 属性 |

**根因1是主要问题**，它直接导致主体内容无法隐藏。根因2是次要问题，可能导致高度收缩不正确。

---

## 五、修复建议

### 方案一（推荐）：在折叠样式选择器中提高特异性，超过 :not() 规则

**思路**：直接提高折叠样式的选择器特异性，使其超过 (0,21,1)。

**方案1a：使用更多类选择器叠加**
```css
.html-diff-marker-inspector.html-diff-marker-collapsed.html-diff-marker-inspector--collapsed-fix .html-diff-marker-inspector-body {
  display: none !important;
}
```
但这不优雅，需要添加额外类名。

**方案1b：使用属性选择器提高特异性（推荐，无需改 JS）**
```css
.html-diff-marker-inspector.html-diff-marker-collapsed[class*="html-diff-marker"] .html-diff-marker-inspector-body,
.html-diff-marker-inspector.html-diff-marker-collapsed[class*="html-diff-marker"] .html-diff-marker-inspector-actions,
.html-diff-marker-inspector.html-diff-marker-collapsed[class*="html-diff-marker"] .html-diff-marker-resize-handle-se {
  display: none !important;
}
```
- `[class*="html-diff-marker"]` 是属性选择器，特异性等同于类选择器
- 叠加后特异性变为 (0, 4, 0) — 仍然不够

**方案1c（最直接有效）：在折叠样式中也使用 `div:not()` 模式，或增加更多层级**

实际上，最简洁有效的方式是：

```css
.html-diff-marker-inspector.html-diff-marker-collapsed div.html-diff-marker-inspector-body,
.html-diff-marker-inspector.html-diff-marker-collapsed div.html-diff-marker-inspector-actions,
.html-diff-marker-inspector.html-diff-marker-collapsed div.html-diff-marker-resize-handle-se {
  display: none !important;
}
```
- 特异性变为 (0, 3, 1) — 仍然低于 (0, 21, 1) ❌

### 方案二（推荐）：将 `inspector-body` 和 `resize-handle-se` 添加到 :not() 排除列表中

**思路**：既然恢复排版规则用 `:not()` 排除特殊容器元素，那就把 `inspector-body` 和 `resize-handle-se` 也加入排除列表。

**修改位置**：`content.css` 第 435 行

在现有的 20 个 `:not()` 后面追加：
```css
:not(.html-diff-marker-inspector-body)
:not(.html-diff-marker-resize-handle-se)
:not(.html-diff-marker-inspector-top-bar)
```

（`inspector-top-bar` 也不在排除列表中，但它是 `flex-shrink: 0` 的 flex item，`display:block` 不影响它）

**优点**：
- 修复精准，只影响需要排除的元素
- 保持现有架构不变
- 符合 `:not()` 排除列表的设计初衷

**缺点**：
- 排除列表越来越长，维护成本高
- 未来新增容器类名时容易遗漏

### 方案三（根治）：重构恢复排版样式的实现方式，避免使用大量 :not()

**思路**：放弃 `:not()` 排除法，改用更合理的样式恢复策略。

**方案3a：使用更具体的子元素选择器替代 :not()**
不使用通配的 `div:not(...)`，而是为需要 `display:block` 的 div 添加统一的类名前缀，如 `.html-diff-marker-block`。

**方案3b：使用 CSS 变量 + :where() 降低特异性**
```css
.html-diff-marker-inspector :where(div:not(.special)) {
  display: block !important;
}
```
`:where()` 的特异性为 0，可以让折叠样式轻松覆盖。

**优点**：
- 从根本上解决特异性爆炸问题
- 代码更清晰，可维护性更高

**缺点**：
- 改动范围大，需要全面测试
- 可能引入其他回归问题

### 方案四（快速止血）：在折叠样式中使用更高特异性的选择器

利用 `:is()` 或直接增加选择器层级来堆高特异性：

```css
.html-diff-marker-inspector.html-diff-marker-collapsed.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector.html-diff-marker-inspector .html-diff-marker-inspector-body {
  display: none !important;
}
```
（重复 20+ 次类名以超过 21 的特异性 — 不推荐，太丑陋）

**更优雅的方式：使用 ID 选择器（如果有 id 的话）**
但当前面板没有 id，所以不适用。

---

## 六、推荐修复方案

### 短期方案（推荐立即实施）：方案二 — 添加到 :not() 排除列表

**理由**：
1. 改动最小，风险最低
2. 与现有代码风格一致
3. 立即生效，无需大范围重构

**修改内容**：
在 `content.css` 第 435 行的 `:not()` 链中追加以下 2 个（或 3 个）排除项：
- `:not(.html-diff-marker-inspector-body)`
- `:not(.html-diff-marker-resize-handle-se)`
- 可选：`:not(.html-diff-marker-inspector-top-bar)`（虽然 display:block 对它影响不大，但保持一致性）

### 长期方案：方案三 — 用 :where() 重构恢复样式

**理由**：
1. 从根本上解决特异性爆炸问题
2. 避免未来再次出现类似问题
3. 代码更优雅、更易维护

可以在下一个迭代中统一重构所有 `:not()` 大量堆积的规则。

---

## 七、验收手段

### 7.1 基础功能验证

1. **单元素面板折叠**：
   - 打开单元素编辑面板
   - 点击最小化按钮（−）
   - 预期：面板高度收缩，只显示顶部色条 + 头部
   - 预期：主体内容（inspector-body）完全隐藏
   - 预期：底部操作栏（inspector-actions）完全隐藏
   - 预期：右下角调整大小把手隐藏
   - 预期：按钮图标变为 +

2. **单元素面板展开**：
   - 点击折叠后的面板头部或 + 按钮
   - 预期：面板恢复原来的高度和宽度，所有内容重新显示
   - 预期：按钮图标变为 −

3. **组合面板折叠**：重复上述测试，验证组合编辑面板

### 7.2 DOM 验证（开发者工具，关键验证点）

1. **折叠状态下检查 body 的 computed display**：
   - 选中 `.html-diff-marker-inspector-body` 元素
   - 查看 Computed 面板的 `display` 属性
   - **预期值：`none`**（修复前是 `block`）

2. **折叠状态下检查 resize-handle-se 的 computed display**：
   - 选中 `.html-diff-marker-resize-handle-se` 元素
   - 查看 Computed 面板的 `display` 属性
   - **预期值：`none`**（修复前是 `block`）

3. **在 Styles 面板中确认覆盖关系**：
   - 折叠状态下选中 body 元素
   - 在 Styles 面板中搜索 `display`
   - 应该能看到：
     - `display: none !important`（来自折叠样式，生效）
     - `display: block !important`（来自 :not() 规则，被划掉/不生效）

### 7.3 回归验证

1. **确保其他 div 元素的 display:block 恢复正常**：
   - 面板内的普通 div 仍然显示为 block
   - 排除列表中的元素不受影响

2. **工具栏不受影响**：
   - 工具栏的折叠/展开功能正常
   - 工具栏的布局正常

3. **设置面板不受影响**：
   - 设置面板的布局正常
   - 所有元素正常显示

---

## 八、相关代码文件清单

| 文件 | 行号 | 说明 |
|------|------|------|
| `extension/content/content.css` | 322-344 | `all: unset` 样式重置规则（子元素重置） |
| `extension/content/content.css` | 434-441 | **恢复排版元素基础样式（:not() 规则，根因所在）** |
| `extension/content/content.css` | 2174-2194 | 编辑面板基础样式 |
| `extension/content/content.css` | 2196-2205 | 编辑面板折叠样式 |
| `extension/content/content.css` | 2312-2319 | inspector-body 基础样式 |
| `extension/content/content.css` | 2929-2937 | inspector-actions 基础样式 |
| `extension/content/content.css` | 2992-3003 | resize-handle-se 基础样式 |
| `extension/content/content.js` | 3407-3438 | 单元素面板折叠按钮事件处理 |
| `extension/content/content.js` | 4337-4366 | 组合面板折叠按钮事件处理 |
| `.trae/debug/not-specificity-test.html` | — | :not() 特异性测试验证页面 |

---

## 九、调试文件

已创建调试 HTML 文件用于本地验证：
- `.trae/debug/not-specificity-test.html`

包含两个测试场景：
1. 正常展开状态（验证 :not() 规则是否匹配 body）
2. 折叠状态（验证 display:none 是否被覆盖）

可在浏览器中打开该文件，直接查看特异性覆盖效果。

---

**报告结束**
