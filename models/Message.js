// models/Message.js

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    user: { type: String, required: true },
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now } // Дата отправки сообщения
});

module.exports = mongoose.model('Message', MessageSchema);