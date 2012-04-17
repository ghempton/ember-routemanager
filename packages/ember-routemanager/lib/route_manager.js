var get = Ember.get, set = Ember.set;

/**
 Whether the browser supports HTML5 history.
 */
var supportsHistory = !!(window.history && window.history.pushState);

/**
 Whether the browser supports the hashchange event.
 */
var supportsHashChange = ('onhashchange' in window) && (document.documentMode === undefined || document.documentMode > 7);

/**
 @class
 Ember.RouteManager manages the browser location and changes states accordingly
 to the current location. The location can be programmatically set as follows:

 routeManager.set('location', 'notes/edit/4');

 Ember.RouteManager also supports HTML5 history, which uses a '/' instead of a
 '#' in the URLs, so that all your website's URLs are consistent.
 */
Ember.RouteManager = Ember.StateManager.extend({

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
   Ember application.

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
    var params = {}, route = obj.route || '', separator, parts, i, len, crumbs, key;
    separator = (route.indexOf('?') < 0 && route.indexOf('&') >= 0) ? '&' : '?';
    parts = route.split(separator);
    route = parts[0];
    if(parts.length === 1) {
      parts = [];
    } else if(parts.length === 2) {
      parts = parts[1].split('&');
    } else if(parts.length > 2) {
      parts.shift();
    }

    // extract the parameters from the route string
    len = parts.length;
    for( i = 0; i < len; ++i) {
      crumbs = parts[i].split('=');
      params[crumbs[0]] = crumbs[1];
    }

    // overlay any parameter passed in obj
    for(key in obj) {
      if(obj.hasOwnProperty(key) && key !== 'route') {
        params[key] = '' + obj[key];
      }
    }

    // build the route
    parts = [];
    for(key in params) {
      parts.push([key, params[key]].join('='));
    }
    params.params = separator + parts.join('&');
    params.route = route;

    return params;
  },

  /**
   The current location hash. It is the part in the browser's location after
   the '#' mark.

   @property
   @type {String}
   */
  location: Ember.computed(function(key, value) {
    this._skipRoute = false;
    return this._extractLocation(key, value);
  }).property(),

  _extractLocation: function(key, value) {
    var crumbs, encodedValue;

    if(value !== undefined) {
      if(value === null) {
        value = '';
      }

      if( typeof (value) === 'object') {
        crumbs = this._extractParametersAndRoute(value);
        value = crumbs.route + crumbs.params;
      }
      
      value = this._convertToAbsolute(value);

      if(!this._skipPush && (!Ember.empty(value) || (this._location && this._location !== value))) {
        encodedValue = encodeURI(value);

        if(this.usesHistory) {
          if(encodedValue.length > 0) {
            encodedValue = '/' + encodedValue;
          }
          window.history.pushState(null, null, get(this, 'baseURI') + encodedValue);
        } else if(encodedValue.length > 0 || window.location.hash.length > 0) {
          window.location.hash = encodedValue;
        }
      }

      this._location = value;
    }

    return this._location;
  },

  updateLocation: function(loc) {
    this._skipRoute = true;
    return this._extractLocation('location', loc);
  },
  
  _convertToAbsolute: function(value) {
    var current = this.get('_location');
    if(value.charAt(0) == '/' || !current) {
      return value; 
    }
    var parts = current.split('/');
    parts.pop(); // skip the last part of the current url
    parts = parts.concat(value.split('/'));
    // handle '..' and '.
    var absParts = [];
    var skipCount = 0;
    for(var i = parts.length - 1; i >= 0; i--) {
      var part = parts[i];
      if(part === "" || part === ".") {
        absParts.unshift("/");
      } else if(part === '..') {
        skipCount++;
      } else {
        if(skipCount === 0) {
          absParts.unshift(part);
        } else {
          skipCount--;
        }
      }
    }
    return absParts.join('/');
  },

  /**
   Start this routemanager.
   
   Registers for the hashchange event if available. If not, it creates a
   timer that looks for location changes every 150ms.
   */
  start: function() {
    if(!this._didSetup) {
      this._didSetup = true;
      var state;

      if(get(this, 'wantsHistory') && supportsHistory) {
        this.usesHistory = true;

        // Move any hash state to url state
        // TODO: Make sure we have a hash before adding slash
        state = window.location.hash.slice(1);
        if(state.length > 0) {
          state = '/' + state;
          window.history.replaceState(null, null, get(this, 'baseURI') + state);
        }

        this.popState();
        this.popState = jQuery.proxy(this.popState, this);
        jQuery(window).bind('popstate', this.popState);

      } else {
        this.usesHistory = false;

        if(get(this, 'wantsHistory')) {
          // Move any url state to hash
          var base = get(this, 'baseURI');
          var loc = (base.charAt(0) === '/') ? document.location.pathname : document.location.href.replace(document.location.hash, '');
          state = loc.slice(base.length + 1);
          if(state.length > 0) {
            window.location.href = base + '#' + state;
          }
        }

        if(supportsHashChange) {
          this.hashChange();
          this.hashChange = jQuery.proxy(this.hashChange, this);
          jQuery(window).bind('hashchange', this.hashChange);

        } else {
          // we don't use a Ember.Timer because we don't want
          // a run loop to be triggered at each ping
          var _this = this, invokeHashChange = function() {
            _this.hashChange();
            _this._timerId = setTimeout(invokeHashChange, 100);
          };

          invokeHashChange();
        }
      }
    }
  },
  
  /**
   Stop this routemanager
   */
  stop: function() {
    if(this._didSetup) {
      if(get(this, 'wantsHistory') && supportsHistory) {
        jQuery(window).unbind('popstate', this.popState);
      } else {
        if(supportsHashChange) {
          jQuery(window).unbind('hashchange', this.hashChange);
        } else {
          clearTimeout(this._timerId);
        }
      }
      this._didSetup = false;
    }
  },

  destroy: function() {
    this.stop();
    this._super();
  },

  /**
   Observer of the 'location' property that calls the correct route handler
   when the location changes.
   */
  locationDidChange: Ember.observer(function() {
    this.trigger();
  }, 'location'),
  
  // Used internally to determine when to stop an unfinished
  // asynchronous routing operation
  _triggerId: 0,
  
  /**
   * Property indicating that an async routing operation is currently underway
   */
  routing: false,
  
  /**
   Triggers a route even if already in that route (does change the location, if
   it is not already changed, as well).

   If the location is not the same as the supplied location, this simply lets
   "location" handle it (which ends up coming back to here).
   */
  trigger: function() {
    var triggerId = ++this._triggerId;
    var location = get(this, 'location'), params, route;
    params = this._extractParametersAndRoute({
      route: location
    });
    location = params.route;
    delete params.route;
    delete params.params;
    set('this', 'routing', true);
    this.getState(location, params, function(result) {
      // if the triggerId has changed we know that another
      // trigger call has been made and that this result
      // has been made irrelevant
      if(triggerId != this._triggerId) {
        return;
      }
      
      if(result) {
        set(this, 'params', result.params);
  
        // We switch states in two phases. The point of this is to handle
        // parameter-only location changes. This will correspond to the same
        // state path in the manager, but states with parts with changed
        // parameters should be re-entered:
  
        // 1. We go to the earliest clean state. This prevents
        // unnecessary transitions.
        if(result.cleanStates.length > 0) {
          var cleanState = result.cleanStates.join('.');
          this.goToState(cleanState);
        }
        
        // 2. We transition to the dirty state. This forces dirty
        // states to be transitioned.
        if(result.dirtyStates.length > 0) {
          var dirtyState = result.cleanStates.concat(result.dirtyStates).join('.');
          // Special case for re-entering the root state on a parameter change
          if(this.currentState && dirtyState === this.currentState.get('path')) {
            this.goToState('__nullState');
          }
          this.goToState(dirtyState);
        }
        
        this.bindDocumentTitle();
      } else {
        var states = get(this, 'states');
        if(states && get(states, "404")) {
          this.goToState("404");
        }
      }
      set(this, 'routing', false);
    });
    
  },

  getState: function(route, params, callback) {
    return this._findState(route, this, [], [], params, callback);
  },

  /** @private
   Recursive helper that the state and the params if a match is found
   */
  _findState: function(tail, state, cleanStates, dirtyStates, params, callback) {
    var name, childStates, childState;
    
    // filter out non-state properties and sort on priority
    childStates = [];
    for(name in state.states) {
      // 404 state is special and not matched
      childState = state.states[name];
      if(name == "404" || !Ember.State.detect(childState) && !( childState instanceof Ember.State)) {
        continue;
      }
      childStates.push({
        name: name,
        state: childState
      });
    }
    childStates = childStates.sort(function(a, b) {
      return (b.state.get('priority') || 0) - (a.state.get('priority') || 0);
    });
    
    // termination condition
    if(childStates.length === 0 && tail.length === 0) {
      callback.call(this, {
        state: state,
        params: params,
        cleanStates: cleanStates,
        dirtyStates: dirtyStates
      });
      return;
    }
    
    var self = this;
    
    // attempt to match all sub-state in parallel asynchronously and
    // wait for them all to return
    this.asyncParallelEach(childStates, function(state, callback) {
      var name = state.name;
      var childState = state.state;
      
      var result = this._matchState(childState, tail, params, function(result) {
        if(!result) {
          callback.call(this, false);
          return;
        }
        
        var newParams = Ember.copy(params);
        jQuery.extend(newParams, result.params);
  
        var dirty = dirtyStates.length > 0 || result.dirty;
        var newCleanStates = cleanStates;
        var newDirtyStates = dirtyStates;
        if(dirty) {
          newDirtyStates = Ember.copy(newDirtyStates);
          newDirtyStates.push(name);
        } else {
          newCleanStates = Ember.copy(newCleanStates);
          newCleanStates.push(name);
        }
        self._findState(result.tail, childState, newCleanStates, newDirtyStates, newParams, callback);
      });
      
    }, function(results) {
      // loop over the results in order and return
      // the first successful match
      for(var i = 0; i < results.length; i++) {
        var result = results[i];
        if(result) {
          callback.call(this, result);
          return;
        }
      }
      callback.call(this, false);
    });
  },
  
  // Similar to asyncEach but executes in parallel
  // and captures results for all items
  asyncParallelEach: function(list, callback, doneCallback) {
    var count = list.length;
    var results = new Array(count);
    if(count === 0) {
      if (doneCallback) { doneCallback.call(this, results); }
      return;
    }
    var resumed = 0;
    var self = this;
    for(var i = 0; i < count; i++) {
      var async = false;
      var item = list[i];
      var index = i;
      function itemCallback(result) {
        results[index] = result;
        resumed++;
        if(resumed == count) {
          if (doneCallback) { doneCallback.call(self, results); }
        }
      }
      callback.call(this, item, itemCallback);
    }
  },
  
  /** @private
   Check if a state accepts the remaining tail of the route
   
   Will also set the dirty flag if the route is the same but
   the parameters have changed
   */
  _matchState: function(state, tail, params, callback) {
    params = Ember.copy(params);
    var parts = tail.split('/');
    parts = parts.filter(function(part) {
      return part !== '';
    });
    var dirty = false;
    var route = get(state, 'route');
    if(route) {
      var partDefinitions;
      // route could be either a string or regex
      if( typeof route == "string") {
        partDefinitions = route.split('/');
      } else if( route instanceof RegExp) {
        partDefinitions = [route];
      } else {
        ember_assert("route must be either a string or regexp", false);
      }
      
      for(var i = 0; i < partDefinitions.length; i++) {
        if(parts.length === 0) {
          callback.call(this, false);
          return;
        }
        var part = parts.shift();
        var partDefinition = partDefinitions[i];
        var partParams = this._matchPart(state, partDefinition, part);
        if(!partParams) {
          callback.call(this, false);
          return;
        }

        var oldParams = this.get('params') || {};
        for(var param in partParams) {
          dirty = dirty || (oldParams[param] != partParams[param]);
        }

        jQuery.extend(params, partParams);
      }
    }
    
    var result = {
      tail: parts.join('/'),
      params: params,
      dirty: dirty
    }
    
    // States can implement an async 'load' method
    if(typeof state.load == 'function') {
      var asyncCount = 0;
      var returnCount = 0;
      var transition = {
        async: function() { asyncCount++; },
        ok: function() {
          if(++returnCount >= asyncCount) {
            callback.call(this, result);
          }
        },
        fail: function() {
          callback.call(this, false);
        }
      };
      
      valid = state.load(this, params, transition);
      if(asyncCount === 0) callback.call(this, valid && result);
    } else {
      callback.call(this, result);
    }
  },

  /** @private
   Returns params if the part matches the partDefinition
   */
  _matchPart: function(state, partDefinition, part) {
    var params = {};

    // Handle string parts
    if( typeof partDefinition == "string") {

      switch (partDefinition.slice(0, 1)) {
        // 1. dynamic routes
        case ':':
          var name = partDefinition.slice(1, partDefinition.length);
          params[name] = part;
          return params;

        // 2. wildcard routes
        case '*':
          return {};

        // 3. static routes
        default:
          if(partDefinition == part)
            return {};
          break;
      }

      return false;
    }

    if (partDefinition instanceof RegExp) {
      // JS doesn't support named capture groups in Regexes so instead
      // we can define a list of 'captures' which maps to the matched groups
      var captures = get(state, 'captures');
      var matches = partDefinition.exec(part);

      if (matches) {
        if (captures) {
          var len = captures.length, i;
          for(i = 0; i < len; ++i) {
            params[captures[i]] = matches[i+1];
          }
        }
        return params;
      } else {
        return false;
      }
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

    if(!jQuery.browser.mozilla) {
      // because of bug https://bugzilla.mozilla.org/show_bug.cgi?id=483304
      loc = decodeURI(loc);
    }

    if(get(routes, 'location') !== loc && !routes._skipRoute) {
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
    var base = get(routes, 'baseURI'), loc = (base.charAt(0) === '/') ? document.location.pathname : document.location.href;

    if(loc.slice(0, base.length) === base) {
      // Remove the base prefix and the extra '/'
      loc = loc.slice(base.length + 1, loc.length);

      if(get(routes, 'location') !== loc && !routes._skipRoute) {
        Ember.run.once(function() {
          routes._skipPush = true;
          set(routes, 'location', loc);
          routes._skipPush = false;
        });

      }
    }
    routes._skipRoute = false;
  },
  
  /**
   * Bind the browser title to the outermost state that has a documentTitle set
   */
  bindDocumentTitle: function() {
    var state = get(this, 'currentState');
    while(state && get(state, 'documentTitle') === undefined) {
      state = state.parentState
    }
    var titleState = get(this, '_titleState');
    if(titleState) {
      Ember.removeObserver(titleState, 'documentTitle', this, 'updateDocumentTitle');
    }
    set(this, '_titleState', state);
    if(state) {
      Ember.addObserver(state, 'documentTitle', this, 'updateDocumentTitle');
    }
    this.updateDocumentTitle();
  },
  
  updateDocumentTitle: function() {
    var title = Ember.getPath(this, '_titleState.documentTitle')
    document.title = title;
  },
  
  // This is used to re-enter a dirty root state
  __nullState: Ember.State.create({enabled: false})

});
