// Owner-scoped delay group isolating 300ms warm tooltip handoff per app/test container.

import { isDestroyed, isDestroying } from '@ember/destroyable';

export const DEFAULT_WARM_WINDOW_MS = 300;

export interface DelayGroupCloseOptions {
  markWarm?: boolean;
  windowMs?: number;
}

export class TooltipDelayGroup {
  private _openTooltips = new Set<object>();
  private _closedAt = 0;
  private _windowMs = DEFAULT_WARM_WINDOW_MS;

  open(instance: object): void {
    this._openTooltips.add(instance);
    this._closedAt = 0;
  }

  close(
    instance: object,
    { markWarm = true, windowMs = DEFAULT_WARM_WINDOW_MS }: DelayGroupCloseOptions = {}
  ): void {
    this._openTooltips.delete(instance);
    if (this._openTooltips.size > 0) {
      return;
    }

    this._closedAt = markWarm && windowMs > 0 ? Date.now() : 0;
    this._windowMs = windowMs;
  }

  isWarmFor(): boolean {
    return (
      this._openTooltips.size > 0 ||
      (this._closedAt > 0 && Date.now() - this._closedAt < this._windowMs)
    );
  }
}

const groupsByOwner = new WeakMap<object, TooltipDelayGroup>();

// Read-only lookup safe during owner teardown (never allocates).
export function peekDelayGroup(owner: unknown): TooltipDelayGroup | null {
  if (!owner || typeof owner !== 'object') {
    return null;
  }

  return groupsByOwner.get(owner) ?? null;
}

export function getDelayGroup(owner: unknown): TooltipDelayGroup | null {
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
