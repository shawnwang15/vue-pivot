export type LayoutNodeKind = 'dimension' | 'measure' | 'grandTotal' | 'subTotal';
export interface RowLayout {
    index: number;
    nodeId: number;
    path: string[];
    label: string;
    depth: number;
    isLeaf: boolean;
    expanded: boolean;
    kind: LayoutNodeKind;
    height: number;
    parentId: number | null;
}
export interface ColumnLayout {
    index: number;
    nodeId: number;
    path: string[];
    label: string;
    depth: number;
    isLeaf: boolean;
    expanded: boolean;
    kind: LayoutNodeKind;
    width: number;
    measure?: string;
    columnId: string;
    parentId: number | null;
    pinned?: 'left' | 'right' | false;
    visible: boolean;
}
export interface PivotCell {
    rowIndex: number;
    colIndex: number;
    rowNodeId: number;
    colNodeId: number;
    measure: string;
    value: unknown;
    formatted: string;
    raw?: unknown;
    type?: 'data' | 'total' | 'sparkline';
    meta?: Record<string, unknown>;
}
export interface PivotWindow {
    range: {
        rowStart: number;
        rowEnd: number;
        colStart: number;
        colEnd: number;
    };
    rows: RowLayout[];
    columns: ColumnLayout[];
    cells: PivotCell[];
}
//# sourceMappingURL=layout.d.ts.map