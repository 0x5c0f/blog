# HashiCorp Vault的MySQL数据库凭据动态管理


{{< admonition type=warning title="注意" open=true >}}

**本章内容为 `DeepSeek` 对话总结归档而来，文章内容由博主全程测试，此文档原目的是为了记录 `HashiCort Vault` 可以实现 `Mysql` 数据库动态凭据管理(`PCI`规范要求数据库密钥需要动态轮换)，仅限参考**

{{< /admonition >}}

## 📋 项目概述

### 目标
实现基于HashiCorp Vault的MySQL数据库凭据动态管理，包括动态角色、静态角色自动轮换、监控告警和安全审计。

### 架构组件
- **Vault Server**: 凭据管理中心
- **MySQL**: 目标数据库
- **动态角色**: 短期凭据（30分钟TTL）
- **静态角色**: 长期凭据（24小时自动轮换）
- **监控体系**: 租约管理、健康检查、告警规则

---

## 🔧 阶段1：基础环境配置

### 1.1 MySQL容器部署
```bash
# 启动MySQL测试容器
docker run -d \
  --name mysql-vault-test \
  -e MYSQL_ROOT_PASSWORD=rootpassword123 \
  -e MYSQL_DATABASE=vault_test \
  -p 3306:3306 \
  mysql:8.0

# 验证连接
docker exec -i mysql-vault-test mysql -uroot -prootpassword123 -e "SHOW DATABASES;"
```

### 1.2 Vault数据库引擎配置
```bash
# 启用数据库密钥引擎
/opt/vault/bin/vault secrets enable database

# 配置MySQL连接
/opt/vault/bin/vault write database/config/mysql-vault \
    plugin_name=mysql-database-plugin \
    connection_url="{{username}}:{{password}}@tcp(127.0.0.1:3306)/" \
    allowed_roles="vault-dynamic-role" \
    username="root" \
    password="rootpassword123"
```

---

## 🔐 阶段2：动态角色配置

### 2.1 动态角色定义
```bash
/opt/vault/bin/vault write database/roles/vault-dynamic-role \
    db_name=mysql-vault \
    creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}';GRANT SELECT, INSERT, UPDATE, DELETE ON vault_test.* TO '{{name}}'@'%';" \
    default_ttl="30m" \
    max_ttl="2h" \
    revocation_statements="REVOKE ALL PRIVILEGES ON vault_test.* FROM '{{name}}'@'%'; DROP USER '{{name}}'@'%';"
```

### 2.2 动态凭据使用
```bash
# 获取动态凭据
/opt/vault/bin/vault read database/creds/vault-dynamic-role

# 验证MySQL权限
mysql -u<动态用户名> -p<动态密码> -e "SHOW GRANTS;"
```

---

## 🔄 阶段3：静态角色自动轮换

### 3.1 创建静态用户
```bash
# 在MySQL中创建静态用户
docker exec -i mysql-vault-test mysql -uroot -prootpassword123 -e 'CREATE USER "vault_static_user"@"%" IDENTIFIED BY "TempPassword123!"; GRANT SELECT, INSERT ON vault_test.* TO "vault_static_user"@"%";'
```

### 3.2 配置静态角色
```bash
# 更新数据库配置支持静态角色
/opt/vault/bin/vault write database/config/mysql-vault \
    plugin_name=mysql-database-plugin \
    connection_url="{{username}}:{{password}}@tcp(127.0.0.1:3306)/" \
    allowed_roles="vault-dynamic-role,app-static-user" \
    username="root" \
    password="rootpassword123"

# 配置静态角色（24小时自动轮换）
/opt/vault/bin/vault write database/static-roles/app-static-user \
    db_name=mysql-vault \
    username="vault_static_user" \
    rotation_statements="ALTER USER 'vault_static_user'@'%' IDENTIFIED BY '{{password}}';" \
    rotation_period="86400"
```

### 3.3 获取静态凭据
```bash
# 获取当前静态凭据
/opt/vault/bin/vault read database/static-creds/app-static-user

# 查看静态角色状态
/opt/vault/bin/vault read database/static-roles/app-static-user
```

---

## 📊 阶段4：监控审计体系

### 4.1 审计日志配置
```bash
# 创建审计日志目录
sudo mkdir -p /opt/vault/audit
sudo chown cxd: /opt/vault/audit

# 启用文件审计
/opt/vault/bin/vault audit enable file file_path=/opt/vault/audit/vault-audit.log

# 验证审计配置
/opt/vault/bin/vault audit list
```

### 4.2 监控策略配置
```bash
# 创建数据库监控策略
/opt/vault/bin/vault policy write db-monitor - << EOF
path "database/creds/vault-dynamic-role" {
  capabilities = ["read"]
}
path "database/creds/dev-readonly" {
  capabilities = ["read"]
}
path "database/creds/app-rw" {
  capabilities = ["read"]
}
path "database/roles/*" {
  capabilities = ["read"]
}
path "database/static-creds/app-static-user" {
  capabilities = ["read"]
}
path "sys/leases/renew" {
  capabilities = ["update"]
}
path "sys/leases/lookup" {
  capabilities = ["update"]
}
EOF

# 创建监控令牌
/opt/vault/bin/vault token create -policy=db-monitor -display-name="db-monitor-token" -ttl=24h
```

### 4.3 监控脚本

#### 租约管理脚本 (`/opt/vault/bin/lease-manager.sh`)
```bash
#!/bin/bash
export VAULT_ADDR='http://127.0.0.1:8200'
echo "=== Vault租约管理 ==="
# 列出所有动态凭据租约
echo "1. 活跃的动态凭据租约:"
/opt/vault/bin/vault list sys/leases/lookup/database/creds/vault-dynamic-role 2>/dev/null
# 查看租约详情（如果有租约）
LEASE_IDS=$(/opt/vault/bin/vault list sys/leases/lookup/database/creds/vault-dynamic-role 2>/dev/null | tail -n +3)
if [ ! -z "$LEASE_IDS" ]; then
    echo -e "\n2. 租约详情:"
    for lease in $LEASE_IDS; do
        echo "租约: $lease"
        /opt/vault/bin/vault lease lookup database/creds/vault-dynamic-role/$lease 2>/dev/null | grep -E "(lease_duration|expire_time)"
    done
fi
# 检查MySQL中的动态用户
echo -e "\n3. MySQL中的动态用户:"
docker exec mysql-vault-test mysql -uroot -prootpassword123 -e "SELECT user, host FROM mysql.user WHERE user LIKE 'v-%';" 2>/dev/null
echo -e "\n4. 静态角色状态:"
/opt/vault/bin/vault read database/static-creds/app-static-user 2>/dev/null | grep -E "(username|last_vault_rotation|rotation_period)"
echo -e "\n=== 管理完成 ==="
```

#### 轮换监控脚本 (`/opt/vault/bin/rotation-monitor.sh`)
```bash
#!/bin/bash
export VAULT_ADDR='http://127.0.0.1:8200'
echo "=== 凭据轮换监控 ==="
date
# 检查静态角色轮换状态
echo -e "\n1. 静态角色轮换状态:"
STATIC_INFO=$(/opt/vault/bin/vault read database/static-creds/app-static-user 2>/dev/null)
echo "$STATIC_INFO" | grep -E "(last_vault_rotation|next_vault_rotation|rotation_period)"
# 检查动态角色配置
echo -e "\n2. 动态角色TTL配置:"
/opt/vault/bin/vault read database/roles/vault-dynamic-role 2>/dev/null | grep -E "(default_ttl|max_ttl)"
# 检查活跃租约数量
echo -e "\n3. 活跃租约统计:"
LEASE_COUNT=$(/opt/vault/bin/vault list sys/leases/lookup/database/creds/vault-dynamic-role 2>/dev/null | tail -n +3 | wc -l)
echo "活跃动态凭据租约: $LEASE_COUNT"
# 检查MySQL用户数量
echo -e "\n4. MySQL用户统计:"
docker exec mysql-vault-test mysql -uroot -prootpassword123 -e "SELECT COUNT(*) as '动态用户数' FROM mysql.user WHERE user LIKE 'v-%';" 2>/dev/null
echo -e "\n=== 监控完成 ==="
```

---

## 🚨 阶段5：高级监控告警

### 5.1 Prometheus指标配置
```bash
# 启用Vault Prometheus指标
/opt/vault/bin/vault write sys/metrics/config \
    usage_gauge_period="30s" \
    maximum_gauge_cardinality=500
```

### 5.2 健康检查脚本 (`/opt/vault/bin/vault-health-check.sh`)
```bash
#!/bin/bash
export VAULT_ADDR='http://127.0.0.1:8200'
echo "=== Vault健康检查 ==="
date
# 检查Vault状态
echo -e "\n1. Vault服务状态:"
/opt/vault/bin/vault status 2>/dev/null
# 检查密封状态
echo -e "\n2. 密封状态:"
/opt/vault/bin/vault status 2>/dev/null | grep -E "(Sealed|Initialized)"
# 检查数据库引擎状态
echo -e "\n3. 数据库引擎状态:"
/opt/vault/bin/vault secrets list -detailed | grep database
# 检查租约状态
echo -e "\n4. 租约状态:"
ACTIVE_LEASES=$(/opt/vault/bin/vault list sys/leases/lookup/database/creds/vault-dynamic-role 2>/dev/null | tail -n +3 | wc -l)
echo "活跃动态租约: $ACTIVE_LEASES"
# 检查静态角色状态
echo -e "\n5. 静态角色状态:"
STATIC_TTL=$(/opt/vault/bin/vault read database/static-creds/app-static-user 2>/dev/null | grep ttl | awk '{print $2}')
echo "静态角色TTL: $STATIC_TTL"
# 检查审计日志
echo -e "\n6. 审计日志状态:"
AUDIT_LOG_SIZE=$(sudo ls -lh /opt/vault/audit/vault-audit.log 2>/dev/null | awk '{print $5}' || echo "N/A")
echo "审计日志大小: $AUDIT_LOG_SIZE"
echo -e "\n=== 健康检查完成 ==="
# 退出码判断
if /opt/vault/bin/vault status 2>/dev/null | grep -q "Sealed.*false"; then
    echo "✅ Vault健康状态: 正常"
    exit 0
else
    echo "❌ Vault健康状态: 异常"
    exit 1
fi
```

### 5.3 告警规则 (`/opt/vault/bin/vault-alert-rules.yml`)
```yaml
groups:
- name: vault_alerts
  rules:
  - alert: VaultSealed
    expr: vault_core_sealed == 1
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Vault实例已密封"
      description: "Vault实例 {{ $labels.instance }} 处于密封状态，需要解封"
  - alert: HighLeaseUsage
    expr: count(vault_expire_num_leases) > 50
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "租约使用率过高"
      description: "Vault实例 {{ $labels.instance }} 活跃租约数量超过50个"
  - alert: StaticCredentialExpiring
    expr: vault_database_static_role_rotation_scheduled{role="app-static-user"} < 3600
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "静态凭据即将轮换"
      description: "静态角色 {{ $labels.role }} 将在1小时内自动轮换"
  - alert: DatabaseConnectionFailure
    expr: increase(vault_database_connection_errors_total[5m]) > 3
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "数据库连接频繁失败"
      description: "Vault到数据库的连接在5分钟内失败超过3次"
```

### 5.4 自动清理脚本 (`/opt/vault/bin/vault-cleanup.sh`)
```bash
#!/bin/bash
export VAULT_ADDR='http://127.0.0.1:8200'
echo "=== Vault清理维护 ==="
date
# 清理过期的租约
echo -e "\n1. 清理过期租约:"
EXPIRED_LEASES=$(/opt/vault/bin/vault list sys/leases/lookup/database/creds/vault-dynamic-role 2>/dev/null | tail -n +3)
if [ ! -z "$EXPIRED_LEASES" ]; then
    for lease in $EXPIRED_LEASES; do
        LEASE_INFO=$(/opt/vault/bin/vault lease lookup database/creds/vault-dynamic-role/$lease 2>/dev/null)
        if echo "$LEASE_INFO" | grep -q "lease expired"; then
            echo "清理过期租约: $lease"
            /opt/vault/bin/vault lease revoke database/creds/vault-dynamic-role/$lease 2>/dev/null
        fi
    done
fi
# 清理MySQL中的孤立用户
echo -e "\n2. 清理MySQL孤立用户:"
docker exec mysql-vault-test mysql -uroot -prootpassword123 -e "
SELECT CONCAT('DROP USER \\'', user, '\\'@\\'', host, '\\';') 
FROM mysql.user 
WHERE user LIKE 'v-%' 
AND user NOT IN (
    SELECT DISTINCT SUBSTRING_INDEX(SUBSTRING_INDEX(json_extract(creation_statement, '$[0]'), '''', 2), '''', -1)
    FROM vault_token.vault_dynamic_users
);" 2>/dev/null
# 轮转审计日志（如果超过100MB）
echo -e "\n3. 审计日志维护:"
AUDIT_LOG_SIZE=$(sudo ls -l /opt/vault/audit/vault-audit.log 2>/dev/null | awk '{print $5}')
if [ "$AUDIT_LOG_SIZE" -gt 104857600 ]; then  # 100MB
    echo "审计日志超过100MB，执行轮转"
    sudo mv /opt/vault/audit/vault-audit.log /opt/vault/audit/vault-audit.log.$(date +%Y%m%d_%H%M%S)
    sudo systemctl reload vault  # 重新加载以创建新日志文件
fi
echo -e "\n=== 清理完成 ==="
```

---

## 📈 运维最佳实践

### 日常运维命令
```bash
# 查看所有配置状态
/opt/vault/bin/lease-manager.sh
/opt/vault/bin/rotation-monitor.sh
/opt/vault/bin/vault-health-check.sh

# 手动轮换静态凭据
/opt/vault/bin/vault write -force database/rotate-role/app-static-user

# 查看审计日志
sudo tail -f /opt/vault/audit/vault-audit.log | jq .
```

### 定时任务配置
```bash
# 添加到crontab
# 每5分钟健康检查
*/5 * * * * /opt/vault/bin/vault-health-check.sh >> /var/log/vault-health.log 2>&1

# 每小时租约监控
0 * * * * /opt/vault/bin/lease-manager.sh >> /var/log/vault-lease.log 2>&1

# 每天凌晨清理维护
0 2 * * * /opt/vault/bin/vault-cleanup.sh >> /var/log/vault-cleanup.log 2>&1
```

### 故障排查指南
1. **Vault密封状态**: 使用解封密钥解封
2. **数据库连接失败**: 检查MySQL服务状态和网络连通性
3. **凭据生成失败**: 检查数据库用户权限和Vault角色配置
4. **租约过期**: 检查TTL配置和租约续期逻辑

---

## 🔒 安全注意事项

1. **最小权限原则**: 所有角色按需分配最小必要权限
2. **凭据生命周期**: 动态凭据30分钟TTL，静态凭据24小时自动轮换
3. **审计追踪**: 所有操作记录到审计日志
4. **监控告警**: 实时监控关键指标并设置告警
5. **定期维护**: 定期清理过期租约和孤立用户

---

## 📚 总结

本方案实现了完整的数据库凭据动态管理：
- ✅ **动态凭据**: 短期访问，自动回收
- ✅ **静态凭据**: 长期使用，自动轮换
- ✅ **安全审计**: 完整操作记录
- ✅ **监控告警**: 实时状态监控
- ✅ **自动化运维**: 脚本化日常维护

通过这套体系，可以有效提升数据库访问安全性，降低凭据泄露风险，实现合规性要求。


## 📝 参考资料
1. [Vault官方文档](https://developer.hashicorp.com/vault/docs)
2. [HashiCorp Vault 实施对话记录](https://static.0x5c0f.cc/document/archive/HashiCorpVault%E5%AE%9E%E6%96%BD%E5%AF%B9%E8%AF%9D%E8%AE%B0%E5%BD%95.pdf)

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/vault%E7%9A%84mysql%E6%95%B0%E6%8D%AE%E5%BA%93%E5%87%AD%E6%8D%AE%E5%8A%A8%E6%80%81%E7%AE%A1%E7%90%86/  

