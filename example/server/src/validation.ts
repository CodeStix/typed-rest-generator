type ErrorType<T, Error> = NonNullable<T> extends object ? ErrorMap<NonNullable<T>, Error> | Error : Error;

type ErrorMap<T, Error = string> = {
    [Key in keyof T]?: ErrorType<T[Key], Error>;
};

type Validator<T, Context, Error = string> = (value: T, context: Context) => ErrorType<T, Error> | false | null | undefined;

type ValidationSchema<T, Context, Error = string> = {
    [Key in keyof T]: Validator<T[Key], Context, Error>;
};

function validateObject<T extends object, Context, Error = string>(
    schema: ValidationSchema<T, Context, Error>,
    value: T,
    context?: Context,
    abortEarly = false
): ErrorMap<T, Error> {
    let keys = Object.keys(schema);
    let err: ErrorMap<T, Error> = {};
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i] as keyof T;
        let validator = schema[key];
        let ret = validator(value[key], context!);
        if (ret && (typeof ret !== "object" || Object.keys(ret).length > 0)) {
            err[key] = ret;
            if (abortEarly) return err;
        }
    }
    return err;
}

function or<T, Context, Error = string>(...validators: Validator<T, Context, Error>[]): Validator<T, Context, Error> {
    return (v, c) => {
        let lastError: ErrorType<T, Error> = "or statement is empty" as any;
        for (let i = 0; i < validators.length; i++) {
            let ret = validators[i](v, c);
            if (ret && (typeof ret !== "object" || Object.keys(ret).length > 0)) {
                lastError = ret;
            } else {
                return null;
            }
        }
        return lastError;
    };
}

function and<T, Context, Error = string>(...validators: Validator<T, Context, Error>[]): Validator<T, Context, Error> {
    return (v, c) => {
        for (let i = 0; i < validators.length; i++) {
            let ret = validators[i](v, c);
            if (ret && (typeof ret !== "object" || Object.keys(ret).length > 0)) return ret;
        }
        return null;
    };
}

function value<T, Context, Error = string>(val: any, message?: ErrorType<T, Error>): Validator<T, Context, Error> {
    return (v, c) => v !== val && (message ?? (`must be ${JSON.stringify(val)}` as any));
}

interface Props<T, Error> {
    null?: boolean;
    undefined?: boolean;
    equals?: T;
    typeMessage?: Error;
}

function typeCheck<T, Error = string>(v: T, props: Props<T, ErrorType<T, Error>>, type: "string" | "number" | "object" | "boolean"): ErrorType<T, Error> | null | undefined {
    if (v === undefined || v === null) {
        if ((v === undefined && !props.undefined) || (v === null && !props.null)) return props.typeMessage ?? ("Cannot be undefined/null" as any);
        else return null;
    }
    if (typeof v !== type || (props.equals !== undefined && v !== props.equals)) return props.typeMessage ?? ("Invalid type" as any);
    return undefined;
}

interface StringValidationProps<Error> extends Props<string, Error> {
    min?: number;
    minMessage?: Error;
    max?: number;
    maxMessage?: Error;
}

function string<T, Context, Error = string>(props: StringValidationProps<ErrorType<T, Error>> = {}): Validator<T, Context, Error> {
    return (v: any, c) => {
        let a = typeCheck(v, props, "string");
        if (a !== undefined) return a;
        if (props.min !== undefined && v.length < props.min) return props.minMessage ?? ("Must be longer" as any);
        if (props.max !== undefined && v.length > props.max) return props.maxMessage ?? ("Must be shorter" as any);
        return null;
    };
}

interface NumberValidationProps<Error> extends Props<number, Error> {
    min?: number;
    minMessage?: Error;
    max?: number;
    maxMessage?: Error;
}

function number<T, Context, Error = string>(props: NumberValidationProps<ErrorType<T, Error>> = {}): Validator<T, Context, Error> {
    return (v: any, c) => {
        let a = typeCheck(v, props, "number");
        if (a !== undefined) return a;
        if (props.min !== undefined && v < props.min) return props.minMessage ?? ("Must be larger" as any);
        if (props.max !== undefined && v > props.max) return props.maxMessage ?? ("Must be smaller" as any);
        return null;
    };
}

function boolean<T, Context, Error = string>(props: Props<boolean, ErrorType<T, Error>> = {}): Validator<T, Context, Error> {
    return (v: any, c) => {
        return typeCheck(v, props, "boolean") as any;
    };
}
