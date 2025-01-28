const socket = io('http://localhost:4000');

const messageInput = document.getElementById('message-input');
const chatContainer = document.getElementById('chat-container');
const userDropdown = document.getElementById('user-dropdown');

// Handle socket connection
socket.on('connect', () => {
    console.log('Connected -:', socket.id);
});

// Receive and update the user list
socket.on('userList', (userList) => {
    const filteredUserList = userList.filter(user => user.userId !== socket.id);
    updateUserDropdown(filteredUserList);
});

// Populate the user dropdown with the received user list
function updateUserDropdown(userList) {
    userDropdown.innerHTML = '<option value="">Select User</option>';
    userList.forEach((user) => {
        const option = document.createElement('option');
        option.value = user.userId;
        option.textContent = user.name;
        userDropdown.appendChild(option);
    });
}

// Receive chat message and add it to the chat
socket.on('chatMessage', (data) => {
    addMessageToChat(data.message, 'other', data.messageId);
});

// Handle message deletion
socket.on('messageDeleted', (messageId) => {
    const messageElement = document.querySelector(`[data-id="${messageId}"]`);
    if (messageElement) {
        messageElement.remove();
    } else {
        console.warn(`Message with ID ${messageId} not found in the UI`);
    }
});

socket.on('messageEdited', (data) => {
    const { messageId, newMessage } = data;
    const messageElement = document.querySelector(`[data-id="${messageId}"]`);

    if (messageElement) {
        messageElement.querySelector('p').textContent = newMessage; // Update the displayed message
    }
});


// Handle message submission
function submitInput(e) {
    e.preventDefault();
    const message = messageInput.value;
    const selectedUser = userDropdown.value;

    socket.emit('chatMessage', { message, selectedUser }, (ackResponse) => {
       
        if (ackResponse.status === 'delivered') {
            addMessageToChat(message, 'self', ackResponse.messageId);
            messageInput.value = ''; // Clear the input field
        } else {
            console.error('Message not delivered');
        }
    });
}




// Add message to chat dynamically
function addMessageToChat(message, className, messageId) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', className);
    messageElement.setAttribute('data-id', messageId);

    const bubbleElement = document.createElement('div');
    bubbleElement.classList.add('inline-block', 'max-w-xs', 'rounded-lg', 'p-3', 'mb-2');

    if (className === 'self') {
        bubbleElement.classList.add('bg-blue-500', 'text-white');

        const deleteIcon = document.createElement('span');
        deleteIcon.innerHTML = '🗑️'; // Small trash can icon
        deleteIcon.classList.add('delete-icon', 'cursor-pointer', ); // Add margin for spacing
        deleteIcon.style.fontSize = '16px'; // Adjust icon size

        deleteIcon.addEventListener('click', () => {
            socket.emit('deleteMessage', messageId);
        });
        messageElement.appendChild(deleteIcon);

        const editIcon = document.createElement('span');
        editIcon.innerHTML = '✏️'; // Pencil icon for editing
        editIcon.classList.add('edit-icon', 'cursor-pointer', 'ml-2'); // Add margin for spacing
        editIcon.style.fontSize = '16px';

        editIcon.addEventListener('click', () => {
           
            editMessage(message, messageId);
        });
        messageElement.appendChild(editIcon);


    } else if (className === 'other') {
        bubbleElement.classList.add('bg-green-500', 'text-white');
    }

    const messageText = document.createElement('p');
    messageText.textContent = message;
    bubbleElement.appendChild(messageText);

    messageElement.appendChild(bubbleElement);

    if (className === 'self') {
        const statusText = document.createElement('p');
        statusText.classList.add('sent-status', 'text-gray-400', 'text-xs');
        statusText.textContent = 'Sent';
        messageElement.appendChild(statusText);
    }

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to the latest message
}


function editMessage (message,messageId){
    console.log('edit function called',message)
    
    const newMessage = prompt ('edit you message')

    if (newMessage && newMessage !== message) {
        socket.emit('editMessage', { messageId, newMessage }, (ackResponse) => {

            console.log(message,messageId,ackResponse)
            if (ackResponse.status === 'success') {
                // Update the message in the UI
                const messageElement = document.querySelector(`[data-id="${messageId}"]`);
                if (messageElement) {
                    messageElement.querySelector('p').textContent = newMessage;
                }
            } else {
                alert(`Error: ${ackResponse.message}`);
                console.error('Message edit error:', ackResponse.message);
            }
        });
    }
}