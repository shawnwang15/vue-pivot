import type { DataCfg } from '../types/data-cfg';
import type { PivotOptions } from '../types/options';
import type { PivotCommand } from '../types/pivot-command';
import type { PivotState } from '../state/pivot-state';
import { type PivotViewport } from '../viewport/pivot-viewport';
import { type PivotDataSource } from '../datasource/pivot-data-source';
export type PivotListener = (state: PivotState) => void;
export interface PivotEngineOptions {
    dataCfg?: DataCfg;
    options?: PivotOptions;
    dataSource?: PivotDataSource;
    useWorker?: boolean;
    workerUrl?: string | URL;
}
export declare class PivotEngine {
    private state;
    private listeners;
    private viewport;
    private dataSource;
    private queryController;
    private workerExecutor;
    private useWorker;
    constructor(opts?: PivotEngineOptions);
    getState(): PivotState;
    getViewport(): PivotViewport;
    subscribe(listener: PivotListener): () => void;
    private emit;
    private viewportContext;
    private rebuild;
    dispatch(command: PivotCommand): PivotState;
    refreshFromDataSource(): Promise<void>;
    setDataSource(ds: PivotDataSource): void;
    dispose(): void;
}
export declare function createPivotEngine(opts?: PivotEngineOptions): PivotEngine;
//# sourceMappingURL=pivot-engine.d.ts.map