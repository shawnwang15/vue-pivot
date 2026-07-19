import type { MeasureField, PivotRecord } from './data-cfg';
import type { FilterSpec, HierarchyType, SortSpec, TopNSpec, TotalsOptions } from './options';
export interface ViewportRange {
    rowStart: number;
    rowEnd: number;
    colStart: number;
    colEnd: number;
    overscanRow?: number;
    overscanCol?: number;
}
export interface PivotQuery {
    queryId: string;
    axes: {
        rows: string[];
        columns: string[];
        values: MeasureField[];
        valueInCols: boolean;
    };
    measures: MeasureField[];
    preFilters: FilterSpec[];
    postFilters: FilterSpec[];
    sort: SortSpec[];
    topN: TopNSpec[];
    totals: TotalsOptions;
    hierarchyType: HierarchyType;
    expandedRowPaths: string[][];
    expandedColPaths: string[][];
    expandDepth: number;
    viewport?: ViewportRange;
    page?: {
        offset: number;
        limit: number;
    };
}
export interface DrillQuery {
    queryId: string;
    axis: 'row' | 'column';
    path: string[];
    childrenField: string;
    parentQueryId?: string;
}
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';
export interface PivotResultCell {
    rowNodeId: number;
    colNodeId: number;
    measure: string;
    value: unknown;
    formatted?: string;
}
export interface PivotResult {
    queryId: string;
    rowTreeVersion: number;
    colTreeVersion: number;
    cells?: PivotResultCell[];
    /** Aggregator partial states for merge */
    partials?: Array<{
        rowNodeId: number;
        colNodeId: number;
        measure: string;
        aggregatorId: string;
        state: unknown;
    }>;
    records?: PivotRecord[];
    meta?: Record<string, unknown>;
}
export interface DrillResult {
    queryId: string;
    axis: 'row' | 'column';
    path: string[];
    children: Array<{
        value: unknown;
        label?: string;
        isLeaf?: boolean;
    }>;
}
//# sourceMappingURL=pivot-query.d.ts.map