import Ember from 'ember';

export default Ember.Controller.extend({
  popperOptions: {
    placement: 'top',
    modifiers: {
      flip: {
        behavior: ['left', 'right']
      }
    }
  }
});
