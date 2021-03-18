import { Types, TypeSchema } from "./typeExtractor";

export type ErrorType<T, Error = string> = Error | (T extends {} ? ErrorMap<T, Error> : never);
export type ErrorMap<T, Error = string> = {
    [Key in keyof T]?: ErrorType<T[Key], Error>;
};

export interface ValidationSettings {
    otherTypes?: Types;
    abortEarly?: boolean;
    maxStringLength?: number;
}

export function validate<T, Error extends string = string>(schema: TypeSchema, value: any, settings: ValidationSettings): ErrorType<T, Error> | null {
    switch (schema.type) {
        case "never":
        case "unknown":
            return "this value should not exist" as any;
        case "any":
            return null;
        case "number":
            if (typeof value !== "number") return "must be of type `number`" as any;
            if (schema.min && value < schema.min) return schema.minMessage ?? ("must be higher" as any);
            if (schema.max && value > schema.max) return schema.maxMessage ?? ("must be lower" as any);
            return null;
        case "string":
            if (typeof value !== "string") return "must be of type `string`" as any;
            if (schema.min && value.length < schema.min) return schema.minMessage ?? ("must be longer" as any);
            let max = schema.max ?? settings.maxStringLength;
            if (max && value.length > max) return schema.maxMessage ?? ("must be shorter" as any);
            if (schema.regex && value.match(schema.regex) === null) return schema.regexMessage ?? ("does not match regex" as any);
            return null;
        case "boolean":
        case "object":
        case "undefined":
            return typeof value === schema.type ? null : (`must be of type \`${schema.type}\`` as any);
        case "null":
            return value === null ? null : ("must be `null`" as any);
        case "ref":
            let sch = settings.otherTypes?.[schema.name];
            if (!sch) throw new Error(`Schema for type \`${schema.name}\` was not found.`);
            return validate(sch, value, settings);
        case "stringLiteral":
        case "booleanLiteral":
        case "numberLiteral":
            return value === schema.value ? null : (`must have value \`${schema.value}\`` as any);

        case "or": {
            let err: ErrorType<T, Error>[] = [];
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                let res = validate<T, Error>(sch, value, settings);
                if (res === null) return null;
                err.push(res);
            }
            return err.join(", ") as any;
        }
        case "array": {
            if (!Array.isArray(value)) return "invalid array" as any;
            if (schema.min && value.length < schema.min) return schema.minMessage ?? ("array too short" as any);
            if (schema.max && value.length > schema.max) return schema.maxMessage ?? ("array too long" as any);
            let err: ErrorMap<T, Error> = {};
            for (let i = 0; i < value.length; i++) {
                let res = validate(schema.itemType, value[i], settings);
                if (res !== null) {
                    err[i as keyof T] = res as any;
                    if (settings.abortEarly) return err as any;
                }
            }
            return Object.keys(err).length > 0 ? (err as any) : null;
        }
        case "objectLiteral": {
            if (typeof value !== "object" || value === null) return "invalid object" as any;
            if (Object.keys(value).some((e) => !(e in schema.fields))) return "object contains unknown keys" as any;
            let err: ErrorMap<T, Error> = {};
            let keys = Object.keys(schema.fields);
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let res = validate(schema.fields[key], value[key], settings);
                if (res !== null) {
                    err[key as keyof T] = res as any;
                    if (settings.abortEarly) return err as any;
                }
            }
            return Object.keys(err).length > 0 ? (err as any) : null;
        }
        case "tuple": {
            if (!Array.isArray(value) || value.length > schema.itemTypes.length) return "invalid tuple" as any;
            let err: ErrorMap<T, Error> = {};
            for (let i = 0; i < schema.itemTypes.length; i++) {
                let res = validate(schema.itemTypes[i], value[i], settings);
                if (res !== null) {
                    err[i as keyof T] = res as any;
                    if (settings.abortEarly) return err as any;
                }
            }
            return Object.keys(err).length > 0 ? (err as any) : null;
        }
        case "date": {
            if (value instanceof Date) return null;
            if (typeof value === "string" || typeof value === "number") {
                let date = new Date(value);
                return isNaN(date.getTime()) ? ("invalid date string" as any) : null;
            } else {
                return "invalid date format" as any;
            }
        }
    }
}
