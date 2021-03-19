import ts from "byots";
import { symbolHasFlag, symbolFlagsToString, typeFlagsToString, getSymbolUsageName, getFullTypeName, isDefaultType } from "./helpers";

export type JSDocProps = {
    [prop: string]: string;
};
export type Types = {
    [name: string]: TypeSchema;
};
export type RootTypes = {
    [name: string]: {
        type: ts.ObjectType;
        schema: TypeSchema;
    };
};
export type NumberTypeSchema = { type: "number"; min?: number; max?: number; minMessage?: string; maxMessage?: string; integer?: boolean; integerMessage?: string };
export type StringTypeSchema = { type: "string"; min?: number; max?: number; regex?: string; minMessage?: string; maxMessage?: string; regexMessage?: string };
export type ArrayTypeSchema = { type: "array"; itemType: TypeSchema; min?: number; max?: number; minMessage?: string; maxMessage?: string };
export type TypeRefSchema = { type: "ref"; name: string };
export type TypeSchema =
    | { type: "or"; schemas: readonly TypeSchema[] }
    | TypeRefSchema
    | { type: "objectLiteral"; fields: Types }
    | ArrayTypeSchema
    | { type: "tuple"; itemTypes: readonly TypeSchema[] }
    | { type: "undefined" }
    | { type: "null" }
    | StringTypeSchema
    | { type: "boolean" }
    | { type: "object" }
    | { type: "never" }
    | { type: "date" }
    | { type: "unknown" }
    | { type: "any" }
    | NumberTypeSchema
    | { type: "numberLiteral"; value: number }
    | { type: "stringLiteral"; value: string }
    | { type: "booleanLiteral"; value: boolean };

export interface TypeSchemaGeneratorSettings {
    checker: ts.TypeChecker;
    otherTypes: RootTypes;
    obfuscateRootTypes?: boolean;
}

let obfuscationMap: {
    [name: string]: string;
} = {};
let obfuscationIndex = 0;

function obfuscate(name: string) {
    if (name in obfuscationMap) {
        return obfuscationMap[name];
    } else {
        let n = obfuscationIndex++ + "";
        obfuscationMap[name] = n;
        return n;
    }
}

function createSchemaForObjectType(type: ts.ObjectType, settings: TypeSchemaGeneratorSettings): TypeSchema {
    let fullName = getFullTypeName(type, settings.checker);
    let serializeName = settings.obfuscateRootTypes ? obfuscate(fullName) : fullName;
    let sym = type.aliasSymbol ?? type.symbol;
    let isInline = sym.name === "__type";

    let schema: TypeSchema = { type: "objectLiteral", fields: {} };
    if (!isInline) {
        if (isDefaultType(sym)) {
            if (fullName === "Date") {
                return { type: "date" };
            }
            console.warn(`Including builtin type \`${fullName}\``);
        }

        if (serializeName in settings.otherTypes) return { type: "ref", name: serializeName };
        settings.otherTypes[serializeName] = { type, schema };
    }

    let properties = settings.checker.getAugmentedPropertiesOfType(type);
    for (let i = 0; i < properties.length; i++) {
        let property = properties[i];

        if (symbolHasFlag(property, ts.SymbolFlags.Method)) {
            console.warn(`Ignoring function \`${property.name}\``);
            continue;
        }

        let jsDocProps: JSDocProps = {};
        property.getJsDocTags().forEach((e) => e.name.startsWith("v-") && (jsDocProps[e.name.substring(2)] = e.text ?? ""));

        // Thx! https://stackoverflow.com/questions/61933695/typescript-compiler-api-get-get-type-of-mapped-property
        let propType = settings.checker.getTypeOfSymbolAtLocation(property, property.declarations?.[0] ?? type.symbol.declarations![0]);
        let sch = createSchemaForType(propType, jsDocProps, settings);
        schema.fields[property.name] = sch;
    }

    return !isInline ? { type: "ref", name: serializeName } : schema;
}

export function createSchemaForType(type: ts.Type, customProps: JSDocProps = {}, settings: TypeSchemaGeneratorSettings): TypeSchema {
    switch (type.flags) {
        case ts.TypeFlags.Object: {
            if (settings.checker.isTupleType(type)) {
                let tupleType = type as ts.TupleType;
                return createNormalSchema(customProps, {
                    type: "tuple",
                    itemTypes: tupleType.resolvedTypeArguments!.map((e) => createSchemaForType(e, customProps, settings)),
                });
            } else if (settings.checker.isArrayType(type)) {
                let arrType = settings.checker.getElementTypeOfArrayType(type)!;
                return createArraySchema(customProps, createSchemaForType(arrType, customProps, settings));
            } else if (
                symbolHasFlag(type.symbol, ts.SymbolFlags.Interface) ||
                symbolHasFlag(type.symbol, ts.SymbolFlags.TypeLiteral) ||
                symbolHasFlag(type.symbol, ts.SymbolFlags.Class)
            ) {
                return createNormalSchema(customProps, createSchemaForObjectType(type as ts.ObjectType, settings));
            } else {
                throw new Error(`Unsupported object type \`${symbolFlagsToString(type.symbol.flags)}\``);
            }
        }

        case ts.TypeFlags.Union:
            return { type: "or", schemas: (type as ts.UnionType).types.map((e) => createSchemaForType(e, customProps, settings)) };
        case ts.TypeFlags.String:
            return createStringSchema(customProps);
        case ts.TypeFlags.Number:
            return createNumberSchema(customProps);
        case ts.TypeFlags.Union | ts.TypeFlags.Boolean:
        case ts.TypeFlags.Boolean:
            return createNormalSchema(customProps, { type: "boolean" });
        case ts.TypeFlags.Never:
            console.warn(`A never type was found, this will always validate to false. \`${settings.checker.typeToString(type)}\``);
            return createNormalSchema(customProps, { type: "never" });
        case ts.TypeFlags.Any:
            console.warn(`An any type was found, this will always validate to true. \`${settings.checker.typeToString(type)}\``);
            return createNormalSchema(customProps, { type: "any" });
        case ts.TypeFlags.NumberLiteral:
            return createNormalSchema(customProps, { type: "numberLiteral", value: (type as ts.NumberLiteralType).value });
        case ts.TypeFlags.StringLiteral:
            return createNormalSchema(customProps, { type: "stringLiteral", value: (type as ts.StringLiteralType).value });
        case ts.TypeFlags.BooleanLiteral:
            return createNormalSchema(customProps, { type: "booleanLiteral", value: type.id === 17 }); // Better way?
        case ts.TypeFlags.Undefined:
            return createNormalSchema(customProps, { type: "undefined" });
        case ts.TypeFlags.Null:
            return createNormalSchema(customProps, { type: "null" });
        case ts.TypeFlags.Unknown:
            return createNormalSchema(customProps, { type: "unknown" });
        case ts.TypeFlags.NonPrimitive:
            return createNormalSchema(customProps, { type: "object" });

        case ts.TypeFlags.TypeParameter:
            throw new Error(`The type of generic \`${(type as ts.TypeParameter).symbol.name}\` must be known at build time.`);

        default:
            // & (ts.TypeFlags.Intersection) will be flattened when using getAugmentedPropertiesOfType, so when it remains it means something is not right
            throw new Error(`Unsupported type \`${typeFlagsToString(type.flags)}\``);
    }
}

export function createSchemaForTypeDeclaration(e: ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration, settings: TypeSchemaGeneratorSettings): TypeRefSchema {
    if ((ts.isInterfaceDeclaration(e) || ts.isClassDeclaration(e) || ts.isTypeAliasDeclaration(e)) && e.name) {
        return createSchemaForType(settings.checker.getTypeAtLocation(e), undefined, settings) as TypeRefSchema;
    } else {
        throw new Error(`Unsupported declaration type \`${ts.NodeFlags[e.flags]}\``);
    }
}

function createStringSchema(customProps: JSDocProps): StringTypeSchema {
    let schema: StringTypeSchema = { type: "string" };
    Object.keys(customProps).forEach((prop) => {
        let args = customProps[prop].split(" ");
        switch (prop) {
            case "min":
                schema.min = parseInt(args[0]);
                schema.minMessage = args.slice(1).join(" ") || undefined;
                break;
            case "max":
                schema.max = parseInt(args[0]);
                schema.maxMessage = args.slice(1).join(" ") || undefined;
                break;
            case "regex":
                let arg = args[0];
                schema.regex = arg.startsWith("/") && arg.endsWith("/") ? arg.substring(1, arg.length - 2) : arg;
                schema.regexMessage = args.slice(1).join(" ") || undefined;
                break;
            default:
                throw new Error(`string does not support validator \`@v-${prop}\``);
        }
    });
    return schema;
}

function parseBoolean(str: string) {
    str = str.trim();
    if (str === "true") return true;
    else if (str === "false") return false;
    else throw new Error("Invalid boolean, please use `true` or `false`.");
}

function createNumberSchema(customProps: JSDocProps): NumberTypeSchema {
    let schema: NumberTypeSchema = { type: "number" };
    Object.keys(customProps).forEach((prop) => {
        let args = customProps[prop].split(" ");
        switch (prop) {
            case "min":
                schema.min = parseInt(args[0]);
                schema.minMessage = args.slice(1).join(" ") || undefined;
                break;
            case "max":
                schema.max = parseInt(args[0]);
                schema.maxMessage = args.slice(1).join(" ") || undefined;
                break;
            case "int":
                schema.integer = parseBoolean(args[0]);
                schema.integerMessage = args.slice(1).join(" ") || undefined;
                break;
            default:
                throw new Error(`number does not support validator \`@v-${prop}\``);
        }
    });
    return schema;
}

function createArraySchema(customProps: JSDocProps, itemType: TypeSchema): ArrayTypeSchema {
    let schema: ArrayTypeSchema = { type: "array", itemType };
    Object.keys(customProps).forEach((prop) => {
        let args = customProps[prop].split(" ");
        switch (prop) {
            case "array-min":
                schema.min = parseInt(args[0]);
                schema.minMessage = args.slice(1).join(" ") || undefined;
                break;
            case "array-max":
                schema.max = parseInt(args[0]);
                schema.maxMessage = args.slice(1).join(" ") || undefined;
                break;
            default:
                throw new Error(`array does not support validator \`@v-${prop}\``);
        }
    });
    return schema;
}

function createNormalSchema(customProps: JSDocProps, schema: TypeSchema): TypeSchema {
    let keys = Object.keys(customProps);
    if (keys.length !== 0) throw new Error(`${schema.type} does not support validator \`@v-${keys[0]}\``);
    return schema;
}

export function rootTypesToTypes(rootTypes: RootTypes): Types {
    let obj: Types = {};
    Object.keys(rootTypes).forEach((e) => (obj[e] = rootTypes[e].schema));
    return obj;
}
