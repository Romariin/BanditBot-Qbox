import express from 'express';
import crypto from 'crypto';
import { Client } from 'discord.js';
import { GitHubHandler } from '../handlers/githubHandler';

export class GitHubWebhookServer {
  private app: express.Application;
  private githubHandler: GitHubHandler;
  private webhookSecret: string;
  private port: number;

  constructor(client: Client, port: number = 3000) {
    this.app = express();
    this.githubHandler = new GitHubHandler(client);
    this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || '';
    this.port = port;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Middleware pour parser le JSON avec raw body pour la vérification de signature
    this.app.use('/webhook/github', express.raw({ type: 'application/json' }));
    this.app.use(express.json());
  }

  private verifyGitHubSignature(payload: Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('GITHUB_WEBHOOK_SECRET non défini, signature non vérifiée');
      return true; // Permettre sans vérification si pas de secret configuré
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    const actualSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(actualSignature, 'hex')
    );
  }

  private setupRoutes(): void {
    // Route de santé
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'OK', message: 'GitHub Webhook Server is running' });
    });

    // Route principale pour les webhooks GitHub
    this.app.post('/webhook/github', async (req, res) => {
      try {
        const signature = req.headers['x-hub-signature-256'] as string;
        const eventType = req.headers['x-github-event'] as string;
        
        if (!signature) {
          return res.status(401).json({ error: 'Signature manquante' });
        }

        // Vérifier la signature
        if (!this.verifyGitHubSignature(req.body, signature)) {
          return res.status(401).json({ error: 'Signature invalide' });
        }

        // Parser le payload
        const payload = JSON.parse(req.body.toString());

        console.log(`Événement GitHub reçu: ${eventType}`);

        // Traiter l'événement selon son type
        switch (eventType) {
          case 'push':
            await this.githubHandler.handlePushEvent(payload);
            break;
          case 'ping':
            console.log('Ping reçu de GitHub');
            break;
          default:
            await this.githubHandler.handleOtherEvents(eventType, payload);
        }

        res.status(200).json({ message: 'Événement traité avec succès' });
      } catch (error) {
        console.error('Erreur lors du traitement du webhook GitHub:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
      }
    });
  }

  public start(): void {
    this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`🚀 Serveur webhook GitHub démarré sur le port ${this.port}`);
      console.log(`📡 Endpoint webhook: http://0.0.0.0:${this.port}/webhook/github`);
      console.log(`🌐 Webhook accessible publiquement sur le port ${this.port}`);
    });
  }

  public getGitHubHandler(): GitHubHandler {
    return this.githubHandler;
  }
}
