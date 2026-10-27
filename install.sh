#!/bin/bash
set -e

REPO="Leskur/subconverter-x-server"
SERVICE="subconverter-x"
BIN="/usr/local/bin/subconverter-x"
UNIT="/etc/systemd/system/$SERVICE.service"

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ 请使用 root 安装：curl -fsSL .../install.sh | sudo bash"
  exit 1
fi

ARCH=$(uname -m)
case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64) ARCH="arm64" ;;
  *) echo "❌ 不支持的架构: $ARCH"; exit 1 ;;
esac

# 获取最新 release tag
TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
if [ -z "$TAG" ]; then
  echo "❌ 未找到 release"
  exit 1
fi

URL="https://github.com/$REPO/releases/download/$TAG/subconverter-x-linux-$ARCH"

echo "⬇️  下载 $TAG ($ARCH)"
echo "   $URL"

# 停止旧服务
systemctl stop "$SERVICE" 2>/dev/null || true

# 下载二进制文件
mkdir -p "$(dirname "$BIN")"
curl -fsSL "$URL" -o "$BIN"
chmod +x "$BIN"

# 注册系统服务
cat > "$UNIT" << EOF
[Unit]
Description=subconverter-x
After=network.target

[Service]
ExecStart=$BIN
Environment=PORT=${PORT:-15500}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# 启动
systemctl daemon-reload
systemctl enable "$SERVICE"
systemctl restart "$SERVICE"

echo "✅ Done: http://0.0.0.0:${PORT:-15500}"
echo "🔑 查看认证 Token: cat ~/.config/subconverter-x/config.yaml"
echo "📋 服务状态: systemctl status $SERVICE"
echo "📜 查看日志: journalctl -u $SERVICE -f"
