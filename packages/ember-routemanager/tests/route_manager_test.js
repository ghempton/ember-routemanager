var routeManager;

module('Ember.RouteManager', {
  setup: function() {
  },
  
  teardown: function() {
    if(routeManager) {
      routeManager.destroy();
      window.location.hash = '';
    }
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
    routeManager.set('location', '/posts/comments');
  });
  
  ok(stateReached, 'The state should have been reached.');
});

test('setting window.location explicitly should trigger', function() {
  
  stop();
  expect(0);
  
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
  
  routeManager.start();
  
  window.location.hash = 'home';
  
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
  
  routeManager.set('location', '/posts/comments/all');
  
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
  
  routeManager.set('location', '/posts/1/comments/4');
  
  equal(postId, 1, "The first param should have been set.");
  equal(commentId, 4, "The second param should have been set.");
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
  
  routeManager.set('location', '/posts/1/edit');
  
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
  
  routeManager.set('location', '/posts/comments');
  
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
  
  routeManager.set('location', '/posts/comments');

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

  routeManager.set('location', '/posts/2012-08-21');

  ok(stateReached, 'The state should have been reached.');

  equal(year, '2012', "The first match param (year) should have been set.");
  equal(month, '08', "The second match param (month) should have been set.");
  equal(day, '21', "The first match param (day) should have been set.");
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
  
  routeManager.set('location', '/test');
  
  ok(stateReached, 'The state should have been reached.');
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
  
  routeManager.set('location', '/posts');
  
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
  
  routeManager.set('location', '/'); 
  ok(homeReached, 'The home state should have been reached.');
  
  homeReached = false;
  
  routeManager.set('location', '/posts');
  ok(!postsReached, 'Only leaf states can be routed to');
  
  routeManager.set('location', '/posts/comments');
  
  ok(postsReached, 'Intermediary state should have been reached.');
  ok(commentsReached, 'Leaf state should have been reached');
  ok(!homeReached, 'The home state should not have been reached.');
  equal(routeManager.get('currentState'), routeManager.getPath('posts.comments'), "The current state should be set correctly.");
});

test("a parameter only location change will re-trigger state transitions correctly", function() {
  var postsEnterCount = 0;
  var postsExitCount = 0;
  var showEnterCount = 0;
  var showExitCount = 0;
  var commentsEnterCount = 0;
  var commentsExitCount = 0;
  
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
        show: Ember.State.create({
          enter: function() {
            showEnterCount++;
          },
          exit: function() {
            showExitCount++;
          }
        }),
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
  
  routeManager.set('location', '/posts/1/comments');
  
  equal(postsEnterCount, 1, 'posts enter count');
  equal(postsExitCount, 0, 'posts exit count');
  equal(commentsEnterCount, 1, 'comments enter count');
  equal(commentsExitCount, 0, 'comments exit count');
  equal(showEnterCount, 0, 'show enter count');
  equal(showExitCount, 0, 'show exit count');
  
  routeManager.set('location', '/posts/2/comments');
  
  equal(postsEnterCount, 1, 'posts enter count');
  equal(postsExitCount, 0, 'posts exit count');
  equal(commentsEnterCount, 2, 'comments enter count');
  equal(commentsExitCount, 1, 'comments exit count');
  equal(showEnterCount, 0, 'show enter count');
  equal(showExitCount, 0, 'show exit count');
  
  routeManager.set('location', '/posts/2');
  
  equal(routeManager.params.postId, 2, "post id parameter");
  equal(postsEnterCount, 1, 'posts enter count');
  equal(postsExitCount, 0, 'posts exit count');
  equal(commentsEnterCount, 2, 'comments enter count');
  equal(commentsExitCount, 2, 'comments exit count');
  equal(showEnterCount, 1, 'show enter count');
  equal(showExitCount, 0, 'show exit count');
  
  routeManager.set('location', '/posts/3');
  
  equal(routeManager.params.postId, 3, "post id parameter");
  equal(postsEnterCount, 1, 'posts enter count');
  equal(postsExitCount, 0, 'posts exit count');
  equal(commentsEnterCount, 2, 'comments enter count');
  equal(commentsExitCount, 2, 'comments exit count');
  equal(showEnterCount, 2, 'show enter count');
  equal(showExitCount, 1, 'show exit count');
});

test("path only parameter change on a root state should work", function() {
  var enterCount = 0;
  routeManager = Ember.RouteManager.create({
    post: Ember.State.create({
      route: 'posts/:postId',
      enter: function(stateManager) {
        enterCount++;
      }
    })
  });
  
  routeManager.set('location', '/posts/1');
  equal(enterCount, 1, 'enter count');
  routeManager.set('location', '/posts/1');
  equal(enterCount, 1, 'enter count');
  routeManager.set('location', '/posts/2'); 
  equal(enterCount, 2, 'enter count');
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
  
  routeManager.set('location', '/');
  
  equal(section1Count, 0, 'section1 count');
  equal(homeCount, 1, 'home count');
  equal(_404count, 0, '404 count');
  
  routeManager.set('location', '/section1');
  
  equal(section1Count, 1, 'section1 count');
  equal(homeCount, 1, 'home count');
  equal(_404count, 0, '404 count');
  
  routeManager.set('location', '/this-is-a-bad-route');
  
  equal(section1Count, 1, 'section1 count');
  equal(homeCount, 1, 'home count');
  equal(_404count, 1, '404 count');
  
  routeManager.set('location', '/section1');
  
  equal(section1Count, 2, 'section1 count');
  equal(homeCount, 1, 'home count');
  equal(_404count, 1, '404 count');
  
  routeManager.set('location', '/this-is-another/bad/route');
  
  equal(section1Count, 2, 'section1 count');
  equal(homeCount, 1, 'home count');
  equal(_404count, 2, '404 count');
});

test("should obey synchronous load methods", function() {
  var isAdmin = true;
  var editEnterCount = 0;
  var showEnterCount = 0;
  var altEnterCount = 0;
  var postId;
  
  var showEnabled = true;
  var altEnabled = false;
  
  routeManager = Ember.RouteManager.create({
    post: Ember.State.create({
      route: 'posts/:postId',
      enter: function(stateManager) {
        postId = stateManager.params.postId;
      },
      show: Ember.State.create({
        load: function() { return showEnabled; },
        enter: function() {
          showEnterCount++;
        }
      }),
      alt: Ember.State.create({
        load: function() { return altEnabled; },
        enter: function() {
          altEnterCount++;
        }
      }),
      admin: Ember.State.create({
        load: function() { return isAdmin; },
        edit: Ember.State.create({
          route: 'edit',
          enter: function() {
            editEnterCount++;
          }
        })
      })
      
    })
  });
  
  routeManager.set('location', '/posts/1/edit');
  equal(editEnterCount, 1, 'The edit state should have been entered once.');
  equal(showEnterCount, 0, ' The show state should not have been entered.');
  equal(altEnterCount, 0, 'The alt state should not have been entered.');
  
  routeManager.set('location', '/posts/1');
  isAdmin = false;
  equal(editEnterCount, 1, 'The edit state should have been entered once.');
  equal(showEnterCount, 1, ' The show state should have been entered once.');
  equal(altEnterCount, 0, 'The alt state should not have been entered.');
  
  routeManager.set('location', '/posts/1/edit');
  equal(editEnterCount, 1, 'The edit state should not have been entered again.');
  equal(showEnterCount, 1, 'The show state should not have been entered again.');
  equal(altEnterCount, 0, 'The alt state should not have been entered.');
  
  showEnabled = false;
  altEnabled = true;
  routeManager.set('location', '/posts/1');
  equal(editEnterCount, 1, 'The edit state should not have been entered again.');
  equal(showEnterCount, 1, 'The show state should not have been entered again.');
  equal(altEnterCount, 1, 'The alt state should have been entered.');
});

test("should obey asynchronous load methods", function() {
  
  stop();
  
  var homeEnterCount = 0;
  var adminEnterCount = 0;
  
  routeManager = Ember.RouteManager.create({
    home: Ember.State.create({
      enter: function() { homeEnterCount++; }
    }),
    
    admin: Ember.State.create({
      route: 'admin',
      enter: function() { adminEnterCount++; },
      load: function(routeManager, params, transition, context) {
        transition.async();
        setTimeout(function() {
          start();
          transition.ok();
          equal(homeEnterCount, 1, 'home enter count');
          equal(adminEnterCount, 1, 'admin enter count');
        }, 100);
      }
    })
  });
  
  routeManager.set('location', '/');
  
  equal(homeEnterCount, 1, 'home enter count');
  equal(adminEnterCount, 0, 'admin enter count');
  
  routeManager.set('location', '/admin');
  
  equal(adminEnterCount, 0, 'should be entered async');
});

test("should be able to change location before async routing is finished", function() {
  stop();
  
  var homeEnterCount = 0;
  var adminEnterCount = 0;
  
  routeManager = Ember.RouteManager.create({
    home: Ember.State.create({
      enter: function() { homeEnterCount++; }
    }),
    
    admin: Ember.State.create({
      route: 'admin',
      enter: function() { adminEnterCount++; },
      load: function(routeManager, params, transition, context) {
        transition.async();
        setTimeout(function() {
          transition.ok();
        }, 100);
      }
    })
  });
  
  routeManager.set('location', '/');
  
  equal(homeEnterCount, 1, 'home enter count');
  equal(adminEnterCount, 0, 'admin enter count');
  
  routeManager.set('location', '/admin');
  routeManager.set('location', '/');
  
  equal(homeEnterCount, 1, 'home enter count');
  equal(adminEnterCount, 0, 'admin enter count');
  
  setTimeout(function() {
    start();
    equal(homeEnterCount, 1, 'home enter count');
    equal(adminEnterCount, 0, 'admin enter count');
  }, 200);
});

test("should support documentTitle property on states", function() {
  routeManager = Ember.RouteManager.create({
    documentTitle: 'Blog',
    post: Ember.State.create({
      route: 'post',
      documentTitle: 'Cool Article'
    }),
    home: Ember.State.create({
    })
  });
  routeManager.set('location', '/');
  equal(document.title, 'Blog', 'should use parents title if not set');
  routeManager.set('location', '/post');
  equal(document.title, 'Cool Article');
  routeManager.post.set('documentTitle', 'New Title');
  equal(document.title, 'New Title', 'document title should observe property changes');
});

test("should support relative locations", function() {
  routeManager = Ember.RouteManager.create({
    posts: Ember.State.create({
      route: 'posts',
      index: Ember.State.create(),
      post: Ember.State.create({
        route: ':postId'
      })
    }),
    home: Ember.State.create({
    })
  });
  routeManager.set('location', '/');
  routeManager.set('location', '..');
  equal(routeManager.currentState, routeManager.home, "parent path on the root state should still result in the root state");
  
  routeManager.set('location', '/posts/1/');
  equal(routeManager.currentState, routeManager.posts.post, "absolute location");
  
  routeManager.set('location', '..');
  equal(routeManager.currentState, routeManager.posts.index, "relative location: parent");
  
  routeManager.set('location', '/posts/1');
  routeManager.set('location', '..');
  equal(routeManager.currentState, routeManager.home, "relative location: parent no trailing slash");
  
  routeManager.set('location', '/posts/1');
  routeManager.set('location', '2');
  equal(routeManager.currentState, routeManager.posts.post, "relative location: sibling");
  equal(routeManager.getPath('params.postId'), 2, "correct parameter");
  
  routeManager.set('location', '/posts/1/');
  routeManager.set('location', '../..');
  equal(routeManager.currentState, routeManager.home, "relative location: multiple parents");
});

test("should be able to populate context", function() {
  routeManager = Ember.RouteManager.create({
    posts: Ember.State.create({
      route: 'posts',
      index: Ember.State.create(),
      post: Ember.State.create({
        route: ':postId',
        load: function(routeManager, params, transition, context) {
          context.name = "Post " + params.postId;
          return true;
        },
        show: Ember.State.create(),
        comments: Ember.State.create({
          route: 'comments',
          load: function(routeManager, params, transition, context) {
            context.inComments = true;
            equal(context.name, "Post " + params.postId, "parent context properties should be accessible");
            return true;
          },
        })
      })
    }),
    home: Ember.State.create({
      load: function(routeManager, params, transition, context) {
        context.inHome = true;
        ok(!context.name, "previously set context properties should not be accessible");
        return true;
      },
    })
  });
  
  routeManager.set('location', '/');
  routeManager.set('location', '/posts/1/comments');
  
  equal(routeManager.getPath('context.name'), "Post 1", "context property should be set");
  
  routeManager.set('location', '/posts/1/');
  
  ok(!routeManager.getPath('context.inComments'), "context property should be unset");
  
  routeManager.set('location', '/');
});

test("async states with route overlap", function() {
  var showEnterCount = 0;
  var showEnterCallback;
  var editEnterCount = 0;
  var editEnterCallback;
  routeManager = Ember.RouteManager.create({
    posts1: Ember.State.create({
      route: 'posts/:postId',
      show: Ember.State.create({
        load: function(routeManager, params, transition, context) {
          transition.async();
          setTimeout(function() {
            transition.ok();
          }, 1);
        },
        enter: function() {
          showEnterCount++;
          if(showEnterCallback) {
            showEnterCallback();
          }
        }
      })
    }),
    posts2: Ember.State.create({
      route: 'posts/:postId',
      edit: Ember.State.create({
        route: 'edit',
        load: function(routeManager, params, transition, context) {
          transition.async();
          setTimeout(function() {
            transition.ok();
          }, 1);
        },
        enter: function() {
          editEnterCount++;
          if(editEnterCallback) {
            editEnterCallback();
          }
        }
      })
    }),
    home: Ember.State.create({
    }),
    "404":  Ember.State.create({
    })
  });

  stop();

  var timerId = setTimeout(function() {
    start();
  }, 100);

  routeManager.set('location', '/posts/1');

  showEnterCallback = function() {
    equal(showEnterCount, 1, "show enter count is correct");
    equal(editEnterCount, 0, "edit enter count is correct");

    routeManager.set('location', '/posts/1/edit');

    editEnterCallback = function() {
      equal(showEnterCount, 1, "show enter count is correct");
      equal(editEnterCount, 1, "edit enter count is correct");

      start();

      clearTimeout(timerId);
    };
  };

});