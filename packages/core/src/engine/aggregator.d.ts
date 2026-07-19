export interface Aggregator<TInput = unknown, TState = unknown, TResult = unknown> {
    id: string;
    init(): TState;
    add(state: TState, value: TInput, record?: unknown): void;
    merge(state: TState, partial: TState): void;
    finalize(state: TState): TResult;
}
export type SumState = {
    sum: number;
    count: number;
};
export type AvgState = {
    sum: number;
    count: number;
};
export type CountState = {
    count: number;
};
export type MinMaxState = {
    value: number | null;
};
export type DistinctState = {
    values: Set<unknown> | unknown[];
};
export declare const sumAggregator: Aggregator<unknown, SumState, number>;
export declare const avgAggregator: Aggregator<unknown, AvgState, number | null>;
export declare const countAggregator: Aggregator<unknown, CountState, number>;
export declare const minAggregator: Aggregator<unknown, MinMaxState, number | null>;
export declare const maxAggregator: Aggregator<unknown, MinMaxState, number | null>;
export declare const distinctCountAggregator: Aggregator<unknown, DistinctState, number>;
export declare function registerAggregator(aggregator: Aggregator): void;
export declare function getAggregator(id: string): Aggregator;
export declare function listAggregators(): string[];
/** Serialize aggregator state for Worker structured clone */
export declare function serializeAggregatorState(id: string, state: unknown): unknown;
export declare function deserializeAggregatorState(id: string, state: unknown): unknown;
//# sourceMappingURL=aggregator.d.ts.map