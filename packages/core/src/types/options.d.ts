export type HierarchyType = 'grid' | 'tree' | 'grid-tree';
export interface TotalsAxisOptions {
    showGrandTotals?: boolean;
    showSubTotals?: boolean;
    subTotalsDimensions?: string[];
    reverseLayout?: boolean;
    label?: string;
    subLabel?: string;
}
export interface TotalsOptions {
    row?: TotalsAxisOptions;
    column?: TotalsAxisOptions;
}
export interface InteractionOptions {
    brushSelection?: boolean;
    multiSelection?: boolean;
    selectedCellsSpotlight?: boolean;
    hoverHighlight?: boolean;
    resize?: boolean;
    dragReorder?: boolean;
}
export interface ConditionRule {
    field?: string;
    mapping: (value: unknown, cell: unknown) => unknown;
}
export interface ConditionsOptions {
    text?: ConditionRule[];
    background?: ConditionRule[];
    interval?: ConditionRule[];
    icon?: ConditionRule[];
}
export interface StyleOptions {
    rowHeight?: number;
    colWidth?: number;
    rowHeaderWidth?: number;
    cornerWidth?: number;
    frozenRowCount?: number;
    frozenColCount?: number;
    rowCell?: {
        expandDepth?: number;
    };
    colCell?: {
        expandDepth?: number;
    };
}
export interface SortSpec {
    field: string;
    order: 'asc' | 'desc';
    /** sort by measure after aggregation when measure is set */
    measure?: string;
    method?: 'alpha' | 'measure';
}
export interface FilterSpec {
    field: string;
    operator: 'in' | 'notIn' | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'contains';
    value: unknown;
    /** false = pre-aggregation dimension filter; true = post-aggregation measure filter */
    postAggregation?: boolean;
}
export interface TopNSpec {
    field: string;
    n: number;
    measure: string;
    order?: 'asc' | 'desc';
    others?: boolean;
}
export interface DerivedMeasureSpec {
    id: string;
    name: string;
    kind: 'yoy' | 'mom' | 'ratio' | 'rank' | 'custom';
    baseMeasure: string;
    /** dimension used for period comparison */
    periodField?: string;
}
export interface NullPrecisionOptions {
    nullDisplay?: string;
    treatNullAsZero?: boolean;
    precision?: number;
}
export interface PivotOptions {
    hierarchyType?: HierarchyType;
    totals?: TotalsOptions;
    interaction?: InteractionOptions;
    conditions?: ConditionsOptions;
    style?: StyleOptions;
    sort?: SortSpec[];
    filters?: FilterSpec[];
    topN?: TopNSpec[];
    derivedMeasures?: DerivedMeasureSpec[];
    nullPrecision?: NullPrecisionOptions;
    /** Default expand depth for tree / grid-tree */
    defaultExpandDepth?: number;
    /** When true, node expansion may be async via DataSource.drill */
    asyncExpand?: boolean;
}
//# sourceMappingURL=options.d.ts.map