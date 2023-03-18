const express= require("express");
const bodyParser= require("body-parser");
const mongoose= require("mongoose");
const passport= require("passport");
const passportLocalMongoose= require("passport-local-mongoose");
const session= require("express-session");

const app= express();

app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(session({
    secret: 'our little secret',
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set('strictQuery', true);
mongoose.connect("mongodb://127.0.0.1:27017/hackItOutDB");

const userSchema= new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);

const User= mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const courseSchema= new mongoose.Schema({
    url: String,
    creator: String,
    rating: Number,
    ratedBy: Number
})

const Course= mongoose.model("Course",courseSchema);

app.get("/", function(req,res){
    res.render("home");
})

app.get("/resources", function(req,res){
    res.render("resources");
})

app.get("/resources/:courseField", function(req,res){
    // console.log(req.params.courseField);
    res.render("courseField", {courseField:req.params.courseField})
})

app.get("/mentor", function(req,res){
    res.render("mentor");
})

app.get("/login", function(req,res){
    res.render("login");
})

app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login', failureMessage: true }),
  function(req, res) {
    res.redirect('/');
});

app.get("/register", function(req,res){
    res.render("register");
})

app.post("/register", function(req,res){
    const newUser= new User({
        username: req.body.username,
    })
    
    User.register(newUser, req.body.password, function(err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
         }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/");
            });
        }
    });
})

app.listen(3000, function(){
    console.log("server is running on port 3000");
})