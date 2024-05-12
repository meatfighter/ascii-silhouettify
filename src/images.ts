import sharp from 'sharp';
import { clearClosestColorCache, findClosestColorIndex, findClosestColorIndexAmong, Palette } from '@/colors';

export class Image {
    indices: Uint8Array;
    width: number;
    height: number;

    constructor(indices: Uint8Array, width: number, height: number) {
        this.indices = indices;
        this.width = width;
        this.height = height;
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

export async function loadImage(filename: string, pal: Palette, colors: number): Promise<Image> {

    const { data, info } = await sharp(filename).raw().toBuffer({ resolveWithObject: true });

    const indices = new Uint8Array(info.width * info.height);

    const frequencies = new Array<number>(256).fill(0);

    clearClosestColorCache();
    switch (info.channels) {
        case 1:
            for (let i = 0; i < indices.length; ++i) {
                ++frequencies[indices[i] = findClosestColorIndex(pal, data[i], data[i], data[i], 0xFF)];
            }
            break;
        case 2:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                ++frequencies[indices[i] = findClosestColorIndex(pal, data[j], data[j], data[j++], data[j++])];
            }
            break;
        case 3:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                ++frequencies[indices[i] = findClosestColorIndex(pal, data[j++], data[j++], data[j++], 0xFF)];
            }
            break;
        case 4:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                ++frequencies[indices[i] = findClosestColorIndex(pal, data[j++], data[j++], data[j++], data[j++])];
            }
            break;
    }
    clearClosestColorCache();

    outer: {
        for (let i = frequencies.length - 1, c = 0; i >= 0; --i) {
            if (frequencies[i] > 0 && ++c > colors) {
                break outer;
            }
        }
        return new Image(indices, info.width, info.height);
    }

    const set: number[] = [];
    while (set.length < colors) {
        let maxIndex = 0;
        let maxFrequency = 0;
        for (let i = frequencies.length - 1; i >= 0; --i) {
            if (frequencies[i] > maxFrequency) {
                maxIndex = i;
                maxFrequency = frequencies[i];
            }
        }
        frequencies[maxIndex] = 0;
        set.push(maxIndex);
    }

    switch (info.channels) {
        case 1:
            for (let i = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndexAmong(set, data[i], data[i], data[i], 0xFF);
            }
            break;
        case 2:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndexAmong(set, data[j], data[j], data[j++], data[j++]);
            }
            break;
        case 3:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndexAmong(set, data[j++], data[j++], data[j++], 0xFF);
            }
            break;
        case 4:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndexAmong(set, data[j++], data[j++], data[j++], data[j++]);
            }
            break;
    }
    clearClosestColorCache();

    return new Image(indices, info.width, info.height);
}