let isSearchActive = false; // 状态变量，跟踪搜索框是否处于活动状态
document.addEventListener('keydown', (event) => {
  const searchToggle = document.getElementById('search-toggle-desktop');
  const searchInput = document.getElementById('search-input-desktop'); // 假设这是搜索输入框的 ID

  if (event.key === '/') {
    // 检查焦点是否在搜索输入框中
    if (document.activeElement !== searchInput) {
      event.preventDefault(); // 防止默认行为
      if (searchToggle) {
        searchToggle.click(); // 模拟点击搜索切换按钮
      }
    }
  }

  if (event.key === 'Escape') {
    const searchToggle = document.getElementById('mask');
    if (searchToggle) {
      searchToggle.click(); // 模拟点击搜索切换按钮以关闭搜索框
    }
  }
});

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