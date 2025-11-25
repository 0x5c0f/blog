# AI创作内容声明组件



# 1. 本文使用 `custom-post__content:before` 自定义块实现
## 1.1. 文章页内容前自定义块	 
```go
// 代码位置: layouts/partials/extended/ai-declaration.html

{{- /* 
配置优先级：
1. 页面 Front Matter (.Params.aiDeclaration)
2. 全局配置 (site.Params.page.aiDeclaration)
3. 内置默认值
*/ -}}

{{- /* 获取页面级配置 */ -}}
{{- $pageConfig := .Params.aiDeclaration -}}

{{- /* 获取全局配置 */ -}}
{{- $globalConfig := site.Params.page.aiDeclaration -}}

{{- /* 合并配置：页面配置优先，未设置的使用全局配置 */ -}}
{{- $enable := false -}}
{{- $description := "" -}}
{{- $url := "" -}}

{{- if $pageConfig -}}
  {{- /* 页面有配置，使用页面的 enable */ -}}
  {{- $enable = $pageConfig.enable -}}
  {{- /* description 优先级：页面 > 全局 > 默认 */ -}}
  {{- $description = $pageConfig.description | default $globalConfig.description | default "本文使用 AI 工具辅助创作，内容已经人工审核。" -}}
  {{- /* url 优先级：页面 > 全局 */ -}}
  {{- $url = $pageConfig.url | default $globalConfig.url -}}
{{- else if $globalConfig -}}
  {{- /* 页面无配置，使用全局配置 */ -}}
  {{- $enable = $globalConfig.enable -}}
  {{- $description = $globalConfig.description | default "本文使用 AI 工具辅助创作，内容已经人工审核。" -}}
  {{- $url = $globalConfig.url -}}
{{- end -}}

{{- /* 只有 enable 为 true 时才显示组件 */ -}}
{{- if $enable -}}
<div class="ai-declaration" data-expanded="false">
  <div class="ai-declaration-header" onclick="this.parentElement.dataset.expanded = this.parentElement.dataset.expanded === 'false' ? 'true' : 'false'">
    <svg class="ai-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="ai-declaration-text">{{ T "aiDeclaration" | default "作者声明：内容由AI辅助创作" }}</span>
    <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
  
  <div class="ai-declaration-content">
    {{- if $description -}}
    <div class="ai-detail-item">
      <svg class="detail-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span class="ai-value">{{ $description | markdownify }}</span>
    </div>
    {{- end -}}
    
    {{- if $url -}}
    <div class="ai-detail-item ai-link-item">
      <svg class="detail-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 13C10.4295 13.5741 10.9774 14.0492 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9404 15.7513 14.6898C16.4231 14.4392 17.0331 14.0471 17.54 13.54L20.54 10.54C21.4508 9.59699 21.9548 8.33397 21.9434 7.02299C21.932 5.71201 21.4061 4.45794 20.4791 3.5309C19.5521 2.60386 18.298 2.07802 16.987 2.06663C15.676 2.05524 14.413 2.55921 13.47 3.47L11.75 5.18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 11C13.5705 10.4259 13.0226 9.95084 12.3934 9.60707C11.7642 9.26331 11.0685 9.05889 10.3533 9.00769C9.63819 8.95649 8.92037 9.05963 8.24861 9.31022C7.57685 9.56081 6.96689 9.9529 6.45996 10.46L3.45996 13.46C2.54917 14.403 2.04519 15.666 2.05659 16.977C2.06798 18.288 2.59382 19.5421 3.52086 20.4691C4.4479 21.3961 5.70197 21.922 7.01295 21.9334C8.32393 21.9448 9.58694 21.4408 10.53 20.53L12.24 18.82" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <a href="{{ $url }}" target="_blank" rel="noopener noreferrer" class="ai-link">
        {{ T "aiDeclarationMore" | default "查看详细说明" }}
        <svg class="external-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11M15 3H21M21 3V9M21 3L10 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    </div>
    {{- end -}}
  </div>
</div>
{{- end -}}
```

## 1.2. 相关样式
```css
/* 代码位置: assets/css/_custom.scss */

/* ============================================
   AI 声明组件样式 - FixIt 主题定制 start
   ============================================ */

.ai-declaration {
  position: relative;
  margin: 0 0 1.5rem 0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* 浅色模式 */
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
  border: 1px solid rgba(99, 102, 241, 0.2);
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.1);
  
  /* 深色模式 */
  [theme='dark'] & {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    border: 1px solid rgba(99, 102, 241, 0.3);
    box-shadow: 0 1px 3px rgba(99, 102, 241, 0.2);
  }
}

/* 头部区域 */
.ai-declaration-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  
  /* 浅色模式 */
  color: #4338ca;
  
  /* 深色模式 */
  [theme='dark'] & {
    color: #818cf8;
  }
  
  &:hover {
    background: rgba(99, 102, 241, 0.08);
    
    [theme='dark'] & {
      background: rgba(99, 102, 241, 0.15);
    }
  }
  
  &:active {
    transform: scale(0.99);
  }
}

/* AI 图标 */
.ai-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  
  /* 浅色模式 */
  color: #6366f1;
  
  /* 深色模式 */
  [theme='dark'] & {
    color: #818cf8;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* 声明文本 */
.ai-declaration-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.5;
}

/* 箭头图标 */
.arrow-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* 浅色模式 */
  color: #6366f1;
  opacity: 0.6;
  
  /* 深色模式 */
  [theme='dark'] & {
    color: #818cf8;
    opacity: 0.7;
  }
}

.ai-declaration[data-expanded="true"] .arrow-icon {
  transform: rotate(180deg);
}

/* 内容区域 */
.ai-declaration-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              padding 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s ease;
  padding: 0 16px;
  opacity: 0;
  
  /* 浅色模式 */
  color: #374151;
  background: rgba(255, 255, 255, 0.6);
  
  /* 深色模式 */
  [theme='dark'] & {
    color: #d1d5db;
    background: rgba(0, 0, 0, 0.2);
  }
}

.ai-declaration[data-expanded="true"] .ai-declaration-content {
  max-height: 500px;
  padding: 16px;
  opacity: 1;
  border-top: 1px solid rgba(99, 102, 241, 0.15);
  
  [theme='dark'] & {
    border-top-color: rgba(99, 102, 241, 0.25);
  }
}

/* 详情项 */
.ai-detail-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
  line-height: 1.6;
  font-size: 14px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

/* 详情图标 */
.detail-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 2px;
  
  /* 浅色模式 */
  color: #6366f1;
  opacity: 0.8;
  
  /* 深色模式 */
  [theme='dark'] & {
    color: #818cf8;
    opacity: 0.9;
  }
}

/* 详情值 */
.ai-value {
  flex: 1;
  
  /* 浅色模式 */
  color: #1f2937;
  
  /* 深色模式 */
  [theme='dark'] & {
    color: #e5e7eb;
  }
  
  p {
    margin: 0;
    line-height: 1.6;
    
    &:not(:last-child) {
      margin-bottom: 0.5em;
    }
  }
  
  code {
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.9em;
    
    /* 浅色模式 */
    background: rgba(99, 102, 241, 0.1);
    color: #4338ca;
    
    /* 深色模式 */
    [theme='dark'] & {
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
    }
  }
}

/* 链接项 */
.ai-link-item {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px dashed rgba(99, 102, 241, 0.2);
  
  [theme='dark'] & {
    border-top-color: rgba(99, 102, 241, 0.3);
  }
}

/* AI 链接 */
.ai-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  
  /* 浅色模式 */
  color: #6366f1;
  
  /* 深色模式 */
  [theme='dark'] & {
    color: #818cf8;
  }
  
  &:hover {
    /* 浅色模式 */
    color: #4338ca;
    text-decoration: underline;
    
    /* 深色模式 */
    [theme='dark'] & {
      color: #a5b4fc;
    }
    
    .external-icon {
      transform: translate(2px, -2px);
    }
  }
  
  &:active {
    transform: scale(0.98);
  }
}

/* 外部链接图标 */
.external-icon {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ai-declaration {
    margin: 0 0 1rem 0;
    border-radius: 8px;
  }
  
  .ai-declaration-header {
    padding: 10px 14px;
  }
  
  .ai-declaration-text {
    font-size: 13px;
  }
  
  .ai-detail-item {
    font-size: 13px;
    gap: 8px;
  }
  
  .detail-icon {
    width: 16px;
    height: 16px;
  }
}

/* 超小屏幕 */
@media (max-width: 480px) {
  .ai-declaration-header {
    gap: 8px;
  }
  
  .ai-icon {
    width: 18px;
    height: 18px;
  }
  
  .arrow-icon {
    width: 16px;
    height: 16px;
  }
}

/* 打印样式 */
@media print {
  .ai-declaration {
    border: 1px solid #d1d5db !important;
    background: #f9fafb !important;
    page-break-inside: avoid;
    box-shadow: none !important;
  }
  
  .ai-declaration-content {
    max-height: none !important;
    padding: 16px !important;
    display: block !important;
    opacity: 1 !important;
    border-top: 1px solid #e5e7eb !important;
  }
  
  .arrow-icon {
    display: none;
  }
  
  .ai-link {
    color: #4338ca !important;
    
    &::after {
      content: " (" attr(href) ")";
      font-size: 0.85em;
      color: #6b7280;
    }
  }
  
  .external-icon {
    display: none;
  }
}

/* 减少动画 */
@media (prefers-reduced-motion: reduce) {
  .ai-declaration,
  .ai-declaration-content,
  .arrow-icon,
  .ai-link,
  .external-icon,
  .ai-icon {
    transition: none !important;
    animation: none !important;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .ai-declaration {
    border-width: 2px;
  }
  
  .ai-declaration-header {
    font-weight: 600;
  }
  
  .ai-link {
    text-decoration: underline;
  }
}

/* ============================================
   AI 声明组件样式 - FixIt 主题定制 end
   ============================================ */

```

## 1.3. `config.toml` 和 `页面配置`方法
- `config.toml` 配置
    ```toml {data-open=false}
    # docs: https://fixit.lruihao.cn/zh-cn/references/blocks/
    [params.customPartials]
        postContentBefore = ["extended/ai-declaration.html"]
    
    [params.page.aiDeclaration]
        enable = false      # 默认 false
        description = ""    # 额外增加的说明字段, 默认 "本文使用 AI 工具辅助创作，内容已经人工审核。", 支持markdown
        url = ""            # 对话共享连接(也许还有其他作用?)
    ```

- `页面配置`方法
    ```md {data-open=false}
    --- 
    # 文章是否由AI生成
    aiDeclaration:
        enable: true
        description: |
            本文使用 **Claude 3.5 Sonnet** 辅助完成：
            - 文章结构规划
            - 代码示例生成
            - 技术细节解释优化
        
            所有代码均经过实际测试验证。
        url: https://claude.ai/
    ---
    ```


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/hugo/ai%E5%88%9B%E4%BD%9C%E5%86%85%E5%AE%B9%E5%A3%B0%E6%98%8E%E7%BB%84%E4%BB%B6/  

