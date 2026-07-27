#!/bin/bash
set -e

SERVICE="subconverter-x"

systemctl --user stop "$SERVICE" 2>/dev/null || true
systemctl --user disable "$SERVICE" 2>/dev/null || true

rm -f "$HOME/.config/systemd/user/$SERVICE.service"
rm -f "$HOME/.local/bin/$SERVICE"
rm -rf "$HOME/.config/$SERVICE"

echo "✅ Uninstalled"
