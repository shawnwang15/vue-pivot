export interface CellCoord {
    rowIndex: number;
    colIndex: number;
    rowNodeId?: number;
    colNodeId?: number;
}
export interface SelectionRange {
    start: CellCoord;
    end: CellCoord;
    kind?: 'cell' | 'row' | 'column' | 'brush';
}
export declare function normalizeRange(range: SelectionRange): SelectionRange;
export declare function rangesOverlap(a: SelectionRange, b: SelectionRange): boolean;
//# sourceMappingURL=selection.d.ts.map