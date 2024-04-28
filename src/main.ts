#!/usr/bin/env node

// default font size 12
// default line height 1.2

import { convert } from '@/ascii';
import { loadImage } from '@/images';
import console from 'console';

function printUsage() {
    console.log();
    console.log('Usage: ascii-silhouette [options]');
    console.log();
    console.log('Options:');
    console.log('  -i, --input ...     Input filename (J')
    console.log('  -o, --output ...    Output filename (in quotes)');
    console.log();
    console.log('  -v, --version       Print ascii-silhouette version');
    console.log('  -h, --help          Print ascii-silhouette command-line options');
    console.log();
}

const ascii = convert(await loadImage('images/ubuntu.png'), true, 1, 12, 1.2, false);

console.log(ascii.text);
console.log(ascii.matched);

