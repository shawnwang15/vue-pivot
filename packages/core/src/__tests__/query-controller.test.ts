import { describe, expect, it } from 'vitest'
import { createQueryController, LocalDataSource } from '../datasource/pivot-data-source'
import { buildPivotQuery } from '../query/build-query'
import { createInitialState } from '../state/pivot-state'
import { fromS2DataCfg } from '../migrate/from-s2'

describe('query controller race', () => {
  it('discards stale results', async () => {
    const controller = createQueryController()
    let resolveSlow: (v: string) => void
    const slow = new Promise<string>((r) => {
      resolveSlow = r
    })

    const p1 = controller.run('q1', async () => slow)
    const p2 = controller.run('q2', async () => 'fast')
    resolveSlow!('slow')
    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toBeNull()
    expect(r2).toBe('fast')
  })

  it('local datasource returns cells', async () => {
    const dataCfg = fromS2DataCfg({
      fields: { rows: ['a'], columns: ['b'], values: ['v'] },
      data: [
        { a: 'x', b: 'y', v: 1 },
        { a: 'x', b: 'y', v: 2 },
      ],
    })
    const state = createInitialState(dataCfg)
    const query = buildPivotQuery(state)
    const ds = new LocalDataSource(dataCfg.data ?? [])
    const result = await ds.query(query, new AbortController().signal)
    expect(result.cells?.length).toBeGreaterThan(0)
  })
})
