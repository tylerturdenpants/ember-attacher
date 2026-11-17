import Component from '@glimmer/component';
import AttacherCore from '../lib/attacher-core.js';
import MaybeInElement from './basic-attacher/maybe-in-element.gjs';

const CORE_FIELDS = [
  'animation',
  'arrow',
  'autoUpdate',
  'hide',
  'hideOn',
  'id',
  'insertArrow',
  'isFillAnimation',
  'isShown',
  'isShownDidUpdate',
  'optionsDidUpdate',
  'parentFinder',
  'placement',
  'reference',
  'renderFloatingElement',
  'setReference',
  'setupFloatingElement',
  'shouldRenderFloatingElement',
  'showOn',
  'strategy',
  'targetDidUpdate',
  'useCapture',
  '_class',
  '_floatingElementContainer',
  '_middleware',
  '_popoverAttr',
  '_renderInPlace',
  '_style',
];

export default class BasicAttacher extends Component {
  MaybeInElement = MaybeInElement;

  constructor(owner, args) {
    super(owner, args);
    this.core = new AttacherCore(this, () => this.args, {
      defaultConfigKey: this._defaultConfigKey,
      defaultAriaRole: this._defaultAriaRole,
      getAdditionalClass: () => this.additionalClass,
      getAriaRole: () => this.ariaRole,
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

  willDestroy() {
    super.willDestroy(...arguments);
    this.core.destroy();
  }
}

for (const field of CORE_FIELDS) {
  Object.defineProperty(BasicAttacher.prototype, field, {
    get() {
      return this.core[field];
    },
  });
}
