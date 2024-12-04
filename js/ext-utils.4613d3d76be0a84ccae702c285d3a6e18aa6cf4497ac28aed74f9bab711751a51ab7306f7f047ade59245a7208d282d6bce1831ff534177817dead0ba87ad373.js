class ExtUtils {
  static isMobileDevice() {
    return window.matchMedia("only screen and (max-width: 680px)").matches;
  }
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

class TranslationPlugin {
  constructor() {
    this.translationLoaded = false;
  }

  loadTranslationScript(callback) {
    if (!this.translationLoaded) {
      const script = document.createElement("script");
      script.src = "https://fanyi.51ac.cc/translate.min.js";
      script.onload = () => {
        this.translationLoaded = true;
        callback();
      };
      script.onerror = () => {
        console.error("Failed to load translation script.");
        // 可以在此处增加用户反馈，例如通知提示
      };
      document.head.appendChild(script);
    } else {
      callback();
    }
  }

  initTranslation() {
    const menu = document.querySelector("ul.menu");
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.id = "translate";
    li.className = "menu-item";
    li.appendChild(span);
    
    const targetLi = document.querySelector("li.menu-item.search#search-desktop");
    menu.appendChild(li); // 可考虑在特定位置插入

    // 设置翻译相关配置
    translate.language.setLocal("chinese_simplified");
    translate.service.use("client.edge");
    translate.selectLanguageTag.languages = "chinese_simplified,chinese_traditional,english,japanese";
    translate.execute();
  }

  start() {
    document.addEventListener("DOMContentLoaded", () => {
      this.loadTranslationScript(() => {
        this.initTranslation();
      });
    });
  }
}

(() => {
  if (!ExtUtils.isMobileDevice()) {
    KeybindCustom.initKeyBind();
    const translationPlugin = new TranslationPlugin();
    translationPlugin.start();
  }
})();
