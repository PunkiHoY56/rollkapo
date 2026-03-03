document.addEventListener('DOMContentLoaded', () => {

    const authContainer = document.getElementById('auth-container');
    const loginForm = document.getElementById('login-form');
    const nicknameInput = document.getElementById('nickname-input');
    const chatContainer = document.getElementById('chat-container');
    const chatWindow = document.getElementById('chat-window');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');

    // ✅ Подключение без указания localhost
    const socket = io();

    let currentUsername = null;

    // =====================
    // SOCKET EVENTS
    // =====================

    socket.on('connect', () => {
        console.log('Соединение установлено');
    });

    socket.on('disconnect', () => {
        console.warn('Соединение потеряно');
    });

    socket.on('authorized', () => {
        authContainer.style.display = "none";
        chatContainer.style.display = "block";
        socket.emit('join');
    });

    socket.on('nickname_taken', () => {
        alert("Никнейм уже занят!");
    });

    socket.on('access-denied', (reason) => {
        alert(reason);
    });

    socket.on('update_users_list', (users) => {
        const usersListEl = document.getElementById('online-users');
        usersListEl.innerHTML = "";

        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user;

            const banButton = document.createElement('button');
            banButton.classList.add('ban-button');
            banButton.textContent = '⛔';
            banButton.dataset.user = user;

            li.appendChild(banButton);
            usersListEl.appendChild(li);
        });
    });

    socket.on('load_history', (messages) => {
        chatWindow.innerHTML = "";
        messages.forEach(addMessage);
    });

    socket.on('new_message', addMessage);

    socket.on('remove_message', (messageId) => {
        const msg = document.querySelector(`[data-message-id="${messageId}"]`);
        if (msg) msg.remove();
    });

    // =====================
    // LOGIN
    // =====================

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const nickname = nicknameInput.value.trim();
        if (!nickname) {
            alert("Введите ник!");
            return;
        }

        currentUsername = nickname;
        socket.emit('register_user', { user: nickname });
    });

    // =====================
    // SEND MESSAGE
    // =====================

    messageForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const msgText = messageInput.value.trim();
        if (!msgText || !currentUsername) return;

        socket.emit('send_message', {
            user: currentUsername,
            msg: msgText
        });

        messageInput.value = "";
    });

    // =====================
    // BAN CLICK
    // =====================

    document.getElementById('online-users').addEventListener('click', (event) => {
        if (event.target.classList.contains('ban-button')) {
            const targetUser = event.target.dataset.user;
            socket.emit('ban_user', targetUser);
        }
    });

    // =====================
    // ADD MESSAGE
    // =====================

    function addMessage(messageObj) {

        const newMessageDiv = document.createElement('div');
        newMessageDiv.classList.add('message');
        newMessageDiv.dataset.messageId = messageObj._id;

        // ✅ Защита от XSS
        const safeUser = escapeHtml(messageObj.user);
        const safeMsg = escapeHtml(messageObj.message);

        newMessageDiv.innerHTML = `
            <strong>${safeUser}</strong> 
            <small>(${messageObj.time})</small>: 
            <span>${safeMsg}</span>
            <button class="delete-message">🗑️</button>
        `;

        chatWindow.appendChild(newMessageDiv);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

});
