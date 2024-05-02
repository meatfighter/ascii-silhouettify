import os from 'os';
import { parentPort } from 'worker_threads';
import { Image } from '@/images';
import Ascii from '@/ascii';
import Task from '@/task';

function toMonochromeAscii(task: Task, originX: number, originY: number): Ascii {

    const { image, rows, rowScale, cols, colScale, glyphScaleX, glyphScaleY, glyphInfo, html } = task;
    const { width: glyphWidth, height: glyphHeight, masks: glyphMasks, glyphs } = glyphInfo;

    let text = '';
    let matched = 0;
    const region = new Array<number>(3);
    for (let r = 0; r < rows; ++r) {
        const glyphOriginY = originY + rowScale * r;
        for (let c = 0; c < cols; ++c) {
            const glyphOriginX = originX + colScale * c;

            region[2] = 0x7FFFFFFF;
            region[1] = region[0] = 0xFFFFFFFF;

            // Attempt to substitute the region with a glyph starting with the character containing the most pixels down
            // to the space character. If any of the glyph's pixels coincide with a black pixel in image region, then
            // that character is excluded.
            for (let y = 0; y < glyphHeight; ++y) {
                const glyphY = glyphOriginY + glyphScaleY * y;
                const tableOffset = glyphWidth * y;
                for (let x = 0; x < glyphWidth; ++x) {
                    const glyphX = glyphOriginX + glyphScaleX * x;
                    if (image.getIndex(glyphX, glyphY) === 0) {
                        const row = glyphMasks[tableOffset + x];
                        region[2] &= row[2];
                        region[1] &= row[1];
                        region[0] &= row[0];
                    }
                }
            }

            let glyphIndex: number;
            if (region[2] !== 0) {
                glyphIndex = 95 - Math.clz32(region[2]);
            } else if (region[1] !== 0) {
                glyphIndex = 63 - Math.clz32(region[1]);
            } else {
                glyphIndex = 31 - Math.clz32(region[0]);
            }

            // Append the printable ASCII character.
            text += html ? glyphs[glyphIndex].htmlEscapedCharacter : glyphs[glyphIndex].character;

            // Tally the number of glyph pixels that align with image pixels.
            matched += glyphs[glyphIndex].count;
        }
        text += os.EOL;
    }

    return new Ascii(text, matched);
}

function toColorAscii(task: Task, originX: number, originY: number): Ascii {

    const { image, rows, rowScale, cols, colScale, glyphScaleX, glyphScaleY, glyphInfo, html, htmlColors } = task;
    const { width: glyphWidth, height: glyphHeight, masks: glyphMasks, glyphs, minCount: glyphMinCount } = glyphInfo;

    const region = new Array<number>(3);
    const colorIndexCounts = new Map<number, number>();
    let text = '';
    let notFirstSpan = false;
    let lastColorIndex = -1;
    let matched = 0;
    for (let r = 0; r < rows; ++r) {
        const glyphOriginY = originY + rowScale * r;
        for (let c = 0; c < cols; ++c) {
            const glyphOriginX = originX + colScale * c;

            // Count the number of times each color index appears in the rectangular region to be replaced by a glyph.
            colorIndexCounts.clear();
            for (let y = 0; y < glyphHeight; ++y) {
                const glyphY = glyphOriginY + glyphScaleY * y;
                for (let x = 0; x < glyphWidth; ++x) {
                    const glyphX = glyphOriginX + glyphScaleX * x;
                    const colorIndex = image.getIndex(glyphX, glyphY);

                    // Do not count very dark colors.
                    if (colorIndex !== 0) {
                        const count = colorIndexCounts.get(colorIndex);
                        colorIndexCounts.set(colorIndex, (count === undefined) ? 1 : count + 1);
                    }
                }
            }

            // Remove counts less-than the minimum number of pixels in a printable ASCII character that is not a space.
            colorIndexCounts.forEach((count, colorIndex) => {
                if (count < glyphMinCount) {
                    colorIndexCounts.delete(colorIndex);
                }
            });

            // If there are no counts, then the region is very dark. Replace with a space character in that case.
            if (colorIndexCounts.size === 0) {
                text += ' ';
                continue;
            }

            // For each of the remaining counted color indices, attempt to substitute the region with a colored glyph
            // starting with the character containing the most pixels down to the space character. If any of the
            // glyph's pixels do not coincide with an image pixel of a specified color index, then that character is
            // excluded.
            let bestGlyphIndex = 0;
            let bestColorIndex = 0;
            colorIndexCounts.forEach((_, colorIndex) => {

                region[2] = 0x7FFFFFFF;
                region[1] = region[0] = 0xFFFFFFFF;

                for (let y = 0; y < glyphHeight; ++y) {
                    const glyphY = glyphOriginY + glyphScaleY * y;
                    const tableOffset = glyphWidth * y;
                    for (let x = 0; x < glyphWidth; ++x) {
                        const glyphX = glyphOriginX + glyphScaleX * x;
                        if (image.getIndex(glyphX, glyphY) !== colorIndex) {
                            const row = glyphMasks[tableOffset + x];
                            region[2] &= row[2];
                            region[1] &= row[1];
                            region[0] &= row[0];
                        }
                    }
                }

                let glyphIndex: number;
                if (region[2] !== 0) {
                    glyphIndex = 95 - Math.clz32(region[2]);
                } else if (region[1] !== 0) {
                    glyphIndex = 63 - Math.clz32(region[1]);
                } else {
                    glyphIndex = 31 - Math.clz32(region[0]);
                }

                // Accept the best character and color combination.
                if (glyphs[glyphIndex].count > glyphs[bestGlyphIndex].count) {
                    bestGlyphIndex = glyphIndex;
                    bestColorIndex = colorIndex;
                }
            });

            // If no best is found, then no non-space character of any color aligns with all the pixels in the region.
            // A space is the only acceptable character in that case.
            if (bestGlyphIndex === 0) {
                text += ' ';
                continue;
            }

            // If the color is different from the previous one, then append the ANSI escape code to set the foreground
            // color to an index of the 256-color palette.
            if (lastColorIndex !== bestColorIndex) {
                if (html) {
                    if (notFirstSpan) {
                        text += "</span>";
                    }
                    text += `<span style="color: #${htmlColors[bestColorIndex]};">`;
                    notFirstSpan = true;
                } else {
                    text += `\x1b[38;5;${bestColorIndex}m`;
                }
                lastColorIndex = bestColorIndex;
            }

            // Append the printable ASCII character.
            text += html ? glyphs[bestGlyphIndex].htmlEscapedCharacter : glyphs[bestGlyphIndex].character;

            // Tally the number of glyph pixels that align with image pixels.
            matched += glyphs[bestGlyphIndex].count;
        }
        text += os.EOL;
    }

    if (html) {
        if (notFirstSpan) {
            text += "</span>";
        }
    } else {
        // Append ANSI escape code to reset the text formatting to the terminal's default settings.
        text += '\x1b[0m';
    }

    return new Ascii(text, matched);
}

parentPort!.on('message', (task: Task) => {
    task.image = new Image(task.image.indices, task.image.width, task.image.height);
    const func = task.color ? toColorAscii : toMonochromeAscii;

    let ascii = new Ascii('', 0);
    task.offsets.forEach(offset => {
        const result = func(task, offset.x + task.marginX, offset.y + task.marginY);
        if (result.matched > ascii.matched) {
            ascii = result;
        }
    });

    parentPort!.postMessage(ascii);
});