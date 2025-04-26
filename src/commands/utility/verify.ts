import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  Client, 
  EmbedBuilder, 
  PermissionFlagsBits,
  GuildMember
} from "discord.js";
import { EMBED_COLOR } from "../../utils/constants";
import dotenv from "dotenv";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("verify")
  .setDescription("Setup the verification system in the current channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction
) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user has the staff role
    const staffRoleId = process.env.STAFF_ROLE_ID;
    if (staffRoleId && interaction.member instanceof GuildMember && !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.editReply("You need the staff role to use this command.");
    }

    const verificationRoleId = process.env.ROLE_VERIFIED || "1303289466575917108";

    const role = interaction.guild?.roles.cache.get(verificationRoleId);
    if (!role) {
      return interaction.editReply(`Verification role with ID ${verificationRoleId} not found. Please check your configuration.`);
    }

    const verifyEmbed = new EmbedBuilder()
      .setTitle("Discord Verification")
      .setDescription(`React with ✅ below to verify your account.\nVerification is required to access the server and its full range of features.\nEnsure your Discord account is properly linked before proceeding.`)
      .setColor(EMBED_COLOR)
      .setTimestamp();

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    verifyEmbed.setFooter({ text: formattedDate });

    const message = await interaction.channel?.send({
      embeds: [verifyEmbed]
    });

    if (message) {
      await message.react('✅');
      return interaction.editReply("Verification system has been set up successfully in this channel!");
    } else {
      return interaction.editReply("Failed to send verification message.");
    }
  } catch (error) {
    console.error("Error setting up verification system:", error);
    return interaction.editReply("An error occurred while setting up the verification system.");
  }
}
