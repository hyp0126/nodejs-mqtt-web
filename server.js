// Initial Code from: http://www.steves-internet-guide.com/using-node-mqtt-client/
// 2021-01-07 Add express
// 2021-01-08 Add Mongoose, session login/logout, Bootstrap4

dotenv = require('dotenv');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

dotenv.config({ path: '.env' });
dotenv.config();

// Get express session
const session = require('express-session');

// Set up DB connection
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI,{
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Set up the model for the mqtt message
const MqttMsg = mongoose.model('MqttMsg', {
    topic: String,
    value: String,
});

// Set up the model for admin
const Admin = mongoose.model('Admin', {
    username: String,
    password: String
});

// Set up variables to use package
myApp = express();

// Set up path and public folders and view folders
myApp.set('views', path.join(__dirname, 'views'));

// Use public folders for CSS etc.
myApp.use(express.static(__dirname + '/public'));
myApp.set('view engine', 'ejs');
myApp.use(bodyParser.urlencoded({extended: false}));

// Set up session 
myApp.use(session({
    secret: 'superrandomsecret',
    resave: false,
    saveUninitialized: true
}));

// Set up MQTT
var mqtt = require('mqtt');
const fs = require('fs');
var caFile = fs.readFileSync(process.env.CA_FILE);

var count = 0;
var options={
    clientId: 'nodejs-mqtt-web-01',
    rejectUnauthorized : false,
    ca:caFile, 
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clean:true
};

var client  = mqtt.connect(process.env.MQTT_SERVER_URI, options);
console.log("connected flag  " + client.connected);

//handle incoming messages
var roomData = {
    temperature: '',
    humidity: '',
    brightness: '',
    ledState: '',
}

client.on('message',function(topic, message, packet){
	console.log('message is ' + message);
    console.log('topic is ' + topic);

    temperature = topic.toString() + '/' + message.toString();
    if (topic.toString() == 'home/room1/temperature'){
        roomData.temperature = message.toString();
    }
    if (topic.toString() == 'home/room1/humidity'){
        roomData.humidity = message.toString();
    }
    if (topic.toString() == 'home/room1/brightness'){
        roomData.brightness = message.toString();
    }
    if (topic.toString() == 'home/room1/ledState'){
        roomData.ledState = message.toString();
    }
    // Create an object for the model MqttMsg
    var mqttMsg = new MqttMsg();
    mqttMsg.topic = topic.toString();
    mqttMsg.value = message.toString();
    //save the order
    mqttMsg.save().then(function(){
        console.log('New mqttMsg created');
    });
});

client.on("connect",function(){	
    console.log("connected  "+ client.connected);
});

//handle errors
client.on("error",function(error){
    console.log("Can't connect" + error);
    process.exit(1)
});

var topic_list=[
    'home/room1/temperature',
    'home/room1/humidity',
    'home/room1/brightness',
    'home/room1/ledState'
];

//var topic_o={"topic22":0,"topic33":1,"topic44":1};
console.log("subscribing to topics");
//client.subscribe(topic,{qos:1}); //single topic
client.subscribe(topic_list,{qos:1}); //topic list
//client.subscribe(topic_o); //object

//var timer_id=setInterval(function(){publish(topic,message,options);},5000);
//notice this is printed even before we connect
console.log("end of script");

// Set up Route
// Login page
myApp.get('/login', function(req, res){
    res.render('login');
});

myApp.post('/login', function(req, res){
    var user = req.body.username;
    var pass = req.body.password;

    Admin.findOne({username: user, password: pass}).exec(function(err, admin){
        // log erros
        console.log('Error: ' + err);
        console.log('Admin: ' + admin);
        if (admin) {
            // store username in session and set logged in true
            req.session.username = admin.username;
            req.session.userLoggedIn = true;
            // redirect to the dashboard
            res.redirect('/');
        }
        else {
            res.render('login', {error: 'sorry, cannot login!'});
        }
    });
});

// Logout
myApp.get('/logout', function(req, res){
    req.session.username = "";
    req.session.userLoggedIn = false;
    res.render('login', {error: 'Sucessfully logged out'});
});

// Home page
myApp.get('/', function(req, res){
    // check if the user is logged in
    if (req.session.userLoggedIn){
        res.render('home', {roomData: roomData});
    } else {
        res.redirect('/login');
    }
});

// Ajax for room1
myApp.get('/roomData', function(req, res){
    res.send({roomData: roomData});
});

// toggleLed
var mqttOptions = {
    retain:true,
    qos:1
};
var topic='home/room1/led';
var message='';
myApp.get('/led', function(req, res){
    if (roomData.ledState == '1'){
        message = '0';
    } else {
        message = '1';
    }
    if (client.connected == true){
        client.publish(topic,message,mqttOptions);
        console.log("publishing",topic + '/' + message);
    }
});

// Start the server and listen at a port
myApp.listen(8080);
console.log('Website at port 8080 was running.');