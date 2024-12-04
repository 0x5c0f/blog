let isSearchActive = false; // 状态变量，跟踪搜索框是否处于活动状态
// 添加一个方法来判断是否为移动设备
const isMobileDevice = () => {
  return window.matchMedia('only screen and (max-width: 680px)').matches;
};

document.addEventListener('keydown', (event) => {
  const searchToggle = document.getElementById('search-toggle-desktop');
  const searchInput = document.getElementById('search-input-desktop'); // 假设这是搜索输入框的 ID

  // 使用新定义的方法检查是否为移动设备
  if (isMobileDevice()) {
    return; // 如果是移动设备，直接返回，不执行后续逻辑
  }

  if (event.key === '/') {
    // 检查焦点是否在搜索输入框中
    if (document.activeElement !== searchInput) {
      event.preventDefault(); // 防止默认行为
      if (searchToggle) {
        searchToggle.click(); // 模拟点击搜索切换按钮
        isSearchActive = true; // 更新状态为活动
        searchInput.focus(); // 使搜索输入框获得焦点
      }
    }
  }

  if (event.key === 'Escape') {
    if (isSearchActive) {
      // 模拟点击页面上非搜索框的任意位置以退出搜索
      const mask = document.getElementById('mask'); // 假设有一个遮罩层
      if (mask) {
        mask.click(); // 模拟点击遮罩层
        isSearchActive = false; // 更新状态为非活动
        searchInput.blur(); // 使搜索输入框失去焦点
      }
    }
  }
});

// 监听搜索框的输入事件，重置状态
const searchInput = document.getElementById('search-input-desktop');
if (searchInput) {
  searchInput.addEventListener('focus', () => {
    isSearchActive = true; // 当搜索框获得焦点时，设置为活动状态
  });

  searchInput.addEventListener('blur', () => {
    isSearchActive = false; // 当搜索框失去焦点时，设置为非活动状态
  });
}


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