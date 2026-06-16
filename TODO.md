# TODO

项目待办与规划。已完成项仅作记录，重点工作放在未办列表。

## 已完成（MVP）

- [x] 上游订阅拉取与 Base64 解码
- [x] 协议解析：VLESS、Shadowsocks、Trojan、VMess
- [x] Clash YAML 摄入（`proxies` + `proxy-groups` + `rules`）
- [x] 输出：Sing-box JSON、Clash YAML（含默认代理组）
- [x] UA 嗅探 + `target` / `ua` 参数覆写
- [x] 转发客户端请求头拉取上游
- [x] 浏览器 UA 无法识别时透传上游原内容
- [x] 解析失败时浏览器 UA 兜底重试
- [x] 适配层：standalone HTTP、lambda 云函数
- [x] Node SEA 单文件构建脚本
- [x] 局域网访问（`0.0.0.0` 绑定）
- [x] Web Admin（`/admin`）与 `GET/PUT /api/rules`
- [x] Admin 前端（Vite + React + shadcn/ui，支持一体/分离部署）
- [x] Clash / Surge 输出合并 `rules` + `proxy-groups`（`data/rules.yaml`）
- [x] 规则集与上游合并模式（`rules-merge` / `proxy-groups-merge`）
- [x] Admin：仪表盘、订阅、规则、代理组、设置分栏
- [x] Admin：订阅链接生成、测试拉取、最近上游记录

## 阶段二：数据清洗与重组

- [ ] 智能正则重命名（去除 Emoji、推广文案，统一如 `HK-01`）
- [ ] 关键字过滤（剔除引流节点、按 include/exclude 筛选）
- [ ] 多源合并（多个 `url` 参数，去重合并节点池）
- [ ] 节点过滤后同步更新 `proxy-groups` 引用

## 阶段三：反阻断与拉取策略

- [ ] 识别 Cloudflare 挑战页，跳过重试延迟
- [ ] 可配置上游拉取 UA（如 `fetch-ua` 参数）
- [ ] 可配置兜底 UA 与重试开关

## Clash 增强

- [x] Clash 输出包含 `rules`（来自 rules.yaml 或上游）
- [x] 自定义 rules 与上游 rules 可配置合并（replace / prepend / append）
- [x] 自定义 proxy-groups 与上游可按名称合并
- [ ] 补齐传输层字段对称性（grpc、h2、reality 等）
- [ ] 支持更多 proxy 类型：hysteria2、tuic、ssr、wireguard
- [ ] `rule-providers` / `proxy-providers` 透传（低优先级）

## 客户端与输出

- [ ] Surge 专用 formatter（当前回退为 Clash YAML）
- [ ] Quantumult X / Loon 支持（按需）

## 工程与体验

- [ ] Admin：订阅页展示上游 rules diff、选择性合并
- [ ] Admin：规则 YAML 校验与冲突提示
- [x] Admin：侧边栏布局 + 仪表盘首页
- [ ] CI（测试 + 构建）
- [ ] 发布流水线（Win/Linux SEA 分包）
- [ ] 配置化：端口、超时、日志级别
- [ ] API 文档与 OpenAPI（可选）
