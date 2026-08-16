import { Worker } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface workerMessage {
    frame: string;
    data?: string;
    id: number;
    error?: string;
}

export class frameCompiler {
    private framesDir: string;
    private workerPath: string;
    private loaded: Map<number, string>;
    private maxCpus: number;

    constructor(framesDir: string, workerPath: string, maxCpus: number) {
        this.framesDir = framesDir;
        this.workerPath = workerPath;
        this.loaded = new Map<number, string>();
        this.maxCpus = maxCpus;
    }

    getFrames(): string[] {
        return fs.readdirSync(this.framesDir)
            .filter(file => file.toLowerCase().endsWith('.png'))
            .sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
            );
    }

    async compile(useCPU : boolean): Promise<Map<number, string>> {
        const frames = this.getFrames();

        if (frames.length === 0) {
            console.log('No PNG frames found.');
            return this.loaded;
        }

        const maxWorkers = this.maxCpus;

        console.log(`Now compiling shaders, please wait!`);
        console.log(`Frame Count: ${frames.length}\nWorkers: ${maxWorkers}`);

        let nextIndex = 0;
        let activeWorkers = 0;
        let completed = 0;
        let nextId = 0;

        return new Promise(resolve => {
            const spawnNext = () => {
                if (nextIndex >= frames.length) return;

                const frame = frames[nextIndex++];
                const id = ++nextId;
                activeWorkers++;

                const worker = new Worker(this.workerPath, {
                    workerData: { frame, id, useCPU }
                });

                let workerFinished = false;

                worker.on('message', (msg: workerMessage) => {
                    const { frame, data, id, error } = msg;

                    if (error) {
                        console.error(`\nFailed to process ${frame}: ${error}`);
                        return;
                    }

                    if (data !== undefined) {
                        this.loaded.set(id, data);
                    }

                    completed++;

                    const percent = ((completed / frames.length) * 100).toFixed(1);
                    process.stdout.write(
                        `\rCompiling shaders. ${completed}/${frames.length} (${percent}%)`
                    );
                });

                worker.on('error', err => {
                    console.error(`\nWorker ${id} failed:`, err);

                    if (!workerFinished) {
                        workerFinished = true;
                        activeWorkers--;
                        spawnNext();

                        if (activeWorkers === 0 && nextIndex >= frames.length) {
                            resolve(this.loaded);
                        }
                    }
                });

                worker.on('exit', code => {
                    if (workerFinished) return;

                    workerFinished = true;
                    activeWorkers--;

                    if (code !== 0) {
                        console.error(`\nWorker ${id} exited with code ${code}`);
                    }

                    spawnNext();

                    if (activeWorkers === 0 && nextIndex >= frames.length) {
                        process.stdout.write('\n');
                        resolve(this.loaded);
                    }
                });
            };

            for (let i = 0; i < maxWorkers && i < frames.length; i++) {
                spawnNext();
            }
        });
    }
}
