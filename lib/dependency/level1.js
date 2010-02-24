//**dep.level1**
//--dep.level2--
//--dep.level2_1--

widgets.level1 = function(){

}

widgets.something.asd.a = function(){
  document.body.innerHTML += "<br/>Dependency loaded: "+ $p.ping();
};
