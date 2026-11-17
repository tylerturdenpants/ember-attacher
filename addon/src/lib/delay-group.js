/**
 * Delay group coordinator for smooth 300ms warm tooltip handoff (#1105).
 *
 * Tracks currently open tooltips and the timestamp when the most recent tooltip
 * started hiding so adjacent tooltips hovered/focused within the warm window
 * open without repeating `showDelay`.
 */

export const DEFAULT_WARM_WINDOW_MS = 300;

const openTooltips = new Set();
let lastTooltipHiddenAt = 0;

/**
 * Mark a tooltip instance as currently open.
 *
 * @param {object} instance
 */
export function recordTooltipOpen(instance) {
  openTooltips.add(instance);
}

/**
 * Mark a tooltip instance as closed/hiding. When `markWarm` is true (normal hide
 * rather than teardown cleanup), starts the 300ms warm handoff window.
 *
 * @param {object} instance
 * @param {{ markWarm?: boolean, now?: number }} [options]
 */
export function recordTooltipClose(instance, { markWarm = true, now = Date.now() } = {}) {
  openTooltips.delete(instance);
  if (markWarm) {
    lastTooltipHiddenAt = now;
  }
}

/**
 * Return true if another tooltip is open or hid within `windowMs`.
 *
 * @param {object} [excludeInstance]
 * @param {number} [windowMs]
 * @param {number} [now]
 * @returns {boolean}
 */
export function isTooltipWarmWindowActive(
  excludeInstance = null,
  windowMs = DEFAULT_WARM_WINDOW_MS,
  now = Date.now()
) {
  for (const openInstance of openTooltips) {
    if (openInstance !== excludeInstance) {
      return true;
    }
  }

  return lastTooltipHiddenAt > 0 && now - lastTooltipHiddenAt <= windowMs;
}
