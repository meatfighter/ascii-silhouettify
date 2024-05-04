import * as glob from 'glob';

export enum ParamType {
    NONE,
    STRING,
    BOOLEAN,
    INTEGER,
    FLOAT,
    FILENAMES,
}

export type Parameter = {
    key: string,
    flags: string[],
    type: ParamType,
};

export function extractArgs(params: Parameter[]): Map<string, string | boolean | number | string[]> {

    const result = new Map<string, string | boolean | number | string[]>();
    const flagMap = new Map<string, Parameter>();
    params.forEach(param => {
        if (param.type === ParamType.NONE) {
            result.set(param.key, false);
        }
        param.flags.forEach(flag => flagMap.set(flag, param));
    })

    const args = process.argv;
    for (let i = 2; i < args.length; ) {
        const flag = args[i++];
        const param = flagMap.get(flag);
        if (!param) {
            throw new Error(`Invalid flag: ${flag}`);
        }
        if (param.type === ParamType.NONE) {
            result.set(param.key, true);
            continue;
        } else if (i >= args.length) {
            throw new Error(`Flag ${flag} missing value.`);
        }
        const values: string[] = [];
        do {
            const v = args[i++];
            if (flagMap.has(v)) {
                --i;
                break;
            }
            values.push(v);
        } while (i < args.length);
        switch (param.type) {
            case ParamType.STRING:
                result.set(param.key, values[0]);
                break;
            case ParamType.BOOLEAN:
                result.set(param.key, values[0].toLowerCase().charAt(0) === 't');
                break;
            case ParamType.INTEGER: {
                const v = parseInt(values[0]);
                if (isNaN(v)) {
                    throw new Error(`Value for flag ${flag} is not a number.`);
                }
                result.set(param.key, v);
                break;
            }
            case ParamType.FLOAT: {
                const v = parseFloat(values[0]);
                if (isNaN(v)) {
                    throw new Error(`Value for flag ${flag} is not a number.`);
                }
                result.set(param.key, v);
                break;
            }
            case ParamType.FILENAMES: {
                const filenames: string[] = [];
                values.forEach(value => {
                    try {
                        Array.prototype.push.apply(filenames, glob.sync(value.replace(/\\/g, '/')));
                    } catch {
                        throw new Error('Invalid input filename patterns.');
                    }
                });
                filenames.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
                result.set(param.key, filenames);
                break;
            }
        }
    }

    return result;
}