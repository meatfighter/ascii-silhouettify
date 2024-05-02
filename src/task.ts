import { Image } from '@/images';
import { GlyphInfo } from '@/glyphs';
import Offset from '@/offset';

export default class Task {
    constructor(
        public offsets: Offset[],
        public image: Image,
        public glyphInfo: GlyphInfo,
        public glyphScaleX: number,
        public glyphScaleY: number,
        public rows: number,
        public cols: number,
        public rowScale: number,
        public colScale: number,
        public marginX: number,
        public marginY: number,
        public color: boolean,
        public html: boolean,
        public htmlColors: string[]
    ) {
    }
}