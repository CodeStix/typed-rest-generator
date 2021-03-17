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
            return "this value should not exist" as Error;
        case "any":
            return null;
        case "number":
            if (typeof value !== "number") return "must be of type `number`" as Error;
            if (schema.min && value < schema.min) return "must be higher" as Error;
            if (schema.max && value > schema.max) return "must be lower" as Error;
            return null;
        case "string":
            if (typeof value !== "string") return "must be of type `string`" as Error;
            if (schema.min && value.length < schema.min) return "must be longer" as Error;
            let max = schema.max ?? settings.maxStringLength;
            if (max && value.length > max) return "must be shorter" as Error;
            if (schema.regex && value.match(schema.regex) === null) return "does not match regex" as Error;
            return null;
        case "boolean":
        case "object":
        case "undefined":
            return typeof value === schema.type ? null : (`must be of type \`${schema.type}\`` as Error);
        case "null":
            return value === null ? null : ("must be `null`" as Error);
        case "ref":
            let sch = settings.otherTypes?.[schema.name];
            if (!sch) throw new Error(`Schema for type \`${schema.name}\` was not found.`);
            return validate(sch, value, settings);
        case "stringLiteral":
        case "booleanLiteral":
        case "numberLiteral":
            return value === schema.value ? null : (`must have value \`${schema.value}\`` as Error);

        case "or": {
            let err: ErrorType<T, Error>[] = [];
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                let res = validate<T, Error>(sch, value, settings);
                if (res === null) return null;
                err.push(res);
            }
            return err.join(", ") as Error;
        }
        case "array": {
            if (!Array.isArray(value)) return "invalid array" as Error;
            if (schema.min && value.length < schema.min) return "array too short" as Error;
            if (schema.max && value.length > schema.max) return "array too long" as Error;
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
            if (typeof value !== "object" || value === null) return "invalid object" as Error;
            if (Object.keys(value).some((e) => !(e in schema.fields))) return "object contains unknown keys" as Error;
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
            if (!Array.isArray(value) || value.length > schema.itemTypes.length) return "invalid tuple" as Error;
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
                return isNaN(date.getTime()) ? ("invalid date string" as Error) : null;
            } else {
                return "invalid date format" as Error;
            }
        }
    }
}
