# Build from the repository root:  docker build -f web/Dockerfile .
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html 404.html manifest.webmanifest sw.js favicon.svg robots.txt /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY assets /usr/share/nginx/html/assets
EXPOSE 8080
