# subconverter-x-server

轻量的订阅转换中间层。拉取上游订阅、解析多种协议，按客户端类型输出对应格式。

**协议**：VLESS（Reality）、VMess、Shadowsocks、Trojan、Hysteria2  
**输出格式**：Clash/Mihomo（YAML）· Surge/Shadowrocket（INI）· Surfboard（INI）· Loon（INI）· Quantumult X（INI）

## 快速开始

```bash
npm install
npm run dev      # 监听 :15500
```

生产：`npm run build && node dist/main.cjs`

测试：`npm test`

## 一键安装（Linux）

```bash
curl -fsSL https://raw.githubusercontent.com/Leskur/subconverter-x-server/main/install.sh | bash
```

卸载（会询问是否删除用户配置）：

```bash
curl -fsSL https://raw.githubusercontent.com/Leskur/subconverter-x-server/main/uninstall.sh | bash
```

## 使用

```bash
# 自动识别客户端（依赖 User-Agent）
curl "http://localhost:15500/sub?url=https://example.com/sub"

# 强制指定目标客户端
curl "http://localhost:15500/sub?url=https://example.com/sub&target=clash"
curl "http://localhost:15500/sub?url=https://example.com/sub&target=surge"
```

`target` 可选值：`clash` · `surge` · `surfboard` · `loon` · `quanx`。  
不传时按 `User-Agent` 自动识别；无法识别时原样透传上游内容。

## 文档

- 交互式 API 文档：启动后访问 `/docs`
- API 详述与示例：[`docs/api.md`](docs/api.md)
- 发版检查清单：[`docs/release.md`](docs/release.md)

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `15500` | 监听端口 |
| `CORS_ORIGIN` | `*` | 分离部署时的 CORS 来源 |
| `ADMIN_TOKEN` | （无） | 管理接口 token；不设则自动生成 |

## License

MIT
