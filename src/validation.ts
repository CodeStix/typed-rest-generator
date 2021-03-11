import ts from "byots";

export type TypeSchema =
    | { type: "and" | "or"; schemas: readonly TypeSchema[] }
    | { type: "ref"; value: string }
    | { type: "function"; name: string }
    | { type: "isType"; value: "string" | "boolean" | "number" | "object" }
    | { type: "isValue"; value: any }
    | { type: "isArray"; itemSchema: TypeSchema }
    | { type: "isObject"; schema: { [key: string]: TypeSchema } }
    | { type: "isTuple"; itemSchemas: readonly TypeSchema[] }
    | { type: "true" }
    | { type: "false" }
    | { type: "unknown" };

export interface ValidationSettings<Context> {
    otherSchemas?: { [typeName: string]: TypeSchema };
    customValidators?: { [typeName: string]: (value: any, context: Context, settings: ValidationSettings<Context>) => any };
    abortEarly?: boolean;
}

export function validate<Context>(schema: TypeSchema, value: any, context: Context, settings: ValidationSettings<Context>): any {
    switch (schema.type) {
        case "isType":
            return typeof value === schema.value ? null : `must be of type ${schema.value}`;
        case "isValue":
            return value === schema.value ? null : `must have value ${JSON.stringify(schema.value)}`;
        case "isObject": {
            if (typeof value !== "object" || !value) return "invalid object";
            let keys = Object.keys(schema.schema);
            let err: any = {};
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let res = validate(schema.schema[key], (value as any)[key], context, settings);
                if (res) {
                    err[key] = res;
                    if (settings.abortEarly) return err;
                }
            }
            return Object.keys(err).length > 0 ? err : null;
        }
        case "isArray": {
            if (!Array.isArray(value)) return "invalid array";
            let err: any = {};
            for (let i = 0; i < value.length; i++) {
                let item = value[i];
                let res = validate(schema.itemSchema, item, context, settings);
                if (res) {
                    err[i] = res;
                    if (settings.abortEarly) return err;
                }
            }
            return Object.keys(err).length > 0 ? err : null;
        }
        case "isTuple": {
            if (!Array.isArray(value)) return "invalid tuple";
            if (value.length !== schema.itemSchemas.length) return "invalid tuple length";
            let err: any = {};
            for (let i = 0; i < schema.itemSchemas.length; i++) {
                let item = value[i];
                let res = validate(schema.itemSchemas[i], item, context, settings);
                if (res) {
                    err[i] = res;
                    if (settings.abortEarly) return err;
                }
            }
            return Object.keys(err).length > 0 ? err : null;
        }
        case "or": {
            let lastError = "empty or";
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                lastError = validate(sch, value, context, settings);
                if (!lastError) return null;
            }
            return lastError;
        }
        case "and": {
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                let res = validate(sch, value, context, settings);
                if (res) return res;
            }
            return null;
        }
        case "true":
            return null;
        case "false":
            return "this value may not exist";
        case "function":
            let fn = settings.customValidators?.[schema.name];
            if (!fn) throw new Error(`Custom validator '${schema.name}' not found`);
            return fn(value, context, settings);
        case "ref":
            let sch = settings.otherSchemas?.[schema.value];
            if (!sch) throw new Error(`Could not find validator for type '${schema.value}'`);
            return validate(settings.otherSchemas![schema.value], value, context, settings);
        case "unknown":
            throw new Error("Cannot validate unknown type.");
    }
}

export function createTypeSchema(node: ts.Node, checker: ts.TypeChecker): TypeSchema {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
        console.warn("Encountered any keyword, this will always validate to true.");
        return { type: "true" };
    } else if (node.kind === ts.SyntaxKind.NeverKeyword || node.kind === ts.SyntaxKind.UnknownKeyword) {
        console.warn("Encountered never/unknown keyword, this will always validate to false.");
        return { type: "false" };
    } else if (node.kind === ts.SyntaxKind.BooleanKeyword) {
        return { type: "isType", value: "boolean" };
    } else if (node.kind === ts.SyntaxKind.NumberKeyword) {
        return { type: "isType", value: "number" };
    } else if (node.kind === ts.SyntaxKind.StringKeyword) {
        return { type: "isType", value: "string" };
    } else if (node.kind === ts.SyntaxKind.ObjectKeyword) {
        return { type: "isType", value: "object" };
    } else if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
        return { type: "isValue", value: undefined };
    } else if (node.kind === ts.SyntaxKind.NullKeyword) {
        return { type: "isValue", value: null };
    } else if (ts.isParenthesizedTypeNode(node)) {
        return createTypeSchema(node.type, checker);
    } else if (ts.isTupleTypeNode(node)) {
        return { type: "isTuple", itemSchemas: node.elements.map((elem) => createTypeSchema(elem, checker)) };
    } else if (ts.isArrayTypeNode(node)) {
        return { type: "isArray", itemSchema: createTypeSchema(node.elementType, checker) };
    } else if (ts.isLiteralTypeNode(node)) {
        return { type: "isValue", value: node.literal.getText() };
    } else if (ts.isInterfaceDeclaration(node) || ts.isTypeLiteralNode(node) || ts.isClassDeclaration(node)) {
        let obj: any = {};
        node.members.forEach((prop: ts.ClassElement | ts.TypeElement) => {
            if (ts.isPropertySignature(prop) && prop.type) {
                obj[prop.name.getText()] = createTypeSchema(prop.type, checker);
            } else {
                console.warn("Unknown interface/class/type member", ts.SyntaxKind[prop.kind], prop.name?.getText());
            }
        });
        return { type: "isObject", schema: obj };
    } else if (ts.isTypeAliasDeclaration(node)) {
        return createTypeSchema(node.type, checker);
    } else if (ts.isTypeReferenceNode(node)) {
        return { type: "ref", value: node.typeName.getText() };
    } else if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
        let andOr: TypeSchema[] = [];
        node.types.forEach((type) => {
            andOr.push(createTypeSchema(type, checker));
        });
        return { type: ts.isUnionTypeNode(node) ? "or" : "and", schemas: andOr };
    } else if (ts.isImportSpecifier(node)) {
        let imp = checker.getTypeAtLocation(node.propertyName ?? node.name).symbol;
        if (!imp || !imp.declarations || imp.declarations.length < 1) throw new Error(`Type ${node.name.text} not found.`);
        return createTypeSchema(imp.getDeclarations()![0], checker);
    } else {
        console.log("Unknown node", ts.SyntaxKind[node.kind], node.getText());
        return { type: "unknown" };
    }
}
