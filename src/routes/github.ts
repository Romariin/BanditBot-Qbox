import { Webhooks } from "@octokit/webhooks";
import fastify from "../utils/fastify";
import { commitMessageExclusionKeywords, permittedGithubEvents } from "../config/github";

const webhooks = new Webhooks({
    secret: process.env.GITHUB_SECRET
});

fastify.post('/webhook', async (request, reply) => {
    const payload = request.body as unknown;
    const event = request.headers['X-GitHub-Event'];
    const secret = request.headers['X-Hub-Signature-256'];

    const isValid = await webhooks.verify(JSON.stringify(payload), secret as string);
    if (!isValid) {
        return reply.status(401).send('Invalid signature');
    }

    if (!event || !permittedGithubEvents.includes(event as string)) {
        return reply.status(400).send('Invalid event type');
    }


    // Handle different event types
    switch (event) {
        case 'push':
            // Handle push event
            break;
        case 'pull_request':
            // Handle pull request event
            break;
        default:
            return reply.status(400).send('Invalid event type');
    }
    // Check if the commit message contains any of the exclusion keywords
    const commitMessage = payload.head_commit?.message || '';
    const containsExclusionKeyword = commitMessageExclusionKeywords.some(keyword =>
        commitMessage.toLowerCase().includes(keyword.toLowerCase())
    );
    if (containsExclusionKeyword) {
        return reply.status(200).send('Commit message contains exclusion keyword');
    }
    // Process the event and send a message to the Discord channel
    const channelId = process.env.DISCORD_CHANNEL_ID;
    const channel = await client.channels.fetch(channelId);

    if (!channel || !channel.isText()) {
        return reply.status(404).send('Channel not found');
    }

    const message = `New event from GitHub: ${event} - ${action} in ${repoName} by ${sender.login}`;
    await channel.send(message);
    return reply.status(200).send('Webhook handled successfully');
}
);