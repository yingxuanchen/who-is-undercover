const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const compression = require("compression");
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const gameRoutes = require('./routes/game');
const mongoConnect = require('./util/database').mongoConnect;

require('dotenv').config();

const store = new MongoDBStore({
  uri: process.env.MONGO_CONNECTION_STRING,
  collection: 'sessions',
  expires: 86400000
});

// serve up production assets
app.use(express.static('client/build'));

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({
  secret: 'undercover', 
  resave: false, 
  saveUninitialized: false, 
  cookie: {HttpOnly: true}, 
  store: store
}));

app.use(gameRoutes);

// let the react app to handle any unknown routes 
// serve up the index.html if express doesn't recognize the route
const path = require('path');
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
});

// if not in production use the port 5000
const PORT = process.env.PORT || 5000;

mongoConnect(() => {
  const server = app.listen(PORT, () => {
    console.log('Server is running at http://localhost:', PORT);
  });
  
  const io = require('./socket').init(server);
  io.on('connection', socket => {
    console.log('Client connected: ' + socket.id);
  });
});