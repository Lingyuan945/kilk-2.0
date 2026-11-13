#!/bin/bash
# kilk 2.0 服务器部署脚本 - 第二部分
set -e

echo "=== 1. 复制 1.0 历史图片到 2.0 上传目录 ==="
sudo cp -r /var/www/simple_site/upload/. /var/www/kilk2/public/upload/
sudo chown -R admin:admin /var/www/kilk2/public/upload
echo "[OK] 图片复制完成: $(find /var/www/kilk2/public/upload -type f | wc -l) 个文件"

echo "=== 2. 导入数据库 ==="
sudo -u postgres psql -d kilk -f /var/www/kilk2/db_dump.sql
echo "[OK] 数据导入完成"

echo "=== 3. 安装后端依赖 ==="
cd /var/www/kilk2
npm install --omit=dev --no-audit --no-fund 2>&1 | tail -3
echo "[OK] 依赖安装完成"

echo "=== 4. 清理临时文件 ==="
rm -f /var/www/kilk2/db_dump.sql
echo "[OK] 清理完成"
