import sharp from 'sharp';

const GLYPHS_IMAGE_FILENAME = 'C:/js-projects/ascii-silhouette/images/printable-ascii-bw-2.png';
const INPUT_IMAGE_FILENAME = 'C:/js-projects/ascii-silhouette/images/xbox.png';

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

async function loadGlyphs(): Promise<Glyph[]> {
    const image = sharp(GLYPHS_IMAGE_FILENAME);

    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
        throw new Error('Image dimensions not available');
    }

    const glyphWidth = metadata.width / PRINTABLE_ASCII.length;
    const glyphHeight = metadata.height;

    const glyphs = new Array<Glyph>(PRINTABLE_ASCII.length);
    const imagePixels = await image.raw().toColourspace('b-w').toBuffer();
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

const glyphs = await loadGlyphs();
const glyphWidth = glyphs[0].pixels[0].length;
const glyphHeight = glyphs[0].pixels.length;

const imagePixels = await loadPaddedImage(glyphWidth, glyphHeight);
convertImage(glyphs, glyphWidth, glyphHeight, imagePixels);

