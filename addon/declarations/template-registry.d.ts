import type AttachPopover from './components/attach-popover';
import type AttachTooltip from './components/attach-tooltip';
import type BasicAttacher from './components/basic-attacher';

export default interface EmberAttacherRegistry {
  AttachPopover: typeof AttachPopover;
  'attach-popover': typeof AttachPopover;
  AttachTooltip: typeof AttachTooltip;
  'attach-tooltip': typeof AttachTooltip;
  BasicAttacher: typeof BasicAttacher;
  'basic-attacher': typeof BasicAttacher;
}
