function getIRIParameterValue(requestedKey){
    let pageIRI = window.location.search.substring(1); 
    let pageIRIVariables = pageIRI.split('&');
    for(i = 0; i < pageIRIVariables.length; i++){
        let data = pageIRIVariables[i].split('=');
        let key = data[0];
        let value = data[1]; 
        if(key === requestedKey){
            return value; 
        }
    }
}

let username = decodeURI(getIRIParameterValue('username'));
if((typeof username == 'undefined') || (username === null)){
    username = 'Anonymous_'+Math.floor(Math.random() * 1000);
}


let chatRoom = 'Lobby'; 

let socket = io(); 
socket.on('log',function(array) {
    console.log.apply(console, array);
}); 

socket.on('join_room_response', (payload) => {
    console.log('here!!! 28 main.js'); 
    if((typeof payload == 'undefined') || (payload === null)){
        console.log('Server did not send a payload');
        return; 
    }
    if(payload.result === 'fail'){
        console.log(payload.message);
        return; 
    }
    let newString = "<p class = \'join room response\'>" + payload.username + ' joined the ' + payload.room + '. (There are ' + payload.count + ' users in this room.)</p>';  
    $('#messages').prepend(newString);
}); 

function sendChatMessage(){
    let request = {}; 
    request.room = chatRoom; 
    request.username = username;
    request.message = $('#chatMessage').val();
    console.log('**** Client log message, sending \'send_chat_message\' command: '+JSON.stringify(request));
    socket.emit('send_chat_message', request);
}

socket.on('send_chat_message', (payload) => { 
    if((typeof payload == 'undefined') || (payload === null)){
        console.log('Server did not send a payload');
        return; 
    }
    if(payload.result === 'fail'){
        console.log(payload.message);
        return; 
    }
    let newString = "<p><div class = \'chat_message\'>" + payload.username  + ": " + payload.message + '</div></p>';  
    $('#messages').prepend(newString);
}); 

/*request to join the chat room*/
$(() => {
    let request = {}; 
    request.room = chatRoom;
    request.username = username;
    console.log('**** Client log message, sending \'join_room\' command: '+JSON.stringify(request));
    socket.emit('join_room', request);
})