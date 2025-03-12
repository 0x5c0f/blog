/**
 * 一些自定义的插件，框架通过 cursor 编辑器 gpt-4o-mini 模型创建  
 * @description 当前已有扩展  
 * @description 1. 快捷键绑定  
 * @description 2. 限制特定区域访问单页  
 * @description 3. Vercel Insights 脚本加载
 * @last update: 2025-03-12
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

// 检查并添加 getUserCountry 方法
if (typeof window.ExtUtils.getUserCountry !== 'function') {
  window.ExtUtils.getUserCountry = function(callback) {
      const apiUrl = "https://ipinfo.io/json?token=c9716df22a6255";
      fetch(apiUrl).then(response => {
          if (!response.ok) {
              throw new Error('网络响应失败');
          }
          return response.json();
      }).then(data => {
          if (callback && typeof callback === 'function') {
              callback(data.country);
          }
      }).catch(error => {
          console.error("国家信息请求失败:", error);
          if (callback && typeof callback === 'function') {
              callback(null);
          }
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
      this.restrictedCountries = this.getRestrictedCountries();
  }

  getRestrictedCountries() {
      const areaAccessValidation = document.getElementById('area-restricted');
      return areaAccessValidation ? areaAccessValidation.dataset.restrictedCountries.split(',').map(country => country.trim()) : [];
  }

  checkAccess() {
      window.ExtUtils.getUserCountry((country) => {
          if (country) {
              const areaAccessValidation = document.getElementById('area-restricted');
              if (areaAccessValidation) {
                  if (this.restrictedCountries.includes(country)) {
                      this.displayRestrictionMessage();
                      this.hideTOCContent();
                  }
              }
              if (country !== "CN") {
                  document.querySelectorAll(".footer-line.beian").forEach(function (el) {
                      el.style.display = "none";
                  });
              }
          }
      });
  }

  displayRestrictionMessage() {
      const contentElement = document.getElementById("content");
      if (contentElement) {
          contentElement.innerHTML = `对不起，您所在的区域不允许访问该页面！`;
          contentElement.style.cssText = `
              height: 180px; 
              font-size: 18px; 
              line-height: 1.5; 
              color: #FF0000; 
              border-radius: 12px; 
              box-shadow: 0 2px 8px #D9D7D2; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              text-align: center; 
              padding: 20px; 
              margin: 50px auto; 
              border-radius: 12px;
          `;
      }
  }

  hideTOCContent() {
      const tocAutoElement = document.getElementById("toc-auto");
      if (tocAutoElement) {
          Array.from(tocAutoElement.childNodes).forEach(child => {
              if (child.nodeType === Node.ELEMENT_NODE) {
                  child.style.display = "none";
              }
          });
      }
  }
}

class VercelInsights {
  static init() {
      window.ExtUtils.getUserCountry((country) => {
        console.log('country', country);
        
          if (country !== "CN" && ) {
              window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
              const script = document.createElement("script");
              script.defer = true;
              script.src = "/_vercel/insights/script.js";
              document.head.appendChild(script);
          }
      });
  }
}

(() => {
  if (!window.ExtUtils.isMobile()) {
      KeybindCustom.initKeyBind();
  }

  const accessRestriction = new AccessRestriction();
  document.addEventListener("DOMContentLoaded", () => {
      accessRestriction.checkAccess();
      VercelInsights.init();
  });
})();
