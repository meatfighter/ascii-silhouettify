#!/usr/bin/env node

import { convert } from '@/ascii';
import { loadImage } from '@/images';

const ascii = convert(await loadImage('images/windows.png'), true, 1, 9, 19);

console.log(ascii.text);
console.log(ascii.matched);

