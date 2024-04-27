import sharp from 'sharp';
import chroma from 'chroma-js';

const GLYPHS_IMAGE_FILENAME = 'C:/js-projects/ascii-silhouette/images/printable-ascii-bw-2.png';
const INPUT_IMAGE_FILENAME = 'C:/js-projects/ascii-silhouette/images/xbox.png';
const PALETTE_IMAGE_FILENAME = 'C:/js-projects/ascii-silhouette/images/palette.png';

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
function findClosestColor(r: number, g: number, b: number) {
    const key = (r << 16) | (g << 8) | b;
    const value = closestColorCache.get(key);
    if (value !== undefined) {
        return value;
    }

    let index = 256;
    let error = Number.MAX_VALUE;
    for (let i = 255; i >= 16; --i) {
        const p = palette[i];
        const dr = p[0] - r;
        const dg = p[1] - g;
        const db = p[2] - b;
        const e = dr * dr + dg * dg + db * db;
        if (e < error) {
            error = e;
            index = i;
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
    for (let i = 0, j = 0; i < indices.length; ++i) {
        indices[i] = findClosestColor(data[j++], data[j++], data[j++]);
    }
    return new Image(indices, info.width, info.height);
}



async function loadPaddedImage(glyphWidth: number, glyphHeight: number): Promise<boolean[][]> {
    const image = sharp(INPUT_IMAGE_FILENAME);

    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
        throw new Error('Image dimensions not available');
    }

    const width = Math.ceil(metadata.width / glyphWidth) * glyphWidth;
    const height = Math.ceil(metadata.height / glyphHeight) * glyphHeight;
    const xOffset = Math.floor((width - metadata.width) / 2);
    const yOffset = Math.floor((height - metadata.height) / 2);

    const data = new Array<boolean[]>(height);
    for (let y = height - 1; y >= 0; --y) {
        data[y] = new Array<boolean>(width).fill(false);
    }

    const pixels = await image.raw().toColourspace('b-w').toBuffer();
    for (let y = metadata.height - 1; y >= 0; --y) {
        const Y = metadata.width * y;
        const row = data[y + yOffset];
        for (let x = metadata.width - 1; x >= 0; --x) {
            row[x + xOffset] = (pixels[Y + x] >= 64);
        }
    }

    return data;
}

function findBestGlyph(glyphs: Glyph[], glyphWidth: number, glyphHeight: number, imagePixels: boolean[][],
                       xOffset: number, yOffset: number): Glyph {
    let best = 0;
    outer: for (let i = glyphs.length - 1; i >= 0; --i) {
        const glyph = glyphs[i];
        const glyphPixels = glyph.pixels;
        for (let y = glyphHeight - 1; y >= 0; --y) {
            const glyphRow = glyphPixels[y];
            const imageRow = imagePixels[y + yOffset];
            for (let x = glyphWidth - 1; x >= 0; --x) {
                if (glyphRow[x] && !imageRow[x + xOffset]) {
                    continue outer;
                }
            }
        }
        best = i;
        break;
    }
    return glyphs[best];
}

function convertImage(glyphs: Glyph[], glyphWidth: number, glyphHeight: number, imagePixels: boolean[][]) {
    for (let y = 0; y < imagePixels.length; y += glyphHeight) {
        let s = '';
        for (let x = 0; x < imagePixels[y].length; x += glyphWidth) {
            const glyph = findBestGlyph(glyphs, glyphWidth, glyphHeight, imagePixels, x, y);
            s += glyph.character;
        }
        console.log(s);
    }
}




//
// const imagePixels = await loadPaddedImage(glyphWidth, glyphHeight);
// convertImage(glyphs, glyphWidth, glyphHeight, imagePixels);

