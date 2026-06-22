# subconverter-x

轻量的订阅转换中间层。拉取上游订阅、解析多种协议，按客户端类型输出对应格式。

**协议**：VLESS（Reality）、VMess、Shadowsocks、Trojan、Hysteria2

**输出格式**：Sing-box · Clash/Mihomo · Surge · Surfboard · Loon · Quantumult X

## 快速开始

```bash
npm install
npm run dev      # 监听 :15500
```

生产：`npm run build && node dist/standalone.cjs serve`

## API

```
GET  /sub?url=<订阅链接>&target=<格式>
GET  /version
GET  /api/rules
PUT  /api/rules
GET  /api/rules/default
POST /api/rules/reset
```

**`target`** 可选值：`singbox` · `clash` · `surge` · `surfboard` · `loon` · `quanx`
不传则根据请求 `User-Agent` 自动识别；无法识别时原样透传上游内容。

## 规则

默认规则内置在代码中，用户自定义规则保存在系统应用数据目录（`~/.config/subconverter-x/rules.yaml` 或 `%APPDATA%/subconverter-x/rules.yaml`）。

- `GET /api/rules` — 返回用户规则，无则返回默认规则
- `GET /api/rules/default` — 返回默认规则
- `POST /api/rules/reset` — 删除用户规则，恢复默认

Clash / Surge 输出时自动合并，支持 `prepend` / `append` / `replace` 三种合并模式。

```yaml
rules-merge: replace
rules:
  - GEOIP,CN,DIRECT
  - MATCH,PROXY
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 监听端口 |
| `ADMIN_TOKEN` | 未设置 | 设置后 PUT 接口需 `Authorization: Bearer <token>` |
| `CORS_ORIGIN` | `*` | Admin 分离部署时的 CORS 来源 |
| `LOG_BODY` | 未设置 | 设为 `1` 打印完整响应 body |

## 项目结构

```
src/
├── core/           # 摄入、解析、转换、格式分发
│   └── parsers/    # 协议解析器（VLESS/VMess/SS/Trojan/Hysteria2）
├── formatters/     # Clash · Sing-box · Surfboard · Loon · QuanX
├── adapters/       # HTTP handler、standalone、lambda
├── rules/          # 规则存储与合并
└── templates/      # 输出模板存储
scripts/
├── build.mjs       # esbuild 打包 + SEA 单文件构建
├── install.sh      # systemd 用户服务安装
├── uninstall.sh    # 卸载
└── sea-config.json # SEA 打包配置
```

## 部署

### 服务器部署

```bash
npm run build
bash scripts/install.sh    # 安装到 ~/.local/bin 并注册 systemd 服务
```

## License

MIT
