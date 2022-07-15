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

