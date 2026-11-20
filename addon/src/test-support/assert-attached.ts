import type { Placement } from '@floating-ui/dom';
import { isVisible } from './is-visible';

export type ElementOrSelector = Element | string | null | undefined;

/** The subset of QUnit's `assert` that `assertAttached` needs. */
export interface ResultPusher {
  pushResult(result: {
    result: boolean;
    actual: unknown;
    expected: unknown;
    message?: string;
  }): void;
}

export interface AssertAttachedOptions {
  /** Expected resolved placement (`data-placement`), e.g. `'bottom'` or `'top-start'`. */
  placement?: Placement;
  /** Largest allowed distance in px between the facing edges of target and attachment. Default `24`. */
  maxGap?: number;
  /** Slack in px for edge comparisons. Default `1`. */
  tolerance?: number;
  message?: string;
}

const DEFAULT_MAX_GAP = 24;
const DEFAULT_TOLERANCE = 1;

/**
 * Asserts that an attachment is shown next to its target the way a user would see it:
 * visible, on the resolved side, within `maxGap`, overlapping the target on the cross axis,
 * with the arrow (if any) pointing at the target, inside the viewport, and not covered
 * by another element. Pushes one result listing every problem found.
 */
export function assertAttached(
  assert: ResultPusher,
  attachment: ElementOrSelector,
  target: ElementOrSelector,
  options: AssertAttachedOptions = {},
): void {
  const problems = findProblems(resolve(attachment), resolve(target), options);

  assert.pushResult({
    result: problems.length === 0,
    actual: problems,
    expected: [],
    message: options.message ?? 'attachment is attached to its target',
  });
}

function resolve(elementOrSelector: ElementOrSelector): Element | null {
  return typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : (elementOrSelector ?? null);
}

function resolvePaintedElement(attachment: Element): Element {
  return (
    attachment.querySelector(
      ':scope > .ember-attacher-tooltip, :scope > .ember-attacher-popover',
    ) ??
    (attachment.classList.contains('ember-attacher')
      ? attachment.querySelector(':scope > div:not(.ember-attacher-arrow)')
      : null) ??
    attachment
  );
}

function findProblems(
  attachment: Element | null,
  target: Element | null,
  { placement, maxGap = DEFAULT_MAX_GAP, tolerance = DEFAULT_TOLERANCE }: AssertAttachedOptions,
): string[] {
  if (!attachment) return ['attachment not found'];
  if (!target) return ['target not found'];
  if (!isVisible(attachment)) return ['attachment is not visible'];

  const problems: string[] = [];
  const resolved = attachment.getAttribute('data-placement') as Placement | null;

  if (!resolved) return ['attachment has no data-placement'];
  if (placement && resolved !== placement) {
    problems.push(`expected placement "${placement}", got "${resolved}"`);
  }

  const painted = resolvePaintedElement(attachment);
  const a = painted.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const side = resolved.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';
  const vertical = side === 'top' || side === 'bottom';

  const gap = {
    bottom: a.top - t.bottom,
    top: t.top - a.bottom,
    right: a.left - t.right,
    left: t.left - a.right,
  }[side];
  const sideWord = { bottom: 'below', top: 'above', right: 'right of', left: 'left of' }[side];

  if (gap < -tolerance) {
    problems.push(`attachment is not ${sideWord} its target (overlaps by ${round(-gap)}px)`);
  } else if (gap > maxGap + tolerance) {
    problems.push(`gap to target is ${round(gap)}px, more than ${maxGap}px`);
  }

  const [aStart, aEnd, tStart, tEnd] = vertical
    ? [a.left, a.right, t.left, t.right]
    : [a.top, a.bottom, t.top, t.bottom];
  if (aEnd < tStart - tolerance || aStart > tEnd + tolerance) {
    problems.push('attachment does not overlap its target on the cross axis');
  }

  const arrow = attachment.querySelector('.ember-attacher-arrow');
  if (arrow && isVisible(arrow)) {
    const r = arrow.getBoundingClientRect();
    const center = vertical ? r.left + r.width / 2 : r.top + r.height / 2;
    if (center < tStart - tolerance || center > tEnd + tolerance) {
      problems.push('arrow does not point at the target');
    }
  }

  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  if (
    a.left < -tolerance ||
    a.top < -tolerance ||
    a.right > viewportWidth + tolerance ||
    a.bottom > viewportHeight + tolerance
  ) {
    problems.push('attachment overflows the viewport');
  }

  if (getComputedStyle(painted).pointerEvents !== 'none') {
    const hit = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2);
    if (hit && !painted.contains(hit)) {
      problems.push(`attachment is covered by ${describe(hit)}`);
    }
  }

  return problems;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function describe(element: Element): string {
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList, (c) => `.${c}`).join('');
  return `<${element.tagName.toLowerCase()}${id}${classes}>`;
}
