$e.declare(
  "$e.Dependency", 
  null, 
  {
    modName: "",
    requires: null,
    constructor:function(moduleName, requires, code){
      this.modName = moduleName;
      this.requires = requires;
      this.waitingCode = code;       
    },
    remove: function(name){
      return $e.arrayRemove(this.requires, name);
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
        $e.accumulate(this.waitingCode);
        this.waitingCode = null;
      } else { //queued up function
        this.waitingCode.apply(window, []);
      }
      // register back to the manager that we are now satisfied.
      $e.dependencySatisfied(this.modName);
    }
  }
);

$e.mixin($e,{
  _dependenciesList: {},
  _dependenciesResolved: {},
  _dependencyInProgress:{},
  _codeLoadedQueue: (new $e.Deferred()),
  isCodeLoaded: false,
  codeReady: function(requiredModules, func){
    if(!jQuery.isArray(requiredModules)){ requiredModules = [requiredModules]; }
    var dep = new $e.Dependency("inlineCode",requiredModules,func);
    jQuery.each(requiredModules, function(index, module){
      $e.dependencyRegister(module, dep, true)
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
      if($e._dependenciesResolved[moduleName]){ 
        dependency.executeCode();
      }
      if(!self._dependenciesList[moduleName])
        self._dependenciesList[moduleName] =  [];
      self._dependenciesList[moduleName].push(dependency);            
    })
  },
  dependencySatisfied: function(moduleName){
    $e._dependenciesResolved[moduleName] = true;
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
    var path = $e.basePath + module.replace(".","/") + ".js";
    if(this.cacheBust){ path += "?rand="+(new Date()-1); }
    return path;
  }, 
  require: function(module, async){
    console.log("Require called: "+module)
    /** setup async mode */
    if(async==null){ async = $e.asyncMode; }
    
    /** if we are already processing the requested dep, immediately return and let the existing processing complete */
    if($e._dependencyInProgress[module]){ return true; }
    $e._dependencyInProgress[module] = true;

    /** convert a namespace to a path*/
    var path = $e._moduleToPath(module);
    
    /** success function */
    var sfunc = function(data){ return $e._handleScriptFetch(module, data, async); };
    
    /** fail function */
    var efunc = function(data){ $e._dependencyInProgress[module] = false; console.log("Error loading "+module)};
    
    jQuery.ajax({ url: path, tyep:"get", async: async, context:this, success: sfunc, error: efunc, dataType: "text"});
  },
  _handleScriptFetch: function(moduleName, data, async){   
    /** pull out the requires */
    var requires = data.match(/\/\/\-\-(.*)\-\-/g);          
      
    if(requires && (requires.length>0)){
      /** build up a list of cleaned up required elements */
      var requiresSet = $e.collect(requires, function(index, item){
        return item.match(/\/\/\-\-(.*)\-\-/)[1];
      });
      $e.dependencyRegister(requiresSet, (new $e.Dependency(moduleName, requiresSet, data)), async);
      jQuery.each(requiresSet,function(index, item){
        $e.require(item, async);
      })
    } else {
      //do not require anything so execute the code and notify dependencies
      //console.log("Executing for " + moduleName+ " (No Deps)");
      jQuery.globalEval(data);
      $e.accumulate(data);
      $e.dependencySatisfied(moduleName);
    }
  },
  _dataStore: [],
  accumulate:function(data){
    /** pull out the provides */
    var provides = data.match(/\/\/\*\*(.*)\*\*/);
    var call = $e.string.substitute("$e.preLoad('${name}')",{name:provides[1]})
    data = data.replace(/\/\/\*\*(.*)\*\*/, call);
    data = data.replace(/\/\/\-\-(.*)\-\-/g, "");
    this._dataStore.push(data);
  },
  reportCodeAccumulation: function(){
    $("body").append($("<textarea>"+this._dataStore.join("\n\n")+"</textarea>"));

  }
});

/** create a dependency against the dom. */
$(document).ready(function(){
  $e.dependencySatisfied("DOM");
});