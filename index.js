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

ioMon.on('connection', function(socket){
    //
    console.log('a monitoring user connected!');

    //alive signal for the connection - every 0.5 sec
    var rollcnt = 0;
    var id_rollcnt = setInterval(function() {
	socket.emit('rollcnt', {'rollcnt': rollcnt});
	rollcnt++;
    }, 500);

    //report seat using stat - every 4 sec
    var id_seats_report = setInterval(function() {
	socket.emit('seatstat', {'seatstat': seats });
	// console.log(seats);
    }, 1000);

    //
    socket.on('disconnect', function(){
    	console.log('monitoring user disconnected');
	clearInterval(id_rollcnt);
	clearInterval(id_seats_report);
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

    // //simple all play & stop (example)
    // socket.on('playall-start', function(msg){
    // 	console.log('playall-start: ' + msg);
    // 	io.emit('playall-start', msg); //broadcast
    // });
    
    // socket.on('playall-stop', function(msg){
    // 	console.log('playall-stop: ' + msg);
    // 	io.emit('playall-stop', msg); //broadcast
    // });

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

// //// osc.js/udp service
// var osc = require("osc");

// var udp_sc = new osc.UDPPort({
//     localAddress: "0.0.0.0",
//     localPort: 52000,
//     metadata: true
// });
// //message handler
// udp_sc.on("message", function (oscmsg, timetag, info) {
//     console.log("[mc] get a osc message:", oscmsg);

//     //alive handshaking
//     udp_sc.send({
//         address: "/mc_t",
//         args: [ {} ]
//     });
    
// });
// //open port
// udp_sc.open();
// udp_sc.on("ready", function() {
//     console.log("[udp] port opend & ready - 0.0.0.0:", udp_sc.options.localPort);
// });
