# Php运维故障记录


# 1. PHP message: PHP Fatal error:  Allowed memory size of 134217728 bytes exhausted, 修改 php.ini  
```ini 
 # memory_limit = 128M # 默认
 # memory_limit = -1 # 代表无限制
  memory_limit = 256M
 # 一个线程的最大内存使用量，即一个Web请求可使用的PHP内存量。
 # 完成后重启nginx即可
```
# 2. request_terminate_timeout的值如果设置为0或者过长的时间，可能会引起file_get_contents的资源问题。 
> [http://www.cnblogs.com/argb/p/3604340.html](http://www.cnblogs.com/argb/p/3604340.html)

如果`file_get_contents`请求的远程资源如果反应过慢，`file_get_contents`就会一直卡在那里不会超时。我们知道`php.ini` 里面`max_execution_time` 可以设置 `PHP` 脚本的最大执行时间，但是，在 `php-cgi(php-fpm)` 中，该参数不会起效。真正能够控制 `PHP` 脚本最大执行时间的是 `php-fpm.conf` 配置文件中的`request_terminate_timeout`参数。  

`request_terminate_timeout`默认值为 0 秒，也就是说，PHP 脚本会一直执行下去。这样，当所有的 `php-cgi` 进程都卡在 `file_get_contents()` 函数时，这台 `Nginx+PHP` 的 `WebServer` 已经无法再处理新的 PHP 请求了，Nginx 将给用户返回“502 Bad Gateway”。修改该参数，设置一个 PHP 脚本最大执行时间是必要的，但是，治标不治本。例如改成 30s，如果发生 `file_get_contents()` 获取网页内容较慢的情况，这就意味着 150 个 php-cgi 进程，每秒钟只能处理 5 个请求，`WebServer` 同样很难避免”502 Bad Gateway”。**解决办法是`request_terminate_timeout`设置为10s或者一个合理的值，或者给`file_get_contents`加一个超时参数。**  
```php
$ctx = stream_context_create(array(
    'http' => array(
        'timeout' => 10    //设置一个超时时间，单位为秒
    )
));
 
file_get_contents($str, 0, $ctx);
```
# 3. max_requests参数配置不当，可能会引起间歇性502错误(转)
`pm.max_requests = 1000`  
设置每个子进程重生之前服务的请求数. 对于可能存在内存泄漏的第三方模块来说是非常有用的. 如果设置为 ’0′ 则一直接受请求. 等同于 `PHP_FCGI_MAX_REQUESTS` 环境变量. 默认值: 0.
这段配置的意思是，当一个 PHP-CGI 进程处理的请求数累积到 500 个后，自动重启该进程。 
- 但是为什么要重启进程呢？  
&emsp;&emsp;一般在项目中，我们多多少少都会用到一些 PHP 的第三方库，这些第三方库经常存在内存泄漏问题，如果不定期重启 PHP-CGI 进程，势必造成内存使用量不断增长。因此 PHP-FPM 作为 PHP-CGI 的管理器，提供了这么一项监控功能，对请求达到指定次数的 PHP-CGI 进程进行重启，保证内存使用量不增长。  
&emsp;&emsp;正是因为这个机制，在高并发的站点中，经常导致 502 错误，我猜测原因是 PHP-FPM 对从 NGINX 过来的请求队列没处理好。不过我目前用的还是 PHP 5.3.2，不知道在 PHP 5.3.3 中是否还存在这个问题。  
&emsp;&emsp;目前我们的解决方法是，把这个值尽量设置大些，尽可能减少 PHP-CGI 重新 SPAWN 的次数，同时也能提高总体性能。在我们自己实际的生产环境中发现，内存泄漏并不明显，因此我们将这个值设置得非常大（204800）。大家要根据自己的实际情况设置这个值，不能盲目地加大。  
&emsp;&emsp;**话说回来，这套机制目的只为保证 PHP-CGI 不过分地占用内存，为何不通过检测内存的方式来处理呢？我非常认同高春辉所说的，通过设置进程的峰值内在占用量来重启 PHP-CGI 进程，会是更好的一个解决方案。**  

# 4. php-fpm的慢日志，debug及异常排查神器：
`request_slowlog_timeout`设置一个超时的参数，slowlog设置慢日志的存放位置  
```bash
tail -f /var/log/www.slow.log
```
上面的命令即可看到执行过慢的php过程。  
大家可以看到经常出现的网络读取超过、Mysql查询过慢的问题，根据提示信息再排查问题就有很明确的方向了。

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/php%E8%BF%90%E7%BB%B4%E6%95%85%E9%9A%9C%E8%AE%B0%E5%BD%95/  

