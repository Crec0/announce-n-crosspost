const core = require("@actions/core");
const axios = require("axios");

const ME = '/users/@me';
const GUILDS = '/guilds/:guild';
const CHANNEL = '/channels/:channel';
const MESSAGES = '/channels/:channel/messages';
const CROSSPOST_MESSAGE = '/channels/:channel/messages/:message/crosspost';

const NEWS_CHANNEL = 5;
const SUCCESS = 200;

function prepareRoute(templateRoute, params = {}) {
    let route = templateRoute;
    for (const [key, value] of Object.entries(params)) {
        if (value == null)
            throw new Error(`Key ${key} is required`);
        route = route.replaceAll(`:${key}`, value);
    }
    return route;
}

async function verifyToken(axiosInstance) {
    const response = await axiosInstance.get(prepareRoute(ME));
    if (response.status !== SUCCESS)
        throw new Error(`(${response.status}) Login failed. Please check your token and try again`);
}

async function getGuildIfAvailable(axiosInstance, guild) {
    if (guild == null)
        return null;
    const response = await axiosInstance.get(prepareRoute(GUILDS, { guild }));
    if (response.status !== SUCCESS)
        return null;
    return response.data.name;
}

async function getNewsChannelNameAndGuild(axiosInstance, channel) {
    const routeUrl = prepareRoute(CHANNEL, { channel });
    const response = await axiosInstance.get(routeUrl);

    if (response.status !== SUCCESS)
        throw new Error(`Failed to get channel information. ${response.status}`);

    const responseChannel = response.data;
    const channelName = responseChannel.name;
    const guildName = await getGuildIfAvailable(axiosInstance, responseChannel['guild_id']);

    if (responseChannel.type !== NEWS_CHANNEL || guildName == null) {
        const location = guildName == null ? `${channelName}` : `${channelName} in ${guildName}`;
        throw new Error(`${location} is not a news channel channel.`);
    }

    return { channelName, guildName };
}

async function sendAndPublishMessage(axiosInstance, channel, content) {
    core.info("Checking if news channel");
    const {channelName, guildName} = await getNewsChannelNameAndGuild(axiosInstance, channel);
    core.info(`News channel found. Sending message to '${channelName}' in '${guildName}'`);

    const routeUrl = prepareRoute(MESSAGES, {channel});
    const response = await axiosInstance.post(routeUrl, content);

    if (response.status !== SUCCESS) {
        throw new Error(
            `(${response.status}) Failed to send message in ${channelName} in ${guildName}. ` +
            `Error: ${response.statusText}. ` +
            `Please check the bot if it has SEND_MESSAGES permission.`
        );
    }

    core.info("Message sent");
    core.info(`Publishing message sent in ${channelName} in ${guildName}`);

    const responseJson = response.data;
    const messageId = responseJson.id;
    core.setOutput("message-id", messageId);

    const crosspostRequest = prepareRoute(CROSSPOST_MESSAGE, { channel: channel,  message: messageId});
    const crosspostResponse = await axiosInstance.post(crosspostRequest, {data: responseJson});
    if (crosspostResponse.status !== SUCCESS) {
        throw new Error(
            `(${response.status}) Failed to crosspost message in ${channelName} in ${guildName}. ` +
            `Error: ${response.statusText}.`
        );
    }
    core.info(`Message crossposted in ${channelName} in ${guildName}`);
    core.notice(`Message successfully send and crossposted in ${channelName} in ${guildName}`);
}

async function announce() {
    const token = core.getInput('bot-token', {required: true});
    const channel = core.getInput('channel', {required: true});
    const content = core.getMultilineInput('content', {required: true}).join('\n');

    const axiosInstance = axios.create({
        baseURL: 'https://discord.com/api/v9',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bot ${token}`
        },
        validateStatus: () => true
    });

    core.info("Verifying token");
    await verifyToken(axiosInstance);
    core.info("Token verified");

    await sendAndPublishMessage(axiosInstance, channel, { content });
}

module.exports = announce;
