import Ember from 'ember';

export default Ember.Controller.extend({
  popperOptions: {
    modifiers: {
      flip: {
        behavior: ['left', 'right']
      },
      preventOverflow: {
        // TODO(kjb) Consider making this the default
        boundariesElement: 'viewport'
      }
    }
  }
});
