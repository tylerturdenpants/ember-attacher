import type AttachPopover from './components/attach-popover';
import type AttachTooltip from './components/attach-tooltip';
import type Attacher from './components/attacher';
import type BasicAttacher from './components/basic-attacher';
import type tooltip from './modifiers/tooltip';

export default interface EmberAttacherRegistry {
  AttachPopover: typeof AttachPopover;
  'attach-popover': typeof AttachPopover;
  AttachTooltip: typeof AttachTooltip;
  'attach-tooltip': typeof AttachTooltip;
  Attacher: typeof Attacher;
  attacher: typeof Attacher;
  BasicAttacher: typeof BasicAttacher;
  'basic-attacher': typeof BasicAttacher;
  tooltip: typeof tooltip;
}
