#!/bin/bash
# kilk 2.0 服务器部署脚本 - 第三部分：服务配置
set -e

echo "=== 1. 创建 .env ==="
cat > /var/www/kilk2/.env <<'EOF'
PORT=3001
DB_HOST=127.0.0.1
DB_USER=kilk
DB_PASSWORD=Kilk@Server2026
DB_NAME=kilk
JWT_SECRET=kilk2-2026-prod-secret-9f8e7d6c5b4a
CORS_ORIGIN=https://kilk.online
EOF
chmod 600 /var/www/kilk2/.env
echo "[OK] .env 创建完成"

echo "=== 2. 创建 systemd 服务 ==="
sudo tee /etc/systemd/system/kilk2.service > /dev/null <<'EOF'
[Unit]
Description=kilk 2.0 API Server
After=network.target postgresql.service

[Service]
Type=simple
User=admin
WorkingDirectory=/var/www/kilk2
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=3
EnvironmentFile=/var/www/kilk2/.env
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable kilk2
echo "[OK] systemd 服务创建完成"

echo "=== 3. 启动后端 ==="
sudo systemctl restart kilk2
sleep 3
sudo systemctl status kilk2 --no-pager | head -8

echo "=== 4. 测试后端 API ==="
curl -s http://127.0.0.1:3001/api/health
echo ""
echo "[OK] 后端启动验证完成"
