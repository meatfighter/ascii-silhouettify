import { Image } from '@/images';
import { Glyph } from '@/glyphs';

class InitAsciiWorker {
    constructor(
        public image: Image,
        public glyphs: Glyph[],
        public glyphMasks: number[][],
        public glyphWidth: number,
        public glyphHeight: number,
        public glyphScaleX: number,
        public glyphScaleY: number,
        public glyphMinCount: number,
        public rows: number,
        public cols: number,
        public rowScale: number,
        public colScale: number,
        public html: boolean,
        public htmlColors: string[]
    ) {
    }
}