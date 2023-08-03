import { assert } from "https://deno.land/std@0.196.0/assert/assert.ts";
import * as readLines from 'https://deno.land/std@0.101.0/io/mod.ts';

const accepted_chars = 'abcdefghijklmnopqrstuvwxyz ';
const pos = [...accepted_chars].reduce((acc: { [char: string]: number }, char, idx) => {
    acc[char] = idx;
    return acc;
}, {});
let model: { mat: number[][], thresh: number };

function normalize(line: string) {
    return [...line.toLowerCase()].filter(c => c in pos);
}

function* ngram(n: number, l: string) {
    const filtered = normalize(l);
    for (let start = 0; start < filtered.length - n + 1; ++start) {
        yield filtered.slice(start, start + n).join('');
    }
}

async function* get_lines(datasets: string[]) {
    for (let i = 0; i < datasets.length; ++i) {
        const lines = (await Deno.readTextFile(datasets[i])).split('\n');
        for (let j = 0; j < lines.length; ++j) yield lines[j];
    }
}

async function writeJson(path: string, data: object) {
    const encoder = new TextEncoder();
    const content = encoder.encode(JSON.stringify(data));

    try {
        const file = await Deno.open(path, { write: true, create: true });
        await Deno.write(file.rid, content);
        Deno.close(file.rid);
    } catch (error) {
        console.error("Unable to write file:", error);
    }
}

async function fetchProbsFromFile(filename: string, counts: number[][]) {
    const file = await Deno.open(filename);
    const probs: number[] = [];
    for await (const line of readLines.readLines(file)) {
        probs.push(avg_transition_prob(line, counts));
    }
    file.close();

    return probs;
}

function avg_transition_prob(l: string, log_prob_mat: number[][]): number {
    let log_prob = 0.0;
    let transition_ct = 0;

    for (const [a, b] of ngram(2, l)) {
        log_prob += log_prob_mat[pos[a]][pos[b]];
        transition_ct += 1;
    }

    return Math.exp(log_prob / (transition_ct || 1));
}


export async function train(path: string) {
    // The 3-dimensional array counts
    const k = accepted_chars.length;
    const counts = (new Array(k)).fill('').map(() => new Array(k).fill(10));

    for await (const line of get_lines([`${path}/big.txt`])) {
        [...ngram(2, line)].forEach(([a, b]) => {
            counts[pos[a]][pos[b]] += 1;
        });
    }

    // map count to logProbMat
    for (let i = 0; i < counts.length; i++) {
        const row = counts[i];
        const s = row.reduce((acc, val) => acc + val, 0);
        for (let j = 0; j < row.length; j++) {
          row[j] = Math.log(row[j] / s);
        }
    }

    // logic for threshold
    const good_probs = await fetchProbsFromFile(`${path}/good.txt`, counts);
    const bad_probs = await fetchProbsFromFile(`${path}/bad.txt`, counts);

    assert(Math.min(...good_probs) > Math.max(...bad_probs), "Bad threshold");
    const thresh = (Math.min(...good_probs) + Math.max(...bad_probs)) / 2;

    // write the model and threshold into a file and reload it
    const model_path = `${path}/gib_model.json`;
    await writeJson(model_path, { mat: counts, thresh: thresh });
    return await reloadModel(model_path);
}

export async function reloadModel(pathToModel: string) {
    model = await Deno.readTextFile(pathToModel).then(JSON.parse);
    return model;
}

export function testString(str: string) {
    return avg_transition_prob(str, model['mat']) > model['thresh'];
}