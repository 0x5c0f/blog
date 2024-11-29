class SearchManager {
  constructor() {
    this.searchToggle = document.getElementById('search-toggle-desktop');
    this.searchInput = document.getElementById('search-input-desktop');
    this.mask = document.getElementById('mask');
    this.isSearchActive = false;

    document.addEventListener('keydown', this.handleKeydown.bind(this));
    this.searchInput?.addEventListener('focus', () => this.isSearchActive = true);
    this.searchInput?.addEventListener('blur', () => this.isSearchActive = false);
  }

  handleKeydown(event) {
    if (event.key === '/' && document.activeElement !== this.searchInput) {
      event.preventDefault();
      this.searchToggle?.click();
      this.isSearchActive = true;
      this.searchInput?.focus();
    } else if (event.key === 'Escape' && this.isSearchActive) {
      (this.mask || document.body).click();
      this.isSearchActive = false;
      this.searchInput?.blur();
    }
  }
}

// 初始化SearchManager
new SearchManager();


// TODO 翻译功能 
// // 动态加载翻译脚本
// function loadTranslationScript(callback) {
//     const script = document.createElement('script');
//     script.src = 'https://fanyi.51ac.cc/translate.min.js';
//     script.onload = callback; // 脚本加载完成后执行回调
//     document.head.appendChild(script);
// }

// // 添加翻译功能
// function initTranslation() {
//     const menu = document.querySelector("ul.menu");
//     const li = document.createElement("li");
//     const span = document.createElement("span");
//     span.id = "translate";
//     li.className = "menu-item";
//     li.appendChild(span);
//     const targetLi = document.querySelector("li.menu-item.search#search-desktop");
//     // menu.insertBefore(li, targetLi);
//     menu.appendChild(li); // 将翻译按钮添加到菜单的末尾

//     // 设置翻译相关配置
//     translate.language.setLocal("chinese_simplified");
//     translate.service.use("client.edge");
//     translate.selectLanguageTag.languages = "chinese_simplified,chinese_traditional,english,japanese";
//     translate.execute();
// }

// // 在 DOMContentLoaded 事件中加载翻译脚本
// document.addEventListener('DOMContentLoaded', () => {
//     loadTranslationScript(initTranslation);
// });