// ============================================================
// 工具栏按钮消失问题排查脚本
// ============================================================
(function() {
  console.log('=== HTML Diff Marker Toolbar Debug ===');
  
  // 1. 检查工具栏元素是否存在
  var toolbar = document.querySelector('.html-diff-marker-toolbar');
  console.log('1. Toolbar element exists:', !!toolbar);
  
  if (toolbar) {
    // 2. 检查工具栏结构
    console.log('2. Toolbar className:', toolbar.className);
    
    // 3. 检查头部
    var header = toolbar.querySelector('.html-diff-marker-toolbar-header');
    console.log('3. Header exists:', !!header);
    if (header) console.log('   Header visible:', getComputedStyle(header).display);
    
    // 4. 检查 Body 区域
    var body = toolbar.querySelector('.html-diff-marker-toolbar-body');
    console.log('4. Body exists:', !!body);
    if (body) {
      console.log('   Body display:', getComputedStyle(body).display);
      console.log('   Body children count:', body.children.length);
      console.log('   Body innerHTML:', body.innerHTML.substring(0, 500));
    }
    
    // 5. 检查按钮行
    var btnRow = toolbar.querySelector('.html-diff-marker-toolbar-btn-row');
    console.log('5. Button row exists:', !!btnRow);
    if (btnRow) {
      console.log('   Button row display:', getComputedStyle(btnRow).display);
      console.log('   Button count:', btnRow.children.length);
      for (var i = 0; i < btnRow.children.length; i++) {
        var btn = btnRow.children[i];
        console.log('   Button ' + (i+1) + ':', btn.className, '- text:', btn.textContent, '- display:', getComputedStyle(btn).display);
      }
    }
    
    // 6. 检查导出行
    var exportRow = toolbar.querySelector('.html-diff-marker-export-row');
    console.log('6. Export row exists:', !!exportRow);
    if (exportRow) {
      console.log('   Export row display:', getComputedStyle(exportRow).display);
      console.log('   Children count:', exportRow.children.length);
      for (var i = 0; i < exportRow.children.length; i++) {
        var btn = exportRow.children[i];
        console.log('   Button ' + (i+1) + ':', btn.className, '- text:', btn.textContent, '- display:', getComputedStyle(btn).display);
      }
    }
    
    // 7. 检查底部
    var footer = toolbar.querySelector('.html-diff-marker-toolbar-footer');
    console.log('7. Footer exists:', !!footer);
    if (footer) console.log('   Footer visible:', getComputedStyle(footer).display);
    
    // 8. 检查是否有折叠类
    console.log('8. Is collapsed:', toolbar.classList.contains('html-diff-marker-collapsed'));
    
    // 9. 检查 SVG_ICONS 是否定义
    console.log('9. SVG_ICONS defined:', typeof SVG_ICONS !== 'undefined');
    if (typeof SVG_ICONS !== 'undefined') {
      console.log('   SVG_ICONS keys:', Object.keys(SVG_ICONS));
    }
    
    // 10. 检查按钮样式计算
    var actionBtn = toolbar.querySelector('.html-diff-marker-action-btn');
    if (actionBtn) {
      var style = getComputedStyle(actionBtn);
      console.log('10. Action button computed styles:');
      console.log('    display:', style.display);
      console.log('    visibility:', style.visibility);
      console.log('    opacity:', style.opacity);
      console.log('    width:', style.width);
      console.log('    height:', style.height);
      console.log('    color:', style.color);
      console.log('    background:', style.background);
      console.log('    border:', style.border);
    }
    
    // 11. 检查是否有 overflow 隐藏
    console.log('11. Toolbar overflow:', getComputedStyle(toolbar).overflow);
    
    // 12. 检查 toolbar-body 的高度
    if (body) {
      console.log('12. Body offsetHeight:', body.offsetHeight);
      console.log('    Body clientHeight:', body.clientHeight);
    }
    
    // 13. 检查 toolbar 的高度
    console.log('13. Toolbar offsetHeight:', toolbar.offsetHeight);
    console.log('    Toolbar clientHeight:', toolbar.clientHeight);
    
  } else {
    console.log('Toolbar not found! Attempting to render...');
    // 尝试手动调用 renderToolbar
    try {
      if (typeof renderToolbar === 'function') {
        renderToolbar();
        console.log('renderToolbar() called successfully');
      } else {
        console.log('renderToolbar function not found');
      }
    } catch (e) {
      console.error('Error calling renderToolbar:', e);
    }
  }
  
  console.log('=== Debug Complete ===');
})();
