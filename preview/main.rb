require 'rubygems'
require 'sinatra'
require '../ruby_loader'

get "/" do
  redirect "/index.html"
end

get "/javascript/dep/:name.js" do |name|
  sleep 0.2
  File.read("#{Dir.pwd}/public/javascript/dependency/#{name}.js")
  # l = Loader.new
  # content = l.load_module("dep.#{name}")
  # puts "Loaded dep.#{name}"
  # content
end

get "/loader" do
  sleep 0.2
  l = Loader.new
  content = l.load_module(params[:target_module], params[:deps])
  puts "Loaded dep.#{params[:target_module]}"
  content
end