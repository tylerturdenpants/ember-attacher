import Application from '../app';
import { registerWaiter } from 'ember-raf-test-waiter';
import config from '../config/environment';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';

registerWaiter();

setApplication(Application.create(config.APP));

start();
