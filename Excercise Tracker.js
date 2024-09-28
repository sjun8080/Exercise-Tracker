require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')


mongoose.connect(process.env.MONGO_URI, {
  //useNewUrlParser: true,
  //useUnifiedTopology: true,
});
const estuser = mongoose.model('estuser', {username: {type: String, required: true, unique: [true, "existing profile"]}})
const estexercise = mongoose.model('estexercise', {
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, required: true, default: new Date()},
  username: {type: String, required: true},
})
const port = process.env.PORT || 3000;
/*
const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
    },
  },
  { versionKey: false },
);

const User = mongoose.model("User", userSchema);

const exerciseSchema = mongoose.Schema({
  username: String,
  description: String, 
  duration: Number,  
  date: Date,
  userId: String
  },
  { versionKey: false }
)                                      
const Exercise = mongoose.model('Exercise', exerciseSchema)

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//GET req to /api/users
app.get("/api/users", async (req, res) => {
  const users = await User.find();
  res.send(users);
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  const foundUser = await User.findOne({ username });

  if (foundUser) {
    res.json(foundUser);
    //{ versionKey: false }
  }

  const user = await User.create({
    username,
  });

  res.json(user);
});*/
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post('/api/users', async function(req, res) {
  const data = {username: req?.body?.username}
  try {
    const user = await estuser.create(data)
    res.json({username: user?.username, _id: user?._id})
  } catch (error) {
    res.json({error: !req?.body?.username ? "Username Plz" : "username cannot be saved"})
  }
})

app.get('/api/users', async function(req, res) {
  const users = await estuser.find({}, {__v: 0})
  res.json(users)
})
/*
app.get("/api/users/:_id/logs", async (req, res) => {
  let { from, to, limit } =req.query;
  const userId = req.params._id;
  const foundUser = await User.findById(userId);
  if(!foundUser) {
    res.json({ message: 'No such user for the id '});
  }

  let filter = { userId };
  let dateFilter = {};
  if (from) {
    dateFilter['$gte'] = new Date(from);
  }
  if (to){
    dateFilter['$lte'] = new Date(to);
  }  
  if (from || to) {
    filter.date = dateFilter;
  }
  if (!limit){
    limit = 100;
  }

  let exercises = await Exercise.find(filter).limit(limit);
  exercises = exercises.map((exercise) => {
    return {
      description: exercise.description,
      duration: exercise.duration, 
      date: exercise.date.toDateString(),
    }
  });

  res.json({
    username: foundUser.username,
    count: exercises.length,
    _id: userId,
    log: exercises,
  });
});
// POST /api/users/:_id/exercises

*/

app.post('/api/users/:_id/exercises', async function(req, res) {
  const body = req?.body
  const date = new Date(body?.date)?.getMonth() + 1 ? new Date(body.date) : new Date()
  const description = body?.description
  const duration = /^\d+$/.test(body?.duration) ? parseInt(body?.duration) : body?.duration
  const id = req.params?._id
  console.log(id);
  try {
    const user = await estuser.findOne({_id: id})
    console.log(user, !!date, !!description, typeof(duration) === 'number');
    if(user && date && description && typeof(duration) === 'number') {
      const excercise = await estexercise.create({date, description, duration, username: user.username})
      res.json({
        date: new Date(excercise.date).toDateString(), 
        description: excercise.description, 
        duration: excercise.duration, 
        username: user.username,
        _id: user._id
      })
    } else {
      res.json({error: "invalid data"})
    }
  } catch (error) {
    res.json({error: error?.message || "error"})
  }
})
/*app.post("/api/users/:_id/exercises", async (req, res) => {
  let { description, duration, date } = req.body;
  const userId = req.body[':_id'];
  const foundUser = await User.findById(userId);

  if(!foundUser) {
    res.json({ message: 'No such user for the id '});
  }

  if (!date){
    date = new Date();
  } else {
    date = new Date(date);
  }

  await Exercise.create({
    username: foundUser.username,
    description,
    duration,
    date,
    userId,
  });

  res.send({
    username: foundUser.username, 
    description, 
    duration, 
    date: date.toDateString(),
    _id: userId
  });
});*/
app.get('/api/users/:_id/logs', async function(req, res) {
  const id = req.params?._id
  const q = req.query
  const limit = /^\d+$/.test(q?.limit)? parseInt(q?.limit) : 10000
  const hasFrom = new Date(q?.from)?.getMonth() + 1
  const hasTo = new Date(q?.to)?.getMonth() + 1
  const from = hasFrom ? new Date(q?.from) : null
  const to = hasTo ? new Date(q?.to) : null
  hasTo && to.setDate(to.getDate() + 1)

  try {
    const user = await estuser.findOne({_id: id}, {__v: 0})
    if(user) {
      const dateFilters = [{key: "$gte", value: from}, {key: "$lte", value: to}].reduce((acc, curr) => {
        if(curr.value) {
          if(acc["date"]) {
            acc["date"][curr.key] = new Date(curr.value.toISOString())
          } else {
            acc["date"] = {[curr.key]: new Date(curr.value.toISOString())}
          }
        }
        return acc
      }, {})
      const excercise = await estexercise.find({
        username: user.username, 
        ...dateFilters
      }, {username: 0, __v: 0, _id: 0}).limit(limit)
      const log = excercise.map(ex => ({
        description: ex.description,
        duration: ex.duration, 
        date: new Date(ex.date).toDateString()
      }))
      res.json({
        _id: user?._id,
        username: user?.username,
        count: excercise.length,
        log
      })
    } else {
      res.json({error: "invalid user"})
    }
  } catch (error) {
    console.log(error);
    res.json({error: "error fetching data"})
  }
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
