export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderConfigError';
  }
}

export class DimensionMismatchError extends Error {
  constructor(
    public readonly expected: number,
    public readonly actual: number,
  ) {
    super(`Embedding dimension mismatch: expected ${expected}, got ${actual}`);
    this.name = 'DimensionMismatchError';
  }
}
