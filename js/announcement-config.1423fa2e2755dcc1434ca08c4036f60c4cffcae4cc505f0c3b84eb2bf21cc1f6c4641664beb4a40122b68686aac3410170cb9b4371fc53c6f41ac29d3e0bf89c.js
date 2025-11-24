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
      
      // 保存实例引用，避免使用bind
      const self = this;
      this._self = self;
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
      
      // 判断是否在左侧，添加对应的CSS类
      const isLeftSide = savedPosition && savedPosition.left !== 'auto';
      if (isLeftSide) {
        collapsedTab.classList.add('left-tab');
      }
      
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
      const self = this._self;
      collapsedTab.addEventListener('click', function(e) {
        e.preventDefault();
        self.expandFromTab();
      });
      
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
      
      const self = this._self;
      
      // 关闭按钮
      const closeBtn = this.announcementBar.querySelector('.announcement-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
          e.preventDefault();
          self.closeAnnouncement();
        });
      }
      
      // 折叠按钮
      const collapseBtn = this.announcementBar.querySelector('.announcement-collapse');
      if (collapseBtn) {
        collapseBtn.addEventListener('click', function(e) {
          e.preventDefault();
          self.toggleCollapse();
        });
      }
      
      // 拖动功能
      if (this.config.draggable) {
        const dragHandle = this.announcementBar.querySelector('.announcement-drag-handle');
        if (dragHandle) {
          dragHandle.addEventListener('mousedown', function(e) {
            self.handleMouseDown(e);
          });
          dragHandle.addEventListener('touchstart', function(e) {
            self.handleTouchStart(e);
          });
        }
        
        // 整个公告栏也可以拖动
        this.announcementBar.addEventListener('mousedown', function(e) {
          self.handleMouseDown(e);
        });
        this.announcementBar.addEventListener('touchstart', function(e) {
          self.handleTouchStart(e);
        });
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
        // 折叠公告栏 - 隐藏到侧边
        // 先保存当前位置
        const currentPosition = {
          top: this.announcementBar.style.top,
          right: this.announcementBar.style.right,
          bottom: this.announcementBar.style.bottom,
          left: this.announcementBar.style.left,
        };
        Utils.saveAnnouncementPosition(this.config.id, currentPosition);
        
        this.announcementBar.style.opacity = '0';
        this.announcementBar.style.transform = 'translateX(100%)';
        
        // 保存折叠状态
        Utils.saveAnnouncementCollapsed(this.config.id, true);
        this.state.isCollapsed = true;
        
        // 延迟创建折叠标签
        setTimeout(() => {
          if (this.announcementBar && this.announcementBar.parentNode) {
            this.announcementBar.parentNode.removeChild(this.announcementBar);
            this.announcementBar = null;
          }
          this.createCollapsedTab();
        }, 300);
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
      
      const self = this._self;
      
      // 添加全局事件监听器
      document.addEventListener('mousemove', function(e) {
        self.handleMouseMove(e);
      });
      document.addEventListener('mouseup', function(e) {
        self.handleMouseUp(e);
      });
      
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
      
      const self = this._self;
      
      // 移除全局事件监听器
      document.removeEventListener('mousemove', function(e) {
        self.handleMouseMove(e);
      });
      document.removeEventListener('mouseup', function(e) {
        self.handleMouseUp(e);
      });
      
      // 恢复样式
      this.announcementBar.style.cursor = 'grab';
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
      
      const self = this._self;
      
      // 添加全局事件监听器
      document.addEventListener('touchmove', function(e) {
        self.handleTouchMove(e);
      }, { passive: false });
      document.addEventListener('touchend', function(e) {
        self.handleTouchEnd(e);
      });
      
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
      
      const self = this._self;
      
      // 移除全局事件监听器
      document.removeEventListener('touchmove', function(e) {
        self.handleTouchMove(e);
      });
      document.removeEventListener('touchend', function(e) {
        self.handleTouchEnd(e);
      });
      
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
    
    // 获取折叠标签样式
    getTabStyles() {
      // 根据公告栏类型获取对应的颜色
      const typeColors = {
        info: '#3498db',
        warning: '#f39c12',
        success: '#2ecc71',
        error: '#e74c3c',
      };
      const color = typeColors[this.config.type] || typeColors.info;
      
      // 获取保存的位置，判断是在左侧还是右侧
      const savedPosition = Utils.getAnnouncementPosition(this.config.id);
      const isLeftSide = savedPosition && savedPosition.left !== 'auto';
      
      return {
        width: '50px',
        height: '50px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        border: `2px solid ${color}`,
        borderRadius: isLeftSide ? '0 12px 12px 0' : '12px 0 0 12px',
        boxShadow: isLeftSide ?
          '3px 3px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)' :
          '-3px 3px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        position: 'fixed',
        zIndex: '999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateX(0)',
        opacity: '0',
        fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
        fontSize: '20px',
        color: color,
        fontWeight: '500',
      };
    }
    
    // 获取折叠标签位置样式
    getTabPositionStyles(savedPosition) {
      if (savedPosition) {
        // 使用保存的位置，但调整到屏幕边缘
        if (savedPosition.right !== 'auto') {
          // 如果公告栏在右侧，标签显示在右侧边缘
          return {
            top: savedPosition.top || '20px',
            right: '0px',
            bottom: 'auto',
            left: 'auto',
          };
        } else if (savedPosition.left !== 'auto') {
          // 如果公告栏在左侧，标签显示在左侧边缘
          return {
            top: savedPosition.top || '20px',
            left: '0px',
            bottom: 'auto',
            right: 'auto',
          };
        }
      }
      
      // 默认显示在右侧
      return {
        top: '20px',
        right: '0px',
        bottom: 'auto',
        left: 'auto',
      };
    }
    
    // 创建折叠标签内容
    createTabContent() {
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
        <div class="tab-icon" style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          font-size: 20px;
          color: ${color};
          position: relative;
        ">
          ${icon}
          <div style="
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 8px;
            height: 8px;
            background: ${color};
            border-radius: 50%;
            opacity: 0.8;
          "></div>
        </div>
      `;
    }
    
    // 显示折叠标签
    showTab() {
      if (!this.collapsedTab) return;
      
      // 触发动画
      requestAnimationFrame(() => {
        this.collapsedTab.style.opacity = '1';
        this.collapsedTab.style.transform = 'translateX(0)';
      });
    }
    
    // 从折叠标签展开公告栏
    expandFromTab() {
      if (!this.collapsedTab) return;
      
      // 获取保存的位置，判断是在左侧还是右侧
      const savedPosition = Utils.getAnnouncementPosition(this.config.id);
      const isLeftSide = savedPosition && savedPosition.left !== 'auto';
      
      // 移除折叠标签
      this.collapsedTab.style.opacity = '0';
      this.collapsedTab.style.transform = isLeftSide ? 'translateX(-100%)' : 'translateX(100%)';
      
      setTimeout(() => {
        if (this.collapsedTab && this.collapsedTab.parentNode) {
          this.collapsedTab.parentNode.removeChild(this.collapsedTab);
          this.collapsedTab = null;
        }
        
        // 更新折叠状态
        this.state.isCollapsed = false;
        Utils.saveAnnouncementCollapsed(this.config.id, false);
        
        // 创建并显示完整公告栏
        this.createAnnouncementBar();
      }, 300);
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
      
      /* 折叠标签样式 */
      .simple-announcement-tab {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        box-sizing: border-box;
      }
      
      .simple-announcement-tab:hover {
        transform: translateX(-8px) scale(1.05) !important;
        box-shadow: -5px 5px 20px rgba(0, 0, 0, 0.2) !important;
      }
      
      .simple-announcement-tab:active {
        transform: translateX(-5px) scale(0.98) !important;
      }
      
      .simple-announcement-tab .tab-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        transition: transform 0.2s ease;
      }
      
      .simple-announcement-tab:hover .tab-icon {
        transform: rotate(10deg);
      }
      
      /* 左侧标签的特殊样式 */
      .simple-announcement-tab.left-tab {
        border-radius: 0 12px 12px 0 !important;
        box-shadow: 3px 3px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
      }
      
      .simple-announcement-tab.left-tab:hover {
        transform: translateX(8px) scale(1.05) !important;
        box-shadow: 5px 5px 20px rgba(0, 0, 0, 0.2) !important;
      }
      
      .simple-announcement-tab.left-tab:active {
        transform: translateX(5px) scale(0.98) !important;
      }
      
      .simple-announcement-tab.left-tab:hover .tab-icon {
        transform: rotate(-10deg);
      }
      
      /* 折叠标签响应式样式 */
      @media (max-width: 768px) {
        .simple-announcement-tab {
          width: 45px !important;
          height: 45px !important;
          font-size: 18px !important;
        }
      }
      
      @media (max-width: 480px) {
        .simple-announcement-tab {
          width: 40px !important;
          height: 40px !important;
          font-size: 16px !important;
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