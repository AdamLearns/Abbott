import { AccessToken, RefreshingAuthProvider } from '@twurple/auth';
import { Bot, BotCommand, createBotCommand } from '@twurple/easy-bot';
import { promises as fs } from 'node:fs';
import { commandsAndResponses } from '../commands';

export async function init() {
  console.log("Starting the Discord bot")
  const clientId = "b7knlmqszef0wdilae5vu3qr8qpw0q";
  const clientSecret = process.env.CLIENT_SECRET;

  const tokenData: AccessToken = JSON.parse(await fs.readFile('./tokens.102460608.json', 'utf8'));

  if (clientSecret === undefined) {
    throw new Error('Missing environment variables. Make sure to copy .env.example to .env and fill out the values.');
  }

  const authProvider = new RefreshingAuthProvider({
    clientId,
    clientSecret
  });

  authProvider.onRefresh(async (userId, newTokenData) => await fs.writeFile(`./tokens.${userId}.json`, JSON.stringify(newTokenData, null, 4), { encoding: 'utf-8' }));

  try {
    await authProvider.addUserForToken(tokenData, ['chat']);
  } catch (error) {
    // DO NOT PRINT THIS ERROR; it has secrets in it!
    throw new Error("Couldn't call addUserForToken. Probably sent a bad refresh token. Follow https://twurple.js.org/docs/examples/chat/basic-bot.html to fix it.")
  }

  const commands: Array<BotCommand> = [];

  Object.entries(commandsAndResponses).map(([command, response]) => {
    commands.push(createBotCommand(command, (params, { say }) => {
      say(response);
    }))
  })

  const bot = new Bot({
    authProvider,
    channels: ['AdamLearnsLive'],
    commands: [
      createBotCommand('dice', (params, { reply }) => {
        const diceRoll = Math.floor(Math.random() * 6) + 1;
        reply(`You rolled a ${diceRoll}`);
      }),
      createBotCommand('slap', (params, { userName, say }) => {
        say(`${userName} slaps ${params.join(' ')} around a bit with a large trout`);
      }),
      ...commands
    ]
  });

  bot.onSub(({ broadcasterName, userName }) => {
    bot.say(broadcasterName, `Thanks to @${userName} for subscribing to the channel!`);
  });

  bot.onResub(({ broadcasterName, userName, months }) => {
    bot.say(broadcasterName, `Thanks to @${userName} for subscribing to the channel for a total of ${months} months!`);
  });

  bot.onSubGift(({ broadcasterName, gifterName, userName }) => {
    bot.say(broadcasterName, `Thanks to @${gifterName} for gifting a subscription to @${userName}!`);
  });
}
