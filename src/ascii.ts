import * as os from 'os';
import { GlyphInfo } from '@/glyphs';
import { Image } from '@/images';
import { Offset, Task } from '@/ascii-worker';
import { Worker } from 'worker_threads';
import partitionArray from '@/array';

export class Ascii {
    text: string;
    matched: number;

    constructor(text: string, matched: number) {
        this.text = text;
        this.matched = matched;
    }
}

export async function convert(image: Image, glyphInfo: GlyphInfo, color: boolean, imageScale: number, fontSize: number,
        lineHeight: number, html: boolean, htmlColors: string[], workerCount: number): Promise<Ascii> {

    const scaledGlyphWidth = glyphInfo.width * fontSize / 12;
    const scaledGlyphHeight = Math.round(lineHeight * fontSize * 96 / 72);
    const scaledImageWidth = imageScale * image.width;
    const scaledImageHeight = imageScale * image.height;
    const cols = Math.ceil(scaledImageWidth / scaledGlyphWidth);
    const rows = Math.ceil(scaledImageHeight / scaledGlyphHeight);
    const glyphScaleX = scaledGlyphWidth / (imageScale * glyphInfo.width);
    const glyphScaleY = scaledGlyphHeight / (imageScale * glyphInfo.height);
    const rowScale = scaledGlyphHeight / imageScale;
    const colScale = scaledGlyphWidth / imageScale;

    // Repeat the image conversion for various origins within a glyph-sized region and return the best one found.
    const offsets: Offset[] = [];
    let ascii = new Ascii('', 0);
    for (let y = -glyphInfo.height; y <= 0; ++y) {
        for (let x = -glyphInfo.width; x <= 0; ++x) {
            offsets.push(new Offset(x, y));
        }
    }
    const offs = partitionArray(offsets, workerCount);

    const workers: Worker[] = new Array<Worker>(workerCount);
    const workerResults: Ascii[] = new Array<Ascii>(workerCount);
    await new Promise<void>(resolve => {
        for (let i = workers.length - 1; i >= 0; --i) {
            workers[i] = new Worker('./dist/ascii-worker.bundle.js');
            workers[i].on('message', workerResult => {
                workerResults[i] = workerResult as Ascii;
                for (let j = workers.length - 1; j >= 0; --j) {
                    if (!workerResults[j]) {
                        return;
                    }
                }
                resolve();
            });
            workers[i].postMessage(new Task(offs[i], image, glyphInfo, glyphScaleX, glyphScaleY, rows, cols, rowScale,
                colScale, color, html, htmlColors));
        }
    });




    // const a = func(image, x, y, imageScale, scaledGlyphWidth, scaledGlyphHeight, html);
    // if (a.matched > ascii.matched) {
    //     ascii = a;
    // }

    return ascii;
}