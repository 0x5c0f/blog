/**
 * 全局公告栏配置
 * 这个文件定义了在整个博客中显示的公告栏
 * 修改这里的配置即可更新全站的公告栏内容
 */

window.GLOBAL_ANNOUNCEMENT = {
  id: "site-global-announcement",
  title: "🎉 网站公告",
  content: `
    <p>欢迎访问我的博客！</p>
    <p>这里是一个功能丰富的公告栏系统，支持：</p>
    <ul>
      <li>✅ 全站显示</li>
      <li>🎨 美观的设计</li>
      <li>🖱️ 可拖动位置</li>
      <li>📱 响应式布局</li>
      <li>⏰ 支持过期时间</li>
      <li>🔔 多种类型选择</li>
    </ul>
    <p>试试拖动我、折叠我或关闭我！</p>
  `,
  expiryDate: "2025-12-31",
  position: "top-right",
  type: "info",
  closable: true,
  draggable: true,
  autoHide: 0
};