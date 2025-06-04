import Service from '@ember/service';

export default class TooltipData extends Service {
  animation = 'fill';
  arrow = false;
  autoUpdate = false;
  hideDelay = 0;
  hideDuration = 300;
  hideOn = 'mouseleave blur escapekey';
  interactive = false;
  isShown = false;
  lazyRender = false;
  placement = 'top';
  renderInPlace = false;
  showDelay = 0;
  showDuration = 300;
  showOn = 'mouseenter focus';
  useCapture = false;
}

