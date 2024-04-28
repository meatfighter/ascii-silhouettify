import sharp from 'sharp';
import findClosestColorIndex from '@/colors';

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

export async function loadImage(filename: string): Promise<Image> {
    const image = sharp(filename);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const indices = new Uint8Array(info.width * info.height);
    switch (info.channels) {
        case 1:
            for (let i = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndex(data[i], data[i], data[i], 0xFF);
            }
            break;
        case 2:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndex(data[j], data[j], data[j++], data[j++]);
            }
            break;
        case 3:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndex(data[j++], data[j++], data[j++], 0xFF);
            }
            break;
        case 4:
            for (let i = 0, j = 0; i < indices.length; ++i) {
                indices[i] = findClosestColorIndex(data[j++], data[j++], data[j++], data[j++]);
            }
            break;
    }
    return new Image(indices, info.width, info.height);
}