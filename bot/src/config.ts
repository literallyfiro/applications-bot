export interface ConfigData {
    configuration: {
        [key: string]: boolean
    };
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

import * as mod from "https://deno.land/std@0.196.0/yaml/mod.ts";

const filepath = "config/config.yml";
const decoder = new TextDecoder("utf-8");
const data = Deno.readFileSync(filepath);
const yaml = mod.parse(decoder.decode(data)) as ConfigData;

export const types = yaml.types;
export const buttons = yaml.buttons;
export const messages = yaml.messages;
export const configuration = yaml.configuration;