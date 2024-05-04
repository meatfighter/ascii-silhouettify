import { promises as fs, constants } from 'fs';
import { basename, dirname } from 'path';

export async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

export async function ensureDirectoryExists(filePath: string): Promise<boolean> {
    try {
        const directoryPath = dirname(filePath);
        await fs.mkdir(directoryPath, { recursive: true });
        return true;
    } catch {
    }
    return false;
}

export async function writeTextToFile(filePath: string, content: string): Promise<boolean> {
    try {
        await fs.writeFile(filePath, content, 'utf8');
        return true;
    } catch {
    }
    return false;
}

export function extractFilenameWithoutExtension(fullPath: string): string {
    const filenameWithExtension = basename(fullPath);
    const dotIndex = filenameWithExtension.lastIndexOf('.');
    if (dotIndex < 0) {
        return filenameWithExtension;
    }
    return filenameWithExtension.substring(0, dotIndex);
}
