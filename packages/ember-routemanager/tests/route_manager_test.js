var routeManager;

module('Ember.RouteManager', {
  setup: function() {
  },
  
  teardown: function() {
    if(routeManager) routeManager.destroy();
  }
});


test('basic static paths', function() {
  
  var stateReached = false;
  
  routeManager = Ember.RouteManager.create({
    posts: Ember.State.create({
      route: 'posts',
      
      comments: Ember.State.create({
        route: 'comments',
        enter: function() {
          stateReached = true;
        }
      })
    })
  });
  
  Ember.run(function() {
    routeManager.set('location', 'posts/comments');
  });
  
  ok(stateReached, 'The state should have been reached.');
});

test('setting window.location explicitly should trigger', function() {
  
  stop();
  
  var timer = setTimeout(function() {
    ok(false, 'route change was not notified within 2 seconds');
    start();
  }, 2000);
  
  routeManager = Ember.RouteManager.create({
    home: Ember.State.create({
      route: 'home',
      enter: function() {
        start();
        clearTimeout(timer);
      }
      })
  });
  
  window.location.hash = 'home'
  
});

test('complex static paths', function() {
  
  var stateReached = false;
  
  routeManager = Ember.RouteManager.create({
    posts: Ember.State.create({
      route: 'posts',
      
      comments: Ember.State.create({
        route: 'comments/all',
        enter: function() {
          stateReached = true;
        }
      })
    })
  });
  
  routeManager.set('location', 'posts/comments/all');
  
  ok(stateReached, 'The state should have been reached.');
});


test('paths with parameters', function() {
  
  var commentId;
  var postId;
  
  routeManager = Ember.RouteManager.create({
    post: Ember.State.create({
      route: 'posts/:postId',
      enter: function(stateManager) {
        postId = stateManager.params.postId;
      },
      
      comment: Ember.State.create({
        route: 'comments/:commentId',
        enter: function(stateManager) {
          commentId = stateManager.params.commentId;
        }
      })
    })
  });
  
  routeManager.set('location', 'posts/1/comments/4');
  
  equals(postId, 1, "The first param should have been set.");
  equals(commentId, 4, "The second param should have been set.");
});

test('states without paths should automatically be entered', function() {
  var stateReached = false;
  
  routeManager = Ember.RouteManager.create({
    post: Ember.State.create({
      route: 'posts/:postId',
      admin: Ember.State.create({
        edit: Ember.State.create({
          route: 'edit',
          enter: function() {
            this._super();
            stateReached = true;
          }
        })
      })
      
    })
  });
  
  routeManager.set('location', 'posts/1/edit');
  
  ok(stateReached, 'the state should have been reached.');
});

test("wildcard paths", function() {
  var stateReached = false;
  
  routeManager = Ember.RouteManager.create({
    posts: Ember.State.create({
      route: 'posts',
      
      comments: Ember.State.create({
        route: '*',
        enter: function() {
          stateReached = true;
        }
      })
    })
  });
  
  routeManager.set('location', 'posts/comments');
  
  ok(stateReached, 'The state should have been reached.');
});

test("regexp paths", function() {
  var stateReached = false;
  
  routeManager = Ember.RouteManager.create({
    posts: Ember.State.create({
      route: /p.*/,
      
      comments: Ember.State.create({
        route: 'comments',
        enter: function() {
          stateReached = true;
        }
      })
    })
  });
  
  routeManager.set('location', 'posts/comments');

  ok(stateReached, 'The state should have been reached.');
});

test("regexp paths with named captures", function() {
  var stateReached = false;
  var year, month, day;

  routeManager = Ember.RouteManager.create({
    posts: Ember.State.create({
      route: 'posts',
      archive: Ember.State.create({
        route: /(\d{4})-(\d{2})-(\d{2})/,
        captures: ['year', 'month', 'day'],
        enter: function(stateManager) {
          stateReached = true;
          year = stateManager.params.year;
          month = stateManager.params.month;
          day = stateManager.params.day;
        }
      })
    })
  });

  routeManager.set('location', 'posts/2012-08-21');

  ok(stateReached, 'The state should have been reached.');

  equals(year, '2012', "The first match param (year) should have been set.");
  equals(month, '08', "The second match param (month) should have been set.");
  equals(day, '21', "The first match param (day) should have been set.");
});

test("state priorities are obeyed", function() {
  var stateReached = false;
  
  routeManager = Ember.RouteManager.create({
    route1: Ember.State.create({
      route: 'test',
      priority: 1
    }),
    route2: Ember.State.create({
      route: 'test',
      priority: 3,
      enter: function() {
        stateReached = true;
      }
    }),
    route3: Ember.State.create({
      route: 'test',
      priority: -1
    }),
    route4: Ember.State.create({
      route: 'test',
      priority: 1
    })
  });
  
  routeManager.set('location', 'test');
  
  ok(stateReached, 'The state should have been reached.');
});

test("routes obey the willAccept method", function() {
  var isAdmin = true;
  var stateReached = false;
  
  routeManager = Ember.RouteManager.create({
    post: Ember.State.create({
      route: 'posts/:postId',
      enter: function(stateManager) {
        postId = stateManager.params.postId;
      },
      admin: Ember.State.create({
        willAccept: function() {
          return isAdmin;
        },
        edit: Ember.State.create({
          route: 'edit',
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
});

test("routes will reach pathless leaf states", function() {
  var stateReached = false;
  
  routeManager = Ember.RouteManager.create({
    post: Ember.State.create({
      route: 'posts',
      
      show: Ember.State.create({
        enter: function() {
          stateReached = true;
        }
      })
      
    })
  });
  
  routeManager.set('location', 'posts');
  
  ok(stateReached, 'The state should have been reached.');
});

test('routes will enter a pathless home state', function() {
  
  var postsReached = false;
  var commentsReached = false;
  var homeReached = false;
  
  routeManager = Ember.RouteManager.create({
    posts: Ember.State.create({
      route: 'posts',
      enter: function() {
        postsReached = true;
      },
      
      comments: Ember.State.create({
        route: 'comments',
        enter: function() {
          commentsReached = true;
        }
      })
    }),
    
    home: Ember.State.create({
      enter: function() {
        homeReached = true;
      }
    })
  });
  
  routeManager.set('location', ''); 
  ok(homeReached, 'The home state should have been reached.');
  
  homeReached = false;
  
  routeManager.set('location', 'posts');
  ok(!postsReached, 'Only leaf states can be routed to');
  
  routeManager.set('location', 'posts/comments');
  
  ok(postsReached, 'Intermediary state should have been reached.');
  ok(commentsReached, 'Leaf state should have been reached');
  ok(!homeReached, 'The home state should not have been reached.');
  equals(routeManager.get('currentState'), routeManager.getPath('posts.comments'), "The current state should be set correctly.");
});

test("a parameter only location change will re-trigger state transitions correctly", function() {
  postsEnterCount = 0;
  postsExitCount = 0;
  commentsEnterCount = 0;
  commentsExitCount = 0;
  
  routeManager = Ember.RouteManager.create({
    posts: Ember.State.create({
      route: 'posts',
      enter: function() {
        postsEnterCount++;
      },
      exit: function() {
        postsExitCount++;
      },
      post: Ember.State.create({
        route: ':postId',
        comments: Ember.State.create({
          route: 'comments',
          enter: function() {
            commentsEnterCount++;
          },
          exit: function() {
            commentsExitCount++;
          }
        })
      
      })
    })
  });
  
  routeManager.set('location', 'posts/1/comments');
  
  equals(postsEnterCount, 1, 'posts enter count');
  equals(postsExitCount, 0, 'posts exit count');
  equals(commentsEnterCount, 1, 'comments enter count');
  equals(commentsExitCount, 0, 'comments exit count');
  
  routeManager.set('location', 'posts/2/comments');
  
  equals(postsEnterCount, 1, 'posts enter count');
  equals(postsExitCount, 0, 'posts exit count');
  equals(commentsEnterCount, 2, 'comments enter count');
  equals(commentsExitCount, 1, 'comments exit count');
});

test("should obey the 404 state", function() {
  var section1Count = 0;
  var homeCount = 0;
  var _404count = 0;
  
  routeManager = Ember.RouteManager.create({
    section1: Ember.State.create({
      route: 'section1',
      enter: function() {
        section1Count++;
      }
    }),
    home: Ember.State.create({
      enter: function() {
        homeCount++;
      }
    }),
    "404": Ember.State.create({
      enter: function() {
        _404count++;
      }
    })
  });
  
  routeManager.set('location', '');
  
  equals(section1Count, 0, 'section1 count');
  equals(homeCount, 1, 'home count');
  equals(_404count, 0, '404 count');
  
  routeManager.set('location', 'section1');
  
  equals(section1Count, 1, 'section1 count');
  equals(homeCount, 1, 'home count');
  equals(_404count, 0, '404 count');
  
  routeManager.set('location', 'this-is-a-bad-route');
  
  equals(section1Count, 1, 'section1 count');
  equals(homeCount, 1, 'home count');
  equals(_404count, 1, '404 count');
  
  routeManager.set('location', 'section1');
  
  equals(section1Count, 2, 'section1 count');
  equals(homeCount, 1, 'home count');
  equals(_404count, 1, '404 count');
  
  routeManager.set('location', 'this-is-another/bad/route');
  
  equals(section1Count, 2, 'section1 count');
  equals(homeCount, 1, 'home count');
  equals(_404count, 2, '404 count');
});
