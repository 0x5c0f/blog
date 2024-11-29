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
    if (searchToggle && searchToggle.classList.contains('active')) {
      // 模拟点击页面上非搜索框的任意位置以退出搜索
      const mask = document.getElementById('mask'); // 假设有一个遮罩层
      if (mask) {
        mask.click(); // 模拟点击遮罩层
      } else {
        // 如果没有遮罩层，可以直接触发点击事件
        document.body.click(); // 或者点击 body
      }
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