import type { DataCfg, FieldMeta, FormatSpec, MetaFormatter } from '../types/data-cfg';
import type { NullPrecisionOptions } from '../types/options';
export declare function formatValue(value: unknown, formatter: MetaFormatter | undefined, nullPrecision?: NullPrecisionOptions): string;
export declare function formatBySpec(value: unknown, spec: FormatSpec): string;
export declare function getFieldMeta(dataCfg: DataCfg, field: string): FieldMeta | undefined;
//# sourceMappingURL=format.d.ts.map