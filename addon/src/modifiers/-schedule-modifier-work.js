import { schedule } from '@ember/runloop';

export function scheduleModifierWork(callback) {
  schedule('actions', null, callback);
}
