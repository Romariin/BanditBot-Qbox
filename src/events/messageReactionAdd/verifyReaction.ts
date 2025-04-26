import { MessageReaction, User, Client } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

export default async function(client: Client, reaction: MessageReaction, user: User) {
  if (user.bot) return;

  if (!reaction.message.guild) return;

  if (reaction.emoji.name !== '✅') return;

  try {
    if (!reaction.message.embeds.length) return;
    
    const embed = reaction.message.embeds[0];
    if (!embed.title || !embed.title.includes("Discord Verification")) return;
    
    const member = await reaction.message.guild.members.fetch(user.id);
    
    const verificationRoleId = process.env.ROLE_VERIFIED || "1303289466575917108";
    

    const role = reaction.message.guild.roles.cache.get(verificationRoleId);
    
    if (!role) {
      console.error(`Verification role with ID ${verificationRoleId} not found in the server`);
      return;
    }
    
    if (member.roles.cache.has(verificationRoleId)) {
      console.log(`User ${user.tag} is already verified`);
      await reaction.users.remove(user.id);
      return;
    }
    
    try {
      await member.roles.add(verificationRoleId);
      console.log(`Verified user ${user.tag}`);
      

      try {
        await user.send({
          content: `You have been verified in **${reaction.message.guild.name}**! You now have access to the server.`
        });
      } catch (dmError) {
        console.log(`Could not send welcome DM to ${user.tag}`);
      }
      
      await reaction.users.remove(user.id);
    } catch (error) {
      console.error(`Failed to verify user ${user.tag}:`, error);
    }
  } catch (error) {
    console.error("Error handling verification reaction:", error);
  }
} 