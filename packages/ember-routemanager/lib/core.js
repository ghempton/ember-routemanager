var get = Ember.get, set = Ember.set;

/**
  Wether the browser supports HTML5 history.
*/
var supportsHistory = !!(window.history && window.history.pushState);

/**
  Wether the browser supports the hashchange event.
*/
var supportsHashChange = ('onhashchange' in window) && (document.documentMode === undefined || document.documentMode > 7);

/**
  @class

  Ember.routes manages the browser location. You can change the hash part of the
  current location. The following code

      Ember.routes.set('location', 'notes/edit/4');

  will change the location to http://domain.tld/my_app#notes/edit/4. Adding
  routes will register a handler that will be called whenever the location
  changes and matches the route:

      Ember.routes.add(':controller/:action/:id', MyApp, MyApp.route);

  You can pass additional parameters in the location hash that will be relayed
  to the route handler:

      Ember.routes.set('location', 'notes/show/4?format=xml&language=fr');

  The syntax for the location hash is described in the location property
  documentation, and the syntax for adding handlers is described in the
  add method documentation.

  Browsers keep track of the locations in their history, so when the user
  presses the 'back' or 'forward' button, the location is changed, Ember.route
  catches it and calls your handler. Except for Internet Explorer versions 7
  and earlier, which do not modify the history stack when the location hash
  changes.

  Ember.routes also supports HTML5 history, which uses a '/' instead of a '#'
  in the URLs, so that all your website's URLs are consistent.
*/
Ember.RouteManager = Ember.StateManager.extend(
  /** @scope Ember.routes.prototype */{

  /**
    Set this property to true if you want to use HTML5 history, if available on
    the browser, instead of the location hash.

    HTML 5 history uses the history.pushState method and the window's popstate
    event.

    By default it is false, so your URLs will look like:

        http://domain.tld/my_app#notes/edit/4

    If set to true and the browser supports pushState(), your URLs will look
    like:

        http://domain.tld/my_app/notes/edit/4

    You will also need to make sure that baseURI is properly configured, as
    well as your server so that your routes are properly pointing to your
    SproutCore application.

    @see http://dev.w3.org/html5/spec/history.html#the-history-interface
    @property
    @type {Boolean}
  */
  wantsHistory: false,

  /**
    A read-only boolean indicating whether or not HTML5 history is used. Based
    on the value of wantsHistory and the browser's support for pushState.

    @see wantsHistory
    @property
    @type {Boolean}
  */
  usesHistory: null,

  /**
    The base URI used to resolve routes (which are relative URLs). Only used
    when usesHistory is equal to true.

    The build tools automatically configure this value if you have the
    html5_history option activated in the Buildfile:

        config :my_app, :html5_history => true

    Alternatively, it uses by default the value of the href attribute of the
    <base> tag of the HTML document. For example:

        <base href="http://domain.tld/my_app">

    The value can also be customized before or during the exectution of the
    main() method.

    @see http://www.w3.org/TR/html5/semantics.html#the-base-element
    @property
    @type {String}
  */
  baseURI: document.baseURI,

  /** @private
    A boolean value indicating whether or not the ping method has been called
    to setup the Ember.routes.

    @property
    @type {Boolean}
  */
  _didSetup: false,

  /** @private
    Internal representation of the current location hash.

    @property
    @type {String}
  */
  _location: null,

  /** @private
    Internal method used to extract and merge the parameters of a URL.

    @returns {Hash}
  */
  _extractParametersAndRoute: function(obj) {
    var params = {},
        route = obj.route || '',
        separator, parts, i, len, crumbs, key;

    separator = (route.indexOf('?') < 0 && route.indexOf('&') >= 0) ? '&' : '?';
    parts = route.split(separator);
    route = parts[0];
    if (parts.length === 1) {
      parts = [];
    } else if (parts.length === 2) {
      parts = parts[1].split('&');
    } else if (parts.length > 2) {
      parts.shift();
    }

    // extract the parameters from the route string
    len = parts.length;
    for (i = 0; i < len; ++i) {
      crumbs = parts[i].split('=');
      params[crumbs[0]] = crumbs[1];
    }

    // overlay any parameter passed in obj
    for (key in obj) {
      if (obj.hasOwnProperty(key) && key !== 'route') {
        params[key] = '' + obj[key];
      }
    }

    // build the route
    parts = [];
    for (key in params) {
      parts.push([key, params[key]].join('='));
    }
    params.params = separator + parts.join('&');
    params.route = route;

    return params;
  },

  /**
    The current location hash. It is the part in the browser's location after
    the '#' mark.

    The following code

        Ember.routes.set('location', 'notes/edit/4');

    will change the location to http://domain.tld/my_app#notes/edit/4 and call
    the correct route handler if it has been registered with the add method.

    You can also pass additional parameters. They will be relayed to the route
    handler. For example, the following code

        Ember.routes.add(':controller/:action/:id', MyApp, MyApp.route);
        Ember.routes.set('location', 'notes/show/4?format=xml&language=fr');

    will change the location to
    http://domain.tld/my_app#notes/show/4?format=xml&language=fr and call the
    MyApp.route method with the following argument:

        { route: 'notes/show/4',
          params: '?format=xml&language=fr',
          controller: 'notes',
          action: 'show',
          id: '4',
          format: 'xml',
          language: 'fr' }

    The location can also be set with a hash, the following code

        Ember.routes.set('location',
          { route: 'notes/edit/4', format: 'xml', language: 'fr' });

    will change the location to
    http://domain.tld/my_app#notes/show/4?format=xml&language=fr.

    The 'notes/show/4&format=xml&language=fr' syntax for passing parameters,
    using a '&' instead of a '?', as used in SproutCore 1.0 is still supported.

    @property
    @type {String}
  */
  location: Ember.computed(function(key, value) {
    this._skipRoute = false;
    return this._extractLocation(key, value);
  }).property(),

  _extractLocation: function(key, value) {
    var crumbs, encodedValue;

    if (value !== undefined) {
      if (value === null) {
        value = '';
      }

      if (typeof(value) === 'object') {
        crumbs = this._extractParametersAndRoute(value);
        value = crumbs.route + crumbs.params;
      }

      if (!this._skipPush && (!Ember.empty(value) || (this._location && this._location !== value))) {
        encodedValue = encodeURI(value);

        if (this.usesHistory) {
          if (encodedValue.length > 0) {
            encodedValue = '/' + encodedValue;
          }
          window.history.pushState(null, null, get(this, 'baseURI') + encodedValue);
        } else if (encodedValue.length > 0 || window.location.hash.length > 0) {
          window.location.hash = encodedValue;
        }
      }

      this._location = value;
    }

    return this._location;
  },

  updateLocation: function(loc){
    this._skipRoute = true;
    return this._extractLocation('location', loc);
  },

  /**
    You usually don't need to call this method. It is done automatically after
    the application has been initialized.

    It registers for the hashchange event if available. If not, it creates a
    timer that looks for location changes every 150ms.
  */
  ping: function() {
    if (!this._didSetup) {
      this._didSetup = true;
      var state;

      if (get(this, 'wantsHistory') && supportsHistory) {
        this.usesHistory = true;

        // Move any hash state to url state
        // TODO: Make sure we have a hash before adding slash
        state = window.location.hash.slice(1);
        if (state.length > 0) {
          state = '/' + state;
          window.history.replaceState(null, null, get(this, 'baseURI')+state);
        }

        this.popState();
        this.popState = jQuery.proxy(this.popState, this)
        jQuery(window).bind('popstate', this.popState);

      } else {
        this.usesHistory = false;

        if (get(this, 'wantsHistory')) {
          // Move any url state to hash
          var base = get(this, 'baseURI');
          var loc = (base.charAt(0) === '/') ? document.location.pathname : document.location.href.replace(document.location.hash, '');
          state = loc.slice(base.length+1);
          if (state.length > 0) {
            window.location.href = base+'#'+state;
          }
        }

        if (supportsHashChange) {
          this.hashChange();
          this.hashChange = jQuery.proxy(this.hashChange, this);
          jQuery(window).bind('hashchange', this.hashChange);

        } else {
          // we don't use a Ember.Timer because we don't want
          // a run loop to be triggered at each ping
          var invokeHashChange = function() {
            this.hashChange();
            this._timerId = setTimeout(invokeHashChange, 100);
          };
          invokeHashChange();
        }
      }
    }
  },
  
  destroy: function() {
    if(this._didSetup) {
      if (get(this, 'wantsHistory') && supportsHistory) {
        jQuery(window).unbind('popstate', this.popState);
      } else {
        if (supportsHashChange) {
          jQuery(window).unbind('hashchange', this.hashChange);
        } else {
          clearTimeout(_timerId);
        }
      }
    }
    this._super();
  },

  init: function() {
    this._super();
    if (!this._didSetup) {
      Ember.run.once(this, 'ping');
    }
  },

  /**
    Observer of the 'location' property that calls the correct route handler
    when the location changes.
  */
  locationDidChange: Ember.observer(function() {
    this.trigger();
  }, 'location'),

  /**
    Triggers a route even if already in that route (does change the location, if it
    is not already changed, as well).

    If the location is not the same as the supplied location, this simply lets "location"
    handle it (which ends up coming back to here).
  */
  trigger: function() {
    var location = get(this, 'location'),
        params, route;

    params = this._extractParametersAndRoute({ route: location });
    location = params.route;
    delete params.route;
    delete params.params;
      
    var result = this.getState(location, params);
    if(result) {
      set(this, 'params', result.params);
      
      var stateName = result.names.join('.');
      this.goToState(stateName);
    }
  },
  
  getState: function(route, params) {
    parts = route.split('/')
    return this._findState(parts, this, [], params);
  },
  
  /**
   * Private recursive helper method
   * 
   * Returns the state and the params if a match is found
   */
  _findState: function(parts, state, names, params) {
    parts = Ember.copy(parts);

    for(var name in state.states) {
      var childState = state.states[name];
      if(!(childState instanceof Ember.State)) continue;
      var result = this._matchState(parts, childState, params);
      if(!result) continue;
      newParams = Ember.copy(params);
      jQuery.extend(newParams, result.params);
      
      var namesCopy = Ember.copy(names);
      namesCopy.push(name);
      result = this._findState(result.parts, childState, namesCopy, newParams);
      if(result)
        return result;
    }
    
    if (parts.length === 0) {
      return {state:state, params:params, names:names};
    }
    return null;
  },
  
  /**
   * Private: check if a state accepts the parts with the params
   * 
   * Returns the remaining parts as well as merged params if
   * the state accepts
   */
  _matchState: function(parts, state, params) {
    parts = Ember.copy(parts);
    params = Ember.copy(params);
    var path = get(state, 'path');
    if(path) {
      var partDefinitions = path.split('/');
        
      for(var i = 0; i < partDefinitions.length; i++) {
        if(parts.length == 0) return false
        var part = parts.shift();
        var partDefinition = partDefinitions[i];
        var partParams = this._matchPart(partDefinition, part);
        if(!partParams) return false;
        
        jQuery.extend(params, partParams);
      }
    }
    
    if(Ember.typeOf(state.willAccept) == 'function') {
      if(!state.willAccept(params)) return false;
    }
    
    return {parts: parts, params: params}
  },
  
  /**
   * Private: return params if the part matches the partDefinition
   */
  _matchPart: function(partDefinition, part) {
    switch (partDefinition.slice(0, 1)) {
    // 1. dynamic routes
    case ':':
      var name = partDefinition.slice(1, partDefinition.length);
      var params = {};
      params[name] = part;
      return params;

    // 2. wildcard routes
    case '*':
      return {};

    // 3. static routes
    default:
      if(partDefinition == part)
        return {}
      break;
    }
    
    return false;
  },
  
  /**
    Event handler for the hashchange event. Called automatically by the browser
    if it supports the hashchange event, or by our timer if not.
  */
  hashChange: function(event) {
    var loc = window.location.hash;
    var routes = this;
    
    // Remove the '#' prefix
    loc = (loc && loc.length > 0) ? loc.slice(1, loc.length) : '';
  
    if (!jQuery.browser.mozilla) {
      // because of bug https://bugzilla.mozilla.org/show_bug.cgi?id=483304
      loc = decodeURI(loc);
    }
  
    if (get(routes, 'location') !== loc && !routes._skipRoute) {
      Ember.run.once(function() {
        routes._skipPush = true;
        set(routes, 'location', loc);
        routes._skipPush = false;
      });
    }
    routes._skipRoute = false;
  },
  
  popState: function(event) {
    var routes = this;
    var base = get(routes, 'baseURI'),
        loc = (base.charAt(0) === '/') ? document.location.pathname : document.location.href;
  
    if (loc.slice(0, base.length) === base) {
      // Remove the base prefix and the extra '/'
      loc = loc.slice(base.length + 1, loc.length);
  
      if (get(routes, 'location') !== loc && !routes._skipRoute) {
        Ember.run.once(function() {
          routes._skipPush = true;
          set(routes, 'location', loc);
          routes._skipPush = false;
        });
      }
    }
    routes._skipRoute = false;
  }

});
