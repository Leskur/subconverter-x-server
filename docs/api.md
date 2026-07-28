# subconverter-x API 文档

## 目录

- [订阅转换](#订阅转换)
- [健康检查](#健康检查)
- [管理元信息](#管理元信息)
- [自定义规则](#自定义规则)
- [自定义规则集](#自定义规则集)
- [认证](#认证)
- [支持的客户端](#支持的客户端)
- [客户端 × 协议能力](#客户端--协议能力)
- [支持的代理类型](#支持的代理类型)
- [环境变量](#环境变量)

---

## 订阅转换

### `GET /sub`

获取上游订阅并转换为目标客户端格式。

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `url` | string | 是 | 上游订阅链接 |
| `target` | string | 否 | 强制指定目标客户端，优先级高于 UA 自动检测 |
| `ua` | string | 否 | `target` 的别名，作用相同 |

**请求头**

| Header | 说明 |
|---|---|
| `User-Agent` | 用于自动检测客户端类型。若为浏览器 UA，后端请求上游时会覆盖为 `clash-verge/v2.5.1` |

**`target` / `ua` 可选值**

| 值 | 客户端 |
|---|---|
| `clash` / `mihomo` / `clash.meta` / `meta` | Clash / Clash Meta / Mihomo |
| `surge` / `shadowrocket` | Surge / Shadowrocket（Surge INI） |
| `surfboard` | Surfboard |
| `loon` | Loon |
| `quanx` / `quantumult` / `quantumult x` | Quantumult X |

**响应**

- **200**：转换后的配置内容，`Content-Type` 取决于目标格式
  - Clash：`application/yaml; charset=utf-8`
  - Surge / Surfboard / Loon / QuanX：`text/plain; charset=utf-8`
- **400**：错误信息（JSON）
- **405**：方法不允许

**示例**

```bash
# 自动检测客户端（通过 UA）
curl -H "User-Agent: ClashMetaForAndroid/2.11.29.Meta" \
  "http://localhost:15500/sub?url=https://example.com/sub"

# 强制指定目标为 clash
curl "http://localhost:15500/sub?url=https://example.com/sub&target=clash"

# 强制指定目标为 surfboard
curl "http://localhost:15500/sub?url=https://example.com/sub&target=surfboard"
```

**行为说明**

- 若无法识别客户端类型（未传 `target` 且 UA 无法匹配），后端将**原样透传**上游内容
- 若上游返回 Clash YAML，后端会解析节点和代理组，透传上游代理组并在缺失时补充 `PROXY` 和 `AUTO`
- 输出前按客户端能力表过滤不支持的协议；`raw`（未知类型）仅在 Clash 输出中保留

---

## 健康检查

### `GET /health`

**响应**

```json
{
  "ok": true,
  "service": "subconverter-x"
}
```

---

## 管理元信息

### `GET /api/admin/meta`

**响应**

```json
{
  "service": "subconverter-x",
  "version": "0.0.1",
  "authEnabled": true
}
```

- `authEnabled`：当前是否启用了管理鉴权（环境变量 `ADMIN_TOKEN` 或自动生成的 token）

---

## 自定义规则

### `GET /api/rules`

获取当前自定义规则配置。

**响应**

```json
{
  "rules": [
    "DOMAIN-SUFFIX,google.com,PROXY",
    "GEOIP,CN,DIRECT",
    "MATCH,PROXY"
  ],
  "rulesMerge": "replace"
}
```

- `rulesMerge`：规则合并模式
  - `replace`：替换默认规则
  - `prepend`：插入到默认规则之前
  - `append`：追加到默认规则之后

---

### `PUT /api/rules`

保存自定义规则配置。**需要认证**。

**请求体**

```json
{
  "rules": [
    "DOMAIN-SUFFIX,google.com,PROXY",
    "GEOIP,CN,DIRECT"
  ],
  "rulesMerge": "replace"
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `rules` | string[] | 否 | 规则列表 |
| `rulesMerge` | string | 否 | 合并模式：`replace` / `prepend` / `append` |

**响应**

```json
{
  "rules": [...],
  "rulesMerge": "replace"
}
```

---

## 自定义规则集

### `GET /api/rulesets`

获取所有自定义规则集。

**响应**

```json
[
  {
    "id": "rule-001",
    "name": "广告拦截",
    "rules": [
      { "type": "DOMAIN-SUFFIX", "content": "doubleclick.net", "policy": "REJECT" }
    ],
    "createdAt": 1719024000000
  }
]
```

---

### `PUT /api/rulesets`

保存自定义规则集列表（整体替换）。**需要认证**。

**请求体**

```json
[
  {
    "id": "rule-001",
    "name": "广告拦截",
    "rules": [
      { "type": "DOMAIN-SUFFIX", "content": "doubleclick.net", "policy": "REJECT" }
    ],
    "createdAt": 1719024000000
  }
]
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 规则集唯一标识 |
| `name` | string | 是 | 规则集名称 |
| `rules` | object[] | 是 | 规则列表 |
| `rules[].type` | string | 是 | 规则类型，如 `DOMAIN-SUFFIX`、`IP-CIDR` 等 |
| `rules[].content` | string | 是 | 规则内容 |
| `rules[].policy` | string | 是 | 策略，如 `PROXY`、`DIRECT`、`REJECT` |
| `createdAt` | number | 是 | 创建时间戳（毫秒） |

**响应**：同请求体，返回保存后的完整列表。

---

## 认证

管理写接口（`PUT` / `POST`，如规则、规则集、订阅设置）需要：

```
Authorization: Bearer <token>
```

Token 来源：

1. 环境变量 `ADMIN_TOKEN`（优先）
2. 未设置时，首次启动自动生成，写入应用数据目录的 `config.yaml`，并在控制台打印

`GET /api/admin/meta` 的 `authEnabled` 表示当前是否已启用上述鉴权。

---

## 支持的客户端

| ClientType | 输出格式 | 说明 |
|---|---|---|
| `clash` | YAML | Clash / Clash Meta / Mihomo |
| `surge` | INI | Surge 配置格式；Shadowrocket 也映射到此 |
| `surfboard` | INI | Surfboard |
| `loon` | INI | Loon |
| `quanx` | INI | Quantumult X |

---

## 客户端 × 协议能力

以 `src/core/capabilities.ts` 为准；不在表中的协议会在输出前过滤。

| ClientType | shadowsocks | vmess | trojan | hysteria2 | vless | raw |
|---|---|---|---|---|---|---|
| `clash` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `surge` | ✓ | ✓ | ✓ | ✓ | | |
| `surfboard` | ✓ | ✓ | ✓ | ✓ | | |
| `loon` | ✓ | ✓ | ✓ | ✓ | ✓ | |
| `quanx` | ✓ | ✓ | ✓ | ✓ | ✓ | |

---

## 支持的代理类型

| ProxyType | 说明 |
|---|---|
| `vless` | VLESS |
| `shadowsocks` | Shadowsocks / SS |
| `trojan` | Trojan |
| `vmess` | VMess |
| `hysteria2` | Hysteria2（含 `hy2` 别名） |
| `raw` | 未知类型原样透传（仅 Clash 输出保留） |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `15500` | 服务监听端口 |
| `CORS_ORIGIN` | `*` | CORS 允许来源 |
| `ADMIN_TOKEN` | （无） | 管理接口 token；不设则首次启动自动生成 |
