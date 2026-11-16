import { arrow, flip, limitShift, shift } from '@floating-ui/dom';
import { isElementTarget } from './target-resolution.js';

/**
 * Check whether an attachment target (DOM Element or VirtualElement) is still connected.
 *
 * @param {Element | { contextElement?: Element } | null | undefined} target
 * @returns {boolean}
 */
export function isTargetConnected(target) {
  if (!target) {
    return false;
  }

  if (isElementTarget(target)) {
    return target.isConnected;
  }

  if (target.contextElement instanceof Element) {
    return target.contextElement.isConnected;
  }

  return true;
}

/**
 * Normalize and deduplicate the Floating UI middleware array without mutating
 * caller-supplied middleware objects.
 *
 * @param {{
 *   rawMiddleware: Array<any> | null | undefined,
 *   arrowElement: Element | null,
 *   flipOption: string | null | undefined,
 *   overflowPadding: number | boolean | undefined,
 *   arrowEnabled: boolean,
 * }} options
 * @returns {Array<any>}
 */
export function buildMiddleware({
  rawMiddleware,
  arrowElement,
  flipOption,
  overflowPadding,
  arrowEnabled,
}) {
  const middleware = (rawMiddleware || []).map((m) => {
    if (m?.name === 'arrow' && arrowElement) {
      if (typeof m.options === 'function') {
        return arrow((state) => {
          const resolved = m.options(state) || {};
          return resolved.element ? resolved : { ...resolved, element: arrowElement };
        });
      }
      if (!m.options?.element) {
        return arrow({ ...m.options, element: arrowElement });
      }
    }
    return m;
  });

  if (!middleware.some((m) => m?.name === 'flip')) {
    if (flipOption) {
      middleware.push(flip({ fallbackPlacements: flipOption.split(' ') }));
    } else if (overflowPadding !== false) {
      middleware.push(flip());
    }
  }

  if (overflowPadding !== false && !middleware.some((m) => m?.name === 'shift')) {
    middleware.push(shift({ limiter: limitShift(), padding: overflowPadding }));
  }

  if (arrowEnabled && arrowElement && !middleware.some((m) => m?.name === 'arrow')) {
    middleware.push(arrow({ element: arrowElement }));
  }

  return middleware;
}

/**
 * Apply the resolved `computePosition` coordinates, arrow offset, `middlewareData.hide`
 * attributes, and `x-placement` to the floating and arrow elements.
 *
 * @param {Element} floatingElement
 * @param {Element | null} arrowElement
 * @param {{
 *   x: number,
 *   y: number,
 *   placement: string,
 *   strategy: string,
 *   middlewareData: Record<string, any>,
 *   isHidden: boolean,
 * }} result
 */
export function applyPositionResult(
  floatingElement,
  arrowElement,
  { x, y, placement, strategy, middlewareData, isHidden }
) {
  Object.assign(floatingElement.style, {
    position: strategy,
    left: `${x}px`,
    top: `${y}px`,
  });

  if (middlewareData.arrow && arrowElement) {
    const { x: arrowX, y: arrowY } = middlewareData.arrow;
    Object.assign(arrowElement.style, {
      left: arrowX != null ? `${arrowX}px` : '',
      top: arrowY != null ? `${arrowY}px` : '',
    });
  }

  if (middlewareData.hide) {
    const { referenceHidden, escaped } = middlewareData.hide;

    if (referenceHidden) {
      floatingElement.setAttribute('data-reference-hidden', '');
    } else {
      floatingElement.removeAttribute('data-reference-hidden');
    }

    if (escaped) {
      floatingElement.setAttribute('data-escaped', '');
    } else {
      floatingElement.removeAttribute('data-escaped');
    }

    if (referenceHidden || escaped) {
      floatingElement.style.visibility = 'hidden';
    } else if (!isHidden) {
      floatingElement.style.visibility = '';
    }
  }

  floatingElement.setAttribute('x-placement', placement);
}
