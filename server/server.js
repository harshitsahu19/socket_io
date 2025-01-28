const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();

const io = new Server(httpServer, {
    cors: {
        origin: 'http://127.0.0.1:5500'
    }
});


let users = [];
let messages = {};
let currentChats = {};


io.on("connection", (socket) => {
    console.log('A client connected:', socket.id);

    users[socket.id] = { userId: socket.id, name: `User_${socket.id.substring(0, 4)}` }; // Default name with part of ID

    console.log('Connected Users:', users);

    const userList = Object.values(users).map(user => ({
        userId: user.userId,
        name: user.name
    }));


//  commets
    io.emit('userList', userList)

    socket.on('startChat', (selectedUser) => {
        // Track the user pair for private chat
        currentChats[socket.id] = selectedUser;
        currentChats[selectedUser] = socket.id;

        // Emit the start of the private chat
        socket.emit('chatStarted', selectedUser);
        socket.to(selectedUser).emit('chatStarted', socket.id);
        console.log('current chats',currentChats)
    });


    socket.on('chatMessage', (data, ack) => {
        try {
            const { selectedUser, message } = data; // Expect `selectedUser` to contain the target user's `socket.id`

            if (!selectedUser || !message) {
                throw new Error('Invalid data: selectedUser or message is missing.');
            }

            console.log('Received data:', data);

            const messageId = socket.id + Date.now();

            // Save the message to the server
            messages[messageId] = {
                senderId: socket.id,
                receiverId: selectedUser,
                message: message
            };

            console.log('this store message', messages);

            // Emit the message to the selected user only
            socket.to(selectedUser).emit('chatMessage', {
                message: `User_${socket.id.substring(0, 4)}: ${message}`,
                messageId: messageId
            });

            ack({ status: 'delivered', message: 'Message sent successfully!', messageId: messageId });
        } catch (error) {
            console.error('Error in chatMessage event:', error.message);
            ack({ status: 'failed', message: error.message });
        }
    });


    socket.on('deleteMessage', (messageId) => {
        try {
            if (!messageId || !messages[messageId]) {
                throw new Error('Message not found or invalid messageId.');
            }

            const { senderId, receiverId } = messages[messageId];

            // Delete the message from the stored messages
            delete messages[messageId];

            // Emit the deletion event to sender and receiver if they're connected
            if (io.sockets.sockets.has(senderId)) {
                io.to(senderId).emit('messageDeleted', messageId);
            }

            if (io.sockets.sockets.has(receiverId)) {
                io.to(receiverId).emit('messageDeleted', messageId);
            }

            console.log(`Message with ID ${messageId} deleted`);
        } catch (error) {
            console.error('Error in deleteMessage event:', error.message);
        }
    });

    socket.on('editMessage', (data, callback) => {
        try {

            const { messageId, newMessage } = data;
            console.log(data)

            messages[messageId].message = newMessage;

            io.to(messages[messageId].senderId).emit('messageEdited', { messageId, newMessage });
            io.to(messages[messageId].receiverId).emit('messageEdited', { messageId, newMessage });

            callback({ status: 'success', message: 'Message edited successfully' });
        
        }


        catch (error) {
            console.log('errror', error.message)
        }
    })


    socket.on('disconnect', () => {
        delete users[socket.id];
        console.log('User disconnected:', socket.id);
    });

});




httpServer.listen(4000, () => {
    console.log('server is connected')
})

