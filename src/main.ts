import sharp from 'sharp';

const GLYPHS_IMAGE_FILENAME = 'C:/js-projects/ascii-silhouette/images/printable-ascii-bw.png';
const INPUT_IMAGE_FILENAME = 'C:/js-projects/ascii-silhouette/images/circle.png';

const PRINTABLE_ASCII
    = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

class Glyph {
    character: string;
    pixels: boolean[][];

    constructor(character: string, pixels: boolean[][]) {
        this.character = character;
        this.pixels = pixels;
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

    console.log(`${glyphWidth} ${glyphHeight}`);

    const glyphs = new Array<Glyph>(PRINTABLE_ASCII.length);
    for (let i = PRINTABLE_ASCII.length - 1; i >= 0; --i) {
        const pixels = new Array<boolean[]>(glyphHeight);
        for (let j = glyphHeight - 1; j >= 0; --j) {
            pixels[j] = new Array<boolean>(glyphWidth);
        }
        glyphs[i] = new Glyph(PRINTABLE_ASCII[i], pixels);
    }

    const pixels = await image.raw().toColourspace('b-w').toBuffer();
    for (let i = glyphs.length - 1; i >= 0; --i) {
        const glyph = glyphs[i];
        const I = i * glyphWidth;
        for (let j = glyph.pixels.length - 1; j >= 0; --j) {
            const J = I + j * metadata.width;
            const row = glyph.pixels[j];
            for (let k = row.length - 1; k >= 0; --k) {
                row[k] = pixels[J + k] !== 0;
            }
        }
    }

    return glyphs;
}

await loadGlyphs();