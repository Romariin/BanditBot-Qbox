import { MessageReaction, User, Client } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

export default async function(client: Client, reaction: MessageReaction, user: User) {
  if (user.bot) return;

  if (!reaction.message.guild) return;

  try {
    const member = await reaction.message.guild.members.fetch(user.id);
    
    const emojiToRoleId = getEmojiToRoleMap();
    
    const roleId = emojiToRoleId.get(reaction.emoji.name || '');
    
    if (!roleId) {
      return;
    }

    console.log(`User ${user.tag} reacted with ${reaction.emoji.name} for role ID ${roleId}`);

    const role = reaction.message.guild.roles.cache.get(roleId);

    if (!role) {
      console.log(`Role with ID "${roleId}" not found in the server`);
      return;
    }

    try {
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);
        console.log(`Added role ${role.name} to ${user.tag}`);
      } else {
        await member.roles.remove(roleId);
        console.log(`Removed role ${role.name} from ${user.tag}`);
      }
      
      await reaction.users.remove(user.id);
    } catch (error) {
      console.error(`Failed to manage role:`, error);
    }
  } catch (error) {
    console.error("Error handling reaction:", error);
  }
}

function getEmojiToRoleMap(): Map<string, string> {
  const roleMap = new Map<string, string>();
  const emojiPrefix = "ROLE_EMOJI_";
  const idPrefix = "ROLE_ID_";
  
  const roleIds = new Map<string, string>();
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(idPrefix) && value) {
      const roleName = key.slice(idPrefix.length).toLowerCase();
      roleIds.set(roleName, value);
    }
  }
  
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(emojiPrefix) && value) {
      const roleName = key.slice(emojiPrefix.length).toLowerCase();
      const roleId = roleIds.get(roleName);
      
      if (roleId) {
        roleMap.set(value, roleId);
        console.log(`Mapped emoji ${value} to role ID ${roleId}`);
      }
    }
  }
  
  if (roleMap.size === 0) {
    console.log("No role emoji mappings found in environment variables. Using defaults.");
  }
  
  return roleMap;
} 