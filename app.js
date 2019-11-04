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
// const TwitterStrategy = require('passport-twitter').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();







app.listen(3000, () => {
    console.log("Server starter on http://localhost:3000");
  });