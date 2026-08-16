import { workerData, parentPort } from 'node:worker_threads';
import path from 'node:path';
import fs from 'node:fs';
import { create, globals } from 'webgpu';

import { imageDecoder } from '#worker/decoder.js';
import { asciiConverter } from '#worker/conversion.js';

declare global {
    interface Navigator {
        gpu: ReturnType<typeof create>;
    }
    var navigator: Navigator;
}

Object.defineProperty(globalThis, "navigator", {
    value: { gpu: create([]) },
    writable: false,
    configurable: true,
    enumerable: true
});

Object.assign(globalThis, globals);

export interface workerResult {
    frame: string;
    data?: string;
    id: number;
    error?: string;
}

export class frameWorker {
    private frameName: string;
    private id: number;
    private decoder: imageDecoder;
    private converter: asciiConverter;

    constructor(frameName: string, id: number) {
        this.frameName = frameName;
        this.id = id;

        this.decoder = new imageDecoder();
        this.converter = new asciiConverter(
            path.join(path.dirname(new URL(import.meta.url).pathname), 'shaders')
        );
    }

    async run(): Promise<void> {
        try {
            const filePath = path.resolve(process.cwd(), 'frames', this.frameName);

            if (!fs.existsSync(filePath)) {
                throw new Error(`Frame does not exist: ${filePath}`);
            }

            const { raw, width, height } = this.decoder.decode(filePath);

            const chars : any = '@#*+=-:. ';
            const ascii = await this.converter.convert(raw, width, height, 100, chars);

            const result: workerResult = {
                frame: this.frameName,
                data: ascii,
                id: this.id
            };

            parentPort?.postMessage(result);
        }

        catch (error: any) {
            const result: workerResult = {
                frame: this.frameName,
                id: this.id,
                error: error?.message ?? String(error)
            };

            parentPort?.postMessage(result);
        }

        finally {
            delete (globalThis as any).navigator;
        }
    }
}

const worker = new frameWorker(workerData.frame, workerData.id);
worker.run();
