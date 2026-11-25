import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig,loadEnv } from 'vite';
export default defineConfig(({mode})=>{
 const settings=loadEnv(mode,process.cwd(),'');
 for(const key of ['DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD','DB_CONNECTION_LIMIT','DB_SSL','APP_URL','AUTH_SETUP_TOKEN'])if(process.env[key]===undefined&&settings[key]!==undefined)process.env[key]=settings[key];
 return {plugins:[vinext()],css:{postcss:{plugins:[tailwindcss()]}},ssr:{external:['mysql2']}};
});
