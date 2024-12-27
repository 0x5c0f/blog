/**
 * 一些自定义的插件，框架通过 cursor 编辑器 gpt-4o-mini 模型创建  
 * @author 0x5c0f
 * @description 当前已有扩展  
 * @description 1. 快捷键绑定  
 * @description 2. 限制特定区域访问单页  
 * @last update: 2024-12-24  
 */

if ( typeof window.ExtUtils === 'undefined' ) {
    window.ExtUtils = class {
        static isMobile() {
            return window.matchMedia("only screen and (max-width: 680px)").matches;
        }
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
        if (document.activeElement !== searchInput) {
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
      this.apiUrl = "https://ipinfo.io/json?token=c9716df22a6255"; // IP信息API地址
      this.restrictedCountries = this.getRestrictedCountries(); // 从标签中获取限制访问的国家代码
  }

  getRestrictedCountries() {
      const areaAccessValidation = document.getElementById('area-restricted');
      return areaAccessValidation ? areaAccessValidation.dataset.restrictedCountries.split(',').map(country => country.trim()) : []; // 获取标签的data属性并返回数组
  }

  checkAccess() {
      try {
        fetch(this.apiUrl).then(response => {
          if (!response.ok) {
              throw new Error('网络响应失败');
          }
          return response.json();
        }).then(data => {
          const areaAccessValidation = document.getElementById('area-restricted');
          if (areaAccessValidation) {
            if (this.restrictedCountries.includes(data.country)) {
                this.displayRestrictionMessage();
                this.hideTOCContent();
            }
          }
          if (data.country !== "CN") {
            document.querySelectorAll(".footer-line.beian").forEach(function (el) {
                el.style.display = "none";
            });
          }
        }).catch(error => {
          console.error("状态请求失败:", error);
        });
      } catch (error) {
          console.error("访问检查过程中发生错误:", error);
      }
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
          // border: 0.1px solid #D9D7D2;
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

(() => {
  if (!window.ExtUtils.isMobile()) {
    KeybindCustom.initKeyBind();
  }

  // <span id="area-restricted" data-restricted-countries="CN,US,FR" style="display: none;"></span>
  const accessRestriction = new AccessRestriction();
    document.addEventListener("DOMContentLoaded", () => {
      accessRestriction.checkAccess();
    });
})();