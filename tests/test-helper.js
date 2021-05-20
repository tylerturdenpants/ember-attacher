import Application from '../app';
import { registerWaiter } from 'ember-raf-test-waiter';
import config from '../config/environment';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';
import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';


setup(QUnit.assert);

setApplication(Application.create(config.APP));

registerWaiter();

start();
