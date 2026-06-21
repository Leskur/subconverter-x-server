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
GET  /api/rules
PUT  /api/rules
GET  /api/templates/clash
PUT  /api/templates/clash
GET  /api/templates/singbox
PUT  /api/templates/singbox
```

**`target`** 可选值：`singbox` · `clash` · `surge` · `surfboard` · `loon` · `quanx`
不传则根据请求 `User-Agent` 自动识别；无法识别时原样透传上游内容。

## 规则集（`data/rules.yaml`）

Clash / Surge 输出时自动合并，支持 `prepend` / `append` / `replace` 三种合并模式。

```yaml
rules-merge: prepend
proxy-groups-merge: merge
rules:
  - GEOIP,CN,DIRECT
  - MATCH,PROXY
proxy-groups:
  - name: PROXY
    type: select
    proxies: []
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RULES_FILE` | `data/rules.yaml` | 规则集文件路径 |
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
└── profiles/       # 规则集 & 模板存储
data/rules.yaml
```

## License

MIT
