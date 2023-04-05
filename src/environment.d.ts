import { config } from 'dotenv';
config();

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            BOT_TOKEN: string;
            PASTEE_KEY: string;
            LOG_GROUP_ID: number;
            ADMIN_GROUP_ID: number;
            MONGODB_USER: string;
            MONGODB_PASSWORD: string;
            MONGODB_URI: string;
        }
    }
}
