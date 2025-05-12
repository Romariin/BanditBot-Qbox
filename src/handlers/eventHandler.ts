import fs from 'node:fs';
import path from 'node:path';
import type { Client, ClientEvents } from 'discord.js';

type HandlerFn = (client: Client, ...args: unknown[]) => Promise<void> | void;

export default function registerEvents(client: Client) {
	const eventsRoot = path.join(__dirname, '..', 'events');

	const eventFolders = fs
		.readdirSync(eventsRoot, { withFileTypes: true })
		.filter(d => d.isDirectory())
		.map(d => d.name)
		.sort((a, b) => a.localeCompare(b));

	for (const folder of eventFolders) {
		const folderPath = path.join(eventsRoot, folder);

		const handlers: HandlerFn[] = fs
			.readdirSync(folderPath)
			.filter(f => f.endsWith('.ts') || f.endsWith('.js'))
			.sort((a, b) => a.localeCompare(b))
			.map(file => {
				const mod = require(path.join(folderPath, file));
				if (typeof mod.default !== 'function') {
					throw new Error(`Event handler "${file}" in "${folder}" has no default export`);
				}
				return mod.default as HandlerFn;
			});

		console.log(`Registered and cached ${handlers.length} handler(s) for event "${folder}".`);

		const listener = async (...args: unknown[]) => {
			try {
				await Promise.all(
					handlers.map(fn => Promise.resolve(fn(client, ...args)).catch(err => console.error(`[${folder}] handler error:`, err)))
				);
			} catch (err) {
				console.error(`[${folder}] listener error:`, err);
			}
		};

		client.on(folder as keyof ClientEvents, listener);
	}

	console.log(`Total event groups loaded: ${eventFolders.length}`);
}
