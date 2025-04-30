# 自签证书的生成及可信列表的添加


# 1. 正文
## 1.1. 生成 CA 私钥

```bash
# 此处需要让你设置一个密码(好像可以直接忽略密码,但不晓得怎么操作)
## openssl genrsa -out ca.key 4096
openssl genrsa -des3 -out ca.key 4096

# 移除出私钥密码
openssl rsa -in ca.key -out ca.key
```

## 1.2. 生成 ca 证书
- subj 参数说明  

  | 字段   | 字段含义                  | 示例             |
  | :----- | :------------------------ | :--------------- |
  | `/C=`  | `Country` 国家            | `CN`             |
  | `/ST=` | `State or Province` 省    | `Chongqing`      |
  | `/L=`  | `Location or City` 城市   | `Shapingba`      |
  | `/O=`  | `Organization` 组织或企业 | `0x5c0f`         |
  | `/OU=` | `Organization Unit` 部门  | `ops`            |
  | `/CN=` | `Common Name` 域名或`IP`  | `blog.0x5c0f.cc` |

```bash
openssl req -utf8 -x509 -new -nodes -key ca.key -sha512 -days 18250 -out ca.pem -subj "/C=CN/ST=CQ/O=0x5c0f/CN=0x5c0f/emailAddress=mail@0x5c0f.cc"
```

## 1.3. 生成证书私钥
```bash
openssl genrsa -out server.key 4096
```

## 1.4. 生成域名签名
```bash
openssl req -new -key server.key -out server.csr -subj "/C=CN/ST=CQ/O=0x5c0f/CN=0x5c0f.cc/emailAddress=mail@0x5c0f.cc"
```

## 1.5. 创建扩展
- 后续有新域名,直接加入进去即可  
```bash
cat > server.ext <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth, codeSigning
subjectAltName = @alt_names
[alt_names]
DNS.1 = *.0x5c0f.cc
DNS.2 = *.51ac.cc
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF
```

## 1.6. 生成域名证书 
```bash
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out server.crt -days 1825 -sha512 -extfile server.ext
```

## 1.7. 可信列表添加
### 1.7.1. linux 
> [https://qastack.cn/unix/90450/adding-a-self-signed-certificate-to-the-trusted-list](https://qastack.cn/unix/90450/adding-a-self-signed-certificate-to-the-trusted-list)  

- 以`fedroa32`为例  
```
sudo cp -v ca.pem /etc/pki/ca-trust/source/anchors/ca.pem
sudo update-ca-trust 
```

### 1.7.2. windows 
- 以`win 10`为例
1. `win + R` 打开运行窗口, 键入 `mmc` 然后回车, 选择 `文件`-`添加/删除单元节点`。选择`证书`-`添加`，打开选项卡自行判断选择，完成即可。 

2. 上述完成后，在`mmc`控制台中就可以看到证书节点, 展开`证书`-`受信任的根证书颁发机构`，选择其下面`证书`,然后右键 `所有任务`-`导入`,导入生成的`ca.pem`即可，退出时会提示存储控制台的信息，可以忽略 

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E8%87%AA%E7%AD%BE%E8%AF%81%E4%B9%A6%E7%9A%84%E7%94%9F%E6%88%90%E5%8F%8A%E5%8F%AF%E4%BF%A1%E5%88%97%E8%A1%A8%E7%9A%84%E6%B7%BB%E5%8A%A0/  

