# Nginx进阶


# server_name 匹配顺序 
1. 精确匹配
2. `*`在前的范域名
3. `*`在后的范域名
4. 按文件中的顺序匹配正则表达式域名 
5. `default server` 指定的值进行匹配
    - 未指定时，第一个就是`default server`
    - 通过`listen`指定`default`

# http 请求处理时的11个阶段
| 阶段名称         | 所处模块                             | 描述 |
| ---------------- | ------------------------------------ | ---- |
| `POST_READ`      | `realip`                             |      |
| `SERVER_REWRITE` | `rewrite`                            |      |
| `FIND_CONFIG`    |                                      |      |
| `REWRITE`        | `rewrite`                            |      |
| `POST_REWRITE`   |                                      |      |
| `PREACCESS`      | `limit_conn`,`limit_req`             |      |
| `ACCESS`         | `auth_basic`,`access`,`auth_request` |      |
| `POST_ACCESS`    |                                      |      |
| `PRECONTENT`     | `try_files`                          |      |
| `CONTENT`        | `index`,`autoindex`,`concat`         |      |
| `LOG`            | `access_log`                         |      |

# 11个请求阶段的顺序 



# rewrite 指令
|            |                                     |
| ---------- | ----------------------------------- |
| `Syntax:`  | `rewrite regex replacement [flag];` |
| `Default:` | `-`                                 |
| `Context:` | `server,location,if`                |
- 将`regex`指定的`url`替换成`replacement`这个新的`url`(可以使用正则表达式及变量提取)
- 当`replacement`以`http://`或者`https://`或者`$schema`开头，则直接返回`302`重定向 
- 替换后的`url`根据`flag`指定的方式进行处理
    - `--last:` 用`replacement` 这个`URI`进行新的`location`匹配
    - `--break:` `break`指令停止当前脚本指令的执行，等价于独立的`break`指令
    - `--redirect:` 返回302重定向
    - `--permanent:` 返回301重定向


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/nginx%E8%BF%9B%E9%98%B6/  

