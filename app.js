require("dotenv").config(); //everytime write to top the phage
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

//////////////set up session ///////////
// app.use(
//   session({
//     secret: "Our little secret.",
//     resave: false,
//     saveUninitialized: false
//   })
// );

app.use(passport.initialize());
app.use(passport.session());

//////connect to the database///////
mongoose.connect("mongodb://localhost:27017/userDataBase", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.set("useCreateIndex", true); //(node:1926) DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead.

//////creat post schema//////
const postSchema = new mongoose.Schema({
  content: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: String, default: new Date() },
  likes: { type: Number, default: 0 }
});

const Post = new mongoose.model("Post", postSchema);

//////creat user schema////
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  fullname: String,
  password: String,
  passwordConfirm: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

/////creat the collection in database////
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.get("/", (req, res) => {
  res.render("login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});


app.get("/home", (req, res) => {

  Post.find().populate("user", ["username"]).then(foundPosts => {
    res.render("home", { userWithPosts: foundPosts });
    console.log(foundPosts);
    
  });
});

// app.get('/home', (req, res) => {
//   Post.find({ "content": { $ne: null }, (err, foundPosts) => {
//       if (!err) {
//           if (foundPosts) {
//               res.render('home', { userWithPosts: foundPosts });
//               console.log(foundPosts);
              
//           }
//       } else {
//           console.log(err);
//           // res.status(400).send();
//       }
//   }).populate('user', ['username']);
// });

app.get("/home", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("home");
  } else {
    res.redirect("/login");
  }
});
 

//////save user's post in database//////
app.post("/publish", (req, res) => {
  const content = req.body.postBody;
  const user = req.body.user;
  // if (!content || !user) {
  //   res.status(400).send("missing some data!");
  //   return;
  // }
  const post = new Post({ content, user });

  post.save().then(savedPost => {
    res.redirect("/home");
  });

});

///// logout ////
app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
})

////// register /////
app.post("/register", (req, res) => {
  if (req.body.password === req.body.passwordConfirm) {
    User.register(
      {
        username: req.body.username,
        email: req.body.email,
        fullname: req.body.fullname,
      }, req.body.password,
      (err, user) => {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, () => {
            res.redirect("/home");
          });
        }
      }
    );
  } else {

    console.log("Please check to your information!");
  }
});

///////log In/////////
app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, err => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local", { failureRedirect: "/login" })(req, res, () => {
        res.redirect("/home");
      });
    }
  });
});




app.listen(3000, () => {
  console.log("Server starter on http://localhost:3000");
});