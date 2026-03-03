document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const loginForm = document.getElementById('login-form');
    const nicknameInput = document.getElementById('nickname-input');
    const chatContainer = document.getElementById('chat-container');
    const chatWindow = document.getElementById('chat-window');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    // Подключаемся к серверу
    const socket = io();
    socket.on('authorized', () => {
        console.log('Получил событие authorized от сервера.');
        authContainer.style.display = "none";
        chatContainer.style.display = "block";
        socket.emit('join');
    })
    socket.on('nickname_taken', () => {
        console.warn('Никнейм занят.');
    })
    socket.on('access-denied', (reason) => {
        console.error(reason);
    })

    // Имя текущего пользователя
    let currentUsername;

    // Авторизация пользователя
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const enteredNickname = nicknameInput.value.trim();
        if (!enteredNickname) return alert("Выберите никнейм!");
        currentUsername = enteredNickname;
        socket.emit('register_user', { user: currentUsername });
    });

    // Обновляем логику авторизации
    socket.on('authorized', () => {
        authContainer.style.display = "none";
        chatContainer.style.display = "block";
        socket.emit('join'); // Запрашиваем историю сообщений
    });

    // Доступ к бану доступен только администратору
    function enableBanTool() {
        const usersList = document.getElementById('online-users');
        usersList.addEventListener('click', (event) => {
            if (event.target.classList.contains('ban-button')) {
                const targetUser = event.target.dataset.user;
                socket.emit('ban_user', targetUser); // Отправляем команду на сервер
            }
        });
    }

    // Обновляем логику отображения списка пользователей
    socket.on('update_users_list', (users) => {
        const usersListEl = document.getElementById('online-users');
        while (usersListEl.firstChild) {
            usersListEl.removeChild(usersListEl.lastChild); // Очищаем старый список
        }
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user;
            const banButton = document.createElement('button');
            banButton.classList.add('ban-button');
            banButton.title = 'Забанить пользователя';
            banButton.textContent = '⛔';
            banButton.dataset.user = user;
            li.append(banButton);
            usersListEl.appendChild(li);
        });
    });

    // Получаем историю сообщений
    socket.on('load_history', (messages) => {
        messages.forEach((msg) => {
            addMessage(msg); // Выводим предыдущее сообщение
        });
    });

    // Отправляем сообщение на сервер
    messageForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const msgText = messageInput.value.trim();
        if (!msgText) return;
        socket.emit('send_message', { user: currentUsername, msg: msgText });
        messageInput.value = '';
    });

    // Новые сообщения поступают от сервера
    socket.on('new_message', (fullMsg) => {
        addMessage(fullMsg); // Выводим новое сообщение
    });

    // Обработчик кликов по кнопкам удаления сообщений
    document.getElementById('chat-window').addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-message')) {
            const messageId = event.target.closest('.message').dataset.messageId;
            socket.emit('delete_message', messageId); // Отправляем команду на сервер
        }
    });

    // Обновляем интерфейс при удалении сообщения
    socket.on('remove_message', (messageId) => {
        const removedMessage = document.querySelector(`[data-message-id="${messageId}"]`);
        if (removedMessage) {
            removedMessage.remove(); // Удаляем сообщение из интерфейса
        }
    });

    // Добавляем сообщение в UI
    function addMessage(messageObj) {
        const newMessageDiv = document.createElement('div');
        newMessageDiv.classList.add('message');
        newMessageDiv.dataset.messageId = messageObj._id; // Уникальный идентификатор сообщения
        newMessageDiv.innerHTML = `
            <strong>${messageObj.user}</strong> <small>(${messageObj.time})</small>: <span class="text">${messageObj.message}</span>
            <button class="delete-message" title="Удалить сообщение">🗑️</button>
        `;
        chatWindow.appendChild(newMessageDiv);
        scrollToBottom();
    }

    // Прокручиваем окно сообщений вниз
    function scrollToBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
});
