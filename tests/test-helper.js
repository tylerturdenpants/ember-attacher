import Application from '../app';
import { registerWaiter } from 'ember-raf-test-waiter';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';

registerWaiter();

setApplication(Application.create({ autoboot: false }));

start();
