#!/usr/bin/env node

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

// TODO RENAME UNCOLORED TO MONOCHROME (m)
function printUsage() {
    console.log(`
Usage: ascii-silhouette [options]

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
  -r, --format ...           Output format:
                               text      Plain or ANSI-colored text (default when file extension is not .html)    
                               html      Monospaced text in HTML format
                               neofetch  Neofetch's custom ASCII art format, which is limited to 6 colors of the 
                                         standard 16-color ANSI palette
  -p, --palette ...          Restricted color set:
                               8         First 8 colors of the standard ANSI palette
                               16        Full 16-color standard ANSI palette
                               240       240 colors of the 256-color extended ANSI palette, excluding the standard 
                                         16-color ANSI palette, which is commonly redefined (default)
                               256       Full 256-color extended ANSI palette
  -c, --colors ...           Maximum number of colors (range: 1--255) (default: 255)
  -f, --font-size ...        Terminal or browser font size in points (default: 12)
  -l, --line-height ...      Terminal or browser line height relative to font size (default: 1.2)
  -s, --scale ...            Input image scaling factor (default: 1)
  -d, --darkness ...         Regions darker than this brightness level translate to blank spaces (0--100) (default: 10)
  -t, --threads ...          Threads count for processing (default: number of available logical processors)

Optional Switches:
  -u, --uncolored            Generate unstyled, plain text

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
                flags: [ '-r', '--format' ],
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
                flags: [ '-f', '--font-size' ],
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
                key: 'uncolored',
                flags: [ '-u', '--uncolored' ],
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
        console.log('\n1.0.0\n');
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

    const colored = !((args.get('uncolored') as boolean | undefined) || false);

    let palette: Palette;
    switch ((args.get('palette') as number | undefined) || (format === Format.NEOFETCH ? 16 : 240)) {
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
    if (format === Format.NEOFETCH && (palette === Palette.EXTENDED_240 || palette === Palette.EXTENDED_256)) {
        console.log('\nWhen format is neofetch, palette is restricted to 8 or 16.\n');
        return;
    }

    const colors = (args.get('colors') as number | undefined) || (format === Format.NEOFETCH ? 6 : 255);
    if (format === Format.NEOFETCH) {
        if (colors < 1 || colors > 6) {
            console.log('\nWhen format is neofetch, colors is restricted to 1--6.\n');
            return;
        }
    } else if (colors < 1 || colors > 255) {
        console.log('\nColors is restricted to 1--255.\n');
        return;
    }

    const fontSize = (args.get('font-size') as number | undefined) || 12;
    if (fontSize <= 0) {
        console.log('\nFont size must be >= 0.\n');
        return;
    }

    const lineHeight = (args.get('line-height') as number | undefined) || 1.2;
    if (lineHeight <= 0) {
        console.log('\nLine height must be >= 0.\n');
        return;
    }

    const scale = (args.get('scale') as number | undefined) || 1;
    if (scale <= 0) {
        console.log('\nScale must be >= 0.\n');
        return;
    }

    const darkness = (args.get('darkness') as number | undefined) || 10;
    if (darkness < 0 || darkness > 100) {
        console.log('\nDarkness is restricted to 0--100.\n');
        return;
    }

    const logicalProcessors = os.cpus().length;
    const threads = (args.get('threads') as number | undefined) || logicalProcessors;
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

    const workers = new Array<Worker>(threads);
    for (let i = threads - 1; i >= 0; --i) {
        workers[i] = new Worker('./dist/worker.bundle.js');
    }

    for (let i = 0; i < inputFilenames.length; ++i) {
        let image;
        try {
            image = await loadImage(inputFilenames[i], palette, colors, darkness);
        } catch {
            console.log(`\nFailed to load input image file: ${inputFilenames[i]}\n`);
            return;
        }
        const ascii = await convert(image, glyphInfo, colored, scale, fontSize, lineHeight, format, palette,
                htmlColors, workers);
        result += ascii.text;
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
