import { 
  Client, 
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Role
} from "discord.js";
import { EMBED_COLOR } from "../../utils/constants";
import dotenv from "dotenv";

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("setup-roles")
  .setDescription("Setup the role selection system in the current channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

interface RoleInfo {
  id: string;
  emoji: string;
  name?: string;
  description?: string;
}

export async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction
) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const roles = getRoleConfiguration(interaction);

    if (Object.keys(roles).length === 0) {
      return interaction.editReply("No roles found in the configuration. Please add role IDs to your .env file.");
    }

    // Log available roles for debugging
    console.log("Setting up roles with the following configuration:", JSON.stringify(roles, null, 2));

    const roleEmbed = new EmbedBuilder()
      .setTitle("🎭 Server Roles")
      .setDescription("React with the emojis below to get or remove roles:\n\n" + 
        Object.values(roles)
          .map(role => `${role.emoji} **${role.name}** - ${role.description}`)
          .join("\n\n")
      )
      .setColor(EMBED_COLOR)
      .setFooter({ text: "Click an emoji to add/remove a role" })
      .setTimestamp();

    const message = await interaction.channel?.send({
      embeds: [roleEmbed]
    });

    if (message) {
      // Add reactions for each role
      for (const role of Object.values(roles)) {
        try {
          // Wait a bit between reactions to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
          await message.react(role.emoji);
        } catch (error) {
          console.error(`Failed to add reaction ${role.emoji}:`, error);
        }
      }
      
      return interaction.editReply("Role selection system has been set up successfully in this channel!");
    } else {
      return interaction.editReply("Failed to create the role selection message.");
    }
  } catch (error) {
    console.error("Error setting up role selection system:", error);
    return interaction.editReply("An error occurred while setting up the role selection system.");
  }
}

function getRoleConfiguration(interaction: ChatInputCommandInteraction): Record<string, RoleInfo> {
  const emojiPrefix = "ROLE_EMOJI_";
  const idPrefix = "ROLE_ID_";
  const descPrefix = "ROLE_DESC_";
  const roleConfig: Record<string, RoleInfo> = {};
  
  // First get all role IDs
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(idPrefix) && value) {
      const roleName = key.slice(idPrefix.length).toLowerCase();
      
      // Try to get the role from the server by ID
      const role = interaction.guild?.roles.cache.get(value);
      
      if (role) {
        roleConfig[roleName] = {
          id: value,
          name: role.name,
          emoji: getDefaultEmoji(roleName),
          description: `Get notified about ${role.name.toLowerCase()}`
        };
      } else {
        console.log(`WARNING: Role with ID ${value} not found in the server`);
      }
    }
  }
  
  // Then update with custom emojis if defined
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(emojiPrefix) && value) {
      const roleName = key.slice(emojiPrefix.length).toLowerCase();
      if (roleConfig[roleName]) {
        roleConfig[roleName].emoji = value;
      }
    }
  }
  
  // Then update with custom descriptions if defined
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(descPrefix) && value) {
      const roleName = key.slice(descPrefix.length).toLowerCase();
      if (roleConfig[roleName]) {
        roleConfig[roleName].description = value;
      }
    }
  }
  
  return roleConfig;
}

function getDefaultEmoji(roleName: string): string {
  const emojiMap: { [key: string]: string } = {
    announcements: "📢",
    event_announcements: "🎉",
    patch_notes: "📝",
    default: "✅"
  };

  return emojiMap[roleName] || emojiMap.default;
}

