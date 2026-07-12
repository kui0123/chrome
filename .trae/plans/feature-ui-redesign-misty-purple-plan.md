# HTML Diff Marker UI 重设计方案 — 柔雾紫主题

> **版本**：v2.0
> **设计主题**：方案2 - 柔雾紫 (Misty Purple)
> **状态**：设计完成，待实施
> **适用项目**：HTML Diff Marker Chrome 扩展

---

## 一、原始需求

> 「你上一版开发的UI非常不完整。我希望你按照这一般设计的UI重新迭代，包括每一处细节设计，比如编辑面板中的每一个元素，都不要落下。颜色就用方案2的柔雾紫吧。」

用户要求对当前 Chrome 扩展「HTML Diff Marker」进行全面 UI 重设计，核心要点：
1. 采用方案2「柔雾紫」配色方案
2. 覆盖每一个 UI 组件的细节设计，不遗漏
3. 整体风格现代、精致、有质感
4. 统一的圆角、阴影、间距、字号规范
5. 所有交互状态（hover/focus/active/disabled/error）完整设计
6. 输出 P0/P1/P2 分级验收清单

---

## 二、需求理解

### 2.1 核心目标
- **视觉升级**：从当前的蓝色/绿色/灰色混搭风格，统一为柔雾紫主题
- **细节补全**：补齐当前 CSS 中缺失或简陋的组件样式（如下拉框、按钮各状态、输入框错误态等）
- **质感提升**：通过渐变、阴影、层级、微动效提升整体精致度
- **一致性**：建立完整的设计令牌体系，确保所有组件风格统一

### 2.2 范围边界
- **涉及文件**：`content/content.css`（主要）、`content/content.js`（少量适配）
- **不涉及**：功能逻辑变更、架构调整、新功能开发
- **持久化**：现有 localStorage/sessionStorage 数据结构不变

### 2.3 非功能要求
- 所有样式类名保持 `html-diff-marker-` 前缀不变
- 不影响现有功能的可用性
- 性能无明显下降（CSS 文件增量控制在 20KB 以内）
- 兼容 Chrome 主流版本

---

## 三、现状分析

### 3.1 当前 CSS 结构
当前 `content.css` 约 937 行，包含以下模块：

| 模块 | 现状评估 | 主要问题 |
|------|---------|---------|
| 悬停高亮 | 蓝色虚线 | 配色与新主题不统一 |
| 已选中标记 | 绿色实线 | 配色需改为柔雾紫系 |
| 已修改标记 | 橙色实线 | 需调整为紫系或统一语义色 |
| 多选高亮 | 蓝色虚线 | 配色需调整 |
| 多选工具栏 | 白色+灰色边框 | 过于简陋，无主题感 |
| 编号徽章 | 绿色/橙色 | 配色需调整 |
| 删除角标 | 红色 | 保留红色语义，但需优化质感 |
| 调整把手 | 蓝色圆形 | 配色需改为紫色系 |
| 尺寸浮窗 | 深色背景 | 需优化视觉层级 |
| 辅助线 | 红色 | 保留红色语义 |
| 工具栏 | 深色背景 (#1e293b) | 完全重做为渐变紫色头部 + 白色主体 |
| 唤醒按钮 | 深色圆形 | 重做为紫色渐变圆形按钮 |
| 编辑面板 | 白色面板 + 蓝色渐变头部 | 头部改为柔雾紫渐变，整体优化 |
| 样式编辑区 | 基础表单控件 | 补齐所有状态、优化间距和交互 |
| 字体提示 | 三色提示框 | 保留三态，优化视觉风格 |
| 模态弹窗 | 白色面板 + 蓝色渐变头部 | 与面板风格统一 |
| Toast | 深色背景 | 优化为柔雾紫系风格 |
| 图片预览 | 基础样式 | 融入新主题 |

### 3.2 主要缺失项
- 下拉框（select）的自定义样式（当前使用原生样式）
- 输入框错误状态（error）
- 按钮禁用状态（disabled）
- 统一的滚动条样式
- 组件间统一的间距规范
- 字体层级规范
- 过渡动画规范
- 阴影层级规范

---

## 四、方案设计

### 4.1 设计理念
- **柔雾质感**：以紫色渐变为主调，搭配柔和的浅紫背景，营造轻盈优雅的视觉感受
- **层级分明**：通过阴影、透明度、模糊效果建立清晰的视觉层级
- **微交互**：按钮 hover 有轻微上浮、输入框 focus 有光晕、过渡动画统一 150ms ease
- **功能语义色**：成功-绿、警告-橙、错误-红、信息-蓝，但饱和度降低，融入紫调

### 4.2 设计令牌 (Design Tokens)

#### 4.2.1 颜色系统

**主色系列（柔雾紫）**
```
--hdm-primary:        #8B5CF6   /* 主色 */
--hdm-primary-hover:  #7C3AED   /* 主色 hover */
--hdm-primary-dark:   #7C3AED   /* 主色深色 */
--hdm-primary-light:  #A78BFA   /* 主色浅色 */
--hdm-primary-bg:     #EDE9FE   /* 浅色背景 */
--hdm-primary-bg-soft:#F5F3FF   /* 最浅背景 */
```

**渐变色**
```
--hdm-gradient-header: linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)
--hdm-gradient-btn:    linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)
--hdm-gradient-btn-hover: linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)
```

**中性色**
```
--hdm-text-primary:    #1F2937   /* 主要文字 */
--hdm-text-secondary:  #4B5563   /* 次级文字 */
--hdm-text-tertiary:   #9CA3AF   /* 辅助文字 */
--hdm-text-disabled:   #D1D5DB   /* 禁用文字 */
--hdm-text-white:      #FFFFFF   /* 白色文字 */
--hdm-text-white-sub:  rgba(255,255,255,0.75)  /* 头部次级文字 */
```

**背景色**
```
--hdm-bg-white:        #FFFFFF
--hdm-bg-soft:         #F9FAFB
--hdm-bg-hover:        #F3F4F6
--hdm-bg-disabled:     #F3F4F6
```

**边框色**
```
--hdm-border:          #E5E7EB
--hdm-border-hover:    #D1D5DB
--hdm-border-focus:    #8B5CF6
--hdm-border-error:    #EF4444
--hdm-border-disabled: #E5E7EB
```

**功能语义色**
```
--hdm-success:         #10B981
--hdm-success-bg:      #ECFDF5
--hdm-success-border:  #A7F3D0
--hdm-warning:         #F59E0B
--hdm-warning-bg:      #FFFBEB
--hdm-warning-border:  #FDE68A
--hdm-error:           #EF4444
--hdm-error-bg:        #FEF2F2
--hdm-error-border:    #FECACA
--hdm-info:            #3B82F6
--hdm-info-bg:         #EFF6FF
--hdm-info-border:     #BFDBFE
```

**标记状态色**
```
--hdm-mark-selected:   #8B5CF6   /* 已选中 - 紫 */
--hdm-mark-modified:   #F59E0B   /* 已修改 - 橙（保留语义） */
--hdm-mark-hover:      #A78BFA   /* 悬停高亮 - 浅紫 */
--hdm-mark-multi:      #8B5CF6   /* 多选 - 紫虚线 */
```

#### 4.2.2 字体系统

```
--hdm-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif
--hdm-font-mono:   "SF Mono", Menlo, Consolas, "Liberation Mono", monospace
```

**字号层级**
```
--hdm-text-xs:   11px   /* 辅助说明、标签 */
--hdm-text-sm:   12px   /* 正文小字、按钮 */
--hdm-text-base: 13px   /* 正文、输入框 */
--hdm-text-md:   14px   /* 小标题、面板标题 */
--hdm-text-lg:   16px   /* 大标题 */
```

**字重**
```
--hdm-font-normal:  400
--hdm-font-medium:  500
--hdm-font-semibold: 600
--hdm-font-bold:    700
```

#### 4.2.3 间距系统 (4px 基准)

```
--hdm-space-1:  4px
--hdm-space-2:  8px
--hdm-space-3:  12px
--hdm-space-4:  16px
--hdm-space-5:  20px
--hdm-space-6:  24px
--hdm-space-8:  32px
```

#### 4.2.4 圆角系统

```
--hdm-radius-sm:   4px    /* 小型元素：标签、小按钮 */
--hdm-radius-md:   6px    /* 中型元素：输入框、按钮 */
--hdm-radius-lg:   8px    /* 大型元素：面板、卡片 */
--hdm-radius-xl:   12px   /* 模态框、大型面板 */
--hdm-radius-full: 9999px /* 圆形/胶囊 */
```

#### 4.2.5 阴影系统 (4 层)

```
--hdm-shadow-sm:  0 1px 2px rgba(0,0,0,0.05)           /* 轻微：输入框默认 */
--hdm-shadow-md:  0 4px 12px rgba(0,0,0,0.08)          /* 中等：面板、卡片 */
--hdm-shadow-lg:  0 8px 24px rgba(139,92,246,0.15)     /* 较大：悬浮面板、带紫调 */
--hdm-shadow-xl:  0 20px 40px rgba(0,0,0,0.2)          /* 超大：模态弹窗 */
```

#### 4.2.6 过渡动画

```
--hdm-transition-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1)
--hdm-transition-base:   200ms cubic-bezier(0.4, 0, 0.2, 1)
--hdm-transition-slow:   300ms cubic-bezier(0.4, 0, 0.2, 1)
```

---

## 五、主要架构

### 5.1 CSS 架构分层

```
┌─────────────────────────────────────────────────┐
│  1. CSS 变量与基础重置 (Variables & Reset)       │
├─────────────────────────────────────────────────┤
│  2. 基础组件样式 (Base Components)               │
│     - 按钮、输入框、下拉框、标签、提示条           │
├─────────────────────────────────────────────────┤
│  3. 页面标记样式 (Mark Visuals)                  │
│     - 选中态、修改态、悬停高亮、多选高亮           │
│     - 编号徽章、删除角标、拖拽把手                 │
│     - 辅助线、尺寸浮窗                           │
├─────────────────────────────────────────────────┤
│  4. 浮层组件 (Floating UI)                      │
│     - 工具栏、唤醒按钮、多选工具栏                 │
├─────────────────────────────────────────────────┤
│  5. 面板组件 (Inspector Panel)                  │
│     - 面板头部、元素信息区、样式编辑区             │
│     - 字体选择区、图片上传区                       │
│     - 底部操作栏、调整把手                       │
├─────────────────────────────────────────────────┤
│  6. 弹窗与通知 (Modal & Toast)                  │
│     - 模态框、Toast、字体添加弹窗                 │
└─────────────────────────────────────────────────┘
```

### 5.2 组件依赖关系

```
Design Tokens (变量)
    │
    ├─> Base Components (按钮/输入框)
    │       ├─> Toolbar
    │       ├─> Inspector
    │       ├─> Modal
    │       └─> Multi-select Toolbar
    │
    └─> Mark Visuals
            ├─> 选中态/修改态
            ├─> 徽章/角标/把手
            └─> 辅助线/浮窗
```

---

## 六、各组件详细设计

### 6.1 工具栏 (Toolbar)

#### 6.1.1 整体结构
- **位置**：右上角 fixed 定位
- **尺寸**：最小宽度 280px
- **圆角**：--hdm-radius-xl (12px)
- **阴影**：--hdm-shadow-lg
- **溢出**：hidden

#### 6.1.2 头部区域
- **背景**：`linear-gradient(135deg, #A78BFA, #7C3AED)`
- **内边距**：12px 16px
- **布局**：flex，两端对齐，垂直居中
- **可拖拽**：整个头部可拖拽移动工具栏

**标题区**：
- 图标：紫色系图标（如 ✨ 或扩展 logo）
- 标题文字："HTML Diff Marker"，14px，semibold，白色
- 状态指示：小点 + 文字 "已激活"，11px，rgba(255,255,255,0.75)

**控制按钮组**：
- 最小化按钮（−）：24x24px，圆形，rgba(255,255,255,0.15) 背景，白色图标
- 关闭按钮（×）：同上
- Hover：背景变 rgba(255,255,255,0.25)
- Active：背景变 rgba(255,255,255,0.35)

#### 6.1.3 按钮区域
- **背景**：白色
- **内边距**：12px 14px
- **布局**：按钮网格

**第一行（元素操作）**：
- 4 个按钮：选择元素、复制当前、添加元素、删除当前
- 每个按钮：flex 列布局（图标 + 文字）
- 图标：16px
- 文字：11px，medium
- 背景：--hdm-bg-soft
- 边框：1px solid --hdm-border
- 圆角：--hdm-radius-md
- 高度：52px
- 间距：8px gap
- Hover：背景 --hdm-primary-bg，边框 --hdm-primary-light，文字 --hdm-primary
- Active：背景 --hdm-primary-bg-soft
- 禁用：opacity 0.4，cursor not-allowed

**第二行（全局操作）**：
- 2 个按钮：清空所有、导出 Diff
- 样式同行按钮，但更宽
- 「导出 Diff」：主色渐变背景，白色文字，突出显示

#### 6.1.4 状态计数行
- **背景**：--hdm-bg-soft
- **内边距**：8px 14px
- **布局**：flex，两端对齐
- **左侧**：标记计数
  - 总数："共 5 个标记"，12px，--hdm-text-secondary
  - 已修改："2 个已修改"，12px，--hdm-warning，medium
- **右侧**：快捷键提示
  - "Alt+E 切换"，11px，--hdm-text-tertiary

---

### 6.2 唤醒按钮 (Wake Button)

- **形状**：圆形，44x44px
- **背景**：`linear-gradient(135deg, #A78BFA, #7C3AED)`
- **图标**：白色，编辑/标记图标（如 ✎ 或 ◉），18px
- **阴影**：--hdm-shadow-lg（带紫色调）
- **位置**：右上角，与工具栏初始位置一致 (top:20px, right:20px)
- **光标**：pointer
- **过渡**：all --hdm-transition-base

**状态**：
- 默认：display flex，居中对齐
- Hover：`transform: scale(1.08)`，阴影加强，渐变稍亮
- Active：`transform: scale(0.95)`
- 脉冲动画：首次出现时有轻微呼吸效果（可选）

---

### 6.3 检查面板 (Inspector)

#### 6.3.1 整体结构
- **位置**：默认左下角，可拖拽
- **尺寸**：默认 440x600px，最小 320x200px
- **背景**：白色
- **边框**：1px solid --hdm-border
- **圆角**：--hdm-radius-xl
- **阴影**：--hdm-shadow-lg
- **布局**：flex 列布局
- **溢出**：hidden

#### 6.3.2 面板头部
- **背景**：`linear-gradient(135deg, #A78BFA, #7C3AED)`
- **内边距**：12px 16px
- **布局**：flex，两端对齐
- **可拖拽**：整个头部可拖拽

**左侧**：
- 图标 + 标题
- 标题："编辑面板" 或组件名，14px，semibold，白色
- 副标题：编号 #1，12px，rgba(255,255,255,0.75)

**右侧控制按钮**：
- 最小化（−）：24x24px，rgba(255,255,255,0.15) 背景
- 关闭（×）：同上
- Hover/Active 同工具栏按钮

#### 6.3.3 元素信息区
- **背景**：--hdm-bg-soft
- **边框**：1px solid --hdm-border
- **圆角**：--hdm-radius-md
- **内边距**：10px 12px
- **下边距**：14px

**内容**：
- 标签："CSS 选择器"，11px，--hdm-text-tertiary，medium，uppercase，下边距 4px
- 选择器文本：11px，--hdm-text-primary，monospace 字体，word-break break-all
- 复制按钮：右侧小按钮，11px，--hdm-primary 文字，点击复制

#### 6.3.4 组件标签输入
- **标签**："组件标签"，12px，semibold，--hdm-text-primary，下边距 6px
- **输入框**：
  - 高度：36px
  - 内边距：0 12px
  - 边框：1px solid --hdm-border
  - 圆角：--hdm-radius-md
  - 字体：13px
  - 占位符：--hdm-text-disabled
  - Focus：边框 --hdm-border-focus，box-shadow `0 0 0 3px rgba(139,92,246,0.15)`
  - Transition：all --hdm-transition-fast

#### 6.3.5 修改说明文本域
- **标签**："修改说明（给 AI Agent 看）"，12px，semibold，下边距 6px
- **文本域**：
  - 最小高度：80px
  - 内边距：8px 12px
  - 边框：1px solid --hdm-border
  - 圆角：--hdm-radius-md
  - 字体：12px，行高 1.5
  - 可调整大小：vertical
  - Focus 状态同输入框
- **底部提示**：支持 Markdown 链接格式，11px，--hdm-text-tertiary，上边距 4px

#### 6.3.6 样式编辑区（分组）

每个样式分组结构一致：
```
┌─ 分组标题 ──────────────────── [重置全部] ─┐
│                                            │
│  [属性标签]                                 │
│  [输入框 + 颜色选择器 + 微调 + 重置]        │
│                                            │
│  [属性标签]                                 │
│  [输入框 + 颜色选择器 + 微调 + 重置]        │
└────────────────────────────────────────────┘
```

**分组标题行**：
- 高度：28px
- 布局：flex，两端对齐，居中
- 下边距：10px
- 标题文字：13px，semibold，--hdm-text-primary
- 「重置全部」按钮：
  - 高度：24px
  - 内边距：0 10px
  - 字体：11px，medium
  - 背景：--hdm-bg-soft
  - 边框：1px solid --hdm-border
  - 圆角：--hdm-radius-sm
  - 颜色：--hdm-text-secondary
  - Hover：背景 --hdm-error-bg，颜色 --hdm-error，边框 --hdm-error-border

**分组分隔线**：1px solid --hdm-border，下边距 14px

**属性行**：
- 下边距：10px
- 最后一个：下边距 0

**属性标签**：
- 显示：block
- 下边距：5px
- 字体：11px，medium
- 颜色：--hdm-text-secondary

**输入控件行**：
- 布局：flex，gap: 4px，align-items: center

**文本输入框**：
- flex: 1
- 高度：30px
- 内边距：0 8px
- 边框：1px solid --hdm-border
- 圆角：--hdm-radius-sm
- 字体：11px，monospace
- 颜色：--hdm-text-primary
- Focus：边框 --hdm-border-focus，box-shadow `0 0 0 2px rgba(139,92,246,0.12)`
- 禁用：背景 --hdm-bg-disabled，颜色 --hdm-text-disabled

**颜色选择器**：
- 宽度：30px
- 高度：30px
- 边框：1px solid --hdm-border
- 圆角：--hdm-radius-sm
- 光标：pointer
- 背景：透明
- 位置：relative
- 内部颜色块：绝对定位，inset 2px，圆角 2px
- Hover：边框 --hdm-primary

**微调按钮（±）**：
- 宽度：28px
- 高度：30px
- 背景：--hdm-bg-soft
- 边框：1px solid --hdm-border
- 圆角：--hdm-radius-sm
- 字体：12px，bold
- 颜色：--hdm-text-secondary
- 光标：pointer
- flex-shrink: 0
- Hover：背景 --hdm-primary-bg，颜色 --hdm-primary，边框 --hdm-primary-light
- Active：背景 --hdm-primary-bg-soft

**重置按钮（↺）**：
- 宽度：28px
- 高度：30px
- 背景：--hdm-error-bg
- 边框：1px solid --hdm-error-border
- 圆角：--hdm-radius-sm
- 字体：14px
- 颜色：--hdm-error
- 光标：pointer
- flex-shrink: 0
- Hover：背景 --hdm-error-border/30
- 禁用：opacity 0.4，cursor not-allowed

#### 6.3.7 样式分组详情

**位置分组**：
- left（左偏移）
- top（上偏移）
- position（显示方式，下拉框）

**大小分组**：
- width（宽度）
- height（高度）
- 同步缩放子元素（复选框）

**字体分组**：
- font-family（字体，下拉框 + 添加/删除按钮）
- font-weight（字体粗细，下拉框）
- font-size（字体大小）

**颜色分组**：
- color（文本颜色）
- background-color（背景颜色）

**背景图片分组**：
- 左侧：图片预览区（垂直布局：预览图 + 上传/删除按钮）
- 右侧：重置按钮
- 预览图：60x60px，边框，圆角，背景 contain

**边距分组**：
- padding（内边距）
- margin（外边距）

**边框分组**：
- border（边框）
- border-radius（圆角）

#### 6.3.8 字体下拉与添加/删除

**下拉框（自定义样式）**：
- 高度：30px
- 内边距：0 28px 0 8px
- 边框：1px solid --hdm-border
- 圆角：--hdm-radius-sm
- 字体：11px
- 背景：白色
- 右侧箭头：绝对定位，紫灰色小三角
- Hover：边框 --hdm-border-hover
- Focus：边框 --hdm-border-focus，box-shadow
- 禁用：背景 --hdm-bg-disabled

**添加字体按钮**：
- 宽度：30px
- 高度：30px
- 背景：--hdm-success-bg
- 边框：1px solid --hdm-success-border
- 圆角：--hdm-radius-sm
- 颜色：--hdm-success
- 字体：16px，bold
- 光标：pointer
- Hover：背景 --hdm-success-border/30

**删除字体按钮**：
- 宽度：100%
- 高度：28px
- 上边距：6px
- 背景：--hdm-error-bg
- 边框：1px solid --hdm-error-border
- 圆角：--hdm-radius-sm
- 颜色：--hdm-error
- 字体：11px，medium
- 光标：pointer
- Hover：背景 #fee2e2

#### 6.3.9 字体预览三态提示

**容器**：
- 上边距：6px
- 内边距：8px 10px
- 边框：1px solid
- 圆角：--hdm-radius-sm
- 字体：11px，行高 1.4
- 布局：flex，align-items flex-start，gap 8px

**失败态（字体不可用）**：
- 背景：--hdm-warning-bg
- 边框：--hdm-warning-border
- 文字：#92400e
- 图标：⚠️ 或黄色圆点
- 文案："⚠ 当前字体在系统中可能不可用，预览可能显示为默认字体"

**引导态（无自定义字体）**：
- 背景：--hdm-info-bg
- 边框：--hdm-info-border
- 文字：#0369a1
- 图标：ℹ️ 或蓝色圆点
- 文案："💡 点击右侧 ➕ 按钮可添加自定义字体"

**成功态（字体可用）**：
- 背景：--hdm-success-bg
- 边框：--hdm-success-border
- 文字：#166534
- 图标：✓ 或绿色圆点
- 文案："✓ 字体预览正常，当前字体可用"

#### 6.3.10 底部操作栏
- **背景**：--hdm-bg-soft
- **边框**：顶部 1px solid --hdm-border
- **内边距**：12px 16px
- **布局**：flex，gap: 8px

**按钮**：
- 复制 HTML：次要按钮，flex: 1
- 删除标记：危险按钮，flex: 1
- 保存修改：主按钮，flex: 1.2（稍宽）

**按钮样式**：
- 高度：36px
- 圆角：--hdm-radius-md
- 字体：12px，semibold
- 光标：pointer
- 过渡：all --hdm-transition-fast

**主按钮（保存）**：
- 背景：`linear-gradient(135deg, #8B5CF6, #7C3AED)`
- 颜色：白色
- 边框：none
- Hover：渐变稍亮（#A78BFA → #8B5CF6），transform translateY(-1px)，阴影加深
- Active：transform translateY(0)

**次要按钮（复制）**：
- 背景：白色
- 颜色：--hdm-text-primary
- 边框：1px solid --hdm-border
- Hover：背景 --hdm-primary-bg，颜色 --hdm-primary，边框 --hdm-primary-light

**危险按钮（删除）**：
- 背景：白色
- 颜色：--hdm-error
- 边框：1px solid --hdm-error-border
- Hover：背景 --hdm-error-bg

#### 6.3.11 右下角拖拽把手
- 位置：absolute，right: 0, bottom: 0
- 宽度：16px，高度：16px
- 光标：nwse-resize
- 背景：线性渐变（透明 50%，--hdm-primary-light 50%），135deg
- 右下角圆角：与面板一致的圆角的一半
- Hover：渐变颜色加深为 --hdm-primary

---

### 6.4 多选工具栏 (Multi-select Toolbar)

- **位置**：多选区域上方，居中
- **背景**：白色
- **边框**：1px solid --hdm-border
- **圆角**：--hdm-radius-lg
- **阴影**：--hdm-shadow-md
- **内边距**：6px 10px
- **布局**：flex，align-items center，gap: 8px
- **z-index**：极高

**按钮**：
- 组合标记：主色小按钮，白色文字
- 复制选中：次要小按钮
- 删除选中：危险小按钮
- 取消选择：灰色小按钮
- 样式：高度 28px，内边距 0 12px，圆角 --hdm-radius-sm，字体 12px medium

**计数标签**：
- 字体：11px，--hdm-text-tertiary
- 左边距：4px
- 文案："已选 N 个元素"

---

### 6.5 模态弹窗 (Modal)

#### 6.5.1 遮罩层
- 背景：rgba(0,0,0,0.5)
- backdrop-filter: blur(2px)（可选，渐进增强）
- 动画：fade in 200ms

#### 6.5.2 弹窗容器
- 最小宽度：380px
- 最大宽度：90vw
- 背景：白色
- 圆角：--hdm-radius-xl
- 阴影：--hdm-shadow-xl
- 溢出：hidden
- 动画：scale up 200ms + fade in

#### 6.5.3 弹窗头部
- 背景：`linear-gradient(135deg, #A78BFA, #7C3AED)`
- 内边距：14px 20px
- 文字：白色，14px，semibold

#### 6.5.4 弹窗内容区
- 内边距：20px
- 字体：13px，行高 1.5
- 颜色：--hdm-text-primary

**表单字段**：
- 下边距：16px
- 标签：block，下边距 6px，12px，semibold
- 输入框：全宽，高度 40px，内边距 0 12px，圆角 --hdm-radius-md
- 帮助文字：11px，--hdm-text-tertiary，上边距 6px
- 帮助文字中的 code：背景 --hdm-bg-soft，内边距 1px 4px，圆角 3px，monospace 10px

#### 6.5.5 弹窗底部
- 背景：--hdm-bg-soft
- 边框：顶部 1px solid --hdm-border
- 内边距：12px 20px
- 布局：flex，justify-content flex-end，gap: 8px

**按钮**：
- 取消按钮：次要样式，高度 34px，内边距 0 16px
- 确定按钮：主色渐变，白色文字，高度 34px，内边距 0 20px

---

### 6.6 Toast 提示

- **位置**：顶部居中，top: 20px
- **背景**：`linear-gradient(135deg, #1e1b4b, #312e81)`（深紫色）
- 或根据类型：
  - 默认：深紫渐变
  - 成功：绿色渐变
  - 警告：橙色渐变
  - 错误：红色渐变
- **颜色**：白色
- **内边距**：10px 18px
- **圆角**：--hdm-radius-lg
- **阴影**：--hdm-shadow-lg
- **字体**：12px，medium
- **布局**：flex，align-items center，gap: 10px
- **最大宽度**：80vw
- **动画**：滑入 200ms ease-out

**关闭按钮**：
- 透明背景
- 颜色：rgba(255,255,255,0.7)
- 字体：16px
- Hover：颜色白色

**图标**：
- 左侧小图标（✓ ⚠ ℹ ✕）

---

### 6.7 元素选中态与拖拽把手

#### 6.7.1 选中态（未修改）
- **外框**：2px solid #8B5CF6
- **外框偏移**：2px
- **背景**：rgba(139,92,246,0.06)
- **位置**：relative

#### 6.7.2 修改态
- **外框**：2px solid #F59E0B
- **外框偏移**：2px
- **背景**：rgba(245,158,11,0.06)
- **位置**：relative

#### 6.7.3 8方向拖拽把手

**基础样式**：
- 宽度：12px，高度：12px
- 背景：白色
- 边框：2px solid #8B5CF6
- 圆角：50%
- 阴影：0 1px 3px rgba(0,0,0,0.2)
- 光标：对应方向的 resize 光标
- z-index：极高

**位置**：
- n（上中）：top: -6px, left: calc(50% - 6px)，cursor: ns-resize
- s（下中）：bottom: -6px, left: calc(50% - 6px)，cursor: ns-resize
- e（右中）：top: calc(50% - 6px), right: -6px，cursor: ew-resize
- w（左中）：top: calc(50% - 6px), left: -6px，cursor: ew-resize
- ne（右上）：top: -6px, right: -6px，cursor: nesw-resize
- nw（左上）：top: -6px, left: -6px，cursor: nwse-resize
- se（右下）：bottom: -6px, right: -6px，cursor: nwse-resize
- sw（左下）：bottom: -6px, left: -6px，cursor: nesw-resize

**Hover 状态**：
- 背景：#8B5CF6
- 边框：2px solid #7C3AED
- transform: scale(1.15)
- 阴影：0 2px 6px rgba(139,92,246,0.4)

---

### 6.8 编号徽章

**基础样式**：
- 位置：absolute，top: -10px, right: -10px
- 背景：#8B5CF6（选中态）/ #F59E0B（修改态）
- 颜色：白色
- 字体：11px，bold
- 内边距：3px 8px
- 圆角：--hdm-radius-full（胶囊形）
- 阴影：0 2px 6px rgba(139,92,246,0.35)
- 光标：pointer
- 最小宽度：20px
- 文本对齐：center
- 行高：1.2
- 过渡：all --hdm-transition-fast

**Hover 状态**：
- transform: scale(1.1)
- 阴影：0 3px 10px rgba(139,92,246,0.45)
- 背景色稍深

**修改态徽章**：
- 背景：#F59E0B
- 阴影：0 2px 6px rgba(245,158,11,0.35)

---

### 6.9 删除角标

**基础样式**：
- 位置：absolute，top: -10px, left: -10px
- 宽度：22px，高度：22px
- 背景：#EF4444
- 颜色：白色
- 字体：14px，bold
- 圆角：50%
- 阴影：0 2px 6px rgba(239,68,68,0.35)
- 光标：pointer
- 布局：flex，居中
- 行高：1
- 过渡：all --hdm-transition-fast

**Hover 状态**：
- 背景：#DC2626
- transform: scale(1.15)
- 阴影：0 3px 10px rgba(239,68,68,0.45)

---

### 6.10 尺寸信息浮窗

- **背景**：`rgba(30,27,75,0.92)`（深紫色半透明）
- **颜色**：白色
- **字体**：11px，semibold，monospace 数字
- **内边距**：6px 12px
- **圆角**：--hdm-radius-md
- **阴影**：0 2px 8px rgba(0,0,0,0.3)
- **z-index**：极高
- **白色空格**：nowrap
- **指针事件**：none
- **行高**：1.4

---

### 6.11 辅助线

**垂直线**：
- 宽度：1px
- 高度：100vh
- 背景：#EF4444（保持红色语义）
- 阴影：0 0 4px rgba(239,68,68,0.5)
- 位置：fixed，top: 0

**水平线**：
- 高度：1px
- 宽度：100vw
- 背景：#EF4444
- 阴影：0 0 4px rgba(239,68,68,0.5)
- 位置：fixed，left: 0

---

### 6.12 悬停高亮（选择模式）

- **外框**：2px dashed #A78BFA（浅紫虚线）
- **外框偏移**：2px
- **背景**：rgba(167,139,250,0.08)
- **光标**：crosshair

**多选高亮**：
- 与悬停样式相同，但为实线或更明显的虚线
-颜色：#8B5CF6（深紫虚线）

---

### 6.13 图片预览与上传区

**容器**：
- 布局：flex，gap: 10px，align-items flex-start

**预览图**：
-宽度：60px，高度：60px
-边框：1px solid --hdm-border
-圆角：--hdm-radius-md
-背景颜色：--hdm-bg-soft
-背景图片：contain，no-repeat，center
-空状态：居中显示图标 + "无图"
-字体：10px，--hdm-text-tertiary

**操作按钮区**：
-布局：flex 列，gap: 4px，flex: 1
-上传按钮：
  -高度：26px
  -背景：--hdm-primary-bg
  -边框：1px solid --hdm-primary-light
  -圆角：--hdm-radius-sm
  -颜色：--hdm-primary
  -字体：11px，medium
  -光标：pointer
-删除按钮：
  -高度：26px
  -背景：--hdm-error-bg
  -边框：1px solid --hdm-error-border
  -圆角：--hdm-radius-sm
  -颜色：--hdm-error
  -字体：11px，medium
  -光标：pointer

**文件信息**：
-字体：10px，--hdm-text-tertiary
-上边距：4px

---

### 6.14 基础组件（各状态详解）

#### 6.14.1 输入框 (Input)

| 状态 | 边框 | 背景 | 文字 | 阴影 |
|------|------|------|------|------|
| 默认 | 1px solid #E5E7EB | #FFF | #1F2937 | - |
| Hover | 1px solid #D1D5DB | #FFF | #1F2937 | - |
| Focus | 1px solid #8B5CF6 | #FFF | #1F2937 | 0 0 0 3px rgba(139,92,246,0.15) |
| 禁用 | 1px solid #E5E7EB | #F3F4F6 | #D1D5DB | - |
| 错误 | 1px solid #EF4444 | #FFF | #1F2937 | 0 0 0 3px rgba(239,68,68,0.12) |

#### 6.14.2 按钮 (Button)

**主按钮**：

| 状态 | 背景 | 文字 | 阴影 | transform |
|------|------|------|------|-----------|
| 默认 | linear-gradient(135deg, #8B5CF6, #7C3AED) | #FFF | 0 2px 6px rgba(139,92,246,0.3) | - |
| Hover | linear-gradient(135deg, #A78BFA, #8B5CF6) | #FFF | 0 4px 12px rgba(139,92,246,0.35) | translateY(-1px) |
| Active | linear-gradient(135deg, #7C3AED, #6D28D9) | #FFF | 0 1px 3px rgba(139,92,246,0.3) | translateY(0) |
| 禁用 | #D1D5DB | #9CA3AF | - | - |

**次要按钮**：

| 状态 | 背景 | 边框 | 文字 |
|------|------|------|------|
| 默认 | #FFF | 1px solid #E5E7EB | #1F2937 |
| Hover | #EDE9FE | 1px solid #A78BFA | #8B5CF6 |
| Active | #E0E7FF | 1px solid #8B5CF6 | #7C3AED |
| 禁用 | #F3F4F6 | 1px solid #E5E7EB | #D1D5DB |

**危险按钮**：

| 状态 | 背景 | 边框 | 文字 |
|------|------|------|------|
| 默认 | #FFF | 1px solid #FECACA | #EF4444 |
| Hover | #FEF2F2 | 1px solid #EF4444 | #DC2626 |
| Active | #FEE2E2 | 1px solid #DC2626 | #B91C1C |
| 禁用 | #F9FAFB | 1px solid #FECACA | #FCA5A5 |

#### 6.14.3 下拉框 (Select)

| 状态 | 边框 | 背景 | 文字 |
|------|------|------|------|
| 默认 | 1px solid #E5E7EB | #FFF | #1F2937 |
| Hover | 1px solid #D1D5DB | #FFF | #1F2937 |
| Focus | 1px solid #8B5CF6 | #FFF | #1F2937 |
| 禁用 | 1px solid #E5E7EB | #F3F4F6 | #D1D5DB |
| 展开 | 1px solid #8B5CF6 | #FFF | #1F2937 |

**下拉选项**：
- 选中项背景：#EDE9FE
-选中项文字：#8B5CF6
- Hover项背景：#F5F3FF

#### 6.14.4 复选框 (Checkbox)

- 尺寸：16x16px
- 圆角：3px
- 边框：1.5px solid #D1D5DB
- 背景：白色
- 选中：背景 #8B5CF6，边框 #8B5CF6，白色 ✓ 勾
- Hover未选中：边框 #8B5CF6
- 禁用：opacity 0.5

#### 6.14.5 滚动条

**面板内滚动条**：
-宽度：6px
-轨道：透明
-滑块：#D1D5DB，圆角 3px
-滑块 Hover：#9CA3AF
-滚动条区域：背景透明

---

## 七、分步实施计划 (WBS)

### 阶段一：设计令牌与基础组件（P0）

| 序号 | 任务 | 预估工作量 | 依赖 |
|------|------|-----------|------|
| 1.1 | 添加 CSS 变量（颜色、字体、间距、圆角、阴影、过渡） | M | 无 |
| 1.2 | 基础按钮样式（主/次/危险，各状态） | S | 1.1 |
| 1.3 | 基础输入框样式（各状态） | S | 1.1 |
| 1.4 | 下拉框自定义样式 | M | 1.1 |
| 1.5 | 复选框样式 | S | 1.1 |
| 1.6 | 自定义滚动条 | S | 1.1 |
| 1.7 | Toast 样式重设计 | S | 1.1 |

### 阶段二：标记视觉层（P0）

| 序号 | 任务 | 预估工作量 | 依赖 |
|------|------|-----------|------|
| 2.1 | 选中态/修改态外框改为柔雾紫 | S | 1.1 |
| 2.2 | 悬停高亮/多选高亮样式 | S | 1.1 |
| 2.3 | 编号徽章重设计 | S | 1.1 |
| 2.4 | 删除角标重设计 | S | 1.1 |
| 2.5 | 8方向拖拽把手重设计 | M | 1.1 |
| 2.6 | 尺寸信息浮窗重设计 | S | 1.1 |
| 2.7 | 辅助线保持红色（语义保留） | S | 无 |

### 阶段三：浮层组件（P0）

| 序号 | 任务 | 预估工作量 | 依赖 |
|------|------|-----------|------|
| 3.1 | 工具栏头部（紫色渐变） | M | 1.2 |
| 3.2 | 工具栏按钮区（图标+文字网格） | M | 1.2 |
| 3.3 | 工具栏计数行 | S | 3.1 |
| 3.4 | 唤醒按钮（渐变圆形） | S | 1.2 |
| 3.5 | 多选工具栏重设计 | S | 1.2 |

### 阶段四：检查面板（P1）

| 序号 | 任务 | 预估工作量 | 依赖 |
|------|------|-----------|------|
| 4.1 | 面板整体框架（圆角、阴影、边框） | S | 1.1 |
| 4.2 | 面板头部（紫色渐变 + 控制按钮） | S | 3.1 |
| 4.3 | 元素信息区（选择器显示） | S | 1.3 |
| 4.4 | 组件标签输入 | S | 1.3 |
| 4.5 | 修改说明文本域 | S | 1.3 |
| 4.6 | 样式分组标题 + 重置全部按钮 | M | 1.2 |
| 4.7 | 样式属性行（标签+输入框+颜色选择器+微调+重置） | M | 1.2, 1.3 |
| 4.8 | 字体下拉 + 添加/删除按钮 | M | 1.4 |
| 4.9 | 字体预览三态提示条 | M | 1.1 |
| 4.10 | 图片预览与上传区 | M | 1.2 |
| 4.11 | 底部操作栏（3个按钮） | S | 1.2 |
| 4.12 | 右下角拖拽把手 | S | 1.1 |

### 阶段五：模态弹窗（P1）

| 序号 | 任务 | 预估工作量 | 依赖 |
|------|------|-----------|------|
| 5.1 | 遮罩层（半透明 + blur） | S | 1.1 |
| 5.2 | 弹窗容器 + 头部 | S | 4.2 |
| 5.3 | 内容区表单样式 | S | 1.3 |
| 5.4 | 底部操作按钮 | S | 1.2 |
| 5.5 | 入场动画 | S | 1.1 |

### 阶段六：优化与细节（P2）

| 序号 | 任务 | 预估工作量 | 依赖 |
|------|------|-----------|------|
| 6.1 | 所有按钮的 active/disabled 状态校验 | M | 全部 |
| 6.2 | 所有输入框的 focus/error/disabled 状态校验 | M | 全部 |
| 6.3 | 过渡动画统一调整 | S | 1.1 |
| 6.4 | 阴影层级一致性检查 | S | 1.1 |
| 6.5 | 组合标记的样式适配 | M | 2.1-2.5 |
| 6.6 | 深色模式兼容性（可选） | L | 全部 |

---

## 八、分步验证方案

### 8.1 阶段一验证

**验证项**：
1. CSS 变量正确定义，可通过 DevTools 查看
2. 按钮 4 种状态（默认/hover/active/disabled）视觉正确
3. 输入框 5 种状态（默认/hover/focus/disabled/error）视觉正确
4. 下拉框展开/收起状态正常
5. 滚动条样式生效

**验证方法**：
- 在 test-page.html 上加载扩展
- 通过 DevTools 手动切换元素状态查看效果
- 对比设计稿检查颜色值、圆角、间距

### 8.2 阶段二验证

**验证项**：
1. 点击标记元素，外框颜色为紫色，背景带淡紫
2. 修改样式后，外框变为橙色
3. 编号徽章位置正确，hover 有放大效果
4. 删除角标位置正确，红色醒目
5. 8个方向把手位置正确，cursor 正确
6. 拖拽时尺寸浮窗显示正确
7. 对齐辅助线为红色

**验证方法**：
- 标记元素后检查各状态
- 拖拽元素观察把手和浮窗
- 修改样式观察颜色变化

### 8.3 阶段三验证

**验证项**：
1. 工具栏头部紫色渐变正确
2. 按钮 hover 有颜色变化和轻微上浮
3. 计数行显示正确
4. 工具栏可拖拽
5. 唤醒按钮为渐变紫色圆形
6. 唤醒按钮 hover 有放大效果
7. 多选工具栏样式统一

**验证方法**：
- 点击扩展图标，检查三态切换
- 悬停各按钮检查效果
- 拖拽工具栏检查可移动性
- Shift+多选元素检查多选工具栏

### 8.4 阶段四验证

**验证项**：
1. 面板整体圆角、阴影正确
2. 头部渐变与工具栏一致
3. 选择器区背景和字体正确
4. 输入框 focus 有紫色光晕
5. 样式分组标题清晰，分隔线正确
6. 每个属性行布局正确（标签+输入+颜色+微调+重置）
7. 颜色选择器显示当前颜色值
8. 微调按钮 hover 变紫
9. 重置按钮 hover 变红
10. 字体下拉样式正确
11. 添加字体按钮为绿色
12. 删除字体按钮为红色
13. 字体三态提示颜色正确
14. 图片预览区布局正确
15. 底部三个按钮样式正确
16. 右下角拖拽把手可见且可用

**验证方法**：
- 标记元素后打开编辑面板
- 逐项检查每个控件的每个状态
- 修改各样式属性，观察实时反馈
- 测试字体选择和三态提示
- 上传背景图测试

### 8.5 阶段五验证

**验证项**：
1. 遮罩层半透明效果
2. 弹窗头部渐变紫色
3. 表单字段间距正确
4. 底部按钮对齐正确
5. 打开/关闭有过渡动画

**验证方法**：
- 点击「添加自定义字体」打开弹窗
- 检查各元素样式
- 测试表单输入 focus 状态
- 点击取消/确定检查关闭动画

### 8.6 回滚策略
- 保留当前 CSS 备份（git 版本控制）
- 每个阶段完成后提交一个 commit
- 如某阶段出现问题，可 revert 到上一阶段
- 核心功能（标记、拖拽、导出）在每个阶段都必须保持可用

---

## 九、文档演进规划（实施指引）

### 9.1 需要修改的文档

#### 9.1.1 `README.md`

**修改位置**：「检查面板详解」章节、「功能特性」章节、「对齐辅助线详解」章节

**修改内容**：
- 更新 UI 截图描述（如有截图）
- 配色说明：从蓝色系改为柔雾紫主题
- 按钮说明：补充按钮状态说明（主/次/危险）
- 字体三态提示：保持现有描述，无需变更
- 版本号：v1.5.0 → v1.6.0（UI 升级为次要版本更新）

**修改草稿**（供实施 Agent 参考）：

在「功能特性」下新增：
```markdown
### v1.6.0 新增功能
- **柔雾紫主题 UI 全面升级**：整体配色统一为优雅的柔雾紫色系，视觉更现代精致
- **14类组件完整设计**：工具栏、编辑面板、按钮、输入框、下拉框等所有组件均重新设计
- **完善的交互状态**：所有组件支持 hover/focus/active/disabled/error 五种状态
- **统一的设计规范**：4px 间距基准、圆角分级、阴影层级、过渡动画全项目统一
```

在「检查面板详解」中更新：
- 将「绿色边框」改为「紫色边框」
- 将「蓝色渐变头部」改为「柔雾紫渐变头部」
- 补充说明：所有按钮和输入框均有完整的交互状态反馈

#### 9.1.2 `ui-design-tokens.css`

**状态**：当前为空文件
**操作**：填入完整的设计令牌 CSS 变量定义，作为文档化的设计参考

**内容草稿**：
```css
/* ============================================================
   HTML Diff Marker - Design Tokens (Misty Purple Theme)
   ============================================================ */

/* 此文件为设计令牌参考文档，不直接注入页面 */
/* 实际使用的变量定义在 content.css 顶部 */

:root {
  /* 主色 */
  --hdm-primary: #8B5CF6;
  --hdm-primary-hover: #7C3AED;
  --hdm-primary-dark: #7C3AED;
  --hdm-primary-light: #A78BFA;
  --hdm-primary-bg: #EDE9FE;
  --hdm-primary-bg-soft: #F5F3FF;
  
  /* 渐变色 */
  --hdm-gradient-header: linear-gradient(135deg, #A78BFA, #7C3AED);
  --hdm-gradient-btn: linear-gradient(135deg, #8B5CF6, #7C3AED);
  
  /* ... 更多令牌 */
}
```

#### 9.1.3 `Project_Rule.md`

**修改位置**：无需大改，仅在版本历史中记录

**修改内容**：
- 在附录历史记录中添加 UI 重设计相关记录
- 确认 CSS 类名前缀规则不变

---

## 十、外部依赖

无外部依赖。本次改造为纯前端 CSS 重设计，不引入新的第三方库。

---

## 十一、最终验收清单

### P0 级（必须通过）

- [ ] 工具栏头部为柔雾紫渐变，文字为白色
- [ ] 工具栏按钮样式统一，hover 有颜色反馈
- [ ] 唤醒按钮为渐变紫色圆形，hover 有放大效果
- [ ] 编辑面板头部渐变与工具栏一致
- [ ] 元素选中外框为紫色 (#8B5CF6)
- [ ] 元素修改态外框为橙色 (#F59E0B)
- [ ] 编号徽章位置正确，紫色/橙色区分状态
- [ ] 删除角标为红色圆形，位置在左上角
- [ ] 8 方向拖拽把手为紫色边框白色填充
- [ ] 所有主按钮为紫色渐变，hover 有上浮效果
- [ ] 所有输入框 focus 状态有紫色光晕
- [ ] Toast 提示有紫色风格
- [ ] 多选高亮为紫色虚线
- [ ] 悬停高亮为紫色虚线
- [ ] 所有 CSS 类名保持 `html-diff-marker-` 前缀
- [ ] 扩展功能不受影响（标记、拖拽、编辑、导出）

### P1 级（应该通过）

- [ ] 模态弹窗头部为柔雾紫渐变
- [ ] 字体下拉框为自定义样式（非原生）
- [ ] 字体预览三态提示颜色区分正确（黄/蓝/绿）
- [ ] 样式分组有清晰的标题和分隔线
- [ ] 每个属性行有独立的重置按钮（↺ 图标）
- [ ] 微调按钮（±）样式统一
- [ ] 颜色选择器样式美观，与主题一致
- [ ] 底部操作栏三个按钮样式区分（次/危险/主）
- [ ] 右下角拖拽把手可见且可用
- [ ] 图片预览区布局合理
- [ ] 元素信息区有专门的背景和边框
- [ ] 自定义滚动条样式生效
- [ ] 复选框为自定义紫色样式
- [ ] 多选工具栏样式与主题统一

### P2 级（期望通过）

- [ ] 所有按钮 disabled 状态视觉正确（灰色）
- [ ] 输入框 error 状态有红色边框和光晕
- [ ] 按钮 active 状态有按下效果
- [ ] 过渡动画流畅自然（150-200ms）
- [ ] 阴影层级清晰（4级）
- [ ] 圆角规范统一（sm/md/lg/xl/full）
- [ ] 间距规范统一（4px 基准）
- [ ] 字号层级清晰（xs/sm/base/md/lg）
- [ ] 组合标记的样式适配正确
- [ ] 面板内字体大小、行距舒适易读
- [ [整体视觉风格现代、精致、有质感
- [ ] README.md 已同步更新 UI 相关描述
- [ ] ui-design-tokens.css 已填入设计令牌

---

## 附录：CSS 文件结构建议

```css
/* ============================================================
   HTML Diff Marker - Styles (Misty Purple Theme v2.0)
   ============================================================ */

/* ===== 1. CSS 变量与基础 ===== */
:root { /* 设计令牌 */ }

/* ===== 2. 基础组件 ===== */
/* 按钮 */
/* 输入框 */
/* 下拉框 */
/* 复选框 */
/* 标签/徽章 */
/* 提示条 */
/* 滚动条 */

/* ===== 3. 页面标记样式 ===== */
/* 选中/修改/悬停/多选高亮 */
/* 编号徽章 */
/* 删除角标 */
/* 调整把手（8方向） */
/* 尺寸浮窗 */
/* 辅助线 */

/* ===== 4. 浮层组件 ===== */
/* 工具栏 */
/* 唤醒按钮 */
/* 多选工具栏 */

/* ===== 5. 检查面板 ===== */
/* 面板整体 */
/* 面板头部 */
/* 元素信息区 */
/* 组件标签 */
/* 修改说明 */
/* 样式编辑区（分组） */
/* 字体选择区 */
/* 图片上传区 */
/* 底部操作栏 */
/* 调整把手 */

/* ===== 6. 弹窗与通知 ===== */
/* 模态框 */
/* Toast */
```

---

**文档结束**
