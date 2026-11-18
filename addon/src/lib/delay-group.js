// Owner-scoped delay group isolating 300ms warm tooltip handoff per app/test container.

import { isDestroyed, isDestroying } from '@ember/destroyable';

export const DEFAULT_WARM_WINDOW_MS = 300;

const groupsByOwner = new WeakMap();

class TooltipDelayGroup {
  _openTooltips = new Set();
  _closedAt = 0;
  _windowMs = DEFAULT_WARM_WINDOW_MS;

  open(instance) {
    this._openTooltips.add(instance);
    this._closedAt = 0;
  }

  close(instance, { markWarm = true, windowMs = DEFAULT_WARM_WINDOW_MS } = {}) {
    this._openTooltips.delete(instance);
    if (this._openTooltips.size > 0) {
      return;
    }

    this._closedAt = markWarm && windowMs > 0 ? Date.now() : 0;
    this._windowMs = windowMs;
  }

  isWarmFor(excludeInstance = null) {
    for (const openInstance of this._openTooltips) {
      if (openInstance !== excludeInstance) {
        return true;
      }
    }

    return this._closedAt > 0 && Date.now() - this._closedAt < this._windowMs;
  }
}

// Read-only lookup safe during owner teardown (never allocates).
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
  }

  return group;
}
