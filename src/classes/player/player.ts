function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

import fs from 'node:fs';
import path from 'node:path';

export class framePlayer {
    private frames: Array<[number, string]>;
    private saveAscii: boolean;

    constructor(loadedFrames: Map<number, string>, saveAscii : boolean) {
        this.frames = [...loadedFrames.entries()].sort((a, b) => a[0] - b[0]);
        this.saveAscii = saveAscii;
    }

    async play(fps: number = 144): Promise<void> {
        if (this.frames.length === 0) {
            console.log(`No frames were loaded.`);
            return;
        }

        const frameTime = 1000 / fps;

        console.clear();
        console.log(`Playing ${this.frames.length} frames at ${fps} frames per second.\n`);

        const startTime = performance.now();

       for (let i = 0; i < this.frames.length; i++) {
            const frame = this.frames[i];
            if (!frame) continue;

            const [, ascii] = frame;
            
            if (!fs.existsSync(path.join(process.cwd(), `ascii`))) {
                fs.mkdirSync(path.join(process.cwd(), `ascii`))
            }

            if(this.saveAscii) {
                fs.writeFileSync(path.join(process.cwd(), `ascii`, `${i}.txt`), ascii)
            }

            console.clear();
            process.stdout.write(ascii);

            const targetTime = startTime + ((i + 1) * frameTime);
            const now = performance.now();
            const remaining = targetTime - now;

            if (remaining > 0) {
                await sleep(remaining);
            }
        }


        console.log(`\nPlayback complete.`);
    }
}