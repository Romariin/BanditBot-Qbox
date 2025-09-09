import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { EMBED_COLOR } from '../utils/constants';

interface GitHubCommit {
  id: string;
  message: string;
  timestamp: string;
  url: string;
  author: {
    avatar_url: string;
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
  sender: {
    name: string;
    email: string;
    avatar_url: string;
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

  private createPushEmbed(commits: GitHubCommit[], repository: any, sender: any, ref: string): EmbedBuilder {
    // Extraire le nom de la branche depuis ref (format: refs/heads/branch-name)
    const branch = ref.replace('refs/heads/', '');
    
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTimestamp(new Date())
      .setAuthor({ 
        name: sender.name, 
        iconURL: commits[0]?.author.avatar_url || undefined,
        url: sender.html_url
      })
      .setTitle(`**[\`${repository.name}:${branch}\`]** ${commits.length} nouveau${commits.length > 1 ? 'x' : ''} commit${commits.length > 1 ? 's' : ''}`)
      .setURL(repository.html_url);

    let description = '';

    // Afficher tous les commits dans la même section
    for (const commit of commits) {
      const shortId = commit.id.substring(0, 7);
      const isHidden = this.isHiddenCommit(commit.message);
      
      if (isHidden) {
        const censoredMessage = this.generateCensoredText(commit.message);
        description += `[🔒 \`${shortId}\`](${commit.url}) ${censoredMessage}\n`;
      } else {
        description += `[\`${shortId}\`](${commit.url}) ${commit.message}\n`;
      }
    }

    embed.setDescription(description.trim());

    // Calculer les statistiques totales
    const totalAdded = commits.reduce((sum, commit) => sum + commit.added.length, 0);
    const totalModified = commits.reduce((sum, commit) => sum + commit.modified.length, 0);
    const totalRemoved = commits.reduce((sum, commit) => sum + commit.removed.length, 0);

    if (totalAdded > 0 || totalModified > 0 || totalRemoved > 0) {
      const statsText = [];
      if (totalAdded > 0) statsText.push(`${totalAdded} ajouté${totalAdded > 1 ? 's' : ''}`);
      if (totalModified > 0) statsText.push(`${totalModified} modifié${totalModified > 1 ? 's' : ''}`);
      if (totalRemoved > 0) statsText.push(`${totalRemoved} supprimé${totalRemoved > 1 ? 's' : ''}`);
      
      embed.setFooter({ text: statsText.join(' • ') });
    }

    return embed;
  }

  public async handlePushEvent(payload: GitHubPushPayload): Promise<void> {
    if (!this.channelId) {
      console.log('Aucun canal GitHub configuré, événement ignoré');
      return;
    }

    // Ignorer les push sans commits
    if (!payload.commits || payload.commits.length === 0) {
      console.log('Push sans commits, événement ignoré');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(this.channelId) as TextChannel;
      if (!channel) {
        console.error('Canal GitHub introuvable');
        return;
      }

      // Créer un seul embed pour tous les commits
      const embed = this.createPushEmbed(payload.commits, payload.repository, payload.sender, payload.ref);
      await channel.send({ embeds: [embed] });

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
