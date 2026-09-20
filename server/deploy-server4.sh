#!/bin/bash
# kilk 2.0 服务器部署 - 第四部分：Apache 配置
set -e

echo "=== 1. 启用 proxy 模块 ==="
sudo a2enmod proxy proxy_http 2>&1 | tail -2

echo "=== 2. 创建 80 端口配置 ==="
sudo tee /etc/apache2/sites-available/kilk2_http.conf > /dev/null <<'EOF'
<VirtualHost *:80>
    ServerName kilk.online
    ServerAlias www.kilk.online
    Redirect permanent / https://kilk.online/
</VirtualHost>
EOF

echo "=== 3. 创建 443 端口配置 ==="
sudo tee /etc/apache2/sites-available/kilk2_ssl.conf > /dev/null <<'EOF'
<VirtualHost *:443>
    ServerName kilk.online
    ServerAlias www.kilk.online

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/kilk.online.crt
    SSLCertificateKeyFile /etc/ssl/private/kilk.online.key

    DocumentRoot /var/www/kilk2/frontend
    <Directory /var/www/kilk2/frontend>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        FallbackResource /index.html
    </Directory>

    # 上传图片（帖子图片/头像/服务文件）
    Alias /upload/ /var/www/kilk2/public/upload/
    <Directory /var/www/kilk2/public/upload>
        Options -Indexes
        Require all granted
    </Directory>

    # API 反向代理到 Node 后端
    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:3001/api
    ProxyPassReverse /api http://127.0.0.1:3001/api

    ErrorLog ${APACHE_LOG_DIR}/kilk2_error.log
    CustomLog ${APACHE_LOG_DIR}/kilk2_access.log combined
</VirtualHost>
EOF

echo "=== 4. 切换站点配置 ==="
sudo a2dissite simple_site.conf 2>&1 | tail -1
sudo a2dissite simple_site_ssl.conf 2>&1 | tail -1
sudo a2ensite kilk2_http.conf 2>&1 | tail -1
sudo a2ensite kilk2_ssl.conf 2>&1 | tail -1

echo "=== 5. 测试配置并重启 Apache ==="
sudo apache2ctl configtest 2>&1
sudo systemctl restart apache2
sleep 2
echo "[OK] Apache 重启完成"

echo "=== 6. 本机验证 ==="
echo "--- HTTPS 首页 ---"
curl -skI --resolve kilk.online:443:127.0.0.1 https://kilk.online/ | head -6
echo "--- API 健康 ---"
curl -sk --resolve kilk.online:443:127.0.0.1 https://kilk.online/api/health
echo ""
echo "--- 上传图片 ---"
curl -skI --resolve kilk.online:443:127.0.0.1 https://kilk.online/upload/avatar_20260902104919_6a978eaf9c5d9.jpg | head -4
echo "[OK] 全部验证完成"
