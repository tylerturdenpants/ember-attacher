import Modifier from 'ember-modifier';
import { registerDestructor } from '@ember/destroyable';

function cleanup(instance) {
  instance.component?.willDestroyFloatingElement();
}

export default class WillDestroyFloatingElementModifier extends Modifier {
  component = null;

  constructor(owner, args) {
    super(owner, args);
    registerDestructor(this, cleanup);
  }

  modify(_element, _positional, { component }) {
    this.component = component;
  }
}
