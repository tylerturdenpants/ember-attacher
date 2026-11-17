import type Component from '@glimmer/component';
import type { htmlSafe } from '@ember/template';
import type { FunctionBasedModifier } from 'ember-modifier';
import type {
  AutoUpdateOptions,
  ComputePositionConfig,
  Placement,
  Strategy,
  VirtualElement,
} from '@floating-ui/dom';

export type AttacherAnimation =
  | 'fade'
  | 'fill'
  | 'none'
  | 'perspective'
  | 'scale'
  | 'shift'
  | (string & {});

export type AttacherTarget = Element | VirtualElement | string;

export interface AttacherBlockParams {
  /** Programmatically hides the attachment. */
  hide: () => void;
  /** Programmatically registers an explicit target Element or VirtualElement. */
  setReference: (target: Element | VirtualElement | null | undefined) => void;
  /** Element modifier yielding target registration when composed into a trigger element. */
  reference: FunctionBasedModifier<{ Element: Element }>;
}

export interface AttachPopoverArgs {
  /** Additional CSS classes appended alongside `@class` on the inner attachment container. */
  additionalClass?: string | null;
  /** Animation applied when showing and hiding the attachment. Defaults to `'fill'`. */
  animation?: AttacherAnimation | null;
  /** ARIA role attribute applied to the attachment element (`'dialog'` by default for `<AttachPopover>`, `'tooltip'` for `<AttachTooltip>`). */
  ariaRole?: string;
  /** Whether to render an arrow element positioned by Floating UI. Defaults to `false`. */
  arrow?: boolean;
  /** Keeps attachment position synced via Floating UI `autoUpdate`. Defaults to `false`. */
  autoUpdate?: boolean | AutoUpdateOptions;
  /** CSS class(es) applied to the inner attachment container. */
  class?: string | null;
  /** Explicit DOM Element, CSS selector string, or Floating UI `VirtualElement` target. */
  explicitTarget?: AttacherTarget | null;
  /** Space-separated fallback placements string passed to Floating UI `flip()`. */
  flip?: string | null;
  /** Explicit portal container Element or CSS selector string (disables Top-Layer promotion). */
  floatingElementContainer?: Element | string | null;
  /** Additional options merged into Floating UI `computePosition()`. */
  floatingUiOptions?: Partial<ComputePositionConfig> | null;
  /** Delay in ms (number or numeric string) before hiding. Defaults to `0`. */
  hideDelay?: number | string;
  /** Exit transition duration in ms (number or numeric string). Defaults to `300`. */
  hideDuration?: number | string;
  /** Space-separated hide triggers (`click`, `clickout`, `mouseleave`, `blur`, `focusout`, `escapekey`), or `null` to disable. */
  hideOn?: string | null;
  /** DOM `id` on the attachment element (also used for ARIA linkage). */
  id?: string;
  /** Keeps attachment open when pointer/focus enters it or traverses the `safePolygon` corridor. Defaults to `false`. */
  interactive?: boolean;
  /** Legacy offset hint kept for 4.x compatibility (`safePolygon` is active automatically in 4.3+). */
  isOffset?: boolean;
  /** Controlled visibility flag. */
  isShown?: boolean;
  /** Defers rendering inner block content until the attachment is first triggered. Defaults to `false`. */
  lazyRender?: boolean;
  /** Floating UI middleware pipeline (merged and deduplicated by `m.name`). */
  middleware?: ComputePositionConfig['middleware'] | null;
  /** Callback invoked when attachment visibility toggles. */
  onChange?: (isVisible: boolean) => unknown;
  /** Lifecycle hook invoked when the attacher binds to its resolved target. */
  onInitializeAttacher?: (target: Element | VirtualElement | null, id: string) => unknown;
  /** Lifecycle hook invoked during component teardown. */
  onWillDestroy?: (target: Element | VirtualElement | null, id: string) => unknown;
  /** Viewport padding passed to default `shift()`, or `false` to disable auto `flip`/`shift`. Defaults to `5`. */
  overflowPadding?: number | false;
  /** Floating UI placement. Defaults to `'top'`. */
  placement?: Placement;
  /** Renders the attachment in place within its parent DOM instead of portaling / promoting to Top Layer. */
  renderInPlace?: boolean;
  /** Delay in ms (number or numeric string) before showing. Defaults to `0`. */
  showDelay?: number | string;
  /** Enter transition duration in ms (number or numeric string). Defaults to `300`. */
  showDuration?: number | string;
  /** Space-separated show triggers (`click`, `mouseenter`, `focus`), or `null` to disable. */
  showOn?: string | null;
  /** CSS positioning strategy (`'absolute'` or `'fixed'`). Defaults to `'absolute'`. */
  strategy?: Strategy;
  /** Trusted `htmlSafe()` style applied to the inner attachment container. */
  style?: ReturnType<typeof htmlSafe> | null;
  /** Attaches event listeners in the capture phase (`true`) or bubble phase (`false`). */
  useCapture?: boolean;
}

export interface BasicAttacherArgs extends AttachPopoverArgs {
  /** Configuration key under `config.emberAttacher` (`'popover'` or `'tooltip'`). */
  configKey?: string;
}

export interface BasicAttacherSignature {
  Element: HTMLDivElement;
  Args: BasicAttacherArgs;
  Blocks: {
    default: [attacher: AttacherBlockParams];
  };
}

export default class BasicAttacher extends Component<BasicAttacherSignature> {
  get id(): string;
}
