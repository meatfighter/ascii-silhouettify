import partitionArray from '@/array';
import { Worker } from 'worker_threads';
import { Image } from '@/images';
import { GlyphInfo, HTML_HEIGHT, HTML_WIDTH } from '@/glyphs';
import Ascii from '@/ascii';
import Offset from '@/offset';
import Task from '@/task';
import { Format } from '@/format';
import { Palette } from '@/colors';

export default async function convert(image: Image, glyphInfo: GlyphInfo, color: boolean, imageScale: number,
                                      fontSize: number, lineHeight: number, format: Format, palette: Palette,
                                      htmlColors: string[], workers: Worker[]): Promise<Ascii> {

    let scaledGlyphWidth: number;
    let scaledGlyphHeight: number;
    let glyphScaleX: number;
    let glyphScaleY: number;
    if (format === Format.HTML) {
        scaledGlyphWidth = HTML_WIDTH * fontSize / 12;
        scaledGlyphHeight = lineHeight * fontSize * 96 / 72;
        glyphScaleX = scaledGlyphWidth / (imageScale * HTML_WIDTH);
        glyphScaleY = scaledGlyphHeight / (imageScale * HTML_HEIGHT);
    } else {
        scaledGlyphWidth = Math.round(glyphInfo.width * fontSize / 12);
        scaledGlyphHeight = Math.round(lineHeight * fontSize * 96 / 72);
        glyphScaleX = scaledGlyphWidth / (imageScale * glyphInfo.width);
        glyphScaleY = scaledGlyphHeight / (imageScale * glyphInfo.height);
    }

    const scaledImageWidth = imageScale * image.width;
    const scaledImageHeight = imageScale * image.height;
    const rows = Math.ceil(scaledImageHeight / scaledGlyphHeight);
    const cols = Math.ceil(scaledImageWidth / scaledGlyphWidth);
    const paddedWidth = Math.ceil(cols * scaledGlyphWidth);
    const paddedHeight = Math.ceil(rows * scaledGlyphHeight);
    const marginX = (scaledImageWidth - paddedWidth) / 2;
    const marginY = (scaledImageHeight - paddedHeight) / 2;
    const rowScale = scaledGlyphHeight / imageScale;
    const colScale = scaledGlyphWidth / imageScale;

    // Repeat the image conversion for various origins within a glyph-sized region and return the best one found.
    const offsets: Offset[] = [];
    for (let y = -glyphInfo.height; y <= 0; ++y) {
        for (let x = -glyphInfo.width; x <= 0; ++x) {
            offsets.push(new Offset(x, y));
        }
    }
    const offs = partitionArray(offsets, workers.length);

    let ascii = new Ascii('', -1);
    let wc = workers.length;
    await new Promise<void>(resolve => {
        for (let i = workers.length - 1; i >= 0; --i) {
            const worker = workers[i];
            function messageHandler(result: Ascii) {
                worker.removeListener('message', messageHandler);
                if (result.matched > ascii.matched) {
                    ascii = result;
                }
                if (--wc === 0) {
                    resolve();
                }
            }
            worker.addListener('message', messageHandler);
            worker.postMessage(new Task(offs[i], image, glyphInfo, glyphScaleX, glyphScaleY, rows, cols, rowScale,
                colScale, marginX, marginY, color, format, palette, htmlColors));
        }
    });

    return ascii;
}