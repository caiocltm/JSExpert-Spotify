import config from './config/config.js';
import server from './server.js';
import { logger } from './utils/log.util.js';

server()
	.listen(config.port)
	.on('listening', () => logger.info(`Server running on port ${config.port}!`))
	.on('close', () => logger.info('Server closed connection!'))
	.on('error', (error) => logger.error(`An error occurred on HTTP server: [${JSON.stringify(error)}]`));
