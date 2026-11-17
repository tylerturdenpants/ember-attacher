// Owner-scoped delay group isolating 300ms warm tooltip handoff per app/test container.
// Uses native setTimeout (not Ember's runloop) so settled() does not wait on cooldown expiry.

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

// Read-only lookup safe during owner teardown (never calls registerDestructor).
export function peekDelayGroup(owner) {
  if (!owner || typeof owner !== 'object') {
    return null;
  }

  return groupsByOwner.get(owner) ?? null;
}

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
