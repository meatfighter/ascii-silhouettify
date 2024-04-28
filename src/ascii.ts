import * as os from 'os';
import { glyphHeight, glyphMinCount, glyphs, glyphWidth } from '@/glyphs';
import { Image } from '@/images';

export class Ascii {
    text: string;
    matched: number;

    constructor(text: string, matched: number) {
        this.text = text;
        this.matched = matched;
    }
}

function toAscii(image: Image, offsetX: number, offsetY: number, imageScale: number, scaledGlyphWidth: number,
                 scaledGlyphHeight: number): Ascii {

    const scaledImageWidth = imageScale * image.width;
    const scaledImageHeight = imageScale * image.height;
    const cols = Math.ceil(scaledImageWidth / scaledGlyphWidth);
    const rows = Math.ceil(scaledImageHeight / scaledGlyphHeight);
    const paddedWidth = Math.ceil(cols * scaledGlyphWidth);
    const paddedHeight = Math.ceil(rows * scaledGlyphHeight);
    const originX = offsetX + (scaledImageWidth - paddedWidth) / 2;
    const originY = offsetY + (scaledImageHeight - paddedHeight) / 2;
    const glyphScaleX = scaledGlyphWidth / (imageScale * glyphWidth);
    const glyphScaleY = scaledGlyphHeight / (imageScale * glyphHeight);
    const rowScale = scaledGlyphHeight / imageScale;
    const colScale = scaledGlyphWidth / imageScale;

    let text = '';
    let matched = 0;
    for (let r = 0; r < rows; ++r) {
        const glyphOriginY = originY + rowScale * r;
        for (let c = 0; c < cols; ++c) {
            const glyphOriginX = originX + colScale * c;

            // Count the number of light pixels within the rectangular region to be replaced by a glyph.
            let lightCount = 0;
            for (let y = 0; y < glyphHeight; ++y) {
                const glyphY = glyphOriginY + glyphScaleY * y;
                for (let x = 0; x < glyphWidth; ++x) {
                    const glyphX = glyphOriginX + glyphScaleX * x;

                    // Do not count very dark pixels.
                    if (image.getIndex(glyphX, glyphY) !== 0) {
                        ++lightCount;
                    }
                }
            }

            // If the region is very dark, replace it with a space character.
            if (lightCount === 0) {
                text += ' ';
                continue;
            }

            // Attempt to substitute the region with a glyph starting with the character containing the most pixels
            // down to the space character. If any of the character's pixels do not align with light pixels within
            // the image, then that character is excluded.
            let glyphIndex = 0;
            outer: for (let i = glyphs.length - 1; i >= 0; --i) {
                const glyph = glyphs[i];
                const glyphPixels = glyph.pixels;
                for (let y = 0; y < glyphHeight; ++y) {
                    const glyphRow = glyphPixels[y];
                    const glyphY = glyphOriginY + glyphScaleY * y;
                    for (let x = 0; x < glyphWidth; ++x) {
                        const glyphX = glyphOriginX + glyphScaleX * x;
                        const index = image.getIndex(glyphX, glyphY);
                        if (glyphRow[x] && index === 0) {
                            continue outer; // Exclude glyph since one its pixels aligned with a dark image pixel.
                        }
                    }
                }
                glyphIndex = i; // Use first one found since glyphs are sorted by pixel counts.
                break;
            }


            // If no best is found, then no non-space character aligns with all the light pixels in the region.
            // A space is the only acceptable character in that case.
            if (glyphIndex === 0) {
                text += ' ';
                continue;
            }

            // Append the printable ASCII character.
            text += glyphs[glyphIndex].character;

            // Tally the number of glyph pixels that align with image pixels.
            matched += glyphs[glyphIndex].count;
        }
        text += os.EOL;
    }

    return new Ascii(text, matched);
}

function toAnsi(image: Image, offsetX: number, offsetY: number, imageScale: number, scaledGlyphWidth: number,
                scaledGlyphHeight: number): Ascii {

    const scaledImageWidth = imageScale * image.width;
    const scaledImageHeight = imageScale * image.height;
    const cols = Math.ceil(scaledImageWidth / scaledGlyphWidth);
    const rows = Math.ceil(scaledImageHeight / scaledGlyphHeight);
    const paddedWidth = Math.ceil(cols * scaledGlyphWidth);
    const paddedHeight = Math.ceil(rows * scaledGlyphHeight);
    const originX = offsetX + (scaledImageWidth - paddedWidth) / 2;
    const originY = offsetY + (scaledImageHeight - paddedHeight) / 2;
    const glyphScaleX = scaledGlyphWidth / (imageScale * glyphWidth);
    const glyphScaleY = scaledGlyphHeight / (imageScale * glyphHeight);
    const rowScale = scaledGlyphHeight / imageScale;
    const colScale = scaledGlyphWidth / imageScale;

    const colorIndexCounts = new Map<number, number>();
    let text = '';
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
            // character's pixels do not align with color index, then that character is excluded.
            let bestGlyphIndex = 0;
            let bestColorIndex = 0;
            colorIndexCounts.forEach((_, colorIndex) => {
                let glyphIndex = 0;
                outer: for (let i = glyphs.length - 1; i >= 0; --i) {
                    const glyph = glyphs[i];
                    const glyphPixels = glyph.pixels;
                    for (let y = 0; y < glyphHeight; ++y) {
                        const glyphRow = glyphPixels[y];
                        const glyphY = glyphOriginY + glyphScaleY * y;
                        for (let x = 0; x < glyphWidth; ++x) {
                            const glyphX = glyphOriginX + glyphScaleX * x;
                            const index = image.getIndex(glyphX, glyphY);
                            if (glyphRow[x] && index !== colorIndex) {
                                continue outer; // Exclude glyph since one its pixels did not match the color index.
                            }
                        }
                    }
                    glyphIndex = i; // Use first one found since glyphs are sorted by pixel counts.
                    break;
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
                text += `\x1b[38;5;${bestColorIndex}m`;
                lastColorIndex = bestColorIndex;
            }

            // Append the printable ASCII character.
            text += glyphs[bestGlyphIndex].character;

            // Tally the number of glyph pixels that align with image pixels.
            matched += glyphs[bestGlyphIndex].count;
        }
        text += os.EOL;
    }

    // Append ANSI escape code to reset the text formatting to the terminal's default settings.
    text += '\x1b[0m';

    return new Ascii(text, matched);
}

// Repeat the image conversion for various origins within a glyph-sized region and return the best one found.
export function convert(image: Image, ansi: boolean, imageScale: number, scaledGlyphWidth: number,
                        scaledGlyphHeight: number): Ascii {

    const func = ansi ? toAnsi : toAscii;
    let ascii = new Ascii('', 0);
    for (let y = -glyphHeight; y <= 0; ++y) {
        for (let x = -glyphWidth; x <= 0; ++x) {
            const a = func(image, x, y, imageScale, scaledGlyphWidth, scaledGlyphHeight);
            if (a.matched > ascii.matched) {
                ascii = a;
            }
        }
    }
    return ascii;
}