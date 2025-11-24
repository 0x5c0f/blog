/**
 * 通用公告插件 v2.3 (样式修复版)
 * 修复：缩小后的按钮样式恢复正常
 */

(function() {
  'use strict';

  // ==================== 配置区 ====================
  const CONFIG = {
    title: '📢 网站公告',
    content: '欢迎访问本站！这是一条重要公告信息。',
    expireTime: '2025-11- 23:59:59',
    
    style: {
      width: '360px',
      maxWidth: '90vw',
      backgroundColor: '#ffffff',
      borderColor: '#e0e0e0',
      titleColor: '#333333',
      contentColor: '#666666',
      buttonColor: '#007bff',
      shadowColor: 'rgba(0, 0, 0, 0.15)'
    },
    
    position: {
      right: '20px',
      bottom: '20px'
    },
    
    animation: {
      duration: '0.4s',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    
    storageKey: 'announcement_closed_permanent',
    positionStorageKey: 'announcement_position'
  };

  // ==================== 工具函数 ====================
  
  function isExpired() {
    if (!CONFIG.expireTime) return false;
    try {
      const safeDateStr = CONFIG.expireTime.replace(/-/g, '/');
      const expireDate = new Date(safeDateStr);
      const now = new Date();
      return now > expireDate;
    } catch (e) {
      console.error('公告过期时间格式错误:', e);
      return false;
    }
  }

  function isPermanentlyClosed() {
    try {
      return localStorage.getItem(CONFIG.storageKey) === 'true';
    } catch (e) {
      return false;
    }
  }

  function setPermanentClose() {
    try {
      localStorage.setItem(CONFIG.storageKey, 'true');
    } catch (e) {}
  }

  function savePosition(x, y) {
    try {
      localStorage.setItem(CONFIG.positionStorageKey, JSON.stringify({ x, y }));
    } catch (e) {}
  }

  function getSavedPosition() {
    try {
      const saved = localStorage.getItem(CONFIG.positionStorageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  // ==================== 样式注入 ====================
  
  function injectStyles() {
    if (document.getElementById('announcement-plugin-style')) return;

    const style = document.createElement('style');
    style.id = 'announcement-plugin-style';
    style.textContent = `
      /* 容器负责定位、拖拽位移以及外边距补偿动画 */
      .announcement-container {
        position: fixed;
        right: ${CONFIG.position.right};
        bottom: ${CONFIG.position.bottom};
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        user-select: none;
        touch-action: none;
        /* 添加 margin 的过渡动画，以配合尺寸变化实现方向控制 */
        transition: margin-right ${CONFIG.animation.duration} ${CONFIG.animation.easing},
                    margin-bottom ${CONFIG.animation.duration} ${CONFIG.animation.easing};
      }

      /* 卡片负责外观、尺寸动画 */
      .announcement-card {
        width: ${CONFIG.style.width};
        max-width: ${CONFIG.style.maxWidth};
        background: ${CONFIG.style.backgroundColor};
        border: 1px solid ${CONFIG.style.borderColor};
        border-radius: 12px;
        box-shadow: 0 4px 20px ${CONFIG.style.shadowColor};
        overflow: hidden;
        transition: width ${CONFIG.animation.duration} ${CONFIG.animation.easing},
                    height ${CONFIG.animation.duration} ${CONFIG.animation.easing};
        display: flex;
        flex-direction: column;
        position: relative;
      }

      .announcement-container.dragging .announcement-card {
        opacity: 0.95;
        cursor: move;
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      }

      .announcement-container.hidden {
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      /* 最小化状态 */
      .announcement-card.minimized {
        width: 140px !important;
        height: 48px !important;
      }

      .announcement-card .announcement-content-wrapper {
        opacity: 1;
        transition: opacity 0.2s;
        pointer-events: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      
      .announcement-card.minimized .announcement-content-wrapper {
        opacity: 0;
        pointer-events: none;
        position: absolute;
        visibility: hidden;
      }

      /* 最小化按钮 - 修复样式 */
      .announcement-toggle {
        position: absolute;
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${CONFIG.style.buttonColor};
        color: white;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s, background-color 0.2s;
        border-radius: 12px;
        z-index: 10;
      }
      
      .announcement-toggle:hover {
        background: linear-gradient(135deg, ${CONFIG.style.buttonColor} 0%, #0056b3 100%);
      }
      
      .announcement-card.minimized .announcement-toggle {
        opacity: 1;
        pointer-events: auto;
      }

      .announcement-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 16px 12px;
        border-bottom: 1px solid ${CONFIG.style.borderColor};
        cursor: move;
        flex-shrink: 0;
      }

      .announcement-title {
        font-size: 16px;
        font-weight: 600;
        color: ${CONFIG.style.titleColor};
        margin: 0;
        flex: 1;
      }

      .announcement-controls {
        display: flex;
        gap: 8px;
        margin-left: 12px;
      }

      .announcement-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        color: #666;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      
      .announcement-btn:hover { 
        background-color: rgba(0,0,0,0.05); 
      }
      
      .announcement-btn svg { 
        width: 16px; 
        height: 16px; 
        fill: currentColor; 
      }

      .announcement-content {
        padding: 16px;
        color: ${CONFIG.style.contentColor};
        font-size: 14px;
        line-height: 1.6;
        max-height: 300px;
        overflow-y: auto;
        flex: 1;
      }
      
      .announcement-content::-webkit-scrollbar { 
        width: 6px; 
      }
      
      .announcement-content::-webkit-scrollbar-track { 
        background: #f1f1f1; 
        border-radius: 3px;
      }
      
      .announcement-content::-webkit-scrollbar-thumb { 
        background: #ccc; 
        border-radius: 3px; 
      }
      
      .announcement-content::-webkit-scrollbar-thumb:hover {
        background: #999;
      }

      .announcement-footer {
        padding: 12px 16px;
        border-top: 1px solid ${CONFIG.style.borderColor};
        display: flex;
        justify-content: flex-end;
        flex-shrink: 0;
      }

      .announcement-close-btn {
        background-color: ${CONFIG.style.buttonColor};
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .announcement-close-btn:hover { 
        opacity: 0.9; 
      }

      @media (max-width: 480px) {
        .announcement-container {
          right: 10px !important;
          bottom: 10px !important;
        }
        
        .announcement-card {
          width: calc(100vw - 40px);
          max-width: 90vw;
        }
        
        .announcement-card.minimized {
          width: 140px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== 创建公告DOM ====================
  
  function createAnnouncementHTML() {
    return `
      <div class="announcement-card">
        <div class="announcement-toggle">
          📢 网站公告
        </div>
        <div class="announcement-content-wrapper">
          <div class="announcement-header">
            <h3 class="announcement-title">${CONFIG.title}</h3>
            <div class="announcement-controls">
              <button class="announcement-btn announcement-minimize" title="最小化">
                <svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>
              </button>
              <button class="announcement-btn announcement-close-temp" title="关闭">
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
          </div>
          <div class="announcement-content">
            ${CONFIG.content}
          </div>
          <div class="announcement-footer">
            <button class="announcement-close-btn">不再显示</button>
          </div>
        </div>
      </div>
    `;
  }

  // ==================== 拖动功能 ====================
  
  function enableDrag(container) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;
    
    const saved = getSavedPosition();
    let currentX = saved ? saved.x : 0;
    let currentY = saved ? saved.y : 0;
    
    updateTransform();

    function updateTransform() {
      container.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    }

    function onMouseDown(e) {
      if (e.target.closest('button')) return; 
      
      if (e.type === 'touchstart') {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      } else {
        startX = e.clientX;
        startY = e.clientY;
      }
      
      initialX = currentX;
      initialY = currentY;
      isDragging = true;
      
      container.classList.add('dragging');
      
      if (e.type === 'touchstart') {
        document.addEventListener('touchmove', onMouseMove, { passive: false });
        document.addEventListener('touchend', onMouseUp);
      } else {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }
    }

    function onMouseMove(e) {
      if (!isDragging) return;
      e.preventDefault();

      let clientX, clientY;
      if (e.type === 'touchmove') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const dx = clientX - startX;
      const dy = clientY - startY;

      currentX = initialX + dx;
      currentY = initialY + dy;
      
      updateTransform();
    }

    function onMouseUp() {
      if (!isDragging) return;
      isDragging = false;
      container.classList.remove('dragging');
      savePosition(currentX, currentY);

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onMouseMove);
      document.removeEventListener('touchend', onMouseUp);
    }

    const header = container.querySelector('.announcement-header');
    const toggle = container.querySelector('.announcement-toggle');
    
    [header, toggle].forEach(el => {
      el.addEventListener('mousedown', onMouseDown);
      el.addEventListener('touchstart', onMouseDown, { passive: false });
    });
  }

  // ==================== 初始化 ====================
  
  function init() {
    if (isExpired()) {
      console.log('公告已过期');
      return;
    }
    if (isPermanentlyClosed()) {
      console.log('公告已被永久关闭');
      return;
    }

    injectStyles();

    const container = document.createElement('div');
    container.className = 'announcement-container';
    container.innerHTML = createAnnouncementHTML();
    document.body.appendChild(container);

    const card = container.querySelector('.announcement-card');
    enableDrag(container);

    const btnMinimize = container.querySelector('.announcement-minimize');
    const btnCloseTemp = container.querySelector('.announcement-close-temp');
    const btnClosePerm = container.querySelector('.announcement-close-btn');
    const toggle = container.querySelector('.announcement-toggle');

    // 最小化逻辑 - 锚定左上角
    btnMinimize.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // 1. 获取当前实际尺寸
      const currentW = card.offsetWidth;
      const currentH = card.offsetHeight;
      
      // 2. 目标尺寸
      const targetW = 140;
      const targetH = 48;
      
      // 3. 计算边距补偿，使左上角保持不动
      const deltaW = currentW - targetW;
      const deltaH = currentH - targetH;
      
      container.style.marginRight = deltaW + 'px';
      container.style.marginBottom = deltaH + 'px';
      
      card.classList.add('minimized');
    });

    // 展开/拖拽判断逻辑
    let pressStartTime = 0;
    let pressStartX = 0;
    let pressStartY = 0;

    const onToggleDown = (e) => {
      pressStartTime = Date.now();
      const pt = e.changedTouches ? e.changedTouches[0] : e;
      pressStartX = pt.clientX;
      pressStartY = pt.clientY;
    };

    const onToggleUp = (e) => {
      const pt = e.changedTouches ? e.changedTouches[0] : e;
      const dist = Math.sqrt(Math.pow(pt.clientX - pressStartX, 2) + Math.pow(pt.clientY - pressStartY, 2));
      const time = Date.now() - pressStartTime;

      // 点击判定成功 (非拖拽)
      if (time < 300 && dist < 10) {
        // 复位边距，元素向右下延伸展开
        container.style.marginRight = '0px';
        container.style.marginBottom = '0px';
        card.classList.remove('minimized');
      }
    };

    toggle.addEventListener('mousedown', onToggleDown);
    toggle.addEventListener('mouseup', onToggleUp);
    toggle.addEventListener('touchstart', onToggleDown);
    toggle.addEventListener('touchend', onToggleUp);

    const close = (permanent = false) => {
      if (permanent) setPermanentClose();
      container.classList.add('hidden');
      setTimeout(() => container.remove(), 300);
    };

    btnCloseTemp.addEventListener('click', (e) => {
      e.stopPropagation();
      close(false);
    });
    
    btnClosePerm.addEventListener('click', (e) => {
      e.stopPropagation();
      close(true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();