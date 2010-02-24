(function(window){
  // no op quick def
  var noop = function(){};
  // if no firebug like console, log out to no op. Create local console reference
  var console = (typeof(console)=="undefined") ? {log:noop,warn:noop,error:noop} : console;

  /**
   * Deferred - Allows delayed processing by queueing callback methods that get fired when callback is triggered.
   * Modelled on the dojo.Deferred class but simplified.
   * @author tissak
   */ 
   /** @constructor */
  var Deferred = function(){    
    this.chain = [];
    this.err = [];
    this.fired = -1;
    this.result = null;
    this.isFiring = false;
    this.check = function(){
      if(this.fired != -1){
        throw "Already fired!";
      }
      if(this.fired == 1){
        console.log("Error was fired");
      }
    }
    /**
     * Add a callback to fire on success of the Deferred. Note it will immediately fire if Deferred already successful.
     * @param {Function} func Code to fire.
     * @returns nothing
     * @type Null
     */    
    this.addCallback = function(func){
      if(this.fired === 0){
        //if we have already succeeded, immediately fire
        func.apply(window, this.result);
      }else{
        this.chain.push(func);
      }
    };

    /**
     * Add a callback to fire in the case of an error / exception
     * @param {String|Object|Array|Boolean|Number} paramName Describe this parameter
     * @returns Describe what it returns
     * @type String|Object|Array|Boolean|Number
     */    
    this.addErrback = function(func){
      this.check();
      this.err.push(func);
    };

    /**
     * Add both a success and fail callback in one move
     * @param {Function} success Success callback
     * @param {Function} fail Fail callback
     * @returns Describe what it returns
     * @type String|Object|Array|Boolean|Number
     */    
    this.addBoth = function(success, fail){
      this.check();
      this.chain.push(success);
      this.err.push(fail);
    };

    /**
     * Trigger the fail state. Calls all errBack callbacks and sets the internal flag to failed.
     * @returns Nothing
     * @type Null
     */    
    this.errback = function(){
      this.check();
      console.error("Error from deferred");
      this.fired = 1;
      jQuery.each(this.err, function(index,item){
        item.call();
      });
    };
    /**
     * Triggers the callback state. If param is true, trigger all the success states else fire the fail states.
     * @param {Boolean} val The success / fail value
     * @returns nothing
     * @type Null
     */    
    this.callback = function(val){
      if(this.isFiring){
        return null;
      }
      this.check();
      try{
        if(val){
          this.isFiring = true;
          this.result = arguments;
          var args = arguments;
          jQuery.each(this.chain, function(index,item){
            item.apply(window, args);
          });
          this.fired = 0;
          this.isFiring = false;
        }
      } catch(e){
        console.error("Error executing deferred callbacks");
        this.error();
      }
    };
  };
  
  var _dependenciesResolvedArray = [];

  $d = {
    basePath:"/javascript/",
    _dependenciesList: {},
    _dependenciesResolved: {},
    _dependencyInProgress:{},
    _codeLoadedQueue: (new Deferred()),
    isCodeLoaded: false,
    /**
     * Remove an item from an array by it's identity
     * @param {Array} array The array set to work on
     * @param {Object} name The object to to remove
     * @returns 
     * @type
     */    
    arrayRemove: function(array, name) {
      if(array == null){ return; }
      var pos = array.indexOf(name);
      var rest = array.slice((pos) + 1 || array.length);
      array.length = pos;
      return array.push.apply(array, rest);
    },
    codeReady: function(requiredModules, func){
      if(!jQuery.isArray(requiredModules)){ requiredModules = [requiredModules]; }
      var dep = new $d.Dependency("inlineCode",requiredModules,func);
      jQuery.each(requiredModules, function(index, module){
        $d.dependencyRegister(module, dep, true)
      })    
    },
    codeDomReady: function(requiredModules, func){
      if(!jQuery.isArray(requiredModules)){ requiredModules = [requiredModules]; }
      requiredModules = requiredModules.concat(["DOM"]);
      this.codeReady(requiredModules, func);
    },
    codeLoaded: function(func){    
      if(this.isCodeLoaded){ 
        func.apply(window, []);
      } else {
        this._codeLoadedQueue.addCallback(func);
      }    
    },
    _codeLoaded:function(){
      this.isCodeLoaded = true;
      this._codeLoadedQueue.callback(true);
    },
    dependencyRegister: function(requiredModules, dependency){    
      console.log(this);
      if(!jQuery.isArray(requiredModules)){ requiredModules = [requiredModules]; }
      var self = this;
      jQuery.each(requiredModules, function(index, moduleName){
        if($d._dependenciesResolved[moduleName]){ 
          dependency.executeCode();
        }
        if(!self._dependenciesList[moduleName])
          self._dependenciesList[moduleName] =  [];
        self._dependenciesList[moduleName].push(dependency);            
      })
    },
    dependencySatisfied: function(moduleName){
      $d._dependenciesResolved[moduleName] = true;
      _dependenciesResolvedArray.push(moduleName);
      var items = this._dependenciesList[moduleName];
      if(items && items.length>0){            
        jQuery.each(items, function(index,item){
          item.satisfied(moduleName);
        });
      }
      if(!this.isCodeLoaded && (this._dependenciesList.length == this._dependenciesResolved.length)){
        this._codeLoaded();
      }
    },
    _moduleToPath: function(module){
      var path = $d.basePath + module.replace(".","/") + ".js";
      if(this.cacheBust){ path += "?rand="+(new Date()-1); }
      return path;
    }, 
    preLoad: function(module){
      $d._dependencyInProgress[module] = true;
      $d.dependencySatisfied(module);
    },
    requireWithLoader: function(module){
      if($d._dependencyInProgress[module]){ return true; }
      $d._dependencyInProgress[module] = true;
      
      var async = true;
      var deps = {target_module: module, deps:_dependenciesResolvedArray};
      
      /** success function */
      var sfunc = function(data){ return $d._handleScriptFetch(module, data, async); };
    
      /** fail function */
      var efunc = function(data){ $d._dependencyInProgress[module] = false; console.log("Error loading "+module)};
      
      jQuery.ajax({ url: "/loader", type:"get", data: deps, async: async, context:this, success: sfunc, error: efunc, dataType: "text"});
    },
    require: function(module, async){
      async = true;
      console.log("Require called: "+module)
      /** setup async mode */
      if(async==null){ async = $d.asyncMode; }
    
      /** if we are already processing the requested dep, immediately return and let the existing processing complete */
      if($d._dependencyInProgress[module]){ return true; }
      $d._dependencyInProgress[module] = true;

      /** convert a namespace to a path*/
      var path = $d._moduleToPath(module);
    
      /** success function */
      var sfunc = function(data){ return $d._handleScriptFetch(module, data, async); };
    
      /** fail function */
      var efunc = function(data){ $d._dependencyInProgress[module] = false; console.log("Error loading "+module)};
    
      jQuery.ajax({ url: path, type:"get", async: async, context:this, success: sfunc, error: efunc, dataType: "text"});
    },
    _handleScriptFetch: function(moduleName, data, async){   
      /** pull out the requires */
      var requires = data.match(/\/\/\-\-(.*)\-\-/g);          
      
      if(requires && (requires.length>0)){
        /** build up a list of cleaned up required elements */
        var requiresSet = $d.collect(requires, function(index, item){
          return item.match(/\/\/\-\-(.*)\-\-/)[1];
        });
        $d.dependencyRegister(requiresSet, (new $d.Dependency(moduleName, requiresSet, data)), async);
        jQuery.each(requiresSet,function(index, item){
          $d.require(item, async);
        })
      } else {
        //do not require anything so execute the code and notify dependencies
        jQuery.globalEval(data);
        $d.dependencySatisfied(moduleName);
      }
    }
  }

    /**
   * Collect uses an each iterator but collects the returns into a new array
   * @public
   * @param {Array} array array to loop over
   * @param {Function} func function to appy
   * @param {Object} scope scope to run the function within
   * @returns Array of results
   * @type Array
   */    
  $d.collect = function(array, func, scope){
    if(!scope){ scope = window; }
    var arr = [];
    jQuery.each(array, function(index, item){
      arr.push(func.apply(scope, [index, item]));
    });
    return arr;
  }


  $d.Dependency = function(moduleName, requires, code){
    this.constructor(moduleName, requires, code);
  };
  $d.Dependency.prototype = {
      modName: "",
      requires: null,
      constructor:function(moduleName, requires, code){
        this.modName = moduleName;
        this.requires = requires;
        this.waitingCode = code;       
      },
      remove: function(name){
        return $d.arrayRemove(this.requires, name);
      },
      satisfied: function(moduleName){
        this.remove(moduleName);
        if(this.requires.length==0){
          this.executeCode();
        }
      },
      executeCode: function(){
        if(typeof(this.waitingCode) == "string"){ //ie xhr loaded
          jQuery.globalEval(this.waitingCode);
          this.waitingCode = null;
        }
        if(this.waitingCode){ //queued up function
          this.waitingCode.apply(window, []);
        }
        // register back to the manager that we are now satisfied.
        $d.dependencySatisfied(this.modName);
      }
    }    


  /** create a dependency against the dom. */
  $(document).ready(function(){
    $d.dependencySatisfied("DOM");
  });
  
})(window);