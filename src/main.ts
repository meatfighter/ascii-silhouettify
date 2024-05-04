#!/usr/bin/env node

import os from 'os';
import { loadHtmlColors } from '@/colors';
import { loadGlyphs } from '@/glyphs';
import { loadImage } from '@/images';
import convert from '@/converter';
import { extractArgs, ParamType } from '@/args';
import { ensureDirectoryExists, extractFilenameWithoutExtension, writeTextToFile } from '@/files';
import * as console from 'console';
import { getHtmlFooter, getHtmlHeader } from '@/html';

function printUsage() {
    console.log(`
Usage: ascii-silhouette [options]

Required Values:
  -i, --input "..." ["..."]  Input image filename(s) 
                             Supported formats: png, svg, jpg, webp, gif, tif, heif, avif, pdf
                             Supported filename pattern-matching rules:
                               *       Zero or more characters (e.g. *.png)
                               **/     Zero or more directories (e.g. **/*.png)
                               ?       Exactly one character at the specified position (e.g. example-?.png)
                               [...]   Any single character (e.g. [a-z].png)
                               [!...]  Not any single character (e.g. [!a-z].png)
                               {a,b}   Any of the comma-separated patterns (e.g. {example-*,test-*}.{png,jpg,gif})                             

Optional Values:
  -o, --output "..."         Output filename (supported formats: txt, ans, html) (default: stdout)
  -f, --font-size ...        Terminal or browser font size in points (default: 12)
  -l, --line-height ...      Terminal or browser line height relative to font size (default: 1.2)
  -s, --scale ...            Input image scaling factor (default: 1)
  -t, --threads ...          Threads count for processing (default: number of available logical processors)

Optional Switches:
  -w, --web                  Generate HTML instead of ASCII or ANSI (default based on output filename extension)
  -u, --unstyled             Generate unstyled text

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
                key: 'web',
                flags: [ '-w', '--web' ],
                type: ParamType.NONE,
            },
            {
                key: 'unstyled',
                flags: [ '-u', '--unstyled' ],
                type: ParamType.NONE,
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
                key: 'threads',
                flags: [ '-t', '--threads' ],
                type: ParamType.INTEGER,
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
    if (!inputFilenames || inputFilenames.length === 0) {
        printUsage();
        return;
    }
    const title = extractFilenameWithoutExtension(inputFilenames[0]);

    const outputFilename = args.get('output') as string | undefined;
    const lc = outputFilename ? outputFilename.toLowerCase() : undefined;
    const html = (args.get('web') as boolean | undefined) || (lc && (lc.endsWith('.html') || lc.endsWith('.htm')))
            || false;
    const color = !((args.get('unstyled') as boolean | undefined) || false);

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
    if (html) {
        result += getHtmlHeader(title, fontSize, lineHeight);
    }

    for (let i = 0; i < inputFilenames.length; ++i) {
        let image;
        try {
            image = await loadImage(inputFilenames[i]);
        } catch {
            console.log(`\nFailed to load input image file: ${inputFilenames[i]}\n`);
            return;
        }
        const ascii = await convert(image, glyphInfo, color, scale, fontSize, lineHeight, html, htmlColors, threads);
        result += ascii.text;
    }

    if (html) {
        result += getHtmlFooter();
    }

    void await outputResult(outputFilename, result);
}

void await main();
