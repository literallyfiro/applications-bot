export interface ConfigData {
    types: {
        [key: string]: {
            name: string,
            description: string,
            questions: {
                [key: number]: {
                    name: string,
                    type: string,
                    min_length: number,
                    max_length: number
                }
            }
        }
    };
    buttons: {
        [key: string]: string
    };
    messages: {
        [key: string]: string
    };
}

import { load } from "js-yaml";
import { readFileSync } from "fs";

const filepath = "config/config.yml";
const yaml = load(readFileSync(filepath, "utf8")) as ConfigData;

export const types = yaml.types;
export const buttons = yaml.buttons;
export const messages = yaml.messages;