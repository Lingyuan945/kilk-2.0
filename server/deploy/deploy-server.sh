#!/bin/bash
# kilk 2.0 服务器部署脚本（分步执行）
set -e

echo "=== 1. 解压代码 ==="
sudo mkdir -p /var/www/kilk2
cd /var/www/kilk2
sudo tar xzf /home/admin/kilk2_frontend.tar.gz
if [ -d output ]; then sudo mv output frontend; fi
sudo tar xzf /home/admin/kilk2_server.tar.gz -C /var/www/kilk2
sudo chown -R admin:admin /var/www/kilk2
ls -la /var/www/kilk2 | head -20
echo "[OK] 解压完成"

echo "=== 2. 创建 PG 用户和数据库 ==="
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='kilk'" | grep -q 1 || sudo -u postgres psql -c "CREATE USER kilk WITH PASSWORD 'Kilk@Server2026';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='kilk'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE kilk OWNER kilk;"
echo "[OK] 数据库创建完成"

echo "=== 3. 导入数据 ==="
sudo -u postgres psql -d kilk -f /home/admin/kilk_db_dump.sql
echo "[OK] 数据导入完成"

echo "=== 4. 安装后端依赖 ==="
cd /var/www/kilk2
npm install --omit=dev --no-audit --no-fund 2>&1 | tail -3
echo "[OK] 依赖安装完成"

echo "=== 5. 创建 .env ==="
cat > /var/www/kilk2/.env <<'EOF'
PORT=3001
DB_HOST=127.0.0.1
DB_USER=kilk
DB_PASSWORD=Kilk@Server2026
DB_NAME=kilk
JWT_SECRET=kilk2-2026-prod-secret-9f8e7d6c5b4a
CORS_ORIGIN=https://kilk.online
EOF
echo "[OK] .env 创建完成"

echo "=== 6. 创建 systemd 服务 ==="
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
