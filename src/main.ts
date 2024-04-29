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
    console.log('  -i, --input "..."      Input image filename (png, svg, jpg, webp, gif, tif, heif, avif, pdf)');
    console.log();
    console.log('Optional:');
    console.log('  -o, --output "..."     Output filename (default: stdout) (formats: txt, ans, html)');
    console.log('  -s, --scale ...        Image scaling factor (default: 1)');
    console.log('  -f, --font-size ...    Terminal/browser font size (default: 12)');
    console.log('  -l, --line-height ...  Terminal/browser line height (default: 1.2)');
    console.log('  -m, --monochrome       For unstyled text, not colored text');
    console.log('  -w, --web              For HTML, not ASCII or ANSI (default based on output filename extension)');
    console.log();
    console.log('Other:');
    console.log('  -v, --version          Shows version number');
    console.log('  -h, --help             Shows this help message');
    console.log();
}

const ascii = convert(await loadImage('images/google-icon.svg'), true, 1, 12, 1.2, false);

console.log(ascii.text);
console.log(ascii.matched);

