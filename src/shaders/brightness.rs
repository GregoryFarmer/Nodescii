struct Pixels {
    data: array<u32>,
};

struct Output {
    data: array<u32>,
};

@group(0) @binding(0)
var<storage, read> pixels: Pixels;

@group(0) @binding(1)
var<storage, read_write> output: Output;

@compute @workgroup_size(8, 8)
fn main(
    @builtin(global_invocation_id) gid: vec3<u32>
) {
    let ox = gid.x;
    let oy = gid.y;

    let outWidth = {{OUT_WIDTH}}u;
    let outHeight = {{OUT_HEIGHT}}u;
    
    if (ox >= outWidth || oy >= outHeight) {
        return;
    }

    let ix = u32(f32(ox) * {{SAMPLE_X}});
    let iy = u32(f32(oy) * {{SAMPLE_Y}});
    
    if (ix >= {{WIDTH}}u || iy >= {{HEIGHT}}u) {
        return;
    }

    let pixelIndex = iy * {{WIDTH}}u + ix;
    let packed = pixels.data[pixelIndex];
    let r = packed & 0xffu;
    let g = (packed >> 8u) & 0xffu;
    let b = (packed >> 16u) & 0xffu;
    let a = (packed >> 24u) & 0xffu;
    let outputIndex = oy * outWidth + ox;

    if (a < 128u) {
        output.data[outputIndex] = {{MAX_CHAR_INDEX}}u;
        return;
    }

    let brightness = (r * 299u + g * 587u + b * 114u) / 1000u;
    let charIndex = brightness * {{MAX_CHAR_INDEX}}u / 255u;
    output.data[outputIndex] = charIndex;
}