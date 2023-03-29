import { load } from "js-yaml";
import { readFileSync } from "fs";

const doc = load(readFileSync("config/config.yml", "utf-8"));

export const types = doc.types;
export const buttons = doc.buttons;
export const messages = doc.messages;