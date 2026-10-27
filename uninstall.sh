#!/bin/bash
set -e

SERVICE="subconverter-x"
BIN="/usr/local/bin/subconverter-x"
UNIT="/etc/systemd/system/$SERVICE.service"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/$SERVICE"

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ 请使用 root 卸载：curl -fsSL .../uninstall.sh | sudo bash"
  exit 1
fi

# 停止服务
systemctl stop "$SERVICE" 2>/dev/null || true
systemctl disable "$SERVICE" 2>/dev/null || true

# 删除二进制与 systemd unit
rm -f "$BIN" "$UNIT"
systemctl daemon-reload

if [ -d "$CONFIG_DIR" ]; then
  echo "检测到配置目录：$CONFIG_DIR"
  read -r -p "是否一并删除用户配置（规则、订阅设置、token）？此操作不可恢复。 [y/N] " ans || ans="n"
  if [[ "$ans" =~ ^[Yy]$ ]]; then
    rm -rf "$CONFIG_DIR"
    echo "🗑️  已删除用户配置：$CONFIG_DIR"
  else
    echo "📁 已保留用户配置：$CONFIG_DIR"
  fi
fi

echo "✅ 已卸载 subconverter-x"
