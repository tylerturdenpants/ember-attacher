import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class AttachmentExample extends Component {
  @service popoverData;
  @service tooltipData;

  @tracked isConfiguringTooltip = true;

  constructor() {
    super(...arguments);
    this.animationOptions = [
      'fade',
      'fill',
      'none',
      'perspective',
      'scale',
      'shift'
    ];
    this.hideOnOptions = ['click', 'clickout', 'mouseleave blur escapekey'];
    this.placementOptions = [
      'bottom', 'bottom-start', 'bottom-end',
      'left', 'left-start', 'left-end',
      'right', 'right-start', 'right-end',
      'top', 'top-start', 'top-end',
    ];
    this.showOnOptions = ['click', 'mouseenter focus'];
  }

  get service() {
    return this.isConfiguringTooltip ? this.tooltipData : this.popoverData;
  }

  @action
  toggleArrow() {
    this.service.toggleProperty('arrow');
  }

  @action
  toggleAutoUpdate() {
    this.service.toggleProperty('autoUpdate');
  }

  @action
  toggleInteractive() {
    this.service.toggleProperty('interactive');
  }

  @action
  toggleIsShown() {
    this.service.toggleProperty('isShown');
  }

  @action
  toggleLazyRender() {
    this.service.toggleProperty('lazyRender');
  }

  @action
  toggleRenderInPlace() {
    this.service.toggleProperty('renderInPlace');
  }

  @action
  setIsConfiguringTooltip(bool) {
    this.isConfiguringTooltip = bool;
  }
}
