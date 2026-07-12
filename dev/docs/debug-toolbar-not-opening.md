# Debug Session: toolbar-not-opening

**状态**: [OPEN]  
**创建时间**: 2026-07-11  
**症状**: Chrome 扩展重新加载后，点击扩展图标无法打开工具栏  
**预期**: 点击扩展图标 → 工具栏三态循环切换（隐藏 → 唤醒 → 完整工具栏）

---

## 假设列表 (Hypotheses)

| # | 假设 | 可能性 | 如何证伪 |
|---|------|--------|---------|
| H1 | content script 根本没有注入到页面 | 高 | 检查是否有 init 开始的日志 |
| H2 | content script 注入了，但 init 过程中抛异常导致 onMessage 没注册 | 高 | 检查 init 各阶段日志，看在哪一步中断 |
| H3 | background.js 发送了 TOGGLE_WAKE 消息，但 content 没收到/没响应 | 中 | 检查 background 发送日志 + content 接收日志 |
| H4 | onMessage 收到了消息，但 toggleThreeState 执行失败 | 中 | 检查 toggleThreeState 执行日志 |
| H5 | chrome.runtime.onMessage 在样式隔离/IIFE 环境下不可用 | 低 | 检查 addListener 是否成功注册 |

---

## 插桩点 (Instrumentation Points)

| 点 | 位置 | 用途 |
|----|------|------|
| P1 | init 函数最开始 | 证明 content script 已注入，init 已开始 |
| P2 | onMessage 监听器注册前/后 | 证明监听器已注册 |
| P3 | onMessage 收到消息时 | 证明消息到达 content script |
| P4 | toggleThreeState 函数入口/出口 | 证明切换逻辑被执行 |
| P5 | themeManager.init callback | 主题初始化是否完成 |
| P6 | displaySettingsManager.init callback | 显示设置初始化是否完成 |
| P7 | customFonts 加载 callback | 自定义字体加载是否完成 |
| P8 | loadState callback | 状态加载是否完成 |
| P9 | tryFinishInit 每次调用 | 就绪判断的每一步 |
| P10 | background.js 发送消息前 | 证明 background 尝试发送 |
| P11 | window.onerror | 捕获全局未处理异常 |

---

## 日志记录 (Log Records)

_等待插桩后采集_

---

## 根因分析 (Root Cause)

_待确定_

---

## 修复方案 (Fix)

_待确定_

---

## 修复验证 (Post-fix Verification)

_待验证_
