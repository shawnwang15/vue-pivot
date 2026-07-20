import type { PivotCommand } from '../types/pivot-command'
import type { PivotState } from '../state/pivot-state'
import { getDataKind, normalizeMeasures } from '../types/data-cfg'
import { normalizeRange } from '../types/selection'
import { setExpanded } from '../engine/dim-tree'
import { invalidateCube } from '../engine/cube'
import { createServerCellStore } from '../engine/server-result'
import { createDimTree } from '../engine/dim-tree'
import { createCube } from '../engine/cube'

export interface ReduceResult {
  state: PivotState
  invalidate: 'all' | 'cube' | 'layout' | 'selection' | 'none'
  /** Aggregated mode: query contract changed; do not rebuild from stale cells */
  remoteRefresh?: boolean
}

function isAggregated(state: PivotState): boolean {
  return getDataKind(state.dataCfg) === 'aggregated'
}

/** Clear authoritative cells when the query contract changes under aggregated mode */
function clearAggregatedResult(state: PivotState): PivotState {
  return {
    ...state,
    dataCfg:
      state.dataCfg.dataKind === 'aggregated'
        ? { ...state.dataCfg, data: [], totals: undefined, subTotals: undefined }
        : state.dataCfg,
    records: [],
    rowTree: createDimTree(),
    colTree: createDimTree(),
    cube: createCube(),
    serverCells: createServerCellStore(),
    status: 'stale',
    error: null,
  }
}

function bumpQuery(state: PivotState, patch: Partial<PivotState>): PivotState {
  const next = {
    ...state,
    ...patch,
    version: state.version + 1,
    queryVersion: state.queryVersion + 1,
  }
  if (isAggregated(state)) {
    return clearAggregatedResult(next)
  }
  return next
}

export function reducePivotState(state: PivotState, command: PivotCommand): ReduceResult {
  switch (command.type) {
    case 'setDataCfg': {
      const next: PivotState = {
        ...state,
        dataCfg: command.dataCfg,
        records: command.dataCfg.data ?? [],
        measures: normalizeMeasures(command.dataCfg.fields.values ?? []),
        version: state.version + 1,
        queryVersion: state.queryVersion + 1,
        status: 'idle',
        error: null,
      }
      return { state: next, invalidate: 'all' }
    }
    case 'setOptions': {
      const mergedOptions = { ...state.options, ...command.options }
      const nextSort = command.options.sort ?? state.sort
      const nextFilters = command.options.filters ?? state.filters
      const nextTopN = command.options.topN ?? state.topN
      const queryAffecting =
        JSON.stringify({
          hierarchyType: state.options.hierarchyType,
          defaultExpandDepth: state.options.defaultExpandDepth,
          totals: state.options.totals,
          asyncExpand: state.options.asyncExpand,
          derivedMeasures: state.options.derivedMeasures,
          sort: state.sort,
          filters: state.filters,
          topN: state.topN,
        }) !==
        JSON.stringify({
          hierarchyType: mergedOptions.hierarchyType,
          defaultExpandDepth: mergedOptions.defaultExpandDepth,
          totals: mergedOptions.totals,
          asyncExpand: mergedOptions.asyncExpand,
          derivedMeasures: mergedOptions.derivedMeasures,
          sort: nextSort,
          filters: nextFilters,
          topN: nextTopN,
        })

      if (isAggregated(state) && queryAffecting) {
        const next = bumpQuery(state, {
          options: mergedOptions,
          sort: nextSort,
          filters: nextFilters,
          topN: nextTopN,
        })
        return { state: next, invalidate: 'all', remoteRefresh: true }
      }

      return {
        state: {
          ...state,
          options: mergedOptions,
          sort: nextSort,
          filters: nextFilters,
          topN: nextTopN,
          version: state.version + 1,
          queryVersion: queryAffecting ? state.queryVersion + 1 : state.queryVersion,
        },
        invalidate: queryAffecting ? 'all' : 'layout',
      }
    }
    case 'expand': {
      const tree = command.axis === 'row' ? state.rowTree : state.colTree
      setExpanded(tree, command.path, true)
      const pathsKey = command.axis === 'row' ? 'expandedRowPaths' : 'expandedColPaths'
      const paths = [...state[pathsKey]]
      if (!paths.some((p) => p.join('\0') === command.path.join('\0'))) paths.push([...command.path])
      return {
        state: {
          ...state,
          [pathsKey]: paths,
          version: state.version + 1,
        },
        invalidate: 'layout',
      }
    }
    case 'collapse': {
      const tree = command.axis === 'row' ? state.rowTree : state.colTree
      setExpanded(tree, command.path, false)
      const pathsKey = command.axis === 'row' ? 'expandedRowPaths' : 'expandedColPaths'
      const paths = state[pathsKey].filter((p) => p.join('\0') !== command.path.join('\0'))
      return {
        state: {
          ...state,
          [pathsKey]: paths,
          version: state.version + 1,
        },
        invalidate: 'layout',
      }
    }
    case 'setExpandDepth': {
      const next = bumpQuery(state, {
        options: {
          ...state.options,
          defaultExpandDepth: command.depth,
          style: {
            ...state.options.style,
            ...(command.axis === 'row'
              ? { rowCell: { ...state.options.style?.rowCell, expandDepth: command.depth } }
              : { colCell: { ...state.options.style?.colCell, expandDepth: command.depth } }),
          },
        },
      })
      return { state: next, invalidate: 'all', remoteRefresh: isAggregated(state) }
    }
    case 'sort': {
      const next = bumpQuery(state, { sort: command.sort })
      return { state: next, invalidate: 'all', remoteRefresh: isAggregated(state) }
    }
    case 'filter': {
      const next = bumpQuery(state, { filters: command.filters })
      return { state: next, invalidate: 'all', remoteRefresh: isAggregated(state) }
    }
    case 'topN': {
      const next = bumpQuery(state, { topN: command.topN })
      return { state: next, invalidate: 'all', remoteRefresh: isAggregated(state) }
    }
    case 'moveField': {
      const fields = {
        rows: [...(state.dataCfg.fields.rows ?? [])],
        columns: [...(state.dataCfg.fields.columns ?? [])],
        values: [...(state.dataCfg.fields.values ?? [])],
        filters: [...(state.dataCfg.fields.filters ?? [])],
        valueInCols: state.dataCfg.fields.valueInCols,
      }
      const removeFrom = (zone: typeof command.from) => {
        if (zone === 'available') return
        if (zone === 'values') {
          fields.values = fields.values.filter((v) =>
            typeof v === 'string' ? v !== command.field : v.field !== command.field,
          )
        } else {
          fields[zone] = fields[zone].filter((f) => f !== command.field)
        }
      }
      removeFrom(command.from)
      const insertAt = <T>(arr: T[], item: T, index?: number) => {
        const i = index == null ? arr.length : Math.max(0, Math.min(index, arr.length))
        arr.splice(i, 0, item)
      }
      if (command.to !== 'available') {
        if (command.to === 'values') insertAt(fields.values, command.field, command.index)
        else insertAt(fields[command.to], command.field, command.index)
      }

      const nextFilters =
        command.from === 'filters' && command.to !== 'filters'
          ? state.filters.filter((f) => f.field !== command.field)
          : state.filters

      const nextCfg = { ...state.dataCfg, fields }
      const next = bumpQuery(state, {
        dataCfg: nextCfg,
        measures: normalizeMeasures(fields.values),
        filters: nextFilters,
      })
      return { state: next, invalidate: 'all', remoteRefresh: isAggregated(state) }
    }
    case 'setMeasureAggregation': {
      const values = [...(state.dataCfg.fields.values ?? [])]
      const idx = values.findIndex((v) => (typeof v === 'string' ? v : v.field) === command.field)
      if (idx < 0) return { state, invalidate: 'none' }
      const current = values[idx]
      const nextMeasure =
        typeof current === 'string'
          ? { field: current, aggregation: command.aggregation }
          : { ...current, aggregation: command.aggregation }
      values[idx] = nextMeasure
      const fields = { ...state.dataCfg.fields, values }
      const next = bumpQuery(state, {
        dataCfg: { ...state.dataCfg, fields },
        measures: normalizeMeasures(values),
      })
      return { state: next, invalidate: 'all', remoteRefresh: isAggregated(state) }
    }
    case 'resizeColumn': {
      const widths = new Map(state.columnUI.widths)
      widths.set(command.columnId, command.width)
      return {
        state: {
          ...state,
          columnUI: { ...state.columnUI, widths },
          version: state.version + 1,
        },
        invalidate: 'layout',
      }
    }
    case 'setColumnVisibility': {
      const visibility = new Map(state.columnUI.visibility)
      visibility.set(command.columnId, command.visible)
      return {
        state: {
          ...state,
          columnUI: { ...state.columnUI, visibility },
          version: state.version + 1,
        },
        invalidate: 'layout',
      }
    }
    case 'reorderColumns':
      return {
        state: {
          ...state,
          columnUI: { ...state.columnUI, order: [...command.columnIds] },
          version: state.version + 1,
        },
        invalidate: 'layout',
      }
    case 'pinColumn': {
      const pinned = new Map(state.columnUI.pinned)
      pinned.set(command.columnId, command.pinned)
      return {
        state: {
          ...state,
          columnUI: { ...state.columnUI, pinned },
          version: state.version + 1,
        },
        invalidate: 'layout',
      }
    }
    case 'setSelection':
      return {
        state: {
          ...state,
          selection: command.selection.map(normalizeRange),
          version: state.version + 1,
        },
        invalidate: 'selection',
      }
    case 'clearSelection':
      return {
        state: { ...state, selection: [], version: state.version + 1 },
        invalidate: 'selection',
      }
    case 'brushSelect': {
      const range = normalizeRange({ ...command.range, kind: 'brush' })
      const selection = state.options.interaction?.multiSelection
        ? [...state.selection, range]
        : [range]
      return {
        state: { ...state, selection, version: state.version + 1 },
        invalidate: 'selection',
      }
    }
    case 'drillDown':
      return reducePivotState(state, { type: 'expand', axis: command.axis, path: command.path })
    case 'rollUp':
      return reducePivotState(state, { type: 'collapse', axis: command.axis, path: command.path })
    case 'invalidate': {
      if (command.scope === 'all' || command.scope === 'cube') {
        invalidateCube(state.cube, 'all')
      } else if (typeof command.scope === 'object' && 'cells' in command.scope) {
        invalidateCube(state.cube, command.scope, state.rowTree)
      }
      return {
        state: { ...state, version: state.version + 1, queryVersion: state.queryVersion + 1 },
        invalidate: command.scope === 'selection' ? 'selection' : 'all',
      }
    }
    case 'setViewport':
      return {
        state: {
          ...state,
          viewportCursor: { rowStart: command.rowStart, colStart: command.colStart },
        },
        invalidate: 'none',
      }
    case 'markStale': {
      if (!isAggregated(state)) return { state, invalidate: 'none' }
      return {
        state: clearAggregatedResult({ ...state, version: state.version + 1, queryVersion: state.queryVersion + 1 }),
        invalidate: 'all',
        remoteRefresh: true,
      }
    }
    default:
      return { state, invalidate: 'none' }
  }
}
