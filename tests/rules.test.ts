import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  mergeRules,
  normalizeMergedRules,
  resolveClashExtras,
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

describe('resolveClashExtras', () => {
  it('uses rules config and passes through upstream extras', () => {
    const extras = resolveClashExtras(
      { rules: ['GEOIP,CN,DIRECT', 'MATCH,PROXY'], rulesMerge: 'replace' },
      { proxyGroups: [{ name: 'PROXY', type: 'select', proxies: [] }] },
    )

    expect(extras.rules).toEqual(['GEOIP,CN,DIRECT', 'MATCH,PROXY'])
    expect(extras.proxyGroups?.[0]).toMatchObject({
      name: 'PROXY',
      type: 'select',
      proxies: [],
    })
  })

  it('merges custom and upstream rules when mode is prepend', () => {
    const extras = resolveClashExtras(
      { rules: ['GEOIP,CN,DIRECT'], rulesMerge: 'prepend' },
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

  it('returns upstream rules when no rules config provided', () => {
    const extras = resolveClashExtras(null, {
      rules: ['DOMAIN,example.com,PROXY'],
    })

    expect(extras.rules).toEqual(['DOMAIN,example.com,PROXY'])
  })
})

describe('FileRulesStore', () => {
  it('loads and saves rules to a single yaml file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rules-'))
    const filePath = join(dir, 'rules.yaml')
    const store = new FileRulesStore(filePath)

    await store.save({
      rules: ['MATCH,PROXY'],
      rulesMerge: 'prepend',
    })

    const config = await store.get()
    expect(config?.rules).toEqual(['MATCH,PROXY'])
    expect(config?.rulesMerge).toBe('prepend')

    const raw = await readFile(filePath, 'utf8')
    expect(raw).toContain('rules-merge: prepend')
    expect(raw).toContain('MATCH,PROXY')
  })
})
