#!/usr/bin/env node

// default font size 12
// default line height 1.2

import { convert } from '@/ascii';
import { loadImage } from '@/images';

function printUsage() {
    console.log();
    console.log('Usage: ascii-silhouette [options]');
    console.log();
    console.log('Required:');
    console.log('  -i, --input "..."      Input image filename (formats: png, svg, jpg, webp, gif, tif, heif, avif, ' +
        'pdf)');
    console.log();
    console.log('Optional:');
    console.log('  -o, --output "..."     Output filename (formats: txt, ans, html) (default: stdout)');
    console.log('  -w, --web              For HTML, not ASCII or ANSI (default based on output filename extension)');
    console.log('  -m, --monochrome       For unstyled text, not colored text');
    console.log('  -f, --font-size ...    Terminal or browser font size in points (default: 12)');
    console.log('  -l, --line-height ...  Terminal or browser line height relative to font size (default: 1.2)');
    console.log('  -s, --scale ...        Input image scaling factor (default: 1)');
    console.log();
    console.log('Other:');
    console.log('  -v, --version          Shows version number');
    console.log('  -h, --help             Shows this help message');
    console.log();
}

const ascii = convert(await loadImage('images/google-icon.svg'), true, 1, 12, 1.2, false);

console.log(ascii.text);
console.log(ascii.matched);

