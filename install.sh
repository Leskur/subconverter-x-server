#!/bin/bash
set -e

SERVICE="subconverter-x"
BIN="$HOME/.local/bin/subconverter-x"
RULES="$HOME/.config/$SERVICE/rules.yaml"
UNIT="$HOME/.config/systemd/user/$SERVICE.service"

[ -f "dist/subconverter-x" ] || { echo "❌ 请先运行 npm run build"; exit 1; }

# 停止旧服务
systemctl --user stop "$SERVICE" 2>/dev/null || true

# 安装二进制文件
mkdir -p "$(dirname "$BIN")"
cp dist/subconverter-x "$BIN"
chmod +x "$BIN"

# 复制默认规则（首次）
mkdir -p "$(dirname "$RULES")"
[ ! -f "$RULES" ] && cp data/rules.yaml "$RULES"

# 注册服务
mkdir -p "$(dirname "$UNIT")"
cat > "$UNIT" << EOF
[Unit]
Description=subconverter-x
After=network.target

[Service]
ExecStart=$BIN serve
Environment=PORT=${PORT:-15500}
Environment=RULES_FILE=$RULES
Restart=always

[Install]
WantedBy=default.target
EOF

# 启动
systemctl --user daemon-reload
systemctl --user enable "$SERVICE"
systemctl --user restart "$SERVICE"

echo "✅ Done: http://0.0.0.0:${PORT:-15500}"
