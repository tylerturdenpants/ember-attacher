import { assert } from '@ember/debug';
import type { VirtualElement } from '@floating-ui/dom';

/**
 * Target resolution seam.
 *
 * Keeps listener target and Floating UI reference selection in one private
 * module so targets (elements, virtual references, and selectors) can be
 * resolved cleanly without cluttering positioning or lifecycle logic.
 */

export type AttachmentTarget = Element | VirtualElement;
export type AttachmentTargetInput = AttachmentTarget | string;

export function isElementTarget(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element;
}

/** Floating UI virtual references are plain objects with `getBoundingClientRect`. */
export function isVirtualReference(value: unknown): value is VirtualElement {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  if (isElementTarget(value)) {
    return false;
  }

  return typeof (value as Partial<VirtualElement>).getBoundingClientRect === 'function';
}

/**
 * Resolve a public `@target` value (Element | selector | virtual ref).
 *
 * Selector strings use `querySelectorAll` and must match exactly one node.
 */
export function coerceTarget(
  value: AttachmentTargetInput | null | undefined,
  root?: ParentNode | null
): AttachmentTarget | null {
  if (value == null) {
    return null;
  }

  if (isElementTarget(value) || isVirtualReference(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const doc = root ?? (typeof document !== 'undefined' ? document : null);
    assert(`@target selector "${value}" cannot be resolved without a document`, doc != null);

    const matches = doc!.querySelectorAll(value);

    assert(
      `@target selector "${value}" found ${matches.length} possible targets when there should be exactly 1`,
      matches.length === 1
    );

    return matches[0] ?? null;
  }

  assert(
    '@target must be an Element, a CSS selector string, or a Floating UI virtual reference with getBoundingClientRect',
    false
  );

  return null;
}

export function escapeAttributeSelectorValue(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return String(value).replace(/["\\]/g, '\\$&');
}

export interface TriggerTargets {
  popoverTargets: Element[];
  interestTargets: Element[];
  allTargets: Element[];
}

/** Find native `[popovertarget="<id>"]` / `[interestfor="<id>"]` triggers for an attachment id. */
export function findTriggerTargetElements(
  id: string | null | undefined,
  root?: ParentNode | null
): TriggerTargets {
  const empty: TriggerTargets = { popoverTargets: [], interestTargets: [], allTargets: [] };
  if (!id || typeof id !== 'string') {
    return empty;
  }

  const doc = root ?? (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.querySelectorAll !== 'function') {
    return empty;
  }

  const escaped = escapeAttributeSelectorValue(id);
  const popoverTargets = Array.from(doc.querySelectorAll(`[popovertarget="${escaped}"]`));
  const interestTargets = Array.from(doc.querySelectorAll(`[interestfor="${escaped}"]`));
  const seen = new Set<Element>(popoverTargets);
  const allTargets = [...popoverTargets];

  for (const el of interestTargets) {
    if (!seen.has(el)) {
      seen.add(el);
      allTargets.push(el);
    }
  }

  return { popoverTargets, interestTargets, allTargets };
}

export interface ResolveAttachmentTargetOptions {
  /** `@target` arg: Element, selector, or virtual reference. */
  target?: AttachmentTargetInput | null;
  /** Element registered via `{{a.target}}` / `a.setTarget()`. */
  registeredTarget?: AttachmentTarget | null;
  /** Native `[popovertarget]` / `[interestfor]` triggers. */
  triggerTargets?: readonly Element[];
  root?: ParentNode | null;
}

/** Pick the Floating UI reference: `@target`, then yielded registration, then native triggers. */
export function resolveAttachmentTarget({
  target,
  registeredTarget,
  triggerTargets,
  root,
}: ResolveAttachmentTargetOptions): AttachmentTarget | null {
  if (target != null) {
    return coerceTarget(target, root);
  }

  if (registeredTarget != null) {
    return registeredTarget;
  }

  if (triggerTargets && triggerTargets.length > 0) {
    return triggerTargets[0] ?? null;
  }

  return null;
}

/**
 * Extract the DOM Element that should receive event listeners.
 * Real Elements receive events directly. Virtual references may provide a
 * `contextElement`; virtual references without a contextElement attach no listeners.
 */
export function getListenerTarget(target: AttachmentTarget | null | undefined): Element | null {
  if (isElementTarget(target)) {
    return target;
  }

  if (isVirtualReference(target) && isElementTarget(target.contextElement)) {
    return target.contextElement;
  }

  return null;
}
