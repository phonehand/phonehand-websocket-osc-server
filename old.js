//
// this is a node.js server
// 

// use both socket.io & osc.js

// socket.io for web-browser clients. (mobile & pc clients)
// osc.js/udp for mobmuplat client. (mobile client)

////common lib
var express = require('express');
var http = require('http');

//// socket.io service
var ioApp = express();
var ioServer = http.Server(ioApp);
var io = require('socket.io')(ioServer);

io.on('connection', function(socket){

    //connection monitoring
    console.log('a user connected');
    socket.on('disconnect', function(){
	console.log('user disconnected');
    });

    //message routing
    socket.on('msg-playstart', function(msg){
	console.log('message: ' + msg);
	io.emit('msg-playstart', msg);
    });
    
    socket.on('msg-playstop', function(msg){
	console.log('message: ' + msg);
	io.emit('msg-playstop', msg);
    });
});

ioServer.listen(3000, function(){
    console.log('[socket.io] listening on *:5000');
});


//// osc.js/udp service
var osc = require("osc");
var http = require("http");
var ws = require("ws");

// there are 3 actors.
// (1) monitoring client (mc)
// (2) singer client (sc)
// (3) instrument client (ic)

// they will connect to different ports
// (1) mc : 5100 (tcp/websocket)
// (2) sc : 52000 (udp)
// (3) ic : 5300 (tcp/websocket)


//shared global
var seats = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]





//// (1) mc ////


var mc_wss = new ws.Server({ server: express().listen(5100) });

mc_wss.on("connection", function (socket) {
    //websocket connection checking.
    console.log('[mc] a user connected!');

    //prepare osc socket.
    var osc_sckt = new osc.WebSocketPort({
        socket: socket,
        metadata: true
    });

    var rollcnt = 0;
    var rcid = setInterval(function () {
	if (socket.readyState === ws.OPEN) {
	    //rolling counter..
	    //websocket heartbeat : e.g. "wait 4 sec. and send heartbeat msg. and wait 4 sec again. the client will know if it is connected or not."
	    //node ws has 'ping'/'pong' msg. and 'onping'/'onpong' event handlers.. but i cannot get how to use them properly. so next time!
	    //instead of heartheating. --> some fast changing number!
	    osc_sckt.send({
	    	address: "/rollcnt",
	    	args: [{ type: "f", value: rollcnt }]
	    });
	    rollcnt++;
	    rollcnt = rollcnt % 20; // 10 sec (1 tick == 0.5 sec)

	    //seats status msg.
	    for (var i = 0; i < 30; i++)
	    {
		osc_sckt.send({
	    	    address: "/seats",
		    args: [{ type: "i", value: i }, {type: "i", value: seats[i] }]
		});
	    }
	}
	else {
	    clearInterval(rcid);
	}
    }, 500); // every 0.5 sec : periodic msg. loop

    //osc receive/send handler
    osc_sckt.on("message", function (oscMsg) {
        console.log("[mc/ws] an osc message -", oscMsg);
    });
});





//// (2) sc ////


var udp_sc = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 52000,
    metadata: true
});
//message handler
udp_sc.on("message", function (oscmsg, timetag, info) {
    console.log("[mc] get a osc message:", oscmsg);

    //alive handshaking
    udp_sc.send({
        address: "/mc_t",
        args: [ {} ]
    });
    
});
//open port
udp_sc.open();
udp_sc.on("ready", function() { console.log("[sc:singer-client] port open and ready to communicate - 0.0.0.0:", udp_sc.options.localPort); });





//// (3) ic ////

var ic_wss = new ws.Server({ server: express().listen(5300) });

ic_wss.on("connection", function (socket) {
    //websocket connection checking.
    console.log('[ic] a user connected!');

    //prepare osc socket.
    var osc_sckt = new osc.WebSocketPort({
        socket: socket,
        metadata: true
    });

    //properties of this connection
    var occupied_pos = -1; // none. (on init)

    //websocket heartbeat : e.g. "wait 4 sec. and send heartbeat msg. and wait 4 sec again. the client will know if it is connected or not."
    //node ws has 'ping'/'pong' msg. and 'onping'/'onpong' event handlers.. but i cannot get how to use them properly. so next time!
    //instead of heartheating. --> some fast changing number!
    var rollcnt = 0;
    var rcid = setInterval(function () {
	if (socket.readyState === ws.OPEN) {
	    osc_sckt.send({
		address: "/rollcnt",
		args: [{ type: "f", value: rollcnt }]
	    });
	    rollcnt++;
	    rollcnt = rollcnt % 20; // 10 sec (1 tick == 0.5 sec)
	}
	else {
	    //if connection lost, we should not send anymore!!
	    clearInterval(rcid);

	    //has this user ever occupied any seat?
	    if (occupied_pos != -1) {
		if (seats[occupied_pos] == 1) {
		    //release the seat before you leave!
		    seats[occupied_pos] = 0;
		}
		else {
		    //strange. someone else took my seat?? how??
		    console.log("strange. someone else took my seat?? how??" + occupied_pos);
		}
	    }
	}
    }, 500); // every 0.5 sec

    //osc receiving
    osc_sckt.on("message", function (oscMsg) {
        console.log("[ic/ws] got a new osc message -", oscMsg);

	//occupy seat msg.
	if (oscMsg.address == "/occupy") {
	    if (seats[oscMsg.args[0].value] == 1) {
		console.log("[ic/ws] error! sorry, that seat is already occupied!");
	    }
	    else {
		if (occupied_pos != -1) { console.log("[ic/ws] warning. you had a seat already. will be left open after you moving out!"); }
		seats[oscMsg.args[0].value] = 1; // occupy (new) pos
		if (occupied_pos != -1) { seats[occupied_pos] = 0; } // release old pos
		occupied_pos = oscMsg.args[0].value; // update my oc pos value
		console.log("[ic/ws] occupy, success." + occupied_pos);
	    }
	}
    });
});
