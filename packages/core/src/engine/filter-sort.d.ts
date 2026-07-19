import type { PivotRecord } from '../types/data-cfg';
import type { FilterSpec, SortSpec, TopNSpec } from '../types/options';
export declare function applyPreFilters(records: PivotRecord[], filters: FilterSpec[]): PivotRecord[];
export declare function matchFilter(value: unknown, filter: FilterSpec): boolean;
export declare function sortRecords(records: PivotRecord[], sort: SortSpec[]): PivotRecord[];
export declare function applyTopN(records: PivotRecord[], topN: TopNSpec[]): PivotRecord[];
export declare function applyPostFilters(value: unknown, filters: FilterSpec[], measureField: string): boolean;
//# sourceMappingURL=filter-sort.d.ts.map