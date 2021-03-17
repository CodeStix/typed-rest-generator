import ts from "byots";
import { symbolHasFlag, symbolFlagsToString, typeFlagsToString } from "./helpers";

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
