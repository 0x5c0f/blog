/**
 * 通用公告插件
 * 支持拖动、隐藏、永久关闭和定时关闭功能
 * 兼容 Hugo Fixit 主题
 */

(function() {
  'use strict';

  // ==================== 配置区 ====================
  const CONFIG = {
    // 公告内容（支持HTML）
    title: '📢 网站公告',
    content: '欢迎访问本站！这是一条重要公告信息。',
    
    // 过期时间（格式：'YYYY-MM-DD HH:mm:ss'）
    // 设置为 null 表示永不过期
    expireTime: '2025-12-31 23:59:59',
    
    // 样式配置
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
    
    // 位置配置（初始位置）
    position: {
      right: '20px',
      bottom: '20px'
    },
    
    // 动画配置
    animation: {
      duration: '0.3s',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    
    // 存储键名
    storageKey: 'announcement_closed_permanent'
  };

  // ==================== 工具函数 ====================
  
  // 检查是否过期
  function isExpired() {
    if (!CONFIG.expireTime) return false;
    
    try {
      const expireDate = new Date(CONFIG.expireTime);
      const now = new Date();
      return now > expireDate;
    } catch (e) {
      console.error('公告过期时间格式错误:', e);
      return false;
    }
  }

  // 检查是否已永久关闭
  function isPermanentlyClosed() {
    try {
      return localStorage.getItem(CONFIG.storageKey) === 'true';
    } catch (e) {
      return false;
    }
  }

  // 设置永久关闭状态
  function setPermanentClose() {
    try {
      localStorage.setItem(CONFIG.storageKey, 'true');
    } catch (e) {
      console.error('无法保存关闭状态:', e);
    }
  }

  // ==================== 样式注入 ====================
  
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .announcement-container {
        position: fixed;
        right: ${CONFIG.position.right};
        bottom: ${CONFIG.position.bottom};
        width: ${CONFIG.style.width};
        max-width: ${CONFIG.style.maxWidth};
        background: ${CONFIG.style.backgroundColor};
        border: 1px solid ${CONFIG.style.borderColor};
        border-radius: 12px;
        box-shadow: 0 4px 20px ${CONFIG.style.shadowColor};
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        transition: transform ${CONFIG.animation.duration} ${CONFIG.animation.easing},
                    opacity ${CONFIG.animation.duration} ${CONFIG.animation.easing};
        cursor: move;
        user-select: none;
      }

      .announcement-container.dragging {
        transition: none;
        opacity: 0.9;
      }

      .announcement-container.hidden {
        transform: translateY(calc(100% + 20px));
        opacity: 0;
        pointer-events: none;
      }

      .announcement-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 16px 12px;
        border-bottom: 1px solid ${CONFIG.style.borderColor};
        cursor: move;
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
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
      }

      .announcement-btn:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      .announcement-btn svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
        color: #666;
      }

      .announcement-content {
        padding: 16px;
        color: ${CONFIG.style.contentColor};
        font-size: 14px;
        line-height: 1.6;
        max-height: 300px;
        overflow-y: auto;
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

      @media (max-width: 768px) {
        .announcement-container {
          right: 10px !important;
          bottom: 10px !important;
          left: 10px !important;
          width: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== 创建公告DOM ====================
  
  function createAnnouncementHTML() {
    return `
      <div class="announcement-header">
        <h3 class="announcement-title">${CONFIG.title}</h3>
        <div class="announcement-controls">
          <button class="announcement-btn announcement-minimize" title="最小化">
            <svg viewBox="0 0 24 24">
              <path d="M19 13H5v-2h14v2z"/>
            </svg>
          </button>
          <button class="announcement-btn announcement-close-temp" title="关闭">
            <svg viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="announcement-content">
        ${CONFIG.content}
      </div>
      <div class="announcement-footer">
        <button class="announcement-close-btn">不再显示</button>
      </div>
    `;
  }

  // ==================== 拖动功能 ====================
  
  function enableDrag(container) {
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    let xOffset = 0, yOffset = 0;

    const header = container.querySelector('.announcement-header');

    header.addEventListener('mousedown', dragStart);
    header.addEventListener('touchstart', dragStart);

    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);

    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);

    function dragStart(e) {
      if (e.target.closest('.announcement-btn')) return;
      
      if (e.type === 'touchstart') {
        initialX = e.touches[0].clientX - xOffset;
        initialY = e.touches[0].clientY - yOffset;
      } else {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
      }

      isDragging = true;
      container.classList.add('dragging');
    }

    function drag(e) {
      if (!isDragging) return;

      e.preventDefault();

      if (e.type === 'touchmove') {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      } else {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      }

      xOffset = currentX;
      yOffset = currentY;

      setTranslate(currentX, currentY, container);
    }

    function dragEnd() {
      isDragging = false;
      container.classList.remove('dragging');
    }

    function setTranslate(xPos, yPos, el) {
      el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
  }

  // ==================== 初始化公告 ====================
  
  function initAnnouncement() {
    // 检查是否应该显示公告
    if (isExpired()) {
      console.log('公告已过期，不再显示');
      return;
    }

    if (isPermanentlyClosed()) {
      console.log('公告已被永久关闭');
      return;
    }

    // 注入样式
    injectStyles();

    // 创建公告容器
    const container = document.createElement('div');
    container.className = 'announcement-container';
    container.innerHTML = createAnnouncementHTML();
    document.body.appendChild(container);

    // 启用拖动
    enableDrag(container);

    // 绑定事件
    const minimizeBtn = container.querySelector('.announcement-minimize');
    const closeTempBtn = container.querySelector('.announcement-close-temp');
    const closePermanentBtn = container.querySelector('.announcement-close-btn');

    // 最小化（临时隐藏）
    minimizeBtn.addEventListener('click', () => {
      container.classList.add('hidden');
      setTimeout(() => {
        container.classList.remove('hidden');
      }, 3000);
    });

    // 临时关闭
    closeTempBtn.addEventListener('click', () => {
      container.classList.add('hidden');
      setTimeout(() => {
        container.remove();
      }, 300);
    });

    // 永久关闭
    closePermanentBtn.addEventListener('click', () => {
      setPermanentClose();
      container.classList.add('hidden');
      setTimeout(() => {
        container.remove();
      }, 300);
    });
  }

  // ==================== 启动 ====================
  
  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnnouncement);
  } else {
    initAnnouncement();
  }

})();