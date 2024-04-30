#!/usr/bin/env node

// default font size 12
// default line height 1.2

import { convert } from '@/ascii';
import { loadImage } from '@/images';

// function printUsage() {
//     console.log(
// `Usage: ascii-silhouette [options]
//
// Required:
//   -i, --input "..."      Input image filename (formats: png, svg, jpg, webp, gif, tif, heif, avif, pdf)
//
// Optional:
//   -o, --output "..."     Output filename (formats: txt, ans, html) (default: stdout)
//   -w, --web              To generate HTML instead of ASCII or ANSI (default based on output filename extension)
//   -m, --monochrome       To generate unstyled text
//   -f, --font-size ...    Terminal or browser font size in points (default: 12)
//   -l, --line-height ...  Terminal or browser line height relative to font size (default: 1.2)
//   -s, --scale ...        Input image scaling factor (default: 1)
//
// Other:
//   -v, --version          Shows version number
//   -h, --help             Shows this help message`);
// }

const ascii = convert(await loadImage('images/acrobat.png'), true, 1, 12, 1.2, false);

console.log(ascii.text);
console.log(ascii.matched);

