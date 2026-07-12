# 项目目录结构整理规划方案（修订版）

> **文档版本**: 2.1  
> **创建日期**: 2026-07-11  
> **适用项目**: HTML Diff Marker Chrome 扩展  
> **状态**: 规划阶段（待确认后实施）  
> **修订说明**: v2.0 — 基于 clara 审查意见修正，采用 `extension/` 独立加载目录方案；v2.1 — 基于 clara 二次审查意见修正：修复 README.md 链接失效问题、补充 `.trae/debug/` 下 3 个测试文件说明、统一体积预期与验收数值。

---

## 1. 原始需求

> 我想整理一下当前工作区的文件，区分一下哪些是需要加载的文件包。目前浏览器加载了150M的文件，这太大了。你先帮我整理结构，不要直接移动。

## 2. 需求理解

### 2.1 核心目标

- **区分文件性质**：明确划分"发布必需文件"与"开发辅助文件"
- **减小加载体积**：Chrome 扩展加载时不应包含开发/测试/文档等非运行时文件
- **规范化目录结构**：让项目目录清晰、有组织，便于维护和发布

### 2.2 问题根因分析

当前浏览器加载了约 150M 文件，远超出一个 Chrome 扩展的正常体积（通常 < 1MB）。根因如下：

| 文件/目录 | 类型 | 预估体积 | 是否被加载 |
|----------|------|---------|-----------|
| `tests/test-screenshots/` | 测试截图（PNG） | 几十~上百 MB | 是（位于扩展根目录内） |
| `tests/` 其余文件 | 测试页面/报告 | 较小 | 是（位于扩展根目录内） |
| `首页设计参考/` | 设计参考资源（含图片） | 几 MB | 是（位于扩展根目录内） |
| `首页设计.zip` | 设计压缩包 | 几~几十 MB | 是（位于扩展根目录内） |
| 根目录散落 HTML | 测试/预览页面 | 较小 | 是（位于扩展根目录内） |
| `ui-design-tokens.css` | 设计令牌参考 | 很小 | 是（位于扩展根目录内） |
| `debug-toolbar-not-opening.md` | Bug 文档 | 很小 | 是（位于扩展根目录内） |
| `.trae/` | 开发辅助文件 | 较小 | 否（`.` 开头，隐藏目录） |
| `.trae/debug/` 下 3 个 HTML | 调试用测试页面 | 很小 | 否（位于隐藏目录内） |

> **关键结论**：Chrome "加载已解压的扩展"时，会读取扩展根目录下**所有非隐藏文件和子目录**。文件放在哪个子目录无关紧要——只要在扩展根目录内部，就会被计入体积。
>
> **关于 .trae/debug/ 的说明**：该目录下有 3 个测试 HTML 文件（test-scope-precise.html、test-scope.html、test-style-isolation-root.html），均为内联样式、无外部资源引用。由于位于 `.trae/` 隐藏目录内，Chrome 不会加载，不影响扩展体积。
>
> **因此，仅在根目录内做子目录整理（如 dev/、design/）无法减小加载体积。必须让非必需文件物理上位于扩展加载目录之外。**

### 2.3 边界与约束

- **不做实际文件移动**：本阶段仅输出规划方案
- **不破坏现有功能**：manifest.json 引用的文件路径需与目录结构同步更新
- **兼容现有规范体系**：Project_Rule.md 保留在项目根目录，不影响 Skill 自动触发
- **不改变 Git 仓库范围**：所有文件仍在同一 Git 仓库内

---

## 3. 现状分析

### 3.1 当前完整目录结构

```
HTML 排版插件/                     ← Chrome 扩展加载目录（当前）
│
├── .trae/                          ← 隐藏目录（开发辅助，Chrome 不加载）
│   ├── bugs/
│   ├── debug/
│   │   ├── test-scope-precise.html
│   │   ├── test-scope.html
│   │   └── test-style-isolation-root.html
│   ├── plans/
│   └── skills/
│
├── background/                     ← 发布必需
│   └── background.js
│
├── content/                        ← 发布必需
│   ├── content.js
│   └── content.css
│
├── icons/                          ← 发布必需
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
├── tests/                          ← 开发辅助（大体积！导致 150M 主因）
│   ├── test-screenshots/           ← 大量 PNG 截图
│   ├── test0705/
│   ├── test-page-v2.html
│   ├── font-test-mock.html
│   ├── bug-verification.html
│   └── TEST_REPORT_SCREENSHOT.md
│
├── 首页设计参考/                     ← 开发辅助（含图片资源）
│   ├── pages/
│   │   └── 首页.html
│   └── assets/
│       └── image_*.jpg (5 张)
│
├── 首页设计.zip                     ← 开发辅助（压缩包）
│
├── manifest.json                    ← 发布必需
├── README.md                        ← 发布必需
├── Project_Rule.md                  ← 项目核心规范
├── .gitignore                       ← Git 配置
│
├── debug-toolbar-not-opening.md     ← 开发辅助（Bug 文档）
│
├── floating-layer-demo.html         ← 开发辅助（测试页面）
├── test-full-ui.html                ← 开发辅助（测试页面）
├── test-style-isolation.html        ← 开发辅助（测试页面）
├── ui-design-tokens.css             ← 开发辅助（设计令牌参考）
├── ui-preview-refresh.html          ← 开发辅助（预览页面）
├── ui-preview-v5.html               ← 开发辅助（预览页面）
├── ui-preview.html                  ← 开发辅助（预览页面）
└── theme-preview.html               ← 开发辅助（预览页面）
```

### 3.2 manifest.json 当前加载文件清单

| 文件路径 | 用途 | 发布必需 |
|---------|------|---------|
| `background/background.js` | Service Worker | 是 |
| `content/content.js` | Content Script | 是 |
| `content/content.css` | Content Style + Web Accessible | 是 |
| `icons/icon16.png` | 扩展图标 | 是 |
| `icons/icon48.png` | 扩展图标 | 是 |
| `icons/icon128.png` | 扩展图标 | 是 |
| `manifest.json` | 扩展配置 | 是 |

**运行时必需文件共 7 个**，预计总体积 < 100KB。

### 3.3 测试 HTML 页面外部引用分析

以下页面引用了项目内的 CSS/JS 文件，迁移时需同步修正相对路径：

| 文件 | 引用路径 | 引用类型 | 路径性质 |
|-----|---------|---------|---------|
| `test-full-ui.html` | `content/content.css` | CSS | 相对路径 |
| `test-full-ui.html` | `content/content.js` | JS | 相对路径 |
| `ui-preview.html` | `content/content.css` | CSS | 相对路径 |
| `theme-preview.html` | `ui-design-tokens.css` | CSS | 相对路径 |
| `tests/test-page-v2.html` | `/content/content.css` | CSS | 绝对路径（file:// 下指向文件系统根） |
| `tests/test-page-v2.html` | `/content/content.js` | JS | 绝对路径（file:// 下指向文件系统根） |

**其余测试页面（test-style-isolation.html、ui-preview-v5.html、ui-preview-refresh.html、floating-layer-demo.html）均使用内联样式，无外部文件引用。**

---

## 4. 方案设计

### 4.1 核心策略

采用**"独立扩展加载目录"**方案（审查意见方向 A）：

1. **新增 `extension/` 目录**：作为 Chrome 扩展的实际加载目录，仅包含运行时必需文件
2. **项目根目录作为开发工作区**：所有开发/测试/设计资源保留在 `extension/` 之外
3. **Project_Rule.md 保留在根目录**：不影响 `.trae/skills/project-dev-standard/SKILL.md` 的自动触发机制
4. **开发资源分层归集**：将散落的测试、预览、设计资源按类别归入 `dev/` 和 `design/` 目录

### 4.2 方案选型论证

| 方案 | 描述 | 优点 | 缺点 | 推荐度 |
|-----|------|------|------|-------|
| **方向 A：extension/ 加载目录** | 新增 extension/ 目录，核心文件移入，开发文件留在根目录其他位置 | 不改变 Git 仓库范围；结构清晰；加载体积立竿见影减小 | manifest.json 中路径需更新；测试页面相对路径需修正 | ⭐⭐⭐⭐⭐ |
| 方向 B：开发资源移出仓库 | 将测试/设计资源移到仓库上一级或独立目录 | 根目录最整洁 | 破坏 Git 仓库完整性；跨目录引用复杂；协作困难 | ⭐⭐ |
| 方向 C：.gitignore 排除 | 用 .gitignore 排除大文件 | 操作最简单 | **完全无效**——Chrome 加载与 .gitignore 无关，文件仍在目录中 | ⭐ |

**结论**：采用方向 A（extension/ 独立加载目录），这是唯一能从根本上解决加载体积问题、同时不破坏项目完整性的方案。

### 4.3 分类原则

| 分类 | 定义 | 示例 | 所在目录 |
|-----|------|------|---------|
| **发布必需** | Chrome 扩展运行时必须加载的文件 | manifest.json、content.js、background.js、icons | `extension/` |
| **开发辅助-测试** | 功能测试、Bug 验证用页面和截图 | tests/、test-full-ui.html、bug-verification.html | `dev/tests/` |
| **开发辅助-预览** | 调试用 Demo、UI 预览页面 | floating-layer-demo.html、ui-preview-*.html、theme-preview.html | `dev/pages/` |
| **开发辅助-文档** | Bug 报告等临时文档 | debug-toolbar-not-opening.md | `dev/docs/` |
| **开发辅助-样式** | 设计令牌等样式参考 | ui-design-tokens.css | `dev/styles/` |
| **设计资源** | UI 设计参考素材 | 首页设计参考/、首页设计.zip | `design/` |
| **项目核心规范** | 项目级开发规范文件 | Project_Rule.md | 项目根目录（保留） |
| **AI 辅助** | TRAE 工具生成/使用的文件 | .trae/ | 项目根目录（隐藏） |
| **AI 辅助-调试** | TRAE 调试用测试页面（内联、无外部引用） | .trae/debug/ 下 3 个 HTML | 项目根目录（隐藏目录内，保持不动） |

---

## 5. 整理后目标目录结构

### 5.1 整体结构

```
HTML 排版插件/                     ← 项目根目录（Git 仓库根）
│
├── extension/                      ← 【新增】Chrome 扩展实际加载目录
│   ├── manifest.json               ← 从根目录移入
│   ├── background/                 ← 从根目录移入
│   │   └── background.js
│   ├── content/                    ← 从根目录移入
│   │   ├── content.js
│   │   └── content.css
│   ├── icons/                      ← 从根目录移入
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── README.md                   ← 从根目录移入（面向用户的扩展说明）
│
├── dev/                            ← 【新增】开发辅助文件统一目录
│   ├── docs/                       ← 开发文档
│   │   └── debug-toolbar-not-opening.md
│   │
│   ├── tests/                      ← 测试文件（原 tests/ 整体移入）
│   │   ├── test-screenshots/
│   │   ├── test0705/
│   │   ├── test-page-v2.html
│   │   ├── font-test-mock.html
│   │   ├── bug-verification.html
│   │   └── TEST_REPORT_SCREENSHOT.md
│   │
│   ├── pages/                      ← 测试/预览页面（从根目录归集）
│   │   ├── floating-layer-demo.html
│   │   ├── test-full-ui.html
│   │   ├── test-style-isolation.html
│   │   ├── ui-preview-refresh.html
│   │   ├── ui-preview-v5.html
│   │   ├── ui-preview.html
│   │   └── theme-preview.html
│   │
│   └── styles/                     ← 开发用样式参考
│       └── ui-design-tokens.css
│
├── design/                         ← 【新增】设计资源目录
│   ├── 首页设计参考/
│   │   ├── pages/
│   │   └── assets/
│   └── 首页设计.zip
│
├── .trae/                          ← 保持不变（隐藏目录）
│   ├── bugs/
│   ├── debug/                      ← 调试用测试页面（3 个 HTML，内联无外部引用）
│   ├── plans/
│   └── skills/
│
├── Project_Rule.md                 ← 保留在项目根目录（核心规范文件）
└── .gitignore                      ← 保留在项目根目录（需更新内容）
```

### 5.2 Chrome 扩展加载视角

**整理前**：Chrome 加载项目根目录全部内容 → ~150MB

**整理后**：Chrome 加载 `extension/` 目录 → 仅包含以下文件：

```
extension/
├── manifest.json
├── background/
│   └── background.js
├── content/
│   ├── content.js
│   └── content.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

**预计扩展加载体积：约 500KB（验收标准：< 1MB）**（相比当前 ~150MB，减少 99% 以上）

---

## 6. 文件迁移明细

### 6.1 第一类：发布必需（移入 extension/）

| 当前路径 | 目标路径 | 操作 |
|---------|---------|------|
| `manifest.json` | `extension/manifest.json` | 移动 |
| `background/background.js` | `extension/background/background.js` | 移动（含目录） |
| `content/content.js` | `extension/content/content.js` | 移动（含目录） |
| `content/content.css` | `extension/content/content.css` | 移动（含目录） |
| `icons/icon16.png` | `extension/icons/icon16.png` | 移动（含目录） |
| `icons/icon48.png` | `extension/icons/icon48.png` | 移动（含目录） |
| `icons/icon128.png` | `extension/icons/icon128.png` | 移动（含目录） |
| `README.md` | `extension/README.md` | 移动 |

### 6.2 第二类：保留在项目根目录（不动）

| 当前路径 | 目标路径 | 操作 | 原因 |
|---------|---------|------|------|
| `Project_Rule.md` | `Project_Rule.md` | 保持不变 | 项目核心规范，SKILL.md 依赖其在根目录的位置 |
| `.gitignore` | `.gitignore` | 保持不变（内容需更新） | Git 配置文件 |
| `.trae/` | `.trae/` | 保持不变 | 隐藏目录，Chrome 不加载；AI 辅助数据 |
| `.trae/debug/test-scope-precise.html` | `.trae/debug/test-scope-precise.html` | 保持不变 | TRAE 调试用文件，位于隐藏目录内，不影响加载体积 |
| `.trae/debug/test-scope.html` | `.trae/debug/test-scope.html` | 保持不变 | 同上 |
| `.trae/debug/test-style-isolation-root.html` | `.trae/debug/test-style-isolation-root.html` | 保持不变 | 同上 |

### 6.3 第三类：开发辅助-测试（移入 dev/tests/）

| 当前路径 | 目标路径 | 操作 |
|---------|---------|------|
| `tests/test-screenshots/` | `dev/tests/test-screenshots/` | 移动目录 |
| `tests/test0705/` | `dev/tests/test0705/` | 移动目录 |
| `tests/test-page-v2.html` | `dev/tests/test-page-v2.html` | 移动 |
| `tests/font-test-mock.html` | `dev/tests/font-test-mock.html` | 移动 |
| `tests/bug-verification.html` | `dev/tests/bug-verification.html` | 移动 |
| `tests/TEST_REPORT_SCREENSHOT.md` | `dev/tests/TEST_REPORT_SCREENSHOT.md` | 移动 |

### 6.4 第四类：开发辅助-预览页面（移入 dev/pages/）

| 当前路径 | 目标路径 | 操作 | 需修正路径 |
|---------|---------|------|-----------|
| `floating-layer-demo.html` | `dev/pages/floating-layer-demo.html` | 移动 | 否（无外部引用） |
| `test-full-ui.html` | `dev/pages/test-full-ui.html` | 移动 | **是**（引用 content/ 下的 CSS 和 JS） |
| `test-style-isolation.html` | `dev/pages/test-style-isolation.html` | 移动 | 否（无外部引用） |
| `ui-preview-refresh.html` | `dev/pages/ui-preview-refresh.html` | 移动 | 否（无外部引用） |
| `ui-preview-v5.html` | `dev/pages/ui-preview-v5.html` | 移动 | 否（无外部引用） |
| `ui-preview.html` | `dev/pages/ui-preview.html` | 移动 | **是**（引用 content/content.css） |
| `theme-preview.html` | `dev/pages/theme-preview.html` | 移动 | **是**（引用 ui-design-tokens.css） |

### 6.5 第五类：开发辅助-样式参考（移入 dev/styles/）

| 当前路径 | 目标路径 | 操作 |
|---------|---------|------|
| `ui-design-tokens.css` | `dev/styles/ui-design-tokens.css` | 移动 |

### 6.6 第六类：开发辅助-文档（移入 dev/docs/）

| 当前路径 | 目标路径 | 操作 |
|---------|---------|------|
| `debug-toolbar-not-opening.md` | `dev/docs/debug-toolbar-not-opening.md` | 移动 |

### 6.7 第七类：设计资源（移入 design/）

| 当前路径 | 目标路径 | 操作 |
|---------|---------|------|
| `首页设计参考/` | `design/首页设计参考/` | 移动目录 |
| `首页设计.zip` | `design/首页设计.zip` | 移动 |

---

## 7. 路径修正明细

测试页面和预览页面迁移后，其引用的外部资源路径会失效，需要逐一修正。

### 7.1 dev/pages/test-full-ui.html

**当前引用**：
```html
<link rel="stylesheet" href="content/content.css">
<script src="content/content.js"></script>
```

**修正后引用**：
```html
<link rel="stylesheet" href="../../extension/content/content.css">
<script src="../../extension/content/content.js"></script>
```

**路径推导**：`dev/pages/` → 上两级 → 项目根 → `extension/content/`

### 7.2 dev/pages/ui-preview.html

**当前引用**：
```html
<link rel="stylesheet" href="content/content.css">
```

**修正后引用**：
```html
<link rel="stylesheet" href="../../extension/content/content.css">
```

### 7.3 dev/pages/theme-preview.html

**当前引用**：
```html
<link rel="stylesheet" href="ui-design-tokens.css">
```

**修正后引用**：
```html
<link rel="stylesheet" href="../styles/ui-design-tokens.css">
```

**路径推导**：`dev/pages/` → 上一级到 dev/ → `styles/ui-design-tokens.css`

### 7.4 dev/tests/test-page-v2.html

**当前引用**（绝对路径，在 file:// 协议下指向文件系统根，本身就是错误的）：
```html
<link rel="stylesheet" href="/content/content.css">
<script src="/content/content.js"></script>
```

**修正后引用**（改为相对路径）：
```html
<link rel="stylesheet" href="../../extension/content/content.css">
<script src="../../extension/content/content.js"></script>
```

**路径推导**：`dev/tests/` → 上两级 → 项目根 → `extension/content/`

> **注意**：原文件使用的是绝对路径 `/content/...`，在本地 file:// 打开时本就无法正确加载。此次迁移顺便修正为正确的相对路径。

---

## 8. 配置文件变更

### 8.1 manifest.json

**无需修改内容**，但文件位置从项目根目录移入 `extension/` 目录。所有内部路径（`background/background.js`、`content/content.js`、`icons/icon16.png` 等）均为相对于 manifest.json 的路径，移入 `extension/` 后相对关系不变，因此文件内容无需改动。

### 8.2 .gitignore（需更新内容）

**当前内容**：
```
.DS_Store
node_modules/
*.log
.vscode/
.idea/
*.tmp
*.bak
dist/
build/
test-screenshots/

# 临时测试文件与目录
/tests/
/ui-preview.html
/theme-preview.html
/TEST_REPORT_SCREENSHOT.md
/首页设计.zip
/首页设计参考/
```

**更新后内容**：
```gitignore
# 系统文件
.DS_Store
*.log

# 编辑器
.vscode/
.idea/

# 临时文件
*.tmp
*.bak

# 构建产物
node_modules/
dist/
build/

# 大体积开发资源（可选排除，按需开关）
# dev/tests/test-screenshots/
# design/首页设计.zip
```

**变更说明**：
- 删除了 `/tests/`、`/ui-preview.html`、`/theme-preview.html` 等旧路径排除项（文件已迁移）
- 新增注释掉的大体积资源排除项，用户可根据需要决定是否排除
- 保留了系统文件、编辑器、构建产物等通用排除项

---

## 9. 分步实施计划（WBS）

### 阶段一：创建 extension/ 目录并移入核心文件（P0）

- [ ] 创建 `extension/` 目录
- [ ] 移动 `manifest.json` → `extension/manifest.json`
- [ ] 移动 `background/` 目录 → `extension/background/`
- [ ] 移动 `content/` 目录 → `extension/content/`
- [ ] 移动 `icons/` 目录 → `extension/icons/`
- [ ] 移动 `README.md` → `extension/README.md`
- [ ] 验证：在 Chrome 中加载 `extension/` 目录，扩展功能正常

### 阶段二：创建 dev/ 目录结构（P0）

- [ ] 创建 `dev/docs/` 目录
- [ ] 创建 `dev/tests/` 目录
- [ ] 创建 `dev/pages/` 目录
- [ ] 创建 `dev/styles/` 目录

### 阶段三：迁移测试文件到 dev/tests/（P0）

- [ ] 移动整个 `tests/` 目录内容 → `dev/tests/`
- [ ] 删除空的 `tests/` 目录
- [ ] 验证：测试页面文件完整无损

### 阶段四：迁移预览页面到 dev/pages/（P1）

- [ ] 移动 7 个根目录 HTML 文件 → `dev/pages/`
- [ ] 修正 `test-full-ui.html` 中的 CSS/JS 引用路径
- [ ] 修正 `ui-preview.html` 中的 CSS 引用路径
- [ ] 修正 `theme-preview.html` 中的 CSS 引用路径
- [ ] 验证：所有 HTML 文件在浏览器中打开，样式/脚本加载正常

### 阶段五：迁移其他开发资源（P1）

- [ ] 移动 `ui-design-tokens.css` → `dev/styles/`
- [ ] 移动 `debug-toolbar-not-opening.md` → `dev/docs/`
- [ ] 验证：文件完整

### 阶段六：迁移设计资源到 design/（P1）

- [ ] 创建 `design/` 目录
- [ ] 移动 `首页设计参考/` → `design/首页设计参考/`
- [ ] 移动 `首页设计.zip` → `design/首页设计.zip`
- [ ] 验证：目录结构完整，图片可预览，zip 可解压

### 阶段七：修正 dev/tests/ 中测试页面路径（P1）

- [ ] 修正 `dev/tests/test-page-v2.html` 中的 CSS/JS 引用路径（从绝对路径改为相对路径）
- [ ] 验证：页面打开正常，样式和脚本加载正确

### 阶段八：更新配置与文档（P0）

- [ ] 更新 `.gitignore`（移除旧路径排除项，添加新路径注释项）
- [ ] 更新 `Project_Rule.md` 第一章"固定目录结构"描述
- [ ] 更新 `extension/README.md` 中的项目结构章节
- [ ] 更新 `.trae/skills/project-dev-standard/SKILL.md` 中 README 路径为 `extension/README.md`

### 阶段九：整体验证与清理（P0）

- [ ] 确认原根目录下的 tests/、首页设计参考/ 等目录已删除
- [ ] 确认项目根目录仅保留：extension/、dev/、design/、.trae/、Project_Rule.md、.gitignore
- [ ] 在 Chrome 中重新加载 `extension/` 目录
- [ ] 全面测试扩展功能（三态切换、选择标记、编辑、导出等）
- [ ] 检查扩展详情页显示的体积（应 < 1MB）
- [ ] 验证开发用测试页面均可正常打开

---

## 10. 分步验证方案

### 10.1 阶段验证清单

| 阶段 | 验证项 | 预期结果 | 回滚策略 |
|-----|--------|---------|---------|
| 阶段一：核心文件移入 extension/ | Chrome 加载 extension/ 无报错 | 扩展图标正常、功能正常 | 将文件移回项目根目录 |
| 阶段二：dev/ 目录创建 | 4 个子目录均存在 | 目录结构正确 | 删除 dev/ 目录即可 |
| 阶段三：测试文件迁移 | dev/tests/ 文件数与原 tests/ 一致 | 大小一致、无损坏 | 移回原路径 |
| 阶段四：预览页面迁移+路径修正 | dev/pages/ 中所有 HTML 可正常打开 | 样式加载正常、无 404 | 移回原路径+还原路径引用 |
| 阶段五：其他开发资源迁移 | dev/styles/ 和 dev/docs/ 文件完整 | 文件大小一致 | 移回原路径 |
| 阶段六：设计资源迁移 | design/ 目录完整 | 图片可预览、zip 可解压 | 移回原路径 |
| 阶段七：测试页面路径修正 | dev/tests/test-page-v2.html 打开正常 | 样式和脚本加载正确 | 还原路径引用 |
| 阶段八：配置与文档更新 | .gitignore 无旧路径残留 | 规范文档描述与实际结构一致 | 还原文件内容 |
| 阶段九：整体验证 | 扩展体积 < 1MB，功能完整 | 所有测试页面可用 | 分阶段回滚 |

### 10.2 最终验收指标

- [ ] Chrome 扩展加载体积从 ~150MB 降至 < 1MB
- [ ] 扩展所有功能不受影响（三态切换、选择标记、编辑、导出等）
- [ ] Chrome 扩展加载路径变更为 `extension/` 目录
- [ ] 所有开发辅助文件已从扩展加载目录中移出
- [ ] 测试页面和预览页面路径引用已修正，打开无异常
- [ ] Project_Rule.md 保留在项目根目录
- [ ] .gitignore 已根据新结构更新
- [ ] 项目根目录整洁，分类清晰

---

## 11. 文档演进规划（实施指引）

> 以下为实施阶段（cody）必须执行的文档变更清单。archer 不做实际修改，仅列出目标状态与变更内容。

### 11.1 需要修改的文档

#### 11.1.1 extension/README.md（原根目录 README.md 移入后）

- **文件位置变化**：`README.md` → `extension/README.md`
- **修改章节 1**：第三章"项目结构"
  - **当前状态**：描述的是旧的根目录扁平结构
  - **目标状态**：更新为新的"extension/ 加载目录 + 根目录开发区"双层结构
  - **变更内容草稿**：
    ```markdown
    ## 项目结构
    
    ### 扩展文件（Chrome 加载目录）
    
    本目录（extension/）是 Chrome 扩展的实际加载目录，仅包含运行时必需文件：
    
    ```
    extension/
    ├── manifest.json          # 扩展配置
    ├── background/
    │   └── background.js      # Service Worker
    ├── content/
    │   ├── content.js         # 页面内核心脚本
    │   └── content.css        # 页面内样式
    ├── icons/
    │   ├── icon16.png
    │   ├── icon48.png
    │   └── icon128.png
    └── README.md              # 本文件
    ```
    
    ### 开发文件（项目根目录）
    
    项目根目录下还包含开发辅助资源（不随扩展发布）：
    
    ```
    项目根/
    ├── extension/             # 扩展加载目录（即本目录的上一级）
    ├── dev/                   # 开发辅助资源
    │   ├── docs/              # 开发文档
    │   ├── tests/             # 测试页面与截图
    │   ├── pages/             # 预览/Demo 页面
    │   └── styles/            # 样式设计参考
    ├── design/                # 设计资源
    ├── .trae/                 # AI 辅助工具数据（隐藏目录）
    ├── Project_Rule.md        # 项目开发规范
    └── .gitignore
    ```
    ```

- **修改章节 2**："代码规范"章节中指向 Project_Rule.md 的两处相对链接（第 311 行、第 336 行）
  - **当前状态**：`[Project_Rule.md](Project_Rule.md)`（指向同级目录，移入 extension/ 后将失效）
  - **目标状态**：`[Project_Rule.md](../Project_Rule.md)`（指向项目根目录）
  - **变更说明**：README.md 移入 extension/ 后，与根目录的 Project_Rule.md 不再同级，需从 `extension/` 回退一级到项目根目录。共 2 处需同步修改。

#### 11.1.2 Project_Rule.md（保留在项目根目录）

- **文件位置**：保持在项目根目录（不移动）
- **修改章节**：第一章 1.1 固定目录结构
- **当前状态**：描述的是旧的根目录扁平结构，manifest.json 等在根目录
- **目标状态**：更新为新的"extension/ 加载目录 + 根目录开发区"结构规范
- **变更内容草稿**：
  ```markdown
  ### 1.1 固定目录结构
  
  **禁止随意变动以下目录结构**：
  
  ```
  项目根目录/
  ├── extension/                   ← Chrome 扩展加载目录（核心发布文件）
  │   ├── manifest.json            ← 扩展配置文件（有且只有一个）
  │   ├── background/
  │   │   └── background.js        ← Service Worker
  │   ├── content/
  │   │   ├── content.js           ← 页面内核心脚本
  │   │   └── content.css          ← 页面内样式
  │   ├── icons/
  │   │   ├── icon16.png
  │   │   ├── icon48.png
  │   │   └── icon128.png
  │   └── README.md                ← 扩展说明（面向用户）
  │
  ├── dev/                         ← 开发辅助资源
  │   ├── docs/                    ← 开发文档
  │   ├── tests/                   ← 测试页面与截图
  │   ├── pages/                   ← 预览/Demo 页面
  │   └── styles/                  ← 样式参考文件
  │
  ├── design/                      ← 设计资源
  ├── .trae/                       ← AI 辅助文件（隐藏目录）
  ├── Project_Rule.md              ← 本规范文档
  └── .gitignore
  ```
  
  **关键原则**：
  - `extension/` 目录是 Chrome 扩展的实际加载目录，仅包含运行时必需文件
  - 开发/测试/设计资源全部放在 `extension/` 之外，避免增加扩展加载体积
  - 本文件（Project_Rule.md）固定在项目根目录，不随扩展发布
  ```

#### 11.1.3 .trae/skills/project-dev-standard/SKILL.md

- **修改位置**：第一步"强制读取规范文件"中的 README 路径
- **当前状态**：`读取 README.md（项目根目录下）`
- **目标状态**：`读取 extension/README.md（扩展目录下）`
- **变更说明**：README.md 移入 extension/ 后，SKILL 需要从新路径读取
- **变更内容草稿**：
  ```markdown
  ### 第一步：强制读取规范文件（必须首先执行）
  
  在进行**任何操作之前**，必须依次读取以下两个文件的**全部内容**：
  
  1. 读取 `Project_Rule.md`（项目根目录下）
  2. 读取 `extension/README.md`（扩展加载目录下）
  ```

#### 11.1.4 .gitignore

- **修改位置**：项目根目录
- **当前状态**：包含 `/tests/`、`/ui-preview.html` 等旧路径排除项
- **目标状态**：移除旧路径排除项，更新为新结构的注释项
- **变更内容**：见第 8.2 节

### 11.2 不需要修改的文档

- `manifest.json`：移入 extension/ 后内容无需修改（所有内部路径为相对路径）
- `.trae/plans/` 下的规划文档：历史文档，不影响功能，逐步更新即可
- `.trae/bugs/` 下的 Bug 报告：历史文档，不影响功能
- `content/` 和 `background/` 下的代码文件：移入 extension/ 后内容不变

---

## 12. 风险与注意事项

### 12.1 风险点

| 风险 | 影响 | 概率 | 应对措施 |
|-----|------|------|---------|
| 测试页面路径引用错误 | 部分测试页面样式/脚本加载失败 | 中 | 迁移后逐一打开验证，按第 7 节修正路径 |
| Chrome 扩展加载路径变更 | 用户需要重新在 Chrome 中选择 extension/ 目录 | 高 | 在 README 和变更说明中明确告知加载路径变更 |
| SKILL 找不到 README.md | 项目开发规范 Skill 读取 README 失败 | 中 | 同步更新 SKILL.md 中的 README 路径为 extension/README.md |
| .trae/ 中旧文档引用旧路径 | 部分规划文档和 Bug 报告中的路径已过时 | 低 | 影响可接受，后续逐步更新即可 |

### 12.2 注意事项

1. **先备份再操作**：实施迁移前建议先提交一次 git commit，确保可回滚
2. **按阶段实施**：严格按 WBS 阶段顺序执行，每阶段验证后再进行下一阶段
3. **Chrome 加载路径变更**：迁移完成后，Chrome 扩展的加载目录从项目根目录变为 `extension/` 目录，需要在 Chrome 扩展管理页面重新选择
4. **路径修正优先级**：优先修正实际使用的测试页面路径，不常用的页面可后续处理
5. **Project_Rule.md 不动**：这是 clara 审查明确要求的——必须保留在项目根目录

---

## 13. 预期收益

| 指标 | 整理前 | 整理后 | 改善幅度 |
|-----|--------|--------|---------|
| 扩展加载体积 | ~150 MB | 约 500KB（验收 < 1MB） | **减少 99%+** |
| 扩展加载目录文件数 | 20+ 个文件/目录 | 6 个（含 README） | 减少 70%+ |
| 项目根目录清晰度 | 扁平散乱，职责不清 | 分层清晰，职责明确 | 显著提升 |
| 发布包制作 | 需手动排除大量文件 | 直接 zip extension/ 目录即可 | 大幅简化 |
| 开发资源管理 | 散落各处 | 按类别归集到 dev/ 和 design/ | 大幅提升 |

---

## 14. 最终验收清单

### P0（缺一不可）

- [ ] 扩展功能完全正常（所有核心功能不受影响）
- [ ] Chrome 扩展加载体积从 ~150MB 降至 < 1MB
- [ ] Chrome 扩展加载目录变更为 `extension/`
- [ ] `extension/` 目录内仅包含运行时必需文件
- [ ] manifest.json 内容正确，所有引用路径有效
- [ ] Project_Rule.md 保留在项目根目录，未移动
- [ ] 项目根目录整洁，分类清晰

### P1（重要）

- [ ] extension/README.md 项目结构章节已更新
- [ ] Project_Rule.md 目录结构规范已更新
- [ ] .trae/skills/project-dev-standard/SKILL.md 中 README 路径已更新
- [ ] .gitignore 已根据新结构调整
- [ ] 所有测试页面和预览页面路径引用已修正
- [ ] 所有迁移文件完整无损（大小、内容一致）

### P2（次要）

- [ ] .trae/ 中引用旧路径的文档已更新（如有必要）
- [ ] 设计资源目录结构合理，查找方便
