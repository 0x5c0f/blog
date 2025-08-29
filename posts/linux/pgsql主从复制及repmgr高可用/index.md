# PostgreSQL主从复制及repmgr高可用


**本文为`PostgreSQL`主从复制及`repmgr`高可用解决方案, 单主从架构, 适用于中小型数据库集群。文中记录为真是场景测试案例(未进行参数优化)，集群于亚马逊`EC2`，`VIP`能力由*`亚马逊私有辅助IP`*实现**

---

# 基础环境信息
- 操作系统: `Ubuntu 24.04.3`、`4G`、`8vCPU`、`500G`
- PostgreSQL: `16.10`
- Repmgr: `5.5.0`
- 节点信息: `主-pgsql_node_01(10.0.2.113)`、`从-pgsql_node_02(10.0.3.114)`
- VIP: `10.0.1.100`
- 资源环境: `AWS EC2`

# 环境搭建
## 安装及配置
```bash
# 在两台机器同时执行
$> sudo apt update
$> sudo apt install -y postgresql-common
$> sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh

# 安装 PostgreSQL 16、repmgr， 此举将安装最新版的 PostgreSQL 16最新版本，截止文档编写
# PostgreSQL 最新版本为 16.10 
$> sudo apt install -y postgresql-16 postgresql-client-16 postgresql-16-repmgr jq curl

# 版本验证
$> psql --version                                 # 客户端版本
$> sudo -u postgres psql -c 'SELECT version();'   # 服务器版本
$> pg_lsclusters                                  # 查看集群列表与监听端口
$> systemctl status postgresql@16-main
```

## PostgreSQL 数据目录迁移
此项根据自己需求看是否调整，可忽略此步骤 
```bash
# 停止现有集群
sudo pg_ctlcluster 16 main stop

# 准备新目录
sudo mkdir -p /data/_pgsql_data/16/main
sudo chown postgres:postgres /data/_pgsql_data -R

# 使用 initdb 初始化到新目录
sudo -u postgres /usr/lib/postgresql/16/bin/initdb -D /data/_pgsql_data/16/main

# 切换配置到新目录
sudo sed -i "s|^#\?data_directory =.*|data_directory = '/data/_pgsql_data/16/main'|" /etc/postgresql/16/main/postgresql.conf

# 5) 启动并验证
sudo pg_ctlcluster 16 main start
pg_lsclusters
```

## 初始化与主从复制
### 配置文件 postgresql.conf
- 主、从节点同时执行
  ```ini
  $> vim /etc/postgresql/16/main/postgresql.conf

  listen_addresses = '*'
  wal_level = replica
  max_wal_senders = 10
  max_replication_slots = 10
  hot_standby = on
  wal_keep_size = 512MB               # 该值理论上应该通过计算得出，但当前库主要用于测试和读取 512 是一个略微合理的值
  shared_buffers = 2GB                # 推荐系统内存的25%(8G)

  password_encryption = scram-sha-256

  #  日志与慢查询
  logging_collector = on
  log_directory = 'log'                 # Debian系列 默认符号链接到 /var/log/postgresql
  log_filename = 'postgresql-%Y-%m-%d.log'
  log_rotation_age = 1d
  log_rotation_size = 10MB
  log_line_prefix = '%m [%p] %u@%d %r ' # 时间, PID, 用户@库, 远端地址
  log_statement = 'ddl'                 # 记录 DDL
  log_duration = off
  log_min_duration_statement = 500ms    # 慢查询阈值

  # repmgr 主从切换要求归档
  archive_mode = on
  # # 这个目录需要主动维护
  # mkdir -p /data/_pgsql_data/wal_archive && chown postgres:postgres /data/_pgsql_data/wal_archive
  archive_command = 'cp %p /data/_pgsql_data/wal_archive/%f' 
  shared_preload_libraries = 'repmgr'
  wal_log_hints = on

  shared_preload_libraries = 'repmgr'

  # 重启 postgresql
  $> sudo systemctl restart postgresql@16-main
  ```

### 创建复制与管理用户
```bash
# 主节点-pgsql_node_01(10.0.2.113)执行
$> sudo -u postgres psql  
postgres=# CREATE USER repl WITH REPLICATION LOGIN PASSWORD '{{ REPL_PASSWORD }}';
```

### 配置文件 pg_hba.conf
```ini
# 主、从环境同时执行
$> vim /etc/postgresql/16/main/pg_hba.conf
host    all             all             10.0.0.0/16             scram-sha-256
host    replication     repl            10.0.0.0/16             scram-sha-256
```

### 从库基准拷贝
```bash
# 从节点 pgsql_node_02(10.0.3.114) 执行
$> sudo systemctl stop postgresql@16-main
$> sudo rm -rf /data/_pgsql_data/16/main
# 执行 basebackup：
$> sudo -u postgres pg_basebackup -h 10.0.2.113 -U repl -D /data/_pgsql_data/16/main -Fp -Xs -P -R
# -R 会自动写入 standby.signal 与 primary_conninfo

# 启动从库
$> sudo systemctl start postgresql@16-main

# 验证复制：
# 在 10.0.2.113/20 查看 state 应为 streaming， sync_state 应为 async, 若开启强一致性 sync_state 应为 sync
# synchronous_commit: 
## on：事务提交时等待 WAL 日志传输并确认写入到同步 standby。 
## remote_write：只等待从库确认写入 WAL，但不等待 fsync（性能稍好，但仍有丢数据风险）。
## remote_apply：等到 standby 真正应用了事务才返回（最强一致性，但延迟最大）。
# synchronous_commit = on
# synchronous_standby_names
# 指定哪些从库是同步复制候选者。
# FIRST 1 (...) 表示主库只需要 任意 1 个 standby 确认就算成功。
# 可以列出多个，从库名需要和从库的 primary_conninfo 里的 application_name 匹配。
# synchronous_standby_names = 'FIRST 1 (standby1, standby2)'
# 关于强一致性是否开启, 主库事务提交前必须等待至少一个同步备库确认写入 WAL，确保即使主库崩溃，数据也已经持久化到备库。
# 因此单主单从节点是不建议开启的， 否则从库离线，主库可能将一直处于等待状态。
$> sudo -u postgres psql -c "select client_addr, state, sync_state from pg_stat_replication;"  

# 在 10.0.3.114/20 查看，应为 t
$> sudo -u postgres psql -c "select pg_is_in_recovery();"                                      
```

*主从复制完成*

## repmgr 服务配置
### repmgr 数据库、用户、授权、扩展
```bash
-- # 主节点-pgsql_node_01(10.0.2.113)执行，创建相关用户(由于主从复制完成，从库会自动同步这些信息)
$> sudo -u postgres psql 
# -- 确保在干净的环境中开始，如果 repmgr 数据库和用户已存在，则删除它们。
postgres=# DROP DATABASE IF EXISTS repmgr;
postgres=# DROP ROLE IF EXISTS repmgr;

# -- 3. 授予 repmgr 用户对 repmgr 数据库的所有权限。
# -- 正常来说，此处使用的授权应该是具体的权限，而不是 SUPERUSER, 但为了方便，此处使用 SUPERUSER， 官方也建议用 SUPERUSER。
postgres=# CREATE ROLE repmgr WITH SUPERUSER LOGIN PASSWORD '{{ REPMGR_PASSWORD }}';
postgres=# CREATE DATABASE repmgr OWNER repmgr;

# -- 切换到新创建的 repmgr 数据库
postgres=# \c repmgr

# -- 1. 创建 repmgr 扩展。这会自动创建 'repmgr' 模式和所有所需的表。
repmgr=# CREATE EXTENSION repmgr;

# -- 退出 psql
repmgr=# \q 
```

### repmgr 配置文件
> [https://github.com/EnterpriseDB/repmgr/blob/master/repmgr.conf.sample](https://github.com/EnterpriseDB/repmgr/blob/master/repmgr.conf.sample)
- 主节点-pgsql_node_01(10.0.2.113)配置: `/etc/sudoer.d/postgres`
  ```bash
  # 添加 repmgr 操作时需要的一些权限
  $> vim /etc/sudoer.d/postgres
  Defaults:postgres !requiretty
  postgres ALL = NOPASSWD: /usr/bin/systemctl stop postgresql@16-main.service, /usr/bin/systemctl start postgresql@16-main.service, /usr/bin/systemctl restart postgresql@16-main.service, /usr/bin/systemctl start repmgrd.service, /usr/bin/systemctl stop repmgrd.service, /usr/sbin/ip
  ```

- 主节点-pgsql_node_01(10.0.2.113)配置: `/etc/repmgr.conf`
  ```ini
  # 主节点配置
  $> vim /etc/repmgr.conf
  node_id=1
  node_name='pgsql_node_01'

  # 注意 host 无论什么情况下，一定是本机节点
  conninfo='host=10.0.2.113 user=repmgr dbname=repmgr connect_timeout=2 password={{ REPMGR_PASSWORD }}'
  data_directory='/data/_pgsql_data/16/main'

  replication_user='repmgr'

  replication_type='physical'
  log_level='INFO'

  log_file='/var/log/repmgr/repmgrd.log'
  log_status_interval=300

  pg_bindir='/usr/lib/postgresql/16/bin'
  failover='automatic'

  connection_check_type='ping'
  reconnect_attempts=6
  reconnect_interval=5
  promote_command='repmgr standby promote -f /etc/repmgr.conf --log-to-file'
  follow_command='repmgr standby follow -f /etc/repmgr.conf --upstream-node-id=%n --log-to-file'

  event_notification_command='/usr/local/bin/vip_failover_switch.sh %n %e %s %t "%d"'
  # child_nodes_disconnect_command='/usr/local/bin/vip_failover_switch.sh %n child_nodes_disconnect_command 1 %t "%d"'

  repmgrd_pid_file='/var/run/postgresql/repmgrd.pid'

  #    # this is required when running sudo over ssh without -t:
  #    Defaults:postgres !requiretty
  #    postgres ALL = NOPASSWD: /usr/bin/systemctl stop postgresql@16-main.service, /usr/bin/systemctl start postgresql@16-main.service, /usr/bin/systemctl restart postgresql@16-main.service, /usr/bin/systemctl start repmgrd.service, /usr/bin/systemctl stop repmgrd.service

  service_start_command = 'sudo systemctl start postgresql@16-main.service'
  service_stop_command = 'sudo systemctl stop postgresql@16-main.service'
  service_restart_command = 'sudo systemctl restart postgresql@16-main.service'
  service_reload_command = 'sudo systemctl reload postgresql@16-main.service'

  repmgrd_service_start_command = 'sudo systemctl start repmgrd.service'
  repmgrd_service_stop_command = 'sudo systemctl stop repmgrd.service'
  ```

- 从节点-pgsql_node_02(10.0.3.114)执行配置: `/etc/repmgr.conf`
  ```ini
  ; 从节点配置
  node_id=2
  node_name='pgsql_node_02'
  # 注意 host 无论什么情况下，一定是本机节点
  conninfo='host=10.0.3.114 user=repmgr dbname=repmgr connect_timeout=2 password={{ REPMGR_PASSWORD }}'
  data_directory='/data/_pgsql_data/16/main'

  replication_user='repmgr'
  replication_type='physical'
  log_level='INFO'
  log_file='/var/log/repmgr/repmgrd.log'

  pg_bindir='/usr/lib/postgresql/16/bin'
  failover='automatic'

  connection_check_type='ping'
  reconnect_attempts=6
  reconnect_interval=10
  promote_command='repmgr standby promote -f /etc/repmgr.conf --log-to-file'
  follow_command='repmgr standby follow -f /etc/repmgr.conf --upstream-node-id=%n --log-to-file'

  # vip 切换核心，监听特殊事件并通知
  event_notification_command = '/usr/local/bin/vip_failover_switch.sh %n %e %s %t "%d"'
  # child_nodes_disconnect_command='/usr/local/bin/vip_failover_switch.sh %n child_nodes_disconnect_command 1 %t "%d"'
  repmgrd_pid_file='/var/run/postgresql/repmgrd.pid'

  #    # this is required when running sudo over ssh without -t:
  #    Defaults:postgres !requiretty
  #    postgres ALL = NOPASSWD: /usr/bin/systemctl stop postgresql@16-main.service, /usr/bin/systemctl start postgresql@16-main.service, /usr/bin/systemctl restart postgresql@16-main.service, /usr/bin/systemctl start repmgrd.service, /usr/bin/systemctl stop repmgrd.service

  service_start_command = 'sudo systemctl start postgresql@16-main.service'
  service_stop_command = 'sudo systemctl stop postgresql@16-main.service'
  service_restart_command = 'sudo systemctl restart postgresql@16-main.service'
  service_reload_command = 'sudo systemctl reload postgresql@16-main.service'

  repmgrd_service_start_command = 'sudo systemctl start repmgrd.service'
  repmgrd_service_stop_command = 'sudo systemctl stop repmgrd.service'
  ```

### 创建默认的 pid 文件，并更新权限
**这个步骤理论上是不需要做的，但是有时候有问题，建议执行**
```bash
$> touch /var/run/postgresql/repmgrd.pid && chown postgres:postgres /var/run/postgresql/repmgrd.pid
$> mkdir /var/log/repmgr && chown postgres:postgres /var/log/repmgr
```
### 创建 VIP 漂移管理脚本及亚马逊权限管理
- 亚马逊 创建 `IAM Policy` 并附加到两台 `EC2` 的实例角色
  1. 创建权限策略 `PostgresVipFailoverPolicy`
      ```json
      {
          "Version": "2012-10-17",
          "Statement": [
              {
                  "Effect": "Allow",
                  "Action": [
                      "ec2:DescribeInstances",
                      "ec2:DescribeNetworkInterfaces",
                      "ec2:AssignPrivateIpAddresses",
                      "ec2:UnassignPrivateIpAddresses"
                  ],
                  "Resource": "*"
              }
          ]
      }
      ```
  2. 创建一个`IMA角色`， 点击 `角色`-`创建角色`-`可信实体(AWS服务)`-`使用案例(EC2)`， 下一步， 权限策略选择 `PostgresVipFailoverPolicy`， 下一步，输入角色名称 `PostgresVipFailoverPolicy`， 下一步，完成创建, 创建完成后，在`EC2`找到对应的机器，将`IMA角色`附加上去即可。(***IMA角色的附加可以防止在服务器上面配置ak/sk，也可以使用aws cli的调用，大大降低ak/sk泄露风险***)

- `/usr/local/bin/vip_failover_switch.sh`
  ```bash
  $> touch /usr/local/bin/vip_failover_switch.sh && chmod +x /usr/local/bin/vip_failover_switch.sh
  # 脚本目前处于试运行阶段，事件处理可能还不太完善，后续遇到问题在修改
  $> vim /usr/local/bin/vip_failover_switch.sh
  #!/usr/bin/env bash
  ################################################# 
  #   author      0x5c0f
  #   date        2025-08-28 
  #   email       mail@0x5c0f.cc 
  #   web         tools.0x5c0f.cc 
  #   version     1.2.5
  #   last update 2025-08-28
  #   descript    Use : ./vip_failover_switch.sh -h
  ################################################# 
  set -euo pipefail

  PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:~/bin
  export PATH

  # sudoer 授权
  # postgres ALL = NOPASSWD: /usr/sbin/ip addr add * dev *, /usr/sbin/ip addr del * dev *

  ########################################
  # 配置区（按需修改）
  ########################################
  declare -r PG_VIP="10.0.1.100"                       # VIP 地址（不带掩码）
  declare -Ar AWS_CLI_PROFILE_MAP_INSTANCE=(              # 本机私有IP -> 该节点对应的 instance-id
      ["10.0.3.114"]="{{  EC2_INSTANCE_ID }}"
      ["10.0.2.113"]="{{  EC2_INSTANCE_ID }}"
  )
  declare -r NICNAME="ens5"                               # 本地网卡名
  declare -r DEVICE_INDEX="0"                             # ENI 上的 device-index（通常0）
  declare -r LOG_FILE="/var/log/repmgr/vip_failover_switch.log"
  declare -r AWS_RETRY=3                                  # AWS API 重试次数
  declare -r AWS_RETRY_SLEEP=2                            # 重试间隔(s)

  ########################################
  # 日志函数
  ########################################
  __SAY__() {
      local -- LOG_LEVEL="${LOG_LEVEL:-DEBUG}"
      local -r ENDCOLOR="\033[0m"
      local -r INFOCOLOR="\033[1;34m"
      local -r SUCCESSCOLOR="\033[0;32m"
      local -r ERRORCOLOR="\033[0;31m"
      local -r WARNCOLOR="\033[0;33m"
      local -r DEBUGCOLOR="\033[0;35m"
      local LOGTYPE

      # 是否传入等级标记
      if [ -n "${1:-}" ] && [[ "${1}" =~ ^[A-Za-z]+$ ]]; then
          if [ "${LOG_LEVEL^^}" == "INFO" ]; then
              if [ "${1^^}" == "DEBUG" -o "${1^^}" == "ERROR" -o "${1^^}" == "WARN" ]; then
                  return 0
              fi
          elif [ "${LOG_LEVEL^^}" == "WARN" ]; then
              if [ "${1^^}" == "DEBUG" -o "${1^^}" == "ERROR" ]; then
                  return 0
              fi
          elif [ "${LOG_LEVEL^^}" == "ERROR" ]; then
              if [ "${1^^}" == "DEBUG" ]; then
                  return 0
              fi
          fi

          LOGTYPE="${1^^}COLOR"
          if [ -z "${!LOGTYPE:-}" ]; then
              LOGTYPE="INFOCOLOR"
          else
              shift
          fi
      else
          LOGTYPE="INFOCOLOR"
      fi

      local MESSAGE="$*"
      echo -e "[$(date '+%Y-%m-%d_%H:%M:%S')] [${!LOGTYPE}${LOGTYPE%%COLOR}${ENDCOLOR}] ${MESSAGE}" | tee -a "${LOG_FILE}"
  }

  # 获取网卡上的私有IP（不带掩码）
  function _GET_PRIVATE_IP() {
      sudo /usr/sbin/ip -4 addr show "${NICNAME}" 2>/dev/null | grep -oP 'inet \K[\d.]+' | head -1 || true
  }

  # 获取本实例ID（通过私有 IP 映射）
  function _GET_INSTANCE_ID() {
      local _PRIVATE_IP_=$(_GET_PRIVATE_IP)
      if [ -z "${_PRIVATE_IP_}" ]; then
          __SAY__ error "无法从本机获取私有IP（NIC=${NICNAME}），请检查网卡名"
          return 1
      fi
      echo "${AWS_CLI_PROFILE_MAP_INSTANCE[${_PRIVATE_IP_}]:-}"
  }

  # 获取当前实例所用 ENI ID
  function _GET_ENI_ID() {
      local inst
      inst=$(_GET_INSTANCE_ID) || return 1
      if [ -z "${inst}" ]; then
          __SAY__ error "未为本机私有IP配置 InstanceID 映射"
          return 1
      fi
      aws ec2 describe-network-interfaces \
          --filters "Name=attachment.instance-id,Values=${inst}" "Name=attachment.device-index,Values=${DEVICE_INDEX}" \
          --query 'NetworkInterfaces[].NetworkInterfaceId' --output text
  }

  # 从本地网卡获取掩码位长度（例如 20）
  function _GET_LOCAL_MASK() {
      sudo /usr/sbin/ip -o -f inet addr show "${NICNAME}" 2>/dev/null | awk '{print $4}' | head -1 | cut -d/ -f2 || echo "20"
  }

  # 判断本机系统层是否已经存在该 VIP（返回 0 表示存在）
  function _SYSTEM_HAS_VIP() {
      local mask
      mask=$(_GET_LOCAL_MASK)
      if sudo /usr/sbin/ip addr show dev "${NICNAME}" 2>/dev/null | grep -q "${PG_VIP}/${mask}"; then
          return 0
      fi
      # 兼容没有掩码直接匹配
      if sudo /usr/sbin/ip addr show dev "${NICNAME}" 2>/dev/null | grep -q "${PG_VIP}"; then
          return 0
      fi
      return 1
  }

  function ADD_VIP() {
      local _ENI_ID_ _mask _i _found _aws_output
      _ENI_ID_=$(_GET_ENI_ID) || { __SAY__ error "无法获取 ENI ID"; return 1; }

      # 检查特定的 ENI 上是否绑定了特定的 VIP
      __SAY__ debug "检查特定ENI上是否已经绑定了VIP: aws ec2 describe-network-interfaces --network-interface-ids ${_ENI_ID_} --query \"NetworkInterfaces[].PrivateIpAddresses[?PrivateIpAddress=='${PG_VIP}'].PrivateIpAddress\" --output text"

      _found=$(aws ec2 describe-network-interfaces --network-interface-ids "${_ENI_ID_}" --query "NetworkInterfaces[].PrivateIpAddresses[?PrivateIpAddress=='${PG_VIP}'].PrivateIpAddress"  --output text 2>/dev/null || true)

      if [ "${_found}" == "${PG_VIP}" ]; then
          __SAY__ warn "AWS: ENI ${_ENI_ID_} 已存在 VIP ${PG_VIP}，跳过分配"
      else
          __SAY__ info "开始添加 VIP ${PG_VIP} 到 ENI ${_ENI_ID_}"
          
          __SAY__ debug "aws ec2 assign-private-ip-addresses --network-interface-id ${_ENI_ID_} --private-ip-addresses ${PG_VIP} --allow-reassignment"
          for _i in $(seq 1 ${AWS_RETRY}); do
              _aws_output=$(aws ec2 assign-private-ip-addresses --network-interface-id "${_ENI_ID_}" --private-ip-addresses "${PG_VIP}" --allow-reassignment)

              if [ $? -eq 0 ] && echo "${_aws_output}" | jq -e ".AssignedPrivateIpAddresses[] | select(.PrivateIpAddress==\"${PG_VIP}\")" > /dev/null; then
                  __SAY__ success "AWS: 成功为 ENI ${_ENI_ID_} 分配 VIP ${PG_VIP}"
                  __SAY__ debug "AWS Rsp: ${_aws_output}"
                  break
              else
                  __SAY__ warn "AWS: 为 ENI ${_ENI_ID_} 分配 VIP ${PG_VIP} 第 ${_i} 次失败，重试..."
                  __SAY__ debug "AWS Rsp: ${_aws_output}"
                  sleep ${AWS_RETRY_SLEEP}
              fi

              if [ "${_i}" -eq "${AWS_RETRY}" ]; then
                  __SAY__ error "AWS: 多次尝试分配 VIP 失败，放弃操作"
                  return 1
              fi
          done
      fi

      # 等待几秒让 AWS 侧生效
      sleep 2

      if _SYSTEM_HAS_VIP; then
          __SAY__ warn "系统网卡 ${NICNAME} 已存在 VIP ${PG_VIP}，跳过本地添加"
      else
          _mask=$(_GET_LOCAL_MASK)
          __SAY__ debug "sudo /usr/sbin/ip addr add ${PG_VIP}/${_mask} dev ${NICNAME}"
          if sudo /usr/sbin/ip addr add "${PG_VIP}/${_mask}" dev "${NICNAME}"; then
              __SAY__ success "系统: VIP ${PG_VIP}/${_mask} 已添加到 ${NICNAME}"
          else
              __SAY__ error "系统: 添加 VIP ${PG_VIP}/${_mask} 到 ${NICNAME} 失败"
              return 1
          fi
      fi

      return 0
  }

  function DEL_VIP() {
      local _ENI_ID_ _mask _found
      _ENI_ID_=$(_GET_ENI_ID) || { __SAY__ error "无法获取 ENI ID"; return 1; }

      __SAY__ info "开始从 ENI ${_ENI_ID_} / 本地网卡 ${NICNAME} 删除 VIP ${PG_VIP}"

      # _found=$(aws ec2 describe-network-interfaces --network-interface-ids "${_ENI_ID_}" \
      #     --query "NetworkInterfaces[].PrivateIpAddresses[?PrivateIpAddress=='${PG_VIP}'] | [0].PrivateIpAddress" --output text 2>/dev/null || true)
      # if [ "${_found}" == "${PG_VIP}" ]; then
      #     if aws ec2 unassign-private-ip-addresses --network-interface-id "${_ENI_ID_}" --private-ip-addresses "${PG_VIP}"; then
      #         __SAY__ success "AWS: 成功从 ENI ${_ENI_ID_} 解绑 VIP ${PG_VIP}"
      #     else
      #         __SAY__ warn "AWS: 解绑 VIP ${PG_VIP} 失败或已被 reassigned，继续进行本地清理"
      #     fi
      # else
      #     __SAY__ debug "AWS: ENI ${_ENI_ID_} 未绑定 VIP ${PG_VIP}，跳过 unassign"
      # fi

      # 系统层：删除本地 IP
      if _SYSTEM_HAS_VIP; then
          _mask=$(_GET_LOCAL_MASK)
          __SAY__ debug "sudo /usr/sbin/ip addr del ${PG_VIP}/${_mask} dev ${NICNAME}"
          if sudo /usr/sbin/ip addr del "${PG_VIP}/${_mask}" dev "${NICNAME}"; then
              __SAY__ success "系统: VIP ${PG_VIP}/${_mask} 已从 ${NICNAME} 删除"
          else
              __SAY__ warn "系统: 删除 VIP ${PG_VIP}/${_mask} 失败（可能掩码不同），尝试模糊删除"
              # 最后尝试强匹配删除（不推荐，但兜底）
              if sudo /usr/sbin/ip addr show dev "${NICNAME}" | grep -q "${PG_VIP}"; then
                  # 查找确切 cidr 并删除
                  local found_cidr
                  found_cidr=$(sudo /usr/sbin/ip -o -f inet addr show "${NICNAME}" | awk -v vip="${PG_VIP}" '$0~vip {print $4; exit}')
                  if [ -n "${found_cidr}" ]; then
                      sudo /usr/sbin/ip addr del "${found_cidr}" dev "${NICNAME}" || __SAY__ error "系统: 最后兜底删除失败"
                      __SAY__ success "系统: 使用 ${found_cidr} 删除 VIP ${PG_VIP}"
                  fi
              fi
          fi
      else
          __SAY__ warn "系统网卡 ${NICNAME} 不存在 VIP ${PG_VIP}，跳过本地删除"
      fi

      return 0
  }

  ########################################
  # main: 参数解析（来自 repmgr event_notification_command）
  # usage: script NODE_ID EVENT_TYPE SUCCESS [TIMESTAMP] [DETAILS]
  ########################################
  if [ "$#" -lt 3 ]; then
      __SAY__ warn "用法: $0 <NODE_ID> <EVENT_TYPE> <SUCCESS> [TIMESTAMP] [DETAILS]"
      __SAY__ warn "应当在 repmgr.conf 中配置: "
      __SAY__ warn "\tevent_notification_command = 'sudo $0 %n %e %s %t \"%d\"'"
      __SAY__ warn "\tchild_nodes_disconnect_command='sudo $0 %n child_nodes_disconnect_command 1 %t \"%d\"'"
      exit 1
  fi

  declare -- NODE_ID="${1}"
  declare -- EVENT_TYPE="${2}"
  declare -- SUCCESS="${3}"
  declare -- TIMESTAMP="${4:-$(date '+%Y-%m-%d %H:%M:%S')}"
  declare -- DETAILS="${5:-}"

  __SAY__ debug "触发 repmgr 事件: NODE_ID=${NODE_ID} EVENT_TYPE=${EVENT_TYPE} SUCCESS=${SUCCESS} TIMESTAMP=${TIMESTAMP} DETAILS=${DETAILS}"

  # 仅对成功事件执行操作（SUCCESS=1）
  if [[ "${SUCCESS}" != "1" ]]; then
      __SAY__ warn "事件未成功（SUCCESS=${SUCCESS}），仅记录日志，跳过 VIP 操作"
      exit 0
  fi

  # 事件 -> 行为映射
  case "${EVENT_TYPE}" in
      # 新主就位（挂 VIP）
      "standby_promote"|"repmgrd_failover_promote"|"standby_switchover"|"primary_register")
          __SAY__ info "事件 ${EVENT_TYPE} 表示本节点为主，尝试挂载 VIP（DETAILS=${DETAILS})"
          if ADD_VIP; then
              __SAY__ success "ADD_VIP 操作完成（事件=${EVENT_TYPE}）"
          else
              __SAY__ error "ADD_VIP 操作失败（事件=${EVENT_TYPE}），请手动检查"
              exit 1
          fi
          ;;

      # 节点不再为主或需要自我隔离（摘 VIP）
      "standby_follow"|"primary_unregister"|"standby_register")
          # "repmgrd_local_disconnect" 事件在主节点临时关闭时也会触发，这个时候不应删除 VIP
          # "child_nodes_disconnect_command" 事件在单主单备情况下也不应删除 VIP
          __SAY__ warn "事件 ${EVENT_TYPE} 表示本节点不应持有 VIP，尝试删除 VIP（DETAILS=${DETAILS})"
          if DEL_VIP; then
              __SAY__ success "DEL_VIP 操作完成（事件=${EVENT_TYPE}）"
          else
              __SAY__ error "DEL_VIP 操作失败（事件=${EVENT_TYPE}），请手动检查"
              exit 1
          fi
          ;;

      # 这些事件只记录告警/信息，不做 VIP 操作（防止脑裂）
      "repmgrd_upstream_disconnect"|"standby_disconnect_manual"|"standby_failure"|"standby_recovery"|"repmgrd_promote_error")
          __SAY__ warn "事件 ${EVENT_TYPE} 仅为连接/错误类通知，记录日志并跳过 VIP 操作（DETAILS=${DETAILS})"
          ;;

      *)
          __SAY__ debug "未被脚本处理的事件: ${EVENT_TYPE}（DETAILS=${DETAILS}），仅记录"
          ;;
  esac

  exit 0
  ```

## 配置repmgrd服务
- 默认安装 `postgresql-16-repmgr` 后会创建一个 `/etc/init.d/repmgrd` 用于管理 `repmgrd`服务, 但这个脚本似乎有很严重的兼容问题，这里直接删除后重建服务
  ```bash
  # 在主从节点均执行
  $> rm -rf /etc/init.d/repmgrd
  $> systemctl daemon-reload
  $> vim /etc/systemd/system/repmgrd.service
  [Unit]
  Description=PostgreSQL Replication Manager Daemon
  After=postgresql@16-main.service

  [Service]
  Type=simple
  User=postgres
  Group=postgres
  PIDFile=/var/run/postgresql/repmgrd.pid
  ExecStart=/usr/bin/repmgrd -f /etc/repmgr.conf -d
  ExecReload=/bin/kill -HUP $MAINPID
  KillMode=process
  PrivateTmp=true

  [Install]
  WantedBy=multi-user.target

  $> systemctl daemon-reload
  ## 配置完成后，先不要启动该服务 
  ```
- 配置 `/etc/postgresql/16/main/pg_hba.conf` 
  ```bash
  sudo vim /etc/postgresql/16/main/pg_hba.conf
  # repmgr 连接权限
  host    repmgr         repmgr         10.0.0.0/16            scram-sha-256
  host    replication    repmgr         10.0.0.0/16            scram-sha-256
  ```
### 注册及校验
```bash
# 主节点-pgsql_node_01(10.0.2.113)执行注册
$> sudo -u postgres repmgr primary register -f /etc/repmgr.conf

# 检查注册是否成功
$> sudo -u postgres repmgr cluster show -f /etc/repmgr.conf

# 从库注册前需要先配置application_name , 该值和当前节点 /etc/repmgrd.conf 中的 node_name 保持一致
# 从库执行修改
$> vim /data/_pgsql_data/16/main/postgresql.auto.conf
# 由于初次配置是通过 sudo -u postgres pg_basebackup -h 10.0.2.113 -U repl -D /data/_pgsql_data/16/main -Fp -Xs -P -R 基准复制拷贝的
# 所以直接在primary_conninfo 配置末尾添加 applicatoin_name=pgsql_node_02 即可
# 应该也可以直接删除原有的，直接配置 primary_conninfo = 'host=10.0.2.113 port=5432 user=repmgr application_name=pgsql_node_02 password={{ REPMGR_PASSWORD }} connect_timeout=2'
# 调整完成后, 重载配置
$> sudo systemctl reload postgresql@16-main.service
# 查看配置是否成功
$> sudo -u postgres psql -c "SHOW primary_conninfo;"
# 在从节点上执行注册--upstream-node-id 指定的是上游节点，也就是主节点配置的node_id
$> sudo -u postgres repmgr standby register -f /etc/repmgr.conf --upstream-node-id=1

#########
## 主从节点启动 repmgrd 服务
$> sudo systemctl start repmgrd
#########

# 查看集群状态
# 查看完整的集群状态
$> sudo -u postgres repmgr cluster show -f /etc/repmgr.conf

# 查看所有节点的详细信息
$> sudo -u postgres repmgr cluster event --event=register -f /etc/repmgr.conf
# 在主节点上检查复制状态
$> sudo -u postgres psql -c "SELECT * FROM pg_stat_replication;"

# 在从节点上检查复制状态
$> sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver;"

# 检查repmgr.nodes表
$> sudo -u postgres psql -d repmgr -c "SELECT * FROM repmgr.nodes;"

# 查看节点状态
$> sudo -u postgres repmgr node status
# 查询当前备库从主库接收WAL日志流的状态
$> sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver;"
```

### 主从切换测试
- 非重建模式
  ```bash
  # 主节点-pgsql_node_01(10.0.2.113)执行
  $> sudo systemctl stop postgresql@16-main.service
  # 等待 1-2 分钟

  # 验证集群状态，只有在 Status 为 - failed 时候， 从节点才会触发晋升从而变为主节点
  # 等待阶段 Status 为 ? unreachable， 此时主库正在执行健康检查， 等待主库恢复中
  $> sudo -u postgres repmgr cluster show

  ### 集群状态恢复后，可以观察VIP是否已经漂移到新主节点了，如果没有，需要观察日志 /var/log/repmgr/vip_failover_switch.log, 其中记录了VIP的漂移过程，不过此时原主库上仍然绑定着VIP，可以手动删除，或者直接忽略，VIP的实现是靠的亚马逊私有辅助IP实现的，服务器上直接绑定无效，需要AWS绑定了，服务器上才能实际添加，该VIP会在注册从节点时自动删除， 手动删除key使用
  # $> ip addr del 10.0.1.100/20 dev ens5 # systemctl restart systemd-networkd

  # 从库晋升主库后的恢复
  # 启动原主库
  $> systemctl start postgresql@16-main.service
  # 将原主库置为从库 
  $> sudo -u postgres touch /data/_pgsql_data/16/main/standby.signal && sudo chmod 600 /data/_pgsql_data/16/main/standby.signal
  # 修正 原主库的 primary_conninfo 连接信息 
  $> vim /data/_pgsql_data/16/main/postgresql.auto.conf
  ## 如果配置文件中不存在，则直接添加， 注意 host 是主节点信息， application_name 是当前节点 /etc/repmgr.conf 中的 node_name
  primary_conninfo = 'host=10.0.3.114 port=5432 user=repmgr password={{ REPMGR_PASSWORD }} application_name=pgsql_node_01'

  # 重载配置
  $> sudo systemctl reload postgresql@16-main.service   # sudo systemctl restart postgresql@16-main.service
  # 重启 repmgrd 服务
  $> sudo systemctl restart repmgrd
  # 查看集群状态
  $> sudo -u postgres repmgr cluster show
  # 注意此时集群状态可能有两种情况，一种是 Status 没有任何标识， Upstream 也没有任何标识， 这种情况代表同步恢复完成，但是注册信息更新失败，可以等待一段时间后在观察，若仍然没有恢复，则重新注册一下，此时一般需要强制注册, --upstream-node-id 是主节点的node_id , 还有一种带有！号的， 代表同步重建完全失败， 这个可能是两者数据流差异过大引起，此时重建同步 
  $> sudo -u postgres repmgr standby register -f /etc/repmgr.conf --upstream-node-id=1 --force
  ```

- 重建模式
  ```bash
  ## 创建 /var/lib/postgresql/.pgpass 文件，用于重新克隆服务基准数据时使用
  $> touch /var/lib/postgresql/.pgpass && chown postgres:postgres /var/lib/postgresql/.pgpass && chmod 600 /var/lib/postgresql/.pgpass
  $> /var/lib/postgresql/.pgpass 
  10.0.3.114:5432:repmgr:repmgr:{{ REPMGR_PASSWORD }}
  10.0.2.113:5432:repmgr:repmgr:{{ REPMGR_PASSWORD }}


  # 停止新从节点
  $> sudo systemctl stop postgresql@16-main

  # 备份数据目录
  $> sudo mv /data/_pgsql_data/16/main /data/_pgsql_data/16/main.backup.$(date +%Y%m%d_%H%M%S)

  # 使用正确的配置重新克隆
  # host 为新主节点IP
  $> sudo -u postgres repmgr standby clone --force --verbose --host=10.0.3.114 --port=5432 --user=repmgr --dbname=repmgr

  # 启动从节点
  sudo systemctl start postgresql@16-main

  # 重新注册
  sudo -u postgres repmgr standby register --force

  # 验证
  sudo -u postgres repmgr node status
  sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver;"
  ```

# 其他
- 本文记录是根据实际搭建和测试完成后的草稿重新编写，实操时可能会有些新问题产生，有问题自行解决

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/pgsql%E4%B8%BB%E4%BB%8E%E5%A4%8D%E5%88%B6%E5%8F%8Arepmgr%E9%AB%98%E5%8F%AF%E7%94%A8/  

