#!/usr/bin/env node

// default font size 12
// default line height 1.2

import { convert } from '@/ascii';
import { loadImage } from '@/images';

const ascii = convert(await loadImage('images/ubuntu.png'), true, 1, 12, 1.2, false);

console.log(ascii.text);
console.log(ascii.matched);

