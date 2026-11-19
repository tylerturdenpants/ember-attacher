import { buildWaiter } from '@ember/test-waiters';

export const attacherWaiter = buildWaiter('basic-attacher');

/**
 * Cancel a scheduled task handle if present.
 *
 * @param {{ cancel?: () => void } | null | undefined} handle
 */
export function cancelScheduled(handle) {
  handle?.cancel?.();
}

/**
 * Defer a callback to a microtask while holding a test-waiter token until it runs or cancels.
 *
 * @param {() => void} fn
 * @returns {{ cancel: () => void }}
 */
export function scheduleMicrotask(fn) {
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

/**
 * Schedule a `setTimeout` tracked by `@ember/test-waiters`, returning a cancellable handle.
 *
 * @param {() => void} fn
 * @param {number} ms
 * @returns {{ cancel: () => void }}
 */
export function scheduleTimeout(fn, ms) {
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

/**
 * Cancel any existing handle and either run synchronously (`immediate` or `!ms`) or after `ms`.
 *
 * @param {{ cancel?: () => void } | null | undefined} currentHandle
 * @param {() => void} fn
 * @param {number} ms
 * @param {boolean} [immediate=false]
 * @returns {{ cancel: () => void } | null}
 */
export function debounceTimeout(currentHandle, fn, ms, immediate = false) {
  cancelScheduled(currentHandle);
  if (immediate || !ms) {
    fn();
    return null;
  }
  return scheduleTimeout(fn, ms);
}
