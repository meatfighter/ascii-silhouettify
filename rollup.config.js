import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';

export default {
    input: './src/main.ts',
    output: {
        file: './dist/ascii-silouette-private.es.js',
        format: 'es',
        interop: 'esModule',
    },
    external: [
        'chroma-js',
        'sharp',
        'simple-statistics'
    ],
    plugins: [
        resolve(),
        typescript(),
        copy({
            targets: [
                {
                    src: 'assets/*',
                    dest: 'dist/assets'
                },
            ]
        }),
    ]
};