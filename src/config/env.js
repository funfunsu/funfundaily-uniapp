// config.js
import decConfig from './config.dev'
import prodConfig from './config.prod'

const isDev = import.meta.env.MODE === 'development';
const config = isDev?decConfig : prodConfig;

export default config;