#!/bin/bash
set -e

SERVICE="subconverter-x"
BIN="$HOME/.local/bin/subconverter-x"
UNIT="$HOME/.config/systemd/user/$SERVICE.service"

# 停止服务
systemctl --user stop "$SERVICE" 2>/dev/null || true
systemctl --user disable "$SERVICE" 2>/dev/null || true

# 删除文件
rm -f "$BIN" "$UNIT"

systemctl --user daemon-reload

echo "✅ 已卸载 subconverter-x"
