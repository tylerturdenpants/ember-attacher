import Modifier from 'ember-modifier';
import { scheduleModifierWork } from './-schedule-modifier-work';

export default class DidInsertFloatingElementModifier extends Modifier {
  didSetup = false;

  modify(element, _positional, { component }) {
    if (this.didSetup) {
      return;
    }

    this.didSetup = true;
    scheduleModifierWork(() => {
      component.didInsertFloatingElement(element);
    });
  }
}
