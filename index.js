//
// this is a node.js server
// 

// uses both socket.io & osc.js

// socket.io for web-browser clients. (mobile & pc clients)
// osc.js/udp for mobmuplat client. (mobile client)

////common lib
var express = require('express');
var http = require('http');

//// socket.io service - for Instruments clients (:5100)
var ioInstApp = express();
var ioInstServer = http.Server(ioInstApp);
var ioInst = require('socket.io')(ioInstServer);

//// socket.io service - for Monitoring client (:5300)
var ioMonApp = express();
var ioMonServer = http.Server(ioMonApp);
var ioMon = require('socket.io')(ioMonServer);

////shared
var seats = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var actstage = 0;

ioMon.on('connection', function(socket){
    //
    console.log('a monitoring user connected!');

    //periodically report server stat.
    var rollcnt = 0;
    var stat_reporter = setInterval(function() {
	rollcnt++;
	socket.emit('stat', {
	    'rollcnt': rollcnt,
	    'seats': seats,
	    'actstage': actstage
	});
    }, 1000);
    
    //clap-all
    socket.on('clap-all', function() {
	console.log('clap-all');
	ioInst.emit('clap');
    });

    //54321-all
    socket.on('54321-all', function() {
	console.log('54321-all');
	ioInst.emit('54321');
    });

    //pagechg
    socket.on('pagechg', function(msg) {
	console.log('pagechg: ' + msg);
	actstage = msg;
    	ioInst.emit('pagechg', msg); //broadcast
    });

    //play all! (sound#)
    socket.on('playall-start', function(msg){
    	console.log('playall-start: ' + msg);
    	ioInst.emit('playall-start', msg); //broadcast
    });
    
    //stop all! (sound#)
    socket.on('playall-stop', function(msg){
    	console.log('playall-stop: ' + msg);
    	ioInst.emit('playall-stop', msg); //broadcast
    });

    //
    socket.on('disconnect', function(){
    	console.log('monitoring user disconnected');
	clearInterval(stat_reporter);
    });
});

ioInst.on('connection', function(socket){

    //
    console.log('a instrument user connected');
    
    //
    var seatNo = -1;
    socket.on('seatsel', function(msg){
	console.log('got message seatsel : ' + msg);
	console.log('which means seat# : ' + (msg+1));
	seats[msg] = 1; // we won't care colliding selections.
	seatNo = msg; // remember for later!
    });

    //
    socket.on('disconnect', function(){
    	console.log('instrument user disconnected');
	// clear the flag : again, we won't care colliding selections!
	if (seatNo != -1) {
	    seats[seatNo] = 0;
	}
    });
});

ioInstServer.listen(5100, function(){
    console.log('[socket.io] listening on *:5100');
});

ioMonServer.listen(5300, function(){
    console.log('[socket.io] listening on *:5300');
});

//// osc.js/udp service
var osc = require("osc");

var udp_sc = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 52000,
    metadata: true
});

//message handler
udp_sc.on("message", function (oscmsg, timetag, info) {
    console.log("[udp] got osc message:", oscmsg);

    //EX)
    // //method [1] : just relay as a whole
    // ioInst.emit('osc-msg', oscmsg); //broadcast

    //EX)
    // //method [2] : each fields
    // ioInst.emit('osc-address', oscmsg.address); //broadcast
    // ioInst.emit('osc-type', oscmsg.type); //broadcast
    // ioInst.emit('osc-args', oscmsg.args); //broadcast
    // ioInst.emit('osc-value0', oscmsg.args[0].value); //broadcast

    //just grab i need.. note!
    ioInst.emit('sing-note', oscmsg.address); //broadcast
});
//open port
udp_sc.open();
udp_sc.on("ready", function() {
    console.log("[udp] ready... - 0.0.0.0:", udp_sc.options.localPort);
});
