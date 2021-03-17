import ts from "byots";

function typeFlagsToString(flags: ts.TypeFlags): string {
    let fl: string[] = [];
    for (let a in ts.TypeFlags) {
        if ((flags & parseInt(ts.TypeFlags[a])) === parseInt(ts.TypeFlags[a])) {
            fl.push(a);
        }
    }
    return fl.join(",");
}

function symbolFlagsToString(flags: ts.SymbolFlags): string {
    let fl: string[] = [];
    for (let a in ts.SymbolFlags) {
        if ((flags & parseInt(ts.SymbolFlags[a])) === parseInt(ts.SymbolFlags[a])) {
            fl.push(a);
        }
    }
    return fl.join(",");
}

function symbolHasFlag(symbol: ts.Symbol, flag: ts.SymbolFlags) {
    return (symbol.flags & flag) === flag;
}

function repeatString(count: number, str: string = "  ") {
    return new Array(count)
        .fill(0)
        .map(() => str)
        .join("");
}

export type JSDocProps = {
    [prop: string]: string;
};
export type Types = {
    [name: string]: TypeSchema;
};
export type TypeSchema =
    | { type: "or"; schemas: readonly TypeSchema[] }
    | { type: "ref"; name: string }
    | { type: "objectLiteral"; fields: Types }
    | { type: "array"; itemType: TypeSchema; min?: number; max?: number }
    | { type: "tuple"; itemTypes: readonly TypeSchema[] }
    | { type: "undefined" }
    | { type: "null" }
    | { type: "string"; min?: number; max?: number; regex?: string }
    | { type: "boolean" }
    | { type: "object" }
    | { type: "never" }
    | { type: "unknown" }
    | { type: "any" }
    | { type: "number"; min?: number; max?: number }
    | { type: "numberLiteral"; value: number }
    | { type: "stringLiteral"; value: string }
    | { type: "booleanLiteral"; value: boolean };

export const SKIP_TYPES = ["Date", "Decimal", "Function"];

export function createSchemaForObjectType(type: ts.ObjectType, checker: ts.TypeChecker, otherTypes: Types): TypeSchema {
    let name = (type.aliasSymbol ?? type.symbol).name;
    let fullName = checker.typeToString(type);

    if (SKIP_TYPES.includes(fullName)) {
        console.warn(`Not serializing type \`${fullName}\``);
        return { type: "never" };
    }

    let schema: TypeSchema = { type: "objectLiteral", fields: {} };
    if (name !== "__type") {
        if (name in otherTypes) return { type: "ref", name: fullName };
        otherTypes[fullName] = schema;
    }

    let properties = checker.getAugmentedPropertiesOfType(type);
    for (let i = 0; i < properties.length; i++) {
        let property = properties[i];

        if (symbolHasFlag(property, ts.SymbolFlags.Method)) {
            console.warn(`Ignoring function \`${property.name}\``);
            continue;
        }

        let jsDocProps: JSDocProps = {};
        property.getJsDocTags().forEach((e) => e.name.startsWith("v-") && (jsDocProps[e.name.substring(2)] = e.text ?? ""));

        // Thx! https://stackoverflow.com/questions/61933695/typescript-compiler-api-get-get-type-of-mapped-property
        let propType = checker.getTypeOfSymbolAtLocation(property, property.declarations?.[0] ?? type.symbol.declarations![0]);
        let sch = createSchemaForType(propType, checker, otherTypes, jsDocProps);
        schema.fields[property.name] = sch;
    }

    return name !== "__type" ? { type: "ref", name: fullName } : schema;
}

export function createSchemaForType(type: ts.Type, checker: ts.TypeChecker, otherTypes: Types, customProps: JSDocProps = {}): TypeSchema {
    switch (type.flags) {
        case ts.TypeFlags.Object: {
            if (checker.isTupleType(type)) {
                let tupleType = type as ts.TupleType;
                return {
                    type: "tuple",
                    itemTypes: tupleType.resolvedTypeArguments!.map((e) => createSchemaForType(e, checker, otherTypes, customProps)),
                };
            } else if (checker.isArrayType(type)) {
                let arrType = checker.getElementTypeOfArrayType(type)!;
                return {
                    type: "array",
                    itemType: createSchemaForType(arrType, checker, otherTypes, customProps),
                    min: "min" in customProps ? parseInt(customProps["min"]) : undefined,
                    max: "max" in customProps ? parseInt(customProps["max"]) : undefined,
                };
            } else if (
                symbolHasFlag(type.symbol, ts.SymbolFlags.Interface) ||
                symbolHasFlag(type.symbol, ts.SymbolFlags.TypeLiteral) ||
                symbolHasFlag(type.symbol, ts.SymbolFlags.Class)
            ) {
                return createSchemaForObjectType(type as ts.ObjectType, checker, otherTypes);
            } else {
                throw new Error(`Unsupported object type \`${symbolFlagsToString(type.symbol.flags)}\``);
            }
        }

        case ts.TypeFlags.Union:
            return { type: "or", schemas: (type as ts.UnionType).types.map((e) => createSchemaForType(e, checker, otherTypes, customProps)) };
        case ts.TypeFlags.String:
            return {
                type: "string",
                min: "min" in customProps ? parseInt(customProps["min"]) : undefined,
                max: "max" in customProps ? parseInt(customProps["max"]) : undefined,
                regex: customProps["regex"],
            };
        case ts.TypeFlags.Number:
            return {
                type: "number",
                min: "min" in customProps ? parseInt(customProps["min"]) : undefined,
                max: "max" in customProps ? parseInt(customProps["max"]) : undefined,
            };
        case ts.TypeFlags.Boolean:
            return { type: "boolean" };
        case ts.TypeFlags.Never:
            console.warn(`A never type was found, this will always validate to false. \`${checker.typeToString(type)}\``);
            return { type: "never" };
        case ts.TypeFlags.Any:
            console.warn(`An any type was found, this will always validate to true. \`${checker.typeToString(type)}\``);
            return { type: "any" };
        case ts.TypeFlags.NumberLiteral:
            return { type: "numberLiteral", value: (type as ts.NumberLiteralType).value };
        case ts.TypeFlags.StringLiteral:
            return { type: "stringLiteral", value: (type as ts.StringLiteralType).value };
        case ts.TypeFlags.BooleanLiteral:
            return { type: "booleanLiteral", value: type.id === 17 }; // Better way?
        case ts.TypeFlags.Undefined:
            return { type: "undefined" };
        case ts.TypeFlags.Null:
            return { type: "null" };
        case ts.TypeFlags.Unknown:
            return { type: "unknown" };
        case ts.TypeFlags.NonPrimitive:
            return { type: "object" };

        case ts.TypeFlags.TypeParameter:
            throw new Error(`The type of generic \`${(type as ts.TypeParameter).symbol.name}\` must be known at build time.`);

        default:
            // & (ts.TypeFlags.Intersection) will be flattened when using getAugmentedPropertiesOfType, so when it remains it means something is not right
            throw new Error(`Unsupported type \`${typeFlagsToString(type.flags)}\``);
    }
}

export function createSchemaForTypeDeclaration(e: ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration, checker: ts.TypeChecker, output: Types) {
    if ((ts.isInterfaceDeclaration(e) || ts.isClassDeclaration(e) || ts.isTypeAliasDeclaration(e)) && e.name) {
        let name = e.name.text;
        let t = createSchemaForType(checker.getTypeAtLocation(e), checker, output);
        if (!output[name]) output[name] = t;
    } else {
        throw new Error(`Unsupported declaration type \`${ts.NodeFlags[e.flags]}\``);
    }
}

type ErrorType<T, Error> = Error | null | (T extends {} ? ErrorMap<T, Error> : never);

type ErrorMap<T, Error = string> = {
    [Key in keyof T]?: ErrorType<NonNullable<T>, Error>;
};

interface ValidationSettings {
    otherTypes?: Types;
    abortEarly?: boolean;
    maxStringLength?: number;
}

function validate<T, Error extends string = string>(schema: TypeSchema, value: any, settings: ValidationSettings): ErrorType<T, Error> {
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
    }
}
