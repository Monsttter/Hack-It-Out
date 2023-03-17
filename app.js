const express= require("express");
const bodyParser= require("body-parser");

const app= express();

app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", function(req,res){
    res.render("home");
})

app.get("/resources", function(req,res){
    res.render("resources");
})

app.get("/mentors", function(req,res){
    res.render("mentors");
})

app.get("/login", function(req,res){
    res.render("login");
})

app.get("/register", function(req,res){
    res.render("register");
})

app.listen(3000, function(){
    console.log("server is running on port 3000");
})