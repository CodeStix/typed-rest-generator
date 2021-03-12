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

export function getRouteTypes(node: ts.Node, typeChecker: ts.TypeChecker, paths: PathTypes, validators: Validators) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
        let name = node.name.text;
        let m;
        let regex = /^([a-zA-Z0-9_]+)(Response|Request)$/;
        if ((m = name.match(regex))) {
            let pathType = m[1];
            let apiType = m[2] === "Request" ? "req" : "res";

            let references = new Set<ts.Symbol>();
            references.add(node.symbol);
            resolveRecursiveTypeReferences(node, typeChecker, references);

            paths[pathType] = {
                ...paths[pathType],
                [apiType]: {
                    symbol: typeChecker.getSymbolAtLocation(node.name),
                    deepReferences: references,
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

export function getFromSourceFile(program: ts.Program, file: ts.SourceFile, paths: PathTypes, validatorTypes: Validators) {
    let checker = program.getTypeChecker();
    file.statements.forEach((stmt) => {
        if (ts.isModuleDeclaration(stmt)) {
            if (stmt.name.text === "Validation") {
                let body = stmt.body! as ts.ModuleBlock;
                body.statements.forEach((validateFunc) => getCustomValidatorTypes(validateFunc, checker, validatorTypes));
            } else if (stmt.name.text === "Routes") {
                let body = stmt.body! as ts.ModuleBlock;
                body.statements.forEach((routeType) => getRouteTypes(routeType, checker, paths, validatorTypes));
            } else {
                throw new Error(`Unsupported namespace '${stmt.name.text}', expected 'Validation' or 'Routes'`);
            }
        }
    });
}

export function followImport(node: ts.ImportSpecifier, typeChecker: ts.TypeChecker) {
    let symbol = typeChecker.getSymbolAtLocation(node.propertyName ?? node.name);
    if (!symbol) throw new Error(`Symbol '${node.getText()}' not found`);
    let type = typeChecker.getDeclaredTypeOfSymbol(symbol);
    if (!type.symbol && !type.aliasSymbol) throw new Error(`Type '${node.getText()}' not found`);
    return type.aliasSymbol ?? type.symbol;
}

export function generatePackageContent(typeChecker: ts.TypeChecker, validators: Validators, paths: PathTypes, outputStream: fs.WriteStream, currentDirectory: string) {
    // Write default types
    outputStream.write(getDefaultTypes());

    let clientClassMethodImplementations: string[] = [];
    let typesToImport = new Set<ts.Symbol>();
    let endPointsTypings: string[] = [];

    // Create Endpoints type
    endPointsTypings.push(`export type Endpoints = {\n`);
    Object.keys(paths).forEach((pathTypeName) => {
        let endpoint = paths[pathTypeName];

        // Import Request/Response types
        Object.keys(endpoint).forEach((apiType) => {
            let node = endpoint[apiType as ApiType];
            if (!node) return;

            typesToImport.add(node.symbol);
        });

        let path = typeNameToPath(pathTypeName);
        let functionName = decapitalize(pathTypeName);
        let reqType = endpoint.req ? getSymbolUsageName(endpoint.req.symbol) : null;
        let resType = endpoint.res ? getSymbolUsageName(endpoint.res.symbol) : null;
        console.log(`--> "${path}": ${functionName}`);

        // Create client fetch function
        clientClassMethodImplementations.push(`
        /**
         * Fetches "${path}" from the server. (\`${pathTypeName}\`)
         */
        public async ${functionName}(${reqType ? "data: " + reqType : ""}): Promise<${resType ?? "void"}> {
            ${resType ? "return " : ""}await this.fetch("post", "${path}"${reqType ? ", data" : ""});
        }`);

        // Create Endpoints type entry
        endPointsTypings.push(`\t\t"${path}": {
            req: ${reqType ? reqType : "never"},
            res: ${resType ? resType : "never"},
        },\n`);
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
        if (typeSchemas[name]) throw new Error(`Duplicate validator for ${usageName}`);

        typesToImport.add(validator.symbol);
        if (validator.customValidator) typesToImport.add(validator.customValidator);

        let decl: ts.Node = getMostSuitableDeclaration(validator.symbol.declarations)!;
        if (ts.isImportSpecifier(decl)) {
            decl = followImport(decl, typeChecker).declarations![0];
        }

        // Generate type validation schema
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

        clientClassMethodImplementations.push(`
        /**
         * Validates \`${usageName}\` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validate${name}<Error extends string>(data: ${usageName}, context?: any, settings?: ValidationSettings<any>): ErrorType<${usageName}, Error> | null {
            return validate(SCHEMAS.${name}, data, context, { ...settings, customValidators: CUSTOM_VALIDATORS, otherSchemas: SCHEMAS });
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

    // Write import statements
    Object.keys(imports).forEach((importName) => {
        let elems = imports[importName];
        outputStream.write(`import { ${[...elems].join(", ")} } from "${importName}"\n`);
    });

    // Write code
    outputStream.write(`
${endPointsTypings.join("")}

export class Client extends BaseClient<Endpoints> {
${clientClassMethodImplementations.join("\n\n")}
}

const SCHEMAS = ${JSON.stringify(typeSchemas, null, 4)} as const;

const CUSTOM_VALIDATORS = {
${customValidatorNames.map((e) => `\t"${e}": ${e}`).join(",\n")}
}
    `);
}
