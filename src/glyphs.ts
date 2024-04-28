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
})();

export const glyphWidth = glyphs[0].pixels[0].length;
export const glyphHeight = glyphs[0].pixels.length;
export const glyphMinCount = glyphs[1].count;