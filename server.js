const path = require('path');
const session = require('express-session');
const express = require('express');
const app = express();
const secret = require('./app/secret.json');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const EventEmitter = require('events');
const flash = require('connect-flash');
const Chat = require('./app/chat.js');

const Chatkit = require('@pusher/chatkit-server')
const chatkit = new Chatkit.default({
  instanceLocator: "v1:us1:c7e77688-6e44-4fee-8b57-baf98c7f74dd",
  key: secret.chatkit
})

const Pusher = require('pusher');
let pusher = new Pusher({
  appId: '728436',
  key: '530ce917c255ae52ef75',
  secret: secret.pusher,
  cluster: 'ap2',
  encrypted: true
});


const mongoose = require('mongoose');
mongoose.set('useNewUrlParser', false); // true if want to use srv
mongoose.set('useCreateIndex', true);
mongoose.set('autoIndex', !(process.env.NODE_ENV === 'production'));

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const User = require('./models/user');

const stream = require('getstream');
// Instantiate a new client (server side)
client = stream.connect('sj5sb9224r84', secret.getstream, '47981');
// Instantiate a new client (client side)
// client = stream.connect('sj5sb9224r84', null, '47981');

app.engine('html', require('ejs').renderFile);

const port = process.env.PORT || 8080, ip = process.env.IP || '0.0.0.0';

mongoose.connect('mongodb://jew:jew@free-cluster-shard-00-00-aqc5h.gcp.mongodb.net:27017,free-cluster-shard-00-01-aqc5h.gcp.mongodb.net:27017,free-cluster-shard-00-02-aqc5h.gcp.mongodb.net:27017/si-social?ssl=true&replicaSet=Free-Cluster-shard-0&authSource=admin&retryWrites=true')

var db = mongoose.connection;

db.on('open', () => {
  console.log(chalk.green('Mongoose is connected'));
  app.emit('ready');
});

// routes

app.use(require(__dirname + '/https-redirect.js')({ httpsPort: app.get('https-port') }));
app.set('trust proxy', true);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// parse application/json
app.use(bodyParser.json());

app.use(session({
  name: 'session',
  secret: secret.session,
  cookie: {
    expires: new Date(2147483647000) // Tue, 19 Jan 2038 03:14:07 GMT
  },
  saveUninitialized: false,
  resave: true
}));

app.use(flash());

// Passport init
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
  usernameField: 'id',
}, function(id, password, done) {
  User.getUserById(id, function(err, user){
    console.log(user);
    if(err) throw err;
    if(!user) return done(null, false, {message: 'Unknown User'});
    User.comparePassword(password, user.password, function(err, isMatch){
      if(err) throw err;
      return isMatch ?
        done(null, user) :
        done(null, false, {message: 'Invalid password'});
    });
  });
}
));

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.getUserBy_id(id, function(err, user) {
    done(err, user);
  });
});

// routes
app.get('/session', (req, res, next) => {
  console.log(req.session);
  res.send('!!!');
});

let token;
let feed = client.feed('group', 'si128');

app.get('/', (req, res, next) => {
  console.log(req.flash('error'))
  token = client.createUserToken('jew');
  feedToken = feed.token; // http://bit.ly/2SDaxFv
  // console.log(req.user);
  res.render('index.ejs', {token, feedToken, user: req.user});
});

app.get('/checkid', (req, res, next) => {
  // console.log(req.query.id);
  User.getUserById(req.query.id, function(err, user){
    if(err) {
      console.log(err);
      return res.json({ err: err });
    }
    res.json({ err: null, exist: !!user });
  });
});

app.post('/post', (req, res, next) => {
  // console.log(req.body);
  if(req.body.activity.actor) feed.addActivity(req.body.activity);
  res.sendStatus(200);
});

// Register User
app.get('/register', (req, res, next) => {
  User.getUserById(req.query.id, function(err, user){
    if(err) {
      console.log(err);
      return res.json({ err: err });
    }
    // res.json({ err: null, exist: !!user });
    if(req.query.id >= 6001000 && req.query.id < 6022999 && !user) res.render('register.ejs', {id: req.query.id});
    else res.status(500).send("{error: \"Invalid ID\"}");
  });
});

app.post('/register', async function(req, res, next){
  try {
    if(req.body.password != req.body.passwordConfirm) return res.status(500).send("{error: \"Passwords don't match\"}").end();
    let newUser = new User({
      id: req.body.id,
      name: req.body.name,
      password: req.body.password,
      chatId: await Chat.generateChatId(req.body.id)
    });

    /* User.createUser(newUser, function(err, user){
      if(err) throw err;
      res.redirect('/');
    }); */
    let user = await User.createUser(newUser)
    // console.log(user);
    await chatkit.createUser({
      id: user.chatId + '',
      name: user.name
    })
    await chatkit.addUsersToRoom({
      roomId: '19390846', // General room
      userIds: [user.chatId + '']
    })
    // console.log(user);
    return res.redirect('/')
  } catch(err) {
    next(err);
  }
});

// Endpoint to login
app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/',
    failureFlash: true
  })
);

// Endpoint to get current user
app.get('/user', function(req, res){
  res.send(req.user);
})

// Endpoint to logout
app.get('/logout', function(req, res){
  req.logout();
  res.send(null);
  console.log(req.user);
});

app.get('/chat', (req, res, next) => {
  // console.log(req.isAuthenticated());
  if(!req.isAuthenticated()) return res.redirect('/');
  res.render('chat.ejs', {user: req.user});
});

app.get('/trigger', (req, res) => {
  pusher.trigger('my-channel', 'my-event', {
    "message": "hello world"
  });
})

app.use(function (err, req, res, next) {
  console.log(err);
  req.flash('error', err);
  return res.redirect('/');
})

// start
app.once('ready', () => {
  app.listen(port, ip, () => console.log(chalk.blue('Server running on http://%s:%s'), ip, port));
});

// export
module.exports = app;