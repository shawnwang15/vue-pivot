import type { PivotCommand } from '../types/pivot-command';
import type { PivotState } from '../state/pivot-state';
export interface ReduceResult {
    state: PivotState;
    invalidate: 'all' | 'cube' | 'layout' | 'selection' | 'none';
}
export declare function reducePivotState(state: PivotState, command: PivotCommand): ReduceResult;
//# sourceMappingURL=reduce.d.ts.map