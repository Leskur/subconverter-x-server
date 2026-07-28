# subconverter-x-server

轻量的订阅转换中间层。拉取上游订阅、解析多种协议，按客户端类型输出对应格式。

**协议**：VLESS（Reality）、VMess、Shadowsocks、Trojan、Hysteria2

**输出格式**：Clash/Mihomo · Surge · Surfboard · Loon · Quantumult X

## 快速开始

```bash
npm install
npm run dev      # 监听 :15500
```

生产：`npm run build && node dist/main.cjs`

## 一键安装（Linux）

```bash
curl -fsSL https://raw.githubusercontent.com/Leskur/subconverter-x-server/main/install.sh | bash
```

卸载：

```bash
curl -fsSL https://raw.githubusercontent.com/Leskur/subconverter-x-server/main/uninstall.sh | bash
```

## API

```
GET  /sub?url=<订阅链接>&target=<格式>
GET  /health
GET  /version
GET  /api/admin/meta
GET  /api/rules
PUT  /api/rules
GET  /api/rules/default
POST /api/rules/reset
GET  /api/rulesets
PUT  /api/rulesets
GET  /api/subscription
PUT  /api/subscription
```

交互式 API 文档：`/docs`

**`target`** 可选值：`clash` · `surge` · `surfboard` · `loon` · `quanx`  
不传则根据请求 `User-Agent` 自动识别；无法识别时原样透传上游内容。

客户端能力（输出时会过滤不支持的协议）见 `src/core/capabilities.ts`：

| 客户端 | SS | VMess | Trojan | Hysteria2 | VLESS | raw |
|--------|----|-------|--------|-----------|-------|-----|
| clash | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| surge | ✓ | ✓ | ✓ | ✓ | | |
| surfboard | ✓ | ✓ | ✓ | ✓ | | |
| loon | ✓ | ✓ | ✓ | ✓ | ✓ | |
| quanx | ✓ | ✓ | ✓ | ✓ | ✓ | |

> `surge`（含 Shadowrocket）输出 Surge INI；`clash` 输出 Clash YAML。

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

## 认证

写接口（`PUT` / `POST`）需要 Bearer Token：

- 设置环境变量 `ADMIN_TOKEN` 时使用该值
- 未设置时，首次启动会自动生成并写入应用数据目录，同时在控制台打印 `Auth token: ...`

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `15500` | 监听端口 |
| `CORS_ORIGIN` | `*` | 分离部署时的 CORS 来源 |
| `ADMIN_TOKEN` | （无） | 管理接口 token；不设则自动生成 |

## 项目结构

```
src/
├── app.ts          # Hono 应用 + 路由组合
├── main.ts         # 启动入口
├── core/           # 摄入、解析、转换、格式分发、客户端能力表
├── parsers/        # 协议解析器（VLESS/VMess/SS/Trojan/Hysteria2）
├── formatters/     # Clash · Surge · Surfboard · Loon · QuanX
├── routes/         # HTTP 路由 + OpenAPI 文档
├── rules/          # 规则存储与合并
├── config/         # 配置存储（token、订阅设置）
├── subscription/   # 订阅设置
└── utils/          # 工具函数
scripts/
├── build.mjs       # esbuild 打包 + SEA 单文件构建
└── sea-config.json # SEA 打包配置
```

## 维护

发版前检查见 [docs/release.md](docs/release.md)。

## License

MIT
