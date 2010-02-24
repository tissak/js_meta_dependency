require 'rubygems'
require 'fileutils'

class Loader
  attr_accessor :chain
  
  LOADER_ROOT = File.dirname(File.expand_path(__FILE__))
  JS_BASE_PATH = File.join(LOADER_ROOT,"lib")
  MODULE_ROOTS = {
    "dep"=>File.join(JS_BASE_PATH,"dependency")
  }

  def initialize
    @chain = []
  end

  # collect a module and it's deps into a single string,
  # ordered to satisfy the deps as it's evalled in JS
  def load_module(module_name, loaded_deps = [])
    @chain = loaded_deps
    load_module_chain(module_name).join("\n\n")
  end
  
  private 
  
  # convert a module name into a path to file.
  # eg. dep.level1 => JS_BASE_PATH / dependency / level1.js
  # if a raw js file is given, just add that to the js root.
  def expand_module_path(module_name)
    unless(module_name.index(".js").nil?)
      # if raw js filename, just return that
      path = File.join(JS_BASE_PATH,module_name)
    else
      # convert dot notation to path
      parts = module_name.split(".")
      base_path = MODULE_ROOTS[parts.first]
      filename = "#{parts.last}.js"      
      remainder = parts.slice(1, parts.size-2)
      set = []
      set.push base_path
      set.concat remainder unless remainder.nil?
      set.push filename
      path = File.join(set)
    end
    path    
  end
  
  # read the content of the module
  def module_content(module_name)
    file_path = expand_module_path(module_name)
    File.exist?(file_path) ? File.read(file_path) : nil
  end
  
  # pull out the dependencies using regex
  def dependencies(content)
    content.scan(/\/\/\-\-(.*)\-\-/)
  end

  # method used recursively to walk through files loading
  # the content and pulling out dependencies.
  def load_module_chain(module_name)
    content =  module_content(module_name)
    return "" if content.nil?    
    code = []
    dependencies(content).each do |dep|
      content = content.gsub("//--#{dep}--","$d.preLoad('#{dep}')")
      dep = dep[0]
      unless chain.include?(dep)
        # register with the global chain that we are loading this file
        # prevents reloading of files if different branches require that dep
        @chain.push(dep)
        code.concat load_module_chain(dep)
      end
    end
    # accumulate JS code into an array, ordered in a way to satisfy deps.
    code.push(content)
    return code
  end
end

# load_code("dep.level1")