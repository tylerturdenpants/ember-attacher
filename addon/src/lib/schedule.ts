import { buildWaiter } from '@ember/test-waiters';

export interface ScheduledHandle {
  cancel: () => void;
}

export const attacherWaiter = buildWaiter('ember-attacher');

/** Cancel a scheduled task handle if present. */
export function cancelScheduled(handle: Partial<ScheduledHandle> | null | undefined): void {
  handle?.cancel?.();
}

/** Defer a callback to a microtask while holding a test-waiter token until it runs or cancels. */
export function scheduleMicrotask(fn: () => void): ScheduledHandle {
  let active = true;
  const token = attacherWaiter.beginAsync();

  queueMicrotask(() => {
    if (!active) {
      return;
    }
    active = false;
    attacherWaiter.endAsync(token);
    fn();
  });

  return {
    cancel() {
      if (active) {
        active = false;
        attacherWaiter.endAsync(token);
      }
    },
  };
}

/** Schedule a `setTimeout` tracked by `@ember/test-waiters`, returning a cancellable handle. */
export function scheduleTimeout(fn: () => void, ms: number): ScheduledHandle {
  let active = true;
  const token = attacherWaiter.beginAsync();
  const timerId = setTimeout(() => {
    if (!active) {
      return;
    }
    active = false;
    attacherWaiter.endAsync(token);
    fn();
  }, ms);

  return {
    cancel() {
      if (active) {
        active = false;
        clearTimeout(timerId);
        attacherWaiter.endAsync(token);
      }
    },
  };
}

/** Cancel any existing handle and either run synchronously (`immediate` or `!ms`) or after `ms`. */
export function debounceTimeout(
  currentHandle: Partial<ScheduledHandle> | null | undefined,
  fn: () => void,
  ms: number,
  immediate = false
): ScheduledHandle | null {
  cancelScheduled(currentHandle);
  if (immediate || !ms) {
    fn();
    return null;
  }
  return scheduleTimeout(fn, ms);
}
