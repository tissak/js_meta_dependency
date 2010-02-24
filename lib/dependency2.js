// $e = ($e) ? $e : {};

$e.declare(
  "$e.Dependency", 
  null, 
  {
    unsatisfiedModules: null,
    satisfiedModules: null,
    modName: "",
    constructor:function(moduleName, requires, code){
      this.modName = moduleName;
      this.satisfiedModules = [];
      this.unsatisfiedModules = requires;
      this.waitingCode = code; 
    },
    satisfied: function(moduleName){
      this.satisfiedModules.push(moduleName);
      if(this.satisfiedModules.length == this.unsatisfiedModules.length){
        this.executeCode();
      }
    },
    executeCode: function(){
      if(typeof(this.waitingCode) == "string"){
        jQuery.globalEval(this.waitingCode);
        this.waitingCode = null;
      } else {
        this.waitingCode();
      }
      $e.dependencySatisfied(this.modName);
    }
  }
);

$e.mixin($e,{
  _dependenciesList: {},
  _depFetchedList: {},
  _depResolved: {},
  asyncMode: true,
  _global: window,
  provide: function(moduleName, requires, func){
    console.log(arguments);
    var dep = new $e.Dependency(moduleName, requires, func);
    if((requires!=null)&&(requires.length > 0)){
      console.log("has requires");
      jQuery.each(requires, function(index, item){
        $e.dependencyRegister(item, dep);
        $e.require(item);
      })
    } else {
      console.log("no requires");
      func.apply(this._global, [])
      $e.dependencySatisfied(moduleName);
    }
  },
  codeReady: function(moduleName, func){
    $e.dependencyRegister(moduleName, (new $e.Dependency("CODE", [moduleName], func)));
  },
  dependencyRegister: function(moduleName, dependency){
    if($e._depResolved[moduleName]){ 
      // if already resolved, immediately execute
      dependency.executeCode(); 
    }
    if(this._dependenciesList[moduleName]==null){ this._dependenciesList[moduleName] = []; }
    this._dependenciesList[moduleName].push(dependency);
  },
  dependencySatisfied: function(moduleName){
    $e._depResolved[moduleName] = true;
    if(this._dependenciesList[moduleName] && this._dependenciesList[moduleName].length>0){      
      var items = this._dependenciesList[moduleName];
      jQuery.each(items, function(index,item){
        item.satisfied(moduleName);
      });
    }
  },
  _moduleToPath: function(module){
    return $e.basePath + module.replace(".","/") + ".js";            
  }, 
  require: function(module){
    if($e._depFetchedList[module]){ return true; }
    $e._depFetchedList[module] = true;
    var path = $e._moduleToPath(module); // + "?rand="+(new Date()-1);
    var sfunc = function(data){
      //tuck the module name into a scope for later usage
      var moduleName = module;
      return $e._handleScriptFetch(moduleName, data);
    };
    var efunc = function(data){
      //tuck the module name into a scope for later usage
      var moduleName = module;
      $e._depFetchedList[module] = false;
    };
    this._fetchScript(path);
  },
  _fetchScript: function(path){
    var headScript = $("head script")[0];
    var tag = $e.string.substitute('<script type="text/javascript" src="${src}"></script>',{src:path});
    $(tag).insertBefore(headScript);
  }
});