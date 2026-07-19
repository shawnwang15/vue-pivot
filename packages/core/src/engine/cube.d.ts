import type { MeasureField, PivotRecord, PreAggregatedCell } from '../types/data-cfg';
import type { DimTree } from './dim-tree';
export type CubeKey = string;
export declare function makeCubeKey(rowNodeId: number, colNodeId: number, measure: string): CubeKey;
export interface CubeCellState {
    aggregatorId: string;
    state: unknown;
    finalized?: unknown;
    dirty: boolean;
}
export interface LazyCube {
    version: number;
    cells: Map<CubeKey, CubeCellState>;
    /** record indexes per leaf path combination */
    leafBuckets: Map<string, number[]>;
    hit: number;
    miss: number;
}
export declare function createCube(): LazyCube;
export declare function indexRecords(cube: LazyCube, records: PivotRecord[], rowTree: DimTree, colTree: DimTree, rowFields: string[], colFields: string[]): void;
export declare function getCellValue(cube: LazyCube, records: PivotRecord[], rowTree: DimTree, colTree: DimTree, rowNodeId: number, colNodeId: number, measure: MeasureField): unknown;
export declare function ingestPreAggregated(cube: LazyCube, rowTree: DimTree, colTree: DimTree, cells: PreAggregatedCell[], measures: MeasureField[]): void;
export declare function invalidateCube(cube: LazyCube, scope: 'all' | {
    cells: Array<{
        rowNodeId: number;
        colNodeId: number;
    }>;
}, rowTree?: DimTree): void;
export declare function mergePartialState(cube: LazyCube, rowNodeId: number, colNodeId: number, measure: string, aggregatorId: string, partial: unknown): void;
//# sourceMappingURL=cube.d.ts.map