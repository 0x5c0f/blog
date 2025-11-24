/**
 * 一些自定义的插件，框架通过 Gemini 2.5 Flash 模型创建
 * @description 当前已有扩展
 * @description 1. 快捷键绑定
 * @description 2. 限制特定区域访问单页
 * @description 3. Vercel Insights 脚本加载
 * @last update: 2025-08-08
 * @version 2.0.0 优化版本
 */

// ==================== 配置常量 ====================
const CONFIG = {
  // 移动设备检测断点
  MOBILE_BREAKPOINT: 680,
  
  // 缓存配置
  CACHE: {
    COUNTRY_KEY: 'userCountry',
    COUNTRY_TIMESTAMP_KEY: 'userCountryTimestamp',
    EXPIRY_MS: 24 * 60 * 60 * 1000, // 24小时
  },
  
  // API配置
  API: {
    IPINFO_URL: 'https://ipinfo.io/json?token=c9716df22a6255',
    TIMEOUT_MS: 5000,
    RETRY_COUNT: 2,
    RETRY_DELAY_MS: 1000,
  },
  
  // DOM元素ID
  DOM_IDS: {
    SEARCH_TOGGLE: 'search-toggle-desktop',
    SEARCH_INPUT: 'search-input-desktop',
    MASK: 'mask',
    CONTENT: 'content',
    TOC_AUTO: 'toc-auto',
    AREA_RESTRICTED: 'area-restricted',
  },
  
  // 样式配置
  STYLES: {
    RESTRICTION_MESSAGE: {
      minHeight: '180px',
      fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
      backgroundColor: '#F8F8F8',
      border: '1px solid #bdc3c7',
      borderRadius: '20px',
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
      padding: '40px',
      margin: '60px auto',
      maxWidth: 'min(85vw, 900px)',
      transition: 'opacity 0.8s ease-out',
    },
  },
  
  // 国家代码
  COUNTRIES: {
    CHINA: 'CN',
  },
  
  // 调试配置
  DEBUG: {
    ENABLED: true,
    PREFIX: 'ExtUtils:',
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
      const accessRestriction = new AccessRestriction();
      accessRestriction.checkAccess(userCountry);

      // 5. 初始化Vercel Insights
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

// ==================== 自动初始化 ====================
// 使用立即执行异步函数进行初始化
(async () => {
  await ExtUtilsInitializer.init();
})();
