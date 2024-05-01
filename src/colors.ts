import chroma from 'chroma-js';

const BLACK_LUMINANCE = 10;

const RGBS = 'DAwMxQ8fE6EOwZwAADfaiBeYOpbdzMzMdnZ250hWFsYM+fGlO3j/tACeYdbW8vLyAAAAAABfAACHAACvAADXAAD/AF8AAF9fAF+HAF+' +
    'vAF/XAF//AIcAAIdfAIeHAIevAIfXAIf/AK8AAK9fAK+HAK+vAK/XAK//ANcAANdfANeHANevANfXANf/AP8AAP9fAP+HAP+vAP/XAP//XwAAXwB' +
    'fXwCHXwCvXwDXXwD/X18AX19fX1+HX1+vX1/XX1//X4cAX4dfX4eHX4evX4fXX4f/X68AX69fX6+HX6+vX6/XX6//X9cAX9dfX9eHX9evX9fXX9f' +
    '/X/8AX/9fX/+HX/+vX//XX///hwAAhwBfhwCHhwCvhwDXhwD/h18Ah19fh1+Hh1+vh1/Xh1//h4cAh4dfh4eHh4evh4fXh4f/h68Ah69fh6+Hh6+' +
    'vh6/Xh6//h9cAh9dfh9eHh9evh9fXh9f/h/8Ah/9fh/+Hh/+vh//Xh///rwAArwBfrwCHrwCvrwDXrwD/r18Ar19fr1+Hr1+vr1/Xr1//r4cAr4d' +
    'fr4eHr4evr4fXr4f/r68Ar69fr6+Hr6+vr6/Xr6//r9cAr9dfr9eHr9evr9fXr9f/r/8Ar/9fr/+Hr/+vr//Xr///1wAA1wBf1wCH1wCv1wDX1wD' +
    '/118A119f11+H11+v11/X11//14cA14df14eH14ev14fX14f/168A169f16+H16+v16/X16//19cA19df19eH19ev19fX19f/1/8A1/9f1/+H1/+' +
    'v1//X1////wAA/wBf/wCH/wCv/wDX/wD//18A/19f/1+H/1+v/1/X/1///4cA/4df/4eH/4ev/4fX/4f//68A/69f/6+H/6+v/6/X/6///9cA/9d' +
    'f/9eH/9ev/9fX/9f///8A//9f//+H//+v///X////CAgIEhISHBwcJiYmMDAwOjo6RERETk5OWFhYYmJibGxsdnZ2gICAioqKlJSUnp6eqKiosrK' +
    'yvLy8xsbG0NDQ2tra5OTk7u7u';

const buffer = Buffer.from(RGBS, 'base64');

const palette = new Array<number[]>(256);

const closestColorCache = new Map<number, number>();

export function loadHtmlColors(): string[] {
    const htmlColors = new Array<string>(256);
    for (let i = 0, j = 0; i < palette.length; ++i) {
        const r = buffer[j++];
        const g = buffer[j++];
        const b = buffer[j++];
        palette[i] = chroma(r, g, b).lab();
        htmlColors[i] = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase();
    }
    return htmlColors;
}

export function findClosestColorIndex(r: number, g: number, b: number, a: number) {
    const key = (r << 24) | (g << 16) | (b << 8) | a;
    const value = closestColorCache.get(key);
    if (value !== undefined) {
        return value;
    }

    let index = 0;
    const c = chroma(r, g, b).lab();
    c[0] *= a / 255;
    if (c[0] >= BLACK_LUMINANCE) {
        let error = Number.MAX_VALUE;

        // Do not compare against the traditional 16 ANSI colors since they are commonly redefined.
        for (let i = 255; i >= 16; --i) {
            const p = palette[i];
            const dl = p[0] - c[0];
            const da = p[1] - c[1];
            const db = p[2] - c[2];
            const e = dl * dl + da * da + db * db;
            if (e < error) {
                error = e;
                index = i;
            }
        }
    }

    closestColorCache.set(key, index);
    return index;
}