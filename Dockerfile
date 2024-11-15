FROM registry.cn-chengdu.aliyuncs.com/0x5c0f/nginx:stable-alpine

LABEL org.opencontainers.image.authors="0x5c0f"
LABEL org.opencontainers.image.source="https://github.com/0x5c0f/blog"

# 开启 404 支持
RUN set -ex && sed -i 's/^\s*#\s*\(error_page\s\+404\)/\1/' /etc/nginx/conf.d/default.conf

COPY . /usr/share/nginx/html