import type { HierarchyType, TotalsAxisOptions } from '../types/options';
import type { LayoutNodeKind } from '../types/layout';
import type { PivotRecord } from '../types/data-cfg';
export interface DimNode {
    id: number;
    value: string;
    label: string;
    field: string | null;
    depth: number;
    parentId: number | null;
    children: number[];
    isLeaf: boolean;
    kind: LayoutNodeKind;
    expanded: boolean;
    /** async placeholder */
    loading?: boolean;
    path: string[];
}
export interface DimTree {
    rootId: number;
    nodes: Map<number, DimNode>;
    /** pathKey -> nodeId */
    pathIndex: Map<string, number>;
    version: number;
    nextId: number;
}
export declare function pathKey(path: string[]): string;
export declare function createDimTree(): DimTree;
export declare function buildDimTreeFromRecords(options: {
    records: PivotRecord[];
    fields: string[];
    hierarchyType: HierarchyType;
    expandDepth: number;
    expandedPaths: string[][];
    totals?: TotalsAxisOptions;
    grandTotalLabel?: string;
}): DimTree;
export declare function getVisibleLeaves(tree: DimTree, hierarchyType: HierarchyType): DimNode[];
export declare function setExpanded(tree: DimTree, path: string[], expanded: boolean): DimTree;
export declare function getAncestors(tree: DimTree, nodeId: number): number[];
//# sourceMappingURL=dim-tree.d.ts.map