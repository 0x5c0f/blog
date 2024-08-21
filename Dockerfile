FROM nginx:stable-alpine

LABEL org.opencontainers.image.authors="0x5c0f"
LABEL org.opencontainers.image.source="https://github.com/0x5c0f/blog"

COPY . /usr/share/nginx/html