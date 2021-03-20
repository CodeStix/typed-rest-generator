import { Types, TypeSchema } from "./typeExtractor";

export type ErrorType<T, Error = string> = Error | (T extends {} ? ErrorMap<T, Error> : never);
export type ErrorMap<T, Error = string> = {
    [Key in keyof T]?: ErrorType<T[Key], Error>;
};

export interface ValidationSettings {
    otherTypes?: Types;
    abortEarly?: boolean;
    defaultMaxStringLength?: number;
    unknownKeyMode?: "delete" | "error";
    defaultNumberMode?: "integer" | "float";
}

export function validate<T extends any, Error extends string = string>(
    schema: TypeSchema,
    value: T,
    settings: ValidationSettings
): [errors: ErrorMap<T, Error> | null, sanitizedValue: T | undefined] {
    switch (schema.type) {
        case "never":
        case "unknown":
            return ["this value should not exist" as any, undefined];
        case "any":
            return [null, value];
        case "number":
            if (typeof value !== "number" || isNaN(value)) return [(schema.typeMessage ?? "must be of type `number`") as any, undefined];
            if (schema.min && value < schema.min) return [(schema.minMessage ?? "must be higher") as any, undefined];
            if (schema.max && value > schema.max) return [(schema.maxMessage ?? "must be lower") as any, undefined];
            if (!Number.isInteger(value) && (schema.integer ?? (!settings.defaultNumberMode || settings.defaultNumberMode === "integer")))
                return [(schema.integerMessage ?? "must be integer") as any, undefined];
            return [null, value];
        case "string":
            if (typeof value !== "string") return [(schema.typeMessage ?? "must be of type `string`") as any, undefined];
            if (schema.min && value.length < schema.min) return [(schema.minMessage ?? "must be longer") as any, undefined];
            let max = schema.max ?? settings.defaultMaxStringLength;
            if (max && value.length > max) return [(schema.maxMessage ?? "must be shorter") as any, undefined];
            if (schema.regex && value.match(schema.regex) === null) return [(schema.regexMessage ?? "does not match regex") as any, undefined];
            return [null, value];
        case "boolean":
        case "object":
        case "undefined":
            return typeof value === schema.type ? [null, value] : [(schema.typeMessage ?? `must be of type \`${schema.type}\``) as any, undefined];
        case "null":
            return value === null ? [null, value] : [(schema.typeMessage ?? "must be `null`") as any, undefined];
        case "ref":
            let sch = settings.otherTypes?.[schema.name];
            if (!sch) throw new Error(`Schema for type \`${schema.name}\` was not found.`);
            return validate(sch, value, settings);
        case "stringLiteral":
        case "booleanLiteral":
        case "numberLiteral":
            return value === schema.value ? [null, value] : [(schema.message ?? `must have value \`${schema.value}\``) as any, undefined];
        case "or": {
            let err = [];
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                let [r, v] = validate<T, Error>(sch, value, settings);
                if (r === null) return [r, v];
                err.push(r);
            }
            let objError = err.find((e) => typeof e === "object");
            if (objError) return [objError as any, undefined];
            return [err[err.length - 1] || ("invalid or" as any), undefined];
        }
        case "array": {
            if (!Array.isArray(value)) return ["invalid array" as any, undefined];
            if (schema.min && value.length < schema.min) return [(schema.minMessage ?? "array too short") as any, undefined];
            if (schema.max && value.length > schema.max) return [(schema.maxMessage ?? "array too long") as any, undefined];
            let err: any = {};
            let copy = new Array(value.length);
            for (let i = 0; i < value.length; i++) {
                let [res, val] = validate(schema.itemType, value[i], settings);
                copy[i] = val;
                if (res !== null) {
                    err[i as keyof T] = res as any;
                    if (settings.abortEarly ?? true) return [err as any, undefined];
                }
            }
            return Object.keys(err).length > 0 ? [err as any, undefined] : [null, copy as any];
        }
        case "objectLiteral": {
            if (typeof value !== "object" || value === null) return ["invalid object" as any, undefined];
            if (settings.unknownKeyMode === "error" && Object.keys(value as any).some((e) => !(e in schema.fields))) return ["object contains unknown keys" as any, undefined];
            let err: any = {};
            let keys = Object.keys(schema.fields);
            let copy: any = {};
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let [res, val] = validate(schema.fields[key], (value as any)[key], settings);
                copy[key] = val;
                if (res !== null) {
                    err[key as keyof T] = res as any;
                    if (settings.abortEarly ?? true) return [err as any, undefined];
                }
            }
            return Object.keys(err).length > 0 ? [err as any, undefined] : [null, copy];
        }
        case "tuple": {
            if (!Array.isArray(value) || value.length > schema.itemTypes.length) return ["invalid tuple" as any, undefined];
            let err: any = {};
            let copy = new Array(value.length);
            for (let i = 0; i < schema.itemTypes.length; i++) {
                let [res, val] = validate(schema.itemTypes[i], value[i], settings);
                copy[i] = val;
                if (res !== null) {
                    err[i as keyof T] = res as any;
                    if (settings.abortEarly ?? true) return [err as any, undefined];
                }
            }
            return Object.keys(err).length > 0 ? [err as any, undefined] : [null, copy as any];
        }
        case "date": {
            if (value instanceof Date) return [null, value];
            if (typeof value === "string" || typeof value === "number") {
                let date = new Date(value);
                return isNaN(date.getTime()) ? [(schema.typeMessage ?? "invalid date") as any, undefined] : [null, date as T];
            } else {
                return [(schema.typeMessage ?? "invalid date") as any, undefined];
            }
        }
    }
}
