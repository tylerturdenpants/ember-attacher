import type { Placement, Strategy } from '@floating-ui/dom';
import type { AttacherAnimation } from './components/basic-attacher';

export interface EmberAttacherDefaults {
  animation: AttacherAnimation;
  arrow: boolean;
  autoUpdate: boolean;
  flip: string | null;
  hideDelay: number;
  hideDuration: number;
  hideOn: string | null;
  interactive: boolean;
  isOffset: boolean;
  isShown: boolean;
  lazyRender: boolean;
  middleware: null;
  placement: Placement;
  strategy: Strategy;
  floatingElementContainer: string;
  floatingUiOptions: null;
  renderInPlace: boolean;
  showDelay: number;
  showDuration: number;
  showOn: string | null;
  style: null;
  tooltipClass: string;
  useCapture: boolean;
  overflowPadding: number | false;
}

declare const DEFAULTS: EmberAttacherDefaults;
export default DEFAULTS;
