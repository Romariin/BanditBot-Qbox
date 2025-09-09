import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { EMBED_COLOR } from '../utils/constants';

interface GitHubCommit {
  id: string;
  message: string;
  timestamp: string;
  url: string;
  author: {
    name: string;
    username: string;
    email: string;
  };
  added: string[];
  removed: string[];
  modified: string[];
}

interface GitHubPushPayload {
  ref: string;
  repository: {
    name: string;
    full_name: string;
    html_url: string;
  };
  pusher: {
    name: string;
    email: string;
  };
  commits: GitHubCommit[];
  head_commit: GitHubCommit;
}

export class GitHubHandler {
  private client: Client;
  private channelId: string | null = null;

  constructor(client: Client) {
    this.client = client;
    // Récupérer l'ID du canal depuis les variables d'environnement
    this.channelId = process.env.GITHUB_CHANNEL_ID || null;
  }

  public setChannelId(channelId: string): void {
    this.channelId = channelId;
  }

  public getChannelId(): string | null {
    return this.channelId;
  }

  private isHiddenCommit(message: string): boolean {
    const hiddenKeywords = ['hidden', 'hide', 'secret', 'private', 'wip', 'temp'];
    const lowerMessage = message.toLowerCase();
    
    return hiddenKeywords.some(keyword => 
      lowerMessage.includes(keyword) || 
      lowerMessage.includes(`[${keyword}]`) ||
      lowerMessage.includes(`(${keyword})`)
    );
  }

  private generateCensoredText(text: string): string {
    const censorChars = ['█', '▌', '▎', '▏', '▊', '▋', '▍'];
    let result = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === ' ') {
        result += ' ';
      } else if (char === ':' || char === '(' || char === ')' || char === '[' || char === ']') {
        result += char;
      } else {
        // Utiliser l'index du caractère pour avoir une "cohérence" dans le masquage
        const censorIndex = (char.charCodeAt(0) + i) % censorChars.length;
        result += censorChars[censorIndex];
      }
    }
    
    return result;
  }

  private createCommitEmbed(commit: GitHubCommit, repository: any, isHidden: boolean = false): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTimestamp(new Date(commit.timestamp));

    if (isHidden) {
      const censoredMessage = this.generateCensoredText(commit.message);
      const censoredAuthor = this.generateCensoredText(commit.author.name);
      const censoredRepo = this.generateCensoredText(repository.name);
      
      embed
        .setTitle('🔒 Commit masqué')
        .setDescription(`\`${censoredMessage}\``)
        .addFields(
          { name: '👤 Auteur', value: `\`${censoredAuthor}\``, inline: true },
          { name: '📁 Repository', value: `\`${censoredRepo}\``, inline: true },
          { name: '🔗 Lien', value: `\`${this.generateCensoredText('Voir le commit')}\``, inline: true }
        )
        .setFooter({ text: 'Commit contient du contenu masqué' });
    } else {
      const changesText = [];
      if (commit.added.length > 0) changesText.push(`+${commit.added.length} ajouté(s)`);
      if (commit.modified.length > 0) changesText.push(`~${commit.modified.length} modifié(s)`);
      if (commit.removed.length > 0) changesText.push(`-${commit.removed.length} supprimé(s)`);

      embed
        .setTitle('📝 Nouveau commit')
        .setDescription(commit.message)
        .addFields(
          { name: '👤 Auteur', value: commit.author.name, inline: true },
          { name: '🔗 Repository', value: `[${repository.name}](${repository.html_url})`, inline: true }
        );

      if (changesText.length > 0) {
        embed.addFields({ name: '📊 Changements', value: changesText.join(' • '), inline: false });
      }

      embed.addFields({ name: '🔗 Lien', value: `[Voir le commit](${commit.url})`, inline: false });
    }

    return embed;
  }

  public async handlePushEvent(payload: GitHubPushPayload): Promise<void> {
    if (!this.channelId) {
      console.log('Aucun canal GitHub configuré, événement ignoré');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(this.channelId) as TextChannel;
      if (!channel) {
        console.error('Canal GitHub introuvable');
        return;
      }

      // Traiter chaque commit
      for (const commit of payload.commits) {
        const isHidden = this.isHiddenCommit(commit.message);
        const embed = this.createCommitEmbed(commit, payload.repository, isHidden);
        
        await channel.send({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification GitHub:', error);
    }
  }

  public async handleOtherEvents(eventType: string, payload: any): Promise<void> {
    if (!this.channelId) return;

    try {
      const channel = await this.client.channels.fetch(this.channelId) as TextChannel;
      if (!channel) return;

      // Gérer d'autres types d'événements GitHub si nécessaire
      switch (eventType) {
        case 'issues':
          // Gérer les événements d'issues
          break;
        case 'pull_request':
          // Gérer les pull requests
          break;
        default:
          console.log(`Événement GitHub non géré: ${eventType}`);
      }
    } catch (error) {
      console.error(`Erreur lors du traitement de l'événement ${eventType}:`, error);
    }
  }
}
