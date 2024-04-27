import sharp from 'sharp';
import chroma from 'chroma-js';
import * as ss from 'simple-statistics';
import * as os from 'os';

const GLYPHS_IMAGE_FILENAME = 'C:/js-projects/ascii-silhouette/images/printable-ascii-bw-2.png';
const INPUT_IMAGE_FILENAME = 'C:/js-projects/ascii-silhouette/images/ubuntu.png';
const PALETTE_IMAGE_FILENAME = 'C:/js-projects/ascii-silhouette/images/palette.png';

const BLACK_LUMINANCE = 10;

const SCALED_GLYPH_WIDTH = 9;
const SCALED_GLYPH_HEIGHT = 19;

const PRINTABLE_ASCII
    = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

class Glyph {
    character: string;
    pixels: boolean[][];
    count: number;

    constructor(character: string, pixels: boolean[][]) {
        this.character = character;
        this.pixels = pixels;
        this.count = 0;
        for (let i = pixels.length - 1; i >= 0; --i) {
            const row = pixels[i];
            for (let j = row.length - 1; j >= 0; --j) {
                if (row[j]) {
                    ++this.count;
                }
            }
        }
    }
}

const glyphs = await (async () => {
    const image = sharp(GLYPHS_IMAGE_FILENAME);

    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
        throw new Error('Image dimensions not available');
    }

    const glyphWidth = metadata.width / PRINTABLE_ASCII.length;
    const glyphHeight = metadata.height;

    const glyphs = new Array<Glyph>(PRINTABLE_ASCII.length);
    const imagePixels = await image.raw().toColourspace('b-w').toBuffer(); // TODO toBuffer can also return the metadata
    for (let i = PRINTABLE_ASCII.length - 1; i >= 0; --i) {
        const glphyPixels = new Array<boolean[]>(glyphHeight);
        const I = i * glyphWidth;
        for (let j = glyphHeight - 1; j >= 0; --j) {
            const row = glphyPixels[j] = new Array<boolean>(glyphWidth);
            const J = I + j * metadata.width;
            for (let k = row.length - 1; k >= 0; --k) {
                row[k] = (imagePixels[J + k] !== 0);
            }
        }
        glyphs[i] = new Glyph(PRINTABLE_ASCII[i], glphyPixels);
    }

    glyphs.sort((a, b) => a.count - b.count);

    return glyphs;
})();
const glyphWidth = glyphs[0].pixels[0].length;
const glyphHeight = glyphs[0].pixels.length;

const palette = await (async () => {
    const image = sharp(PALETTE_IMAGE_FILENAME);
    const imagePixels = await image.raw().toBuffer();

    const palette = new Array<number[]>(256);
    for (let y = 0, p = 0; y < 16; ++y) {
        let Y = (9 + y * 19) * 144;
        for (let x = 0; x < 16; ++x) {
            let X = (4 + x * 9 + Y) * 3;
            palette[p++] = chroma(imagePixels[X], imagePixels[X + 1], imagePixels[X + 2]).lab();
        }
    }
    return palette;
})();

const closestColorCache = new Map<number, number>();
function findClosestColor(r: number, g: number, b: number, a: number) {
    const key = (r << 24) | (g << 16) | (b << 8) | a;
    const value = closestColorCache.get(key);
    if (value !== undefined) {
        return value;
    }
    const alpha = a / 255;

    let index = 0;
    const c = chroma(r, g, b).lab();
    c[0] *= alpha;
    c[1] *= alpha;
    c[2] *= alpha;
    if (c[0] >= BLACK_LUMINANCE) {
        let error = Number.MAX_VALUE;
        for (let i = 255; i >= 16; --i) {
            const p = palette[i];
            const dl = p[0] - c[0];
            const da = p[1] - c[1];
            const db = p[2] - c[2];
            const e = dl * dl + da * da + db * db;
            if (e < error) {
                error = e;
                index = i;
            }
        }
    }

    closestColorCache.set(key, index);
    return index;
}

class Image {
    indices: Uint8Array;
    width: number;
    height: number;

    constructor(indices: Uint8Array, width: number, height: number) {
        this.indices = indices;
        this.width = width;
        this.height = height;
    }

    getIndex(x: number, y: number) {
        const X = Math.round(x);
        const Y = Math.round(y);
        if (X < 0 || Y < 0 || X >= this.width || Y >= this.height) {
            return 0;
        }
        return this.indices[this.width * Y + X];
    }
}

async function loadInputImage(): Promise<Image> {
    const image = sharp(INPUT_IMAGE_FILENAME);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const indices = new Uint8Array(info.width * info.height);
    switch (info.channels) {
        case 1:
            for (let i = 0; i < indices.length; ++i) {
                indices[i] = findClosestColor(data[i], data[i], data[i], 0xFF);
            }
            break;
        case 2:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColor(data[j], data[j], data[j++], data[j++]);
            }
            break;
        case 3:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColor(data[j++], data[j++], data[j++], 0xFF);
            }
            break;
        case 4:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColor(data[j++], data[j++], data[j++], data[j++]);
            }
            break;
    }
    return new Image(indices, info.width, info.height);
}

class Ascii {
    text: string;
    matched: number;

    constructor(text: string, matched: number) {
        this.text = text;
        this.matched = matched;
    }
}

function convert(image: Image, offsetX: number, offsetY: number): Ascii {

    const cols = Math.ceil(image.width / SCALED_GLYPH_WIDTH);
    const rows = Math.ceil(image.height / SCALED_GLYPH_HEIGHT);
    const paddedWidth = Math.ceil(cols * SCALED_GLYPH_WIDTH);
    const paddedHeight = Math.ceil(rows * SCALED_GLYPH_HEIGHT);
    const originX = offsetX + (image.width - paddedWidth) / 2;
    const originY = offsetY + (image.height - paddedHeight) / 2;
    const indexArray = new Array<number>();
    const glyphScaleX = SCALED_GLYPH_WIDTH / glyphWidth;
    const glyphScaleY = SCALED_GLYPH_HEIGHT / glyphHeight;

    let text = '';
    let lastMedianIndex = -1;
    let matched = 0;
    for (let r = 0; r < rows; ++r) {
        const glyphOriginY = originY + SCALED_GLYPH_HEIGHT * r;
        for (let c = 0; c < cols; ++c) {
            const glyphOriginX = originX + SCALED_GLYPH_WIDTH * c;

            indexArray.length = 0;
            for (let y = 0; y < glyphHeight; ++y) {
                const glyphY = glyphOriginY + glyphScaleY * y;
                for (let x = 0; x < glyphWidth; ++x) {
                    const glyphX = glyphOriginX + glyphScaleX * x;
                    const index = image.getIndex(glyphX, glyphY);
                    if (index !== 0) {
                        indexArray.push(index);
                    }
                }
            }
            if (indexArray.length === 0) {
                text += ' ';
                continue;
            }
            const medianIndex = ss.median(indexArray);
            if (lastMedianIndex !== medianIndex) {
                text += `\x1b[38;5;${medianIndex}m`;
                lastMedianIndex = medianIndex;
            }

            let glyphIndex = 0;
            outer: for (let i = glyphs.length - 1; i >= 0; --i) {
                const glyph = glyphs[i];
                const glyphPixels = glyph.pixels;
                for (let y = 0; y < glyphHeight; ++y) {
                    const glyphRow = glyphPixels[y];
                    const glyphY = glyphOriginY + glyphScaleY * y;
                    for (let x = 0; x < glyphWidth; ++x) {
                        const glyphX = glyphOriginX + glyphScaleX * x;
                        const index = image.getIndex(glyphX, glyphY);
                        if (glyphRow[x] && index !== medianIndex) {
                            continue outer;
                        }
                    }
                }
                glyphIndex = i;
                break;
            }
            text += glyphs[glyphIndex].character;
            matched += glyphs[glyphIndex].count;
        }
        text += os.EOL;
    }
    text += '\x1b[0m';

    return new Ascii(text, matched);
}

function sweepConvert(image: Image): Ascii {
    let ascii = new Ascii('', 0);
    for (let y = -glyphHeight; y < glyphHeight; ++y) {
        for (let x = -glyphWidth; x < glyphWidth; ++x) {
            const a = convert(image, x, y);
            if (a.matched > ascii.matched) {
                ascii = a;
            }
        }
    }
    return ascii;
}

const image = await loadInputImage();


const ascii = sweepConvert(image);

console.log(ascii.text);
console.log(ascii.matched);

