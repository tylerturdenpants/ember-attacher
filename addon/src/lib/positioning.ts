import {
  arrow,
  flip,
  limitShift,
  offset,
  platform as defaultPlatform,
  shift,
  type ComputePositionConfig,
  type Middleware,
  type MiddlewareData,
  type OffsetOptions,
  type Placement,
  type Platform,
  type Strategy,
} from '@floating-ui/dom';
import { isElementTarget, type AttachmentTarget } from './target-resolution';

const DEFAULT_SHIFT_PADDING = 5;
const OVERFLOW_CLIP_RE = /auto|scroll|overlay|hidden|clip/;

function isTopLayerElement(element: Element): boolean {
  try {
    if (element.matches(':popover-open')) {
      return true;
    }
  } catch {
    // Unsupported selector in older engines
  }
  try {
    if (element.matches(':modal')) {
      return true;
    }
  } catch {
    // Unsupported selector in older engines
  }
  return false;
}

function findEnclosingTopLayerHost(element: Element): Element | null {
  let current: Element | null = element.parentElement;
  while (current) {
    if (isTopLayerElement(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function collectOverflowAncestorsUpTo(element: Element, topLayerHost: Element): Element[] {
  const ancestors: Element[] = [];
  let current: Element | null = element.parentElement;
  while (current) {
    const isManagedTopLayerHost =
      current.classList.contains('ember-attacher') && current.hasAttribute('popover');

    if (!isManagedTopLayerHost && typeof getComputedStyle === 'function') {
      const { overflow, overflowX, overflowY, display } = getComputedStyle(current);
      if (
        OVERFLOW_CLIP_RE.test(overflow + overflowY + overflowX) &&
        display !== 'inline' &&
        display !== 'contents'
      ) {
        ancestors.push(current);
      }
    }

    if (current === topLayerHost) {
      break;
    }
    current = current.parentElement;
  }
  return ancestors;
}

/**
 * Floating UI platform adapter that stops `clippingAncestors` discovery at the
 * nearest enclosing Top-Layer host (`:popover-open` or `:modal`), preventing
 * background page overflow containers from falsely clipping references inside
 * dialogs or nested popovers while preserving scroll clipping inside that host.
 */
export const topLayerAwarePlatform: Platform = {
  ...defaultPlatform,
  getClippingRect(args) {
    if (
      args.boundary === 'clippingAncestors' &&
      isElementTarget(args.element) &&
      !isTopLayerElement(args.element)
    ) {
      const topLayerHost = findEnclosingTopLayerHost(args.element);
      if (topLayerHost) {
        const scopedAncestors = collectOverflowAncestorsUpTo(args.element, topLayerHost);
        return defaultPlatform.getClippingRect.call(this, {
          ...args,
          boundary: scopedAncestors,
        });
      }
    }
    return defaultPlatform.getClippingRect.call(this, args);
  },
};

/** Check whether an attachment target (DOM Element or VirtualElement) is still connected. */
export function isTargetConnected(target: AttachmentTarget | null | undefined): boolean {
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

export interface BuildMiddlewareOptions {
  rawMiddleware?: ComputePositionConfig['middleware'] | null;
  offsetOptions?: OffsetOptions | null;
  arrowElement: Element | null;
  arrowEnabled: boolean;
}

/** Whether a normalized middleware pipeline includes an `offset` entry. */
export function hasOffsetMiddleware(middleware: readonly Middleware[]): boolean {
  return middleware.some((m) => m.name === 'offset');
}

/**
 * Normalize and deduplicate the Floating UI middleware array without mutating
 * caller-supplied middleware objects.
 */
export function buildMiddleware({
  rawMiddleware,
  offsetOptions,
  arrowElement,
  arrowEnabled,
}: BuildMiddlewareOptions): Middleware[] {
  const middleware: Middleware[] = [];

  for (const m of rawMiddleware || []) {
    if (!m) {
      continue;
    }

    if (m.name === 'arrow' && arrowElement) {
      if (typeof m.options === 'function') {
        const optionsFn = m.options;
        middleware.push(
          arrow((state) => {
            const resolved = optionsFn(state) || {};
            return resolved.element ? resolved : { ...resolved, element: arrowElement };
          })
        );
        continue;
      }
      if (!(m.options as { element?: Element } | undefined)?.element) {
        middleware.push(
          arrow({ ...(m.options as Record<string, unknown> | undefined), element: arrowElement })
        );
        continue;
      }
    }

    middleware.push(m);
  }

  if (offsetOptions !== undefined && offsetOptions !== null && !hasOffsetMiddleware(middleware)) {
    middleware.unshift(offset(offsetOptions));
  }

  if (!middleware.some((m) => m.name === 'flip')) {
    middleware.push(flip());
  }

  if (!middleware.some((m) => m.name === 'shift')) {
    middleware.push(shift({ limiter: limitShift(), padding: DEFAULT_SHIFT_PADDING }));
  }

  if (arrowEnabled && arrowElement && !middleware.some((m) => m.name === 'arrow')) {
    middleware.push(arrow({ element: arrowElement }));
  }

  return middleware;
}

export interface ApplyPositionResultOptions {
  x: number;
  y: number;
  placement: Placement;
  strategy: Strategy;
  middlewareData: MiddlewareData;
  isHidden: boolean;
}

/**
 * Apply the resolved `computePosition` coordinates, arrow offset, `middlewareData.hide`
 * attributes, `data-placement`, and `x-placement` to the floating and arrow elements.
 */
export function applyPositionResult(
  floatingElement: HTMLElement,
  arrowElement: HTMLElement | null,
  { x, y, placement, strategy, middlewareData, isHidden }: ApplyPositionResultOptions
): void {
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

  let hiddenByMiddleware = false;
  if (middlewareData.hide) {
    const { referenceHidden, escaped } = middlewareData.hide;
    hiddenByMiddleware = Boolean(referenceHidden || escaped);

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
  } else {
    floatingElement.removeAttribute('data-reference-hidden');
    floatingElement.removeAttribute('data-escaped');
  }

  if (hiddenByMiddleware) {
    floatingElement.style.visibility = 'hidden';
  } else if (!isHidden) {
    floatingElement.style.visibility = '';
  }

  floatingElement.setAttribute('data-placement', placement);
  floatingElement.setAttribute('x-placement', placement);
}
