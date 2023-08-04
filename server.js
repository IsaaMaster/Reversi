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
const { log } = require('console');
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

                ///new message for game 
                    
                    if(room !== "Lobby"){
                        send_game_update(socket, room, 'initial update'); 
                    }
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

    socket.on('game_start', (payload) => {
        serverlog('uninvite with '+JSON.stringify(payload));
        /*Check if the payload is valid*/
        if((typeof payload == 'undefined') || (payload === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a payload';
            socket.emit('game_start_response', response);
            serverlog("game_start command failed: ", JSON.stringify(response));
            return; 
        }
        let requested_user = payload.requested_user;
        let room = players[socket.id].room; 
        let username = players[socket.id].username;
        if((typeof requested_user == 'undefined') || (requested_user === null) ||(requested_user === "")){
            response = {
                result:'fail', 
                message:'client did not send a valid user to play'
            }
            socket.emit('game_start_response', response);
            serverlog("game_start_response command failed: ", JSON.stringify(response));
            return; 
        }

        if((typeof room == 'undefined') || (room === null) ||(room === "")){
            response = {
                result:'fail',
                message:'cannot identify the room the player is in'
            }
            socket.emit('game_start_response', response);
            serverlog("gamestart command failed: ", JSON.stringify(response));
            return; 
        }

        if((typeof username == 'undefined') || (username === null) ||(username === "")){
            response = { 
                result:'fail',
                message:'the user that was going to be played does not have a name registered'
            }
            socket.emit('game_start_response', response);
            serverlog("uninvite command failed: ", JSON.stringify(response));
            return; 
        }
        
        

        /*Make sure the player challenged is present*/
        io.in(room).allSockets().then((sockets) => {
            if((typeof sockets == 'undefined') || (sockets === null)  || (!sockets.has(requested_user))){
                response = { 
                    result:'fail',
                    message:'the user that was uninivted is no longer in the room'
                }; 
                socket.emit('game_start_response', response);
                serverlog("game start command failed: ", JSON.stringify(response));
                return;  
            } 
            //engages in a reversi match
            else {
                let game_id = Math.floor((1+Math.random())*0x10000).toString(16);
                response = {
                    result: 'success',
                    game_id: game_id,
                    socket_id: requested_user,
                }
                socket.emit('game_start_response', response);
                
                response = {
                    result: 'success',
                    game_id: game_id,
                    socket_id: socket.id, 
                }  
                socket.to(requested_user).emit('game_start_response', response);
                serverlog("game started successfully", JSON.stringify(response));
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


    socket.on('play_token', (payload) => {
        serverlog('Server received a command', 'play_token', JSON.stringify(payload));
        /*Check if the payload is valid*/
        if((typeof payload == 'undefined') || (payload === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a payload';
            socket.emit('play_token_response', response);
            serverlog("play_token failed: ", JSON.stringify(response));
            return; 
        }

        let player = players[socket.id];
        if((typeof player == 'undefined') || (player === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'player_token came from an unregisetered player';
            socket.emit('play_token_response', response);
            serverlog("play_token failed: ", JSON.stringify(response));
            return; 
        }
        let username = player.username; 
        if((typeof username == 'undefined') || (username === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a valid username to message the game';
            socket.emit('play_token_response', response);
            serverlog("play_token failed: ", JSON.stringify(response));
            return; 
        }
        let game_id = player.room; 
        if((typeof game_id == 'undefined') || (game_id === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a valid message to message the game';
            socket.emit('play_token_response', response);
            serverlog("play_token failed: ", JSON.stringify(response));
            return; 
        } 

        let row = payload.row; 
        if((typeof row == 'undefined') || (row === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a valid row to the game';
            socket.emit('play_token_response', response);
            serverlog("play_token failed: ", JSON.stringify(response));
            return; 
        } 

        let col = payload.column; 
        if((typeof col == 'undefined') || (col === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a valid column to the game';
            socket.emit('play_token_response', response);
            serverlog("play_token failed: ", JSON.stringify(response));
            return; 
        } 
        let color = payload.color; 
        if((typeof color == 'undefined') || (color === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a valid token color for the game';
            socket.emit('play_token_response', response);
            serverlog("play_token failed: ", JSON.stringify(response));
            return; 
        } 

        let game = games[game_id]; 
        if((typeof game == 'undefined') || (game === null)){
            response = {}; 
            response.result = 'fail';
            response.message = 'client did not send a valid game for the the game';
            socket.emit('play_token_response', response);
            serverlog("play_token failed: ", JSON.stringify(response));
            return; 
        } 

        /*Make sure the current attempt is the correct*/
        if(color !== game.whose_turn){
            let response = {
                result: 'fail',
                message: 'playtoken, played the wrong color'
            }; 
            socket.emit('play_token_response', response);
            serverlog('play_token failed: ', JSON.stringify(response));
            return; 
        }

        if(
            ((game.whose_turn  === 'white') && (game.player_white.socket != socket.id)) ||
            ((game.whose_turn  === 'black') && (game.player_black.socket != socket.id))
        ){
            let response = {
                result: 'fail', 
                message: 'wrong user playing the token'
            }; 
            socket.emit('play_token_response', response);
            serverlog('play_token failed: ', JSON.stringify(response));
            return; 
        }


        response = {
            result: 'success',   
        }
        socket.emit('play_token_response', response);

        if(color === 'white'){
            game.board[row][col] = 'w'; 
            filp_tokens('w', row, col, game.board); 
            game.whose_turn = 'black'; 
            game.legal_moves = calculate_legal_moves('b', game.board);
        }   
        else if(color === 'black'){
            game.board[row][col] = 'b'; 
            filp_tokens('b', row, col, game.board); 
            game.whose_turn = 'white'; 
            game.legal_moves = calculate_legal_moves('w', game.board); 
        }

        /*Add somethng later for handling when a player can't play */

        let d = new Date();
        game.last_move_time = d.getTime();

        send_game_update(socket, game_id, 'played a token');
       
        
    }); 
    
    



     

}); 



/*** ***
 * Code related to game state
*/

let games =[]; 
function create_new_game(){
    let new_game = {}; 
    new_game.player_white = {}; 
    new_game.player_white.socket = ""
    new_game.player_white.username = ""; 
    new_game.player_black = {};
    new_game.player_black.socket = ""
    new_game.player_black.username = ""; 

    var d = new Date();
    new_game.last_move_time = d.getTime();

    new_game.whose_turn  = "black"; 

    new_game.board = [
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', 'w', 'b', ' ', ' ', ' '],
        [' ', ' ', ' ', 'b', 'w', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
    ]

    new_game.legal_moves = calculate_legal_moves('b', new_game.board);
    console.log(new_game.legal_moves) 

    return new_game;


}
function check_line_match(color, dr, dc, r, c, board){
    if (board[r][c] === color){
        return true; 
    }
    if (board[r][c] === ' '){
        return false; 
    }
    /*Check to make sure that the square is on the board*/
    if((r+dr<0) || (r + dr>7)){
        return false; 
    }
    if((c+dc<0) || (c + dc>7)) {
        return false
    }

    return(check_line_match(color, dr, dc, r+dr, c+dc, board)); 

}


/*Returns true if r + dr supports playing at row r and col c in the direction of dr and dc*/
function adjacent_support(who, dr, dc, r, c, board){
    let other; 
    if (who  === 'b'){
        other = 'w'; 
    } 
    else if (who === 'w'){
        other = 'b'; 
    } else{
        log("Houston we have a problem:" + who);
        return false; 
    }

    /*Check to make sure that the adjacent support is on the board*/
    if((r+dr<0) || (r + dr>7)){
        return false; 
    }
    if((c+dc<0) || (c + dc>7)) {
        return false
    }

    /*Check to make sure there is space for the square of the same color*/
    if(board[r+dr][c+dc] !== other){
        return false; 
    }

    if((r+dr+dr<0) || (r + dr + dr > 7)){
        return false; 
    }
    if((c+dc+dc<0) || (c + dc + dc > 7)) {
        return false; 
    }


    return check_line_match(who, dr, dc, r+dr+dr, c+dc+dc, board);
}


function calculate_legal_moves(who, board){
    let legal_moves = [
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
    ]

    for(let row = 0; row < 8; row++){
        for (let col = 0; col < 8; col++){
            if(legal_moves[row][col] === ' '){
                nw = adjacent_support(who, -1, -1, row, col, board);
                ne = adjacent_support(who, -1,  1, row, col, board);
                nn = adjacent_support(who, -1, 0, row, col, board); 
                
                ss = adjacent_support(who, 1,  0, row, col, board);
                sw = adjacent_support(who, 1, -1, row, col, board);
                se = adjacent_support(who, 1, 1, row, col, board); 

                ww = adjacent_support(who, 0, -1, row, col, board); 
                ee = adjacent_support(who, 0,  1, row, col, board); 
                
                //console.log(nw || ne || nn || ss || sw || se || ww || ee); 
                if(nw || ne || nn || ss || sw || se || ww || ee){
                    legal_moves[row][col] = who; 
                }
            }
        }
    }
    return legal_moves; 
}

function flip_line(who, dr, dc, r, c, board){
    if((r+dr<0) || (r + dr>7)){
        return false; 
    }
    if((c+dc<0) || (c + dc>7)) {
        return false; 
    }

    /*Check to make sure there is space for the square of the same color*/
    if(board[r+dr][c+dc] ===  ' '){
        return false; 
    }
    if(board[r+dr][c+dc] ===  who){
        return true; 
    }
    else {
        if(flip_line(who, dr, dc, r+dr, c+dc, board)){
            board[r+dr][c+dc] = who; 
            return true; 
        } else{
            return false; 
        }
    }

}

function filp_tokens(who, row, col, board){
    flip_line(who, -1, -1, row, col, board);
    flip_line(who, -1,  1, row, col, board);
    flip_line(who, -1, 0, row, col, board); 
    
    flip_line(who, 1,  0, row, col, board);
    flip_line(who, 1, -1, row, col, board);
    flip_line(who, 1, 1, row, col, board); 

    flip_line(who, 0, -1, row, col, board); 
    flip_line(who, 0,  1, row, col, board); 
}



function send_game_update(socket, game_id, message){
    /*Check to make sure a game exists*/
    if(typeof games[game_id] == "undefined" || (games[game_id] === null)){
        console.log("No game exists. Can't send update", JSON.stringify());
        games[game_id] = create_new_game();
    }

    

    /*Make sure that only 2 people are in the room*/
    /*Assign each socket a color*/
    io.of('/').to(game_id).allSockets().then((sockets) => {
        const iterator = sockets[Symbol.iterator]();
        if(sockets.size >= 1){ 
           let first = iterator.next().value;
           if((games[game_id].player_white.socket != first) && 
              (games[game_id].player_black.socket != first)) {

                if(games[game_id].player_white.socket === ""){
                    console.log("Assigning white to ", first);
                    games[game_id].player_white.socket = first; 
                    games[game_id].player_white.username = players[first].username;
                }
                else if(games[game_id].player_black.socket === ""){
                    console.log("Assigning black to ", first);
                    games[game_id].player_black.socket = first; 
                    games[game_id].player_black.username = players[first].username;
                } else {
                    console.log("Kicking", first, "from the game");
                    io.in(first).socketsLeave([game_id])
                }
           }
        }

        if(sockets.size >= 2){ 
            let second = iterator.next().value;
            if((games[game_id].player_white.socket != second) && 
               (games[game_id].player_black.socket != second)) {
                 
                 if(games[game_id].player_white.socket === ""){
                     console.log("Assigning white to ", second);
                     games[game_id].player_white.socket = second; 
                     games[game_id].player_white.username = players[second].username;
                 }
                 else if(games[game_id].player_black.socket === ""){
                     console.log("Assigning black to ", second);
                     games[game_id].player_black.socket = second; 
                     games[game_id].player_black.username = players[second].username;
                 } else {
                     console.log("Kicking", second, "from the game");
                     io.in(first).socketsLeave([game_id])
                 }
            }
        }
        /*Send the game update*/
        let payload = {
        result: 'success',
        game_id: game_id, 
        game: games[game_id], 
        message: message
    }
    
    io.of('/').to(game_id).emit('game_update', payload);
        
    }); 
    /*Send a game_update message to each player*/
    /*Check to see if the game is over*/
    let count = 0;
    let whitesum = 0; 
    let blacksum = 0 
    for(let row = 0; row < 8; row++){
        for(let column = 0; column < 8; column++){
            if(games[game_id].board[row][column] != ' '){
                count++;
            }
            if(games[game_id].board[row][column] === 'w'){
                whitesum++; 
            }
            if(games[game_id].board[row][column] === 'b'){
                blacksum++; 
            }
        }
    }
    console.log("Count is ", count);
    if(count === 64){
        let winner = "Tie game."; 
        if(whitesum > blacksum){
            winner = "white Won!"; 
        }
        if (blacksum > whitesum){
            winner = "Black Won!";
        }

        let payload = {
            result: 'success',
            game_id: game_id,
            game: games[game_id], 
            who_won: winner, 
        }
        io.in(game_id).emit('game_over', payload);

        /*Deltete the game after an hour*/
        setTimeout(
            ((id) => {
                return (() => {
                    delete games[id];
                });  
            })(game_id)
            ,60*60*1000)
    }

    



}
