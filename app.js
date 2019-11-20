require("dotenv").config(); //everytime write to top the phage
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const moment = require("moment");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const DateTimeFormat = require('date-time-format-timezone');

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

////////////set up session ///////////
app.use(
  session({
    secret: "Our posts.",
    resave: false,
    saveUninitialized: false
  })
);

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
  createdAt: { type: Date, default: new moment() },
  likes: { type: Number, default: 0 },
  unlike: { type: Number, default: 0 },
  user: { type: mongoose.SchemaTypes.ObjectId, ref: "User" }
});

const Post = new mongoose.model("Post", postSchema);

//////creat user schema////
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  fullname: String,
  password: String,
  passwordConfirm: String,
  googleId: String,
  facebookId: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

/////creat the collection in database////
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

////////GOOGLE LOGIN STRATEGY //////
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/posts",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" //handle new user info endpoint "githup"
    },
    function(accessToken, refreshToken, profile, cb) {
      console.log(profile);

      User.findOrCreate({ googleId: profile.id, username: profile.name.givenName }, function(err, user) {
        return cb(err, user);
      });
    }
  )
);

////////FACEBOOK LOGIN STRATEGY //////
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.APP_ID,
      clientSecret: process.env.APP_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/posts"
    },
    function(accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ facebookId: profile.id, username: profile.first_name
      }, function(err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/contact", (req, res) => {
  res.render("contact");
});

app.get("/about", (req, res) => {
  res.render("about");
});

////////LOGIN WITH GOOGLE //////////
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/posts",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/posts");
  }
);
///// LOGIN WITH FACEBOOK/////
app.get("/auth/facebook", passport.authenticate("facebook"));

app.get(
  "/auth/facebook/posts",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/posts");
  }
);

app.get("/register", (req, res) => {
  res.render("register");
});

// app.get("/posts", (req, res) => {
//   Post.find().populate("user", ["username"]).then(foundPosts => {
//     res.render("posts", { userWithPosts: foundPosts});
//     console.log(foundPosts);

//   });
// });

app
  .route("/posts")
  .get(async (req, res) => {
    if (req.isAuthenticated()) {
      const postsAll = await Post.find().populate(
        "user",
        ["username"]
      );
      res.render("posts", {
        userWithPosts: postsAll,
        userInf: req.user,
        moment
      });
    } else {
      res.redirect("/login");
    }
  })
  .post(async (req, res) => {
    let newComment = req.body.postBody;
    const newPost = new Post({
      content: newComment.toString(),
      user: req.user.id,
      createdAt: new moment()
    });
    try {
      await newPost.save();
      res.redirect("/posts");
    } catch (err) {
      res.status(400).send(err);
    }
  });

// app.get("/posts", (req, res) => {
//   if (req.isAuthenticated()) {
//     User.findById()
//     res.render("posts");
//   } else {
//     res.redirect("/login");
//   }
// });

//////save user's post in database//////
// app.post("/publish", (req, res) => {
//   const content = req.body.postBody;
//   const user = req.body.user;
//   // if (!content || !user) {
//   //   res.status(400).send("missing some data!");
//   //   return;
//   // }
//   const post = new Post({ content, user });

//   post.save().then(savedPost => {
//     res.redirect("/posts");
//   });

// });

///// logout ////
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

////// register /////
app.post("/register", (req, res) => {
  if (req.body.password === req.body.passwordConfirm) {
    User.register(
      {
        username: req.body.username,
        email: req.body.email,
        fullname: req.body.fullname
      },
      req.body.password,
      (err, user) => {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, () => {
            res.redirect("/posts");
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
      passport.authenticate("local", { failureRedirect: "/login" })(
        req,
        res,
        () => {
          res.redirect("/posts");
        }
      );
    }
  });
});

////// likes //////
app.get("/likes/:id", (req, res) => {
  let id = req.params.id;
  Post.findById(id).then(post => {
    let { likes } = post;
    post.likes = post.likes + 1;
    post.save().then(() => {
      res.redirect("/posts");
    });
  });
});

////// unlike //////
app.get("/unlike/:id", (req, res) => {
  let id = req.params.id;
  Post.findById(id).then(post => {
    let { unlike } = post;
    post.unlike = post.unlike + 1;
    post.save().then(() => {
      res.redirect("/posts");
    });
  });
});

app.get("/post/delete/:id", async(req, res) => {
  let { id } = req.params;

  await Post.findByIdAndRemove(id, (err) => {
      if (!err) {
          res.redirect("/posts");
      } else {
          console.log(err);
      }
  });

});

app.listen(3000, () => {
  console.log("Server starter on http://localhost:3000");
});
