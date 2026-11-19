import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class PopoverData extends Service {
  @tracked animation = 'shift';
  @tracked arrow = false;
  @tracked autoUpdate = false;
  @tracked hideDelay = 0;
  @tracked hideDuration = 300;
  @tracked hideOn = 'click';
  @tracked interactive = false;
  @tracked isShown = false;
  @tracked lazyRender = false;
  @tracked placement = 'top';
  @tracked renderInPlace = false;
  @tracked showDelay = 0;
  @tracked showDuration = 300;
  @tracked showOn = 'click';
  @tracked useCapture = false;
}
