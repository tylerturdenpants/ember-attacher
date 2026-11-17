/**
 * Owner-scoped delay group coordinator for smooth 300ms warm tooltip handoff (#1105).
 *
 * Isolates warm-window state per Ember application/test owner via `WeakMap` and
 * auto-cleans cooldown timers via `registerDestructor`, avoiding module-global
 * timestamps or cross-test/SSR state leakage.
 */

import { isDestroyed, isDestroying, registerDestructor } from '@ember/destroyable';

export const DEFAULT_WARM_WINDOW_MS = 300;

const groupsByOwner = new WeakMap();

class TooltipDelayGroup {
  _openTooltips = new Set();
  _isWarm = false;
  _cooldownTimer = null;

  open(instance) {
    clearTimeout(this._cooldownTimer);
    this._cooldownTimer = null;
    this._openTooltips.add(instance);
    this._isWarm = true;
  }

  close(instance, { markWarm = true, windowMs = DEFAULT_WARM_WINDOW_MS } = {}) {
    this._openTooltips.delete(instance);
    if (this._openTooltips.size > 0) {
      return;
    }

    clearTimeout(this._cooldownTimer);
    if (markWarm) {
      this._cooldownTimer = setTimeout(() => {
        this._isWarm = false;
        this._cooldownTimer = null;
      }, windowMs);
    } else {
      this._isWarm = false;
      this._cooldownTimer = null;
    }
  }

  isWarmFor(excludeInstance = null) {
    if (this._isWarm) {
      return true;
    }

    for (const openInstance of this._openTooltips) {
      if (openInstance !== excludeInstance) {
        return true;
      }
    }

    return false;
  }

  destroy() {
    clearTimeout(this._cooldownTimer);
    this._cooldownTimer = null;
    this._openTooltips.clear();
    this._isWarm = false;
  }
}

/**
 * Return an existing delay group scoped to `owner` without creating one.
 *
 * @param {object | null | undefined} owner
 * @returns {TooltipDelayGroup | null}
 */
export function peekDelayGroup(owner) {
  if (!owner || typeof owner !== 'object') {
    return null;
  }

  return groupsByOwner.get(owner) ?? null;
}

/**
 * Retrieve (or lazily initialize) the delay group coordinator scoped to `owner`.
 *
 * @param {object | null | undefined} owner
 * @returns {TooltipDelayGroup | null}
 */
export function getDelayGroup(owner) {
  if (!owner || typeof owner !== 'object' || isDestroying(owner) || isDestroyed(owner)) {
    return null;
  }

  let group = groupsByOwner.get(owner);
  if (!group) {
    group = new TooltipDelayGroup();
    groupsByOwner.set(owner, group);
    registerDestructor(owner, () => {
      group.destroy();
      groupsByOwner.delete(owner);
    });
  }

  return group;
}
