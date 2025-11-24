/**
 * 独立的公告栏系统
 * 这个文件包含了完整的公告栏实现，包括配置、样式和交互逻辑
 * 修改这里的配置即可更新全站的公告栏内容
 */

(function() {
  'use strict';
  
  // ==================== 配置 ====================
  const ANNOUNCEMENT_CONFIG = {
    id: "site-global-announcement",
    title: "🎉 网站公告",
    content: `
      <p>欢迎访问我的博客！</p>
      <p>这里是一个功能丰富的公告栏系统，支持：</p>
      <ul>
        <li>✅ 全站显示</li>
        <li>🎨 美观的设计</li>
        <li>🖱️ 可拖动位置</li>
        <li>📱 响应式布局</li>
        <li>⏰ 支持过期时间</li>
        <li>🔔 多种类型选择</li>
      </ul>
      <p>试试拖动我、折叠我或关闭我！</p>
    `,
    expiryDate: "2025-12-31",
    position: "top-right",
    type: "info",
    closable: true,
    draggable: true,
    autoHide: 0
  };
  
  // ==================== 工具函数 ====================
  const Utils = {
    log(message, data = null) {
      console.debug(`[Announcement] ${message}`, data);
    },
    
    logError(message, error = null) {
      console.error(`[Announcement] ${message}`, error);
    },
    
    safeSetLocalStorage(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        this.logError('localStorage写入失败:', error);
      }
    },
    
    safeGetLocalStorage(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        this.logError('localStorage读取失败:', error);
        return null;
      }
    },
    
    isAnnouncementExpired(expiryDate) {
      if (!expiryDate) return false;
      
      try {
        const expiry = new Date(expiryDate);
        const now = new Date();
        return now > expiry;
      } catch (error) {
        this.logError('解析过期日期失败:', error);
        return false;
      }
    },
    
    isUserClosedAnnouncement(announcementId) {
      const closedAnnouncements = this.safeGetLocalStorage('announcementStatus');
      if (!closedAnnouncements) return false;
      
      try {
        const closedList = JSON.parse(closedAnnouncements);
        return closedList.includes(announcementId);
      } catch (error) {
        this.logError('解析已关闭公告列表失败:', error);
        return false;
      }
    },
    
    recordClosedAnnouncement(announcementId) {
      try {
        const closedAnnouncements = this.safeGetLocalStorage('announcementStatus') || '[]';
        const closedList = JSON.parse(closedAnnouncements);
        
        if (!closedList.includes(announcementId)) {
          closedList.push(announcementId);
          this.safeSetLocalStorage('announcementStatus', JSON.stringify(closedList));
        }
      } catch (error) {
        this.logError('记录已关闭公告失败:', error);
      }
    },
    
    // 保存公告栏位置到localStorage
    saveAnnouncementPosition(announcementId, position) {
      try {
        const positions = this.safeGetLocalStorage('announcementPositions') || '{}';
        const positionsObj = JSON.parse(positions);
        positionsObj[announcementId] = position;
        this.safeSetLocalStorage('announcementPositions', JSON.stringify(positionsObj));
      } catch (error) {
        this.logError('保存公告栏位置失败:', error);
      }
    },
    
    // 从localStorage获取公告栏位置
    getAnnouncementPosition(announcementId) {
      try {
        const positions = this.safeGetLocalStorage('announcementPositions') || '{}';
        const positionsObj = JSON.parse(positions);
        return positionsObj[announcementId] || null;
      } catch (error) {
        this.logError('获取公告栏位置失败:', error);
        return null;
      }
    },
    
    // 保存公告栏折叠状态
    saveAnnouncementCollapsed(announcementId, isCollapsed) {
      try {
        const collapsedStates = this.safeGetLocalStorage('announcementCollapsedStates') || '{}';
        const collapsedStatesObj = JSON.parse(collapsedStates);
        collapsedStatesObj[announcementId] = isCollapsed;
        this.safeSetLocalStorage('announcementCollapsedStates', JSON.stringify(collapsedStatesObj));
      } catch (error) {
        this.logError('保存公告栏折叠状态失败:', error);
      }
    },
    
    // 获取公告栏折叠状态
    getAnnouncementCollapsed(announcementId) {
      try {
        const collapsedStates = this.safeGetLocalStorage('announcementCollapsedStates') || '{}';
        const collapsedStatesObj = JSON.parse(collapsedStates);
        return collapsedStatesObj[announcementId] || false;
      } catch (error) {
        this.logError('获取公告栏折叠状态失败:', error);
        return false;
      }
    }
  };
  
  // ==================== 公告栏类 ====================
  class SimpleAnnouncementBar {
    constructor(config) {
      this.config = config;
      this.state = {
        isVisible: false,
        isCollapsed: Utils.getAnnouncementCollapsed(config.id), // 从localStorage恢复折叠状态
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
      };
      
      this.announcementBar = null;
      this.collapsedTab = null; // 折叠后的侧边标签
      
      // 绑定方法上下文
      this.handleMouseDown = this.handleMouseDown.bind(this);
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseUp = this.handleMouseUp.bind(this);
      this.handleTouchStart = this.handleTouchStart.bind(this);
      this.handleTouchMove = this.handleTouchMove.bind(this);
      this.handleTouchEnd = this.handleTouchEnd.bind(this);
      this.toggleCollapse = this.toggleCollapse.bind(this);
      this.closeAnnouncement = this.closeAnnouncement.bind(this);
      this.expandFromTab = this.expandFromTab.bind(this); // 从侧边标签展开
    }
    
    init() {
      // 检查公告是否已过期
      if (Utils.isAnnouncementExpired(this.config.expiryDate)) {
        Utils.log('公告已过期，不显示');
        return;
      }
      
      // 检查用户是否已关闭该公告
      if (Utils.isUserClosedAnnouncement(this.config.id)) {
        Utils.log('用户已关闭该公告，不显示');
        return;
      }
      
      // 检查是否处于折叠状态
      if (this.state.isCollapsed) {
        // 如果处于折叠状态，只显示侧边标签
        this.createCollapsedTab();
      } else {
        // 创建完整的公告栏
        this.createAnnouncementBar();
      }
      
      Utils.log('公告栏初始化完成');
    }
    
    createAnnouncementBar() {
      // 创建公告栏容器
      const announcementBar = document.createElement('div');
      announcementBar.className = 'simple-announcement-bar';
      announcementBar.id = `announcement-${this.config.id}`;
      
      // 获取保存的位置或使用默认位置
      const savedPosition = Utils.getAnnouncementPosition(this.config.id);
      const positionStyles = savedPosition || this.getPositionStyles();
      
      // 应用基础样式
      Object.assign(announcementBar.style, this.getBaseStyles(), positionStyles);
      
      // 创建公告栏内容
      const announcementContent = this.createAnnouncementContent();
      announcementBar.innerHTML = announcementContent;
      
      // 添加到页面
      document.body.appendChild(announcementBar);
      
      // 缓存创建的元素
      this.announcementBar = announcementBar;
      
      // 设置事件监听器
      this.setupEventListeners();
      
      // 设置自动隐藏
      if (this.config.autoHide > 0) {
        setTimeout(() => {
          this.closeAnnouncement();
        }, this.config.autoHide * 1000);
      }
      
      // 显示动画
      this.showAnnouncement();
    }
    
    createCollapsedTab() {
      // 创建折叠后的侧边标签
      const collapsedTab = document.createElement('div');
      collapsedTab.className = 'simple-announcement-tab';
      collapsedTab.id = `announcement-tab-${this.config.id}`;
      
      // 获取保存的位置或使用默认位置
      const savedPosition = Utils.getAnnouncementPosition(this.config.id);
      const positionStyles = this.getTabPositionStyles(savedPosition);
      
      // 应用标签样式
      Object.assign(collapsedTab.style, this.getTabStyles(), positionStyles);
      
      // 创建标签内容
      const tabContent = this.createTabContent();
      collapsedTab.innerHTML = tabContent;
      
      // 添加到页面
      document.body.appendChild(collapsedTab);
      
      // 缓存创建的元素
      this.collapsedTab = collapsedTab;
      
      // 设置事件监听器
      collapsedTab.addEventListener('click', this.expandFromTab);
      
      // 显示动画
      this.showTab();
    }
    
    getBaseStyles() {
      return {
        width: '320px',
        maxWidth: '90vw',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.08)',
        padding: '20px',
        position: 'fixed',
        zIndex: '1000',
        fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
        fontSize: '14px',
        lineHeight: '1.5',
        color: '#333',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateX(0)',
        opacity: '0',
      };
    }
    
    getPositionStyles() {
      const positions = {
        'top-right': { top: '20px', right: '20px', bottom: 'auto', left: 'auto' },
        'top-left': { top: '20px', left: '20px', bottom: 'auto', right: 'auto' },
        'bottom-right': { bottom: '20px', right: '20px', top: 'auto', left: 'auto' },
        'bottom-left': { bottom: '20px', left: '20px', top: 'auto', right: 'auto' },
      };
      
      return positions[this.config.position] || positions['top-right'];
    }
    
    createAnnouncementContent() {
      const typeIcons = {
        info: 'ℹ️',
        warning: '⚠️',
        success: '✅',
        error: '❌',
      };
      
      const typeColors = {
        info: '#3498db',
        warning: '#f39c12',
        success: '#2ecc71',
        error: '#e74c3c',
      };
      
      const icon = typeIcons[this.config.type] || typeIcons.info;
      const color = typeColors[this.config.type] || typeColors.info;
      
      return `
        <div class="announcement-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 8px;">
          <div class="announcement-title" style="display: flex; align-items: center; font-weight: 600; color: ${color};">
            <span class="announcement-icon" style="margin-right: 8px; font-size: 16px;">${icon}</span>
            <span>${this.config.title}</span>
          </div>
          <div class="announcement-controls" style="display: flex; gap: 8px;">
            ${this.config.draggable ? '<div class="announcement-drag-handle" style="cursor: move; color: #999; font-size: 14px;">⋮⋮</div>' : ''}
            ${this.config.closable ? '<div class="announcement-close" style="cursor: pointer; color: #999; font-size: 16px;">×</div>' : ''}
          </div>
        </div>
        <div class="announcement-content" style="margin-bottom: 12px;">
          ${this.config.content}
        </div>
        <div class="announcement-footer" style="display: flex; justify-content: flex-end; font-size: 12px; color: #999;">
          <div class="announcement-collapse" style="cursor: pointer; margin-right: 8px;">▼</div>
        </div>
      `;
    }
    
    setupEventListeners() {
      if (!this.announcementBar) return;
      
      // 关闭按钮
      const closeBtn = this.announcementBar.querySelector('.announcement-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', this.closeAnnouncement);
      }
      
      // 折叠按钮
      const collapseBtn = this.announcementBar.querySelector('.announcement-collapse');
      if (collapseBtn) {
        collapseBtn.addEventListener('click', this.toggleCollapse);
      }
      
      // 拖动功能
      if (this.config.draggable) {
        const dragHandle = this.announcementBar.querySelector('.announcement-drag-handle');
        if (dragHandle) {
          dragHandle.addEventListener('mousedown', this.handleMouseDown);
          dragHandle.addEventListener('touchstart', this.handleTouchStart);
        }
        
        // 整个公告栏也可以拖动
        this.announcementBar.addEventListener('mousedown', this.handleMouseDown);
        this.announcementBar.addEventListener('touchstart', this.handleTouchStart);
      }
    }
    
    showAnnouncement() {
      if (!this.announcementBar) return;
      
      // 触发动画
      requestAnimationFrame(() => {
        this.announcementBar.style.opacity = '1';
        this.announcementBar.style.transform = 'translateX(0) scale(1)';
        this.state.isVisible = true;
      });
    }
    
    closeAnnouncement() {
      if (!this.announcementBar || !this.state.isVisible) return;
      
      // 记录用户已关闭该公告
      Utils.recordClosedAnnouncement(this.config.id);
      
      // 关闭动画
      this.announcementBar.style.opacity = '0';
      this.announcementBar.style.transform = 'translateX(100%) scale(0.8)';
      
      // 延迟移除元素
      setTimeout(() => {
        if (this.announcementBar && this.announcementBar.parentNode) {
          this.announcementBar.parentNode.removeChild(this.announcementBar);
          this.announcementBar = null;
        }
        this.state.isVisible = false;
      }, 300);
      
      Utils.log('公告栏已关闭');
    }
    
    toggleCollapse() {
      if (!this.announcementBar) return;
      
      const collapseBtn = this.announcementBar.querySelector('.announcement-collapse');
      const content = this.announcementBar.querySelector('.announcement-content');
      const header = this.announcementBar.querySelector('.announcement-header');
      const footer = this.announcementBar.querySelector('.announcement-footer');
      
      if (this.state.isCollapsed) {
        // 展开公告栏
        this.announcementBar.style.width = '320px';
        this.announcementBar.style.height = 'auto';
        this.announcementBar.style.borderRadius = '12px';
        this.announcementBar.style.padding = '20px';
        
        if (content) content.style.display = 'block';
        if (header) header.style.display = 'flex';
        if (footer) footer.style.display = 'flex';
        if (collapseBtn) collapseBtn.textContent = '▼';
        
        this.state.isCollapsed = false;
      } else {
        // 折叠公告栏
        this.announcementBar.style.width = '60px';
        this.announcementBar.style.height = '60px';
        this.announcementBar.style.borderRadius = '50%';
        this.announcementBar.style.padding = '0';
        
        if (content) content.style.display = 'none';
        if (header) header.style.display = 'none';
        if (footer) footer.style.display = 'none';
        if (collapseBtn) collapseBtn.textContent = '▲';
        
        this.state.isCollapsed = true;
      }
    }
    
    handleMouseDown(event) {
      // 防止点击控制按钮时触发拖动
      if (event.target.closest('.announcement-controls') ||
          event.target.closest('.announcement-footer')) {
        return;
      }
      
      event.preventDefault();
      this.state.isDragging = true;
      
      const rect = this.announcementBar.getBoundingClientRect();
      this.state.dragOffset.x = event.clientX - rect.left;
      this.state.dragOffset.y = event.clientY - rect.top;
      
      // 添加全局事件监听器
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
      
      // 添加拖动样式
      this.announcementBar.style.cursor = 'grabbing';
      this.announcementBar.style.transition = 'none';
      this.announcementBar.style.zIndex = '1001';
    }
    
    handleMouseMove(event) {
      if (!this.state.isDragging) return;
      
      event.preventDefault();
      
      const x = event.clientX - this.state.dragOffset.x;
      const y = event.clientY - this.state.dragOffset.y;
      
      // 限制在视口内
      const maxX = window.innerWidth - this.announcementBar.offsetWidth;
      const maxY = window.innerHeight - this.announcementBar.offsetHeight;
      
      const constrainedX = Math.max(0, Math.min(x, maxX));
      const constrainedY = Math.max(0, Math.min(y, maxY));
      
      this.announcementBar.style.left = `${constrainedX}px`;
      this.announcementBar.style.top = `${constrainedY}px`;
      this.announcementBar.style.right = 'auto';
      this.announcementBar.style.bottom = 'auto';
    }
    
    handleMouseUp() {
      if (!this.state.isDragging) return;
      
      this.state.isDragging = false;
      
      // 移除全局事件监听器
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
      
      // 恢复样式
      this.announcementBar.style.cursor = 'grab';
      this.announcementBar.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      this.announcementBar.style.zIndex = '1000';
    }
    
    handleTouchStart(event) {
      // 防止点击控制按钮时触发拖动
      if (event.target.closest('.announcement-controls') ||
          event.target.closest('.announcement-footer')) {
        return;
      }
      
      const touch = event.touches[0];
      this.state.isDragging = true;
      
      const rect = this.announcementBar.getBoundingClientRect();
      this.state.dragOffset.x = touch.clientX - rect.left;
      this.state.dragOffset.y = touch.clientY - rect.top;
      
      // 添加全局事件监听器
      document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      document.addEventListener('touchend', this.handleTouchEnd);
      
      // 添加拖动样式
      this.announcementBar.style.transition = 'none';
      this.announcementBar.style.zIndex = '1001';
    }
    
    handleTouchMove(event) {
      if (!this.state.isDragging) return;
      
      event.preventDefault();
      
      const touch = event.touches[0];
      const x = touch.clientX - this.state.dragOffset.x;
      const y = touch.clientY - this.state.dragOffset.y;
      
      // 限制在视口内
      const maxX = window.innerWidth - this.announcementBar.offsetWidth;
      const maxY = window.innerHeight - this.announcementBar.offsetHeight;
      
      const constrainedX = Math.max(0, Math.min(x, maxX));
      const constrainedY = Math.max(0, Math.min(y, maxY));
      
      this.announcementBar.style.left = `${constrainedX}px`;
      this.announcementBar.style.top = `${constrainedY}px`;
      this.announcementBar.style.right = 'auto';
      this.announcementBar.style.bottom = 'auto';
    }
    
    handleTouchEnd() {
      if (!this.state.isDragging) return;
      
      this.state.isDragging = false;
      
      // 移除全局事件监听器
      document.removeEventListener('touchmove', this.handleTouchMove);
      document.removeEventListener('touchend', this.handleTouchEnd);
      
      // 恢复样式
      this.announcementBar.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      this.announcementBar.style.zIndex = '1000';
      
      // 保存当前位置
      const currentPosition = {
        top: this.announcementBar.style.top,
        right: this.announcementBar.style.right,
        bottom: this.announcementBar.style.bottom,
        left: this.announcementBar.style.left,
      };
      Utils.saveAnnouncementPosition(this.config.id, currentPosition);
    }
  }
  
  // ==================== 样式注入 ====================
  function injectStyles() {
    const styleId = 'simple-announcement-styles';
    
    // 检查是否已添加样式
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 公告栏基础样式 */
      .simple-announcement-bar {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        box-sizing: border-box;
      }
      
      /* 公告栏内容样式 */
      .simple-announcement-bar .announcement-content {
        color: #333;
        line-height: 1.5;
      }
      
      .simple-announcement-bar .announcement-content p {
        margin: 0 0 10px 0;
      }
      
      .simple-announcement-bar .announcement-content p:last-child {
        margin-bottom: 0;
      }
      
      .simple-announcement-bar .announcement-content a {
        color: #3498db;
        text-decoration: none;
      }
      
      .simple-announcement-bar .announcement-content a:hover {
        text-decoration: underline;
      }
      
      /* 公告栏控制按钮样式 */
      .simple-announcement-bar .announcement-close:hover,
      .simple-announcement-bar .announcement-collapse:hover,
      .simple-announcement-bar .announcement-drag-handle:hover {
        color: #333 !important;
      }
      
      /* 公告栏类型样式 */
      .simple-announcement-bar.type-info {
        border-left: 4px solid #3498db;
      }
      
      .simple-announcement-bar.type-warning {
        border-left: 4px solid #f39c12;
      }
      
      .simple-announcement-bar.type-success {
        border-left: 4px solid #2ecc71;
      }
      
      .simple-announcement-bar.type-error {
        border-left: 4px solid #e74c3c;
      }
      
      /* 公告栏响应式样式 */
      @media (max-width: 768px) {
        .simple-announcement-bar {
          width: 90vw !important;
          max-width: 320px;
          font-size: 13px;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // ==================== 初始化 ====================
  function initAnnouncement() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        injectStyles();
        const announcementBar = new SimpleAnnouncementBar(ANNOUNCEMENT_CONFIG);
        announcementBar.init();
      }, { once: true });
    } else {
      // DOM已经加载完成
      injectStyles();
      const announcementBar = new SimpleAnnouncementBar(ANNOUNCEMENT_CONFIG);
      announcementBar.init();
    }
  }
  
  // 启动公告栏
  initAnnouncement();
  
})();