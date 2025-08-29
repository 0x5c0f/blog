/**
 * 一些自定义的插件，框架通过 Gemini 2.5 Flash 模型创建
 * @description 当前已有扩展
 * @description 1. 快捷键绑定
 * @description 2. 限制特定区域访问单页
 * @description 3. Vercel Insights 脚本加载
 * @last update: 2025-08-08
 */

if (typeof window.ExtUtils === 'undefined') {
  window.ExtUtils = {};
}

// 检查并添加 isMobile 方法
if (typeof window.ExtUtils.isMobile !== 'function') {
  window.ExtUtils.isMobile = function() {
      return window.matchMedia("only screen and (max-width: 680px)").matches;
  };
}

// 检查并添加 getUserCountry 方法 (优化: Promise化和缓存)
if (typeof window.ExtUtils.getUserCountry !== 'function') {
  window.ExtUtils.getUserCountry = function() {
      return new Promise((resolve, reject) => {
          const CACHE_KEY = 'userCountry';
          const CACHE_TIMESTAMP_KEY = 'userCountryTimestamp';
          const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24小时

          const cachedCountry = localStorage.getItem(CACHE_KEY);
          const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
          const now = Date.now();

          if (cachedCountry && cachedTimestamp && (now - parseInt(cachedTimestamp, 10) < ONE_DAY_MS)) {
              // 从缓存返回
              console.debug("ExtUtils: 从缓存加载国家信息");
              resolve(cachedCountry);
              return;
          }

          const apiUrl = "https://ipinfo.io/json?token=c9716df22a6255";
          fetch(apiUrl)
              .then(response => {
                  if (!response.ok) {
                      throw new Error(`网络响应失败: ${response.status}`);
                  }
                  return response.json();
              })
              .then(data => {
                  if (data && data.country) {
                      localStorage.setItem(CACHE_KEY, data.country);
                      localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
                      resolve(data.country);
                  } else {
                      throw new Error("API返回数据不包含国家信息");
                  }
              })
              .catch(error => {
                  console.error("ExtUtils: 国家信息请求失败:", error);
                  reject(null); // 拒绝Promise，但可以传递null表示获取失败
              });
      });
  };
}

class KeybindCustom {
  static initKeyBind() {
      const SEARCH_TOGGLE_ID = "search-toggle-desktop";
      const SEARCH_INPUT_ID = "search-input-desktop";
      let isSearchActive = false;

      const handleKeyDown = (event) => {
          const searchToggle = document.getElementById(SEARCH_TOGGLE_ID);
          const searchInput = document.getElementById(SEARCH_INPUT_ID);

          if (event.key === "/") {
              if (document.activeElement !== searchInput
                  && document.activeElement.tagName !== 'TEXTAREA'
                  && document.activeElement.tagName !== 'INPUT'
                  && document.activeElement.tagName !== 'PRE'
              ) {
                  event.preventDefault();

                  if (searchToggle) {
                      searchToggle.click();
                      isSearchActive = true;
                      searchInput.focus();
                  }
              }
          } else if (event.key === "Escape" && isSearchActive) {
              const mask = document.getElementById("mask");
              if (mask) {
                  mask.click();
                  isSearchActive = false;
                  searchInput.blur();
              }
          }
      };

      document.addEventListener("keydown", handleKeyDown);

      const searchInput = document.getElementById(SEARCH_INPUT_ID);
      if (searchInput) {
          const handleFocus = () => isSearchActive = true;
          const handleBlur = () => isSearchActive = false;

          searchInput.addEventListener("focus", handleFocus);
          searchInput.addEventListener("blur", handleBlur);
      }
  }
}

class AccessRestriction {
  constructor() {
      // 在构造函数中获取并存储引用
      this.areaAccessValidation = document.getElementById('area-restricted');
      this.restrictedCountries = this.areaAccessValidation ?
          this.areaAccessValidation.dataset.restrictedCountries.split(',').map(country => country.trim()) :
          [];
      this.contentElement = document.getElementById("content");
      this.tocAutoElement = document.getElementById("toc-auto");
  }

  // 优化: 接受国家参数
  checkAccess(country) {
      if (country) {
          if (this.areaAccessValidation) {
              if (this.restrictedCountries.includes(country)) {
                  this.displayRestrictionMessage();
                  this.hideTOCContent();
              }
          }
          // 隐藏备案信息
          if (country !== "CN") {
              document.querySelectorAll(".footer-line.beian").forEach(function (el) {
                  el.style.display = "none";
              });
          }
      }
  }

  // 美化: 恢复内联样式，使用柔和的颜色和动画，并优化PC端显示
  displayRestrictionMessage() {
      if (this.contentElement) {
          // 初始设置透明度为0，为淡入动画做准备
          this.contentElement.style.opacity = '0';

          // 更结构化的内容，包含图标、主标题和副标题
          this.contentElement.innerHTML = `
              <div style="font-size: 1.5em; margin-bottom: 20px; color: #7f8c8d;">🚫</div>
              <p style="margin: 0; font-size: 1.4em; font-weight: 600; color: #34495e;">对不起，您所在的区域不允许访问该页面！</p>
              <p style="margin-top: 15px; font-size: 1em; color: #95a5a6;">请联系管理员以获取更多信息访问权限。</p>
          `;

          // 应用美化后的内联样式
          this.contentElement.style.cssText = `
              min-height: 180px; /* 增加最小高度 */
              font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; /* 现代字体栈 */
              background-color: #F8F8F8; /* 柔和的浅灰色背景 */
              border: 1px solid #bdc3c7; /* 柔和的边框 */
              border-radius: 20px; /* 更大的圆角 */
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1); /* 更柔和的阴影 */
              display: flex;
              flex-direction: column; /* 垂直堆叠内容 */
              justify-content: center;
              align-items: center;
              text-align: center;
              padding: 40px; /* 调整内边距，PC端可能更协调 */
              margin: 60px auto; /* 调整外边距，PC端可能看起来更高一些 */
              max-width: min(85vw, 900px); /* 响应式最大宽度：视口宽度的85%或最大900px */
              box-sizing: border-box; /* 确保内边距和边框包含在元素总尺寸内 */
              transition: opacity 0.8s ease-out; /* 淡入动画效果 */
              /* 初始 opacity 为 0，会在 setTimeout 中设置为 1 */
          `;

          // 延迟设置透明度为1，触发淡入动画
          setTimeout(() => {
              this.contentElement.style.opacity = '1';
          }, 100); // 短暂延迟，确保样式应用后再触发动画
      }
  }

  hideTOCContent() {
      if (this.tocAutoElement) {
          Array.from(this.tocAutoElement.childNodes).forEach(child => {
              if (child.nodeType === Node.ELEMENT_NODE) {
                  child.style.display = "none";
              }
          });
      }
  }
}

class VercelInsights {
  // 优化: 接受国家参数，避免重复加载
  static init(country) {
    if (country && country !== "CN") {
        window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
        const script = document.createElement("script");
        script.defer = true;
        script.src = "/_vercel/insights/script.js";
        document.head.appendChild(script);
    }
  }
}

// 整体初始化逻辑 (优化: 使用async/await统一获取国家信息)
(async () => {
  if (!window.ExtUtils.isMobile()) {
      KeybindCustom.initKeyBind();
  }

  // 等待DOM内容完全加载
  await new Promise(resolve => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve);
    } else {
      resolve();
    }
  });

  let userCountry = null;
  try {
      userCountry = await window.ExtUtils.getUserCountry(); // 一次性获取国家信息
  } catch (error) {
      console.error("初始化: 获取用户国家信息失败:", error);
  }

  const accessRestriction = new AccessRestriction();
  accessRestriction.checkAccess(userCountry);

  // fix: vercel 统计兼容
  VercelInsights.init(userCountry);
})();
