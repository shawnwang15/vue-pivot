import type { DataCfg, MeasureField, PivotRecord } from '../types/data-cfg';
import type { FilterSpec, PivotOptions, SortSpec, TopNSpec } from '../types/options';
import type { SelectionRange } from '../types/selection';
import type { QueryStatus } from '../types/pivot-query';
import type { DimTree } from '../engine/dim-tree';
import type { LazyCube } from '../engine/cube';
export interface ColumnUIState {
    widths: Map<string, number>;
    visibility: Map<string, boolean>;
    order: string[];
    pinned: Map<string, 'left' | 'right' | false>;
}
export interface PivotState {
    version: number;
    queryVersion: number;
    dataCfg: DataCfg;
    options: PivotOptions;
    records: PivotRecord[];
    measures: MeasureField[];
    rowTree: DimTree;
    colTree: DimTree;
    cube: LazyCube;
    sort: SortSpec[];
    filters: FilterSpec[];
    topN: TopNSpec[];
    expandedRowPaths: string[][];
    expandedColPaths: string[][];
    selection: SelectionRange[];
    columnUI: ColumnUIState;
    status: QueryStatus;
    error: string | null;
    loadingQueryId: string | null;
    viewportCursor: {
        rowStart: number;
        colStart: number;
    };
}
export declare function createInitialState(dataCfg?: DataCfg, options?: PivotOptions): PivotState;
//# sourceMappingURL=pivot-state.d.ts.map