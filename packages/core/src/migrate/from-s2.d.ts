import type { DataCfg, FieldMeta, MeasureInput } from '../types/data-cfg';
import type { PivotOptions } from '../types/options';
/** Minimal S2-like dataCfg shape for migration */
export interface S2LikeDataCfg {
    fields?: {
        rows?: string[];
        columns?: string[];
        values?: MeasureInput[];
        valueInCols?: boolean;
    };
    meta?: Array<{
        field: string;
        name?: string;
        formatter?: FieldMeta['formatter'];
    }>;
    data?: Record<string, unknown>[];
}
export interface S2LikeOptions {
    hierarchyType?: PivotOptions['hierarchyType'];
    totals?: PivotOptions['totals'];
    interaction?: PivotOptions['interaction'];
    conditions?: PivotOptions['conditions'];
    style?: PivotOptions['style'];
}
export declare function fromS2DataCfg(s2: S2LikeDataCfg): DataCfg;
export declare function fromS2Options(s2?: S2LikeOptions): PivotOptions;
//# sourceMappingURL=from-s2.d.ts.map