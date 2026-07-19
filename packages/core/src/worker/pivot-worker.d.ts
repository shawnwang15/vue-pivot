import type { PivotQuery, PivotResult } from '../types/pivot-query';
import type { PivotRecord } from '../types/data-cfg';
import type { AggregatorId } from '../types/data-cfg';
/**
 * Structured-clone safe worker request.
 * Formatter functions / Vue slots must stay on the main thread.
 */
export interface WorkerPivotRequest {
    type: 'aggregate';
    query: PivotQuery;
    records: PivotRecord[];
    aggregatorIds: AggregatorId[];
}
export interface WorkerPivotResponse {
    type: 'aggregate:result' | 'aggregate:error';
    queryId: string;
    result?: PivotResult;
    error?: string;
}
export declare function isWorkerCloneableRequest(req: WorkerPivotRequest): boolean;
export declare function createWorkerRequest(query: PivotQuery, records: PivotRecord[]): WorkerPivotRequest;
/** Pure worker handler — can run in Worker or main thread fallback */
export declare function handleWorkerRequest(req: WorkerPivotRequest, signal?: AbortSignal): Promise<WorkerPivotResponse>;
export declare class WorkerExecutor {
    private workerUrl?;
    private worker;
    constructor(workerUrl?: (string | URL) | undefined);
    execute(req: WorkerPivotRequest, signal: AbortSignal): Promise<PivotResult>;
    dispose(): void;
}
//# sourceMappingURL=pivot-worker.d.ts.map