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
npm run dev              # 后端 API（:15500）
```

默认监听 `0.0.0.0:15500`，本机与局域网均可访问。启动后会打印 `Local` 与 `Network` 地址。

### 测试与构建

```bash
npm test                 # 运行测试
npm run build            # 打包（standalone + lambda + 二进制可执行文件）
```

## HTTP API

```text
GET /health
GET /api/admin/meta
GET /api/rules
PUT /api/rules
GET /api/templates/clash
PUT /api/templates/clash
GET /api/templates/clash/default
GET /api/templates/singbox
PUT /api/templates/singbox
GET /api/templates/singbox/default
GET /sub?url=<订阅链接>&target=<singbox|clash|surge>
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `url` | 是 | 上游订阅链接（http/https） |
| `target` | 否 | 强制输出格式：`singbox` / `clash` / `surge` |
| `ua` | 否 | `target` 的别名，向后兼容 |

### Web Admin

项目已拆分为独立仓库：[subconverter-x-web](https://github.com/Leskur/subconverter-x-web)。

部署后访问 Admin 页面管理规则集与代理组。

### 模板管理

当上游订阅为 Base64 或纯 URI 列表（无 proxy-groups）时，后端会自动套用对应客户端的默认模板，补全 `proxy-groups`、DNS、top-level 配置等字段。

- **获取当前模板**：`GET /api/templates/clash`（或 `singbox`）
- **保存自定义模板**：`PUT /api/templates/clash`，Body 为 YAML 文本（需 `Authorization` 头，若设置了 `ADMIN_TOKEN`）
- **获取内置默认模板**：`GET /api/templates/clash/default`（只读，不受用户保存影响）
- **存储路径**（平台相关）：
  - Windows：`%APPDATA%\subconverter-x\template-clash.yaml`
  - macOS：`~/Library/Application Support/subconverter-x/template-clash.yaml`
  - Linux：`~/.config/subconverter-x/template-clash.yaml`（遵循 `XDG_CONFIG_HOME`）
- 文件不存在时自动回退到代码内置默认模板
- **默认模板源文件**：`src/profiles/template-clash.yaml` / `src/profiles/template-singbox.json`，打包前可直接编辑修改默认值

#### proxy-groups 自动填充

模板中 `proxy-groups` 的 `proxies` 为空数组 `[]` 时，输出时会自动填充为所有节点名称，无需手动列举节点。

#### Admin 页面 - 模板编辑

Admin 页面「模板」标签提供两个按钮：
- **还原**：放弃本次编辑，恢复到上次保存的内容
- **恢复默认**：将编辑器内容替换为代码内置默认模板（不自动保存，确认后点保存生效）

> 计划：后续版本将支持「源码 / 可视化」双模式切换，可视化模式直接编辑端口、DNS、代理组等常用字段，高级用户仍可切到源码模式完整编辑。

### 规则集管理

- API：`GET/PUT /api/rules`
- 存储文件：`data/rules.yaml`（可用环境变量 `RULES_FILE` 覆盖）
- Clash / Surge 输出时**自动合并**该文件中的 `rules` 与 `proxy-groups`
- **合并模式**（写入 `rules.yaml`）：
  - `rules-merge`：`replace`（仅自定义）/ `prepend`（自定义+上游）/ `append`（上游+自定义）
  - `proxy-groups-merge`：`replace`（仅自定义）/ `merge`（与上游按名称合并）
- 自定义 rules 为空时回退上游 rules；自定义 proxy-groups 为空时回退上游 groups
- `PUT` 为部分更新：未传字段保留现有值（规则页与代理组页分别只提交各自字段）
- 可选鉴权：设置 `ADMIN_TOKEN` 后，`PUT` 需 `Authorization: Bearer <token>`（Token 在 Admin 设置页保存到浏览器本地）
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
src/                          # 核心后端
├── core/                     # 业务逻辑（摄入、解析、路由、转换）
├── formatters/               # Sing-box JSON / Clash YAML 输出
├── adapters/                 # HTTP handler、standalone、lambda
├── profiles/                 # 规则集 & 模板存储与合并逻辑
│   ├── template-clash.yaml   # 内置 Clash 默认模板（可直接编辑）
│   └── template-singbox.json # 内置 Sing-box 默认模板（可直接编辑）
data/rules.yaml               # Clash 规则集（单文件）
```

## 部署

### 本地 / 服务器部署

```bash
# 克隆仓库
git clone https://github.com/Leskur/subconverter-x.git
cd subconverter-x

# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 生产模式
npm run build
node dist/standalone.cjs serve
```

默认监听 `0.0.0.0:15500`，支持局域网访问。

### Docker 部署

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY data/ ./data/
EXPOSE 15500
CMD ["node", "dist/standalone.cjs", "serve"]
```

```bash
docker build -t subconverter-x .
docker run -d -p 15500:15500 -v $(pwd)/data:/app/data subconverter-x
```

### PM2 进程管理

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start dist/standalone.cjs --name subconverter-x -- serve

# 开机自启
pm2 startup
pm2 save
```

### Linux 系统服务安装

**前置要求：**
- Node.js 20+
- systemd 系统（Ubuntu 16.04+, CentOS 7+, Debian 8+）

```bash
# 克隆项目
git clone https://github.com/Leskur/subconverter-x.git
cd subconverter-x/backend

# 默认安装（无需 sudo）
./install.sh

# 自定义安装
./install.sh -p 8080 -t mytoken

# 卸载服务
./uninstall.sh
```

**安装特性：**
- 构建单文件可执行程序
- 用户级安装，无需 sudo
- 自动创建 systemd 用户服务
- 配置文件：`~/.config/subconverter-x/`

**服务管理：**
```bash
# 查看状态
systemctl --user status subconverter-x

# 启动/停止/重启
systemctl --user restart subconverter-x

# 查看日志
journalctl --user -u subconverter-x -f

# 开机自启
systemctl --user enable subconverter-x
```

### 单文件可执行程序

```bash
# 构建单文件（在目标平台执行）
npm run build:sea

# 运行
./dist/subconverter-x serve
```

### 云函数部署

**Vercel**
```bash
# vercel.json
{
  "functions": {
    "api/index.js": {
      "handler": "dist/lambda.handler"
    }
  }
}
```

**AWS Lambda**
- 上传 `dist/lambda.cjs`
- 入口函数：`handler`
- 内存：256MB+
- 超时：30秒

### Admin 分离部署

参考 [subconverter-x-web](https://github.com/Leskur/subconverter-x-web) 仓库的部署说明。

### 常见部署场景

#### 场景 1：个人订阅转换（无认证）

```bash
# 直接运行
npm run dev
```

访问：`http://localhost:15500/sub?url=你的订阅链接`

#### 场景 2：家庭共享（局域网访问）

```bash
# 监听所有接口
npm run dev
# 或生产环境
node dist/standalone.cjs serve --host 0.0.0.0 --port 15500
```

局域网设备访问：`http://192.168.1.100:15500/sub?url=订阅链接`

#### 场景 3：公网服务（启用认证）

```bash
# 设置 Admin Token
export ADMIN_TOKEN=your-secret-token
export CORS_ORIGIN=https://your-admin-domain.com

node dist/standalone.cjs serve
```

Admin 访问需要 Header：`Authorization: Bearer your-secret-token`

#### 场景 4：Nginx 反向代理

```nginx
server {
    listen 80;
    server_name sub.example.com;
    
    location / {
        proxy_pass http://127.0.0.1:15500;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 场景 5：自定义规则文件路径

```bash
# 使用自定义规则文件
export RULES_FILE=/path/to/custom-rules.yaml
node dist/standalone.cjs serve
```

### 环境变量（后端）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RULES_FILE` | `data/rules.yaml` | 规则集文件路径，支持绝对路径 |
| `ADMIN_TOKEN` | 未设置 | 启用后 `PUT /api/rules` / `PUT /api/templates/*` 需 Bearer Token |
| `CORS_ORIGIN` | `*` | Admin 分离部署时的 CORS 来源，生产环境建议设置具体域名 |
| `LOG_BODY` | 未设置 | 设为 `1` 打印完整请求/响应 body，调试用 |

#### 最佳实践

**生产环境**
```bash
# 启用认证和限制 CORS
export ADMIN_TOKEN="$(openssl rand -hex 16)"
export CORS_ORIGIN="https://your-admin-domain.com"

# 使用绝对路径避免工作目录问题
export RULES_FILE="/opt/subconverter-x/rules.yaml"

# 调试时才开启
# export LOG_BODY=1
```

**开发环境**
```bash
# 无需认证，方便调试
# export ADMIN_TOKEN=""
export CORS_ORIGIN="*"
export LOG_BODY=1
```

**Docker 环境**
```yaml
# docker-compose.yml
environment:
  - ADMIN_TOKEN=${ADMIN_TOKEN}
  - CORS_ORIGIN=${CORS_ORIGIN:-*}
  - RULES_FILE=/app/data/rules.yaml
```

## 故障排除

### 常见问题

**Q: 服务启动失败，提示端口被占用**
```bash
# 查找占用端口的进程
netstat -tulpn | grep :15500
# 或使用其他端口
node dist/standalone.cjs serve --port 3001
```

**Q: 无法访问局域网地址**
```bash
# 确保监听所有接口
node dist/standalone.cjs serve --host 0.0.0.0
# 检查防火墙设置
sudo ufw allow 15500
```

**Q: 规则文件格式错误**
```bash
# 验证 YAML 格式
npm install -g js-yaml
js-yaml data/rules.yaml
# 查看详细错误日志
LOG_BODY=1 node dist/standalone.cjs serve
```

**Q: Admin 页面无法连接 API**
- 检查 `CORS_ORIGIN` 设置
- 确认 `VITE_API_BASE` 环境变量正确
- 查看浏览器控制台 CORS 错误

**Q: 订阅转换失败**
```bash
# 启用调试日志
LOG_BODY=1 node dist/standalone.cjs serve
# 检查上游链接是否可访问
curl -I "上游订阅链接"
```

**Q: 内存不足错误**
```bash
# 增加 Node.js 内存限制
node --max-old-space-size=512 dist/standalone.cjs serve
```

### 日志分析

**正常启动日志**
```
subconverter-x listening on http://0.0.0.0:15500
  Local:   http://127.0.0.1:15500
  Network: http://192.168.1.100:15500
```

**错误日志示例**
```
Error: Invalid rules.yaml at line 3: missing required field 'rules'
Error: Failed to fetch upstream: timeout
```

## 开发说明

- 调试日志：设置 `LOG_BODY=1` 可打印完整请求/响应 body
- 上游 SSRF 防护：禁止访问内网地址
- 规则集保存在**服务端** `data/rules.yaml`；Admin Token 与最近上游 URL 保存在**浏览器** localStorage
- 待办与规划见 [TODO.md](./TODO.md)

## License

MIT
