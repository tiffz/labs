export class GestureUploadCancelledError extends Error {
  readonly packId: string;

  constructor(packId: string) {
    super('Upload cancelled.');
    this.name = 'GestureUploadCancelledError';
    this.packId = packId;
  }
}

export function isGestureUploadCancelledError(error: unknown): error is GestureUploadCancelledError {
  return error instanceof GestureUploadCancelledError;
}
