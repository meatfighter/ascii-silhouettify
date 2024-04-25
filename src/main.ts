import sharp from 'sharp';

const GLYPHS_IMAGE_FILENAME = 'C:/js-projects/ascii-silhouette/images/printable-ascii-bw.png';

const PRINTABLE_ASCII
    = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

async function loadGlyphs(): Promise<boolean[][][]> {
    const image = sharp(GLYPHS_IMAGE_FILENAME);

    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
        throw new Error('Image dimensions not available');
    }

    const glyphWidth = metadata.width / PRINTABLE_ASCII.length;
    const glyphHeight = metadata.height;

    console.log(`${glyphWidth} ${glyphHeight}`);

    const glyphs: boolean[][][] = new Array<boolean[][]>(PRINTABLE_ASCII.length);
    for (let i = PRINTABLE_ASCII.length - 1; i >= 0; --i) {
        glyphs[i] = new Array<boolean[]>(glyphHeight);
        for (let j = glyphHeight - 1; j >= 0; --j) {
            glyphs[i][j] = new Array<boolean>(glyphWidth);
        }
    }

    const pixels = await image.raw().toColourspace('b-w').toBuffer();
    for (let i = glyphs.length - 1; i >= 0; --i) {
        const glyph = glyphs[i];
        for (let j = glyph.length - 1; j >= 0; --j) {
            const row = glyph[j];
            for (let k = row.length - 1; k >= 0; --k) {
                row[k] = pixels[i * glyphWidth + j * metadata.width + k] !== 0;
            }
        }
    }

    return glyphs;
}

await loadGlyphs();