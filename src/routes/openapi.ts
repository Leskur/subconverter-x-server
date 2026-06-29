import { VERSION } from '../utils/version.js'

export function getOpenApiSpec(serverUrl: string): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'subconverter-x API',
      version: VERSION,
      description: '订阅转换服务 API 文档',
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: '订阅转换', description: '上游订阅转换与输出' },
      { name: '系统', description: '健康检查、版本与管理元信息' },
      { name: '规则', description: '自定义规则与规则集管理' },
    ],
    paths: {
      '/sub': {
        get: {
          tags: ['订阅转换'],
          summary: '订阅转换',
          description:
            '获取上游订阅并转换为目标客户端格式。若无法识别客户端类型且未传 target，后端将原样透传上游内容。',
          parameters: [
            {
              name: 'url',
              in: 'query',
              required: true,
              description: '上游订阅链接',
              schema: { type: 'string' },
            },
            {
              name: 'target',
              in: 'query',
              required: false,
              description: '强制指定目标客户端，优先级高于 UA 自动检测',
              schema: {
                type: 'string',
                enum: ['singbox', 'clash', 'surge', 'surfboard', 'loon', 'quanx'],
              },
            },
            {
              name: 'ua',
              in: 'query',
              required: false,
              description: 'target 的别名，作用相同',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: '转换后的配置内容',
              content: {
                'application/yaml': { schema: { type: 'string' } },
                'application/json': { schema: { type: 'string' } },
                'text/plain': { schema: { type: 'string' } },
              },
            },
            '400': {
              description: '错误信息',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { error: { type: 'string' } },
                  },
                },
              },
            },
            '405': {
              description: '方法不允许',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { error: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      '/health': {
        get: {
          tags: ['系统'],
          summary: '健康检查',
          description: '检查服务是否正常运行',
          responses: {
            '200': {
              description: '服务正常',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      service: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/version': {
        get: {
          tags: ['系统'],
          summary: '版本信息',
          responses: {
            '200': {
              description: '版本号',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { version: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      '/api/admin/meta': {
        get: {
          tags: ['系统'],
          summary: '管理元信息',
          description: '获取服务名称、版本、认证状态',
          responses: {
            '200': {
              description: '元信息',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      service: { type: 'string' },
                      version: { type: 'string' },
                      authEnabled: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/rules': {
        get: {
          tags: ['规则'],
          summary: '获取自定义规则',
          responses: {
            '200': {
              description: '当前规则配置',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      rules: { type: 'array', items: { type: 'string' } },
                      rulesMerge: {
                        type: 'string',
                        enum: ['replace', 'prepend', 'append'],
                      },
                    },
                  },
                },
              },
            },
            '404': {
              description: '规则未找到',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { error: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
        put: {
          tags: ['规则'],
          summary: '保存自定义规则',
          description: '需要认证（当设置了 ADMIN_TOKEN 时）',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rules: {
                      type: 'array',
                      items: { type: 'string' },
                      description: '规则列表',
                    },
                    rulesMerge: {
                      type: 'string',
                      enum: ['replace', 'prepend', 'append'],
                      description: '合并模式',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: '保存后的规则配置',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      rules: { type: 'array', items: { type: 'string' } },
                      rulesMerge: { type: 'string' },
                    },
                  },
                },
              },
            },
            '401': {
              description: '未授权',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { error: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      '/api/rules/default': {
        get: {
          tags: ['规则'],
          summary: '获取默认规则',
          responses: {
            '200': {
              description: '默认规则配置',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      rules: { type: 'array', items: { type: 'string' } },
                      rulesMerge: { type: 'string' },
                    },
                  },
                },
              },
            },
            '404': {
              description: '默认规则未找到',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { error: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      '/api/rules/reset': {
        post: {
          tags: ['规则'],
          summary: '重置规则为默认',
          description: '需要认证（当设置了 ADMIN_TOKEN 时）',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: '重置后的规则配置',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      rules: { type: 'array', items: { type: 'string' } },
                      rulesMerge: { type: 'string' },
                    },
                  },
                },
              },
            },
            '401': {
              description: '未授权',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { error: { type: 'string' } },
                  },
                },
              },
            },
            '404': {
              description: '默认规则未找到',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { error: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      '/api/rulesets': {
        get: {
          tags: ['规则'],
          summary: '获取所有自定义规则集',
          responses: {
            '200': {
              description: '规则集列表',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        rules: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              type: { type: 'string' },
                              content: { type: 'string' },
                              policy: { type: 'string' },
                            },
                          },
                        },
                        createdAt: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        put: {
          tags: ['规则'],
          summary: '保存自定义规则集列表（整体替换）',
          description: '需要认证（当设置了 ADMIN_TOKEN 时）',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      rules: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: { type: 'string' },
                            content: { type: 'string' },
                            policy: { type: 'string' },
                          },
                        },
                      },
                      createdAt: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: '保存后的规则集列表',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                },
              },
            },
            '401': {
              description: '未授权',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { error: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: '当设置了 ADMIN_TOKEN 环境变量时，PUT/POST 请求需携带 Authorization: Bearer <token>',
        },
      },
    },
  }
}

export function getDocsHtml(serverUrl: string): string {
  const spec = getOpenApiSpec(serverUrl)
  const specJson = JSON.stringify(spec)
  const escapedSpec = specJson
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>subconverter-x API 文档</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📦</text></svg>" />
</head>
<body>
  <div id="app" data-spec="${escapedSpec}"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.43/dist/browser/standalone.min.js"></script>
</body>
</html>`
}
