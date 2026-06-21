const queues = new Map<string, Promise<any>>();

/**
 * Enqueues a write or modify operation for a specific file path,
 * running operations sequentially to prevent race conditions.
 */
export function enqueueWrite(filePath: string, writeFn: () => void | Promise<void>): Promise<void> {
  const current = queues.get(filePath) || Promise.resolve();
  const next = current.then(async () => {
    try {
      await writeFn();
    } catch (err) {
      console.error(`Error in sequential file operation for ${filePath}:`, err);
      throw err;
    }
  });
  queues.set(filePath, next);
  return next;
}
