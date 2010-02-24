/* dojo style simple sync load*/

$e.mixin($e, {
  _loaded: {},
  _codeWaiting:[],
  _addressing: [],
  _moduleToPath: function(module){
    return $e.basePath + module.replace(".","/") + ".js";            
  }, 
  codeReady: function(moduleName, func){
    if(this._loaded[moduleName]){ 
      func() 
    } else {
      $e._codeWaiting[moduleName] = ($e._codeWaiting[moduleName]) ? $e._codeWaiting[moduleName] : [];
      $e._codeWaiting[moduleName].push(func);
    }
  },
  require: function(moduleName){
    if(this._loaded[moduleName]){return;} 
    var path = $e._moduleToPath(moduleName) + "?rand="+(new Date()-1);
    var sfunc = function(data){
      //tuck the module name into a scope for later usage
      return $e._handleScriptFetch(moduleName, data);
    };
    jQuery.ajax({ url: path, tyep:"get", async: false, context:this, success: sfunc, dataType: "text"});
  },
  _handleScriptFetch: function(moduleName, data){    
    $e._addressing[moduleName] = true;
    // this._depLoadedList[moduleName]=true;
    // pull out provides and requires from commented space
    var provides = data.match(/\/\/\*\*(.*)\*\*/g);
    var requires = data.match(/\/\/\-\-(.*)\-\-/g);          
    if(provides && (provides.length > 0)){
      // presume 1 provides line and clean off the commenting.
      provides = provides[0].replace(/\/\//g,"").replace(/\*\*/g,"");
    }
    if(requires && (requires.length>0)){
      var requiresSet = $e.collect(requires, function(index, item){
        return item.replace(/\/\//g,"").replace(/\-\-/g,""); 
      });
      jQuery.each(requiresSet, function(index, item){
        if(!$e._addressing[item]){ 
          $e.require(item)
        }
      })
    } 
    console.log("Executing "+moduleName)
    jQuery.globalEval(data);
    this._loaded[moduleName] = true;
    if($e._codeWaiting[moduleName]){
      jQuery.each($e._codeWaiting[moduleName],function(index, item){
        item.apply(this,[]);
      })
    }

  }
})