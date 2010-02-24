JS Meta Dependency
==================

Overview
--------

This is a prototype framework for Auto resolving and loading javascript.

Inspired by dojo.require / dojo.provide the you can embed the dependencies of a JS file inside the top of the file and as the system is loading the JS it will determine what else it must load to satisfy that files dependencies.

The key difference between this method and dojo's is that code does not execute until dependencies are satisfied and hence all JS can be loaded asynchronously as order is not important. 

This makes for a slightly different way of coding as code loading is an event and standalone from the rest of the page and other JS loading steps. To make things a little more traditional a DOM dependency is provided tied to when the page loads. With it you can make a block of code dependent on the page loading along with other code dependencies.

Quick look
----------

Setting what a file provides and what it requires

in module/file1.js

    //**module.file1**
    //--module.file2--
    //--module.submodule.file3--

    module.something = {
      done: function(){
        console.log("done")
      }
    }

Here we can see that in the opening lines of the file we note what the file is providing with:
    //**<module name>**
And we can note the requirements with the next lines of
    //--<dependency>--

Just as with dojo and many other languages, the module name uses '.' style notation to represent paths. The first item in the module name is tied to a base path and then the following parts are a subdirectory till the last part of the module name which represents the file name.

Now in the html page you can say:

      $d.codeDomReady("module.level1",function(){ 
          module.something.done();
      });

This will load the module.level1 and it's dependencies in the background and then execute the code block once code and dom are ready. If you were only waiting on the code and not the DOM you can say the same thing as:

      $d.codeReady("module.level1",function(){ 
          module.something.done();
      });

Reasoning
---------

Script tags are:

* Annoying to maintain
* Annoying to get in the right order
* Annoying when it's another persons code and you aren't sure what it requires

dojo.require:

* Automatically resolves dependencies in an elegant way.
* Removes concerns about 'reloading' as repeat dojo.require requests to the same files are skipped.
* Is slow if you rely on it as it synchronously loads code and has to pull down and eval the code to determine what to load next.
* Blocks the page loading as it's synchronous.

js meta dep:

* Does not stop you from loading your code with script tags..the meta information is commented out.
* Can concurrently load code as it is ansynchronous
* Can make code dependent on other code loading, not the whole page.
* Does not block the page and other resource loading
* Is still slower than using script tags if the client is resolving all the dependencies.
* As with dojo.require removes concern about repeat requests to the same files.

There's more
------------

The last point of the js meta dep list points out that if the client is resolving the dependencies then the process will still be slower than plain script tags as there's no way to know dep's until the first file is loaded. So to overcome this we can make the server do some work. 

In the prototype there is 'ruby_loader.rb'. This file contains a dependency resolver that does with the JS loader does only at the server. Inside the preview directory is main.rb, a sinatra server that implements this.

The ruby loader takes a module name and at the server will run through all the dependencies, merging the files into a single JS file. This file is ordered in a way that meets all the requirements in a single execution. The outcome is that a require with the loader pulls in a single JS file that meets all dependencies. This outperforms both the client side resolving and the script tag approach as there's only a single server request.

The one problem with this approach is that we don't want to reload deps but the server doesn't know what we have loaded. Hence the "requireWithLoader" js method not only makes a request to the server for the module but sends through what it currently has loaded. That way when the loader starts resolving deps it knows what it can skip over because it's already in the page. 

The Heart of the Process
------------------------

The heart of the system is the Dependency JS class. The idea from this came in a roundabout way from dojo.Deferred. dojo.Deferred for me was a conceptual revolution. The idea behind dojo.Deferred is that you can perform a task and queue up actions to occur in response to that task. But rather than only allow queuing up of actions before the task as run, it will allow you to add tasks after the task is run and immediately execute them. This removes the actions from knowing time wise anything about the triggering task.

I wanted something similar only instead of one task triggering many actions I wanted many task results triggering one action. It's a bit of a tangled web as dependencies are both firing their own code and calling out to clear off other dependencies at the same time. But it makes for an interesting event driven landscape.

Warnings and Disclaimers
------------------------

This code is the product of an idea. Not a well thought out idea. It's a prototype to give implementation to an idea with the thought that it could be taken further given time and resources. 

It currently has little in the way of robust coding and does not stop you from doing things like cyclic dependency issues. It's also in the pretest phase.

Use this at your own risk.