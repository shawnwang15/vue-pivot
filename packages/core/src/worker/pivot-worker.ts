import type { PivotQuery, PivotResult } from '../types/pivot-query'
import type { PivotRecord } from '../types/data-cfg'
import type { AggregatorId } from '../types/data-cfg'
import { listAggregators } from '../engine/aggregator'

/**
 * Structured-clone safe worker request.
 * Formatter functions / Vue slots must stay on the main thread.
 */
export interface WorkerPivotRequest {
  type: 'aggregate'
  query: PivotQuery
  records: PivotRecord[]
  aggregatorIds: AggregatorId[]
}

export interface WorkerPivotResponse {
  type: 'aggregate:result' | 'aggregate:error'
  queryId: string
  result?: PivotResult
  error?: string
}

export function isWorkerCloneableRequest(req: WorkerPivotRequest): boolean {
  try {
    structuredClone(req)
    return true
  } catch {
    return false
  }
}

export function createWorkerRequest(
  query: PivotQuery,
  records: PivotRecord[],
): WorkerPivotRequest {
  return {
    type: 'aggregate',
    query: {
      ...query,
      // strip non-cloneable bits if any were attached
    },
    records,
    aggregatorIds: listAggregators(),
  }
}

/** Pure worker handler — can run in Worker or main thread fallback */
export async function handleWorkerRequest(
  req: WorkerPivotRequest,
  signal?: AbortSignal,
): Promise<WorkerPivotResponse> {
  try {
    const { LocalDataSource } = await import('../datasource/pivot-data-source')
    const ds = new LocalDataSource(req.records)
    const abort = signal ?? new AbortController().signal
    const result = await ds.query(req.query, abort)
    return { type: 'aggregate:result', queryId: req.query.queryId, result }
  } catch (err) {
    return {
      type: 'aggregate:error',
      queryId: req.query.queryId,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export class WorkerExecutor {
  private worker: Worker | null = null

  constructor(private workerUrl?: string | URL) {}

  async execute(req: WorkerPivotRequest, signal: AbortSignal): Promise<PivotResult> {
    if (!isWorkerCloneableRequest(req)) {
      throw new Error('[vue-pivot] Worker request contains non-cloneable values')
    }
    if (typeof Worker === 'undefined' || !this.workerUrl) {
      const res = await handleWorkerRequest(req, signal)
      if (res.type === 'aggregate:error' || !res.result) {
        throw new Error(res.error ?? 'Worker aggregation failed')
      }
      return res.result
    }

    return new Promise((resolve, reject) => {
      const worker = new Worker(this.workerUrl!, { type: 'module' })
      this.worker = worker
      const onAbort = () => {
        worker.terminate()
        reject(new DOMException('Aborted', 'AbortError'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
      worker.onmessage = (ev: MessageEvent<WorkerPivotResponse>) => {
        signal.removeEventListener('abort', onAbort)
        worker.terminate()
        if (ev.data.type === 'aggregate:error' || !ev.data.result) {
          reject(new Error(ev.data.error ?? 'Worker failed'))
        } else {
          resolve(ev.data.result)
        }
      }
      worker.onerror = (err) => {
        signal.removeEventListener('abort', onAbort)
        worker.terminate()
        reject(err)
      }
      worker.postMessage(req)
    })
  }

  dispose(): void {
    this.worker?.terminate()
    this.worker = null
  }
}
