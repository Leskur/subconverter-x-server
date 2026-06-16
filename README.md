# subconverter-x

> 抛弃臃肿，极致精简。基于 TypeScript 构建的现代化订阅解析与转换引擎。

**subconverter-x** 是一个轻量的订阅中间层：拉取上游订阅、解析多种协议与格式，再按客户端类型输出 Sing-box / Clash 等格式。支持云函数与 Node SEA 单文件部署。

## 特性

- **多格式摄入**：URI 列表、Base64 订阅、Clash YAML（含 `proxies` / `proxy-groups`）
- **多协议解析**：VLESS（含 Reality）、Shadowsocks（SIP002）、Trojan、VMess
- **智能路由**：根据 `User-Agent` 识别客户端，或通过 `target` 强制指定输出格式
- **上游透传**：转发客户端请求头拉取订阅；无法识别客户端时原样返回上游内容
- **兜底重试**：解析失败时自动用浏览器 UA 重试一次
- **多种部署**：本地 HTTP 服务、云函数（`lambda.cjs`）、Node SEA 单文件可执行程序

## 快速开始

### 环境要求

- Node.js 20+
- npm 或 pnpm

### 安装与运行

```bash
npm install
cd admin && npm install && cd ..

npm run dev              # 后端 API（:3000）
npm run dev:admin        # Admin 前端（:5173，代理 /api、/health）
```

一体部署访问 Admin：先 `npm run build:admin`，再 `npm run dev`，打开 http://127.0.0.1:3000/admin

默认监听 `0.0.0.0:3000`，本机与局域网均可访问。启动后会打印 `Local` 与 `Network` 地址。

### 测试与构建

```bash
npm test                 # 运行测试
npm run build            # 仅打包核心（standalone + lambda）
npm run build:admin      # 打包 Admin（base=/admin/，一体部署）
npm run build:all        # Admin + 核心，Admin 打进 dist/admin
npm run build:sea        # 生成单文件可执行程序（需在目标平台执行）
```

## HTTP API

```text
GET /health
GET /admin
GET /api/admin/meta
GET /api/rules
PUT /api/rules
GET /sub?url=<upstream>&target=<singbox|clash|surge>
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `url` | 是 | 上游订阅链接（http/https） |
| `target` | 否 | 强制输出格式：`singbox` / `clash` / `surge` |
| `ua` | 否 | `target` 的别名，向后兼容 |

### Web Admin

一体部署入口：`/admin`（hash 路由，如 `#/subscription`）

| 页面 | 说明 |
|------|------|
| 仪表盘 | 服务状态、规则/代理组数量、快捷入口 |
| 订阅 | 生成 `/sub` 链接、测试拉取、最近上游记录（浏览器 localStorage） |
| 规则 | 编辑 `rules`，配置与上游的合并方式 |
| 代理组 | 编辑 `proxy-groups`，配置与上游的合并方式 |
| 设置 | Admin Token、API 连接信息 |

开发时 Admin 默认 http://127.0.0.1:5173 ，通过 Vite 代理访问后端。

### 规则集管理

- Web 界面：`/admin` → **规则** / **代理组**
- API：`GET/PUT /api/rules`
- 存储文件：`data/rules.yaml`（可用环境变量 `RULES_FILE` 覆盖）
- Clash / Surge 输出时**自动合并**该文件中的 `rules` 与 `proxy-groups`
- **合并模式**（写入 `rules.yaml`）：
  - `rules-merge`：`replace`（仅自定义）/ `prepend`（自定义+上游）/ `append`（上游+自定义）
  - `proxy-groups-merge`：`replace`（仅自定义）/ `merge`（与上游按名称合并）
- 自定义 rules 为空时回退上游 rules；自定义 proxy-groups 为空时回退上游 groups
- `PUT` 为部分更新：未传字段保留现有值（规则页与代理组页分别只提交各自字段）
- 可选鉴权：设置 `ADMIN_TOKEN` 后，`PUT` 需 `Authorization: Bearer <token>`（Token 在 Admin 设置页保存到浏览器本地）
- 关闭 Admin 静态托管：`SERVE_ADMIN=0`（仅 API，适合云函数）
- 分离部署 CORS：`CORS_ORIGIN=https://admin.example.com`（默认 `*`）
- 旧接口 `/api/profiles` 已移除（返回 410），请使用 `/api/rules`

#### `GET /api/rules` 响应示例

```json
{
  "rules": ["GEOIP,CN,DIRECT", "MATCH,PROXY"],
  "proxyGroups": [{ "name": "PROXY", "type": "select", "proxies": [] }],
  "rulesMerge": "replace",
  "proxyGroupsMerge": "replace"
}
```

#### `data/rules.yaml` 示例

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

磁盘 YAML 使用 `rules-merge` / `proxy-groups-merge`（kebab-case）；JSON API 使用 `rulesMerge` / `proxyGroupsMerge`（camelCase）。

### 输出格式判定

优先级：**`target` / `ua` > 请求 User-Agent 嗅探 > 浏览器透传**

| 情况 | 行为 |
|------|------|
| 指定 `target` | 按目标格式转换 |
| UA 可识别（Clash / Sing-box / Surge 等） | 自动匹配对应格式 |
| UA 无法识别（浏览器、curl 等） | 原样返回上游订阅内容 |

### 示例

```text
# Clash 客户端订阅（自动识别 UA）
GET /sub?url=https%3A%2F%2Fexample.com%2Fsub

# 强制 Clash 输出（自动合并 data/rules.yaml）
GET /sub?url=https%3A%2F%2Fexample.com%2Fsub&target=clash

# 浏览器查看原始订阅
GET /sub?url=https%3A%2F%2Fexample.com%2Fsub
```

## 项目结构

```text
src/                  # 核心后端
├── core/             # 业务逻辑（摄入、解析、路由、转换）
├── formatters/       # Sing-box JSON / Clash YAML 输出
├── adapters/         # HTTP handler、standalone、lambda
├── profiles/         # 规则集存储与合并逻辑
admin/                # Admin 前端（Vite + React + shadcn/ui）
data/rules.yaml       # Clash 规则集（单文件）
```

## 部署

| 形态 | 说明 |
|------|------|
| **本地 / 服务器** | `npm run dev` 或 `node dist/standalone.cjs serve` |
| **一体部署（含 Admin）** | `npm run build:all` → 访问 `/admin` |
| **Admin 分离部署** | `cd admin && npm run build:standalone`，配置 `VITE_API_BASE` 指向 API |
| **仅 API（无 Admin）** | `SERVE_ADMIN=0 npm run build` |
| **单文件可执行** | `npm run build:sea` → `dist/subconverter-x` |
| **云函数** | 上传 `dist/lambda.cjs`，入口 `handler` |

### Admin 分离部署示例

```bash
cd admin
npm install

# 创建 admin/.env.standalone（构建时读取）
# VITE_API_BASE=https://api.example.com
# VITE_PUBLIC_API_URL=https://api.example.com

npm run build:standalone
# 将 dist/ 部署到 CDN 或静态服务器
```

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE` | Admin 请求 API 的前缀（分离部署必填） |
| `VITE_PUBLIC_API_URL` | 订阅页生成的 `/sub` 链接中的 API 域名 |
| `VITE_DEV_API_PROXY` | 仅开发：`dev:admin` 时代理目标，默认 `http://127.0.0.1:3000` |

API 服务端设置 `CORS_ORIGIN=https://你的Admin域名`（可选）。

### 环境变量（后端）

| 变量 | 说明 |
|------|------|
| `RULES_FILE` | 规则集文件路径，默认 `data/rules.yaml` |
| `ADMIN_TOKEN` | 启用后 `PUT /api/rules` 需 Bearer Token |
| `SERVE_ADMIN` | 设为 `0` 关闭 `/admin` 静态托管 |
| `CORS_ORIGIN` | Admin 分离部署时的 CORS 来源，默认 `*` |
| `LOG_BODY` | 设为 `1` 打印完整请求/响应 body |

## 开发说明

- 调试日志：设置 `LOG_BODY=1` 可打印完整请求/响应 body
- 上游 SSRF 防护：禁止访问内网地址
- 规则集保存在**服务端** `data/rules.yaml`；Admin Token 与最近上游 URL 保存在**浏览器** localStorage
- 待办与规划见 [TODO.md](./TODO.md)

## License

MIT
