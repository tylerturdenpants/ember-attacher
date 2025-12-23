import Service from '@ember/service';

export default class PopoverData extends Service {
  animation = 'shift';
  arrow = false;
  autoUpdate = false;
  hideDelay = 0;
  hideDuration = 300;
  hideOn = 'click';
  interactive = false;
  isShown = false;
  lazyRender = false;
  placement = 'top';
  renderInPlace = false;
  showDelay = 0;
  showDuration = 300;
  showOn = 'click';
  useCapture = false;
}
