# FixIt主题接入Pagefind原生搜索


`FixIt` 在保持原有搜索能力的基础上，支持将 [`Pagefind`](https://pagefind.app/) 作为原生搜索引擎使用。该方案适用于静态部署场景，能够在不依赖第三方搜索服务的前提下提供较完整的全文检索能力。

本文用于说明 `Pagefind` 原生搜索的配置方式、构建流程与当前能力边界。

## 1. 启用方式

启用 `Pagefind` 搜索时，可按如下方式配置：

```toml
[params.search]
enable = true
type = "pagefind"
placeholder = ""
maxResultLength = 10
snippetLength = 30
highlightTag = "em"

[params.search.pagefind]
bundlePath = "pagefind/"
debounceTimeoutMs = 300
useBuiltInFilters = true
sortBy = ""
sortOrder = "desc"
```

### 1.1. 参数说明

- `params.search.type`
  - 设为 `pagefind` 后，主题将启用原生 `Pagefind` 搜索分支。
- `params.search.snippetLength`
  - 用于控制搜索结果摘要长度。
  - 当前实现直接复用该参数，不再额外引入重复的摘要长度配置。
- `params.search.pagefind.bundlePath`
  - `Pagefind` 索引资源目录路径。
  - 默认值为 `pagefind/`，按站点基路径解析，适用于根路径与子路径部署。
- `params.search.pagefind.debounceTimeoutMs`
  - 输入防抖时间，单位毫秒。
  - 设为 `0` 时表示关闭防抖。
- `params.search.pagefind.useBuiltInFilters`
  - 是否遵循主题内置的搜索可见性规则。
  - 当前实现会自动排除以下页面内容：
    - `hiddenFromSearch = true`
    - 设置了 `password`
- `params.search.pagefind.sortBy`
  - 排序字段。
  - 当前稳定支持的内置值仅为 `date`
  - 留空表示不启用排序
- `params.search.pagefind.sortOrder`
  - 可选值为 `asc` 或 `desc`

## 2. 构建方式

`Pagefind` 与 `Fuse.js` 不同，它不是仅靠前端配置即可直接使用的搜索方案。

在完成 Hugo 构建后，还需要额外执行一次索引生成：

```bash
hugo --gc --minify
pagefind --site public
```

如果站点构建输出目录不是 `public`，则将 `public` 替换为实际目录即可。

例如：

```bash
pagefind --site docs
```

## 3. 搜索范围

当前实现不会将整个页面外壳直接纳入索引，而是仅标记正文链路中的关键内容：

- 文章标题
- 正文内容容器

这样处理的目的主要有两点：

1. 避免导航、页脚、分页、外围提示等无关内容进入索引  
2. 使搜索结果摘要尽量贴近正文内容本身

## 4. 排序能力

当前原生支持保留了一个较克制的排序配置：

```toml
[params.search.pagefind]
sortBy = "date"
sortOrder = "desc"
```

当前 `sortBy` 的支持范围如下：

- `""`
  - 不启用排序
- `"date"`
  - 按页面日期排序

其他字段当前不作为主题原生稳定能力提供（主题目前只统一输出了 `date` 的排序元数据，其他字段尚未建立一致的索引标记与兼容约定）。

这里有一个需要明确的边界：

`Pagefind` 的查询排序不是多条件联合排序，而是单字段排序。因此配置上采用了：

- `sortBy`
- `sortOrder`

这种形式语义更直接，也更符合主题原生参数的表达方式。

## 5. 关于子路径部署

如果站点部署在子路径下，例如：

```text
https://example.com/blog/
```

则不应将 `bundlePath` 简单写死为：

```toml
bundlePath = "/pagefind/"
```

否则前端会尝试请求域名根路径下的：

```text
/pagefind/pagefind.js
```

从而导致子路径部署失效。

推荐配置如下：

```toml
bundlePath = "pagefind/"
```

当前实现会按站点基路径归一化该路径，因此：

- 根路径部署可用
- 子路径部署也可用

## 6. 当前配置取舍

为了保持 `FixIt` 原生搜索配置的简洁性，当前实现没有继续开放过多底层高级参数，例如：

- `filters`
- `ranking`
- `indexWeight`
- `mergeFilter`
- `highlightParam`

当前保留的能力，主要集中在主题层价值明确且维护成本可控的部分：

- 原生搜索接入
- 构建后索引生成
- 摘要长度复用
- 内置可见性过滤
- 按日期排序
- 子路径部署兼容

## 7. 注意事项

- 启用 `Pagefind` 后，构建阶段出现相关提醒是正常行为。
- 该提醒用于提示站点在 Hugo 构建完成后仍需执行 `pagefind --site <publicDir>`。
- 即使索引目录已经存在，也不代表当前索引一定与最新构建内容同步，因此该提醒默认不会自动消失。

## 8. 小结

对于偏静态部署、希望减少外部服务依赖的站点，`Pagefind` 是一个适合 `FixIt` 的原生搜索方案。

当前实现遵循以下原则：

- 尽量复用主题已有搜索参数
- 只增加少量真正必要的 `pagefind` 参数
- 不引入组件式补丁逻辑
- 保持对子路径部署和现有页面可见性规则的兼容


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/hugo/fixit%E4%B8%BB%E9%A2%98%E6%8E%A5%E5%85%A5pagefind%E5%8E%9F%E7%94%9F%E6%90%9C%E7%B4%A2/  

