/**
 * 一些自定义的插件，通过AI进行的优化和增强
 * @description 当前已有扩展
 * @description 1. 快捷键绑定
 * @description 2. 限制特定区域访问单页
 * @description 3. 公告栏系统 - 支持Markdown配置、到期时间、拖动、折叠等功能
 * @description 4. Vercel Insights 脚本加载
 * @last update: 2025-11-24
 * @version 2.1.0 新增公告栏功能
 */

// ==================== 配置常量 ====================
const CONFIG = {
  // 移动设备检测断点 - 小于此宽度的设备被视为移动设备，将禁用快捷键功能
  MOBILE_BREAKPOINT: 680,
  
  // 缓存配置 - 用于存储用户国家信息和公告栏状态，减少API调用
  CACHE: {
    COUNTRY_KEY: 'userCountry',                    // localStorage中存储国家代码的键名
    COUNTRY_TIMESTAMP_KEY: 'userCountryTimestamp',   // localStorage中存储时间戳的键名
    EXPIRY_MS: 24 * 60 * 60 * 1000,                // 缓存过期时间（24小时），超过此时间将重新获取国家信息
    ANNOUNCEMENT_KEY: 'announcementStatus',         // localStorage中存储公告栏状态的键名
  },
  
  // API配置 - 用于获取用户地理位置信息
  API: {
    IPINFO_URL: 'https://ipinfo.io/json',           // IP地理位置查询API地址，无需token的免费版本
    TIMEOUT_MS: 5000,                               // 请求超时时间（毫秒），超过此时间将视为请求失败
    RETRY_COUNT: 2,                                 // 请求失败时的重试次数
    RETRY_DELAY_MS: 1000,                           // 重试间隔时间（毫秒）
  },
  
  // DOM元素ID - 页面中需要操作的元素ID，确保与主题HTML结构匹配
  DOM_IDS: {
    SEARCH_TOGGLE: 'search-toggle-desktop',    // 桌面端搜索切换按钮ID，用于打开搜索弹窗
    SEARCH_INPUT: 'search-input-desktop',      // 桌面端搜索输入框ID，用于接收用户输入
    MASK: 'mask',                             // 遮罩层ID，用于关闭搜索弹窗
    CONTENT: 'content',                       // 主要内容区域ID，用于显示访问限制消息
    TOC_AUTO: 'toc-auto',                     // 自动目录容器ID，访问受限时需要隐藏
    AREA_RESTRICTED: 'area-restricted',       // 区域限制元素ID，包含受限国家列表的data属性
    ANNOUNCEMENT: 'announcement',             // 公告栏元素ID，包含公告内容和配置
  },
  
  // 样式配置 - 访问限制消息和公告栏的样式设置
  STYLES: {
    RESTRICTION_MESSAGE: {
      minHeight: '180px',                                              // 最小高度，确保消息框有足够空间
      fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",  // 字体栈，优先使用现代字体
      backgroundColor: '#F8F8F8',                                      // 背景颜色，柔和的浅灰色
      border: '1px solid #bdc3c7',                                     // 边框样式，柔和的灰色边框
      borderRadius: '20px',                                            // 圆角半径，较大的圆角使界面更友好
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',                     // 阴影效果，增加层次感
      padding: '40px',                                                 // 内边距，确保内容有足够的呼吸空间
      margin: '60px auto',                                             // 外边距，上下60px，左右自动居中
      maxWidth: 'min(85vw, 900px)',                                    // 最大宽度，响应式设计，不超过视口85%或900px
      transition: 'opacity 0.8s ease-out',                            // 透明度过渡动画，用于淡入效果
    },
    
    // 公告栏样式配置
    ANNOUNCEMENT: {
      width: '320px',                                                  // 公告栏宽度
      maxWidth: '90vw',                                                // 移动端最大宽度
      backgroundColor: 'rgba(255, 255, 255, 0.95)',                     // 半透明白色背景
      backdropFilter: 'blur(10px)',                                     // 背景模糊效果
      border: '1px solid rgba(0, 0, 0, 0.1)',                          // 细边框
      borderRadius: '12px',                                           // 圆角
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.08)', // 多层阴影
      padding: '20px',                                                 // 内边距
      position: 'fixed',                                               // 固定定位
      zIndex: '1000',                                                  // 层级
      fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif", // 字体栈
      fontSize: '14px',                                                // 基础字体大小
      lineHeight: '1.5',                                               // 行高
      color: '#333',                                                   // 文字颜色
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',            // 平滑过渡动画
      transform: 'translateX(0)',                                       // 初始位置
    },
    
    // 公告栏折叠状态样式
    ANNOUNCEMENT_COLLAPSED: {
      width: '60px',                                                   // 折叠后宽度
      height: '60px',                                                  // 折叠后高度
      borderRadius: '50%',                                             // 圆形
      padding: '0',                                                    // 无内边距
      cursor: 'pointer',                                              // 鼠标指针
    },
    
    // 公告栏位置配置
    ANNOUNCEMENT_POSITIONS: {
      'top-right': { top: '20px', right: '20px', bottom: 'auto', left: 'auto' },
      'top-left': { top: '20px', left: '20px', bottom: 'auto', right: 'auto' },
      'bottom-right': { bottom: '20px', right: '20px', top: 'auto', left: 'auto' },
      'bottom-left': { bottom: '20px', left: '20px', top: 'auto', right: 'auto' },
    },
  },
  
  // 国家代码 - 特殊国家的ISO 3166-1 alpha-2代码
  COUNTRIES: {
    CHINA: 'CN',  // 中国大陆国家代码，用于特殊处理（如显示备案信息、不加载外部分析脚本）
  },
  
  // 调试配置 - 控制调试信息的输出
  DEBUG: {
    ENABLED: true,        // 是否启用调试日志，生产环境建议设为false以减少控制台输出
    PREFIX: 'ExtUtils:',  // 控制台日志前缀，便于识别来源和过滤日志
  },
};

// ==================== 工具函数 ====================
const Utils = {
  /**
   * 调试日志输出
   * @param {string} message - 日志消息
   * @param {any} data - 可选数据
   */
  log(message, data = null) {
    if (CONFIG.DEBUG.ENABLED) {
      console.debug(`${CONFIG.DEBUG.PREFIX} ${message}`, data);
    }
  },

  /**
   * 错误日志输出
   * @param {string} message - 错误消息
   * @param {Error} error - 错误对象
   */
  logError(message, error = null) {
    console.error(`${CONFIG.DEBUG.PREFIX} ${message}`, error);
  },

  /**
   * 安全地设置localStorage
   * @param {string} key - 键
   * @param {string} value - 值
   */
  safeSetLocalStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      this.logError('localStorage写入失败:', error);
    }
  },

  /**
   * 安全地获取localStorage
   * @param {string} key - 键
   * @returns {string|null} 值或null
   */
  safeGetLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      this.logError('localStorage读取失败:', error);
      return null;
    }
  },

  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * 安全地创建带超时的fetch请求
   * @param {string} url - 请求URL
   * @param {Object} options - 请求选项
   * @param {number} timeout - 超时时间
   * @returns {Promise} fetch Promise
   */
  fetchWithTimeout(url, options = {}, timeout = CONFIG.API.TIMEOUT_MS) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('请求超时')), timeout)
      ),
    ]);
  },

  /**
   * 带重试机制的fetch请求
   * @param {string} url - 请求URL
   * @param {number} retryCount - 重试次数
   * @returns {Promise} fetch Promise
   */
  async fetchWithRetry(url, retryCount = CONFIG.API.RETRY_COUNT) {
    try {
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        throw new Error(`网络响应失败: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (retryCount > 0) {
        this.log(`请求失败，${CONFIG.API.RETRY_DELAY_MS}ms后重试... 剩余重试次数: ${retryCount}`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.API.RETRY_DELAY_MS));
        return this.fetchWithRetry(url, retryCount - 1);
      }
      throw error;
    }
  },
};

// ==================== 全局命名空间 ====================
if (typeof window.ExtUtils === 'undefined') {
  window.ExtUtils = {};
}

// 检查并添加 isMobile 方法
if (typeof window.ExtUtils.isMobile !== 'function') {
  window.ExtUtils.isMobile = function() {
    return window.matchMedia(`only screen and (max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches;
  };
}

// 检查并添加 getUserCountry 方法 (优化: Promise化和缓存)
if (typeof window.ExtUtils.getUserCountry !== 'function') {
  window.ExtUtils.getUserCountry = function() {
    return new Promise((resolve, reject) => {
      const cachedCountry = Utils.safeGetLocalStorage(CONFIG.CACHE.COUNTRY_KEY);
      const cachedTimestamp = Utils.safeGetLocalStorage(CONFIG.CACHE.COUNTRY_TIMESTAMP_KEY);
      const now = Date.now();

      // 检查缓存是否有效
      if (cachedCountry && cachedTimestamp && (now - parseInt(cachedTimestamp, 10) < CONFIG.CACHE.EXPIRY_MS)) {
        Utils.log('从缓存加载国家信息');
        resolve(cachedCountry);
        return;
      }

      // 从API获取国家信息
      Utils.fetchWithRetry(CONFIG.API.IPINFO_URL)
        .then(data => {
          if (data?.country) {
            // 验证国家代码格式（2个字母）
            if (/^[A-Z]{2}$/i.test(data.country)) {
              Utils.safeSetLocalStorage(CONFIG.CACHE.COUNTRY_KEY, data.country);
              Utils.safeSetLocalStorage(CONFIG.CACHE.COUNTRY_TIMESTAMP_KEY, now.toString());
              Utils.log('成功获取并缓存国家信息', data.country);
              resolve(data.country.toUpperCase());
            } else {
              throw new Error(`无效的国家代码格式: ${data.country}`);
            }
          } else {
            throw new Error('API返回数据不包含国家信息');
          }
        })
        .catch(error => {
          Utils.logError('国家信息请求失败:', error);
          reject(null); // 拒绝Promise，但传递null表示获取失败
        });
    });
  };
}

// ==================== 快捷键绑定类 ====================
class KeybindCustom {
  static initKeyBind() {
    // 缓存DOM元素引用
    const elements = {
      searchToggle: document.getElementById(CONFIG.DOM_IDS.SEARCH_TOGGLE),
      searchInput: document.getElementById(CONFIG.DOM_IDS.SEARCH_INPUT),
      mask: document.getElementById(CONFIG.DOM_IDS.MASK),
    };

    // 检查必要元素是否存在
    if (!elements.searchToggle || !elements.searchInput) {
      Utils.log('搜索元素不存在，跳过快捷键初始化');
      return;
    }

    let isSearchActive = false;

    // 检查当前焦点是否在输入元素中
    const isInputFocused = () => {
      const { activeElement } = document;
      const tagName = activeElement?.tagName?.toLowerCase();
      return activeElement === elements.searchInput ||
             ['textarea', 'input', 'pre'].includes(tagName);
    };

    // 处理键盘事件
    const handleKeyDown = (event) => {
      // 斜杠键：打开搜索
      if (event.key === '/' && !isInputFocused()) {
        event.preventDefault();
        elements.searchToggle.click();
        isSearchActive = true;
        // 使用requestAnimationFrame确保DOM更新后再聚焦
        requestAnimationFrame(() => {
          elements.searchInput.focus();
        });
      }
      // Escape键：关闭搜索
      else if (event.key === 'Escape' && isSearchActive && elements.mask) {
        elements.mask.click();
        isSearchActive = false;
        elements.searchInput.blur();
      }
    };

    // 处理搜索输入框焦点事件
    const handleSearchFocus = () => { isSearchActive = true; };
    const handleSearchBlur = () => { isSearchActive = false; };

    // 添加事件监听器
    document.addEventListener('keydown', handleKeyDown);
    elements.searchInput.addEventListener('focus', handleSearchFocus);
    elements.searchInput.addEventListener('blur', handleSearchBlur);

    Utils.log('快捷键绑定初始化完成');
  }
}

// ==================== 访问限制类 ====================
class AccessRestriction {
  constructor() {
    // 缓存DOM元素引用
    this.elements = {
      areaAccessValidation: document.getElementById(CONFIG.DOM_IDS.AREA_RESTRICTED),
      content: document.getElementById(CONFIG.DOM_IDS.CONTENT),
      tocAuto: document.getElementById(CONFIG.DOM_IDS.TOC_AUTO),
    };

    // 解析受限国家列表
    this.restrictedCountries = this.parseRestrictedCountries();
    
    // 绑定方法上下文
    this.hideBeianInfo = this.hideBeianInfo.bind(this);
  }

  /**
   * 解析受限国家列表
   * @returns {string[]} 受限国家代码数组
   */
  parseRestrictedCountries() {
    if (!this.elements.areaAccessValidation?.dataset.restrictedCountries) {
      return [];
    }
    
    try {
      return this.elements.areaAccessValidation.dataset.restrictedCountries
        .split(',')
        .map(country => country.trim().toUpperCase())
        .filter(country => /^[A-Z]{2}$/.test(country));
    } catch (error) {
      Utils.logError('解析受限国家列表失败:', error);
      return [];
    }
  }

  /**
   * 检查访问权限
   * @param {string|null} country - 用户国家代码
   */
  checkAccess(country) {
    if (!country) {
      Utils.log('未获取到国家信息，跳过访问控制');
      return;
    }

    // 检查是否在受限国家列表中
    if (this.elements.areaAccessValidation && this.restrictedCountries.includes(country)) {
      Utils.log(`检测到受限国家: ${country}`);
      this.displayRestrictionMessage();
      this.hideTOCContent();
    }

    // 隐藏备案信息（非中国用户）
    if (country !== CONFIG.COUNTRIES.CHINA) {
      this.hideBeianInfo();
    }
  }

  /**
   * 显示访问限制消息
   */
  displayRestrictionMessage() {
    if (!this.elements.content) return;

    // 创建访问限制消息内容
    const restrictionContent = this.createRestrictionContent();
    
    // 设置初始透明度为0，准备淡入动画
    this.elements.content.style.opacity = '0';
    this.elements.content.innerHTML = restrictionContent;
    
    // 应用样式
    this.applyRestrictionStyles();
    
    // 触发淡入动画
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.elements.content.style.opacity = '1';
      }, 100);
    });

    Utils.log('已显示访问限制消息');
  }

  /**
   * 创建访问限制消息HTML内容
   * @returns {string} HTML内容
   */
  createRestrictionContent() {
    return `
      <div class="restriction-icon" role="img" aria-label="访问受限">🚫</div>
      <h2 class="restriction-title">对不起，您所在的区域不允许访问该页面！</h2>
      <p class="restriction-subtitle">请联系管理员以获取更多信息访问权限。</p>
    `;
  }

  /**
   * 应用访问限制样式
   */
  applyRestrictionStyles() {
    const styles = {
      ...CONFIG.STYLES.RESTRICTION_MESSAGE,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      boxSizing: 'border-box',
    };

    // 应用容器样式
    Object.assign(this.elements.content.style, styles);

    // 添加内部元素样式
    this.addInternalStyles();
  }

  /**
   * 添加内部元素样式
   */
  addInternalStyles() {
    const styleId = 'ext-utils-restriction-styles';
    
    // 检查是否已添加样式
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .restriction-icon {
        font-size: 1.5em;
        margin-bottom: 20px;
        color: #7f8c8d;
      }
      .restriction-title {
        margin: 0;
        font-size: 1.4em;
        font-weight: 600;
        color: #34495e;
      }
      .restriction-subtitle {
        margin-top: 15px;
        font-size: 1em;
        color: #95a5a6;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 隐藏目录内容
   */
  hideTOCContent() {
    if (!this.elements.tocAuto) return;

    Array.from(this.elements.tocAuto.children)
      .filter(child => child.nodeType === Node.ELEMENT_NODE)
      .forEach(child => {
        child.style.display = 'none';
      });

    Utils.log('已隐藏目录内容');
  }

  /**
   * 隐藏备案信息
   */
  hideBeianInfo() {
    const beianElements = document.querySelectorAll('.footer-line.beian');
    beianElements.forEach(element => {
      element.style.display = 'none';
    });

    if (beianElements.length > 0) {
      Utils.log(`已隐藏 ${beianElements.length} 个备案信息元素`);
    }
  }
}

// ==================== 公告栏类 ====================
class AnnouncementBar {
  constructor() {
    // 缓存DOM元素引用
    this.elements = {
      announcement: document.getElementById(CONFIG.DOM_IDS.ANNOUNCEMENT),
    };
    
    // 公告栏状态
    this.state = {
      isVisible: false,
      isCollapsed: false,
      isDragging: false,
      position: 'top-right', // 默认位置
      dragOffset: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 },
    };
    
    // 绑定方法上下文
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.toggleCollapse = this.toggleCollapse.bind(this);
    this.closeAnnouncement = this.closeAnnouncement.bind(this);
  }

  /**
   * 初始化公告栏
   */
  init() {
    // 尝试从全局配置获取公告栏配置
    let config = this.getGlobalAnnouncementConfig();
    
    // 如果没有全局配置，尝试从页面元素获取
    if (!config) {
      if (!this.elements.announcement) {
        Utils.log('未找到公告栏元素或全局配置，跳过公告栏初始化');
        return;
      }
      
      config = this.parseAnnouncementConfig();
      if (!config) {
        Utils.log('公告栏配置无效，跳过公告栏初始化');
        return;
      }
    }

    // 检查公告是否已过期
    if (this.isAnnouncementExpired(config.expiryDate)) {
      Utils.log('公告已过期，不显示');
      return;
    }

    // 检查用户是否已关闭该公告
    if (this.isUserClosedAnnouncement(config.id)) {
      Utils.log('用户已关闭该公告，不显示');
      return;
    }

    // 创建公告栏
    this.createAnnouncementBar(config);
    
    Utils.log('公告栏初始化完成');
  }

  /**
   * 获取全局公告栏配置
   * @returns {Object|null} 配置对象或null
   */
  getGlobalAnnouncementConfig() {
    try {
      // 检查全局变量是否存在
      if (typeof window.GLOBAL_ANNOUNCEMENT === 'undefined') {
        return null;
      }
      
      const globalConfig = window.GLOBAL_ANNOUNCEMENT;
      
      // 验证必需的配置项
      if (!globalConfig || !globalConfig.content) {
        Utils.log('全局公告栏配置缺少必需的内容');
        return null;
      }
      
      return {
        id: globalConfig.id || 'global',
        content: globalConfig.content,
        title: globalConfig.title || '公告',
        expiryDate: globalConfig.expiryDate || null,
        position: globalConfig.position || 'top-right',
        type: globalConfig.type || 'info', // info, warning, success, error
        closable: globalConfig.closable !== false,
        draggable: globalConfig.draggable !== false,
        autoHide: parseInt(globalConfig.autoHide) || 0, // 自动隐藏时间（秒），0表示不自动隐藏
      };
    } catch (error) {
      Utils.logError('获取全局公告栏配置失败:', error);
      return null;
    }
  }

  /**
   * 解析公告栏配置
   * @returns {Object|null} 配置对象或null
   */
  parseAnnouncementConfig() {
    const element = this.elements.announcement;
    
    try {
      return {
        id: element.dataset.id || 'default',
        content: element.dataset.content || element.innerHTML || '',
        title: element.dataset.title || '公告',
        expiryDate: element.dataset.expiryDate || null,
        position: element.dataset.position || 'top-right',
        type: element.dataset.type || 'info', // info, warning, success, error
        closable: element.dataset.closable !== 'false',
        draggable: element.dataset.draggable !== 'false',
        autoHide: parseInt(element.dataset.autoHide) || 0, // 自动隐藏时间（秒），0表示不自动隐藏
      };
    } catch (error) {
      Utils.logError('解析公告栏配置失败:', error);
      return null;
    }
  }

  /**
   * 检查公告是否已过期
   * @param {string|null} expiryDate - 过期日期字符串
   * @returns {boolean} 是否已过期
   */
  isAnnouncementExpired(expiryDate) {
    if (!expiryDate) return false;
    
    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      return now > expiry;
    } catch (error) {
      Utils.logError('解析过期日期失败:', error);
      return false;
    }
  }

  /**
   * 检查用户是否已关闭该公告
   * @param {string} announcementId - 公告ID
   * @returns {boolean} 是否已关闭
   */
  isUserClosedAnnouncement(announcementId) {
    const closedAnnouncements = Utils.safeGetLocalStorage(CONFIG.CACHE.ANNOUNCEMENT_KEY);
    if (!closedAnnouncements) return false;
    
    try {
      const closedList = JSON.parse(closedAnnouncements);
      return closedList.includes(announcementId);
    } catch (error) {
      Utils.logError('解析已关闭公告列表失败:', error);
      return false;
    }
  }

  /**
   * 创建公告栏
   * @param {Object} config - 公告配置
   */
  createAnnouncementBar(config) {
    // 创建公告栏容器
    const announcementBar = document.createElement('div');
    announcementBar.className = 'ext-utils-announcement-bar';
    announcementBar.id = `announcement-${config.id}`;
    
    // 设置位置
    this.state.position = config.position;
    const positionStyles = CONFIG.STYLES.ANNOUNCEMENT_POSITIONS[config.position] ||
                          CONFIG.STYLES.ANNOUNCEMENT_POSITIONS['top-right'];
    
    // 应用基础样式
    Object.assign(announcementBar.style, CONFIG.STYLES.ANNOUNCEMENT, positionStyles);
    
    // 创建公告栏内容
    const announcementContent = this.createAnnouncementContent(config);
    announcementBar.innerHTML = announcementContent;
    
    // 添加到页面
    document.body.appendChild(announcementBar);
    
    // 缓存创建的元素
    this.announcementBar = announcementBar;
    
    // 设置事件监听器
    this.setupEventListeners(config);
    
    // 设置自动隐藏
    if (config.autoHide > 0) {
      setTimeout(() => {
        this.closeAnnouncement();
      }, config.autoHide * 1000);
    }
    
    // 显示动画
    this.showAnnouncement();
  }

  /**
   * 创建公告栏内容
   * @param {Object} config - 公告配置
   * @returns {string} HTML内容
   */
  createAnnouncementContent(config) {
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
    
    const icon = typeIcons[config.type] || typeIcons.info;
    const color = typeColors[config.type] || typeColors.info;
    
    return `
      <div class="announcement-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 8px;">
        <div class="announcement-title" style="display: flex; align-items: center; font-weight: 600; color: ${color};">
          <span class="announcement-icon" style="margin-right: 8px; font-size: 16px;">${icon}</span>
          <span>${config.title}</span>
        </div>
        <div class="announcement-controls" style="display: flex; gap: 8px;">
          ${config.draggable ? '<div class="announcement-drag-handle" style="cursor: move; color: #999; font-size: 14px;">⋮⋮</div>' : ''}
          ${config.closable ? '<div class="announcement-close" style="cursor: pointer; color: #999; font-size: 16px;">×</div>' : ''}
        </div>
      </div>
      <div class="announcement-content" style="margin-bottom: 12px;">
        ${config.content}
      </div>
      <div class="announcement-footer" style="display: flex; justify-content: flex-end; font-size: 12px; color: #999;">
        <div class="announcement-collapse" style="cursor: pointer; margin-right: 8px;">▼</div>
      </div>
    `;
  }

  /**
   * 设置事件监听器
   * @param {Object} config - 公告配置
   */
  setupEventListeners(config) {
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
    if (config.draggable) {
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

  /**
   * 显示公告栏
   */
  showAnnouncement() {
    if (!this.announcementBar) return;
    
    // 初始状态设置为透明和缩小
    this.announcementBar.style.opacity = '0';
    this.announcementBar.style.transform = 'translateX(0) scale(0.8)';
    
    // 触发动画
    requestAnimationFrame(() => {
      this.announcementBar.style.opacity = '1';
      this.announcementBar.style.transform = 'translateX(0) scale(1)';
      this.state.isVisible = true;
    });
  }

  /**
   * 关闭公告栏
   */
  closeAnnouncement() {
    if (!this.announcementBar || !this.state.isVisible) return;
    
    // 获取公告ID
    const announcementId = this.announcementBar.id.replace('announcement-', '');
    
    // 记录用户已关闭该公告
    this.recordClosedAnnouncement(announcementId);
    
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

  /**
   * 记录用户已关闭的公告
   * @param {string} announcementId - 公告ID
   */
  recordClosedAnnouncement(announcementId) {
    try {
      const closedAnnouncements = Utils.safeGetLocalStorage(CONFIG.CACHE.ANNOUNCEMENT_KEY) || '[]';
      const closedList = JSON.parse(closedAnnouncements);
      
      if (!closedList.includes(announcementId)) {
        closedList.push(announcementId);
        Utils.safeSetLocalStorage(CONFIG.CACHE.ANNOUNCEMENT_KEY, JSON.stringify(closedList));
      }
    } catch (error) {
      Utils.logError('记录已关闭公告失败:', error);
    }
  }

  /**
   * 切换公告栏折叠状态
   */
  toggleCollapse() {
    if (!this.announcementBar) return;
    
    const collapseBtn = this.announcementBar.querySelector('.announcement-collapse');
    const content = this.announcementBar.querySelector('.announcement-content');
    const header = this.announcementBar.querySelector('.announcement-header');
    const footer = this.announcementBar.querySelector('.announcement-footer');
    
    if (this.state.isCollapsed) {
      // 展开公告栏
      this.announcementBar.style.width = CONFIG.STYLES.ANNOUNCEMENT.width;
      this.announcementBar.style.height = 'auto';
      this.announcementBar.style.borderRadius = CONFIG.STYLES.ANNOUNCEMENT.borderRadius;
      this.announcementBar.style.padding = CONFIG.STYLES.ANNOUNCEMENT.padding;
      
      if (content) content.style.display = 'block';
      if (header) header.style.display = 'flex';
      if (footer) footer.style.display = 'flex';
      if (collapseBtn) collapseBtn.textContent = '▼';
      
      this.state.isCollapsed = false;
    } else {
      // 折叠公告栏
      Object.assign(this.announcementBar.style, CONFIG.STYLES.ANNOUNCEMENT_COLLAPSED);
      
      if (content) content.style.display = 'none';
      if (header) header.style.display = 'none';
      if (footer) footer.style.display = 'none';
      if (collapseBtn) collapseBtn.textContent = '▲';
      
      this.state.isCollapsed = true;
    }
  }

  /**
   * 处理鼠标按下事件
   * @param {MouseEvent} event - 鼠标事件
   */
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

  /**
   * 处理鼠标移动事件
   * @param {MouseEvent} event - 鼠标事件
   */
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
    
    this.state.currentPos.x = constrainedX;
    this.state.currentPos.y = constrainedY;
  }

  /**
   * 处理鼠标释放事件
   */
  handleMouseUp() {
    if (!this.state.isDragging) return;
    
    this.state.isDragging = false;
    
    // 移除全局事件监听器
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    
    // 恢复样式
    this.announcementBar.style.cursor = 'grab';
    this.announcementBar.style.transition = CONFIG.STYLES.ANNOUNCEMENT.transition;
    this.announcementBar.style.zIndex = CONFIG.STYLES.ANNOUNCEMENT.zIndex;
  }

  /**
   * 处理触摸开始事件
   * @param {TouchEvent} event - 触摸事件
   */
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

  /**
   * 处理触摸移动事件
   * @param {TouchEvent} event - 触摸事件
   */
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
    
    this.state.currentPos.x = constrainedX;
    this.state.currentPos.y = constrainedY;
  }

  /**
   * 处理触摸结束事件
   */
  handleTouchEnd() {
    if (!this.state.isDragging) return;
    
    this.state.isDragging = false;
    
    // 移除全局事件监听器
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    
    // 恢复样式
    this.announcementBar.style.transition = CONFIG.STYLES.ANNOUNCEMENT.transition;
    this.announcementBar.style.zIndex = CONFIG.STYLES.ANNOUNCEMENT.zIndex;
  }
}

// ==================== Vercel分析类 ====================
class VercelInsights {
  static isLoaded = false;

  /**
   * 初始化Vercel Insights
   * @param {string|null} country - 用户国家代码
   */
  static init(country) {
    // 只为非中国用户加载，且避免重复加载
    if (!country || country === CONFIG.COUNTRIES.CHINA || this.isLoaded) {
      Utils.log(`跳过Vercel Insights加载: 国家=${country}, 已加载=${this.isLoaded}`);
      return;
    }

    try {
      // 初始化Vercel Analytics全局函数
      window.va = window.va || function() {
        (window.vaq = window.vaq || []).push(arguments);
      };

      // 创建并加载脚本
      const script = document.createElement('script');
      script.defer = true;
      script.src = '/_vercel/insights/script.js';
      script.onerror = () => Utils.logError('Vercel Insights脚本加载失败');
      script.onload = () => {
        this.isLoaded = true;
        Utils.log('Vercel Insights脚本加载成功');
      };

      document.head.appendChild(script);
    } catch (error) {
      Utils.logError('初始化Vercel Insights失败:', error);
    }
  }
}

// ==================== 初始化逻辑 ====================
class ExtUtilsInitializer {
  static async init() {
    try {
      Utils.log('开始初始化ExtUtils扩展');

      // 1. 初始化快捷键（仅桌面端）
      if (!window.ExtUtils.isMobile()) {
        KeybindCustom.initKeyBind();
      } else {
        Utils.log('移动设备，跳过快捷键初始化');
      }

      // 2. 等待DOM完全加载
      await this.waitForDOMReady();

      // 3. 获取用户国家信息
      const userCountry = await this.getUserCountrySafely();

      // 4. 初始化访问限制
      // markdown 配置示例: <div id="area-restricted" data-restricted-countries="CN,SG" style="display:none;"></div>
      const accessRestriction = new AccessRestriction();
      accessRestriction.checkAccess(userCountry);

      // 5. 初始化公告栏
      // markdown 配置示例: <div id="announcement" data-id="welcome" data-title="欢迎公告" data-content="欢迎使用我们的网站！" data-expiry-date="2025-12-31" data-position="top-right" data-type="info" data-closable="true" data-draggable="true" data-auto-hide="0" style="display:none;"></div>
      const announcementBar = new AnnouncementBar();
      announcementBar.init();

      // 6. 初始化Vercel Insights
      VercelInsights.init(userCountry);

      Utils.log('ExtUtils扩展初始化完成');
    } catch (error) {
      Utils.logError('ExtUtils初始化失败:', error);
    }
  }

  /**
   * 等待DOM准备就绪
   * @returns {Promise<void>}
   */
  static waitForDOMReady() {
    return new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      } else {
        resolve();
      }
    });
  }

  /**
   * 安全地获取用户国家信息
   * @returns {Promise<string|null>} 国家代码或null
   */
  static async getUserCountrySafely() {
    try {
      const country = await window.ExtUtils.getUserCountry();
      Utils.log(`成功获取用户国家: ${country}`);
      return country;
    } catch (error) {
      Utils.logError('获取用户国家信息失败:', error);
      return null;
    }
  }
}

// ==================== 公告栏样式注入 ====================
/**
 * 注入公告栏所需的CSS样式
 */
function injectAnnouncementStyles() {
  const styleId = 'ext-utils-announcement-styles';
  
  // 检查是否已添加样式
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* 公告栏基础样式 */
    .ext-utils-announcement-bar {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      box-sizing: border-box;
    }
    
    /* 公告栏内容样式 */
    .ext-utils-announcement-bar .announcement-content {
      color: #333;
      line-height: 1.5;
    }
    
    .ext-utils-announcement-bar .announcement-content p {
      margin: 0 0 10px 0;
    }
    
    .ext-utils-announcement-bar .announcement-content p:last-child {
      margin-bottom: 0;
    }
    
    .ext-utils-announcement-bar .announcement-content a {
      color: #3498db;
      text-decoration: none;
    }
    
    .ext-utils-announcement-bar .announcement-content a:hover {
      text-decoration: underline;
    }
    
    /* 公告栏控制按钮样式 */
    .ext-utils-announcement-bar .announcement-close:hover,
    .ext-utils-announcement-bar .announcement-collapse:hover,
    .ext-utils-announcement-bar .announcement-drag-handle:hover {
      color: #333 !important;
    }
    
    /* 公告栏拖动时的样式 */
    .ext-utils-announcement-bar.dragging {
      cursor: grabbing !important;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
    
    /* 公告栏折叠状态样式 */
    .ext-utils-announcement-bar.collapsed {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .ext-utils-announcement-bar.collapsed .announcement-icon {
      font-size: 24px;
      margin: 0;
    }
    
    /* 公告栏响应式样式 */
    @media (max-width: 768px) {
      .ext-utils-announcement-bar {
        width: 90vw !important;
        max-width: 320px;
        font-size: 13px;
      }
    }
    
    /* 公告栏动画效果 */
    @keyframes announcementSlideIn {
      from {
        opacity: 0;
        transform: translateX(100%) scale(0.8);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }
    
    @keyframes announcementSlideOut {
      from {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateX(100%) scale(0.8);
      }
    }
    
    @keyframes announcementPulse {
      0% {
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.08);
      }
      50% {
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2), 0 6px 15px rgba(0, 0, 0, 0.1);
      }
      100% {
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.08);
      }
    }
    
    /* 公告栏类型样式 */
    .ext-utils-announcement-bar.type-info {
      border-left: 4px solid #3498db;
    }
    
    .ext-utils-announcement-bar.type-warning {
      border-left: 4px solid #f39c12;
    }
    
    .ext-utils-announcement-bar.type-success {
      border-left: 4px solid #2ecc71;
    }
    
    .ext-utils-announcement-bar.type-error {
      border-left: 4px solid #e74c3c;
    }
    
    /* 公告栏新消息提示动画 */
    .ext-utils-announcement-bar.new-announcement {
      animation: announcementPulse 2s infinite;
    }
    
    /* 公告栏滚动条样式 */
    .ext-utils-announcement-bar .announcement-content::-webkit-scrollbar {
      width: 6px;
    }
    
    .ext-utils-announcement-bar .announcement-content::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
    }
    
    .ext-utils-announcement-bar .announcement-content::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 3px;
    }
    
    .ext-utils-announcement-bar .announcement-content::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.5);
    }
  `;
  document.head.appendChild(style);
}

// ==================== 自动初始化 ====================
// 使用立即执行异步函数进行初始化
(async () => {
  // 注入公告栏样式
  injectAnnouncementStyles();
  
  // 初始化扩展
  await ExtUtilsInitializer.init();
})();
