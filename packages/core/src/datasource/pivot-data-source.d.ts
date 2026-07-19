import type { DrillQuery, DrillResult, PivotQuery, PivotResult } from '../types/pivot-query';
import type { PivotRecord } from '../types/data-cfg';
import { pathKey } from '../engine/dim-tree';
export interface DataSourceCapabilities {
    serverAggregation: boolean;
    drill: boolean;
    topN: boolean;
    totals: boolean;
    asyncExpand: boolean;
    worker: boolean;
    streaming: boolean;
    supportedAggregators: string[];
}
export interface PivotDataSource {
    query(request: PivotQuery, signal: AbortSignal): Promise<PivotResult>;
    drill?(request: DrillQuery, signal: AbortSignal): Promise<DrillResult>;
    capabilities(): DataSourceCapabilities;
}
export declare const DEFAULT_CAPABILITIES: DataSourceCapabilities;
export declare class LocalDataSource implements PivotDataSource {
    private records;
    constructor(records: PivotRecord[]);
    setRecords(records: PivotRecord[]): void;
    capabilities(): DataSourceCapabilities;
    query(request: PivotQuery, signal: AbortSignal): Promise<PivotResult>;
}
export declare class ServerDataSource implements PivotDataSource {
    private endpoint;
    private caps;
    constructor(endpoint: string, caps?: Partial<DataSourceCapabilities>);
    capabilities(): DataSourceCapabilities;
    query(request: PivotQuery, signal: AbortSignal): Promise<PivotResult>;
    drill(request: DrillQuery, signal: AbortSignal): Promise<DrillResult>;
}
export interface QueryController {
    run<T>(queryId: string, exec: (signal: AbortSignal) => Promise<T>): Promise<T | null>;
    cancel(): void;
    get activeQueryId(): string | null;
}
export declare function createQueryController(): QueryController;
export declare function assertCapability(caps: DataSourceCapabilities, feature: keyof DataSourceCapabilities): void;
export { pathKey };
//# sourceMappingURL=pivot-data-source.d.ts.map