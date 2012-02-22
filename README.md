## Ember RouteManager

Ember RouteManager is a coupling of native ember state managers with browser routing mechanisms. In it's current form, it is a modified version of [SproutCore Routing](https://github.com/emberjs-addons/sproutcore-routing) which extends Ember.StateManager.

### Basic Example

```
MyApp = Em.Application.create();

MyApp.postsView = Em.View.create({
  template:Em.Handlebars.compile("<h1>POSTS</h1><p>State: {{MyApp.routeManager.currentState.path}}</p>")
});

MyApp.projectsView = Em.View.create({
  template:Em.Handlebars.compile("<h1>PROJECTS</h1><p>State: {{MyApp.routeManager.currentState.path}}</p>")
});

MyApp.routeManager = Ember.RouteManager.create({

  posts: Em.ViewState.create({
    route: 'posts', // defines a static route
    view: MyApp.postsView,

    index: Em.State.create({}), // default state

    show: Em.State.create({
      route: ':id', // defines a nested dynamic route
      enter: function(stateManager, transition) {
        this._super(stateManager, transition);
        var params = stateManager.get('params');
        var postId = params.id;
        // do something here with postId
      }
    })
  }),
  
  projects: Em.ViewState.create({
    route: 'projects',
    view: MyApp.projectsView
  })

});
```

With the above route manager defined, you can now change the browser location either directly or by using `routeManager.set('location', ...)`. For instance:

```
MyApp.routeManager.set('location', 'posts/25');
```

Will set the routeManager to the `'posts.show'` state with the params containing the post id of `25`. States with routes can be nested arbitraily deep.
