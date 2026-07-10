# 运维常见题-K8s容器



## K8s 有哪些应用场景？
## 简述 K8s 核心组件及作用？
## K8s 集群如何实现高可用？
## Pod 解决了什么问题？
## K8s 有哪些工作负载资源？
## 简述创建一个 Pod 的工作流程？
## Pod 有哪几种重启策略及应用场景？
## Pod 有哪几种探针（健康检查）及应用场景？
## Pod 有哪些状态及其原因？
## 初始化容器有哪些应用场景？
## Pod 超出资源限制时，K8s 会做什么动作？
## Pod 处于 Pending 状态可能是什么原因？
## 简述删除一个 Pod 的工作流程？
## K8s 出现大量 Pod 处于 Evicted 状态是什么原因？
## Deployment 滚动更新是怎么实现的？
## Deployment 如何控制滚动更新的快慢？
## Deployment 与 ReplicaSet 有什么联系？
## Deployment 与 StatefulSet 有什么区别？
## StatefulSet 为什么用 Headless Service？
## Service 有哪些功能？
## Service 有哪几种公开类型及应用场景？
## kube-proxy 有几种代理模式及原理？
## Endpoint 资源有什么作用？
## K8s 集群安装的网络插件有什么作用？
## Calico 有哪几种工作模式及原理？
## Service 与 Ingress 有什么区别？
## Ingress 与 Ingress Controller 的关系？
## Ingress 暴露的应用无法访问如何排查？
## Ingress 后端应用无法获取客户端 IP 如何解决？
## Ingress 环境提示上传文件过大怎么解决？
## 如何将 Pod 分配到指定节点上？
## K8s 调度器有哪些调度算法？
## 什么情况下会用到污点与容忍？
## PVC 和 PV 是什么？解决了什么问题？
## StorageClass 是什么？
## PV 的生命周期是怎样的？
## CSI（容器存储接口）有什么作用？
## 误删除 PVC，怎么恢复？
## emptyDir 和 hostPath 卷的应用场景？
## Secret 有哪些应用场景？
## RBAC 中 Role 和 ClusterRole 区别？
## RBAC 中 ServiceAccount 有什么作用？
## 如何提高 K8s 集群安全性？
## Metrics Server 有什么作用？
## 简述 HPA 的工作原理？
## 简述你对 Operator 的理解？
## 节点处于 NotReady 状态如何解决？
## 创建 1 万个 Pod 时，可能会遇到哪些问题？
## 微服务迁移 K8s 主要做哪些工作？会遇到哪些问题？
## 你在 K8s 运维中遇到过哪些问题？
## K8s 如何实现灰度发布？
## K8s 集群节点需要关机维护，怎么操作？
## Etcd 集群某节点故障怎么恢复？
## K8s 集群怎么备份？
## Etcd 有哪些参数可以优化？
## K8s 证书过期怎么续签？
## 微服务在升级过程中出现 500 错误是什么原因？
## 设计 500 台 K8s 集群重点考虑哪些问题？
## 怎么保障应用升级过程中不丢失流量？
## K8s 应该监控哪些关键指标？
## K8s 巡检都会做哪些项目？
## KubeVirt 了解过吗？
## K8s 多集群统一管理怎么做？
## Cilium 网络组件有什么优势？
## Cilium 有哪几种工作模式及原理？
## 数据库是否适合部署在 K8s 上？
## K8s 有哪些常见的存储方案？
## kube-proxy iptables 模式如何实现的负载均衡？
## Gateway 是什么？如何迁移现有 Ingress？
## K8s 容器运行时怎么选择？
## 简述 CRI、CNI、CSI 分别是什么，各自解决什么问题？
## 简述 Operator 具体开发流程？
## K8s CRD 是什么？怎么定义？
## K8s 节点磁盘不足，怎么定位到大文件？
## Pod 处于 Terminating 无法删除，如何强制清理？
## 开发人员反馈 K8s 中应用访问慢，该如何排查？
## 业务 Pod 频繁重启，该如何排查？
## 静态 Pod 是什么？有什么作用？
## Pod 中 pause 容器有什么作用？
## Kubernetes 准入控制器有什么用？
## kube-proxy 主要功能有哪些？
## kubectl top 命令的数据来源是哪里？

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/other/%E8%BF%90%E7%BB%B4%E5%B8%B8%E8%A7%81%E9%A2%98-k8s%E5%AE%B9%E5%99%A8/  

