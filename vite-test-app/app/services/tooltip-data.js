import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class TooltipData extends Service {
  @tracked animation = 'fill';
  @tracked arrow = false;
  @tracked autoUpdate = false;
  @tracked hideDelay = 0;
  @tracked hideDuration = 300;
  @tracked hideOn = 'mouseleave blur escapekey';
  @tracked interactive = false;
  @tracked isShown = false;
  @tracked lazyRender = false;
  @tracked placement = 'top';
  @tracked renderInPlace = false;
  @tracked showDelay = 0;
  @tracked showDuration = 300;
  @tracked showOn = 'mouseenter focus';
  @tracked useCapture = false;
}
