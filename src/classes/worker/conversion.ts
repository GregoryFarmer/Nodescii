import fs from 'node:fs';
import path from 'node:path';

interface formatValues {
    [key: string]: string | number;
}

export interface convertOptions {
    raw: Uint8ClampedArray | Uint8Array;
    width: number;
    height: number;
    targetWidth: number;
    chars: string[];
}

const GPUBufferUsage = {
    MAP_READ: 1 << 0,
    MAP_WRITE: 1 << 1,
    COPY_SRC: 1 << 2,
    COPY_DST: 1 << 3,
    INDEX: 1 << 4,
    VERTEX: 1 << 5,
    UNIFORM: 1 << 6,
    STORAGE: 1 << 7,
    INDIRECT: 1 << 8,
    QUERY_RESOLVE: 1 << 9,
} as const;

const GPUMapMode = {
    READ: 1,
    WRITE: 2
} as const;

export class asciiConverter {
    private shaderDir: string;
    private useCPU: boolean;

    constructor(shaderDir: string, useCPU: boolean) {
        this.shaderDir = shaderDir;
        this.useCPU = useCPU;
    }

    async convert(
        raw: Uint8ClampedArray | Uint8Array,
        width: number,
        height: number,
        targetWidth: number,
        chars: string[]
    ): Promise<string> {
        if (this.useCPU) {
            return this.cpuConvert(raw, width, height, targetWidth, chars);
        }else{
            try {
                return await this.gpuConvert(raw, width, height, targetWidth, chars);
            } catch {
                return this.cpuConvert(raw, width, height, targetWidth, chars);
            }
        }
    }

    async gpuConvert(
        raw: Uint8ClampedArray | Uint8Array,
        width: number,
        height: number,
        targetWidth: number,
        chars: string[]
    ): Promise<string> {
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        });

        if (!adapter) {
            throw new Error('No WebGPU adapter available.');
        }

        const device = await adapter.requestDevice();

        const sampleX = width / targetWidth;
        const sampleY = sampleX * 2;

        const outWidth = targetWidth;
        const outHeight = Math.ceil(height / sampleY);
        const outSize = outWidth * outHeight;

        const pixelData32 : any = new Uint32Array(raw.buffer);

        const inputBuffer = device.createBuffer({
            size: pixelData32.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        const outputBuffer = device.createBuffer({
            size: outSize * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        const readBuffer = device.createBuffer({
            size: outSize * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        device.queue.writeBuffer(inputBuffer, 0, pixelData32);

        const shaderPath = path.join(this.shaderDir, 'brightness.rs');
        const shaderTemplate = fs.readFileSync(shaderPath, 'utf8');

        const shaderCode = this.format(shaderTemplate, {
            WIDTH: width,
            HEIGHT: height,
            OUT_WIDTH: outWidth,
            OUT_HEIGHT: outHeight,
            SAMPLE_X: sampleX,
            SAMPLE_Y: sampleY,
            MAX_CHAR_INDEX: chars.length - 1
        });

        const shaderModule = device.createShaderModule({ code: shaderCode });

        const pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'main'
            }
        });

        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: inputBuffer } },
                { binding: 1, resource: { buffer: outputBuffer } }
            ]
        });

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();

        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(
            Math.ceil(outWidth / 8),
            Math.ceil(outHeight / 8)
        );
        pass.end();

        encoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outSize * 4);
        device.queue.submit([encoder.finish()]);

        await readBuffer.mapAsync(GPUMapMode.READ);

        const indices = new Uint32Array(readBuffer.getMappedRange());
        readBuffer.unmap();

        let ascii = '';
        for (let y = 0; y < outHeight; y++) {
            let line = '';
            for (let x = 0; x < outWidth; x++) {
                const idx : any = indices[y * outWidth + x];
                line += chars[Math.min(idx, chars.length - 1)];
            }
            ascii += line + '\n';
        }

        return ascii;
    }

    cpuConvert(
        raw: Uint8ClampedArray | Uint8Array,
        width: number,
        height: number,
        targetWidth: number,
        chars: string[]
    ): string {
        const bytesPerPixel = 4;
        const stride = width * bytesPerPixel;

        const sampleX = width / targetWidth;
        const sampleY = sampleX * 2;

        let ascii = '';

        for (let y = 0; y < height; y += sampleY) {
            const iy = Math.min(Math.floor(y), height - 1);
            const rowPtr = iy * stride;

            for (let x = 0; x < width; x += sampleX) {
                const ix = Math.min(Math.floor(x), width - 1);
                const idx = rowPtr + ix * bytesPerPixel;

                const r : any = raw[idx];
                const g : any = raw[idx + 1];
                const b : any = raw[idx + 2];
                const a : any = raw[idx + 3];

                if (a < 128) {
                    ascii += ' ';
                    continue;
                }

                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                const charIndex = Math.floor((brightness / 255) * (chars.length - 1));

                ascii += chars[Math.min(charIndex, chars.length - 1)];
            }

            ascii += '\n';
        }

        return ascii;
    }

    format(template: string, values: formatValues): string {
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            if (!(key in values)) {
                throw new Error(`Missing format value: ${key}`);
            }
            return String(values[key]);
        });
    }
}
