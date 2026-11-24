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

/** Whether a `@target` string uses a relative DOM token (`:previous`, `:previous(...)`, `:parent`, `:closest(...)`). */
export function isRelativeTargetToken(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(':');
}

/** Non-asserting lookup for relative target tokens used to detect stale DOM bindings. */
export function peekRelativeTarget(
  token: string,
  floatingElement: Element | null | undefined
): Element | null {
  if (!floatingElement) {
    return null;
  }

  if (token === ':parent') {
    return floatingElement.parentElement;
  }

  if (token === ':previous' || (token.startsWith(':previous(') && token.endsWith(')'))) {
    const selector = token === ':previous' ? null : token.slice(':previous('.length, -1).trim();
    if (selector !== null && selector.length === 0) {
      return null;
    }
    let sibling = floatingElement.previousElementSibling;
    while (sibling?.classList.contains('ember-attacher')) {
      sibling = sibling.previousElementSibling;
    }
    if (!sibling) {
      return null;
    }
    if (selector && !sibling.matches(selector)) {
      return null;
    }
    return sibling;
  }

  if (token.startsWith(':closest(') && token.endsWith(')')) {
    const selector = token.slice(':closest('.length, -1).trim();
    if (!selector) {
      return null;
    }
    return floatingElement.parentElement?.closest(selector) ?? null;
  }

  return null;
}

function resolveRelativeTarget(
  token: string,
  floatingElement: Element | null | undefined
): Element | null {
  assert(
    `@target="${token}" requires a mounted Attachment Host element (<AttachTooltip>, <AttachPopover>, or <Attacher @lazyRender={{false}}>).`,
    floatingElement != null
  );

  if (!floatingElement) {
    return null;
  }

  if (token === ':parent') {
    const parent = floatingElement.parentElement;
    assert('@target=":parent" could not resolve a parentElement', parent != null);
    return parent;
  }

  if (token === ':previous' || (token.startsWith(':previous(') && token.endsWith(')'))) {
    const selector = token === ':previous' ? null : token.slice(':previous('.length, -1).trim();
    assert('@target=":previous()" requires a non-empty selector', selector === null || selector.length > 0);

    let sibling = floatingElement.previousElementSibling;
    while (sibling?.classList.contains('ember-attacher')) {
      sibling = sibling.previousElementSibling;
    }

    assert(`@target="${token}" found no preceding non-attacher sibling element`, sibling != null);

    if (sibling && selector) {
      assert(
        `@target="${token}" expected the preceding sibling <${sibling.tagName.toLowerCase()}> to match "${selector}"`,
        sibling.matches(selector)
      );
      return sibling.matches(selector) ? sibling : null;
    }

    return sibling;
  }

  if (token.startsWith(':closest(') && token.endsWith(')')) {
    const selector = token.slice(':closest('.length, -1).trim();
    assert('@target=":closest()" requires a non-empty selector', selector.length > 0);

    const match = floatingElement.parentElement?.closest(selector) ?? null;
    assert(`@target="${token}" found no ancestor matching "${selector}"`, match != null);
    return match;
  }

  assert(
    `[ember-attacher] Unknown relative @target token "${token}". Supported: :previous, :previous(<selector>), :parent, :closest(<selector>).`,
    false
  );

  return null;
}

/**
 * Resolve a public `@target` value (Element | selector | relative token | virtual ref).
 *
 * Selector strings use `querySelectorAll` and must match exactly one node.
 * Relative tokens (`:previous`, `:previous(selector)`, `:parent`, `:closest(selector)`)
 * resolve from the in-place `floatingElement` Host without `<meta hidden>` markers.
 */
export function coerceTarget(
  value: AttachmentTargetInput | null | undefined,
  root?: ParentNode | null,
  floatingElement?: Element | null
): AttachmentTarget | null {
  if (value == null) {
    return null;
  }

  if (isElementTarget(value) || isVirtualReference(value)) {
    return value;
  }

  if (typeof value === 'string') {
    if (isRelativeTargetToken(value)) {
      return resolveRelativeTarget(value, floatingElement);
    }

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
  /** `@target` arg: Element, selector, relative token, or virtual reference. */
  target?: AttachmentTargetInput | null;
  /** Element registered via `{{a.target}}` / `a.setTarget()`. */
  registeredTarget?: AttachmentTarget | null;
  /** Native `[popovertarget]` / `[interestfor]` triggers. */
  triggerTargets?: readonly Element[];
  root?: ParentNode | null;
  /** In-place Attachment Host element used to resolve relative `@target` tokens. */
  floatingElement?: Element | null;
}

/** Pick the Floating UI reference: `@target`, then yielded registration, then native triggers. */
export function resolveAttachmentTarget({
  target,
  registeredTarget,
  triggerTargets,
  root,
  floatingElement,
}: ResolveAttachmentTargetOptions): AttachmentTarget | null {
  if (target != null) {
    return coerceTarget(target, root, floatingElement);
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
