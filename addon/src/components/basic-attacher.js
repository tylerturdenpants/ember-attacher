import Component from '@glimmer/component';
import AttacherCore from '../lib/attacher-core.js';
import MaybeInElement from './basic-attacher/maybe-in-element.gjs';

export default class BasicAttacher extends Component {
  MaybeInElement = MaybeInElement;

  constructor(owner, args) {
    super(owner, args);
    this.core = new AttacherCore(this, () => this.args, {
      defaultConfigKey: this._defaultConfigKey,
      defaultAriaRole: this._defaultAriaRole,
      getAdditionalClass: () => this.additionalClass,
      allowParentFallback: true,
      isComponentHost: true,
    });
  }

  get _defaultConfigKey() {
    return null;
  }

  get _defaultAriaRole() {
    return undefined;
  }

  get ariaRole() {
    return this.args.ariaRole ?? this._defaultAriaRole;
  }

  get additionalClass() {
    return this.args.additionalClass || '';
  }

  get id() {
    return this.core.id;
  }

  get api() {
    return this.core.api;
  }

  get hide() {
    return this.core.hide;
  }

  get setReference() {
    return this.core.setReference;
  }

  get reference() {
    return this.core.reference;
  }

  get parentFinder() {
    return this.core.parentFinder;
  }

  get targetDidUpdate() {
    return this.core.targetDidUpdate;
  }

  get isShownDidUpdate() {
    return this.core.isShownDidUpdate;
  }

  get optionsDidUpdate() {
    return this.core.optionsDidUpdate;
  }

  get setupFloatingElement() {
    return this.core.setupFloatingElement;
  }

  get insertArrow() {
    return this.core.insertArrow;
  }

  get renderFloatingElement() {
    return this.core.renderFloatingElement;
  }

  get shouldRenderFloatingElement() {
    return this.core.shouldRenderFloatingElement;
  }

  get floatingElementContainer() {
    return this.core._floatingElementContainer;
  }

  get renderInPlaceFlag() {
    return this.core._renderInPlace;
  }

  get popoverAttr() {
    return this.core._popoverAttr;
  }

  get innerClass() {
    return this.core._class;
  }

  get innerStyle() {
    return this.core._style;
  }

  get hideOn() {
    return this.core.hideOn;
  }

  get showOn() {
    return this.core.showOn;
  }

  get controlledIsShown() {
    return this.core.controlledIsShown;
  }

  get autoUpdate() {
    return this.core.autoUpdate;
  }

  get animation() {
    return this.core.animation;
  }

  get arrow() {
    return this.core.arrow;
  }

  get useCapture() {
    return this.core.useCapture;
  }

  get placement() {
    return this.core.placement;
  }

  get strategy() {
    return this.core.strategy;
  }

  get middleware() {
    return this.core._middleware;
  }

  get isFillAnimation() {
    return this.core.isFillAnimation;
  }
}
