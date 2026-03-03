const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

// ======================
// 🔹 Подключение MongoDB
// ======================

mongoose.connect('mongodb://localhost/mydatabase')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('MongoDB error:', err));

// Модель сообщений
const Message = require('./models/Message');

// ======================
// 🔹 Настройка сервера
// ======================

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Отдача статических файлов
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ======================
// 🔹 Хранилища
// ======================

// { nickname: socket }
let activeUsers = {};
let bannedUsers = [];

// ======================
// 🔹 Socket.io логика
// ======================

io.on('connection', (socket) => {
    console.log(`🔌 Пользователь подключился: ${socket.id}`);

    // Регистрация пользователя
    socket.on('register_user', ({ user }) => {
        if (!user) return;

        if (bannedUsers.includes(user)) {
            socket.emit('access_denied', 'Вы заблокированы.');
            socket.disconnect(true);
            return;
        }

        if (activeUsers[user]) {
            socket.emit('nickname_taken');
            return;
        }

        // Сохраняем сокет
        socket.nickname = user;
        activeUsers[user] = socket;

        socket.emit('authorized');
        io.emit('update_users_list', Object.keys(activeUsers));

        console.log(`✅ Пользователь ${user} авторизован`);
    });

    // Отправка сообщения
    socket.on('send_message', async ({ user, msg }) => {
        if (!user || !msg) return;

        try {
            const newMessage = new Message({
                user,
                message: msg,
                sentAt: new Date()
            });

            await newMessage.save();

            io.emit('new_message', {
                id: newMessage._id,
                user,
                message: msg,
                time: newMessage.sentAt.toLocaleString()
            });

        } catch (err) {
            console.error('Ошибка сохранения сообщения:', err);
        }
    });

    // Бан пользователя
    socket.on('ban_user', (targetUser) => {
        if (!activeUsers[targetUser]) return;

        bannedUsers.push(targetUser);

        activeUsers[targetUser].emit('access_denied', 'Вы были заблокированы.');
        activeUsers[targetUser].disconnect(true);

        delete activeUsers[targetUser];

        io.emit('update_users_list', Object.keys(activeUsers));

        console.log(`🚫 Пользователь ${targetUser} заблокирован`);
    });

    // Удаление сообщения
    socket.on('delete_message', async (messageId) => {
        try {
            await Message.deleteOne({ _id: messageId });
            io.emit('remove_message', messageId);
        } catch (err) {
            console.error('Ошибка при удалении сообщения:', err);
        }
    });

    // Отключение
    socket.on('disconnect', () => {
        if (socket.nickname && activeUsers[socket.nickname]) {
            delete activeUsers[socket.nickname];
            io.emit('update_users_list', Object.keys(activeUsers));
            console.log(`❌ Пользователь ${socket.nickname} отключился`);
        }
    });
});

// ======================
// 🔹 Запуск сервера
// ======================

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
