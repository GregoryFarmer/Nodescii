/**
 *   _  _         _            _ _ 
 *  | \| |___  __| |___ ___ __(_|_)
 *  | .` / _ \/ _` / -_|_-</ _| | |
 *  |_|\_\___/\__,_\___/__/\__|_|_|
 * @name main.ts
 * @author Gregory Michael Farmer 
 * @since August 16th, 2026
 * @description The entrypoint file for the rendering engine.                            
 */
import path from 'node:path';
import os from 'node:os';
import { frameCompiler } from '#player/compiler.js';
import { framePlayer } from '#player/player.js';

const configuration = {
    fps: 60, // How fast the playback should render.
    maxCpus: Math.min(os.cpus().length, 16), // How many workers should be spawned. Warning: A high number would cause performance issues.
    looped: false, // Whether playback should be looped.
    saveAscii: true, // Whether during playback frames should be saved to an /ascii folder in text files.
    useCPU: true, // Whether it should use the CPU instead of the GPU.
}

async function main() {
    const framesDir = path.join(process.cwd(), `frames`);
    const workerPath = path.join(process.cwd(), `dist`, `classes`, `worker`, `worker.js`);

    const compiler = new frameCompiler(framesDir, workerPath, configuration.maxCpus);

    const start = performance.now();
    const loaded = await compiler.compile(configuration.useCPU);
    const compileTime = (performance.now() - start) / 1000;

    const player = new framePlayer(loaded, configuration.saveAscii);
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