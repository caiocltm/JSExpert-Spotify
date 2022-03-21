import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const root = join(currentDir, '..', '../');
const audioDirectory = join(root, 'audio');
const publicDirectory = join(root, 'public');
const songsDirectory = join(audioDirectory, 'songs');
const fxDirectory = join(audioDirectory, 'fx');

export default {
	// eslint-disable-next-line no-extra-boolean-cast
	logEnabled: !!!process.env.LOG_ENABLED,
	port: process.env.PORT || 3000,
	dir: {
		currentDir,
		root,
		audioDirectory,
		publicDirectory,
		songsDirectory,
		fxDirectory
	},
	pages: {
		homeHTML: 'home/index.html',
		controllerHTML: 'controller/index.html'
	},
	location: {
		home: '/home',
		controller: '/controller'
	},
	constants: {
		CONTENT_TYPE: {
			'.html': 'text/html',
			'.css': 'text/css',
			'.js': 'text/javascript'
		},
		audioMediaType: 'mp3',
		songVolume: '0.99',
		fxVolume: '0.1',
		fallbackBitRate: '128000',
		bitRateDivisor: 8,
		englishConversation: join(songsDirectory, 'conversation.mp3')
	},
	commands: {
		start: 'start',
		stop: 'stop',
		applause: 'applause',
		audience_applause: 'audience_applause',
		boo: 'boo',
		fart: 'fart',
		laughing: 'laughing'
	}
};
