import type { ChainableCommander } from 'ioredis';

export type ExecTuple = [Error | null, unknown];
export type ExecResult = ExecTuple[] | null;

export type TransactionFn = (multi: ChainableCommander) => Promise<void> | void;
