# 公告栏功能使用示例


# 公告栏功能使用示例

本文展示了如何在Hugo博客中使用新增的公告栏功能。

## 全局配置方式（推荐）

要在整个博客的所有页面显示公告栏，可以在任何JavaScript文件或页面的`<script>`标签中设置全局配置：

```javascript
<script>
window.GLOBAL_ANNOUNCEMENT = {
  id: "global-welcome",
  title: "欢迎公告",
  content: "欢迎使用我们的网站！这是一个功能丰富的公告栏系统，会在所有页面显示。",
  expiryDate: "2025-12-31",
  position: "top-right",
  type: "info",
  closable: true,
  draggable: true,
  autoHide: 0
};
</script>
```

### 全局配置的优势

1. **全站显示**：在所有页面都会显示公告栏
2. **集中管理**：只需在一个地方配置，即可影响整个网站
3. **动态更新**：可以通过JavaScript动态修改公告内容
4. **无需修改Markdown**：不需要在每个Markdown文件中添加HTML

## 页面特定配置方式

如果只需要在特定页面显示公告栏，可以在Markdown文件中添加以下HTML代码：

```html
<div id="announcement"
     data-id="welcome"
     data-title="欢迎公告"
     data-content="欢迎使用我们的网站！这是一个功能丰富的公告栏系统。"
     data-expiry-date="2025-12-31"
     data-position="top-right"
     data-type="info"
     data-closable="true"
     data-draggable="true"
     data-auto-hide="0"
     style="display:none;">
</div>
```

## 配置参数说明

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `id` | 否 | "default" | 公告唯一标识符，用于记录用户关闭状态 |
| `title` | 否 | "公告" | 公告标题 |
| `content` | 是 | - | 公告内容，支持HTML |
| `expiry-date` | 否 | null | 公告过期日期，格式：YYYY-MM-DD |
| `position` | 否 | "top-right" | 公告位置：top-right, top-left, bottom-right, bottom-left |
| `type` | 否 | "info" | 公告类型：info, warning, success, error |
| `closable` | 否 | "true" | 是否可关闭 |
| `draggable` | 否 | "true" | 是否可拖动 |
| `auto-hide` | 否 | "0" | 自动隐藏时间（秒），0表示不自动隐藏 |

## 不同类型的公告栏

### 信息公告
```html
<div id="announcement" 
     data-id="info-example" 
     data-title="系统通知" 
     data-content="系统将于今晚22:00进行维护，预计持续2小时。" 
     data-type="info" 
     style="display:none;">
</div>
```

### 警告公告
```html
<div id="announcement" 
     data-id="warning-example" 
     data-title="重要提醒" 
     data-content="请注意，您的密码将在7天后过期，请及时更新。" 
     data-type="warning" 
     style="display:none;">
</div>
```

### 成功公告
```html
<div id="announcement" 
     data-id="success-example" 
     data-title="更新成功" 
     data-content="恭喜！网站已成功升级到最新版本。" 
     data-type="success" 
     style="display:none;">
</div>
```

### 错误公告
```html
<div id="announcement" 
     data-id="error-example" 
     data-title="服务异常" 
     data-content="部分功能暂时不可用，我们正在紧急修复中。" 
     data-type="error" 
     style="display:none;">
</div>
```

## 高级功能

### 带过期时间的公告
```html
<div id="announcement" 
     data-id="limited-time" 
     data-title="限时活动" 
     data-content="双11特惠活动进行中，全场商品8折优惠！" 
     data-expiry-date="2025-11-30" 
     data-type="warning" 
     style="display:none;">
</div>
```

### 自动隐藏的公告
```html
<div id="announcement" 
     data-id="auto-hide" 
     data-title="快速提示" 
     data-content="这是一个10秒后自动消失的提示信息。" 
     data-auto-hide="10" 
     data-type="info" 
     style="display:none;">
</div>
```

### 不同位置的公告

#### 左上角
```html
<div id="announcement" 
     data-id="top-left" 
     data-title="左上角公告" 
     data-content="这个公告显示在左上角。" 
     data-position="top-left" 
     style="display:none;">
</div>
```

#### 右下角
```html
<div id="announcement" 
     data-id="bottom-right" 
     data-title="右下角公告" 
     data-content="这个公告显示在右下角。" 
     data-position="bottom-right" 
     style="display:none;">
</div>
```

#### 左下角
```html
<div id="announcement" 
     data-id="bottom-left" 
     data-title="左下角公告" 
     data-content="这个公告显示在左下角。" 
     data-position="bottom-left" 
     style="display:none;">
</div>
```

## 功能特性

1. **美观设计**：现代化的UI设计，支持毛玻璃效果和平滑动画
2. **响应式布局**：自动适配不同屏幕尺寸
3. **拖动功能**：支持鼠标和触摸拖动，可自由调整位置
4. **折叠功能**：可折叠为小图标，节省屏幕空间
5. **状态记忆**：记住用户关闭的公告，避免重复显示
6. **过期控制**：支持设置公告过期时间
7. **自动隐藏**：可设置自动隐藏时间
8. **多种类型**：支持信息、警告、成功、错误四种类型
9. **位置灵活**：支持四个角落的位置选择

## 注意事项

1. 每个页面只能有一个公告栏，如果需要多个公告，请使用不同的ID
2. 公告内容支持HTML，但请注意安全性
3. 过期日期格式必须为YYYY-MM-DD
4. 移动设备上拖动功能可能略有不同
5. 公告栏状态存储在浏览器的localStorage中

## 实际示例

下面是一个完整的公告栏示例，包含了所有功能：

```html
<div id="announcement" 
     data-id="full-featured" 
     data-title="功能演示" 
     data-content="<p>这是一个功能完整的公告栏示例：</p><ul><li>✅ 支持HTML内容</li><li>🎨 美观的设计</li><li>🖱️ 可拖动位置</li><li>📱 响应式布局</li><li>⏰ 支持过期时间</li><li>🔔 多种类型选择</li></ul><p>试试拖动我、折叠我或关闭我！</p>" 
     data-expiry-date="2025-12-31" 
     data-position="top-right" 
     data-type="info" 
     data-closable="true" 
     data-draggable="true" 
     data-auto-hide="0" 
     style="display:none;">
</div>
```

将上述代码添加到任何Markdown页面的顶部或底部，即可在页面加载时显示公告栏。

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/%E5%85%AC%E5%91%8A%E6%A0%8F%E4%BD%BF%E7%94%A8%E7%A4%BA%E4%BE%8B/  

