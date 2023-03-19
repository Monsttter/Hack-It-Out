require('dotenv').config();
const express= require("express");
const bodyParser= require("body-parser");
const mongoose= require("mongoose");
const passport= require("passport");
const passportLocalMongoose= require("passport-local-mongoose");
const session= require("express-session");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const _= require("lodash");

const app= express();

app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set('strictQuery', true);
mongoose.connect("mongodb://127.0.0.1:27017/hackItOutDB");

const userSchema= new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User= mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

const courseSchema= new mongoose.Schema({
    url: String,
    imgURL: String,
    creator: String,
    rating: Number,
    ratedBy: [String]
})

const Course= mongoose.model("Course",courseSchema);

const fieldSchema= new mongoose.Schema({
    fieldName: String,
    upperField: String,
    courses: [courseSchema],
    imgURL: String
});

const Field= mongoose.model("Field", fieldSchema);

// const newField= new Field({
//     fieldName: "Digital Electronics",
//     upperField: "gate",
//     courses: []
// })

// newField.save();

// const newFields= new Field({
//     fieldName: "UPSC",
//     upperField: "civilServices",
//     courses: [],
// })

// newFields.save();

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/learnBetter"
  },
  async function (accessToken, refreshToken, profile, done) {
    try {
    //   console.log(profile);
      // Find or create user in your database
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        // Create new user in database
        const username = Array.isArray(profile.emails) && profile.emails.length > 0 ? profile.emails[0].value.split('@')[0] : '';
        const newUser = new User({
          username: profile.displayName,
          googleId: profile.id
        });
        user = await newUser.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

app.get("/", function(req,res){
    // console.log(req.user);
    res.render("home", {user:req.user});
})

app.get("/auth/google",
  passport.authenticate("google", { scope: ['profile'] }),
  function(req,res){
  });

app.get("/auth/google/learnBetter", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/");
  });

app.get("/compose", function(req,res){
    res.render("compose");
})

app.post("/compose", async function(req,res){
    // console.log(req.body);
    try{
        const field= await Field.findOne({fieldName: req.body.field}).exec();
        // console.log(field);
        const newCourse= new Course({
            url: req.body.courseURL,
            imgURL: req.body.imgURL,
            creator: req.body.creator,
            rating: 0,
            ratedBy: []
        });

        field.courses.push(newCourse);
        field.save().then(function(){
            res.redirect("/resources/"+req.body.field);
        });
    } catch(err){
        console.log(err);
    }
})

app.get("/resources",  async function(req,res){
    try{
        const fields= await Field.find();
        res.render("resources", {fields:fields, user:req.user});
    } catch(err){
        console.log(err);
    }
});

app.get("/resources/:courseField", async function(req,res){
    try{
        const field= await Field.findOne({fieldName: req.params.courseField});
        res.render("courseField", {courseField:field, user: req.user});
    } catch(err){
        console.log(err);
    }
})

app.post("/addRating", async function(req,res){
    try{
        console.log(req.body);
        const field= await Field.findById(req.body.courseField);

        const course= field.courses.find(course => course.id===req.body.course);
        const index= field.courses.indexOf(course => course.id===course);
        course.ratedBy.push(req.body.user+req.body.rating);
        course.rating= Math.round(((course.rating*(course.ratedBy.length-1)+Number(req.body.rating))/course.ratedBy.length)*10)/10;
        await field.courses.splice(index,1,course);

        if(field.courses.length>1){
            await field.courses.sort((course1,course2) => { 
                const a= course2.rating*course2.ratedBy.length;
                const b= course1.rating*course1.ratedBy.length;
                if(a<b){
                    return -1;
                }
                if(a>b){
                    return 1;
                }
                return 0;
                // return course2.rating*course2.ratedBy.length - course1.rating*course1.ratedBy.length});
            })
        }
        field.save().then(function(){
            res.redirect("/resources/"+req.body.fieldName);
        });

    } catch(err){
        console.log(err);
    }
})

app.get("/mentor", function(req,res){
    res.render("mentor", {user:req.user});
})

app.get("/login", function(req,res){
    res.render("login", {user:req.user});
})

app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login', failureMessage: true }),
  function(req, res) {
    res.redirect('/');
});

app.get("/register", function(req,res){
    res.render("register", {user:req.user});
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

app.get("/logout", function(req,res){
    req.logOut(function(err){
        if(err){
            console.log(err);
        } else{
            res.redirect("/");
        }
    });
});

app.listen(3000, function(){
    console.log("server is running on port 3000");
})