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

    socket.on('disconnect', () => {
        serverlog('A client has disconnected from the server: ' + socket.id);
    }); 

    /*Join room command handler*/
    socket.on('join_room', (payload) => {
        serverlog('Server received a command', 'join_room', JSON.stringify(payload));
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
            } else {
                response = {};
                response.result = 'success';
                response.room = room;
                response.username = username; 
                response.count = sockets.length;

                io.of('/').to(room).emit('join_room_response', response);
                serverlog("join_room succeeded", JSON.stringify(response));
            }
        });
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
        /*Send the message to the room*/
        io.of('/').to(room).emit('send_chat_message', response);
        serverlog("send_chat succeeded", JSON.stringify(response));
       
    });  

}); 
