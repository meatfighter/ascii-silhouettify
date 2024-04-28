export enum ParamType {
    NONE,
    STRING,
    BOOLEAN,
    INTEGER,
    FLOAT,
}

export type Parameter = {
    key: string,
    flags: string[],
    type: ParamType,
};

export function extractArgs(params: Parameter[]): Map<string, string | boolean | number> {

    const result = new Map<string, string | boolean | number>();
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
        const value = args[i++];
        switch (param.type) {
            case ParamType.STRING:
                result.set(param.key, value);
                break;
            case ParamType.BOOLEAN:
                result.set(param.key, value.toLowerCase().charAt(0) === 't');
                break;
            case ParamType.INTEGER: {
                const v = parseInt(value);
                if (isNaN(v)) {
                    throw new Error(`Value for flag ${flag} is not a number.`);
                }
                result.set(param.key, v);
                break;
            }
            case ParamType.FLOAT: {
                const v = parseFloat(value);
                if (isNaN(v)) {
                    throw new Error(`Value for flag ${flag} is not a number.`);
                }
                result.set(param.key, v);
                break;
            }
        }
    }

    return result;
}