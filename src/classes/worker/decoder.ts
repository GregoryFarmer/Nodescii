import fs from 'node:fs';
import zlib from 'node:zlib';

export interface decodedImage {
    raw: Uint8Array;
    width: number;
    height: number;
}

export class imageDecoder {
    decode(filePath: string): decodedImage {
        const buffer = fs.readFileSync(filePath);

        const pngSignature = Buffer.from([
            0x89, 0x50, 0x4e, 0x47,
            0x0d, 0x0a, 0x1a, 0x0a
        ]);

        if (!buffer.subarray(0, 8).equals(pngSignature)) {
            throw new Error(`Not a valid PNG file: ${filePath}`);
        }

        let offset = 8;

        let width : any = 0;
        let height : any = 0;
        let bitDepth : any = 0;
        let colorType : any = 0;
        let compressionMethod : any = 0;
        let filterMethod : any = 0;
        let interlaceMethod : any = 0; 

        const compressedChunks: Buffer[] = [];

        while (offset < buffer.length) {
            const length = buffer.readUInt32BE(offset);
            const type = buffer.toString('ascii', offset + 4, offset + 8);

            const dataStart = offset + 8;
            const dataEnd = dataStart + length;
            const crcEnd = dataEnd + 4;

            if (type === 'IHDR') {
                width = buffer.readUInt32BE(dataStart);
                height = buffer.readUInt32BE(dataStart + 4);
                bitDepth = buffer[dataStart + 8];
                colorType = buffer[dataStart + 9];
                compressionMethod = buffer[dataStart + 10];
                filterMethod = buffer[dataStart + 11];
                interlaceMethod = buffer[dataStart + 12];
            } else if (type === 'IDAT') {
                compressedChunks.push(buffer.subarray(dataStart, dataEnd));
            } else if (type === 'IEND') {
                break;
            }

            offset = crcEnd;
        }

        if (colorType !== 6) {
            throw new Error(`Unsupported PNG color type ${colorType}. Expected RGBA (6).`);
        }
        if (bitDepth !== 8) {
            throw new Error(`Unsupported PNG bit depth ${bitDepth}. Expected 8-bit.`);
        }
        if (interlaceMethod !== 0) {
            throw new Error(`Interlaced PNGs are not supported.`);
        }

        const decompressed = zlib.inflateSync(Buffer.concat(compressedChunks));

        return this.reconstruct(decompressed, width, height);
    }

    private reconstruct(
        decompressed: Uint8Array,
        width: number,
        height: number
    ): decodedImage {
        const bytesPerPixel = 4;
        const stride = width * bytesPerPixel;
        const scanlineLength = stride + 1;

        const raw = new Uint8Array(width * height * bytesPerPixel);

        for (let y = 0; y < height; y++) {
            const scanlineStart = y * scanlineLength;
            const filter = decompressed[scanlineStart];
            const line = decompressed.subarray(scanlineStart + 1, scanlineStart + 1 + stride);

            const rowOffset = y * stride;
            const prevRowOffset = (y - 1) * stride;

            for (let x = 0; x < stride; x++) {
                const rawByte : any = line[x];

                const left : any = x >= bytesPerPixel ? raw[rowOffset + x - bytesPerPixel] : 0;
                const above : any = y > 0 ? raw[prevRowOffset + x] : 0;
                const upperLeft : any = y > 0 && x >= bytesPerPixel ? raw[prevRowOffset + x - bytesPerPixel] : 0;

                let reconstructed : any;

                switch (filter) {
                    case 0:
                        reconstructed = rawByte;
                        break;
                    case 1:
                        reconstructed = (rawByte + left) & 0xff;
                        break;
                    case 2:
                        reconstructed = (rawByte + above) & 0xff;
                        break;
                    case 3:
                        reconstructed = (rawByte + Math.floor((left + above) / 2)) & 0xff;
                        break;
                    case 4: {
                        const p = left + above - upperLeft;
                        const pa = Math.abs(p - left);
                        const pb = Math.abs(p - above);
                        const pc = Math.abs(p - upperLeft);
                        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? above : upperLeft;
                        reconstructed = (rawByte + predictor) & 0xff;
                        break;
                    }
                    default:
                        throw new Error(`Unsupported PNG filter ${filter} on row ${y}.`);
                }

                raw[rowOffset + x] = reconstructed;
            }
        }

        return { raw, width, height };
    }
}
