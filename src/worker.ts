import os from 'os';
import { parentPort } from 'worker_threads';
import { getIndex } from '@/images';
import Ascii from '@/ascii';
import Task from '@/task';
import { Format } from '@/format';
import { Palette } from '@/colors';
import { TERM_HEIGHT, TERM_WIDTH } from '@/glyphs';

function toMonochromeAscii(task: Task, originX: number, originY: number): Ascii {

    const { image, rows, rowScale, cols, colScale, glyphScaleX, glyphScaleY, glyphInfo, format } = task;
    const { masks: glyphMasks, glyphs } = glyphInfo;

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
            for (let y = 0; y < TERM_HEIGHT; ++y) {
                const glyphY = glyphOriginY + glyphScaleY * y;
                const tableOffset = TERM_WIDTH * y;
                for (let x = 0; x < TERM_WIDTH; ++x) {
                    const glyphX = glyphOriginX + glyphScaleX * x;
                    if (getIndex(image, glyphX, glyphY) === 0) {
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
            switch (format) {
                case Format.HTML:
                    text += glyphs[glyphIndex].htmlEscapedCharacter;
                    break;
                case Format.NEOFETCH:
                    text += glyphs[glyphIndex].neofetchEscapedCharacter;
                    break;
                default:
                    text += glyphs[glyphIndex].character;
                    break;
            }

            // Tally the number of glyph pixels that align with image pixels.
            matched += glyphs[glyphIndex].count;
        }
        text += os.EOL;
    }

    return new Ascii(text, matched);
}

function toColorAscii(task: Task, originX: number, originY: number): Ascii {

    const { image, rows, rowScale, cols, colScale, glyphScaleX, glyphScaleY, glyphInfo, format, palette, htmlColors }
            = task;
    const { masks: glyphMasks, glyphs, minCount: glyphMinCount } = glyphInfo;

    const region = new Array<number>(3);
    const colorIndexCounts = new Map<number, number>();
    const ansi16 = palette === Palette.STANDARD_8 || palette === Palette.STANDARD_16;
    let text = '';
    let notFirstSpan = false;
    let lastColorIndex = -1;
    let matched = 0;
    let neofetchColors = 0;
    for (let r = 0; r < rows; ++r) {
        const glyphOriginY = originY + rowScale * r;
        for (let c = 0; c < cols; ++c) {
            const glyphOriginX = originX + colScale * c;

            // Count the number of times each color index appears in the rectangular region to be replaced by a glyph.
            colorIndexCounts.clear();
            for (let y = 0; y < TERM_HEIGHT; ++y) {
                const glyphY = glyphOriginY + glyphScaleY * y;
                for (let x = 0; x < TERM_WIDTH; ++x) {
                    const glyphX = glyphOriginX + glyphScaleX * x;
                    const colorIndex = getIndex(image, glyphX, glyphY);

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

                for (let y = 0; y < TERM_HEIGHT; ++y) {
                    const glyphY = glyphOriginY + glyphScaleY * y;
                    const tableOffset = TERM_WIDTH * y;
                    for (let x = 0; x < TERM_WIDTH; ++x) {
                        const glyphX = glyphOriginX + glyphScaleX * x;
                        if (getIndex(image, glyphX, glyphY) !== colorIndex) {
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
                switch (format) {
                    case Format.HTML:
                        if (notFirstSpan) {
                            text += "</span>";
                        }
                        text += `<span style="color: #${htmlColors[bestColorIndex]};">`;
                        notFirstSpan = true;
                        break;
                    case Format.NEOFETCH: {
                        const style = image.neofetchStyles[bestColorIndex];
                        neofetchColors = Math.max(neofetchColors, style.charCodeAt(3) - 48);
                        text += style;
                        break;
                    }
                    default:
                        if (ansi16) {
                            if (bestColorIndex < 8) {
                                text += `\x1b[3${bestColorIndex}m`;
                            } else {
                                text += `\x1b[1;3${bestColorIndex - 8}m`;
                            }
                        } else {
                            text += `\x1b[38;5;${bestColorIndex}m`;
                        }
                        break;
                }

                lastColorIndex = bestColorIndex;
            }

            // Append the printable ASCII character.
            switch (format) {
                case Format.HTML:
                    text += glyphs[bestGlyphIndex].htmlEscapedCharacter;
                    break;
                case Format.NEOFETCH:
                    text += glyphs[bestGlyphIndex].neofetchEscapedCharacter;
                    break;
                default:
                    text += glyphs[bestGlyphIndex].character;
                    break;
            }

            // Tally the number of glyph pixels that align with image pixels.
            matched += glyphs[bestGlyphIndex].count;
        }
        text += os.EOL;
    }

    switch (format) {
        case Format.HTML:
            if (notFirstSpan) {
                text += '</span>';
            }
            break;
        case Format.NEOFETCH: {
            let header = 'colors';
            for (let i = 0; i < neofetchColors; ++i) {
                header += ` ${image.neofetchIndices[i]}`;
            }
            text = header + os.EOL + os.EOL + text;
            break;
        }
        default:
            // Append ANSI escape code to reset the text formatting to the terminal's default settings.
            text += '\x1b[0m';
            break;
    }

    return new Ascii(text, matched);
}

parentPort!.on('message', (task: Task) => {
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