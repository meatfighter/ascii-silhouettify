import sharp from 'sharp';

const GLYPHS_IMAGE_FILENAME = 'assets/glyphs.png';

const PRINTABLE_ASCII
    = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

export class Glyph {
    character: string;
    htmlEscapedCharacter: string;
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

        switch (character) {
            case '&':
                this.htmlEscapedCharacter = '&amp;';
                break;
            case '<':
                this.htmlEscapedCharacter = '&lt;';
                break;
            case '>':
                this.htmlEscapedCharacter = '&gt;';
                break;
            case '"':
                this.htmlEscapedCharacter = '&quot;';
                break;
            case "'":
                this.htmlEscapedCharacter = '&apos;';
                break;
            default:
                this.htmlEscapedCharacter = character;
                break;
        }
    }
}

export const glyphTable: number[][] = [];
export const glyphs = new Array<Glyph>(PRINTABLE_ASCII.length);
await (async () => {
    const { data, info } = await sharp(GLYPHS_IMAGE_FILENAME).raw().toColourspace('b-w')
        .toBuffer({ resolveWithObject: true });
    const glyphWidth = info.width / PRINTABLE_ASCII.length;
    const glyphHeight = info.height;

    for (let i = PRINTABLE_ASCII.length - 1; i >= 0; --i) {
        const glphyPixels = new Array<boolean[]>(glyphHeight);
        const I = i * glyphWidth;
        for (let j = glyphHeight - 1; j >= 0; --j) {
            const row = glphyPixels[j] = new Array<boolean>(glyphWidth);
            const J = I + j * info.width;
            for (let k = row.length - 1; k >= 0; --k) {
                row[k] = (data[J + k] !== 0);
            }
        }
        glyphs[i] = new Glyph(PRINTABLE_ASCII[i], glphyPixels);
    }

    glyphs.sort((a, b) => a.count - b.count);

    // Create a table of bit masks, each composed of 95 bits, represented by three 32-bit numbers. Each bit corresponds
    // to a printable ASCII character ordered by the number of white pixels within each glyph. Bit-0 is the space
    // character (zero white pixels), bit-94 is the at sign (maximum number of white pixels), and bit-95 is always zero
    // since there are only 95 printable ASCII characters. Each row of the table corresponds to a pixel of the
    // rectangular region in which all glyphs are drawn.
    //
    // All 95 bits of all table rows are initially set. Then, for each white pixel in each glyph, the bit corresponding
    // to the glyph in the table row corresponding to the pixel is cleared.
    //
    // During image conversion, a 95-bit value is initialized to all ones for each rectangular region to be replaced by
    // a glyph. Then, for each black/uncolored pixels with the region, the value is bitwise ANDed with the table row
    // corresponding to the pixel. The idea being if the glyph pixel is white while the region pixel is black/uncolored,
    // then that particular glyph cannot replace the rectangular region. Since the mask contains a zero at the bit
    // position corresponding to the glyph, the bitwise AND operation excludes the glyph. After repeating that for all
    // pixels in the region, the number of leading zero bits is counted in the value. That number corresponds to the
    // first remaining glyph whose pixels are fully contained within the white/colored pixels of the image.
    glyphTable.length = glyphWidth * glyphHeight;
    for (let i = glyphTable.length - 1; i >= 0; --i) {
        glyphTable[i] = [ 0x7FFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF ];
    }
    for (let i = glyphs.length - 1; i >= 0; --i) {
        const pixels = glyphs[i].pixels;
        const index = i >> 5;
        const mask = ~(1 << (i & 31));
        for (let j = glyphHeight - 1; j >= 0; --j) {
            const row = pixels[j];
            const tableOffset = glyphWidth * j;
            for (let k = row.length - 1; k >= 0; --k) {
                if (row[k]) {
                    glyphTable[tableOffset + k][index] &= mask;
                }
            }
        }
    }
})();

export const glyphWidth = glyphs[0].pixels[0].length;
export const glyphHeight = glyphs[0].pixels.length;
export const glyphMinCount = glyphs[1].count;