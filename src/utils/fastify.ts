import Fastify from 'fastify';

// Export a singleton Fastify instance
const fastify = Fastify({ logger: true });
export default fastify;
