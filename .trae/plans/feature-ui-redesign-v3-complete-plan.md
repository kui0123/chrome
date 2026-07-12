# HTML Diff Marker UI 全面重设计方案 — 柔雾紫主题 v3.0

> **版本**：v3.0（完整版）
> **设计主题**：方案2 - 柔雾紫 (Misty Purple)
> **状态**：设计完成，待实施
> **适用项目**：HTML Diff Marker Chrome 扩展
> **设计依据**：参考 Wizo 移动应用设计语言 + 9 大组件板块对比设计
> **覆盖范围**：工具栏、检查面板、颜色色板、按钮、输入框、模态弹窗、操作反馈、样式分组、拖拽与间距

---

## 一、原始需求

> 「你上一版开发的UI非常不完整。我希望你按照这一般设计的UI重新迭代，包括每一处细节设计，比如编辑面板中的每一个元素，都不要落下。颜色就用方案2的柔雾紫吧。」
>
> 「不知道为什么你之前设计的UI方案被清空了。我留了截图，以及之前发给你的参考设计。你可以对照这些重新来。」

用户要求对 Chrome 扩展「HTML Diff Marker」进行**全面、完整、细致**的 UI 重设计，核心要求：

1. 采用方案2「柔雾紫」配色方案
2. **覆盖每一个 UI 组件的每一处细节，不遗漏**
3. 参考 Wizo 移动应用的现代设计语言
4. 覆盖 9 大板块：工具栏、检查面板、颜色色板、按钮、输入框、模态弹窗、操作反馈、样式分组、拖拽与间距
5. 统一的圆角、阴影、间距、字号规范
6. 所有交互状态（hover/focus/active/disabled/error）完整设计
7. 输出 P0/P1/P2 分级验收清单

---

## 二、需求理解

### 2.1 核心目标

- **视觉全面升级**：从当前的深色工具栏 + 蓝色/绿色/灰色混搭风格，统一为柔雾紫主题
- **细节零遗漏**：补齐当前 CSS 中缺失或简陋的所有组件样式和交互状态
- **质感提升**：通过渐变、玻璃拟态、阴影层级、微动效提升整体精致度
- **一致性**：建立完整的设计令牌体系，确保所有组件风格统一
- **可参考性**：对齐 Wizo 设计语言——轻盈、现代、有呼吸感

### 2.2 设计覆盖范围（9 大板块）

| # | 板块 | 包含内容 |
|---|------|---------|
| 1 | **工具栏 (Toolbar)** | 头部渐变、控制按钮、功能按钮网格、计数行、唤醒按钮 |
| 2 | **检查面板 (Inspector)** | 面板框架、头部、元素信息区、10 大编辑分区、底部操作栏 |
| 3 | **颜色色板 (Color Palette)** | 颜色选择器、色板预览、颜色值输入、预设色板 |
| 4 | **按钮 (Button)** | 主按钮/次要/危险/幽灵按钮，4 种状态（默认/hover/active/disabled） |
| 5 | **输入框 (Input)** | 文本框/文本域/下拉框/复选框，5 种状态（默认/hover/focus/disabled/error） |
| 6 | **模态弹窗 (Modal)** | 遮罩层、弹窗容器、头部、内容区、底部按钮组、入场动画 |
| 7 | **操作反馈 (Feedback)** | Toast 提示、加载状态、成功/错误/警告/信息 4 类提示 |
| 8 | **样式分组 (Style Groups)** | 分组标题、重置按钮、分隔线、属性行布局、统计信息 |
| 9 | **拖拽与间距 (Drag & Spacing)** | 拖拽把手、尺寸浮窗、对齐辅助线、间距系统 |

### 2.3 范围边界

- **涉及文件**：`content/content.css`（主要重写）、`content/content.js`（DOM 结构微调适配）、`ui-design-tokens.css`（设计令牌文档）
- **不涉及**：功能逻辑变更、架构调整、新功能开发
- **持久化**：现有 localStorage/sessionStorage 数据结构不变
- **类名前缀**：所有类名保持 `html-diff-marker-` 前缀不变

### 2.4 content.js DOM 结构变更范围与影响评估

> **说明**：本次 UI 重设计以 CSS 样式改写为主，DOM 结构仅做必要的微调以支撑更丰富的视觉表现。以下列出所有需要调整的 DOM 结构点及其对 JS 逻辑的影响评估。

| # | DOM 结构点 | 变更类型 | 涉及位置（content.js） | JS 逻辑影响评估 | 风险等级 |
|---|-----------|---------|----------------------|----------------|---------|
| 1 | **自定义下拉框（select 外层包装）** | 新增外层包装 DOM | 字体/字体粗细/显示方式 下拉框创建处 | 采用「美化原生 select + 外层视觉包装」方案：在原生 `<select>` 外层包裹 `html-diff-marker-select-wrap` 容器 + 自定义箭头图标；原生 select 透明化，边框/背景/focus 光晕由外层容器提供；`change` 事件仍绑定原生 select，逻辑不变 | 中 |
| 2 | **自定义复选框（checkbox 包装）** | 新增 DOM 包装层 | 同步缩放子元素复选框创建处 | 需在原生 `<input type=checkbox>` 外层包裹自定义样式容器；`change` 事件仍绑定原生 checkbox，逻辑不变 | 低 |
| 3 | **颜色选择器（美化增强）** | 新增 DOM 包装层 | 背景颜色/文本颜色 控件创建处 | 在原生 `<input type=color>` 外层增加可视化色块包装；`input` 事件仍绑定原生元素，逻辑不变 | 低 |
| 4 | **多选工具栏按钮 disabled 态类名** | 新增 class 切换逻辑 | 多选工具栏创建与事件绑定处 | 需增加 `html-diff-marker-btn--disabled` 类名动态切换（根据选中数量控制按钮可用状态）；所有按钮均为瞬时操作，无持久选中态；事件回调逻辑不变 | 低 |
| 5 | **Toast 图标元素** | 新增 DOM 子元素 | Toast 创建函数 | 原 Toast 可能仅为纯文字，需增加图标元素（✓/⚠/ℹ/✕）；显示/隐藏逻辑不变 | 低 |
| 6 | **按钮 loading 状态** | 新增 DOM 子元素 | 主要按钮点击事件处 | 需增加 spinner 元素，点击后切换 loading 类名显示；原点击逻辑不变，仅增加状态切换 | 低 |
| 7 | **面板头部选择器复制按钮** | 新增按钮元素 | 检查面板头部创建处 | 原选择器为纯文本，需增加复制按钮图标；需新增 `click` 事件绑定（复制到剪贴板） | 低 |
| 8 | **样式分组标题区** | DOM 层级微调 | 样式编辑/位置/大小分组创建处 | 需将分组标题与重置按钮包裹在统一 header 容器中；原各元素事件绑定不变 | 低 |

**影响评估总结**：
- **高风险变更**：0 处
- **中风险变更**：1 处（自定义下拉框）
- **低风险变更**：7 处
- **核心原则**：所有原生表单控件（select/checkbox/input）均保留，仅在外层增加视觉包装 DOM，确保 JS 事件绑定和值获取逻辑不受影响
- **事件委托兼容**：所有新增 DOM 元素均保持原有 `data-*` 属性和类名，不影响现有事件委托逻辑
- **回滚方案**：如遇问题，可直接移除外层包装 DOM，回退到原生控件样式，功能立即恢复

### 2.5 非功能要求

- 性能无明显下降（CSS 文件增量控制在 30KB 以内）
- 兼容 Chrome 主流版本（Chrome 90+）
- 不影响现有功能的可用性
- 支持键盘无障碍访问（focus 状态清晰）

---

## 三、现状分析

### 3.1 当前 CSS 结构评估

当前 `content.css` 约 937 行，存在以下问题：

| 模块 | 现状 | 主要问题 |
|------|------|---------|
| 工具栏 | 深色背景 (#1e293b) | 风格老旧，与柔雾紫主题不统一 |
| 检查面板头部 | 蓝色渐变 (#D0E9FA → #93C5FD) | 配色与主题不符 |
| 按钮 | 4 色独立（蓝/灰/绿/红） | 缺乏统一的设计语言，hover 效果简陋 |
| 输入框 | 基础灰色边框 | 缺少 error/disabled 状态，focus 光晕效果弱 |
| 下拉框 | 原生 select 样式 | 未自定义，与整体风格脱节 |
| 复选框 | 原生 checkbox | 未自定义 |
| 颜色选择器 | 原生 input[type=color] | 样式简陋，与主题不一致 |
| Toast | 深色背景 | 无类型区分，样式单调 |
| 滚动条 | 浏览器默认 | 未自定义 |
| 样式分组 | 基础分隔线 | 标题层级不清晰，缺少视觉呼吸感 |
| 拖拽把手 | 蓝色圆形 | 配色需改紫色，细节可优化 |

### 3.2 检查面板内容结构（10 大分区 — 唯一参照）

> **重要**：以下为检查面板编辑分区的完整清单（共 **10 个分区**），本文档所有提及分区数量的地方均以此表为唯一参照。底部操作栏为全局操作区，不计入分区数量。

| # | 分区名称 | 类名/标识 | 核心控件 | 显示条件 |
|---|---------|----------|---------|---------|
| 1 | ⚙️ 大小调整选项 | `html-diff-marker-style-section` | 复选框（同步缩放子元素） | 始终显示 |
| 2 | 组件标签 | `html-diff-marker-field-row` | 文本输入框 | 始终显示 |
| 3 | 修改说明 | `html-diff-marker-field-row` | 文本域 + 预览链接按钮 | 始终显示 |
| 4 | 链接地址 / 跳转链接 | `html-diff-marker-field-row` | 文本输入框 | a 标签显示「链接地址」，其他显示「跳转链接」 |
| 5 | 🎨 样式编辑 | `html-diff-marker-style-section` | 11 个属性行 + 统计条 | 始终显示 |
| 6 | 📍 位置调整 | `html-diff-marker-style-section` | X / Y 偏移（输入 + 4 微调按钮） | 始终显示 |
| 7 | 📐 大小调整 | `html-diff-marker-style-section` | 宽 / 高（输入 + 单位切换 + 4 微调） | 始终显示 |
| 8 | 🖼 图片替换 | `html-diff-marker-style-section` | 预览图 + 信息 + 操作按钮 | 仅 `img` 元素显示 |
| 9 | HTML 编辑区 | - | 原始 HTML（只读）+ 修改后 HTML（可编辑） | 始终显示 |
| 10 | 元素信息区 | - | 选择器路径文本（等宽字体） | 始终显示 |

**样式编辑区（第 5 分区）内部包含 11 个属性行**：

| # | 属性 | 控件类型 |
|---|------|---------|
| ① | 背景颜色 | 颜色选择器 + 文本输入 + 重置 |
| ② | 背景图片 | 预览图 + 上传/删除按钮 + 重置 |
| ③ | 文本颜色 | 颜色选择器 + 文本输入 + 重置 |
| ④ | 字体 | 下拉框 + 添加按钮 + 三态提示 + 删除按钮 |
| ⑤ | 字体粗细 | 下拉框 + 重置 |
| ⑥ | 字体大小 | 文本输入 + 重置 |
| ⑦ | 内边距 | 文本输入 + 重置 |
| ⑧ | 外边距 | 文本输入 + 重置 |
| ⑨ | 圆角 | 文本输入 + 重置 |
| ⑩ | 边框 | 文本输入 + 重置 |
| ⑪ | 显示方式 | 下拉框 + 重置 |

**底部操作栏（全局操作区，不计入分区数）**：
- 删除按钮（危险）
- 保存修改按钮（主按钮）

---

## 四、设计令牌 (Design Tokens)

### 4.1 颜色系统

#### 4.1.1 主色系（柔雾紫）

| 变量名 | 色值 | 用途 |
|--------|------|------|
| `--hdm-primary` | `#8B5CF6` | 主色（按钮、边框、强调） |
| `--hdm-primary-hover` | `#7C3AED` | 主色 hover 态 |
| `--hdm-primary-active` | `#6D28D9` | 主色 active/按下态 |
| `--hdm-primary-light` | `#A78BFA` | 主色浅色（图标、次要强调） |
| `--hdm-primary-bg` | `#EDE9FE` | 浅色背景（hover 背景、标签背景） |
| `--hdm-primary-bg-soft` | `#F5F3FF` | 最浅背景（页面背景、卡片底色） |
| `--hdm-primary-dark` | `#5B21B6` | 主色深色（渐变终点、深色文字） |

#### 4.1.2 渐变色

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--hdm-gradient-header` | `linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)` | 面板/工具栏头部 |
| `--hdm-gradient-btn-primary` | `linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)` | 主按钮默认 |
| `--hdm-gradient-btn-primary-hover` | `linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)` | 主按钮 hover |
| `--hdm-gradient-btn-primary-active` | `linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)` | 主按钮 active |
| `--hdm-gradient-toast` | `linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)` | Toast 默认背景 |

#### 4.1.3 中性色

| 变量名 | 色值 | 用途 |
|--------|------|------|
| `--hdm-text-primary` | `#1F2937` | 主要文字 |
| `--hdm-text-secondary` | `#4B5563` | 次级文字、标签 |
| `--hdm-text-tertiary` | `#6B7280` | 辅助文字、占位符 |
| `--hdm-text-disabled` | `#9CA3AF` | 禁用文字 |
| `--hdm-text-white` | `#FFFFFF` | 白色文字（渐变头部） |
| `--hdm-text-white-sub` | `rgba(255,255,255,0.75)` | 头部次级文字 |
| `--hdm-text-white-dim` | `rgba(255,255,255,0.55)` | 头部最弱文字 |
| `--hdm-bg-white` | `#FFFFFF` | 白色背景（面板、卡片） |
| `--hdm-bg-soft` | `#F9FAFB` | 浅灰背景（底部栏、分组区） |
| `--hdm-bg-hover` | `#F3F4F6` | hover 背景灰 |
| `--hdm-bg-disabled` | `#F3F4F6` | 禁用背景 |
| `--hdm-border` | `#E5E7EB` | 默认边框 |
| `--hdm-border-hover` | `#D1D5DB` | hover 边框 |
| `--hdm-divider` | `#F3F4F6` | 分隔线（浅） |

#### 4.1.4 功能语义色

| 类型 | 属性 | CSS 变量名 | 色值 | 用途 |
|------|------|-----------|------|------|
| **成功 Success** | 主色 | `--hdm-success` | `#10B981` | 成功图标、成功文字、成功按钮 |
| **成功 Success** | 背景色 | `--hdm-success-bg` | `#ECFDF5` | 成功提示背景、成功按钮 hover 背景 |
| **成功 Success** | 边框色 | `--hdm-success-border` | `#A7F3D0` | 成功提示边框、成功按钮边框 |
| **成功 Success** | 文字色 | `--hdm-success-text` | `#065F46` | 成功提示文字 |
| **警告 Warning** | 主色 | `--hdm-warning` | `#F59E0B` | 警告图标、警告文字、警告标记 |
| **警告 Warning** | 背景色 | `--hdm-warning-bg` | `#FFFBEB` | 警告提示背景、警告按钮 hover 背景 |
| **警告 Warning** | 边框色 | `--hdm-warning-border` | `#FDE68A` | 警告提示边框、警告按钮边框 |
| **警告 Warning** | 文字色 | `--hdm-warning-text` | `#92400E` | 警告提示文字 |
| **错误 Error** | 主色 | `--hdm-error` | `#EF4444` | 错误图标、错误文字、危险按钮文字 |
| **错误 Error** | 背景色 | `--hdm-error-bg` | `#FEF2F2` | 错误提示背景、危险按钮 hover 背景、重置按钮背景 |
| **错误 Error** | 边框色 | `--hdm-error-border` | `#FECACA` | 错误提示边框、危险按钮边框、输入框 error 边框 |
| **错误 Error** | 文字色 | `--hdm-error-text` | `#991B1B` | 错误提示文字 |
| **信息 Info** | 主色 | `--hdm-info` | `#3B82F6` | 信息图标、信息文字 |
| **信息 Info** | 背景色 | `--hdm-info-bg` | `#EFF6FF` | 信息提示背景 |
| **信息 Info** | 边框色 | `--hdm-info-border` | `#BFDBFE` | 信息提示边框 |
| **信息 Info** | 文字色 | `--hdm-info-text` | `#1E40AF` | 信息提示文字 |

#### 4.1.5 标记状态色

| 状态 | 外框色 | 背景色（透明） | 徽章色 |
|------|--------|---------------|--------|
| 选中（未修改） | `#8B5CF6` | `rgba(139,92,246,0.06)` | `#8B5CF6` |
| 已修改 | `#F59E0B` | `rgba(245,158,11,0.06)` | `#F59E0B` |
| 悬停高亮 | `#A78BFA` | `rgba(167,139,250,0.08)` | - |
| 多选 | `#8B5CF6`（虚线） | `rgba(139,92,246,0.1)` | - |
| 组合标记 | `#8B5CF6` | `rgba(139,92,246,0.04)` | `#7C3AED` |

### 4.2 字体系统

```css
--hdm-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", 
  "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif;
--hdm-font-mono: "SF Mono", Menlo, Consolas, "Liberation Mono", 
  "Courier New", monospace;
```

**字号层级**：

| 变量 | 字号 | 行高 | 用途 |
|------|------|------|------|
| `--hdm-text-xs` | 10px | 1.3 | 最小辅助文字、快捷键提示 |
| `--hdm-text-sm` | 11px | 1.4 | 标签、说明文字、提示条 |
| `--hdm-text-base` | 12px | 1.5 | 正文、按钮、输入框 |
| `--hdm-text-md` | 13px | 1.5 | 分组标题、稍大正文 |
| `--hdm-text-lg` | 14px | 1.4 | 面板/工具栏标题 |
| `--hdm-text-xl` | 16px | 1.3 | 大标题（极少用） |

**字重**：
- `--hdm-font-regular`: 400
- `--hdm-font-medium`: 500
- `--hdm-font-semibold`: 600
- `--hdm-font-bold`: 700

### 4.3 间距系统（4px 基准）

| 变量 | 值 | 典型用途 |
|------|-----|---------|
| `--hdm-space-1` | 4px | 图标内边距、微间距 |
| `--hdm-space-2` | 8px | 小按钮内边距、小间隙 |
| `--hdm-space-3` | 12px | 输入框内边距、中等间距 |
| `--hdm-space-4` | 16px | 面板内边距、大间距 |
| `--hdm-space-5` | 20px | 面板头部内边距 |
| `--hdm-space-6` | 24px | 大区块间距 |
| `--hdm-space-8` | 32px | 超大间距 |

### 4.4 圆角系统

| 变量 | 值 | 用途 |
|------|-----|------|
| `--hdm-radius-xs` | 4px | 小标签、微调按钮 |
| `--hdm-radius-sm` | 6px | 输入框、小按钮 |
| `--hdm-radius-md` | 8px | 按钮、卡片 |
| `--hdm-radius-lg` | 10px | 面板内容区 |
| `--hdm-radius-xl` | 12px | 工具栏、编辑面板、模态框 |
| `--hdm-radius-2xl` | 16px | 大卡片、宣传位 |
| `--hdm-radius-full` | 9999px | 圆形、胶囊形 |

### 4.5 阴影系统（5 层）

| 变量 | 值 | 层级 | 用途 |
|------|-----|------|------|
| `--hdm-shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | 最底层 | 输入框默认、卡片轻描 |
| `--hdm-shadow-sm` | `0 2px 8px rgba(0,0,0,0.06)` | 低层 | 小浮层、下拉选项 |
| `--hdm-shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | 中层 | 面板、卡片、多选工具栏 |
| `--hdm-shadow-lg` | `0 8px 28px rgba(139,92,246,0.15)` | 高层 | 工具栏、编辑面板（紫调阴影） |
| `--hdm-shadow-xl` | `0 20px 50px rgba(0,0,0,0.18)` | 最高层 | 模态弹窗 |

### 4.6 过渡动画

| 变量 | 值 | 用途 |
|------|-----|------|
| `--hdm-transition-fast` | `120ms cubic-bezier(0.4, 0, 0.2, 1)` | 微交互（按钮按下、输入框focus） |
| `--hdm-transition-base` | `180ms cubic-bezier(0.4, 0, 0.2, 1)` | 标准过渡（hover、颜色变化） |
| `--hdm-transition-slow` | `250ms cubic-bezier(0.4, 0, 0.2, 1)` | 较大变化（面板展开、弹窗入场） |

---

## 五、主要架构

### 5.1 CSS 架构分层

```
┌──────────────────────────────────────────────────────┐
│  1. CSS 变量与基础重置（Variables & Reset）            │
│     - 设计令牌（颜色/字体/间距/圆角/阴影/动画）         │
│     - 全局滚动条样式                                   │
├──────────────────────────────────────────────────────┤
│  2. 基础原子组件（Base Components）                    │
│     ├─ 按钮（主/次/危险/幽灵/小按钮/图标按钮）          │
│     ├─ 输入框（文本/文本域/数字）                      │
│     ├─ 下拉框（自定义 select）                         │
│     ├─ 复选框（自定义 checkbox）                       │
│     ├─ 颜色选择器（色板 + 输入框）                     │
│     └─ 标签/徽章/提示条                                │
├──────────────────────────────────────────────────────┤
│  3. 页面标记视觉（Mark Visuals）                       │
│     ├─ 选中态/修改态/悬停高亮/多选高亮                 │
│     ├─ 编号徽章（选中/修改/组合）                      │
│     ├─ 删除角标                                        │
│     ├─ 8 方向拖拽把手                                  │
│     ├─ 尺寸/坐标浮窗                                   │
│     └─ 对齐辅助线                                      │
├──────────────────────────────────────────────────────┤
│  4. 浮层组件（Floating UI）                            │
│     ├─ 工具栏（三态：隐藏/唤醒/完整）                   │
│     ├─ 唤醒按钮（渐变圆形）                             │
│     └─ 多选工具栏                                      │
├──────────────────────────────────────────────────────┤
│  5. 检查面板（Inspector Panel）                        │
│     ├─ 面板整体框架                                    │
│     ├─ 面板头部（渐变 + 控制按钮）                     │
│     ├─ 元素信息区（选择器 + 复制按钮）                  │
│     ├─ 大小调整选项区（复选框）                        │
│     ├─ 组件标签输入                                    │
│     ├─ 修改说明文本域（含预览按钮）                    │
│     ├─ 链接/跳转链接输入                               │
│     ├─ 样式编辑区（11 个属性 + 统计条）                │
│     ├─ 位置调整区（2 个属性 + 微调按钮）               │
│     ├─ 大小调整区（2 个属性 + 单位切换 + 微调）         │
│     ├─ 图片替换区（仅 img）                            │
│     ├─ HTML 编辑区（原始 + 修改）                      │
│     ├─ 底部操作栏（删除 + 保存）                       │
│     └─ 右下角拖拽把手                                  │
├──────────────────────────────────────────────────────┤
│  6. 组合编辑面板（Group Inspector）                    │
│     └─ 缩放滑块 + 子元素列表 + 解散/删除按钮           │
├──────────────────────────────────────────────────────┤
│  7. 弹窗与通知（Modal & Feedback）                     │
│     ├─ 模态框（遮罩 + 容器 + 头部 + 内容 + 底部）       │
│     ├─ Toast（4 种类型 + 入场动画）                    │
│     └─ 加载/确认/提示等状态                           │
└──────────────────────────────────────────────────────┘
```

---

## 六、各组件详细设计

### 6.1 工具栏 (Toolbar)

#### 6.1.1 整体框架

| 属性 | 值 |
|------|-----|
| 定位 | `position: fixed`，默认右上角 |
| 最小宽度 | `280px` |
| 背景 | `--hdm-bg-white` |
| 圆角 | `--hdm-radius-xl` (12px) |
| 阴影 | `--hdm-shadow-lg`（紫色调阴影） |
| 溢出 | `hidden` |
| 布局 | `flex-direction: column` |
| z-index | 极高（9999999） |

#### 6.1.2 头部区域（紫色渐变）

```
┌──────────────────────────────────────┐
│  ✨ HTML Diff Marker          [ − ] [×] │  ← 渐变紫色背景，白色文字
│  已激活 · 3 标记 / 2 修改              │  ← 次级文字，稍小
└──────────────────────────────────────┘
```

**设计细节**：

- **背景**：`var(--hdm-gradient-header)`（135deg 渐变）
- **内边距**：`12px 16px 10px`
- **布局**：flex 列布局（标题行 + 状态行）
- **可拖拽**：整个头部可拖拽

**标题行**：
- 左侧：图标（✨ 或 logo，20px）+ 标题文字 "HTML Diff Marker"
  - 图标大小：18px
  - 标题字号：`--hdm-text-lg` (14px)，semibold，白色
  - 间距：图标与文字间距 8px
- 右侧：控制按钮组（最小化 + 关闭）
  - 按钮尺寸：26x26px
  - 背景：`rgba(255,255,255,0.15)`
  - 图标：白色，16px
  - 圆角：`--hdm-radius-sm`
  - 间距：两个按钮间距 6px

**状态行**：
- 左侧：状态指示
  - 绿点（表示已激活）+ "已激活" 文字
  - 文字：11px，`--hdm-text-white-sub`
- 右侧：计数摘要
  - "3 标记 / 2 修改"
  - 文字：11px，`--hdm-text-white-sub`
  - 修改数用 `#FDE68A`（浅黄）突出显示

**控制按钮状态**：
| 状态 | 背景 | 图标颜色 |
|------|------|---------|
| 默认 | `rgba(255,255,255,0.15)` | 白色 |
| hover | `rgba(255,255,255,0.28)` | 白色 |
| active | `rgba(255,255,255,0.38)` | 白色 |

#### 6.1.3 功能按钮区（主体）

**布局结构**：

```
┌──────────────────────────────────────┐
│  [🎯选择] [📋复制] [➕添加] [🗑删除]  │  ← 第一行：4 个图标按钮
│                                      │
│  [   🗑 清空所有   ] [ 📄 导出 Diff ]  │  ← 第二行：2 个大按钮
│                                      │
│  共 5 个标记  ·  2 个已修改    ⌥E 切换 │  ← 计数/快捷键行
└──────────────────────────────────────┘
```

**第一行按钮（4 个，图标 + 文字竖排）**：

每个按钮：
- 尺寸：等宽，高度 56px
- 布局：flex 列，居中对齐
- 内边距：8px 4px
- 背景：`--hdm-bg-soft`
- 边框：`1px solid --hdm-border`
- 圆角：`--hdm-radius-md` (8px)
- 间距：gap 8px
- 过渡：all `--hdm-transition-base`

**按钮内容**：
- 图标：18px，颜色 `--hdm-text-secondary`
- 文字：11px，medium，颜色 `--hdm-text-secondary`
- 图标与文字间距：4px

**Hover 状态**：
- 背景：`--hdm-primary-bg`
- 边框：`1px solid --hdm-primary-light`
- 图标颜色：`--hdm-primary`
- 文字颜色：`--hdm-primary`
- transform: `translateY(-1px)`
- 阴影：`0 2px 8px rgba(139,92,246,0.15)`

**Active 状态**：
- 背景：`var(--hdm-primary-bg-soft)`
- transform: `translateY(0)`
- 阴影：无

**禁用状态**：
- 不透明度：0.45
- 光标：not-allowed
- 无 hover 效果

**4 个按钮**：
| 按钮 | 图标 | 文字 | 类型 |
|------|------|------|------|
| 选择元素 | 🎯 | 选择元素 | 主色强调（选中时变为 primary 背景） |
| 复制当前 | 📋 | 复制当前 | 次要 |
| 添加元素 | ➕ | 添加元素 | 次要 |
| 删除当前 | 🗑 | 删除当前 | 危险（hover 变红） |

> **选择按钮特殊状态**：当进入选择模式时，按钮背景变为 `var(--hdm-gradient-btn-primary)`，图标和文字变为白色。

**第二行按钮（2 个大按钮）**：

每个按钮：
- 尺寸：flex: 1，高度 40px
- 圆角：`--hdm-radius-md`
- 字号：12px，semibold
- 间距：gap 8px

**「清空所有」按钮**：
- 类型：次要按钮
- 背景：白色
- 边框：`1px solid --hdm-border`
- 文字颜色：`--hdm-text-secondary`
- Hover：背景 `--hdm-bg-hover`，文字 `--hdm-text-primary`

**「导出 Diff」按钮**：
- 类型：主按钮（渐变）
- 背景：`var(--hdm-gradient-btn-primary)`
- 文字颜色：白色
- 阴影：`0 2px 8px rgba(139,92,246,0.3)`
- Hover：`var(--hdm-gradient-btn-primary-hover)`，阴影加深，`translateY(-1px)`

#### 6.1.4 计数/快捷键行

- 背景：`--hdm-bg-soft`
- 内边距：`8px 14px`
- 布局：flex，两端对齐
- 字号：11px

**左侧（计数）**：
- 「共 5 个标记」：颜色 `--hdm-text-secondary`
- 「 · 2 个已修改」：颜色 `--hdm-warning`，medium

**右侧（快捷键）**：
- 「⌥E 切换」：颜色 `--hdm-text-tertiary`
- 字体稍小：10px

#### 6.1.5 工具栏三态切换

```
隐藏态 → 唤醒态 → 完整态 → 隐藏态 ...
```

- **隐藏态**：完全不显示
- **唤醒态**：仅显示唤醒按钮（渐变圆形）
- **完整态**：显示完整工具栏

---

### 6.2 唤醒按钮 (Wake Button)

| 属性 | 值 |
|------|-----|
| 形状 | 圆形，44x44px |
| 背景 | `var(--hdm-gradient-btn-primary)` |
| 阴影 | `0 6px 20px rgba(139,92,246,0.4)` |
| 图标 | 白色，✎ 或 ◎，18px |
| 位置 | 右上角，与工具栏初始位置一致 |
| 光标 | pointer |
| 过渡 | all `--hdm-transition-base` |

**状态**：
| 状态 | 效果 |
|------|------|
| 默认 | `display: flex`，居中对齐 |
| Hover | `transform: scale(1.1)`，阴影加深（`0 8px 24px rgba(139,92,246,0.5)`） |
| Active | `transform: scale(0.95)`，阴影变浅 |
| 脉冲 | 首次出现时有 1 次呼吸脉冲动画（opacity 0.7→1，scale 0.9→1） |

---

### 6.3 检查面板 (Inspector Panel)

#### 6.3.1 整体框架

| 属性 | 值 |
|------|-----|
| 定位 | `position: fixed`，默认左下角 |
| 默认尺寸 | 440 x 620px |
| 最小尺寸 | 320 x 200px |
| 背景 | `--hdm-bg-white` |
| 边框 | `1px solid --hdm-border` |
| 圆角 | `--hdm-radius-xl` (12px) |
| 阴影 | `--hdm-shadow-lg` |
| 布局 | `flex-direction: column` |
| 溢出 | `hidden` |
| z-index | 极高（9999999） |

#### 6.3.2 面板头部（紫色渐变）

```
┌──────────────────────────────────────────────────┐
│  编辑组件 #1 (div)          [ − ] [ × ]         │  ← 渐变紫 + 白字
│  选择器：.container > .card                      │  ← 次级信息
└──────────────────────────────────────────────────┘
```

**设计细节**：

- **背景**：`var(--hdm-gradient-header)`
- **内边距**：`12px 16px 10px`
- **布局**：flex 列布局
- **可拖拽**：整个头部可拖拽

**标题行**：
- 左侧：标题文字
  - 主标题：14px，semibold，白色
  - 格式："编辑组件 #N (tagName)"
- 右侧：控制按钮组
  - 最小化（−）+ 关闭（×）
  - 与工具栏控制按钮样式一致：26x26px，`rgba(255,255,255,0.15)` 背景

**选择器行**（状态行）：
- 文字：11px，`--hdm-text-white-sub`
- 显示元素选择器路径
- 右侧有复制按钮（小，透明背景，白色图标）

#### 6.3.3 面板主体（滚动区域）

- 内边距：`14px 16px`
- 背景：白色
- 溢出：auto（自定义滚动条）
- flex: 1

#### 6.3.4 大小调整选项区

- 类名：`html-diff-marker-style-section`
- 下边距：14px
- 底部分隔线：`1px solid --hdm-divider`

**标题**：
- 文字："⚙️ 大小调整选项"
- 字号：13px，semibold
- 颜色：`--hdm-text-primary`
- 下边距：10px

**复选框行**：
- 布局：flex，align-items center，gap 8px
- 复选框：自定义 16x16px 紫色样式
- 标签文字：12px，`--hdm-text-secondary`
- 标签可点击，光标 pointer
- 文字："同步缩放子元素（滚轮缩放/拖拽大小时，子元素样式同步缩放）"

#### 6.3.5 组件标签输入

- 类名：`html-diff-marker-field-row`
- 下边距：14px

**标签**：
- 显示：block
- 下边距：6px
- 字号：12px，semibold
- 颜色：`--hdm-text-primary`
- 文字："组件标签"

**输入框**：
- 样式参考「基础输入框」
- 高度：36px
- 占位符文字：可留空或 "输入自定义标签名..."

#### 6.3.6 修改说明文本域

- 类名：`html-diff-marker-field-row`
- 下边距：14px

**标签头**：
- 布局：flex，两端对齐，align-items center
- 下边距：6px

**左侧标签**：
- 字号：12px，semibold
- 颜色：`--hdm-text-primary`
- 文字："修改说明（给 AI Agent 看）"

**右侧「预览链接」按钮**：
- 类型：小按钮，幽灵样式
- 高度：22px
- 内边距：0 10px
- 字号：10px，medium
- 背景：`--hdm-bg-soft`
- 边框：`1px solid --hdm-border`
- 圆角：`--hdm-radius-xs`
- 颜色：`--hdm-text-secondary`
- Hover：背景 `--hdm-primary-bg`，颜色 `--hdm-primary`，边框 `--hdm-primary-light`

**文本域**：
- 样式参考「基础文本域」
- 最小高度：80px
- 字号：12px，行高 1.6
- 占位符：提示支持 Markdown 链接格式

**预览区**（点击预览后显示）：
- 上边距：6px
- 内边距：8px 10px
- 背景：`--hdm-bg-soft`
- 边框：`1px solid --hdm-border`
- 圆角：`--hdm-radius-xs`
- 字号：12px
- 颜色：`--hdm-text-primary`
- 链接颜色：`--hdm-primary`，带下划线
- word-break: break-all

#### 6.3.7 链接地址 / 跳转链接

根据元素类型显示其中一种：

**对 `<a>` 元素：显示「链接地址 (href)」**
- 标签："链接地址 (href)"
- 输入框：普通文本输入框
- 占位符："输入链接地址，如 https://example.com"

**对非 `<a>` 元素：显示「跳转链接」**
- 标签："跳转链接 (点击元素时跳转)"
- 输入框：普通文本输入框
- 占位符："输入链接地址，如 https://example.com（为空则不跳转）"

#### 6.3.8 样式编辑区（核心分组）

**分组头部**：
- 布局：flex，两端对齐，align-items center
- 下边距：12px
- 标题："🎨 样式编辑"，13px，semibold，`--hdm-text-primary`
- 「重置全部」按钮：参考「小按钮-次要」样式，文字 "↺ 重置全部"

**分组容器**：
- 类名：`html-diff-marker-style-section`
- 底部边框：`1px solid --hdm-divider`
- 下边距：16px
- 最后一个分组：无边框、无下边距

**属性行（通用结构）**：
```
┌──────────────────────────────────────────────────┐
│  属性标签                                         │  ← 11px，灰色
│  [主控件...]                              [↺]    │  ← 输入控件 + 重置按钮
│  (可选：提示条/帮助文字)                          │
└──────────────────────────────────────────────────┘
```

每一行：
- 下边距：10px
- 最后一行：下边距 0

**属性标签**：
- 显示：block
- 下边距：5px
- 字号：11px，medium
- 颜色：`--hdm-text-secondary`
- letter-spacing: 0.01em

**输入控件行**：
- 布局：flex，gap: 6px，align-items center

**重置按钮**：
- 尺寸：28x28px
- 背景：`--hdm-error-bg`
- 边框：`1px solid --hdm-error-border`
- 圆角：`--hdm-radius-xs`
- 颜色：`--hdm-error`
- 字号：14px
- 光标：pointer
- flex-shrink: 0
- 过渡：all `--hdm-transition-fast`
- Hover：背景 `#FEE2E2`，边框 `#FCA5A5`
- title: "重置此属性"

---

#### 6.3.9 样式属性行详细设计（共 11 个）

##### ① 背景颜色（color 类型）

**控件组**：
1. 颜色选择器（30x30px）
2. 文本输入框（flex: 1）
3. 重置按钮（28x28px）

**颜色选择器设计**：
- 宽度：30px
- 高度：30px
- 背景：白色
- 边框：`1px solid --hdm-border`
- 圆角：`--hdm-radius-xs`
- 光标：pointer
- 内部：嵌套一个颜色块（inset 3px，圆角 3px）
- Hover：边框 `--hdm-primary`
- 过渡：all `--hdm-transition-fast`

**文本输入框**：
- 高度：30px
- 字号：11px，monospace
- flex: 1

##### ② 背景图片（image 类型）

**整体布局**：
- 属性标签在上方
- 下方为 contentWrap（水平 flex）：
  - 左侧：imageWrap（垂直 flex，flex: 1）
    - 预览图（100% 宽，120px 高）
    - 信息文字区
    - 按钮区（选择图片 / 移除图片）
  - 右侧：inpWrap（重置按钮）

**预览图**：
- 宽度：100%
- 高度：120px
- 背景：`--hdm-bg-soft`
- 边框：`1px solid --hdm-border`
- 圆角：`--hdm-radius-xs`
- 背景图：contain / cover（根据设置），center，no-repeat
- 空状态：居中显示「无图」，10px，`--hdm-text-tertiary`

**信息文字**：
- 字号：11px
- 颜色：`--hdm-text-tertiary`
- 行高：1.4
- word-break: break-all

**按钮**（全宽）：
- 高度：28px
- 字号：11px，medium
- 圆角：`--hdm-radius-xs`
- 选择图片：主色幽灵按钮样式（紫底紫字浅）
- 移除图片：危险幽灵按钮样式（红底红字浅）

**未持久化警告**：
- 位置：contentWrap 下方，row 内
- 样式：橙色小提示，11px
- 文字："⚠ 未保存（刷新后丢失）"

##### ③ 文本颜色（color 类型）

同背景颜色行：颜色选择器 + 文本输入 + 重置按钮

##### ④ 字体（select 类型 + 特殊处理）

**控件组**：
1. 下拉选择框（flex: 1）
2. 添加字体按钮（30x28px，+）
3. 重置按钮（28x28px）

**下拉框**：
- 高度：30px
- 内边距：0 28px 0 8px（右侧留箭头空间）
- 字号：11px
- 背景：白色
- 边框：`1px solid --hdm-border`
- 圆角：`--hdm-radius-xs`
- 右侧箭头：绝对定位，紫灰色小三角（Chevron down）

**添加字体按钮**：
- 尺寸：28x28px
- 背景：`--hdm-success-bg`
- 边框：`1px solid --hdm-success-border`
- 圆角：`--hdm-radius-xs`
- 颜色：`--hdm-success`
- 字号：16px，bold
- 光标：pointer
- title: "添加自定义字体"
- Hover：背景 `#D1FAE5`

**字体提示条（下方）**：

三态设计：

| 状态 | 背景 | 边框 | 文字 | 图标 |
|------|------|------|------|------|
| 预览失败 | `--hdm-warning-bg` | `--hdm-warning-border` | `#92400E` | ⚠ 黄色 |
| 引导（无自定义） | `--hdm-info-bg` | `--hdm-info-border` | `#1E40AF` | ℹ 蓝色 |
| 预览正常 | `--hdm-success-bg` | `--hdm-success-border` | `#065F46` | ✓ 绿色 |

提示条样式：
- 上边距：6px
- 内边距：8px 10px
- 圆角：`--hdm-radius-xs`
- 字号：11px
- 行高：1.4
- 布局：flex，align-items flex-start，gap 6px

**删除字体按钮（提示条下方）**：
- 宽度：100%
- 高度：28px
- 上边距：6px
- 背景：`--hdm-error-bg`
- 边框：`1px solid --hdm-error-border`
- 圆角：`--hdm-radius-xs`
- 颜色：`--hdm-error`
- 字号：11px，medium
- 光标：pointer
- 文字："删除此自定义字体"

##### ⑤ 字体粗细（select 类型）

下拉选择框 + 重置按钮

选项：300 细体 / 400 常规 / 500 中等 / 600 半粗 / 700 粗体 / 800 特粗

##### ⑥ 字体大小（text 类型）

文本输入框 + 重置按钮
占位符：如 "14px"

##### ⑦ 内边距（text 类型）

文本输入框 + 重置按钮
占位符：如 "10px 20px"

##### ⑧ 外边距（text 类型）

文本输入框 + 重置按钮
占位符：如 "5px 10px"

##### ⑨ 圆角（text 类型）

文本输入框 + 重置按钮
占位符：如 "8px"

##### ⑩ 边框（text 类型）

文本输入框 + 重置按钮
占位符：如 "1px solid #ccc"

##### ⑪ 显示方式（select 类型）

下拉选择框 + 重置按钮
选项：(默认) / block / inline-block / inline / flex / grid / none

**样式统计条**：
- 上边距：10px
- 内边距：8px 10px
- 背景：`--hdm-primary-bg`
- 颜色：`--hdm-primary-dark`
- 圆角：`--hdm-radius-xs`
- 字号：11px，medium
- 文字：居中，"已修改 N 个样式属性"

---

#### 6.3.10 位置调整分组

**分组头部**：
- 标题："📍 位置调整"
- 右侧重置按钮："↺ 重置"（小按钮）

**两个属性行**：X（左偏移）+ Y（上偏移）

**每个属性行结构**：
```
┌──────────────────────────────────────────────────┐
│  X (左偏移)                                      │
│  [输入框] [-10] [-1] [+1] [+10] [↺]             │
└──────────────────────────────────────────────────┘
```

**微调按钮（±1, ±10）**：
- 尺寸：28x28px
- 背景：`--hdm-bg-soft`
- 边框：`1px solid --hdm-border`
- 圆角：`--hdm-radius-xs`
- 字号：11px，bold
- 颜色：`--hdm-text-secondary`
- 光标：pointer
- flex-shrink: 0
- 过渡：all `--hdm-transition-fast`
- Hover：背景 `--hdm-primary-bg`，颜色 `--hdm-primary`，边框 `--hdm-primary-light`
- Active：背景 `--hdm-primary-bg-soft`

> 共 4 个微调按钮，从左到右：-10, -1, +1, +10

---

#### 6.3.11 大小调整分组

**分组头部**：
- 标题："📐 大小调整"
- 右侧按钮组：
  - 单位切换按钮："px" / "%" 切换
    - 样式：小按钮，幽灵式
    - 高度：22px
    - 内边距：0 8px
    - 字号：10px，medium
    - title: "切换单位 px / %"
  - 重置按钮："↺ 重置"

**两个属性行**：宽度 + 高度
结构同位置调整：输入框 + 4 个微调按钮 + 重置按钮

---

#### 6.3.12 图片替换区（仅 img 元素）

**分组头部**：
- 标题："🖼 图片替换"
- 右侧重置按钮："↺ 恢复原图"

**内容区**：
- 预览图（100% 宽，120px 高）
- 信息文字（当前图片地址/大小）
- 操作按钮：「选择本地图片替换」、「恢复原始图片」
- 未持久化警告（如有）

样式与背景图片区一致（垂直布局）

---

#### 6.3.13 HTML 编辑区

**原始 HTML（只读）**：
- 标签："原始 HTML（参考）"，12px，semibold
- 文本域：3 行，只读，等宽字体，11px
- 背景：`--hdm-bg-soft`
- 边框：`1px solid --hdm-border`
- 颜色：`--hdm-text-secondary`

**修改后 HTML（可编辑）**：
- 标签："修改后的 HTML"，12px，semibold
- 文本域：3 行，可编辑，等宽字体，11px
- 占位符："在此输入修改后的 HTML 代码..."
- 下边距：14px

---

#### 6.3.14 元素信息区

- 位置：面板主体底部
- 背景：`--hdm-bg-soft`
- 边框：`1px solid --hdm-border`
- 圆角：`--hdm-radius-xs`
- 内边距：10px 12px
- 字号：11px，monospace
- 颜色：`--hdm-text-secondary`
- word-break: break-all
- 行高：1.5

**内容**：`elementInfo(el) + " | selector: " + entry.selector`

---

#### 6.3.15 底部操作栏

- 背景：`--hdm-bg-soft`
- 顶部边框：`1px solid --hdm-border`
- 内边距：`12px 16px`
- 布局：flex，gap: 10px

**按钮**：

| 按钮 | 宽度 | 类型 |
|------|------|------|
| 🗑 删除 | flex: 1 | 危险按钮（白底红字红边） |
| ✓ 保存修改 | flex: 1.2 | 主按钮（渐变紫底白字） |

**按钮尺寸**：
- 高度：38px
- 圆角：`--hdm-radius-md`
- 字号：12px，semibold

**保存按钮**（主按钮）：
- 背景：`var(--hdm-gradient-btn-primary)`
- 文字：白色
- 阴影：`0 2px 8px rgba(139,92,246,0.3)`
- Hover：渐变变亮，`translateY(-1px)`，阴影加深
- Active：按下效果

**删除按钮**（危险-次要）：
- 背景：白色
- 边框：`1px solid --hdm-error-border`
- 文字：`--hdm-error`
- Hover：背景 `--hdm-error-bg`

---

#### 6.3.16 右下角拖拽把手

- 位置：absolute，right: 0, bottom: 0
- 宽度：16px，高度：16px
- 光标：nwse-resize
- 背景：`linear-gradient(135deg, transparent 50%, var(--hdm-primary-light) 50%)`
- z-index: 10
- 右下角圆角：与面板一致（12px 的右下角）
- Hover：渐变颜色加深为 `--hdm-primary`
- 过渡：all `--hdm-transition-fast`

---

#### 6.3.17 组合编辑面板（简化版）

- 头部："组合标记（N 个元素）"
- 元素信息区：显示元素数量 + 缩放比例
- 缩放滑块区
- 子元素列表（可滚动）
- 底部操作栏：解散组合 + 删除组合

---

### 6.4 多选工具栏

#### 6.4.1 整体框架

| 属性 | 值 |
|------|-----|
| 位置 | 多选区域上方居中（距离选区顶部 12px） |
| 背景 | `--hdm-bg-white` |
| 边框 | `1px solid --hdm-border` |
| 圆角 | `--hdm-radius-md` (8px) |
| 阴影 | `--hdm-shadow-md` |
| 内边距 | `6px 10px` |
| 布局 | flex，align-items center，gap: 8px |

#### 6.4.2 按钮设计

**4 个按钮从左到右**：

| 按钮 | 类型 | 默认样式 |
|------|------|---------|
| 🔗 组合标记 | 主色小按钮 | 紫色渐变背景 + 白色文字 |
| 📋 复制选中 | 次要小按钮 | 白底 + 灰字 + 灰边 |
| 🗑 删除选中 | 危险小按钮 | 白底 + 红字 + 红边 |
| ✕ 取消选择 | 幽灵小按钮 | 浅灰底 + 灰字 + 灰边 |

**按钮基础尺寸**：高度 28px，内边距 0 12px，圆角 `--hdm-radius-xs`，字号 11px medium

#### 6.4.3 按钮交互状态（active / 选中态）

> **核心交互规则**：「组合标记」按钮为**触发式按钮**（点击后立即执行操作，工具栏随之消失），无持久选中态；其余按钮均为普通瞬时按钮。

**各按钮状态详解**：

| 按钮 | Hover 态 | Active（按下）态 | 选中/激活态（持久） |
|------|---------|----------------|-------------------|
| 🔗 组合标记 | 渐变变亮 + 轻微上浮 + 阴影加深 | 渐变变暗 + 按下 + 阴影变浅 | **无持久选中态**（点击后立即执行组合操作，多选工具栏消失） |
| 📋 复制选中 | 紫底紫字 + 浅紫边框 | 深紫底 + 深紫字 | **无持久选中态**（瞬时操作，点击后立即复制） |
| 🗑 删除选中 | 浅红底 + 深红字 + 红边 | 深红底 + 深红字 | **无持久选中态**（瞬时操作，点击后立即删除） |
| ✕ 取消选择 | 深灰字 + 深灰边框 | 更深灰底 | **无持久选中态**（点击后取消多选，工具栏消失） |

**特殊状态说明**：

- **禁用态（disabled）**：当选中元素数量为 0 或不满足操作条件时，对应按钮变为禁用态（不透明度 0.45，光标 not-allowed，无 hover 效果）
  - 组合标记：选中数 < 2 时禁用
  - 复制选中：选中数 < 1 时禁用
  - 删除选中：选中数 < 1 时禁用

- **「组合标记」按钮点击反馈**：
  - 点击瞬间：active 按下态（渐变变暗 + 轻微下沉）
  - 操作执行中：按钮进入 loading 态（显示 spinner，文字变浅）
  - 操作完成：多选工具栏随多选状态一起消失（无需持久高亮）

- **JS 逻辑对应**：
  - 按钮切换 `html-diff-marker-btn--active` 类名用于瞬时 active 态
  - 无需新增持久 active 类切换逻辑（因无持久选中态按钮）
  - disabled 态通过 `html-diff-marker-btn--disabled` 类名控制，JS 需根据选中数量动态切换

#### 6.4.4 计数标签

- 字号：11px，`--hdm-text-tertiary`
- 左边距：4px
- 文字："已选 N 个元素"
- 当选中数量 > 0 时，数字颜色变为 `--hdm-primary`，medium 字重

---

### 6.5 按钮系统 (Button)

#### 6.5.1 按钮类型总览

| 类型 | 背景 | 文字 | 边框 | 使用场景 |
|------|------|------|------|---------|
| **主按钮 Primary** | 紫色渐变 | 白色 | 无 | 保存、导出、确认 |
| **次要按钮 Secondary** | 白色 | 深灰 | 灰色 | 取消、复制、次要操作 |
| **危险按钮 Danger** | 白色 | 红色 | 浅红 | 删除、移除 |
| **幽灵按钮 Ghost** | 透明/浅灰 | 灰色 | 浅灰 | 重置、小型操作 |
| **成功按钮 Success** | 白色/浅绿 | 绿色 | 浅绿 | 成功操作（少用） |
| **图标按钮 Icon** | 透明 | 灰色 | 无 | 关闭、最小化 |

#### 6.5.2 主按钮 (Primary)

```
┌─────────────┐
│  保存修改    │  ← 默认：渐变紫底白字
└─────────────┘
```

| 状态 | 背景 | 阴影 | transform |
|------|------|------|-----------|
| 默认 | `linear-gradient(135deg, #8B5CF6, #7C3AED)` | `0 2px 8px rgba(139,92,246,0.3)` | - |
| Hover | `linear-gradient(135deg, #A78BFA, #8B5CF6)` | `0 4px 14px rgba(139,92,246,0.4)` | `translateY(-1px)` |
| Active | `linear-gradient(135deg, #7C3AED, #6D28D9)` | `0 1px 4px rgba(139,92,246,0.3)` | `translateY(0)` |
| Disabled | `#D1D5DB` | - | - |

#### 6.5.3 次要按钮 (Secondary)

| 状态 | 背景 | 边框 | 文字颜色 |
|------|------|------|---------|
| 默认 | `#FFFFFF` | `1px solid #E5E7EB` | `#4B5563` |
| Hover | `#EDE9FE` | `1px solid #A78BFA` | `#8B5CF6` |
| Active | `#E0E7FF` | `1px solid #8B5CF6` | `#7C3AED` |
| Disabled | `#F3F4F6` | `1px solid #E5E7EB` | `#9CA3AF` |

#### 6.5.4 危险按钮 (Danger)

| 状态 | 背景 | 边框 | 文字颜色 |
|------|------|------|---------|
| 默认 | `#FFFFFF` | `1px solid #FECACA` | `#EF4444` |
| Hover | `#FEF2F2` | `1px solid #EF4444` | `#DC2626` |
| Active | `#FEE2E2` | `1px solid #DC2626` | `#B91C1B` |
| Disabled | `#F9FAFB` | `1px solid #FECACA` | `#FCA5A5` |

#### 6.5.5 幽灵/小型按钮

用于「重置全部」、「预览链接」、分组重置等：

- 高度：24px
- 内边距：0 10px
- 字号：11px，medium
- 圆角：`--hdm-radius-xs`
- 背景：`--hdm-bg-soft`
- 边框：`1px solid --hdm-border`
- 颜色：`--hdm-text-secondary`
- Hover：背景 `--hdm-primary-bg`，颜色 `--hdm-primary`，边框 `--hdm-primary-light`

---

### 6.6 输入框系统 (Input)

#### 6.6.1 文本输入框 (Text Input)

| 状态 | 边框 | 背景 | 阴影 | 文字颜色 |
|------|------|------|------|---------|
| 默认 | `1px solid #E5E7EB` | `#FFFFFF` | - | `#1F2937` |
| Hover | `1px solid #D1D5DB` | `#FFFFFF` | - | `#1F2937` |
| Focus | `1px solid #8B5CF6` | `#FFFFFF` | `0 0 0 3px rgba(139,92,246,0.15)` | `#1F2937` |
| Disabled | `1px solid #E5E7EB` | `#F3F4F6` | - | `#9CA3AF` |
| Error | `1px solid #EF4444` | `#FFFFFF` | `0 0 0 3px rgba(239,68,68,0.12)` | `#1F2937` |

**通用样式**：
- 高度：30px（小）/ 36px（标准）/ 40px（大）
- 内边距：0 10px（小）/ 0 12px（标准）
- 字号：11px（小，monospace）/ 12px（标准）
- 圆角：`--hdm-radius-xs`（小）/ `--hdm-radius-sm`（标准）
- 过渡：border-color `--hdm-transition-fast`, box-shadow `--hdm-transition-fast`
- 占位符颜色：`--hdm-text-disabled`
- 字体：根据场景使用默认字体或等宽字体

#### 6.6.2 文本域 (Textarea)

- 高度：auto，最小高度 60px
- 内边距：8px 10px
- 边框、圆角、状态同文本输入框
- resize: vertical
- 行高：1.6
- 字号：12px

#### 6.6.3 下拉框 (Select)

##### 实现方式决策

> **实现方案：美化原生 `<select>` + 外层视觉包装（非完全自定义 div）**
>
> **理由**：
> 1. 原生 `<select>` 的下拉选项（`<option>`）由浏览器原生渲染，无障碍访问和键盘操作天然支持
> 2. 选项数量少（字体 20 项以内、字体粗细 7 项、显示方式 8 项），自定义选项列表的收益不大
> 3. 保留原生事件机制（`change`、`value` 属性），JS 逻辑零改动
> 4. 外层包装 div 可实现统一的边框、背景、箭头、focus 光晕等视觉效果
> 5. 风险低、开发成本低，符合本次"纯 CSS 重设计、功能逻辑不变"的范围边界

**DOM 结构（新增外层包装）**：
```html
<!-- 原结构 -->
<select class="html-diff-marker-select">
  <option>选项1</option>
</select>

<!-- 新结构（外层增加包装 div） -->
<div class="html-diff-marker-select-wrap">
  <select class="html-diff-marker-select">
    <option>选项1</option>
  </select>
  <span class="html-diff-marker-select-arrow">▾</span>
</div>
```

##### 视觉设计

**外层包装容器**：
- 类名：`html-diff-marker-select-wrap`
- 高度：30px
- 边框、圆角、状态（hover/focus/disabled/error）同文本输入框
- 背景：白色
- 定位：relative
- 过渡：border-color `--hdm-transition-fast`, box-shadow `--hdm-transition-fast`

**原生 select 本身**：
- 宽度：100%
- 高度：100%
- 内边距：0 28px 0 8px（右侧留箭头空间）
- 字号：11px
- 背景：transparent（透明，透出外层容器背景）
- 边框：none（移除外框，由外层容器提供）
- appearance: none（隐藏原生箭头）
- 光标：pointer
- outline: none（focus 状态由外层容器体现）

**自定义箭头**：
- 类名：`html-diff-marker-select-arrow`
- 位置：absolute，right: 8px, top: 50%, translateY(-50%)
- 样式：CSS 字符（▾）或 SVG 图标
- 颜色：`--hdm-text-tertiary`
- 大小：10px
- 指针事件：none（不阻挡 select 点击）
- 过渡：transform `--hdm-transition-fast`
- 展开态（focus/active）：箭头旋转 180°

**各状态样式**：

| 状态 | 外层容器边框 | 外层容器阴影 | 箭头颜色 |
|------|-------------|-------------|---------|
| 默认 | `1px solid #E5E7EB` | - | `--hdm-text-tertiary` |
| Hover | `1px solid #D1D5DB` | - | `--hdm-text-secondary` |
| Focus | `1px solid #8B5CF6` | `0 0 0 3px rgba(139,92,246,0.15)` | `--hdm-primary` |
| Disabled | `1px solid #E5E7EB` | - | `--hdm-text-disabled` |
| Error | `1px solid #EF4444` | `0 0 0 3px rgba(239,68,68,0.12)` | `--hdm-error` |

##### 下拉选项（option）样式说明

- **接受浏览器原生渲染差异**：option 的背景色和文字颜色在不同浏览器中表现不一致（Chrome 支持有限，Safari 几乎不支持）
- **可设置项**：
  - 选中项背景：尝试设置 `--hdm-primary-bg`（Chrome 支持，Safari 不生效则回退原生蓝色）
  - 选中项文字：尝试设置 `--hdm-primary`
  - 字号：11px（大部分浏览器支持）
- **不强制项**：
  - option 的 hover 态（由系统原生样式控制）
  - 自定义滚动条（下拉列表内的滚动条）

##### DOM 变更影响评估

| 评估项 | 结论 |
|--------|------|
| JS 事件绑定 | 无影响 — `change` 事件仍绑定原生 `<select>`，`el.value` 取值不变 |
| 选项动态增删 | 无影响 — 直接操作原生 `<select>` 的 options 即可 |
| 事件委托 | 无影响 — 外层包装 div 不拦截事件，点击透传到原生 select |
| 无障碍访问 | 提升 — 原生 select 的 ARIA 属性和键盘操作完全保留 |
| 现有 CSS 兼容 | 需调整 — 原直接作用于 select 的边框/背景样式需移除外框部分，改为作用于外层包装 |

#### 6.6.4 复选框 (Checkbox)

**自定义样式**：
- 尺寸：16x16px
- 圆角：4px
- 边框：`1.5px solid #D1D5DB`
- 背景：白色
- 光标：pointer
- 过渡：all `--hdm-transition-fast`

**选中状态**：
- 背景：`--hdm-primary`
- 边框：`--hdm-primary`
- 内部：白色 ✓ 勾（CSS 或 SVG）

**Hover 未选中**：
- 边框：`--hdm-primary`

**Disabled**：
- 不透明度：0.5
- 光标：not-allowed

---

### 6.7 颜色选择器 (Color Palette)

**颜色输入控件**：
- 由两部分组成：颜色预览块 + 文本输入框
- 颜色预览块：30x30px，左侧带边框
- 文本输入框：flex:1，显示 hex 值
- 点击颜色块打开原生颜色选择器

**增强设计（可选优化）**：
- 颜色块内部有渐变棋盘格背景（表示透明度）
- 颜色块内边距：3px
- Hover 时边框变紫色

---

### 6.8 模态弹窗 (Modal)

#### 6.8.1 遮罩层

- 背景：`rgba(15, 23, 42, 0.6)`
- backdrop-filter: `blur(3px)`（渐进增强）
- 动画：fade in 200ms
- z-index: 极高

#### 6.8.2 弹窗容器

| 属性 | 值 |
|------|-----|
| 最小宽度 | 380px |
| 最大宽度 | 90vw |
| 背景 | 白色 |
| 圆角 | `--hdm-radius-xl` (12px) |
| 阴影 | `--hdm-shadow-xl` |
| 溢出 | hidden |
| 动画 | scale 0.95→1 + fade in，200ms ease-out |

#### 6.8.3 弹窗头部

- 背景：`var(--hdm-gradient-header)`
- 内边距：`14px 20px`
- 文字：白色，14px，semibold
- 布局：flex，align-items center，两端对齐

#### 6.8.4 内容区

- 内边距：`20px`
- 字号：13px
- 行高：1.6
- 颜色：`--hdm-text-primary`

**表单字段**：
- 下边距：16px
- 标签：block，下边距 6px，12px，semibold
- 输入框：全宽，高度 40px
- 帮助文字：11px，`--hdm-text-tertiary`，上边距 6px
- 帮助文字中的 code：背景 `--hdm-bg-soft`，内边距 2px 6px，圆角 3px，monospace 10px

#### 6.8.5 底部按钮区

- 背景：`--hdm-bg-soft`
- 顶部边框：`1px solid --hdm-border`
- 内边距：`12px 20px`
- 布局：flex，justify-content flex-end，gap: 8px

**按钮**：
- 取消：次要按钮，高度 34px，内边距 0 18px
- 确定：主按钮，高度 34px，内边距 0 22px

---

### 6.9 操作反馈 (Feedback)

#### 6.9.1 Toast 提示

**通用样式**：
- 位置：顶部居中，top: 24px
- 内边距：`10px 18px`
- 圆角：`--hdm-radius-lg` (10px)
- 阴影：`0 6px 20px rgba(0,0,0,0.25)`
- 字号：12px，medium
- 布局：flex，align-items center，gap: 10px
- 最大宽度：80vw
- z-index: 最高
- 动画：滑入（从 -10px 滑入 + fade），200ms ease-out

**4 种类型**：

| 类型 | 背景 | 图标 | 文字 |
|------|------|------|------|
| 默认/信息 | `linear-gradient(135deg, #4C1D95, #6D28D9)` | ℹ | 白色 |
| 成功 | `linear-gradient(135deg, #065F46, #059669)` | ✓ | 白色 |
| 警告 | `linear-gradient(135deg, #92400E, #D97706)` | ⚠ | 白色 |
| 错误 | `linear-gradient(135deg, #991B1B, #DC2626)` | ✕ | 白色 |

**关闭按钮**：
- 透明背景
- 颜色：rgba(255,255,255,0.7)
- 字号：16px
- Hover：颜色白色
- 内边距：0 4px

#### 6.9.2 加载状态

- 按钮加载：显示旋转 spinner + 文字变浅
- Spinner：14px 圆形，白色边框，一侧透明形成旋转效果

---

### 6.10 样式分组 (Style Groups)

#### 6.10.1 分组结构

每个样式分组（位置调整、大小调整、样式编辑等）结构一致：

```
┌─ 分组标题 ────────────────── [操作按钮] ─┐
│                                         │
│  属性行 1                                │
│  属性行 2                                │
│  ...                                     │
│                                         │
│ （可选：统计/提示条）                     │
└─────────────────────────────────────────┘
（底部分隔线）
```

#### 6.10.2 分组标题

- 布局：flex，justify-content space-between，align-items center
- 下边距：12px
- 标题文字：13px，semibold，`--hdm-text-primary`
- 标题包含 emoji 图标（与文字间距 4px）

#### 6.10.3 分隔线

- 高度：1px
- 颜色：`--hdm-divider` (`#F3F4F6`)
- 上边距：16px
- 下边距：16px
- 最后一个分组无分隔线

#### 6.10.4 统计条 / 提示条

样式编辑区底部的统计条：
- 上边距：10px
- 内边距：8px 10px
- 背景：`--hdm-primary-bg`
- 颜色：`--hdm-primary-dark`
- 圆角：`--hdm-radius-xs`
- 字号：11px，medium
- 文字居中

---

### 6.11 拖拽与间距 (Drag & Spacing)

#### 6.11.1 8 方向拖拽把手

**基础样式**：
- 尺寸：12x12px
- 背景：白色
- 边框：`2px solid #8B5CF6`
- 圆角：50%
- 阴影：`0 1px 4px rgba(139,92,246,0.3)`
- 光标：对应方向的 resize 光标
- z-index: 极高
- 过渡：all `--hdm-transition-fast`

**8 个方向位置**：

| 把手 | 位置 | 光标 |
|------|------|------|
| n（上中） | top: -6px, left: calc(50% - 6px) | ns-resize |
| s（下中） | bottom: -6px, left: calc(50% - 6px) | ns-resize |
| e（右中） | top: calc(50% - 6px), right: -6px | ew-resize |
| w（左中） | top: calc(50% - 6px), left: -6px | ew-resize |
| ne（右上） | top: -6px, right: -6px | nesw-resize |
| nw（左上） | top: -6px, left: -6px | nwse-resize |
| se（右下） | bottom: -6px, right: -6px | nwse-resize |
| sw（左下） | bottom: -6px, left: -6px | nesw-resize |

**Hover 状态**：
- 背景：`#8B5CF6`
- 边框：`2px solid #7C3AED`
- `transform: scale(1.2)`
- 阴影：`0 2px 8px rgba(139,92,246,0.5)`

#### 6.11.2 尺寸/坐标浮窗

- 背景：`rgba(30, 27, 75, 0.92)`（深紫色半透明）
- 颜色：白色
- 字号：11px，semibold（数字等宽字体）
- 内边距：`6px 12px`
- 圆角：`--hdm-radius-sm` (6px)
- 阴影：`0 2px 10px rgba(0,0,0,0.3)`
- z-index: 极高
- 白色空格：nowrap
- 指针事件：none
- 行高：1.4

#### 6.11.3 对齐辅助线

**红色辅助线（保持语义）**：

垂直线：
- 宽度：1px
- 高度：100vh
- 背景：`#EF4444`
- 阴影：`0 0 4px rgba(239,68,68,0.5)`

水平线：
- 高度：1px
- 宽度：100vw
- 背景：`#EF4444`
- 阴影：`0 0 4px rgba(239,68,68,0.5)`

#### 6.11.4 间距系统应用规范

所有组件内边距、外边距必须使用设计令牌中的间距变量，禁止使用随意的像素值：

| 场景 | 推荐间距 |
|------|---------|
| 面板内边距 | 16px (--hdm-space-4) |
| 面板头部内边距 | 12-16px (--hdm-space-3/4) |
| 分组下边距 | 16px (--hdm-space-4) |
| 属性行下边距 | 10px |
| 标签与输入框间距 | 5-6px |
| 按钮之间 gap | 6-8px (--hdm-space-2) |
| 底部操作栏内边距 | 12px (--hdm-space-3) |

---

### 6.12 标记视觉系统

#### 6.12.1 选中态（未修改）

- 外框：`2px solid #8B5CF6`
- 外框偏移：2px
- 背景：`rgba(139,92,246,0.06)`
- 位置：relative

#### 6.12.2 修改态

- 外框：`2px solid #F59E0B`
- 外框偏移：2px
- 背景：`rgba(245,158,11,0.06)`
- 位置：relative

#### 6.12.3 编号徽章

**基础样式**：
- 位置：absolute，top: -10px, right: -10px
- 背景：`#8B5CF6`（选中态）/ `#F59E0B`（修改态）/ `#7C3AED`（组合）
- 颜色：白色
- 字体：11px，bold
- 内边距：`3px 9px`
- 圆角：9999px（胶囊形）
- 阴影：`0 2px 6px rgba(139,92,246,0.4)`
- 光标：pointer
- 最小宽度：22px
- 文字居中
- 行高：1.2
- 过渡：all `--hdm-transition-base`

**Hover**：
- `transform: scale(1.1)`
- 阴影加深

#### 6.12.4 删除角标

- 位置：absolute，top: -10px, left: -10px
- 尺寸：24x24px
- 背景：`#EF4444`
- 颜色：白色
- 字体：14px，bold
- 圆角：50%
- 阴影：`0 2px 6px rgba(239,68,68,0.4)`
- 布局：flex，居中
- 行高：1
- 光标：pointer
- 过渡：all `--hdm-transition-fast`

**Hover**：
- 背景：`#DC2626`
- `transform: scale(1.12)`

---

### 6.13 滚动条样式

**面板内滚动条**：

- 宽度：6px
- 轨道：透明
- 滑块：`#D1D5DB`，圆角 3px
- 滑块 Hover：`#9CA3AF`
- 滚动条区域背景：透明

**渐变头部下方滚动条**：
- 滚动条不超出面板圆角（通过 overflow: hidden + 内部容器实现）

---

## 七、分步实施计划 (WBS)

### 阶段一：设计令牌与基础组件（P0）

| 序号 | 任务 | 预估 | 依赖 |
|------|------|------|------|
| 1.1 | 定义完整 CSS 变量（颜色/字体/间距/圆角/阴影/动画） | M | 无 |
| 1.2 | 按钮组件（主/次/危险/幽灵/小按钮，4 状态） | M | 1.1 |
| 1.3 | 输入框组件（文本/文本域，5 状态） | M | 1.1 |
| 1.4 | 下拉框自定义样式（含下拉选项） | M | 1.1 |
| 1.5 | 复选框自定义样式 | S | 1.1 |
| 1.6 | 颜色选择器样式优化 | S | 1.1 |
| 1.7 | 自定义滚动条 | S | 1.1 |

### 阶段二：标记视觉层（P0）

| 序号 | 任务 | 预估 | 依赖 |
|------|------|------|------|
| 2.1 | 选中态/修改态外框与背景改为柔雾紫/橙 | S | 1.1 |
| 2.2 | 悬停高亮/多选高亮样式优化 | S | 1.1 |
| 2.3 | 编号徽章重设计（紫/橙/组合三色） | S | 1.1 |
| 2.4 | 删除角标重设计 | S | 1.1 |
| 2.5 | 8 方向拖拽把手重设计（紫边白底） | M | 1.1 |
| 2.6 | 尺寸信息浮窗重设计（深紫色背景） | S | 1.1 |
| 2.7 | 辅助线保持红色（语义保留） | S | 无 |

### 阶段三：工具栏与唤醒按钮（P0）

| 序号 | 任务 | 预估 | 依赖 |
|------|------|------|------|
| 3.1 | 工具栏头部（紫色渐变 + 标题 + 控制按钮 + 状态行） | M | 1.2 |
| 3.2 | 工具栏功能按钮区（2 行按钮网格） | M | 1.2 |
| 3.3 | 工具栏计数/快捷键行 | S | 3.1 |
| 3.4 | 唤醒按钮（渐变圆形 + 脉冲动画） | S | 1.2 |
| 3.5 | 多选工具栏重设计 | S | 1.2 |
| 3.6 | 工具栏可拖拽 + 位置记忆 | S | 3.1 |

### 阶段四：检查面板（P1，核心重点）

| 序号 | 任务 | 预估 | 依赖 |
|------|------|------|------|
| 4.1 | 面板整体框架（圆角、阴影、边框） | S | 1.1 |
| 4.2 | 面板头部（紫色渐变 + 控制按钮 + 选择器行） | S | 3.1 |
| 4.3 | 大小调整选项区（复选框） | S | 1.5 |
| 4.4 | 组件标签输入 | S | 1.3 |
| 4.5 | 修改说明文本域（含预览链接功能） | M | 1.3, 1.2 |
| 4.6 | 链接/跳转链接输入 | S | 1.3 |
| 4.7 | 样式编辑分组标题 + 重置全部按钮 | M | 1.2 |
| 4.8 | 颜色属性行（颜色选择器 + 文本输入 + 重置） | M | 1.6, 1.3, 1.2 |
| 4.9 | 背景图片行（垂直布局 + 重置按钮在右侧） | M | 1.2, 1.3 |
| 4.10 | 字体行（下拉 + 添加按钮 + 三态提示 + 删除按钮） | M | 1.4, 1.2 |
| 4.11 | 下拉选择属性行（字体粗细/显示方式） | S | 1.4 |
| 4.12 | 文本输入属性行（大小/边距/圆角/边框） | S | 1.3 |
| 4.13 | 样式统计条 | S | 1.1 |
| 4.14 | 位置调整分组（2 属性 + 4 微调按钮） | M | 1.3, 1.2 |
| 4.15 | 大小调整分组（2 属性 + 单位切换 + 4 微调） | M | 1.3, 1.2 |
| 4.16 | 图片替换区（仅 img） | M | 4.9 |
| 4.17 | HTML 编辑区（原始只读 + 修改可编辑） | S | 1.3 |
| 4.18 | 元素信息区（选择器显示） | S | 1.1 |
| 4.19 | 底部操作栏（删除 + 保存按钮） | S | 1.2 |
| 4.20 | 右下角拖拽把手 | S | 1.1 |
| 4.21 | 面板可拖拽 + 位置/大小记忆 | S | 4.2 |
| 4.22 | 组合编辑面板适配 | S | 4.2 |

### 阶段五：模态弹窗与 Toast（P1）

| 序号 | 任务 | 预估 | 依赖 |
|------|------|------|------|
| 5.1 | 遮罩层（半透明 + blur） | S | 1.1 |
| 5.2 | 弹窗容器 + 头部（紫色渐变） | S | 3.1 |
| 5.3 | 内容区表单样式 | S | 1.3 |
| 5.4 | 底部按钮组 | S | 1.2 |
| 5.5 | 入场/退场动画 | S | 1.1 |
| 5.6 | Toast 4 类型（默认/成功/警告/错误） | M | 1.1 |

### 阶段六：优化与细节打磨（P2）

| 序号 | 任务 | 预估 | 依赖 |
|------|------|------|------|
| 6.1 | 所有按钮 disabled/active 状态全面校验 | M | 全部 |
| 6.2 | 所有输入框 focus/error/disabled 状态校验 | M | 全部 |
| 6.3 | 过渡动画统一调整（时长、缓动函数） | S | 1.1 |
| 6.4 | 阴影层级一致性检查 | S | 1.1 |
| 6.5 | 间距系统一致性检查 | S | 1.1 |
| 6.6 | 圆角规范统一检查 | S | 1.1 |
| 6.7 | ui-design-tokens.css 设计令牌文档填充 | S | 1.1 |
| 6.8 | 无障碍优化（focus 状态、键盘可操作） | M | 全部 |
| 6.9 | 窄面板（300px）适配测试与优化 | M | 4.1 |

---

## 八、分步验证方案

### 8.1 阶段一验证

**验证项**：
1. CSS 变量正确定义，可通过 DevTools 查看和修改
2. 主按钮 4 状态（默认/hover/active/disabled）视觉正确
3. 次要按钮 4 状态视觉正确
4. 危险按钮 4 状态视觉正确
5. 小按钮 / 幽灵按钮样式正确
6. 输入框 5 状态（默认/hover/focus/disabled/error）视觉正确
7. 文本域 resize 正常，各状态正确
8. 下拉框自定义样式生效，选项样式正确
9. 复选框自定义样式生效（选中/未选中/hover/disabled）
10. 自定义滚动条在面板内生效

**验证方法**：在 test-page.html 加载扩展，通过 DevTools 手动切换元素状态

### 8.2 阶段二验证

**验证项**：
1. 点击标记元素 → 外框紫色 (#8B5CF6)，背景淡紫色透明
2. 修改样式后 → 外框变为橙色 (#F59E0B)
3. 编号徽章位置正确（右上角），hover 有放大效果
4. 删除角标位置正确（左上角），红色醒目
5. 8 个方向把手位置正确，光标类型正确
6. 把手 hover 时背景变紫、放大
7. 拖拽时尺寸浮窗显示正确（深紫色背景）
8. 对齐辅助线为红色

### 8.3 阶段三验证

**验证项**：
1. 工具栏头部为柔雾紫渐变，标题文字白色
2. 头部有状态行（已激活 + 计数）
3. 头部控制按钮 hover 效果正确
4. 第一行 4 个按钮为图标+文字竖排布局
5. 按钮 hover 有紫底紫字 + 轻微上浮效果
6. 「选择元素」按钮在选择模式下变为紫色渐变背景
7. 第二行「导出 Diff」为主按钮样式（渐变紫）
8. 计数行显示标记数和修改数，修改数橙色突出
9. 快捷键提示在右下角
10. 唤醒按钮为渐变紫色圆形，hover 放大
11. 工具栏可拖拽，位置记忆正确
12. 三态切换（隐藏→唤醒→完整）流畅

### 8.4 阶段四验证（核心重点）

**面板框架与头部**：
1. 面板整体圆角 12px，阴影有紫色调
2. 头部渐变与工具栏一致
3. 头部有选择器信息行
4. 头部最小化/关闭按钮样式正确
5. 面板可拖拽，位置/大小记忆正确

**10 大分区逐项验证**：
1. ⚙️ 大小调整选项 → 复选框为自定义紫色样式
2. 组件标签 → 输入框 focus 有紫色光晕
3. 修改说明 → 文本域 + 「预览链接」小按钮
4. 链接/跳转链接 → 根据元素类型正确显示
5. 🎨 样式编辑 → 11 个属性行布局正确
   - 颜色行：色板 + 输入 + 重置
   - 背景图片：垂直布局，重置在右侧
   - 字体行：下拉 + + 按钮 + 三态提示 + 删除按钮
   - 下拉行：自定义下拉样式
   - 文本行：输入 + 重置
   - 底部统计条：紫色背景
6. 📍 位置调整 → 2 个属性 + 4 微调按钮
7. 📐 大小调整 → 单位切换按钮 + 2 个属性 + 4 微调
8. 🖼 图片替换（img）→ 垂直布局正确
9. HTML 编辑 → 原始只读 + 修改可编辑
10. 元素信息 → 浅灰背景，等宽字体

**底部与把手**：
1. 底部操作栏 2 按钮（删除 + 保存）样式区分正确
2. 保存按钮为渐变紫色主按钮
3. 删除按钮为白底红字危险按钮
4. 右下角拖拽把手可见可用

### 8.5 阶段五验证

**验证项**：
1. 遮罩层半透明 + blur 效果
2. 弹窗头部渐变紫色
3. 表单字段间距正确
4. 底部按钮右对齐
5. 打开/关闭有过渡动画
6. Toast 顶部居中显示
7. Toast 4 种类型颜色区分正确
8. Toast 有滑入动画

### 8.6 回滚策略

- 使用 git 版本控制，每个阶段完成后提交一个 commit
- 核心功能（标记、拖拽、导出）在每个阶段都必须保持可用
- 如某阶段出现问题，revert 到上一阶段
- CSS 变更不影响 JS 逻辑，回滚风险低

---

## 九、文档演进规划（实施指引）

### 9.1 需要修改的文档清单

| 文档 | 状态 | 修改程度 |
|------|------|---------|
| `README.md` | 已有 | 中幅更新（UI 相关章节） |
| `ui-design-tokens.css` | 空文件 | 全新填充 |
| `Project_Rule.md` | 已有 | 小幅更新（版本记录） |

### 9.2 README.md 全章节核对清单

> **说明**：以下逐章列出 README.md 每个章节在本次 UI 重设计中的更新状态，确保文档与代码完全一致。

| # | 章节 | 子章节 | 更新状态 | 具体变更内容 |
|---|------|--------|---------|-------------|
| 1 | 标题 + 版本号 | - | **需更新** | 版本号 v1.5.0 → v1.6.0 |
| 2 | 功能特性 | 核心功能 | **需更新** | 「绿色边框与编号徽章」→「紫色边框与编号徽章」；补充 UI 升级说明 |
| 3 | 功能特性 | v1.1.0 新增功能 | 保持不变 | 与 UI 无关，无需修改 |
| 4 | 功能特性 | v1.3.0 新增功能 | 保持不变 | 与 UI 无关，无需修改 |
| 5 | 功能特性 | v1.5.0 新增功能 | 保持不变 | 与 UI 无关，无需修改 |
| 6 | 功能特性 | （新增）v1.6.0 新增功能 | **需新增** | 新增 v1.6.0 功能段落，说明柔雾紫主题 UI 全面升级 |
| 7 | 功能特性 | 交互方式 | **需更新** | 补充「采用柔雾紫渐变主题」描述 |
| 8 | 功能特性 | 标记元素上的交互 | **需更新** | 「绿色/橙色编号徽章」→「紫色/橙色编号徽章」 |
| 9 | 功能特性 | 组合标记操作 | 保持不变 | 文字描述不涉及具体配色细节，无需修改 |
| 10 | 项目结构 | - | 保持不变 | 文件结构无变化 |
| 11 | 安装步骤 | - | 保持不变 | 与 UI 无关 |
| 12 | 使用方法 | 快速上手 | **需更新** | 「绿色虚线高亮」→「紫色虚线高亮」 |
| 13 | 使用方法 | 检查面板详解 | **需更新** | 补充柔雾紫主题说明；更新区域描述的视觉特征 |
| 14 | 使用方法 | 自定义字体使用说明 | 保持不变 | 功能逻辑无变化 |
| 15 | 使用方法 | 工具栏按钮详解 | **需更新** | 补充按钮视觉风格说明（渐变主按钮、图标+文字竖排） |
| 16 | 使用方法 | 工具栏状态 | **需更新** | 唤醒态补充「渐变紫色圆形按钮」描述 |
| 17 | 使用方法 | 对齐辅助线详解 | 保持不变 | 辅助线仍为红色，语义保留 |
| 18 | 使用方法 | 导出 Diff | 保持不变 | 与 UI 无关 |
| 19 | 导出文件格式 | - | 保持不变 | 与 UI 无关 |
| 20 | 使用 Diff 给 AI Agent | - | 保持不变 | 与 UI 无关 |
| 21 | 注意事项 | - | 保持不变 | 与 UI 无关 |
| 22 | 代码规范 | - | 保持不变 | 规范不变 |
| 23 | 开发流程 | - | 保持不变 | 流程不变 |
| 24 | 故障排除 | - | 保持不变 | 与 UI 无关 |
| 25 | 许可证 | - | 保持不变 | 与 UI 无关 |

**核对总结**：
- 需更新章节：**9 处**（第 1, 2, 6, 7, 8, 12, 13, 15, 16 项）
- 保持不变章节：**16 处**
- 新增章节：**1 处**（v1.6.0 新增功能段落）

### 9.3 README.md 修改清单

#### 9.3.1 版本号更新
- 当前：v1.5.0 → 目标：v1.6.0
- 理由：UI 全面升级为次要版本更新

#### 9.3.2 新增 v1.6.0 功能段落

在「v1.5.0 新增功能」之后新增：

```markdown
### v1.6.0 新增功能

- **柔雾紫主题 UI 全面升级**：整体配色统一为优雅的柔雾紫色系，视觉更现代精致
- **9 大组件完整重设计**：工具栏、检查面板、按钮、输入框、模态弹窗、颜色色板、操作反馈、样式分组、拖拽与间距
- **完善的交互状态**：所有组件支持 hover/focus/active/disabled/error 五种状态
- **统一的设计规范**：4px 间距基准、6 级圆角、5 级阴影、3 级过渡动画全项目统一
- **增强的检查面板**：更清晰的分组布局、更细腻的操作反馈、更舒适的视觉节奏
```

#### 9.3.3 更新「功能特性 - 核心功能」条目

将以下条目更新描述：
- 「绿色边框与编号徽章」→ 「紫色边框与编号徽章」
- 「红色对齐辅助线」→ 保持不变（辅助线仍为红色）

#### 9.3.4 更新「交互方式 - 浮动工具栏」条目

补充：「采用柔雾紫渐变主题，支持三态切换（隐藏→唤醒→完整）」

#### 9.3.5 更新「标记元素上的交互」表格

- 「绿色/橙色编号徽章」→ 「紫色/橙色编号徽章」
- 「边缘紫色圆形把手」→ 保持（已是紫色，但可补充细节）

### 9.4 ui-design-tokens.css 填充

**操作**：将空文件填入完整的设计令牌 CSS 变量定义

**内容结构**：
```css
/* ============================================================
   HTML Diff Marker - Design Tokens (Misty Purple Theme v3.0)
   ============================================================ */
/* 此文件为设计令牌参考文档，不直接注入页面 */
/* 实际使用的变量定义在 content.css 顶部 :root 中 */

:root {
  /* ===== 1. 颜色系统 ===== */
  /* 1.1 主色系 */
  --hdm-primary: #8B5CF6;
  --hdm-primary-hover: #7C3AED;
  /* ... 更多 */
  
  /* 1.2 渐变色 */
  /* 1.3 中性色 */
  /* 1.4 功能语义色 */
  /* 1.5 标记状态色 */
  
  /* ===== 2. 字体系统 ===== */
  /* ===== 3. 间距系统 ===== */
  /* ===== 4. 圆角系统 ===== */
  /* ===== 5. 阴影系统 ===== */
  /* ===== 6. 过渡动画 ===== */
}
```

### 9.5 Project_Rule.md 修改

- 在附录「历史问题记录」后新增「UI 重设计记录」小段落
- 记录 v1.6.0 UI 升级为柔雾紫主题
- 确认 CSS 类名前缀规则保持不变

---

## 十、外部依赖

无外部依赖。本次改造为纯前端 CSS 重设计，不引入新的第三方库。

---

## 十一、最终验收清单

### P0 级（必须通过，缺一不可）

#### 工具栏
- [ ] 工具栏头部为柔雾紫渐变（135deg），标题文字为白色
- [ ] 头部有状态行：已激活指示 + 计数摘要
- [ ] 头部控制按钮（最小化/关闭）hover 效果正确
- [ ] 第一行 4 个功能按钮为图标+文字竖排布局
- [ ] 按钮 hover 有紫色背景 + 紫色文字 + 轻微上浮
- [ ] 「导出 Diff」按钮为主按钮样式（紫色渐变 + 白色文字）
- [ ] 计数行显示标记数和修改数，修改数橙色突出
- [ ] 唤醒按钮为渐变紫色圆形，hover 有放大效果

#### 检查面板
- [ ] 面板头部渐变与工具栏一致（柔雾紫渐变）
- [ ] 面板头部有选择器信息行（次级文字）
- [ ] 面板整体圆角 12px，阴影有紫色调

#### 标记视觉
- [ ] 元素选中外框为紫色 (#8B5CF6)，背景淡紫透明
- [ ] 元素修改态外框为橙色 (#F59E0B)
- [ ] 编号徽章位置正确（右上角），紫色/橙色区分状态
- [ ] 删除角标为红色圆形，位置在左上角
- [ ] 8 方向拖拽把手为紫边白底圆形
- [ ] 悬停高亮为紫色虚线
- [ ] 多选高亮为紫色虚线

#### 基础组件
- [ ] 所有主按钮为紫色渐变，hover 有上浮效果
- [ ] 所有输入框 focus 状态有紫色光晕（3px rgba 15%）
- [ ] 所有次要按钮 hover 变为紫底紫字
- [ ] 所有危险按钮为白底红字红边

#### 功能可用性
- [ ] 扩展功能不受影响（标记、拖拽、编辑、导出）
- [ ] 所有 CSS 类名保持 `html-diff-marker-` 前缀
- [ ] `node --check content/content.js` 语法检查通过

### P1 级（应该通过）

#### 模态弹窗
- [ ] 模态弹窗头部为柔雾紫渐变
- [ ] 遮罩层有半透明 + blur 效果
- [ ] 弹窗有入场动画（缩放 + 淡入）

#### 字体相关
- [ ] 字体下拉框为自定义样式（非原生 select 外观）
- [ ] 字体预览三态提示颜色区分正确（黄/蓝/绿）
- [ ] 添加字体按钮为绿色（+ 图标）
- [ ] 删除字体按钮为红色，位于提示条下方

#### 样式编辑区
- [ ] 样式分组有清晰的标题和分隔线
- [ ] 每个属性行有独立的重置按钮（↺ 图标 + tooltip）
- [ ] 微调按钮（±1, ±10）样式统一，hover 变紫
- [ ] 颜色选择器样式美观，与主题一致
- [ ] 背景图片为垂直布局，重置按钮在右侧

#### 底部与细节
- [ ] 底部操作栏两个按钮样式区分（危险/主）
- [ ] 右下角拖拽把手可见且可用
- [ ] 自定义滚动条样式生效
- [ ] 复选框为自定义紫色样式
- [ ] 多选工具栏样式与主题统一
- [ ] Toast 提示有 4 种类型颜色区分

#### 位置与大小调整
- [ ] 位置调整区有 2 个属性 + 4 个微调按钮
- [ ] 大小调整区有单位切换按钮（px / %）
- [ ] 大小调整区有 2 个属性 + 4 个微调按钮

### P2 级（期望通过，锦上添花）

#### 状态完整性
- [ ] 所有按钮 disabled 状态视觉正确（灰色，不可点击）
- [ ] 所有按钮 active 状态有按下效果
- [ ] 输入框 error 状态有红色边框和光晕
- [ ] 输入框 disabled 状态正确

#### 设计规范一致性
- [ ] 过渡动画流畅自然（120-250ms，统一缓动函数）
- [ ] 阴影层级清晰（5 级）
- [ ] 圆角规范统一（xs/sm/md/lg/xl/full）
- [ ] 间距规范统一（4px 基准）
- [ ] 字号层级清晰（xs/sm/base/md/lg）

#### 用户体验
- [ ] 面板内字体大小、行距舒适易读
- [ ] 窄面板（300px）下布局不溢出
- [ ] 键盘 Tab 键可遍历所有可交互元素
- [ ] focus 状态清晰可见（无障碍）
- [ ] 整体视觉风格现代、精致、有质感

#### 文档
- [ ] README.md 已同步更新 UI 相关描述
- [ ] ui-design-tokens.css 已填入完整设计令牌
- [ ] 版本号已更新为 v1.6.0

---

## 附录：CSS 文件结构建议

```css
/* ============================================================
   HTML Diff Marker - Styles (Misty Purple Theme v3.0)
   ============================================================ */

/* ===== 1. CSS 变量与基础 ===== */
:root { /* 完整设计令牌定义 */ }

/* 全局滚动条 */
.html-diff-marker-inspector-body::-webkit-scrollbar { ... }

/* ===== 2. 基础原子组件 ===== */
/* 按钮通用 */
/* 主按钮 */
/* 次要按钮 */
/* 危险按钮 */
/* 小按钮/幽灵按钮 */
/* 图标按钮 */

/* 输入框 */
/* 文本域 */
/* 下拉框 */
/* 复选框 */
/* 颜色选择器 */

/* ===== 3. 页面标记样式 ===== */
/* 选中态 */
/* 修改态 */
/* 悬停高亮 */
/* 多选高亮 */
/* 编号徽章 */
/* 删除角标 */
/* 8方向拖拽把手 */
/* 尺寸/坐标浮窗 */
/* 对齐辅助线 */

/* ===== 4. 浮层组件 ===== */
/* 工具栏 */
/* 工具栏头部 */
/* 工具栏按钮区 */
/* 工具栏计数行 */
/* 唤醒按钮 */
/* 多选工具栏 */

/* ===== 5. 检查面板 ===== */
/* 面板整体 */
/* 面板头部 */
/* 元素信息区 */
/* 大小调整选项 */
/* 组件标签 */
/* 修改说明 */
/* 链接输入 */
/* 样式编辑区 */
/* 位置调整区 */
/* 大小调整区 */
/* 图片替换区 */
/* HTML 编辑区 */
/* 底部操作栏 */
/* 右下角拖拽把手 */

/* ===== 6. 组合编辑面板 ===== */

/* ===== 7. 弹窗与通知 ===== */
/* 模态框 */
/* Toast */

/* ===== 8. 工具类 ===== */
/* 动画关键帧 */
```

---

**文档结束**
