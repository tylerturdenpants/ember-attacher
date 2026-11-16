import { elementContainsEvent } from './dom.js';

const activeAttachers = new Set();
const floatingElementParentMap = new WeakMap();
const handledEscapeEvents = new WeakSet();

/**
 * Register a mounted BasicAttacher instance in the in-process attachment tree.
 *
 * @param {object} attacher
 */
export function registerAttacher(attacher) {
  activeAttachers.add(attacher);
}

/**
 * Unregister a destroyed BasicAttacher instance from the in-process attachment tree.
 *
 * @param {object} attacher
 */
export function unregisterAttacher(attacher) {
  activeAttachers.delete(attacher);
}

/**
 * Resolve the logical parent BasicAttacher whose floating element contains
 * this attacher's target or template parent element.
 *
 * @param {object} child
 * @returns {object | null}
 */
export function getParentAttacher(child) {
  const anchors = [child._listenerTarget, child.parentElement].filter(Boolean);

  for (const anchor of anchors) {
    const start = anchor.classList?.contains('ember-attacher')
      ? anchor.parentElement
      : anchor;
    const hostEl = start?.closest?.('.ember-attacher');
    if (hostEl && hostEl !== child._floatingElement) {
      for (const candidate of activeAttachers) {
        if (candidate !== child && candidate._floatingElement === hostEl) {
          if (child._floatingElement) {
            floatingElementParentMap.set(child._floatingElement, candidate);
          }
          return candidate;
        }
      }
    }
  }

  if (child._floatingElement && floatingElementParentMap.has(child._floatingElement)) {
    return floatingElementParentMap.get(child._floatingElement) ?? null;
  }

  return null;
}

/**
 * Cache the parent attachment relationship on the child's floating element so
 * clicks that unmount the child mid-event still trace back to the parent via composedPath.
 *
 * @param {object} attacher
 */
export function syncParentAttachment(attacher) {
  getParentAttacher(attacher);
}

/**
 * Check whether `candidate` is a logical descendant of `ancestor` in the attachment tree.
 *
 * @param {object} candidate
 * @param {object} ancestor
 * @returns {boolean}
 */
export function isDescendantOf(candidate, ancestor) {
  const visited = new Set();
  let current = getParentAttacher(candidate);

  while (current && !visited.has(current)) {
    if (current === ancestor) {
      return true;
    }
    visited.add(current);
    current = getParentAttacher(current);
  }

  return false;
}

/**
 * Determine whether a DOM event originated inside any logical descendant Attachment
 * (or its Target) of `parent`.
 *
 * @param {object} parent
 * @param {Event} event
 * @returns {boolean}
 */
export function descendantAttachmentContainsEvent(parent, event) {
  for (const candidate of activeAttachers) {
    if (candidate !== parent && isDescendantOf(candidate, parent)) {
      if (
        elementContainsEvent(candidate._floatingElement, event) ||
        elementContainsEvent(candidate._listenerTarget, event)
      ) {
        return true;
      }
    }
  }

  const path = typeof event?.composedPath === 'function' ? event.composedPath() : null;
  if (path) {
    for (const node of path) {
      let currentParent = floatingElementParentMap.get(node);
      const visited = new Set();
      while (currentParent && !visited.has(currentParent)) {
        if (currentParent === parent) {
          return true;
        }
        visited.add(currentParent);
        currentParent =
          getParentAttacher(currentParent) ??
          (currentParent._floatingElement
            ? floatingElementParentMap.get(currentParent._floatingElement)
            : null);
      }
    }
  }

  return false;
}

/**
 * Determine whether a DOM node is contained inside any logical descendant Attachment
 * (or its Target) of `parent`.
 *
 * @param {object} parent
 * @param {Node | null | undefined} node
 * @returns {boolean}
 */
export function descendantAttachmentContainsNode(parent, node) {
  if (!node) {
    return false;
  }

  for (const candidate of activeAttachers) {
    if (candidate !== parent && isDescendantOf(candidate, parent)) {
      if (
        candidate._floatingElement?.contains(node) ||
        candidate._listenerTarget?.contains(node)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Enforce LIFO Escape dismissal across nested Attachments: only the deepest
 * currently open escapable Attachment handles a given Escape keydown event.
 *
 * @param {object} attacher
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
export function shouldHandleEscapeKey(attacher, event) {
  if (handledEscapeEvents.has(event)) {
    return false;
  }

  for (const candidate of activeAttachers) {
    if (
      candidate !== attacher &&
      !candidate.isDestroyed &&
      !candidate.isDestroying &&
      !candidate._isHiding &&
      !candidate._positioningSuspended &&
      Boolean(candidate._hideListenersOnDocumentByEvent?.keydown) &&
      isDescendantOf(candidate, attacher)
    ) {
      return false;
    }
  }

  handledEscapeEvents.add(event);
  return true;
}
