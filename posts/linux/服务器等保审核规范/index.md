# 服务器等保审核规范


# 身份鉴别
## 密码复杂度
生效级别: `/etc/pam.d/system-auth &gt; /etc/security/pwquality.conf`
### centos 7.x   
对于所有用户生效(更多配置需结合`/etc/pam.d/system-auth`配置) 
```bash
## config /etc/security/pwquality.conf
[root@11 ~]#  authconfig --passminlen=10 --passminclass=4 --passmaxrepeat=4 --enablerequpper --enablereqlower --enablereqdigit --enablereqother --update 
```
  `--passminlen=&lt;number&gt;`     最小密码长度(无限制,设置0)
  `--passminclass=&lt;number&gt;`   密码中字符最小个数(无限制,设置0)
  `--passmaxrepeat=&lt;number&gt;`  密码中相同连续字符的最大个数(无限制,设置0)
  `--passmaxclassrepeat=&lt;number&gt;` 密码中同类连续字符的最大个数(无限制,设置0)
  `--enablereqlower`        密码中至少包含一个小写字母
  `--disablereqlower`       密码中不需要包含一个小写字母
  `--enablerequpper`        密码中至少包含一个大写字母
  `--disablerequpper`       密码中不需要包含一个大写字母
  `--enablereqdigit`        密码中至少包含一个数字
  `--disablereqdigit`       密码中不需要包含一个数字
  `--enablereqother`        密码中至少包含一个特殊字符
  `--disablereqother`       密码中不需要包含一个特殊字符
###  centos 6.x  
对于新增用户生效(7.x下`pam_cracklib.so`被`pam_pwquality.so`替代 )
```bash
[root@11 ~]# vim /etc/pam.d/system-auth
password requisite pam_cracklib.so try_first_pass retry=3 type= minlen=8 dcredit=-1 ucredit=-1 lcredit=-1 ocredit=-1 
```
- 
 `retry=3`       重试多少次后返回密码修改错误
 `minlen=10`      新密码的最小长度  
- 正式表示最多多少个,负数表示最少多少个:
 `dcredit=-1`     新密码中可以包含数字的最大数目  
 `ucredit=-1`     新密码中可以包含大写字母  
 `lcredit=-1`     新密码中可以包含小写字母 
 `ocredit=-1`     新密码中可以包含特殊字符  

### 通用
```bash 
[root@11 ~]# vim /etc/pam.d/system-auth
password    sufficient    pam_unix.so sha512 shadow nullok try_first_pass use_authtok remember=3
remember=3  不允许使用最近的3个密码
```  
## 密码过期  
### 通用  
仅新创建用户有效
```bash
[root@11 ~]# vim /etc/login.defs  # 实际修改了没效果,需要重启服务器
### 查看chage -l &lt;username&gt; ### 
PASS_MAX_DAYS   90  #密码最长过期天数
PASS_MIN_DAYS   5  #密码更改的最小天数
PASS_MIN_LEN    10  #密码最小长度
PASS_WARN_AGE   7   #密码过期警告天数
```
对已创建用户生效 
```
# 把密码到期时间设置为2018年11月1日，修改密码的最短周期为5天，最长周期为90天。密码过期前14天会发送消息提醒用户
chage -E 1/11/2018 -m 5 -M 90 -W 14 &lt;username&gt;
```
## 登录认证
### 通用 
修改后立即生效(tty,ssh)
```bash
[root@11 ~]# vim /etc/pam.d/password-auth # 添加(nu:4,12) 似乎有时候无效
auth        required      pam_tally2.so deny=3 unlock_time=600 even_deny_root unlock_time=300
account     required      pam_tally2.so
```
修改后立即生效(ssh)
```bash 
[root@11 ~]# vim /etc/pam.d/sshd # 添加(nu:2)
auth        required      pam_tally2.so deny=3 unlock_time=600 even_deny_root unlock_time=300
```
修改后立即生效(tty)
```bash
[root@11 ~]# vim /etc/pam.d/login # 添加(nu:1)
auth        required      pam_tally2.so deny=3 unlock_time=600 even_deny_root unlock_time=300
```
`deny=3`            失败三次锁定
`even_deny_root`    对于root也适用
`unlock_time=600`   锁定时间600秒 


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/%E6%9C%8D%E5%8A%A1%E5%99%A8%E7%AD%89%E4%BF%9D%E5%AE%A1%E6%A0%B8%E8%A7%84%E8%8C%83/  

