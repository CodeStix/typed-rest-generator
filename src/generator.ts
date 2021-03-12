import ts from "byots";
import fs from "fs";
import path from "path";
import { decapitalize, splitCapitalized, getSymbolUsageName, getMostSuitableDeclaration, getSymbolFullName, getSymbolImportName, isDefaultType } from "./helpers";
import { TypeSchema, createTypeSchema } from "./validation";

export type Validators = {
    [typeName: string]: {
        symbol: ts.Symbol;
        customValidator?: ts.Symbol;
    };
};
export type Method = "get" | "post" | "put" | "delete" | "patch" | "options" | "head" | "all";
export type Methods = {
    [M in Method]: PathTypes;
};
export type PathTypes = {
    [path: string]: EndPoint;
};
export type EndPoint = {
    req?: {
        symbol: ts.Symbol;
        deepReferences: Set<ts.Symbol>;
    };
    res?: {
        symbol: ts.Symbol;
        deepReferences: Set<ts.Symbol>;
    };
};
export type ApiType = keyof EndPoint;

/**
 * @param node Find out which types this node references.
 * @param typeChecker
 * @param output The set to fill with node that were referenced recursively.
 */
function resolveRecursiveTypeReferences(node: ts.Node, typeChecker: ts.TypeChecker, output: Set<ts.Symbol>) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeLiteralNode(node)) {
        node.members.forEach((member) => {
            if (ts.isPropertySignature(member) && member.type) {
                resolveRecursiveTypeReferences(member.type, typeChecker, output);
            }
        });
    } else if (ts.isTypeReferenceNode(node)) {
        // Find where type is defined
        let name = node.typeName.getText();
        let symbol = typeChecker.getSymbolAtLocation(node.typeName);
        if (!symbol) throw new Error(`Type ${name} was not found '${node.parent.parent.getText()}'`);

        if (output.has(symbol)) return;
        output.add(symbol);
        symbol.declarations!.forEach((decl) => {
            resolveRecursiveTypeReferences(decl, typeChecker, output);
        });
    } else if (ts.isTypeAliasDeclaration(node)) {
        resolveRecursiveTypeReferences(node.type, typeChecker, output);
    } else if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
        node.types.forEach((type) => resolveRecursiveTypeReferences(type, typeChecker, output));
    } else if (ts.isImportSpecifier(node)) {
        let symbol = typeChecker.getSymbolAtLocation(node.propertyName ?? node.name);
        if (!symbol) throw new Error(`Type ${node.propertyName?.getText() ?? node.name.getText()} was not found (import)`);
        if (isDefaultType(symbol)) return;
        if (output.has(symbol)) return;
        output.add(symbol);
        symbol.declarations!.forEach((decl) => resolveRecursiveTypeReferences(decl, typeChecker, output));
    } else {
        // console.warn(`Unsupported node ${ts.SyntaxKind[node.kind]}`);
    }
}

function getDefaultTypes() {
    let defaultTypesPath = path.join(__dirname, "types.ts.txt");
    return fs.readFileSync(defaultTypesPath, "utf8");
}

function typeNameToPath(typeName: string) {
    return (
        "/" +
        splitCapitalized(typeName)
            .map((e) => decapitalize(e))
            .join("/")
    );
}

export function getRouteTypes(node: ts.Node, typeChecker: ts.TypeChecker, methods: Methods, validators: Validators) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
        let name = node.name.text;
        let m;
        let regex = /^(Get|Post|Put|Patch|Delete|Head|Options)([a-zA-Z0-9_]+)(Response|Request)$/;
        if ((m = name.match(regex))) {
            let method = m[1].toLowerCase() as Method;
            let pathType = m[2];
            let apiType = m[3] === "Request" ? "req" : "res";

            let references = new Set<ts.Symbol>();
            references.add(node.symbol);
            resolveRecursiveTypeReferences(node, typeChecker, references);

            methods[method] = {
                ...methods[method],
                [pathType]: {
                    ...methods[method]?.[pathType],
                    [apiType]: {
                        symbol: typeChecker.getSymbolAtLocation(node.name),
                        deepReferences: references,
                    },
                },
            };

            if (apiType === "req") {
                references.forEach((symbol) => {
                    if (validators[symbol.name]) return;
                    validators[symbol.name] = {
                        ...validators[symbol.name],
                        symbol: symbol,
                    };
                });
            }
        } else {
            throw new Error(`Malformed route type name '${name}', please match '${regex.source}'`);
        }
    } else {
        throw new Error(`Unsupported route type '${ts.SyntaxKind[node.kind]}' at line ${node.getSourceFile().fileName}:${node.pos}`);
    }
}

export function getCustomValidatorTypes(node: ts.Node, typeChecker: ts.TypeChecker, output: Validators) {
    if (ts.isFunctionDeclaration(node)) {
        if (!node.name) throw new Error(`Every validator function requires a name`);
        let name = node.name.text;
        if (node.parameters.length < 1) throw new Error(`The validator '${name}' does not have a parameter which specifies the type it validates.`);
        let paramType = node.parameters[0].type;
        if (!paramType) throw new Error(`The validator '${name}' parameter type is not set.`);
        if (!ts.isTypeReferenceNode(paramType)) throw new Error(`The validator '${name}' parameter type must reference a type directly ('${paramType.getText()}' is invalid).`);

        let symbol = typeChecker.getSymbolAtLocation(paramType.typeName);
        if (!symbol) throw new Error(`Type to validate (${paramType.typeName.getText()}) was not found.`);
        let customSymbol = typeChecker.getSymbolAtLocation(node.name);
        if (!customSymbol) throw new Error(`Custom validator '${name}' not found.`);

        if (output[symbol.name]?.customValidator) throw new Error(`Duplicate validator for type ${symbol.name}`);
        output[symbol.name] = {
            ...output[symbol.name],
            symbol: symbol,
            customValidator: customSymbol,
        };

        let references = new Set<ts.Symbol>();
        resolveRecursiveTypeReferences(paramType, typeChecker, references);
        references.forEach((symbol) => {
            if (output[symbol.name]) return;
            output[symbol.name] = {
                ...output[symbol.name],
                symbol: symbol,
            };
        });
    } else {
        throw new Error(`Unsupported validator type '${ts.SyntaxKind[node.kind]}' at line ${node.getSourceFile().fileName}:${node.pos}`);
    }
}

export function getFromSourceFile(program: ts.Program, file: ts.SourceFile, methodTypes: Methods, validatorTypes: Validators) {
    let checker = program.getTypeChecker();
    file.statements.forEach((stmt) => {
        if (ts.isModuleDeclaration(stmt)) {
            if (stmt.name.text === "Validation") {
                let body = stmt.body! as ts.ModuleBlock;
                body.statements.forEach((validateFunc) => getCustomValidatorTypes(validateFunc, checker, validatorTypes));
            } else if (stmt.name.text === "Routes") {
                let body = stmt.body! as ts.ModuleBlock;
                body.statements.forEach((routeType) => getRouteTypes(routeType, checker, methodTypes, validatorTypes));
            } else {
                throw new Error(`Unsupported namespace '${stmt.name.text}', expected 'Validation' or 'Routes'`);
            }
        }
    });
}

export function generatePackageContent(typeChecker: ts.TypeChecker, validators: Validators, methods: Methods, outputStream: fs.WriteStream, currentDirectory: string) {
    // Copy default types
    outputStream.write(getDefaultTypes());

    let clientClassMethodImplementations: string[] = [];
    let typesToImport = new Set<ts.Symbol>();
    let endPointsTypings: string[] = [];

    // Create Endpoints type
    endPointsTypings.push(`export type Endpoints = {\n`);
    Object.keys(methods).forEach((method) => {
        let pathTypes = methods[method as Method]!;

        endPointsTypings.push(`\t${method}: {\n`);

        Object.keys(pathTypes).forEach((pathTypeName) => {
            let endpoint = pathTypes[pathTypeName];

            Object.keys(endpoint).forEach((apiType) => {
                let node = endpoint[apiType as ApiType];
                if (!node) return;

                typesToImport.add(node.symbol);
                // node.deepReferences.forEach((e) => typesToImport.add(e));
            });

            let path = typeNameToPath(pathTypeName);
            console.log(`${pathTypeName} --> ${path}`);

            let reqType = endpoint.req ? getSymbolUsageName(endpoint.req.symbol) : null;
            let resType = endpoint.res ? getSymbolUsageName(endpoint.res.symbol) : null;

            clientClassMethodImplementations.push(`public async ${method}${pathTypeName} (${reqType ? "data: " + reqType : ""}): Promise<${resType ?? "void"}> {
                ${resType ? "return " : ""}await this.fetch("${method}", "${path}"${reqType ? ", data" : ""});
            }`);

            endPointsTypings.push(`\t\t"${path}": {
                req: ${reqType ? reqType : "never"},
                res: ${resType ? resType : "never"},
            },\n`);
        });

        endPointsTypings.push(`\t},\n`);
    });
    endPointsTypings.push(`}\n\n`);

    // Generate validation schemas
    let typeSchemas: {
        [typeName: string]: TypeSchema;
    } = {};
    let customValidatorNames: string[] = [];
    Object.keys(validators).forEach((validateTypeName) => {
        let validator = validators[validateTypeName];
        let name = getSymbolFullName(validator.symbol);
        let usageName = getSymbolUsageName(validator.symbol);

        typesToImport.add(validator.symbol);
        if (validator.customValidator) typesToImport.add(validator.customValidator);

        let decl: ts.Node = getMostSuitableDeclaration(validator.symbol.declarations)!;
        if (typeSchemas[name]) throw new Error(`Duplicate validator for ${usageName}`);
        let impl = createTypeSchema(decl, typeChecker);
        if (validator.customValidator) {
            let customUsageName = getSymbolUsageName(validator.customValidator);
            customValidatorNames.push(customUsageName);
            impl = {
                type: "and",
                schemas: [impl, { type: "function", name: customUsageName }],
            };
        }
        typeSchemas[name] = impl;

        clientClassMethodImplementations.push(`public static validate${name}(data: ${usageName}, context?: any, settings?: ValidationSettings<any>): ErrorMap<${usageName}> {
            return validate(SCHEMAS.${name}, data, context, { ...settings, customValidators: CUSTOM_VALIDATORS, otherSchemas: SCHEMAS }) as any;
        }`);
    });

    // Generate import statements
    let imports: {
        [file: string]: Set<string>;
    } = {};
    typesToImport.forEach((symbol) => {
        // Do not import default types like Date ...
        if (isDefaultType(symbol)) return;

        let decl = getMostSuitableDeclaration(symbol.declarations);
        if (!decl) throw new Error(`Type ${symbol.name} not found`);

        let importName;
        if (ts.isImportSpecifier(decl)) {
            importName = (decl.parent.parent.parent.moduleSpecifier as ts.StringLiteral).text;
        } else {
            let file = decl.getSourceFile();
            importName = path.relative(currentDirectory, file.fileName);
            if (importName.endsWith(".ts")) importName = importName.substring(0, importName.length - 3);
            if (!importName.startsWith(".")) importName = "./" + importName;
        }
        let names = imports[importName];
        if (!names) {
            names = new Set<string>();
            imports[importName] = names;
        }
        names.add(getSymbolImportName(symbol));
    });
    Object.keys(imports).forEach((importName) => {
        let elems = imports[importName];
        outputStream.write(`import { ${[...elems].join(", ")} } from "${importName}"\n`);
    });

    // Create Client class typedefs
    outputStream.write(`

${endPointsTypings.join("")}

export async function defaultFetcher(url: any, method: any, body: any) {
    let res = await fetch(url, {
        method,
        body: typeof body === "object" ? JSON.stringify(body) : null,
        headers: { "Content-Type": "application/json" },
    });
    if (res.status === 200) {
        return await res.json();
    } else if (res.status === 401) {
        throw new Error(\`Unauthorized. To implement authorization, override fetcher in the client settings.\`);
    } else if (res.status === 404 || (res.status > 200 && res.status < 300)) {
        return null;
    } else {
        throw new Error(\`Could not fetch '\${method}' (HTTP \${res.status}: \${res.statusText})\`);
    }
}

export interface ClientSettings {
    path?: string;
    fetcher?: (url: string, method: string, body?: object) => Promise<any>;
}

export class BaseClient<Endpoints extends EndpointsConstraint> {
    public readonly settings: ClientSettings;

    public constructor(settings: ClientSettings = {}) {
        settings.path ||= "";
        settings.fetcher ||= defaultFetcher;
        if (settings.path.endsWith("/")) settings.path = settings.path.substring(0, settings.path.length - 1);
        this.settings = settings;
    }

    public fetch<Method extends keyof EndpointsConstraint, Path extends keyof Endpoints[Method]>(
        method: Method,
        path: Path,
        body?: Endpoints[Method][Path]["req"]
    ): Promise<Endpoints[Method][Path]["res"]> {
        return this.settings.fetcher!(this.settings.path! + (path as string), method, body);
    }
}

export class Client extends BaseClient<Endpoints> {
${clientClassMethodImplementations.join("\n\n")}
}

export const SCHEMAS = ${JSON.stringify(typeSchemas, null, 4)} as const;

export const CUSTOM_VALIDATORS = {
${customValidatorNames.map((e) => `\t"${e}": ${e}`).join(",\n")}
}

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

export type ErrorType<T> = string | (NonNullable<T> extends object ? ErrorMap<NonNullable<T>> : never);

export type ErrorMap<T> = {
    [Key in keyof T]?: ErrorType<T>;
};

export function validate<T, Context>(schema: TypeSchema, value: T, context: Context, settings: ValidationSettings<Context>): ErrorType<T> | null {
    switch (schema.type) {
        case "isType":
            return typeof value === schema.value ? null : \`must be of type \${schema.value}\`;
        case "isValue":
            return value === schema.value ? null : \`must have value \${JSON.stringify(schema.value)}\`;
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
            let lastError: ErrorType<T> | null = "invalid or";
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
            if (!fn) throw new Error(\`Custom validator '\${schema.name}' not found\`);
            return fn(value, context, settings);
        case "ref":
            let sch = settings.otherSchemas?.[schema.value];
            if (!sch) throw new Error(\`Could not find validator for type '\${schema.value}'\`);
            return validate(settings.otherSchemas![schema.value], value, context, settings);
        case "unknown":
            throw new Error("Cannot validate unknown type.");
    }
}

    `);
}
