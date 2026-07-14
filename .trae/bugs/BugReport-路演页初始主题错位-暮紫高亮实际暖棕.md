# BugReport：路演页初始主题「默认选中暮紫，实际渲染暖棕」

> 排查角色：hugo（问题定位，不负责修复实施）
> 生成时间：2026-07-14
> 目标页面：`dev/pages/product-roadshow.html`
> 关联组件：Chrome 扩展 `extension/content/content.js`、`extension/content/content.css`
> 结论状态：**根因已定位并复现验证**（属于扩展与宿主页共用 `data-theme` 属性导致的样式串扰）

---

## 一、问题描述

- **现象**：打开 `product-roadshow.html` 初始页时，hero 区顶部主题切换器 `.theme-dot.active` 与设置面板 `.hdm-theme-card.active` 均高亮为「暮紫(dusk-purple)」，但整页实际渲染出「暖棕(warm-brown)」配色（logo、渐变、按钮、标签等主题色全部呈暖棕）。
- **影响范围**：仅影响 `product-roadshow.html` 路演页的**视觉展示**（初始进入时高亮态与实际主题不一致）；不影响扩展本体功能。
- **发生时间**：用户于 2026-07-13 23:36 / 23:40 两段录屏中复现（见 `20260713233621_rec_.mp4`、`20260713234040_rec_.mp4`）。
- **复现路径**：在**已安装并启用「HTML Diff Marker」扩展**的浏览器中打开该路演页；且该扩展此前被切换/记忆为「暖棕」主题时必现。

---

## 二、现场分析

### 2.1 路演页自身主题机制（页面内联 CSS + JS）

页面主题完全由 `<body data-theme="...">` 驱动 8 个 `--theme-*` 变量，四套预设通过属性选择器覆盖：

| 主题 | data-theme 值 | 主色 |
|---|---|---|
| 深藏青 | `deep-cyan` | `#211E55` |
| 灰绿 | `gray-green` | `#6A8372` |
| 暮紫 | `dusk-purple` | `#70649A` |
| 暖棕 | `warm-brown` | `#9E7A7A` |

关键点：
- `:root` 默认变量（[L29-37](file:///Users/bytedance/Documents/trae_projects/Mark2AI/dev/pages/product-roadshow.html#L29-L37)）= **暮紫 `#70649A`**。
- `<body>`（[L1044](file:///Users/bytedance/Documents/trae_projects/Mark2AI/dev/pages/product-roadshow.html#L1044)）**初始不带任何 `data-theme` 属性**。
- hero 默认高亮圆点（[L1074](file:///Users/bytedance/Documents/trae_projects/Mark2AI/dev/pages/product-roadshow.html#L1074)）= `dusk-purple`；设置面板默认高亮卡片（[L1662](file:///Users/bytedance/Documents/trae_projects/Mark2AI/dev/pages/product-roadshow.html#L1662)）= 暮紫。
- 页面内联脚本 IIFE（[L1750-2004](file:///Users/bytedance/Documents/trae_projects/Mark2AI/dev/pages/product-roadshow.html#L1750-L2004)）**只在用户点击时才 `setAttribute('data-theme', ...)`，加载期不设置任何主题**。

> 结论：单看页面自身，初始应渲染暮紫。页面本身逻辑自洽，不是它单独出的问题。

### 2.2 扩展对宿主页 body 的写入（真正的外部变量）

`extension/content/content.js` 内的「主题管理器」在页面加载时会主动向**宿主页面**的 `document.body` 写入 `data-theme`：

- 预设主题：`document.body.setAttribute('data-theme', themeId)`（[content.js:L2328](file:///Users/bytedance/Documents/trae_projects/Mark2AI/extension/content/content.js#L2328)）
- 自定义主题：`document.body.setAttribute('data-theme', 'custom')`（[content.js:L2342](file:///Users/bytedance/Documents/trae_projects/Mark2AI/extension/content/content.js#L2342)）
- 主题取值来自 `chrome.storage.local` 持久化键 `htmlDiffMarker_theme`（[content.js:L2255-2308](file:///Users/bytedance/Documents/trae_projects/Mark2AI/extension/content/content.js#L2255-L2308)），即**记忆用户上一次在扩展里选的主题**，跨页面、跨会话生效。
- 扩展的 4 个预设 id 与路演页完全同名：`dusk-purple / deep-cyan / gray-green / warm-brown`（[content.js:L2242-2247](file:///Users/bytedance/Documents/trae_projects/Mark2AI/extension/content/content.js#L2242-L2247)）。

### 2.3 冲突本质：命名空间碰撞

- 扩展自己的主题变量用的是 `--hdm-theme-*` 前缀（[content.css:L232-282](file:///Users/bytedance/Documents/trae_projects/Mark2AI/extension/content/content.css#L232-L282)），已做前缀隔离。
- 但扩展与路演页**共用了同一个载体属性 `body[data-theme]`**，而路演页的 `--theme-*`（无 hdm 前缀）恰恰也挂在 `[data-theme="warm-brown"]` 这个选择器上。
- 于是扩展写入的 `data-theme="warm-brown"` 被路演页自己的 CSS 选择器命中，**劫持**了路演页的 8 个 `--theme-*` 变量 → 整页变暖棕；而路演页 JS 从未改动过 hero/面板的 `active` 高亮态 → 高亮仍停在暮紫。二者由此错位。

---

## 三、逐步排障记录（时间线）

| # | 操作 | 观测结果 | 结论 |
|---|---|---|---|
| 1 | grep 定位 `data-theme` / 四套主题 | 页面结构清晰，默认高亮=暮紫 | 记录切换机制 |
| 2 | 读 `<body>`（L1044） | 初始**无** `data-theme` 属性 | 初始应回落 `:root` |
| 3 | 读 `:root`（L29-37） | 默认变量=暮紫 `#70649A` | 页面默认应为暮紫 |
| 4 | 通读唯一 `<script>`（L1750-2004） | 加载期**不**设置 data-theme，仅点击时设置 | 排除页面自身初始化 |
| 5 | 静态推断 | 页面单独运行应显示暮紫，与现象矛盾 | 判定有外部变量介入 |
| 6 | Chrome headless 实测当前文件 | `dataTheme=null / --theme-primary=#70649A / activeDot=dusk-purple`，**渲染暮紫** | 纯页面确实不复现暖棕 |
| 7 | 抽取录屏首帧（qlmanage） | 画面存在浮动的「HTML Diff Marker」扩展面板，页面主题呈暖棕系 | 现场存在扩展注入 |
| 8 | grep 扩展 `content.js` / `content.css` | 扩展对宿主 body 写 `data-theme`，且预设 id 与页面同名、含 `warm-brown` | **锁定根因** |
| 9 | 读扩展主题管理器 init/applyPreset（L2255-2330） | 主题从 `chrome.storage.local` 恢复并 setAttribute 到 body | 复现机理闭环 |

> 取证脚本与首帧图保存在 `.trae/debug/probe-theme.js`、`.trae/debug/frames/`（均在被 Git 忽略的 `.trae` 目录内）。

---

## 四、根因判定

**根因（P0，已确认）**：浏览器扩展「HTML Diff Marker」在其内容脚本中把用户记忆的主题（本例为 `warm-brown`）以 `document.body.setAttribute('data-theme', ...)` 的方式写到了**宿主页面**的 body 上。路演页 `product-roadshow.html` 恰好使用**同名的 `body[data-theme="warm-brown"]` 选择器**来定义自己的 `--theme-*` 变量，导致：

- 路演页的 8 个主题变量被扩展写入的 `data-theme` 劫持 → 整页渲染暖棕；
- 路演页自身 JS 从未同步这次外部写入 → hero 圆点与面板卡片的 `active` 高亮仍停留在默认暮紫；
- 最终表现为「高亮=暮紫，实际=暖棕」的错位。

**为什么当前直接双击打开文件复现不出来**：脱离扩展环境（如 headless / 无扩展的浏览器）时，body 无 `data-theme`，页面回落 `:root` 暮紫，一切正常。因此该问题**只在装有该扩展、且扩展记忆主题非暮紫时出现**。

---

## 五、可能性猜测（已逐一验证）

| 假设 | 结论 | 依据 |
|---|---|---|
| H1 页面 `:root` 默认写成了暖棕 | ❌ 否 | L29-37 为暮紫 `#70649A` |
| H2 body 静态写死 `data-theme="warm-brown"` | ❌ 否 | L1044 无该属性 |
| H3 页面 JS 加载期误设暖棕 | ❌ 否 | 唯一 script 加载期不设主题 |
| H4 hero 高亮圆点标错到暖棕 | ❌ 否 | L1074 高亮=dusk-purple |
| H5 存在第二份被误打开的旧文件 | ❌ 否 | 全盘仅一份，旧项目路径已不存在 |
| **H6 浏览器扩展向宿主 body 注入 data-theme** | ✅ **是（根因）** | content.js L2328/L2342 + 同名预设 + storage 持久化 |

---

## 六、解决方案（交由后续实施角色，hugo 不实施）

> 以下为修复方向建议，实际改动应由 cody 等实施角色执行，并遵守「产出物只发布、不 commit」的红线。

### 方案 A（推荐，治本）：为路演页主题做命名空间隔离
- 让路演页不再复用裸 `body[data-theme="xxx"]`，改用**页面私有作用域**，例如：
  - 将主题选择器改为 `body[data-roadshow-theme="dusk-purple"]`（页面 JS 相应改为读写 `data-roadshow-theme`），与扩展使用的 `data-theme` 彻底解耦；
  - 或把主题变量整体收敛到页面根容器（如 `.main-content[data-theme]`）而非全局 `body`。
- 优点：无论扩展写什么，都不再影响路演页；页面可独立正确渲染。

### 方案 B（治本，成本更高）：变量前缀隔离
- 将路演页 8 个 `--theme-*` 变量重命名为页面专属前缀（如 `--rs-theme-*`），并同步 CSS 引用。即便 `data-theme` 被外部改写，页面变量也不会被扩展的选择器命中。

### 方案 C（临时止血）：页面加载时显式落定初始主题
- 在页面内联 JS 顶部立即执行 `document.body.setAttribute('data-theme', 'dusk-purple')`，把高亮态与实际主题强制对齐到暮紫。
- 局限：仅消除「错位」，无法阻止扩展在其后再次改写 body（若扩展在页面脚本之后异步 setAttribute，仍可能被覆盖）；属缓解非根治，建议与 A/B 配合。

### 方案 D（环境侧规避）：演示/路演时使用未安装该扩展的干净浏览器 Profile
- 适合临时演示场景，零改码，但不解决工程问题。

---

## 七、验收手段

1. **无扩展环境**：干净浏览器/隐身且禁用扩展下打开路演页 → 初始应为暮紫，高亮与实际一致。
2. **有扩展环境（关键回归）**：
   - 先在该扩展中把主题切到「暖棕」，再打开/刷新路演页；
   - 期望（修复后）：路演页仍按自身默认渲染**暮紫**，且高亮=实际；扩展自身面板主题不受影响。
3. **切换联动**：点击路演页 4 个预设与自定义色，主题正确切换且高亮同步。
4. **DevTools 校验**：`getComputedStyle(document.body).getPropertyValue('--theme-primary')` 在初始态应为 `#70649A`；确认扩展写入的 `data-theme` 不再命中页面主题选择器。
5. **可用 `.trae/debug/probe-theme.js` 复跑** headless 断言初始 `--theme-primary=#70649A`。

---

## 附：关键代码定位

- 路演页默认变量：[product-roadshow.html:L29-L37](file:///Users/bytedance/Documents/trae_projects/Mark2AI/dev/pages/product-roadshow.html#L29-L37)
- 路演页四套主题选择器：[product-roadshow.html:L98-L121](file:///Users/bytedance/Documents/trae_projects/Mark2AI/dev/pages/product-roadshow.html#L98-L121)
- 路演页 body（无 data-theme）：[product-roadshow.html:L1044](file:///Users/bytedance/Documents/trae_projects/Mark2AI/dev/pages/product-roadshow.html#L1044)
- 路演页 hero 默认高亮=暮紫：[product-roadshow.html:L1074](file:///Users/bytedance/Documents/trae_projects/Mark2AI/dev/pages/product-roadshow.html#L1074)
- 路演页主题脚本 IIFE：[product-roadshow.html:L1750-L2004](file:///Users/bytedance/Documents/trae_projects/Mark2AI/dev/pages/product-roadshow.html#L1750-L2004)
- 扩展预设主题定义（含 warm-brown）：[content.js:L2242-L2247](file:///Users/bytedance/Documents/trae_projects/Mark2AI/extension/content/content.js#L2242-L2247)
- 扩展向宿主 body 写 data-theme：[content.js:L2328](file:///Users/bytedance/Documents/trae_projects/Mark2AI/extension/content/content.js#L2328) 、[content.js:L2342](file:///Users/bytedance/Documents/trae_projects/Mark2AI/extension/content/content.js#L2342)
- 扩展主题持久化恢复：[content.js:L2255-L2308](file:///Users/bytedance/Documents/trae_projects/Mark2AI/extension/content/content.js#L2255-L2308)
