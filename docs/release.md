# 发版检查清单

每次打 tag 发布前，按顺序确认：

1. **版本一致** — `package.json` 的 `version` 与计划 tag 一致（如 `0.0.3` → `v0.0.3`）
2. **工作区干净** — `git status` 无未提交改动
3. **测试与类型** — `npm test` 与 `npx tsc --noEmit` 均通过
4. **核心路径** — 本地或 staging 验证：
   - `GET /health`
   - `GET /sub?url=...&target=clash`
   - `GET /sub?url=...&target=surge`
5. **透传路径** — 不带 `target` + 普通 UA，确认原样透传
6. **文档同步** — 若改了行为，核对 `README.md`、`docs/api.md`、`src/routes/openapi.ts`
7. **安装脚本** — `install.sh` / `uninstall.sh` 关键路径与文案无回归
8. **打 tag 发布** — `git tag vX.Y.Z && git push origin vX.Y.Z`
9. **检查 Release** — GitHub Actions Release workflow 成功，产物齐全（linux amd64 / arm64）
10. **版本接口** — `GET /version` 与 tag 一致

## 回滚

若 Release 产物有问题：

1. 在 GitHub Releases 标记问题版本
2. 用户可重新运行 `install.sh` 拉取上一稳定 tag 的二进制
3. 修复后打新 tag（不要移动已有 tag）
