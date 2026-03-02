const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

// Подключаемся к MongoDB
mongoose.connect('mongodb://localhost/mydatabase', { useNewUrlParser: true, useUnifiedTopology: true }).then(
    () => console.log('Connected to MongoDB'),
    err => console.error(err)
);

// Подготовка модели сообщений
const Message = require('./models/Message');

// Списки пользователей и банлисты
let activeUsers = {};
let bannedUsers = [];

// Создаем HTTP-сервер
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Обновляем список пользователей при подключении
io.on('connection', (socket) => {
    console.log(`Пользователь ${socket.id} подключился`);

    // Регистрация пользователя
    socket.on('register_user', ({ user }) => {
        if (bannedUsers.includes(user)) {
            socket.emit('access_denied', 'Вы заблокированы.');
            socket.disconnect(true); // Немедленно разрываем соединение
            return;
        }
        if (activeUsers[user]) {
            socket.emit('nickname_taken');
        } else {
            activeUsers[user] = true; // Пользователь вошел в сеть
            console.log(`Отправляю событие authorized для пользователя "${user}".`);
            socket.emit('authorized');
            io.emit('update_users_list', Object.keys(activeUsers)); // Обновляем список пользователей
        }
    });

    // Прием новых сообщений
    socket.on('send_message', async (data) => {
        const newMessage = new Message({
            user: data.user,
            message: data.msg,
            sentAt: new Date()
        });
        await newMessage.save(); // Сохраняем сообщение в MongoDB
        io.emit('new_message', { user: data.user, message: data.msg, time: newMessage.sentAt.toLocaleString() });
    });

    // Бан пользователя
    socket.on('ban_user', (targetUser) => {
        if (activeUsers[targetUser]) {
            bannedUsers.push(targetUser); // Добавляем пользователя в банлист
            delete activeUsers[targetUser]; // Удаляем из активных
            io.emit('update_users_list', Object.keys(activeUsers)); // Обновляем список пользователей
            targetUser.socket.disconnect(true); // Разрываем соединение
        }
    });

    // Удаление сообщения
    socket.on('delete_message', async (messageId) => {
        try {
            await Message.deleteOne({ _id: messageId }); // Удаляем сообщение по его ID
            io.emit('remove_message', messageId); // Сообщаем всем о удалённом сообщении
        } catch (err) {
            console.error('Ошибка при удалении сообщения:', err);
        }
    });

    // Отключение пользователя
    socket.on('disconnect', () => {
        delete activeUsers[socket.nickname];
        io.emit('update_users_list', Object.keys(activeUsers)); // Обновляем список пользователей
    });
});

// Запускаем сервер
const PORT = process.env.PORT || 3000;
server.listen(80, '0.0.0.0', () => {
  console.log('Server running on port 80');
});
});
