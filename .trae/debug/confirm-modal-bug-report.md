# 确认弹窗（删除确认/清除确认）排查报告

## 一、问题描述

1. **文字排版不规范**：确认弹窗的文字排版与设计稿 `ui-preview-v5.2-showcase.html` 中的演示效果不一致
2. **颜色不能随主题切换同步变化**：切换主题色时，确认弹窗的颜色没有同步变化

---

## 二、现场分析

### 2.1 弹窗创建逻辑

**文件**：`extension/content/content.js`（第2556-2737行）

确认弹窗通过 `showConfirm()` 函数调用，底层使用 `showModal()` 统一创建。DOM 结构如下：

```
html-diff-marker-modal-overlay (遮罩层，append to body)
  └─ html-diff-marker-modal (弹窗容器)
       ├─ html-diff-marker-modal-header (头部)
       │    └─ html-diff-marker-modal-header-title (标题文字)
       ├─ html-diff-marker-modal-body (内容区)
       │    └─ <p> (文字内容，通过内联样式设置)
       └─ html-diff-marker-modal-footer (底部按钮区)
            ├─ html-diff-marker-modal-btn-cancel (取消按钮)
            └─ html-diff-marker-modal-btn-confirm (确认按钮)
```

关键代码（第2600-2609行）：内容区文字通过 `hdmSetStyles()` 设置内联样式：
```js
const contentP = document.createElement('p');
contentP.textContent = content;
hdmSetStyles(contentP, {
  margin: '0',
  fontSize: '13px',
  color: 'var(--hdm-text-secondary)',
  lineHeight: '1.6'
});
```

### 2.2 主题切换机制

**预设主题切换**（content.js 第2302-2321行）：
- 通过 `document.body.setAttribute('data-theme', themeId)` 设置主题标识
- CSS 中通过 `[data-theme="xxx"]` 选择器重新定义 `--hdm-theme-*` 系列变量

**自定义颜色切换**（content.js 第2324-2351行）：
- 通过 `document.body.style.setProperty('--hdm-theme-*', value)` 直接在 body 上设置内联样式
- 设置了 10 个主题变量：`primary`, `primary-light`, `primary-dark`, `gradient`, `soft-bg`, `soft-bg-hover`, `soft-text`, `count-text`, `shadow`, `alpha-20`

**派生变量**（定义在 `:root` 上，content.css 第22-36行）：
```css
--hdm-primary: var(--hdm-theme-primary);
--hdm-gradient-header: var(--hdm-theme-gradient);
--hdm-gradient-btn-primary: var(--hdm-theme-gradient);
--hdm-gradient-btn-primary-hover: linear-gradient(135deg, var(--hdm-theme-primary-light), var(--hdm-theme-primary));
--hdm-gradient-btn-primary-active: linear-gradient(135deg, var(--hdm-theme-primary), var(--hdm-theme-primary-dark));
```

---

## 三、问题一：文字排版差异详细分析

### 3.1 差异对比表

| 项目 | 设计稿 (ui-preview) | 实际实现 (content.css + js) | 差异程度 |
|------|---------------------|----------------------------|---------|
| **弹窗宽度** | `width: 320px`（固定宽度） | `min-width: 380px; max-width: 90vw` | 大，宽了 60px |
| **头部 padding** | `14px 20px` | `14px 20px` | 一致 |
| **头部字体大小** | `14px` | `var(--hdm-font-lg)` = 14px | 一致 |
| **头部字重** | `600` | `var(--hdm-font-semibold)` = 600 | 一致 |
| **内容区 padding** | `20px` | `20px` | 一致 |
| **内容字体大小** | `13px` | `13px`（内联样式） | 一致 |
| **内容行高** | `1.6` | `1.6`（内联样式） | 一致 |
| **内容文字颜色** | `var(--text-primary)` (#1F2937) | `var(--hdm-text-secondary)` (#4B5563)（内联样式） | 中，颜色偏浅 |
| **底部 padding** | `12px 20px` | `12px 20px` | 一致 |
| **底部背景色** | `var(--bg-secondary)` (#F9FAFB) | `var(--hdm-bg-secondary)` (#F9FAFB) | 一致 |
| **底部顶部边框** | `1px solid var(--border-light)` (#E5E7EB) | `1px solid var(--hdm-border)` (#E5E7EB) | 一致（实际值相同） |
| **按钮高度** | `32px` | `34px` | 中，高了 2px |
| **按钮水平 padding** | `0 16px` | `0 18px` | 小，宽了 2px 每侧 |
| **按钮圆角** | `6px` (--radius-sm) | `var(--hdm-radius-md)` = 8px | 中，大了 2px |
| **按钮字体大小** | `12px` | `var(--hdm-font-base)` = 12px | 一致 |
| **按钮字重** | `500` | `var(--hdm-font-medium)` = 500 | 一致 |
| **取消按钮边框** | `1px solid var(--border)` (#D1D5DB) | `border-color: var(--hdm-border)` (#E5E7EB) | 中，实际边框更浅 |
| **取消按钮文字颜色** | `var(--text-secondary)` (#4B5563) | `var(--hdm-text-secondary)` (#4B5563) | 一致 |
| **取消按钮 hover** | `background: var(--bg-hover)` (中性灰) | `background: var(--hdm-primary-bg); color: var(--hdm-primary); border-color: var(--hdm-primary-light)` (主题色) | 大，交互风格完全不同 |
| **确认按钮 hover** | `opacity: 0.9` | `background: var(--hdm-gradient-btn-primary-hover); box-shadow: ...; transform: translateY(-1px)` | 大，交互风格完全不同 |
| **底部按钮间距** | `gap: 8px` | `gap: 8px` | 一致 |

### 3.2 主要排版问题总结

1. **弹窗过宽**：380px vs 320px，宽了 60px（约 18.75%）
2. **内容文字颜色偏浅**：使用了 secondary 色级而非 primary 色级
3. **按钮尺寸偏大**：高度 34px vs 32px，padding 18px vs 16px，圆角 8px vs 6px
4. **取消按钮边框偏浅**：`--hdm-border` (#E5E7EB) vs 设计稿 `--border` (#D1D5DB)
5. **按钮 hover 交互风格差异大**：
   - 设计稿：取消按钮 hover 是中性背景加深
   - 实际：取消按钮 hover 变成主题色背景 + 主题色文字 + 主题色边框

---

## 四、问题二：颜色不能随主题切换同步变化

### 4.1 现状检查

**弹窗中使用了主题色变量的元素：**

| 元素 | 使用的 CSS 变量 | 变量定义来源 | 是否依赖 --hdm-theme-* |
|------|----------------|------------|----------------------|
| 头部背景 | `--hdm-gradient-header` | `:root` → `var(--hdm-theme-gradient)` | 是 |
| 确认按钮背景 | `--hdm-gradient-btn-primary` | `:root` → `var(--hdm-theme-gradient)` | 是 |
| 确认按钮 hover 背景 | `--hdm-gradient-btn-primary-hover` | `:root` → linear-gradient + `var(--hdm-theme-primary-light/primary)` | 是 |
| 确认按钮 active 背景 | `--hdm-gradient-btn-primary-active` | `:root` → linear-gradient + `var(--hdm-theme-primary/primary-dark)` | 是 |
| 确认按钮 hover 阴影 | `var(--hdm-primary-alpha-40)` | `:root` → color-mix of `var(--hdm-theme-primary)` | 是 |
| 取消按钮 hover 背景 | `var(--hdm-primary-bg)` | `:root` → `var(--hdm-theme-soft-bg)` | 是 |
| 取消按钮 hover 文字 | `var(--hdm-primary)` | `:root` → `var(--hdm-theme-primary)` | 是 |
| 取消按钮 hover 边框 | `var(--hdm-primary-light)` | `:root` → `var(--hdm-theme-primary-light)` | 是 |

**结论**：弹窗中所有主题色相关的样式都使用了 CSS 变量，且这些变量最终都引用了 `--hdm-theme-*` 系列变量。

### 4.2 可能性猜测（按概率排序）

**猜测 1（高概率）：内容区文字颜色不随主题变化是预期行为，但被误解为问题**
- 内容文字使用 `--hdm-text-secondary`（中性色），这是正常的设计：正文文字颜色不随主题色变化
- 但如果用户期望文字颜色也有主题感，可能会认为是问题
- **验证**：检查设计稿中 modal-body 的文字颜色确实是 `--text-primary`（中性色，不是主题色）

**猜测 2（中概率）：`all: initial` 对 CSS 变量继承的边缘影响**
- `.html-diff-marker-modal-overlay` 使用了 `all: initial !important`
- 虽然 CSS 规范说 `all` 不影响自定义属性，但在某些浏览器/场景下可能存在异常
- **验证**：在开发者工具中检查 modal-overlay 元素上的 `--hdm-theme-gradient` 变量值是否正确

**猜测 3（中概率）：预设主题切换时派生变量未重新定义导致的问题**
- `[data-theme="xxx"]` 只重新定义了 `--hdm-theme-*` 变量（10个）
- 像 `--hdm-gradient-btn-primary-hover`、`--hdm-primary-alpha-40` 等派生变量定义在 `:root` 上
- 虽然理论上 CSS 变量是动态解析的（使用时查找当前元素的值），但在某些复杂场景下可能存在问题
- **验证**：在切换主题后，用开发者工具检查 `.html-diff-marker-modal-btn-confirm:hover` 的 background 值是否正确

**猜测 4（低概率）：弹窗在主题切换前已打开，动态更新存在问题**
- 如果弹窗在主题切换前就已经显示，切换主题后弹窗样式应该自动更新（因为 CSS 变量是动态的）
- 但如果某些样式是通过内联样式设置的硬编码值，就不会更新
- **验证**：切换主题时已打开的弹窗是否会更新颜色

**猜测 5（低概率）：`color-mix()` 函数在 CSS 变量变化时不重新计算**
- 部分阴影使用 `color-mix(in srgb, var(--hdm-theme-primary) 30%, transparent)`
- 理论上 `color-mix()` 应该响应变量变化，但不排除浏览器 bug
- **验证**：切换主题后检查阴影颜色是否变化

### 4.3 建议验证步骤

1. 打开扩展页面，打开一个确认弹窗（如删除确认）
2. 打开 Chrome 开发者工具，选择 modal-overlay 元素
3. 在 Elements → Styles 面板中检查 `--hdm-theme-primary` 和 `--hdm-gradient-header` 的值
4. 切换主题（预设主题或自定义颜色）
5. 再次检查上述变量的值是否更新
6. 观察弹窗的头部渐变和确认按钮渐变是否同步变化

---

## 五、涉及的关键文件和代码位置

### 5.1 content.js

| 行号 | 内容 | 说明 |
|------|------|------|
| 85-97 | `hdmSetStyle` / `hdmSetStyles` 函数 | 内联样式设置工具，自动加 `!important` |
| 998 | `showConfirm('确定删除选中的...')` | 批量删除确认调用 |
| 1138 | `showConfirm('确定删除此标记吗？')` | 删除确认调用 |
| 2156 | `showConfirm('确定删除此组件及其DOM元素吗？')` | 组件删除确认 |
| 2553-2684 | `showModal()` 函数 | 模态弹窗核心创建逻辑 |
| 2600-2609 | 内容 p 标签内联样式 | `color: var(--hdm-text-secondary)` |
| 2714-2724 | `showConfirm()` 函数 | confirm 类型便捷方法 |
| 3198 | `showConfirm('确定清除所有标记吗？')` | 清除确认调用 |
| 2302-2321 | `themeManager.applyPreset()` | 预设主题切换 |
| 2339-2351 | `themeManager._applyCustomColors()` | 自定义颜色变量设置 |

### 5.2 content.css

| 行号 | 选择器 | 说明 |
|------|--------|------|
| 8-226 | `:root` | CSS 变量定义（含主题变量和派生变量） |
| 228-285 | `[data-theme="xxx"]` | 四套预设主题变量 |
| 295-319 | `.html-diff-marker-modal-overlay` 重置 | `all: initial !important` |
| 325-344 | `.html-diff-marker-modal-overlay *` 子元素重置 | `all: unset !important` |
| 3128-3143 | `.html-diff-marker-modal-overlay` | 遮罩层样式 |
| 3161-3171 | `.html-diff-marker-modal` | 弹窗容器样式（min-width: 380px） |
| 3184-3195 | `.html-diff-marker-modal-header` | 头部样式（渐变背景） |
| 3230-3238 | `.html-diff-marker-modal-body` | 内容区样式 |
| 3304-3312 | `.html-diff-marker-modal-footer` | 底部样式 |
| 3314-3331 | `.html-diff-marker-modal-btn` | 按钮基础样式（height: 34px, padding: 0 18px, radius-md） |
| 3333-3356 | `.html-diff-marker-modal-btn-cancel` | 取消按钮样式 |
| 3358-3382 | `.html-diff-marker-modal-btn-confirm` | 确认按钮样式 |

### 5.3 设计稿参考

| 行号 | 选择器 | 说明 |
|------|--------|------|
| 1675-1687 | `.hdm-modal` | 弹窗容器（width: 320px） |
| 1688-1694 | `.hdm-modal-header` | 头部样式 |
| 1695-1700 | `.hdm-modal-body` | 内容区样式（color: var(--text-primary)） |
| 1701-1708 | `.hdm-modal-footer` | 底部样式 |
| 1709-1724 | `.hdm-modal-btn` | 按钮基础样式（height: 32px, padding: 0 16px, border-radius: 6px） |
| 1725-1730 | `.hdm-modal-btn.cancel` | 取消按钮样式 |
| 1731-1735 | `.hdm-modal-btn.confirm` | 确认按钮样式 |

---

## 六、修复方向建议

### 6.1 排版问题修复

1. **弹窗宽度**：将 `min-width: 380px` 调整为 `320px` 或 `min-width: 320px`
2. **内容文字颜色**：将内联样式中的 `color: var(--hdm-text-secondary)` 改为 `color: var(--hdm-text-primary)`，或移除内联样式让 CSS 类的颜色生效
3. **按钮尺寸**：将 `height: 34px` 改为 `32px`，`padding: 0 18px` 改为 `0 16px`，`border-radius: var(--hdm-radius-md)` 改为 `var(--hdm-radius-sm)`
4. **取消按钮边框**：将 `border-color: var(--hdm-border)` 改为更深的边框色，或新增 `--hdm-border-strong` 变量
5. **取消按钮 hover 效果**：改为中性色背景加深的风格（与设计稿一致）

### 6.2 主题颜色同步问题

需要先通过开发者工具验证问题是否真实存在。如果确认存在：

1. 检查 `[data-theme="xxx"]` 选择器是否正确匹配 body 元素
2. 检查 modal-overlay 元素上的 `--hdm-theme-gradient` 变量值
3. 考虑将主题变量直接设置在 modal-overlay 上作为兜底
4. 或在 `[data-theme="xxx"]` 中也重新定义关键的派生变量
