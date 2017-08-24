import Ember from 'ember';

export function assert(msg, conditional) {
  if (!conditional) {
    throw new Error(msg);
  }
}

export function debug() {
  Ember.Logger.debug(...arguments);
}

export function debugOnError(msg, conditional) {
  if (!conditional) {
    console.error(msg); // eslint-disable-line no-console
    debugger; // eslint-disable-line no-debugger
  }
}

export function stripInProduction(cb) {
  cb();
}
