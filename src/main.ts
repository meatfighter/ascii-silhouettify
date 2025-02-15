#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';
import { Worker } from 'worker_threads';
import { loadHtmlColors, Palette } from '@/colors';
import { loadGlyphs } from '@/glyphs';
import { loadImage } from '@/images';
import convert from '@/converter';
import { extractArgs, ParamType } from '@/args';
import { ensureDirectoryExists, extractFilenameWithoutExtension, writeTextToFile } from '@/files';
import { getHtmlFooter, getHtmlHeader } from '@/html';
import { Format } from '@/format';

const IMAGE_LOAD_ERROR = 1;

function printUsage() {
    console.log(`
Usage: ascii-silhouettify [options]

Required Values:
  -i, --input "..." ["..."]  Input image filename(s) 
                             Supported formats: png, svg, jpg, webp, gif, tif, heif, avif, pdf
                             Supported filename pattern-matching rules:
                               *         Zero or more characters (e.g. *.png)
                               **/       Zero or more directories (e.g. **/*.png)
                               ?         Exactly one character at the specified position (e.g. example-?.png)
                               [...]     Any single character (e.g. [a-z].png)
                               [!...]    Not any single character (e.g. [!a-z].png)
                               {a,b}     Any of the comma-separated patterns (e.g. {example-*,test-*}.{png,jpg,gif})                             

Optional Values:
  -o, --output "..."         Output filename (default: stdout)
  -f, --format ...           Output format:
                               text      Plain or ANSI-colored text (default when file extension is not .html)    
                               html      Monospaced text in HTML format
                               neofetch  Neofetch's custom ASCII art format (limited to 6 colors)
  -p, --palette ...          Restricted color set:
                               8         First 8 colors of the standard ANSI palette
                               16        Full 16-color standard ANSI palette
                               240       240 colors of the 256-color extended ANSI palette, excluding the standard 
                                         16-color ANSI palette, which is commonly redefined (default)
                               256       Full 256-color extended ANSI palette
  -c, --colors ...           Maximum number of colors (range: 1--255) (default: 255)
  -F, --font-size ...        Terminal or browser font size in points (default: 12)
  -l, --line-height ...      Terminal or browser line height relative to font size (default: 1.2)
  -s, --scale ...            Input image scaling factor (default: 1)
  -d, --darkness ...         Regions darker than this brightness level translate to blank spaces (0--100) (default: 5)
  -t, --threads ...          Threads count for processing (default: number of available logical processors)

Optional Switches:
  -m, --monochrome           Generate uncolored, plain text

Other Operations:
  -v, --version              Shows version number
  -h, --help                 Shows this help message
  `);
}

async function outputResult(outputFilename: string | undefined, result: string) {
    if (!outputFilename) {
        console.log(result);
        return;
    }

    if (!(await ensureDirectoryExists(outputFilename))) {
        console.log('\nFailed to create output directory.\n');
        return;
    }

    if (!(await writeTextToFile(outputFilename, result))) {
        console.log('\nFailed to create output file.\n');
    }
}

async function main() {
    let args: Map<string, string | boolean | number | string[]>;
    try {
        args = extractArgs([
            {
                key: 'input',
                flags: [ '-i', '--input' ],
                type: ParamType.FILENAMES,
            },
            {
                key: 'output',
                flags: [ '-o', '--output' ],
                type: ParamType.STRING,
            },
            {
                key: 'format',
                flags: [ '-f', '--format' ],
                type: ParamType.STRING,
            },
            {
                key: 'palette',
                flags: [ '-p', '--palette' ],
                type: ParamType.INTEGER,
            },
            {
                key: 'colors',
                flags: [ '-c', '--colors' ],
                type: ParamType.INTEGER,
            },
            {
                key: 'font-size',
                flags: [ '-F', '--font-size' ],
                type: ParamType.FLOAT,
            },
            {
                key: 'line-height',
                flags: [ '-l', '--line-height' ],
                type: ParamType.FLOAT,
            },
            {
                key: 'scale',
                flags: [ '-s', '--scale' ],
                type: ParamType.FLOAT,
            },
            {
                key: 'darkness',
                flags: [ '-d', '--darkness' ],
                type: ParamType.FLOAT,
            },
            {
                key: 'threads',
                flags: [ '-t', '--threads' ],
                type: ParamType.INTEGER,
            },
            {
                key: 'web',
                flags: [ '-w', '--web' ],
                type: ParamType.NONE,
            },
            {
                key: 'monochrome',
                flags: [ '-m', '--monochrome' ],
                type: ParamType.NONE,
            },
            {
                key: 'version',
                flags: [ '-v', '--version' ],
                type: ParamType.NONE,
            },
            {
                key: 'help',
                flags: [ '-h', '--help' ],
                type: ParamType.NONE,
            },
        ]);
    } catch (e) {
        console.log();
        console.log((e as Error).message);
        printUsage();
        return;
    }

    if (args.get('version') as boolean | undefined) {
        console.log('\n1.0.2\n');
        return;
    }

    if (args.get('help') as boolean | undefined) {
        printUsage();
        return;
    }

    const inputFilenames = args.get('input') as string[] | undefined;
    if (!inputFilenames) {
        printUsage();
        return;
    }
    if (inputFilenames.length === 0) {
        console.log('\nInput image files not found.\n');
        return;
    }
    const title = extractFilenameWithoutExtension(inputFilenames[0]);

    const outputFilename = args.get('output') as string | undefined;

    let fmt = args.get('format') as string | undefined;
    if (!fmt) {
        fmt = 'text';
        if (outputFilename) {
            const lc = outputFilename.toLowerCase();
            if (lc.endsWith('.htm') || lc.endsWith('.html')) {
                fmt = 'html';
            }
        }
    }

    let format: Format;
    switch (fmt) {
        case 'text':
            format = Format.TEXT;
            break;
        case 'html':
            format = Format.HTML;
            break;
        case 'neofetch':
            format = Format.NEOFETCH;
            break;
        default:
            console.log('\nFormat must be either text, html, or neofetch.\n');
            return;
    }

    const colored = !((args.get('monochrome') as boolean | undefined) || false);

    let palette: Palette;
    let pal = args.get('palette') as number | undefined;
    if (pal === undefined) {
        pal = 240;
    }
    switch (pal) {
        case 8:
            palette = Palette.STANDARD_8;
            break;
        case 16:
            palette = Palette.STANDARD_16;
            break;
        case 240:
            palette = Palette.EXTENDED_240;
            break;
        case 256:
            palette = Palette.EXTENDED_256;
            break;
        default:
            console.log('\nPalette must be either 8, 16, 240, or 256.\n');
            return;
    }

    let colors = args.get('colors') as number | undefined;
    if (colors === undefined) {
        colors = (format === Format.NEOFETCH) ? 6 : 255;
    }
    if (format === Format.NEOFETCH) {
        if (colors < 1 || colors > 6) {
            console.log('\nWhen format is neofetch, colors is restricted to 1--6.\n');
            return;
        }
    } else if (colors < 1 || colors > 255) {
        console.log('\nColors is restricted to 1--255.\n');
        return;
    }

    let fontSize = args.get('font-size') as number | undefined;
    if (fontSize === undefined) {
        fontSize = 12;
    }
    if (fontSize <= 0) {
        console.log('\nFont size must be >= 0.\n');
        return;
    }

    let lineHeight = args.get('line-height') as number | undefined;
    if (lineHeight === undefined) {
        lineHeight = 1.2;
    }
    if (lineHeight <= 0) {
        console.log('\nLine height must be >= 0.\n');
        return;
    }

    let scale = args.get('scale') as number | undefined;
    if (scale === undefined) {
        scale = 1;
    }
    if (scale <= 0) {
        console.log('\nScale must be >= 0.\n');
        return;
    }

    let darkness = args.get('darkness') as number | undefined;
    if (darkness === undefined) {
        darkness = 5;
    }
    if (darkness < 0 || darkness > 100) {
        console.log('\nDarkness is restricted to 0--100.\n');
        return;
    }

    const logicalProcessors = os.cpus().length;
    let threads = args.get('threads') as number | undefined;
    if (threads === undefined) {
        threads = logicalProcessors;
    }
    if (threads < 1) {
        console.log('\nProcessing requires a minimum of one thread.\n');
        return;
    } else if (threads > logicalProcessors) {
        console.log(`\nThread count cannot exceed the number of logical processors (${logicalProcessors}).\n`);
        return;
    }

    const htmlColors = loadHtmlColors();
    const glyphInfo = await loadGlyphs();

    let result: string = '';
    if (format === Format.HTML) {
        result += getHtmlHeader(title, fontSize, lineHeight);
    }

    const workerPath = path.join(dirname(fileURLToPath(import.meta.url)), 'worker.bundle.js');
    const workers = new Array<Worker>(threads);
    for (let i = threads - 1; i >= 0; --i) {
        workers[i] = new Worker(workerPath);
    }

    for (let i = 0; i < inputFilenames.length; ++i) {
        let image;
        try {
            image = await loadImage(inputFilenames[i], palette, colors, darkness);
        } catch {
            console.log(`\nFailed to load input image file: ${inputFilenames[i]}\n`);
            process.exit(IMAGE_LOAD_ERROR);
        }
        const ascii = await convert(image, glyphInfo, colored, scale, fontSize, lineHeight, format, palette,
                htmlColors, workers);
        if (format === Format.HTML) {
            result += '<pre>' + ascii.text + '</pre>';
        } else {
            result += ascii.text;
        }
    }

    if (format === Format.HTML) {
        result += getHtmlFooter();
    }

    for (let i = threads - 1; i >= 0; --i) {
        void workers[i].terminate();
    }

    void await outputResult(outputFilename, result);
}

void await main();
