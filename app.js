// jshint esversion:6

// const cron = require("node-cron");
require("dotenv").config();

const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");

const DB_URI = process.env.DB_URI;

const options = {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "asia/baku",
};

const app = express();

mongoose.set("strictQuery", false);
mongoose.connect(DB_URI, { useNewUrlParser: true });

const jobSchema = new mongoose.Schema({
  job: String
});

const banSchema = new mongoose.Schema({
  ip: String,
  time: Date
});

const Job = mongoose.model("Job", jobSchema);

const Ban = mongoose.model("Ban", banSchema);

function isBanned(req, res, next) {
  Ban.findOne({ ip: req.headers["x-real-ip"] }, (err, ban) => {
    if (ban) {
      const diff = Math.ceil(60 - (new Date().getTime() - new Date(ban.time).getTime()) / 1000);
      if (diff <= 0) {
        Ban.deleteOne({ ip: req.headers["x-real-ip"] }).exec();
        res.send('<script>alert("You are unbanned. Now you can use the website!");window.location = "/"</script>');
      } else {
        res.send(`<script>alert("You are banned. You have to wait ${diff} second(s) before accessing the website!");window.location = "/"</script>`);
      }
      return;
    } else {
      next();
    }
  })
}

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/static"))
app.use(isBanned)

app.get("/", (req, res) => {
  let today = new Date().toLocaleDateString("en-US", options);
  Job.find((err, jobs) => {
    if (err) {
      console.log(err);
    } else {
      res.render("index", { day: today, jobs: jobs });
    }
  })
})

app.post("/", (req, res) => {
  if (req.body.job == "") {
    res.send('<script>alert("Enter some text!");window.location = "/"</script>')
  } else if (req.body.job.length > 30) {
    res.send('<script>alert("No more than 30 chars!");window.location = "/"</script>')
  } else if (req.body.job.toLowerCase().includes("php")) {
    const ban = new Ban({ ip: req.headers["x-real-ip"], time: new Date() });
    ban.save();
    res.send('<script>alert("You are banned, because you used word php!");window.location = "/"</script>')
  } else {
    const job = new Job({
      job: req.body.job
    })
    job.save();
    res.redirect("/");
  }
})

app.post("/delete", (req, res) => {
  Job.deleteOne({ _id: req.body.id }).exec();
  res.redirect("/");
})

// cron.schedule("0 0 0 * * *", () => {
//   jobs = [];
// })

app.listen(3000)
