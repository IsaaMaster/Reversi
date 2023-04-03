let static = require('node-static'); 
let http = require('http'); 

let port = process.env.PORT;
let directory = __dirname + '/public'; 

if ((typeof port == 'undefined') || (port ===null)){
    port = 8080; 
    directory ='./public'; 
}

let file = new static.Server(directory); 

let app = http.createServer(
    function(request, response){
        request.addListener('end', 
            function(){
                file.serve(request, response); 
            }
        ).resume()
    }
).listen(port); 



console.log('The server is running')


//Setting up the web socket server

let players = []

const { Server } = require('socket.io');
const io = new Server(app);

io.on('connection', (socket) => {

    function serverlog(...messages){
        io.emit('log', ['**** Message from the server:\n']); 
        messages.forEach((item) => {
            io.emit('log', ['****\t'+item]);
            console.log(item); 
        });
    }

    serverlog('A client has connected to the server: ' + socket.id);



    /*Join room command handler*/
    socket.on('join_room', (payload) => {
       
        /*Check if the payload is valid*/
        if((typeof payload == 'undefined') || (payload === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a payload';
            socket.emit('join_room_response', response);
            serverlog("join_room failed: ", JSON.stringify(response));
            return; 
        }
        let room = payload.room; 
        let username = payload.username;
        if((typeof room == 'undefined') || (room === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a valid room to join';
            socket.emit('join_room_response', response);
            serverlog("join_room failed: ", JSON.stringify(response));
            return; 
        }
        if((typeof username == 'undefined') || (username === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a valid username to join the chat room';
            socket.emit('join_room_response', response);
            serverlog("join_room failed: ", JSON.stringify(response));
            return; 
        }

        /*Handle the room join*/
        socket.join(room); 

        /*Make sure the client was put in the room*/
        io.in(room).fetchSockets().then((sockets) => {
            serverlog('There are '+sockets.length+' clients in the room: '+room);
            if((typeof sockets == 'undefined') || (sockets === null)  || (!sockets.includes(socket))){
                response = {}; 
                response.result = 'fail';
                response.message = 'Server internal error: client was not put in the room';
                socket.emit('join_room_response', response);
                serverlog("join_room failed: ", JSON.stringify(response));
                return; 
            } 
            
            else {
                players[socket.id] = {
                    username: username,
                    room: room
                } 
                 /*Announce to everyone in the room that a new player has joined*/
                for (const member of sockets){
                    response  = {
                        result: 'success', 
                        socket_id: member.id, 
                        room: players[member.id].room,
                        username: players[member.id].username,
                        count: sockets.length
                    }
                    io.of('/').to(room).emit('join_room_response', response);
                    serverlog("join_room succeeded", JSON.stringify(response));
                }   
            }
        });
    });
    
    socket.on('invite', (payload) => {
        serverlog('invite with '+JSON.stringify(payload));
        /*Check if the payload is valid*/
        if((typeof payload == 'undefined') || (payload === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a payload';
            socket.emit('invite_response', response);
            serverlog("invite failed: ", JSON.stringify(response));
            return; 
        }
        let requested_user = payload.requested_user;
        let room = players[socket.id].room; 
        let username = players[socket.id].username;
        if((typeof requested_user == 'undefined') || (requested_user === null) ||(requested_user === "")){
            response = {
                result:'fail', 
                message:'client did not send a valid user to invite to play'
            }
            socket.emit('invite_response', response);
            serverlog("invite command failed: ", JSON.stringify(response));
            return; 
        }

        if((typeof room == 'undefined') || (room === null) ||(room === "")){
            response = {
                result:'fail',
                message:'cannot identify the room the player is in'
            }
            socket.emit('invited_response', response);
            serverlog("invited command failed: ", JSON.stringify(response));
            return; 
        }

        if((typeof username == 'undefined') || (username === null) ||(username === "")){
            response = { 
                result:'fail',
                message:'the user that was inivted does not have a name registered'
            }
            socket.emit('invite_response', response);
            serverlog("invite command failed: ", JSON.stringify(response));
            return; 
        }
        
        

        /*Make sure the invited player is present*/
        io.in(room).allSockets().then((sockets) => {
            if((typeof sockets == 'undefined') || (sockets === null)  || (!sockets.has(requested_user))){
                response = { 
                    result:'fail',
                    message:'the user that was inivted is no longer in the room'
                }; 
                socket.emit('invite_response', response);
                serverlog("invite command failed: ", JSON.stringify(response));
                return;  
            } 
            
            else {
                response = {
                    result: 'success',
                    socket_id: requested_user,
                }
                socket.emit('invite_response', response);
                
                response = {
                    result: 'success',
                    socket_id: socket.id, 
                }  
                socket.to(requested_user).emit('invited', response);
                serverlog("invite successful", JSON.stringify(response));
            }
        });
    });  

    socket.on('uninvite', (payload) => {
        serverlog('uninvite with '+JSON.stringify(payload));
        /*Check if the payload is valid*/
        if((typeof payload == 'undefined') || (payload === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a payload';
            socket.emit('uninvited', response);
            serverlog("uninvite command failed: ", JSON.stringify(response));
            return; 
        }
        let requested_user = payload.requested_user;
        let room = players[socket.id].room; 
        let username = players[socket.id].username;
        if((typeof requested_user == 'undefined') || (requested_user === null) ||(requested_user === "")){
            response = {
                result:'fail', 
                message:'client did not send a valid user to uninvite'
            }
            socket.emit('uninvited', response);
            serverlog("uninvite command failed: ", JSON.stringify(response));
            return; 
        }

        if((typeof room == 'undefined') || (room === null) ||(room === "")){
            response = {
                result:'fail',
                message:'cannot identify the room the player is in'
            }
            socket.emit('uninvited', response);
            serverlog("uninvited command failed: ", JSON.stringify(response));
            return; 
        }

        if((typeof username == 'undefined') || (username === null) ||(username === "")){
            response = { 
                result:'fail',
                message:'the user that was uninivted does not have a name registered'
            }
            socket.emit('uninvited', response);
            serverlog("uninvite command failed: ", JSON.stringify(response));
            return; 
        }
        
        

        /*Make sure the uninvited player is present*/
        io.in(room).allSockets().then((sockets) => {
            if((typeof sockets == 'undefined') || (sockets === null)  || (!sockets.has(requested_user))){
                response = { 
                    result:'fail',
                    message:'the user that was uninivted is no longer in the room'
                }; 
                socket.emit('uninvited', response);
                serverlog("invite command failed: ", JSON.stringify(response));
                return;  
            } 
            
            else {
                response = {
                    result: 'success',
                    socket_id: requested_user,
                }
                socket.emit('uninvited', response);
                
                response = {
                    result: 'success',
                    socket_id: socket.id, 
                }  
                socket.to(requested_user).emit('uninvited', response);
                serverlog("uninvite successful", JSON.stringify(response));
            }
        });
    });  


    socket.on('disconnect', () => {
        serverlog('A client has disconnected from the server: ' + socket.id);
        if((typeof players[socket.id] != 'undefined') && (players[socket.id] != null)){
            let payload = {
                username: players[socket.id].username,
                room: players[socket.id].room,
                count: Object.keys(players).length-1,  
                socket_id: socket.id
            }
            let room = players[socket.id].room;
            delete players[socket.id];
            /*Let everyone know that the player has left the room*/
            
            io.of('/').to(room).emit('player_disconnected', payload);
            serverlog('Player disconnected successful: '+JSON.stringify(payload)); 
        
        }
    
    
    }); 
    

    socket.on('send_chat_message', (payload) => {
        serverlog('Server received a command', 'send_chat_message', JSON.stringify(payload));
        /*Check if the payload is valid*/
        if((typeof payload == 'undefined') || (payload === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a payload';
            socket.emit('send_chat_response', response);
            serverlog("send_char failed: ", JSON.stringify(response));
            return; 
        }
        let room = payload.room; 
        let username = payload.username;
        let message  = payload.message;
        if((typeof room == 'undefined') || (room === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a valid room to message';
            socket.emit('send_chat_response', response);
            serverlog("send_char failed: ", JSON.stringify(response));
            return; 
        }
        if((typeof username == 'undefined') || (username === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a valid username to message the chat room';
            socket.emit('send_chat_response', response);
            serverlog("send_chat failed: ", JSON.stringify(response));
            return; 
        }
        if((typeof message == 'undefined') || (message === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a valid message to message the chat room';
            socket.emit('send_chat_response', response);
            serverlog("send_chat failed: ", JSON.stringify(response));
            return; 
        } 

        /*Handle the message*/
        response = {};
        response.result = 'success';
        response.username = username;
        response.room = room;
        response.message = message;
        response.socket_id = socket.id;
        /*Send the message to the room*/
        io.of('/').to(room).emit('send_chat_message', response);
        serverlog("send_chat succeeded", JSON.stringify(response));
        
    });  

     

}); 
