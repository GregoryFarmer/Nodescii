import path from 'node:path';
import os from 'node:os';
import { frameCompiler } from '#player/compiler.js';
import { framePlayer } from '#player/player.js';

const configuration = {
    fps: 60,
    maxCpus: Math.min(os.cpus().length, 16),
    looped: true,
}

async function main() {
    const framesDir = path.join(process.cwd(), `frames`);
    const workerPath = path.join(process.cwd(), `dist`, `classes`, `worker`, `worker.js`);

    const compiler = new frameCompiler(framesDir, workerPath, configuration.maxCpus);

    const start = performance.now();
    const loaded = await compiler.compile();
    const compileTime = (performance.now() - start) / 1000;

    const player = new framePlayer(loaded);
    await player.play(configuration.fps);
    while (configuration.looped) {
        await player.play(configuration.fps);
    }
    console.log(`Compiled ${loaded.size} frames in ${compileTime.toFixed(2)}s.`);
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});