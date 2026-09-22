import Modifier from 'ember-modifier';

export default class OnIsShownChangeModifier extends Modifier {
  didSetup = false;

  modify(_element, positional, { component }) {
    // Consume positional args so ember-modifier re-runs when they change.
    positional.forEach((arg) => void arg);

    if (!this.didSetup) {
      this.didSetup = true;
      return;
    }

    component.onIsShownChange();
  }
}
