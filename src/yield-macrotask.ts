/** Yield to the event loop so hosts can flush SSE / observe AbortSignal. */
export function yieldMacrotask(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
