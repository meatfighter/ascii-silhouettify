import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
    input: './src/main.ts',
    output: {
        file: './dist/ascii-silouette.es.js',
        format: 'es',
        interop: 'esModule'
    },
    plugins: [
        resolve({
            exportConditions: ["node"],
        }),
        typescript(),
    ]
};