import { peekDelayGroup } from '../lib/delay-group.js';

/**
 * Clear the tooltip delay-group warm window for `owner` without waiting for the
 * real 300ms cooldown. Safe no-op when no group exists.
 *
 * @param {unknown} owner
 */
export function expireTooltipDelayGroup(owner) {
  peekDelayGroup(owner)?.expireWarm();
}
