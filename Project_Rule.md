# HTML Diff Marker - 项目开发规范

> **⚠️ 警告：这是本项目最高优先级的文件，每次启动任何代码开发任务前必须完整阅读。**
>
> 本文件定义了本 Chrome 扩展项目的开发流程、代码规范和工具使用规则。
>
> —— 不读此文件就开始写代码，会导致操作失败、代码质量问题、版本不一致等严重后果。

***

## 🔴 启动任务前自检清单（**必须在任何操作前完成**）

```
☐ 已读取 Project_Rule.md 的全部内容
☐ 清楚 Rule 0: Edit/Write 前必须先 Read
☐ 清楚本项目的工具使用规范（第三章）
☐ 清楚代码-文档一致性原则（第四章）
☐ 清楚发布前检查清单（第十章）
```

> **无论任务描述有多简单，都必须先完成以上自检。**

***

## 🔴 开发第一步：强制规则（开始任何任务前先读这里）

> **这是首要且非可选的规则。违反以下任一条将直接导致操作失败。**

### Rule 0: 任何文件编辑前必须先 Read

```
┌─────────────────────────────────────────────────────┐
│  操作流程（必须严格遵守顺序）：                       │
│                                                     │
│  1. Read(目标文件路径)          ← ⭐ ALWAYS FIRST   │
│     └─> 无论你认为自己有多了解这个文件                │
│                                                     │
│  2. 基于读取到的实际内容决定修改方案                 │
│     └─> 不要依赖记忆或假设文件内容                   │
│                                                     │
│  3. Edit(目标文件, old_str, new_str)                │
│     或 Write(目标文件, 完整新内容)                   │
│                                                     │
│  ❌ 禁止：第一步就直接 Edit 或 Write                 │
│  ❌ 禁止：因为 Edit 失败就去写生成器脚本             │
│  ❌ 禁止：DeleteFile + Write（Write 可以直接覆盖）   │
└─────────────────────────────────────────────────────┘
```

***

## 一、项目结构规范

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

### 1.2 禁止创建的文件

- ❌ `content_generator_v*.js` / `generate_*.py` / `*.gen.*` — **任何语言**的代码生成器/中转脚本
- ❌ 任何内容为 "content.js 完整代码字符串" 的文件（content.js 本身必须是唯一的源文件）
- ❌ `*.tmp`、`*.bak` — 临时备份文件
- ❌ 无意义的空文件（如名为 "1" 的空文件）
- ❌ `v1_`、`old_`、`backup_` 等前缀的历史版本文件

**核心原则**：以下文件必须是**直接手写的源文件**，不是由任何脚本生成的产物：
`manifest.json`、`content/content.js`、`content/content.css`、`background/background.js`、`README.md`

### 1.3 允许的文件类型（区分脚本种类很重要）

不是所有脚本都禁止。以下是清晰的分类：

| 类型               | 是否允许           | 说明                                                                                                   |
| ---------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| ❌ **"代码重生成器"**   | **永久禁止**       | 把核心源文件的**完整代码内容**作为字符串硬编码在自己内部，运行时用 `write()` 覆盖源文件（如 `generate_ext.py`）。它把自己变成"唯一真相来源"，导致信息重复和一致性噩梦 |
| ✅ **"工具脚本"**     | 允许长期存在         | 不包含任何源文件的代码内容，只是调用外部工具。如 `build.sh`（zip 压缩用于发布）、`check.sh`（运行语法检查）                                   |
| ⚠️ **"一次性临时脚本"** | 允许但**必须用完就删除** | 用于数据迁移、批量格式转换等一次性操作。但**同样不能包含核心源文件的完整代码内容**——如果需要完全重写某个文件，直接用 `Write` 工具即可，不需要经过脚本中转                 |

### 1.4 信息重复原则（铁律）

> **核心源文件的代码/内容，永远不应该以字符串形式存在于项目中的任何其他文件里。**

这是防止 generate\_ext.py 式陷阱的最根本规则。违反它意味着：

- 任何修改都必须改两处 -> 必然出现不一致
- 子任务检测到不一致后会反复重试 -> 死循环
- 最终只能通过"临时脚本绕过"的方式完成任务，但这只是治标不治本

**正确做法**：content.js 的代码只在 content.js 文件中。README.md 的内容只在 README.md 文件中。要修改就直接 Edit 或 Write 目标文件。

***

## 二、代码风格规范

### 2.1 JavaScript 基础规范

| 规则        | 要求                                                             |
| --------- | -------------------------------------------------------------- |
| **作用域隔离** | content.js 必须用 `(function() { ... })();` 包裹         |
| **严格模式**  | 文件开头加 `'use strict';`                                          |
| **防重复注入** | content.js 开头必须检查：`if (window.__htmlDiffMarkerLoaded) return;` |
| **函数命名**  | 驼峰式 `camelCase`，动词开头，如 `markElement`、`applyStyleChange`        |
| **变量命名**  | 驼峰式，如 `isSelecting`、`markedElements`                           |
| **常量命名**  | 全大写+下划线，如 `STATE_KEY`、`STYLE_PROPS`                            |
| **缩进**    | 2 空格                                                           |
| **引号**    | JavaScript 中用单引号 `'`；HTML 字符串中用双引号 `"`                         |
| **注释**    | 函数上方加简短功能描述；复杂逻辑加行内注释                                          |

### 2.2 CSS 类名规范

```css
/* 正确：统一前缀 html-diff-marker- */
.html-diff-marker-toolbar { ... }
.html-diff-marker-inspector { ... }
.html-diff-marker-resize-handle { ... }
.html-diff-marker-wake-btn { ... }

/* 错误：污染页面原有样式 */
.toolbar { ... }
.my-panel { ... }
.inspector { ... }
```

**规则**：所有注入到页面的元素类名**必须**以 `html-diff-marker-` 开头。

***

## 三、工具使用规范（AI 开发环境专用）

### 3.1 文件操作规则

| 规则                                  | 详细说明                                                                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 **Rule 0: Edit/Write 前必须先 Read** | **任何情况下，修改文件的第一条操作必须是 Read(file)**。即使你"完全知道"文件内容，也必须先 Read —— 这是工具链的硬性要求，不是建议。**Read 的目的有两个**：① 确认文件当前内容；② 判断接下来该用 Edit 还是 Write。                                                                 |
| ⚠️ **如何选择 Edit vs Write（核心决策）**     | **Read 后按以下逻辑判断**：→ 只是修改局部内容（函数、段落、配置项）→ 用 Edit→ 需要对长文档做全局插入 + 章节编号调整 → 直接用 Write 全量重写→ 少量增删改 → 优先 Edit→ 大量增删改 → 直接 Write→ Edit 连续失败 2 次 → 降级到 Write**总结**：局部修改用 Edit，全局重写用 Write，工具失败就降级，禁止走脚本绕路 |
| ❌ **禁止"删除→重写"两步模式**                 | 不要先 `DeleteFile(content.js)` 再 `Write(content.js)`。Write 工具本身就可以覆盖已有文件                                                                                                                            |
| ❌ **禁止创建代码生成器脚本或中转脚本**              | 不要写 `content_generator.js` 或 `generate_ext.py` 来用字符串拼接生成 content.js/css/html。**直接写目标文件本身**。任何"把核心源文件当作脚本输出产物"的做法都禁止。即使是临时脚本用完就删，也不应该用来修改核心源文件。                                                    |
| ❌ **禁止提交半成品代码**                     | content.js 必须是完整可运行的代码，不能只有 IIFE 开头没有结尾                                                                                                                                                           |

### 3.2 为什么这些规则很重要

本项目在开发过程中曾因以下错误模式导致问题：

1. **删除循环**：子任务反复删除->重写->检测->再删除，浪费大量时间
2. **生成器脚本错误**：用 `generate_ext.py` 或 `content_generator.js` 来"生成" content.js。引号转义和换行处理极易出错。更严重的是：子任务会**误以为 content.js 是生成出来的而不是源文件**，从而不敢直接 Edit 它，陷入"修改生成器 → 重新生成 → 检测不一致 → 再修改"的死循环
3. **中转脚本绕过**：Edit 工具失败后用临时 Node.js 脚本来修改文件，虽然"用完就删"，但这恰恰违反了"源文件即唯一真相"的原则
4. **文件丢失**：删除操作被中断时可能导致文件为空或缺失

**记住**：Write 工具就是设计来覆盖文件的，不需要先删后写。核心源文件就是手写文件，直接 Edit 或 Write。如果 Edit 一直失败，降级到 Write——不要用脚本绕过。

### 3.3 AI 操作流程建议

```
场景 1：修改 content.js 中某个函数
  └─> Read(content.js) 定位代码位置
  └─> Edit(content.js) 精准修改
  └─> 运行 node --check 验证语法

场景 2：完全重写 content.js
  └─> Write(content.js, 完整代码)
  └─> 运行 node --check 验证语法

场景 3：新增功能（如新增一个导出格式）
  └─> Read(content.js) 了解现有结构
  └─> Edit(content.js) 在合适位置插入新函数
  └─> 如有 CSS，同步 Edit(content.css)
  └─> 功能测试

场景 4：Edit 失败的降级流程
  └─> 先判断：是否是对长文档做全局插入 + 编号调整？
  └─>   → 是 → 直接使用 Write 全量重写，跳过后续 Edit 步骤
  └─>   → 否 → 按以下流程操作：
  └─> Edit(file, old_str, new_str) -> 失败（old_string 不匹配）
  └─> 重新 Read(file) 确认最新内容
  └─> 再试一次 Edit（修正 old_string）
  └─> 再次失败 -> 改用 Write(file, 完整代码) 全量重写
  └─> 绝对不要：写 generate_xxx.py 或 _tmp_xxx.js 来间接生成文件！

场景 5：重写 README.md 或其他长文档
  └─> Read(README.md) 了解当前结构
  └─> Edit(README.md) 修改具体章节
  └─> Edit 连续失败 -> Write(README.md, 完整新内容)
  └─> 绝对不要：在 generate_ext.py 或其他脚本中以字符串形式维护 README 内容，README.md 本身就是唯一真相来源
```

***

## 四、代码-文档一致性原则

> 代码和文档必须同步更新——任何一方落后都会导致用户体验混乱、调试困难、功能描述不完整。

### 4.1 修改流程（标准顺序）

1. 先读 README.md 理解当前文档描述
2. 修改代码（实现/修改功能）
3. 更新 README.md 中对应章节
4. 反向检查：README 描述的功能在代码中是否真的实现
5. 如有不一致，同步修正

### 4.2 核心原则（铁律）

| 方向                   | 要求                            |
| -------------------- | ----------------------------- |
| **改代码 → 检查文档**       | 代码中实现的功能 → 在 README.md 中有相应描述 |
| **改文档 → 检查代码**       | README 描述的功能 → 在代码中确实有实现      |
| **新增功能**             | 同时更新 README 对应章节              |
| **删除功能**             | 同时删除 README 中对应描述             |
| **manifest.json 改动** | 同时确认代码行为与配置一致                 |

### 4.3 禁止事项

- ❌ 禁止：只改代码不改文档（用户不知道有这个功能）
- ❌ 禁止：只改文档不改代码（误导用户以为有这个功能）
- ❌ 禁止：文档描述超前于代码（功能未实现先写文档）

### 4.4 检查清单（发布前必做）

- ☐ README 描述的每一个功能 → 代码中能找到对应实现
- ☐ 代码中的每一个核心功能 → 在 README 中能找到描述
- ☐ manifest.json 的配置 → 与实际代码行为一致
- ☐ 文档中的操作流程 → 与代码实际执行流程一致

***

## 五、功能模块规范

### 5.1 content.js 模块划分

代码必须按以下功能分区组织，用注释行分隔：

```javascript
// ================ 常量与状态 ================
// STATE_KEY / POS_KEY / state 对象 / STYLE_PROPS

// ================ 工具函数 ================
// uid, cssProp, escapeHtml, toHexColor, buildSelector, elementInfo, getOuterHTML

// ================ 样式管理 ================
// recordOriginalStyles, applyStyleChange, resetAllStyles, hasStyleChanges

// ================ 选择模式 ================
// onHover, onClick, onKey, startSelecting, stopSelecting

// ================ 标记管理 ================
// markElement, applyMarkVisual, removeMark, clearAll

// ================ 可视化编辑 ================
// toggleVisualEditing, addVisualOverlay, removeVisualOverlay
// enableElementDrag, addResizeHandles, enableWheelResize, enableTextEdit
// makeElementDraggable, makeElementResizable, checkAlignment

// ================ 工具栏 ================
// renderToolbar, hideAll, showWakeOnly, showToolbarOnly, getState, makeDraggable

// ================ 检查面板 ================
// openInspector, closeInspector, saveFromInspector
// refreshInspectorStyleInputs, updateInspectorStyleStats, updateOverlayBadges

// ================ 状态持久化 ================
// saveState, loadState

// ================ 导出功能 ================
// exportDiffMessage, buildDiffPayload, buildMarkdownSection, lineDiff

// ================ 消息处理 ================
// onMessage (处理 TOGGLE_SELECT, CLEAR_ALL, EXPORT_NOW, GET_STATUS, TOGGLE_WAKE)

// ================ 初始化 ================
// init() + DOMContentLoaded 事件监听
```

### 5.2 模块间依赖关系

```
┌─────────────┐       ┌──────────────┐
│  选择模式    │ ────▶ │  标记管理     │
└─────────────┘       └──────────────┘
                            ▲
                            │
                    ┌───────┴────────┐
                    │  状态持久化      │
                    └────────────────┘

┌─────────────┐       ┌──────────────┐
│  可视化编辑   │ ────▶ │  样式管理     │
└─────────────┘       └──────────────┘

┌─────────────┐       ┌──────────────┐
│  工具栏      │ ────▶ │  检查面板     │
└─────────────┘       └──────────────┘
                            │
                    ┌───────┴────────┐
                    │  导出功能       │
                    └────────────────┘
```

***

## 六、消息协议规范

### 6.1 消息类型清单

| 消息类型             | 发送方 → 接收方                  | 数据格式                                      | 返回                                                  |
| ---------------- | -------------------------- | ----------------------------------------- | --------------------------------------------------- |
| `TOGGLE_SELECT`  | background → content | `{ type: 'TOGGLE_SELECT' }`               | -                                                   |
| `CLEAR_ALL`      | background → content | `{ type: 'CLEAR_ALL' }`                   | -                                                   |
| `EXPORT_NOW`     | background → content | `{ type: 'EXPORT_NOW' }`                  | -                                                   |
| `TOGGLE_WAKE`    | background → content | `{ type: 'TOGGLE_WAKE' }`                | -                                                   |
| `GET_STATUS`     | background → content | `{ type: 'GET_STATUS' }`                  | `{ total, modified, isSelecting, isToolbarHidden }` |
| `EXPORT_DIFF`    | content → background       | `{ type: 'EXPORT_DIFF', payload: {...} }` | `{ ok, filename }`                                  |

### 6.2 导出 Payload 格式

```javascript
{
  url: "https://example.com/page",
  title: "Page Title",
  timestamp: "2026-06-20T10:00:00.000Z",
  totalMarked: 5,
  totalModified: 3,
  items: [
    {
      index: 1,
      tag: "div",
      selector: "#container > .card:nth-of-type(1)",
      element: "div.card",
      originalHTML: "<div class=\"card\">...</div>",
      modifiedHTML: "<div class=\"card card-modified\">...</div>" || null,
      originalStyles: { position: "static", ... } || null,
      modifiedStyles: { position: "relative", left: "10px" } || null,
      note: "修改说明文本",
      hasChange: true
    }
    // ... 更多组件
  ]
}
```

### 6.3 全局常量

| 常量       | 值                               | 用途                      |
| -------- | ------------------------------- | ----------------------- |
| 防重复注入标志  | `window.__htmlDiffMarkerLoaded` | 防止 content.js 重复执行      |
| 状态存储 Key | `htmlDiffMarker_` + URL         | sessionStorage 中存储标记数据  |
| 位置存储 Key | `htmlDiffMarker_pos_` + URL     | sessionStorage 中存储工具栏位置 |
| CSS 类名前缀 | `html-diff-marker-`             | 所有注入元素的类名前缀             |
| 导出文件前缀   | `html-diff-` + 时间戳              | 导出文件名格式                 |

***

## 七、manifest.json 规范

### 7.1 固定字段值

```json
{
  "manifest_version": 3,
  "name": "HTML Diff Marker",
  "version": "1.0.0",
  "description": "在Chrome中标记HTML组件的修改，并生成diff文件供AI Agent迭代使用",
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "downloads",
    "contextMenus"
  ],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_title": "HTML Diff Marker",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "css": ["content/content.css"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["content/content.css"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### 7.2 版本号规则

- `1.0.0` → `1.0.1`：修复 bug / 小改动
- `1.0.1` → `1.1.0`：新增功能
- `1.1.0` → `2.0.0`：架构性变更（不常见）

***

## 八、测试与验证规范

### 8.1 自动化语法检查

每次修改 JavaScript 文件后必须执行：

```bash
node --check content/content.js
node --check background/background.js
```

### 8.2 手动功能测试清单

| #  | 测试项     | 操作步骤                    | 预期结果                  |
| -- | ------- | ----------------------- | --------------------- |
| 1  | 扩展加载    | Chrome → 扩展管理 → 加载已解压扩展 | 扩展成功加载，无错误            |
| 2  | 页面打开    | 打开 test-page.html       | 页面正常显示                |
| 3  | 点击扩展图标  | 工具栏中的扩展图标               | 工具栏三态切换（隐藏→唤醒→完整） |
| 4  | 进入选择模式  | 点击工具栏"选择元素"按钮          | 鼠标光标变十字线              |
| 5  | 标记元素    | 点击页面上任意元素               | 元素显示绿色边框 + 编号徽章       |
| 6  | 打开检查面板  | 点击元素上的编号徽章              | 弹出编辑面板，显示 HTML 和样式属性  |
| 7  | 拖拽移动    | 拖拽标记的元素                 | 元素位置改变，CSS 属性更新       |
| 8  | 调整大小    | 拖动边缘把手                  | 元素尺寸改变，显示对齐辅助线        |
| 9  | 滚轮缩放    | 按住 Ctrl/Cmd + 滚轮        | 元素按比例缩放               |
| 10 | 编辑文案    | 双击标记元素                  | 进入可编辑状态，修改后生效         |
| 11 | 修改样式    | 在检查面板中修改颜色/边框           | 页面元素实时更新              |
| 12 | 保存修改    | 检查面板中点击"保存"             | 修改存入 sessionStorage   |
| 13 | 生成 Diff | 点击"生成 Diff 文件"          | 下载 .md 和 .json 两个文件   |
| 14 | 刷新页面    | F5 刷新 test-page.html    | 标记从 sessionStorage 恢复 |
| 15 | 快捷键切换   | 按 Alt+E（Windows/Linux）/ Option+E（macOS） | 工具栏在隐藏/唤醒/激活三态间切换     |
| 16 | 清除标记    | 点击"清除所有标记"              | 页面恢复初始状态              |

***

## 九、README 文档规范

### 9.1 必备章节（按顺序）

1. **项目概述** - 一句话说明这是什么扩展
2. **功能特性** - 核心功能列表（3-7 条）
3. **项目结构** - 文件树，说明每个文件作用
4. **安装步骤** - 如何在 Chrome 中加载扩展
5. **使用方法** - 详细操作步骤，可带表格
6. **导出文件格式** - Markdown/JSON 格式说明
7. **注意事项** - 限制/安全提示
8. **代码规范**（开发者必读）- 指向 Project\_Rule.md，并列出关键原则
9. **故障排除** - 常见问题解答
10. **许可证** - MIT

### 9.2 一致性要求

README 中描述的功能**必须与实际代码一致**。每次代码变更后，检查 README 是否需要同步更新。代码与文档的一致性是本项目的重要原则。

***

## 十、发布前检查清单

```
□ 所有核心文件存在且非空（content.js, content.css, background.js, manifest.json）
□ 语法检查通过：node --check content/content.js
□ 语法检查通过：node --check background/background.js
□ 无临时/垃圾文件（content_generator_*, 空文件, _tmp_* 等）
□ README.md 与代码功能一致
□ Project_Rule.md 是最新版本
□ manifest.json 版本号已更新
□ test-page.html 手动测试通过（参照第八章）
□ 图标文件齐全（icons/icon16.png, icon48.png, icon128.png）
□ 扩展图标在 Chrome 工具栏中显示正确
□ 没有任何脚本以字符串形式包含核心源文件的完整内容
```

***

## 十一、本项目的特殊约定

| 约定项       | 规范值                                    |
| --------- | -------------------------------------- |
| CSS 类名前缀  | `html-diff-marker-`                    |
| 防重复注入标志   | `window.__htmlDiffMarkerLoaded = true` |
| 存储 Key 前缀 | `htmlDiffMarker_` + 页面 URL             |
| 导出文件前缀    | `html-diff-` + ISO 时间戳                 |
| 工具栏状态机    | hidden → wake → active（三态循环）           |
| 消息类型命名    | 全大写 + 下划线，如 `TOGGLE_SELECT`            |
| 函数命名风格    | 动词开头 + 名词，如 `markElement`、`saveState`  |
| 脚本注入时机    | `document_idle`（页面加载完成后）               |

***

## 十二、版本号管理原则

### 12.1 版本号与文件同步

- **manifest.json** 中的 `version` 字段是本项目的权威版本号
- **README.md** 顶部显示的版本号应与 manifest.json 一致
- **Project\_Rule.md** 底部的文档版本号独立维护（规范文档自身的版本）

### 12.2 版本号规则

| 改动类型       | 版本变化         | 示例                |
| ---------- | ------------ | ----------------- |
| 修复 bug、小改动 | 第三位 +1       | `1.0.0` → `1.0.1` |
| 新增功能       | 第二位 +1，第三位归零 | `1.0.1` → `1.1.0` |
| 架构性变更（不常见） | 第一位 +1       | `1.1.0` → `2.0.0` |

### 12.3 更新流程

每次发布前：

1. 确认代码功能完整
2. 更新 manifest.json 中的 `version` 字段
3. 同步更新 README.md 顶部的版本号显示
4. 如有规范变更，同步更新 Project\_Rule.md 底部的文档版本号

***

## 十三、代码质量原则

### 13.1 信息重复（铁律）

> **核心源文件的代码/内容，永远不应该以字符串形式存在于项目中的任何其他文件里。**

这包括：

- ❌ 把 content.js 的代码作为 Python/JS 字符串存在于另一个文件
- ❌ 把 README.md 的内容硬编码在脚本中
- ❌ manifest.json 字段值同时写在其他配置文件里

### 13.2 模块化与可维护性

| 原则         | 说明                                                |
| ---------- | ------------------------------------------------- |
| **功能分区**   | 相关功能放在一起，用注释行分隔，便于定位和审查                           |
| **事件委托优先** | 尽量用事件委托（父元素监听）而不是逐个元素添加事件监听器，减少重复代码               |
| **配置驱动**   | 可配置的行为用数据配置驱动（如 STYLE\_PROPS 数组），而不是在代码中硬编码多个类似分支 |
| **自问测试**   | 新增功能后问自己："这段逻辑是否在代码中已有实现？"如果有，考虑复用或抽取公共函数         |

### 13.3 避免的代码反模式

| 反模式             | 示例                                           | 替代方案                     |
| --------------- | -------------------------------------------- | ------------------------ |
| **字符串拼接生成代码**   | `let code = "function() { " + "..." + " }";` | 直接写目标文件                  |
| **长 if-else 链** | 针对每个 case 写独立逻辑                              | 用配置表/查找表（lookup table）替代 |
| **重复的事件监听器**    | 为 10 个相似元素各写一个 addEventListener              | 事件委托 + CSS 选择器           |
| **内联的长字符串**     | HTML/CSS 模板内联在 JS 中                          | 如确实需要，放在文件顶部常量区          |

### 13.4 文件大小与可读性

- content.js 超过 1500 行 → 考虑按功能拆分到独立脚本（但要注意 Chrome 扩展的 content script 限制）
- 单个函数超过 100 行 → 考虑拆分为多个小函数
- 复杂逻辑 → 必须加注释说明

***

## 十四、Git 分支管理规范

### 14.1 分支结构
```
main          ← 生产分支（稳定）
├── develop   ← 开发分支（集成）
│   ├── fix/*        ← Bug 修复分支（临时）
│   └── feature/*    ← 功能开发分支（临时）
└── hotfix/*         ← 紧急修复分支（临时）
```

### 14.2 分支命名规范
| 类型 | 创建来源 | 格式 | 示例 |
|-----|---------|------|------|
| Bug 修复 | develop | `fix/<issue-id>-<description>` | `fix/bug-001-select-panel` |
| 功能开发 | develop | `feature/<feature-name>` | `feature/ui-toolbar-redesign` |
| 紧急修复 | main | `hotfix/<version>` | `hotfix/v1.0.1` |

### 14.3 开发流程
1. 日常开发：从 develop 创建 fix/feature 分支
2. 代码审查：提交 PR/MR 到 develop
3. 合并：审查通过后合并回 develop（--no-ff）
4. 发布：从 develop 合并到 main

### 14.4 合并优先级规则
- P0：hotfix/*（紧急修复，最高优先级）
- P1：fix/*（Bug 修复分支，优先于功能开发）
- P2：feature/*（功能开发/UI 迭代分支）

### 14.5 合并规则
- 使用 `--no-ff` 合并，保留分支历史
- 合并后及时删除临时分支（`git branch -d <branch-name>`）
- 禁止直接推送 main/develop 分支

### 14.6 分支同步机制
- 开发过程中建议每日同步 develop 最新代码（`git fetch && git merge origin/develop`）
- PR/MR 前必须同步 develop，确保无冲突
- 同步冲突由分支创建者负责解决

### 14.7 版本号更新规范
- 遵循 Semantic Versioning 规范：
  - 修复 bug：第三位 +1（如 `1.0.0` → `1.0.1`）
  - 新增功能：第二位 +1，第三位归零（如 `1.0.1` → `1.1.0`）
  - 架构性变更：第一位 +1（如 `1.1.0` → `2.0.0`）
- hotfix 分支创建后立即设置初始版本号
- 开发过程中可根据需要调整版本号
- 发布前冻结版本号，不再调整
- 版本号更新需同步更新 manifest.json 和 README.md

### 14.8 回滚操作流程
- 普通提交回滚：`git revert <commit-hash>`
- 合并提交回滚：`git revert -m 1 <merge-commit-hash>`
- 回滚后需同步到相关分支

### 14.9 分支保护规则
- main 和 develop 分支设置保护规则，禁止直接推送
- 必须通过 PR/MR 审查才能合并

### 14.10 本地保护机制
- 使用 pre-push 钩子脚本阻止直接推送到受保护分支

### 14.11 Bug 报告迁移策略
- 从 Bug 报告文件名提取标识作为 issue-id
- 根据标识生成分支名：`fix/<issue-id>-<description>`
- 在 Bug 报告中添加关联分支标记：`--- 关联分支: fix/xxx 状态: 待修复 ---`
- 修复完成后更新状态为"已修复"并关联对应的 commit hash

***

## 附录：历史问题记录

> 记录本项目开发过程中遇到的典型问题，供后续参考。

### A.1 删除循环（曾发生）

**现象**：子任务反复执行 `DeleteFile(content.js)` → `Write(content.js)` → 检测到文件异常 → 再删除...

**原因**：子任务误认为 Write 需要先删除文件；实际上 Write 工具可以直接覆盖已有文件。

**解决方案**：

- 严格遵守第三章"工具使用规范"
- DeleteFile 工具只在"真正不再需要此文件"时使用
- Write 操作前不需要任何前置操作

### A.2 生成器脚本陷阱（曾发生）

**现象**：子任务创建 `content_generator_v4.js`、`v5.js`、`v6.js`... 每个版本都试图用 JS 字符串拼接生成 content.js 的代码。

**原因**：用代码生成代码导致额外复杂度，尤其是引号转义、换行处理、变量插值。

**解决方案**：禁止使用生成器脚本。直接写目标文件。

### A.3 generate\_ext.py 伪"打包脚本"陷阱（曾发生）

**现象**：项目中存在一个名为 `generate_ext.py` 的 Python 文件，被标注为"打包脚本"。但它实际上把 **content.js、content.css、background.js、manifest.json、README.md 的完整代码** 都作为 Python 三引号字符串硬编码在内部，运行时用 `write()` 函数"生成"这些文件。

**问题机制**：

1. 子任务看到 `generate_ext.py` 存在且被列为项目文件，误以为它是**修改 content.js 的正确入口**
2. 子任务试图修改 Python 字符串中的 JS 代码（而不是直接 Edit content.js），导致转义错误
3. 子任务删除 content.js 后运行 generate\_ext.py 重新生成，但生成的内容与目标不一致
4. 检测到不一致后再次删除，形成死循环
5. **同样的问题也影响 README.md** —— generate\_ext.py 中也硬编码了一份 README，导致两处内容必须同步更新

**根本原因**：把"源文件"和"生成器输出"混为一谈。content.js、README.md 等文件必须是**唯一的真相来源**（single source of truth），不能由其他脚本生成。

**解决方案**：

- 删除 `generate_ext.py`
- 所有核心文件（content.js、content.css、background.js、manifest.json、README.md）作为直接手写的源文件存在
- 修改 content.js 时直接 `Edit(content.js)` 或 `Write(content.js, 完整代码)`，**不经过任何中间脚本**
- 修改 README.md 时直接 `Edit(README.md)` 或 `Write(README.md, 完整内容)`
- 如需要"批量初始化"，临时脚本用完后必须删除，不能留在项目中

### A.4 Edit 工具失败的死循环（曾发生）

**现象**：Edit 工具因为 old\_string 无法精确匹配（长文件读取被截断）而持续失败。子任务没有降级到 Write 工具，而是试图通过创建"生成器脚本来绕过"Edit 工具的限制，结果陷入更深的死循环。

**原因**：

- 没有明确的"Edit 失败 → 降级"路径
- 子任务自行发明"解决方案"（创建生成器脚本），而这恰恰违反了最核心的规范

**解决方案**：

- Edit 失败后必须重新 Read 文件确认内容
- 连续失败 2 次后直接改用 Write
- 绝对不允许因为 Edit/Write 失败而创建任何形式的生成器脚本或中转脚本
- Write 工具设计的目的就是"全量重写"，不要因为"Write 看起来很粗暴"就不敢用它

### A.5 中转脚本绕过工具限制（曾发生）

**现象**：开发者试图 Edit Project\_Rule.md 时，遇到工具链限制（"File has not been read yet"），多次重试仍然失败。开发者没有降级到 Write，而是创建了 `_tmp_fix.js` 等临时脚本，用 Node.js 运行脚本来修改目标文件。脚本用完后删除，但这违反了项目规范。

**根本原因**：

- 工具链在短时间内大量操作时可能无法正确维护"已读状态"
- 开发者知道 Edit 失败时应降级到 Write，但仍然选择了脚本方案
- 误以为"临时用一下就删"的脚本是可以接受的

**教训**：

- ❌ **即使是临时脚本用完就删，也不应该用来修改核心源文件**
- ✅ Edit 失败 → 重新 Read → 再试 Edit → 连续失败 2 次后直接用 Write 全量重写
- ✅ Write 工具就是设计来覆盖文件的，不要因为"Write 看起来很粗暴"就不敢用它
- ✅ "中转脚本"本质上和"生成器脚本"是同一种反模式——把代码写在 A 文件里用来修改 B 文件，破坏了"源文件即唯一真相来源"的原则

***

**文档版本**：1.8
**最后更新**：2026-07-11
**适用项目**：HTML Diff Marker Chrome 扩展
