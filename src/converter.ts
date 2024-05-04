import partitionArray from '@/array';
import { Worker } from 'worker_threads';
import { Image } from '@/images';
import { GlyphInfo } from '@/glyphs';
import Ascii from '@/ascii';
import Offset from '@/offset';
import Task from '@/task';
import { getHtmlFooter, getHtmlHeader } from '@/html';

export default async function convert(image: Image, glyphInfo: GlyphInfo, color: boolean, imageScale: number,
                                      fontSize: number, lineHeight: number, html: boolean, htmlColors: string[],
                                      title: string, workerCount: number): Promise<Ascii> {

    const scaledGlyphWidth = glyphInfo.width * fontSize / 12;
    const scaledGlyphHeight = Math.round(lineHeight * fontSize * 96 / 72);
    const scaledImageWidth = imageScale * image.width;
    const scaledImageHeight = imageScale * image.height;
    const rows = Math.ceil(scaledImageHeight / scaledGlyphHeight);
    const cols = Math.ceil(scaledImageWidth / scaledGlyphWidth);
    const paddedWidth = Math.ceil(cols * scaledGlyphWidth);
    const paddedHeight = Math.ceil(rows * scaledGlyphHeight);
    const marginX = (scaledImageWidth - paddedWidth) / 2;
    const marginY = (scaledImageHeight - paddedHeight) / 2;
    const glyphScaleX = scaledGlyphWidth / (imageScale * glyphInfo.width);
    const glyphScaleY = scaledGlyphHeight / (imageScale * glyphInfo.height);
    const rowScale = scaledGlyphHeight / imageScale;
    const colScale = scaledGlyphWidth / imageScale;

    // Repeat the image conversion for various origins within a glyph-sized region and return the best one found.
    const offsets: Offset[] = [];
    for (let y = -glyphInfo.height; y <= 0; ++y) {
        for (let x = -glyphInfo.width; x <= 0; ++x) {
            offsets.push(new Offset(x, y));
        }
    }
    const offs = partitionArray(offsets, workerCount);

    let ascii = new Ascii('', 0);
    let wc = workerCount;
    await new Promise<void>(resolve => {
        for (let i = workerCount - 1; i >= 0; --i) {
            const worker = new Worker('./dist/worker.bundle.js');
            worker.on('message', (result: Ascii) => {
                if (result.matched > ascii.matched) {
                    ascii = result;
                }
                if (--wc === 0) {
                    resolve();
                }
                void worker.terminate();
            });
            worker.postMessage(new Task(offs[i], image, glyphInfo, glyphScaleX, glyphScaleY, rows, cols, rowScale,
                colScale, marginX, marginY, color, html, htmlColors));
        }
    });

    if (html) {
        ascii.text = `${getHtmlHeader(title, fontSize, lineHeight)}${ascii.text}${getHtmlFooter()}`;
    }

    return ascii;
}