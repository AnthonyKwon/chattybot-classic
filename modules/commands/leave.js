const fs = require('fs');
const string = require('../stringResolver');
const music = require('../tannergabriel_yt');
const tts = require('../textToSpeech');
const voice = require('../discordAudio');

module.exports = {
    name: string.get('leaveCommandName'),
    description: string.get('leaveCommandDesc').format(string.get('localizedBotName')),
    argsRequired: false,
    aliases: [string.get('leaveCommandAliases')],
    cooldown: 5,
    execute(message, args) {
        voice.leave(message);
    }
}
