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
    return null;
}

let username = decodeURI(getIRIParameterValue('username'));
if((typeof username == 'undefined') || (username === null) || (username === 'null') || (username === '')){
    username = 'Anonymous_'+Math.floor(Math.random() * 1000);
}

let chatRoom = decodeURI(getIRIParameterValue('game_id')); 

if((typeof chatRoom == 'undefined') || (chatRoom === null) || (chatRoom === 'null')){
    chatRoom  = 'Lobby';
}

let socket = io(); 
socket.on('log',function(array) {
    console.log.apply(console, array);
}); 

function makeInviteButton(socket_id){
    let newHTML = '<button type="button" class="btn btn-primary button">Invite</button>';
    newNode = $(newHTML);
    newNode.click( () => { 
        let payload = {
            requested_user:socket_id
        }
        console.log('**** Client log message, sending \'invite\' command: '+JSON.stringify(payload));
        socket.emit('invite', payload);    
    }); 
    return newNode;  
}
function makeInvitedButton(socket_id){
    let newHTML = '<button type="button" class="btn btn-secondary button">Invited</button>';
    newNode = $(newHTML); 
    newNode.click( () => { 
        let payload = {
            requested_user:socket_id
        }
        console.log('**** Client log message, sending \'unnvite\' command: '+JSON.stringify(payload));
        socket.emit('uninvite', payload);    
    }); 
    return newNode;  
}
function makePlayButton(){
    let newHTML = '<button type="button" class="btn btn-success button">Play!</button>';
    newNode = $(newHTML); 
    return newNode;  
}

function makeStartGameButton(){
    let newHTML = '<button type="button" class="btn btn-danger button">Starting Game</button>';
    newNode = $(newHTML); 
    return newNode;  
}

socket.on('invite_response', (payload) => { 
    console.log('----invite_reponse received')
    if((typeof payload == 'undefined') || (payload === null)){
        console.log('Server did not send a payload');
        return; 
    }
    if(payload.result === 'fail'){
        console.log(payload.message);
        return; 
    }
    let newNode = makeInvitedButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
}); 


socket.on('invited', (payload) => { 
    if((typeof payload == 'undefined') || (payload === null)){
        console.log('Server did not send a payload');
        return; 
    }
    if(payload.result === 'fail'){
        console.log(payload.message);
        return; 
    }
    let newNode = makePlayButton();
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
}); 

socket.on('uninvited', (payload) => { 
    if((typeof payload == 'undefined') || (payload === null)){
        console.log('Server did not send a payload');
        return; 
    }
    if(payload.result === 'fail'){
        console.log(payload.message);
        return; 
    }
    let newNode = makeInviteButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
}); 

socket.on('join_room_response', (payload) => {
    if((typeof payload == 'undefined') || (payload === null)){
        console.log('Server did not send a payload');
        return; 
    }
    if(payload.result === 'fail'){
        console.log(payload.message);
        return; 
    }

  

    if(payload.socket_id == socket.id){
        return; 
    }
    let domElement = $('.socket_'+payload.socket_id);
    if(domElement.length !== 0){ 
        return; 
    }

    let nodeA = $('<div></div>');
    nodeA.addClass('row');
    nodeA.addClass('name_online')
    //nodeA.addClass('align-items-left');
    nodeA.addClass('socket_'+payload.socket_id);
    nodeA.hide(); 


    let nodeB = $('<div></div>');
    nodeB.addClass('col-8');
    nodeB.addClass('text-start');
    nodeB.addClass('socket_'+payload.socket_id);
    nodeB.append('<h4>'+payload.username+ '</h4>');
    //let buttonC = makeInviteButton();
    //nodeB.append(buttonC) 

    
    let nodeC = $('<div></div>');
    nodeC.addClass('col-4'); 
    nodeC.addClass('pull-right');
    nodeC.addClass('socket_'+payload.socket_id);
    let buttonC = makeInviteButton(payload.socket_id);
    nodeC.append(buttonC)
    

    nodeA.append(nodeB);
    nodeA.append(nodeC);


    $('#players').append(nodeA);
    nodeA.show('fade', 900);
    console.log("main.js 71")


    /*Announcing in the chat room that a new user has joined*/
    let newHTML = "<p class = \'join room response\'>" + payload.username + ' joined the ' + payload.room + '. (There are now ' + payload.count + ' users in this room.)</p>';  
    let newNode = $(newHTML);
    newNode.hide()
    $('#messages').prepend(newNode);
    newNode.show('fade', 900);
});

socket.on('player_disconnected', (payload) => {
    if((typeof payload == 'undefined') || (payload === null)){
        console.log('Server did not send a payload');
        return; 
    }

    if(payload.socket_id == socket.id){
        return; 
    }
    let domElement = $('.socket_'+payload.socket_id);
    if(domElement.length !== 0){
        domElement.hide('fade'); 
    }    
    

    let newHTML = "<p class = \'join room response\'>" + payload.username + ' left the ' + payload.room + '. (There are now ' + payload.count + ' users in this room.)</p>';  
    let newNode = $(newHTML);
    newNode.hide()
    $('#messages').prepend(newNode);
    newNode.show('fade', 900);
}); 

function sendChatMessage(){
    let request = {}; 
    request.room = chatRoom; 
    request.username = username;
    request.message = $('#chatMessage').val();
    console.log('**** Client log message, sending \'send_chat_message\' command: '+JSON.stringify(request));
    socket.emit('send_chat_message', request);
    $('#chatMessage').val('');
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
    if(payload.socket_id == socket.id){
        console.log('This is my own message')
        let newHTML = " <p><div class = \'chat_message own_message\'>" + payload.username  + ": " + payload.message + '</div></p>';  
        let newNode = $(newHTML); 
        newNode.hide()
        $('#messages').prepend(newNode);
        newNode.show('fade', 900);
    } else {
        let newHTML = "<p><div class = \'chat_message\'>" + payload.username  + ": " + payload.message + '</div></p>';  
        let newNode = $(newHTML);
        newNode.hide()
        $('#messages').prepend(newNode);
        newNode.show('fade', 900);
    }
}); 

/*request to join the chat room*/
$(() => {
    let request = {}; 
    request.room = chatRoom;
    request.username = username;
    console.log('**** Client log message, sending \'join_room\' command: '+JSON.stringify(request));
    socket.emit('join_room', request);

    $('#lobbyTitle').html(username + '\'s Lobby'); 
    
    $('#chatMessage').keypress( function(e){
        let key = e.which; 
        if(key == 13) {
          $('button[id = chatButton]').click()
          return false; 
        } 
    });


})