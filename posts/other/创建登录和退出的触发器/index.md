# Oracle创建登录和退出的触发器


# 创建触发记录表
```sql
create table log_table(
  username varchar2(20 ),
  logon_time date,
  logoff_time date,
  address varchar2(20 )
);
```
# 登录触发器
```sql
create or replace trigger tr_logon
after logon on DATABASE
begin
  INSERT INTO log_table(username,logon_time,address)
 values(ora_login_user, SYSDATE,ora_client_ip_address);
end;
/
```
# 退出触发器
```sql
create or replace trigger tr_logoff
 before logoff on database
begin
INSERT INTO log_table(username,logoff_time,address)
 values(ora_login_user, SYSDATE,ora_client_ip_address);
end;
/
```


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E5%88%9B%E5%BB%BA%E7%99%BB%E5%BD%95%E5%92%8C%E9%80%80%E5%87%BA%E7%9A%84%E8%A7%A6%E5%8F%91%E5%99%A8/  

