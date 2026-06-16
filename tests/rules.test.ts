import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  mergeProxyGroups,
  mergeRules,
  normalizeMergedRules,
  resolveClashExtras,
  fillProxyGroupNodes,
} from '../src/profiles/merge.js'
import { FileRulesStore } from '../src/profiles/store.js'

describe('mergeRules', () => {
  const custom = ['GEOIP,CN,DIRECT', 'MATCH,PROXY']
  const upstream = ['DOMAIN,google.com,PROXY', 'MATCH,Auto']

  it('replace uses only custom rules', () => {
    expect(mergeRules(custom, upstream, 'replace')).toEqual(custom)
  })

  it('prepend puts custom rules before upstream', () => {
    expect(mergeRules(custom, upstream, 'prepend')).toEqual([
      'GEOIP,CN,DIRECT',
      'DOMAIN,google.com,PROXY',
      'MATCH,PROXY',
      'MATCH,Auto',
    ])
  })

  it('append puts upstream rules before custom', () => {
    expect(mergeRules(custom, upstream, 'append')).toEqual([
      'DOMAIN,google.com,PROXY',
      'GEOIP,CN,DIRECT',
      'MATCH,Auto',
      'MATCH,PROXY',
    ])
  })

  it('falls back to upstream when custom is empty', () => {
    expect(mergeRules([], upstream, 'prepend')).toEqual(upstream)
  })
})

describe('normalizeMergedRules', () => {
  it('dedupes rules and moves MATCH to the end', () => {
    expect(
      normalizeMergedRules(['MATCH,A', 'GEOIP,CN,DIRECT', 'MATCH,B', 'GEOIP,CN,DIRECT']),
    ).toEqual(['GEOIP,CN,DIRECT', 'MATCH,A', 'MATCH,B'])
  })
})

describe('mergeProxyGroups', () => {
  const upstream = [
    { name: 'Auto', type: 'url-test', proxies: ['A', 'B'] },
    { name: 'PROXY', type: 'select', proxies: ['A'] },
  ]
  const custom = [{ name: 'PROXY', type: 'select', proxies: [] }]

  it('replace uses only custom groups', () => {
    expect(mergeProxyGroups(custom, upstream, 'replace')).toEqual(custom)
  })

  it('merge keeps upstream groups and overrides same name', () => {
    expect(mergeProxyGroups(custom, upstream, 'merge')).toEqual([
      { name: 'Auto', type: 'url-test', proxies: ['A', 'B'] },
      { name: 'PROXY', type: 'select', proxies: [] },
    ])
  })
})

describe('resolveClashExtras', () => {
  it('uses rules config and fills empty proxy group', () => {
    const nodes = [
      { type: 'trojan' as const, name: 'A', server: '1.1.1.1', port: 443, password: 'pw' },
      { type: 'trojan' as const, name: 'B', server: '2.2.2.2', port: 443, password: 'pw' },
    ]

    const extras = resolveClashExtras(nodes, {
      rules: ['GEOIP,CN,DIRECT', 'MATCH,PROXY'],
      proxyGroups: [{ name: 'PROXY', type: 'select', proxies: [] }],
      rulesMerge: 'replace',
      proxyGroupsMerge: 'replace',
    })

    expect(extras.rules).toEqual(['GEOIP,CN,DIRECT', 'MATCH,PROXY'])
    expect(extras.proxyGroups?.[0]).toMatchObject({
      name: 'PROXY',
      proxies: ['A', 'B'],
    })
  })

  it('merges custom and upstream rules when mode is prepend', () => {
    const nodes = [
      { type: 'trojan' as const, name: 'A', server: '1.1.1.1', port: 443, password: 'pw' },
    ]

    const extras = resolveClashExtras(
      nodes,
      {
        rules: ['GEOIP,CN,DIRECT'],
        proxyGroups: [],
        rulesMerge: 'prepend',
        proxyGroupsMerge: 'replace',
      },
      {
        rules: ['DOMAIN,example.com,PROXY', 'MATCH,PROXY'],
        proxyGroups: [{ name: 'PROXY', type: 'select', proxies: ['A'] }],
      },
    )

    expect(extras.rules).toEqual([
      'GEOIP,CN,DIRECT',
      'DOMAIN,example.com,PROXY',
      'MATCH,PROXY',
    ])
    expect(extras.proxyGroups?.[0]).toMatchObject({
      name: 'PROXY',
      proxies: ['A'],
    })
  })
})

describe('fillProxyGroupNodes', () => {
  it('replaces wildcard proxies with node names', () => {
    const groups = fillProxyGroupNodes(
      [{ name: 'PROXY', type: 'select', proxies: ['*'] }],
      ['N1', 'N2'],
    )
    expect(groups[0]).toMatchObject({ proxies: ['N1', 'N2'] })
  })
})

describe('FileRulesStore', () => {
  it('loads and saves rules to a single yaml file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rules-'))
    const filePath = join(dir, 'rules.yaml')
    const store = new FileRulesStore(filePath)

    await store.save({
      rules: ['MATCH,PROXY'],
      proxyGroups: [{ name: 'PROXY', type: 'select', proxies: [] }],
      rulesMerge: 'prepend',
      proxyGroupsMerge: 'merge',
    })

    const config = await store.get()
    expect(config?.rules).toEqual(['MATCH,PROXY'])
    expect(config?.rulesMerge).toBe('prepend')
    expect(config?.proxyGroupsMerge).toBe('merge')

    const raw = await readFile(filePath, 'utf8')
    expect(raw).toContain('rules-merge: prepend')
    expect(raw).toContain('MATCH,PROXY')
  })
})
