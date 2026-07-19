import type { ColumnLayout, PivotCell, PivotWindow, RowLayout } from '../types/layout';
import type { ViewportRange } from '../types/pivot-query';
import type { MeasureField } from '../types/data-cfg';
import type { DimTree } from '../engine/dim-tree';
import type { LazyCube } from '../engine/cube';
import type { PivotRecord } from '../types/data-cfg';
import type { HierarchyType, PivotOptions } from '../types/options';
import type { DataCfg } from '../types/data-cfg';
import type { FilterSpec } from '../types/options';
export interface ViewportContext {
    rowTree: DimTree;
    colTree: DimTree;
    cube: LazyCube;
    records: PivotRecord[];
    measures: MeasureField[];
    valueInCols: boolean;
    hierarchyType: HierarchyType;
    options: PivotOptions;
    dataCfg: DataCfg;
    columnWidths: Map<string, number>;
    columnVisibility: Map<string, boolean>;
    columnOrder: string[];
    pinnedColumns: Map<string, 'left' | 'right' | false>;
    postFilters: FilterSpec[];
}
export declare function buildRowLayouts(ctx: ViewportContext): RowLayout[];
export declare function buildColumnLayouts(ctx: ViewportContext): ColumnLayout[];
export interface PivotViewport {
    rowCount: number;
    columnCount: number;
    getRow(index: number): RowLayout;
    getColumn(index: number): ColumnLayout;
    getCell(rowIndex: number, columnIndex: number): PivotCell;
    getWindow(range: ViewportRange): PivotWindow;
    getRows(): RowLayout[];
    getColumns(): ColumnLayout[];
}
export declare function createPivotViewport(ctx: ViewportContext): PivotViewport;
/** Rebuild cached layouts after tree/options change */
export declare function refreshViewportLayouts(viewport: PivotViewport, ctx: ViewportContext): void;
//# sourceMappingURL=pivot-viewport.d.ts.map