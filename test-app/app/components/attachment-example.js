import Component from '@glimmer/component';
import { action } from '@ember/object';
import * as emberService from '@ember/service';
import { tracked } from '@glimmer/tracking';

const service = emberService.service ?? emberService.inject;

export default class AttachmentExample extends Component {
  @service popoverData;
  @service tooltipData;

  @tracked isConfiguringTooltip = true;

  animationOptions = [
    'fade',
    'fill',
    'none',
    'perspective',
    'scale',
    'shift',
  ];
  hideOnOptions = ['click', 'clickout', 'mouseleave blur escapekey'];
  placementOptions = [
    'bottom', 'bottom-start', 'bottom-end',
    'left', 'left-start', 'left-end',
    'right', 'right-start', 'right-end',
    'top', 'top-start', 'top-end',
  ];
  showOnOptions = ['click', 'mouseenter focus'];

  get service() {
    return this.isConfiguringTooltip ? this.tooltipData : this.popoverData;
  }

  @action
  toggleArrow() {
    this.service.arrow = !this.service.arrow;
  }

  @action
  toggleAutoUpdate() {
    this.service.autoUpdate = !this.service.autoUpdate;
  }

  @action
  toggleInteractive() {
    this.service.interactive = !this.service.interactive;
  }

  @action
  toggleIsShown() {
    this.service.isShown = !this.service.isShown;
  }

  @action
  toggleLazyRender() {
    this.service.lazyRender = !this.service.lazyRender;
  }

  @action
  toggleRenderInPlace() {
    this.service.renderInPlace = !this.service.renderInPlace;
  }

  @action
  setIsConfiguringTooltip(bool) {
    this.isConfiguringTooltip = bool;
  }

  @action
  setTooltipIsShown(isShown) {
    this.tooltipData.isShown = isShown;
  }

  @action
  setPopoverIsShown(isShown) {
    this.popoverData.isShown = isShown;
  }

  @action
  updateAnimation({ target }) {
    this.service.animation = target.value;
  }

  @action
  updateHideDelay({ target }) {
    this.service.hideDelay = Number(target.value) || 0;
  }

  @action
  updateHideDuration({ target }) {
    this.service.hideDuration = Number(target.value) || 0;
  }

  @action
  updateHideOn({ target }) {
    this.service.hideOn = target.value;
  }

  @action
  updatePlacement({ target }) {
    this.service.placement = target.value;
  }

  @action
  updateShowDelay({ target }) {
    this.service.showDelay = Number(target.value) || 0;
  }

  @action
  updateShowDuration({ target }) {
    this.service.showDuration = Number(target.value) || 0;
  }

  @action
  updateShowOn({ target }) {
    this.service.showOn = target.value;
  }
}
