import { handleWorkerRequest, type WorkerPivotRequest } from './pivot-worker'

self.onmessage = async (ev: MessageEvent<WorkerPivotRequest>) => {
  const result = await handleWorkerRequest(ev.data)
  ;(self as unknown as Worker).postMessage(result)
}
