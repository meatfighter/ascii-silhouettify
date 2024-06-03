import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const PRINTABLE_ASCII
    = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

export const HTML_WIDTH = 9.363636363636363;
export const HTML_HEIGHT = 19.2;

class GlyphImage {
    htmlEscapedCharacter: string;
    neofetchEscapedCharacter: string;
    count: number;

    constructor(public character: string,
                public pixels: boolean[][]) {

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
            case '\'':
                this.htmlEscapedCharacter = '&apos;';
                break;
            default:
                this.htmlEscapedCharacter = character;
                break;
        }

        switch (character) {
            case '\\':
                this.neofetchEscapedCharacter = '\\\\';
                break;
            case '$':
                this.neofetchEscapedCharacter = '\x24';
                break;
            default:
                this.neofetchEscapedCharacter = character;
                break;
        }
    }
}

export class Glyph {
    constructor(public character: string,
                public htmlEscapedCharacter: string,
                public neofetchEscapedCharacter: string,
                public count: number) {
    }
}

export class GlyphInfo {
    constructor(public masks: number[][],
                public glyphs: Glyph[],
                public width: number,
                public height: number,
                public minCount: number) {
    }
}

export async function loadGlyphs(): Promise<GlyphInfo> {
    const masks: number[][] = [];
    const glyphsImages = new Array<GlyphImage>(PRINTABLE_ASCII.length);
    const { data, info } = await sharp(path.join(dirname(fileURLToPath(import.meta.url)), 'assets', 'glyphs.png'))
        .raw().toColourspace('b-w').toBuffer({ resolveWithObject: true });
    const width = info.width / PRINTABLE_ASCII.length;
    const height = info.height;

    for (let i = PRINTABLE_ASCII.length - 1; i >= 0; --i) {
        const glphyPixels = new Array<boolean[]>(height);
        const I = i * width;
        for (let j = height - 1; j >= 0; --j) {
            const row = glphyPixels[j] = new Array<boolean>(width);
            const J = I + j * info.width;
            for (let k = row.length - 1; k >= 0; --k) {
                row[k] = (data[J + k] !== 0);
            }
        }
        glyphsImages[i] = new GlyphImage(PRINTABLE_ASCII[i], glphyPixels);
    }

    glyphsImages.sort((a, b) => a.count - b.count);

    masks.length = width * height;
    for (let i = masks.length - 1; i >= 0; --i) {
        masks[i] = [ 0, 0, 0 ];
    }
    for (let i = glyphsImages.length - 1; i >= 0; --i) {
        const pixels = glyphsImages[i].pixels;
        const index = i >> 5;
        const mask = 1 << (i & 31);
        for (let j = height - 1; j >= 0; --j) {
            const row = pixels[j];
            const tableOffset = width * j;
            for (let k = row.length - 1; k >= 0; --k) {
                if (!row[k]) {
                    masks[tableOffset + k][index] |= mask;
                }
            }
        }
    }

    const glyphs = new Array<Glyph>(glyphsImages.length);
    for (let i = glyphsImages.length - 1; i >= 0; --i) {
        const glyphImage = glyphsImages[i];
        glyphs[i] = new Glyph(glyphImage.character, glyphImage.htmlEscapedCharacter,
                glyphImage.neofetchEscapedCharacter, glyphImage.count);
    }

    return new GlyphInfo(masks, glyphs, width, height, glyphs[1].count);
}