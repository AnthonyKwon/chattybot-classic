const path = require('node:path');
const util = require('node:util');
const { SlashCommandBuilder } = require('discord.js');
const join = require('./basic_join.js');
const common = require(path.join(path.dirname(require.main.filename), 'modules', 'common.js'));
const i18n = require(path.join(path.dirname(require.main.filename), 'modules', 'i18n', 'main.mod.js'));
const logger = require(path.join(path.dirname(require.main.filename), 'modules', 'logger', 'main.mod.js'));
const report = require(path.join(path.dirname(require.main.filename), 'modules', 'errorreport', 'main.mod.js'));
const TTSClass = require('../modules/tts/class/TextToSpeech.js');
const TTSUser = require('../modules/tts/class/TTSUser.js');
const DiscordVoice = require('../modules/discordwrapper/class/DiscordVoice.js');

const regexMention = /<(#|@!)[0-9]{18}>/g;
const regExSpecial = /[\{\}\[\]\/;:|\)*`^_~<>\#\\\=\(]/gi;

function messageFix(interaction, content) {
    const locale = interaction.guild.i18n.locale;
    /* replace raw mention id to discord mention */
    let finalMsg = content.replace(regexMention, (match, $1) => {
        let id = common.replaceAll(match, /[<>]/g, '');
        if (id.includes('@!')) {
            id = interaction.guild.members.cache.get(id.replace('@!', '')).displayName;
            return id;
        } else if (id.includes('#')) {
            const asyncFetchChannel = util.promisify(interaction.client.channels.fetch);
            const channel = asyncFetchChannel(id.replace('#', ''));
            id = channel.name;
            return id;
        }
    });

    /* Replace TTS unreadable charater to whitespace */
    finalMsg = common.replaceAll(finalMsg, '@', i18n.get('tts.replacement.@'));

    /* Replace TTS unreadable charater to whitespace */
    finalMsg = common.replaceAll(finalMsg, '&', i18n.get('tts.replacement.&'));

    /* Replace TTS unreadable charater to whitespace */
    finalMsg = common.replaceAll(finalMsg, regExSpecial, ' ');
    return finalMsg;
}

async function commandHandler(interaction) {
    const locale = interaction.guild.i18n.locale;
    let voice = new DiscordVoice(interaction.guild.id);

    // check if bot joined to the voice channel and join if not
    if (!voice.connected) {
        voice = await join.execute(interaction);
        if (!voice) return; // join failed, stop function
    }

    /* If TTS is not initalized, do it first */
    let tts = TTSClass.get(interaction.guild.id);
    if (!tts) tts = TTSClass.create(interaction, 'GcpTtsWaveNet');
    /* Fix message for TTS-readable */
    const text = interaction.options.getString(i18n.get('en-US', 'command.say.opt1.name'));
    const fixedText = await messageFix(interaction, text);
    logger.warn('tts', `Message ${text} will be spoken as ${fixedText}.`);
    try {
        /* Send message and TTS to discord */
        interaction.editReply(i18n.get(locale, 'tts.speak.text').format(interaction.user, text));
        tts.addQueue(new TTSUser(interaction.user, interaction.guild), fixedText);
        let result = undefined;
        if (!tts.isBusy) result = await tts.speak();
        for (audio of result) {
            await voice.play(audio);
        }
        logger.verbose('tts', `${interaction.user} spoken: ${text}`);
    } catch(err) {
        const result = report(err, interaction.user.id);
        logger.verbose('tts', `Error occured while synthesizing:\n  ${err.stack}\n`);
        interaction.editReply(i18n.get(locale, 'error.generic').format(result));
    }
    return;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName(i18n.get('en-US', 'command.say.name'))
        .setNameLocalizations(i18n.get('command.say.name'))
        .setDescription(i18n.get('en-US', 'command.say.desc'))
        .setDescriptionLocalizations(i18n.get('command.say.desc'))
        .addStringOption(option => option.setName(i18n.get('en-US', 'command.say.opt1.name'))
                                         .setNameLocalizations(i18n.get('command.say.opt1.name'))
                                         .setDescription(i18n.get('en-US', 'command.say.opt1.desc'))
                                         .setDescriptionLocalizations(i18n.get('command.say.opt1.desc'))
                                         .setRequired(true)),
    extra: { },
    execute: commandHandler
}