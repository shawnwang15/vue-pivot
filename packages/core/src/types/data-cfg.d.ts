export type FieldName = string;
export type FormatSpec = {
    type: 'number';
    precision?: number;
    prefix?: string;
    suffix?: string;
} | {
    type: 'percent';
    precision?: number;
} | {
    type: 'currency';
    currency?: string;
    precision?: number;
} | {
    type: 'custom';
    id: string;
};
export type MetaFormatter = ((value: unknown, record?: unknown) => string) | FormatSpec;
export interface FieldMeta {
    field: FieldName;
    name?: string;
    formatter?: MetaFormatter;
    description?: string;
}
export type AggregatorId = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinctCount' | (string & {});
export interface MeasureField {
    field: FieldName;
    aggregation?: AggregatorId;
    name?: string;
    /** Derived / calculated measure expression id */
    calcId?: string;
}
export type MeasureInput = FieldName | MeasureField;
export interface PivotFields {
    rows: FieldName[];
    columns: FieldName[];
    values: MeasureInput[];
    valueInCols?: boolean;
    filters?: FieldName[];
}
export type PivotRecord = Record<string, unknown>;
export interface DataCfg {
    fields: PivotFields;
    meta?: FieldMeta[];
    data?: PivotRecord[];
    /** Optional pre-aggregated cells keyed by dimension path */
    preAggregated?: PreAggregatedCell[];
}
export interface PreAggregatedCell {
    rowPath: unknown[];
    colPath: unknown[];
    values: Record<FieldName, unknown>;
}
export declare function normalizeMeasures(values: MeasureInput[]): MeasureField[];
//# sourceMappingURL=data-cfg.d.ts.map