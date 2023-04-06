import {format, promisify} from "util";
import fs from 'fs';
import {config} from 'dotenv';

const writeFilePromise = promisify(fs.writeFile);

config();

export async function download(url_file_path: string, effective_file_path: string) {
    const url = format("https://api.telegram.org/file/bot%s/%s", process.env.BOT_TOKEN, url_file_path);
    await fetch(url)
        .then(x => x.arrayBuffer())
        .then(x => writeFilePromise(effective_file_path, Buffer.from(x)));
    return fs.readFileSync(effective_file_path, 'utf-8');
}