import sharp from 'sharp';
import { clearClosestColorCache, findClosestColorIndex, findClosestColorIndexAmong, Palette } from '@/colors';
import os from 'os';

export class Image {
    indices: Uint8Array;
    width: number;
    height: number;
    neofetchHeader: string;
    neofetchStyles: string[];

    constructor(indices: Uint8Array, width: number, height: number, neofetchHeader: string, neofetchStyles: string[]) {
        this.indices = indices;
        this.width = width;
        this.height = height;
        this.neofetchHeader = neofetchHeader;
        this.neofetchStyles = neofetchStyles;
    }

    getIndex(x: number, y: number) {
        const X = Math.round(x);
        const Y = Math.round(y);
        if (X < 0 || Y < 0 || X >= this.width || Y >= this.height) {
            return 0;
        }
        return this.indices[this.width * Y + X];
    }
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

    let neofetchHeader = 'colors';
    const neofetchStyles = new Array<string>(256);

    outer: {
        for (let i = 1, c = 0; i < frequencies.length; ++i) {
            if (frequencies[i] > 0 && ++c > colors) {
                break outer;
            }
        }
        for (let i = 1, c = 0; i < frequencies.length; ++i) {
            if (frequencies[i] > 0) {
                neofetchHeader += ` ${i}`;
                neofetchStyles[i] = `\${c${++c}}`;
            }
        }
        neofetchHeader += os.EOL + os.EOL;
        return new Image(indices, info.width, info.height, neofetchHeader, neofetchStyles);
    }

    const set: number[] = [];
    while (set.length < colors) {
        let maxIndex = 0;
        let maxFrequency = 0;
        for (let i = 1; i < frequencies.length; ++i) {
            if (frequencies[i] > maxFrequency) {
                maxIndex = i;
                maxFrequency = frequencies[i];
            }
        }
        frequencies[maxIndex] = 0;
        set.push(maxIndex);
        neofetchHeader += ` ${maxIndex}`;
        neofetchStyles[maxIndex] = `\${c${set.length}}`;
    }
    neofetchHeader += os.EOL + os.EOL;

    switch (info.channels) {
        case 1:
            for (let i = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndexAmong(set, darkness, data[i], data[i], data[i], 0xFF);
            }
            break;
        case 2:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndexAmong(set, darkness, data[j], data[j], data[j++], data[j++]);
            }
            break;
        case 3:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndexAmong(set, darkness, data[j++], data[j++], data[j++], 0xFF);
            }
            break;
        case 4:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndexAmong(set, darkness, data[j++], data[j++], data[j++], data[j++]);
            }
            break;
    }
    clearClosestColorCache();

    return new Image(indices, info.width, info.height, neofetchHeader, neofetchStyles);
}