module('Ember.RouteManager', {
  setup: function() {
  }
});

test('Setup', function() {
  var routeManager = Ember.RouteManager.create();
  equals(routeManager._didSetup, NO, 'Route manager should not have been setup yet');
  routeManager.destroy();
});


test('Basic Static Route', function() {
  
  var stateReached = false;
  
  var routeManager = Ember.RouteManager.create({
    posts: Ember.State.create({
      path: 'posts',
      
      comments: Ember.State.create({
        path: 'comments',
        enter: function() {
          stateReached = true;
        }
      })
    })
  });
  
  routeManager.set('location', 'posts/comments');
  
  ok(stateReached, 'The state should have been reached.')
  
  routeManager.destroy();
});

test('Multi-part Static Routes', function() {
  
  var stateReached = false;
  
  var routeManager = Ember.RouteManager.create({
    posts: Ember.State.create({
      path: 'posts',
      
      comments: Ember.State.create({
        path: 'comments/all',
        enter: function() {
          stateReached = true;
        }
      })
    })
  });
  
  routeManager.set('location', 'posts/comments/all');
  
  ok(stateReached, 'The state should have been reached.')
  
  routeManager.destroy();
});


test('Route With Params', function() {
  
  var commentId;
  var postId;
  
  var routeManager = Ember.RouteManager.create({
    post: Ember.State.create({
      path: 'posts/:postId',
      enter: function(stateManager) {
        postId = stateManager.params.postId
      },
      
      comment: Ember.State.create({
        path: 'comments/:commentId',
        enter: function(stateManager) {
          commentId = stateManager.params.commentId
        }
      })
    })
  });
  
  routeManager.set('location', 'posts/1/comments/4');
  
  equals(postId, 1, "The first param should have been set.");
  equals(commentId, 4, "The second param should have been set.");
  
  routeManager.destroy();
});

test('Routes With Pathless State', function() {
  var stateReached = false;
  
  var routeManager = Ember.RouteManager.create({
    post: Ember.State.create({
      path: 'posts/:postId',
      enter: function(stateManager) {
        postId = stateManager.params.postId
      },
      admin: Ember.State.create({
        edit: Ember.State.create({
          path: 'edit',
          enter: function() {
            stateReached = true;
          }
        })
      })
      
    })
  });
  
  routeManager.set('location', 'posts/1/edit');
  
  ok(stateReached, 'The state should have been reached.')
  
  routeManager.destroy();
});

test("Route With Accept Logic", function() {
  var isAdmin = true;
  var stateReached = false;
  
  var routeManager = Ember.RouteManager.create({
    post: Ember.State.create({
      path: 'posts/:postId',
      enter: function(stateManager) {
        postId = stateManager.params.postId
      },
      admin: Ember.State.create({
        willAccept: function() {
          return isAdmin;
        },
        edit: Ember.State.create({
          path: 'edit',
          enter: function() {
            stateReached = true;
          }
        })
      })
      
    })
  });
  
  routeManager.set('location', 'posts/1/edit');
  ok(stateReached, 'The state should have been reached.');
  
  routeManager.set('location', 'posts/1');
  isAdmin = false;
  stateReached = false;
  
  routeManager.set('location', 'posts/1/edit');
  ok(!stateReached, 'The state should not have been reached.');
  
  routeManager.destroy();
});

test("Route Ending on Pathless State", function() {
  var stateReached = false;
  
  var routeManager = Ember.RouteManager.create({
    post: Ember.State.create({
      path: 'posts',
      
      show: Ember.State.create({
        enter: function() {
          stateReached = true;
        }
      })
      
    })
  });
  
  routeManager.set('location', 'posts');
  
  ok(stateReached, 'The state should have been reached.');
  
  routeManager.destroy();
});
