export class TransactionConflictError extends Error {
  constructor(retries: number) {
    super(
      `Transaction failed after ${retries} attempts due to concurrent conflicts.`,
    );
    this.name = 'TransactionConflictError';
  }
}

export class TransactionFailedError extends Error {
  constructor(originalError: Error) {
    super(`A command within the transaction failed: ${originalError.message}`);
    this.name = 'TransactionFailedError';

    this.cause = originalError;
  }
}
