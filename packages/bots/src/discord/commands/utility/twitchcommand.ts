import { BotDatabase } from "abbott-database"
import {
  type ChatInputCommandInteraction,
  inlineCode,
  blockQuote,
  escapeMarkdown,
  hyperlink,
  SlashCommandBuilder,
} from "discord.js"

// Without this "any", I get this error:
//
// The inferred type of 'data' cannot be named without a reference to
// '.pnpm/@discordjs+builders@1.8.2/node_modules/@discordjs/builders'. This is
// likely not portable. A type annotation is necessary.
//
// I don't feel like figuring this out; I just wanted to update Discord.js to
// fix a bug with links being interpreted as markdown. 😢
export const data: any = new SlashCommandBuilder()
  .setName("twitchcommand")
  .setDescription(
    "Returns the response of a command that you would normally use on Twitch.",
  )
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("The name of the command on Twitch")
      .setRequired(true),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const value = interaction.options.getString("name", true)

  const trimmedValue = value.startsWith("!") ? value.slice(1) : value

  const botDatabase = new BotDatabase()

  const response = await botDatabase.getTextCommandResponse(trimmedValue)

  // eslint-disable-next-line unicorn/prefer-ternary
  if (response === undefined) {
    await interaction.reply({
      content: `Command ${inlineCode(
        trimmedValue,
      )} not found. Check ${hyperlink(
        "the command site",
        `https://a.bot.land/?query=${trimmedValue}`,
      )} to see if there are similar commands.`,
      ephemeral: true,
    })
  } else {
    await interaction.reply({
      content: `Command ${inlineCode(trimmedValue)}:\n\n${blockQuote(
        escapeMarkdown(response),
      )}`,
      ephemeral: true,
    })
  }
}
