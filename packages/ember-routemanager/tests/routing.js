module('Ember.RouteManager', {
  setup: function() {
  }
});

test('Setup', function() {
  var routeManager = Ember.RouteManager.create();
  equals(routeManager._didSetup, NO, 'Route manager should not have been setup yet');
});
