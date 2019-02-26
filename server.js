const path = require('path');
const cookieSession = require('cookie-session');
const express = require('express');
const app = express();
const secret = require(__dirname + '/secret.json');
const bodyParser = require('body-parser');

var stream = require('getstream');
// Instantiate a new client (server side)
client = stream.connect('sj5sb9224r84', secret.getstream, '47981');
// Instantiate a new client (client side)
// client = stream.connect('sj5sb9224r84', null, '47981');

app.engine('html', require('ejs').renderFile);

const port = process.env.PORT || 8080, ip = process.env.IP || '0.0.0.0';

// routes

app.use(require(__dirname + '/https-redirect.js')({httpsPort: app.get('https-port')}));
app.set('trust proxy', true);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse application/json
app.use(bodyParser.json());

app.use(cookieSession({
  name: 'session',
  secret: secret.session,
  maxAge: new Date(2147483647000) // Tue, 19 Jan 2038 03:14:07 GMT
}));

let token;
let feed = client.feed('group', 'si128');

app.get('/', (req, res, next) => {
  token = client.createUserToken('jew');
  feedToken = feed.token; // http://bit.ly/2SDaxFv
  res.render('index.ejs', {token, feedToken});
});

app.post('/post', (req, res, next) => {
  console.log(req.body);
  feed.addActivity(req.body.activity);
  res.sendStatus(200);
});

// start
app.listen(port, ip, () => console.log('Server running on http://%s:%s', ip, port));

// export
module.exports = app;