// Initial Code from: http://www.steves-internet-guide.com/using-node-mqtt-client/
// 2021-01-07 Add express
// 2021-01-08 Add Mongoose, session login/logout, 
//              PM2, Bootstrap4
// 2021-01-09 Add gauge https://github.com/toorshia/justgage
//                chart https://canvasjs.com/jquery-charts/line-chart/
//                datepicker https://gijgo.com/datepicker/example/bootstrap-4

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
    date: Date
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

// Set up & Connect MQTT server
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

// Handle incoming messages
const maxRoomNumber = 2;
var roomData = [];
for (i = 0; i < maxRoomNumber; i++){
    roomData.push({
        temperature: '',
        humidity: '',
        brightness: '',
        ledState: '',
    });
}

client.on('message',function(topic, message, packet){
	console.log('message is ' + message);
    console.log('topic is ' + topic);

    for (i = 0; i < maxRoomNumber; i++){
        var topics = topic.toString().split('/');
        if (topics[1] == 'room'.concat(i+1)){
            if (topics[2] == 'temperature'){
                roomData[i].temperature = message.toString();
            }
            if (topics[2] == 'humidity'){
                roomData[i].humidity = message.toString();
            }
            if (topics[2] == 'brightness'){
                roomData[i].brightness = message.toString();
            }
            if (topics[2] == 'ledState'){
                roomData[i].ledState = message.toString();
            }
        }
    }

    // Create an object for the model MqttMsg
    var mqttMsg = new MqttMsg();
    mqttMsg.topic = topic;
    mqttMsg.value = message.toString();
    mqttMsg.date = new Date();
    // Save the MqttMsg to MongoDB
    mqttMsg.save().then(function(){
        console.log('New mqttMsg created');
    });
});

client.on("connect",function(){	
    console.log("connected  "+ client.connected);
});

// Handle errors
client.on("error",function(error){
    console.log("Can't connect" + error);
    process.exit(1)
});

console.log("subscribing to topics");
for (var i = 0; i < maxRoomNumber; i++){
    client.subscribe(`home/room${i+1}/temperature`, {qos:1});
    client.subscribe(`home/room${i+1}/humidity`, {qos:1});
    client.subscribe(`home/room${i+1}/brightness`, {qos:1});
    client.subscribe(`home/room${i+1}/ledState`, {qos:1});
}

// var topic_list=[
//     'home/room1/temperature',
//     'home/room1/humidity',
//     'home/room1/brightness',
//     'home/room1/ledState',
//     'home/room2/temperature',
//     'home/room2/humidity',
//     'home/room2/brightness',
//     'home/room2/ledState'
// ];
// client.subscribe(topic_list,{qos:1}); //topic list
//var topic_o={"topic22":0,"topic33":1,"topic44":1};
//client.subscribe(topic_o); //object
//notice this is printed even before we connect
console.log("end of script");

// Set up Route
// Login page
var redirectPage = '/';

myApp.get('/login', function(req, res){
    res.render('login');
});

myApp.post('/login', function(req, res){
    var user = req.body.username;
    var pass = req.body.password;

    Admin.findOne({username: user, password: pass}).exec(function(err, admin){
        // Log erros
        console.log('Error: ' + err);
        console.log('Admin: ' + admin);
        if (admin) {
            // Store username in session and set logged in true
            req.session.username = admin.username;
            req.session.userLoggedIn = true;
            // Redirect to the dashboard
            res.redirect(redirectPage);
        }
        else {
            res.render('login', {error: 'Check username or password!'});
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
        redirectPage = '/';
        res.redirect('/login');
    }
});

// Chart page
myApp.get('/chart', function(req, res){
    // check if the user is logged in
    if (req.session.userLoggedIn){
        res.render('chart', {roomData: roomData});
    } else {
        redirectPage = '/chart';
        res.redirect('/login');
    }
});

// Ajax for roomDate
myApp.get('/roomData', function(req, res){
    if (req.session.userLoggedIn){
        res.send({roomData: roomData});
    }
});

// Ajax for temperature on the selected date
myApp.post('/temperature', function(req, res){
    if (req.session.userLoggedIn){
        var localDate = new Date(req.body.date);
        var year = localDate.getFullYear();
        var month = localDate.getMonth();
        var day = localDate.getDate();
        var startTime = new Date(year, month, day, 0, 0, 0);
        var endTime = new Date(year, month, day, 23, 59, 59);
        MqttMsg.find({"date": {'$gte': startTime, '$lte': endTime}}).exec(function(err, mqttMsgs){
            var topics;
            var tempMsgs = [];
            for (var i = 0; i < mqttMsgs.length; i++){
                topics = mqttMsgs[i].topic.split('/');
                if (topics[2] == 'temperature'){
                    tempMsgs.push(mqttMsgs[i]);
                }
            }
            res.send({tempMsgs: tempMsgs});
        });
    }
});

// Toggle Led
var mqttOptions = {
    retain:true,
    qos:1
};

myApp.post('/led', function(req, res){
    var message='';

    if (req.session.userLoggedIn){
        var id = parseInt(req.body.id);
        if (id > 0 && id <= maxRoomNumber) {
            if (roomData[id-1].ledState == '1'){
                message = '0';
            } else {
                message = '1';
            }
            if (client.connected == true){
                client.publish(`home/room${id}/led`,message,mqttOptions);
                console.log("publishing", `home/room${id}/led/${message}`);
            }
        }
    }
});

// Start the server and listen at a port
myApp.listen(8080);
console.log('Website at port 8080 was running.');