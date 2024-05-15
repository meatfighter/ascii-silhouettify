import sharp from 'sharp';
import { clearClosestColorCache, findClosestColorIndex, findClosestColorIndexAmong, Palette } from '@/colors';

export class Image {
    constructor(public indices: Uint8Array, public width: number, public height: number,
                public neofetchIndices: number[], public neofetchStyles: string[]) {
    }
}

export function getIndex(image: Image, x: number, y: number) {
    const X = Math.round(x);
    const Y = Math.round(y);
    if (X < 0 || Y < 0 || X >= image.width || Y >= image.height) {
        return 0;
    }
    return image.indices[image.width * Y + X];
}

export async function loadImage(filename: string, pal: Palette, colors: number, darkness: number): Promise<Image> {

    const { data, info } = await sharp(filename).raw().toBuffer({ resolveWithObject: true });

    const indices = new Uint8Array(info.width * info.height);

    const frequencies = new Array<number>(256).fill(0);

    clearClosestColorCache();
    switch (info.channels) {
        case 1:
            for (let i = 0; i < indices.length; ++i) {
                ++frequencies[indices[i] = findClosestColorIndex(pal, darkness, data[i], data[i], data[i], 0xFF)];
            }
            break;
        case 2:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                ++frequencies[indices[i] = findClosestColorIndex(pal, darkness, data[j], data[j], data[j++],
                        data[j++])];
            }
            break;
        case 3:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                ++frequencies[indices[i] = findClosestColorIndex(pal, darkness, data[j++], data[j++], data[j++], 0xFF)];
            }
            break;
        case 4:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                ++frequencies[indices[i] = findClosestColorIndex(pal, darkness, data[j++], data[j++], data[j++],
                        data[j++])];
            }
            break;
    }
    clearClosestColorCache();

    const neofetchIndices: number[] = [];
    const neofetchStyles = new Array<string>(256);
    while (true) {
        let maxIndex = -1;
        let maxFrequency = 0;
        for (let i = frequencies.length - 1; i > 0; --i) {
            if (frequencies[i] > maxFrequency) {
                maxIndex = i;
                maxFrequency = frequencies[i];
            }
        }
        if (maxIndex < 0) {
            break;
        }
        frequencies[maxIndex] = 0;
        neofetchIndices.push(maxIndex);
        if (neofetchIndices.length <= 6) {
            neofetchStyles[maxIndex] = `\${c${neofetchIndices.length}}`;
        }
    }

    if (neofetchIndices.length <= colors) {
        return new Image(indices, info.width, info.height, neofetchIndices, neofetchStyles);
    }

    neofetchIndices.length = colors;

    switch (info.channels) {
        case 1:
            for (let i = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndexAmong(neofetchIndices, darkness, data[i], data[i], data[i], 0xFF);
            }
            break;
        case 2:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndexAmong(neofetchIndices, darkness, data[j], data[j], data[j++],
                        data[j++]);
            }
            break;
        case 3:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndexAmong(neofetchIndices, darkness, data[j++], data[j++], data[j++],
                        0xFF);
            }
            break;
        case 4:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndexAmong(neofetchIndices, darkness, data[j++], data[j++], data[j++],
                        data[j++]);
            }
            break;
    }
    clearClosestColorCache();

    return new Image(indices, info.width, info.height, neofetchIndices, neofetchStyles);
}