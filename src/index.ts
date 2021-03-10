import ts from "typescript";
import fs from "fs";
import path from "path";
import { decapitalize, splitCapitalized } from "./helpers";
import semver from "semver";
import { notEqual } from "assert";

type Validators = {
    [typeName: string]: {
        paramType: ts.Node;
        customValidator?: ts.FunctionDeclaration;
    };
};

export type Method = "get" | "post" | "put" | "delete" | "patch" | "options" | "head";

export type Output = {
    methods: Methods;
};

export type Methods = {
    [M in Method]?: PathTypes;
};

export type PathTypes = {
    [path: string]: EndPoint;
};

export type EndPoint = {
    req?: {
        type: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.ClassDeclaration;
        deepReferences: Set<ts.Node>;
    };
    res?: {
        type: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.ClassDeclaration;
        deepReferences: Set<ts.Node>;
    };
};

export type ApiType = keyof EndPoint;

const SKIP_TYPES = ["Date", "BigInt", "Decimal"];

/**
 * @param node Find out which types this node references.
 * @param typeChecker
 * @param output The set to fill with node that were referenced recursively.
 */
function resolveRecursiveTypeReferences(node: ts.Node, typeChecker: ts.TypeChecker, output: Set<ts.Node>) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeLiteralNode(node)) {
        node.members.forEach((member) => {
            if (ts.isPropertySignature(member) && member.type) {
                console.log("Resolve property type", member.name.getText());
                resolveRecursiveTypeReferences(member.type, typeChecker, output);
            }
        });
    } else if (ts.isTypeReferenceNode(node)) {
        // Find where type is defined
        let name = node.typeName.getText();
        if (SKIP_TYPES.includes(name)) return;
        let type = typeChecker.getTypeFromTypeNode(node);
        let symbol = type.aliasSymbol ?? type.symbol;
        if (!symbol) throw new Error(`Type ${name} was not found`);
        symbol.declarations.forEach((decl) => {
            if (output.has(decl)) return;
            output.add(decl);
            resolveRecursiveTypeReferences(decl, typeChecker, output);
        });
    } else if (ts.isTypeAliasDeclaration(node)) {
        resolveRecursiveTypeReferences(node.type, typeChecker, output);
    } else if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
        node.types.forEach((type) => resolveRecursiveTypeReferences(type, typeChecker, output));
    } else if (ts.isImportSpecifier(node)) {
        let name = node.propertyName?.getText() ?? node.name.getText();
        let type = typeChecker.getTypeAtLocation(node);
        let symbol = type.aliasSymbol ?? type.symbol;
        if (!symbol) throw new Error(`Type ${name} was not found`);
        symbol.declarations.forEach((decl) => resolveRecursiveTypeReferences(decl, typeChecker, output));
    } else {
        // console.warn(`Unsupported node ${ts.SyntaxKind[node.kind]}`);
    }
}

function updatePackage(destinationPackagePath: string) {
    // Create or update (increase version) package.json
    let packageJsonPath = path.join(destinationPackagePath, "package.json");
    let packageJson;
    if (fs.existsSync(packageJsonPath)) {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        let v = semver.parse(packageJson.version)!;
        v.patch += 1;
        console.log("New version", v.format());
        packageJson.version = v.format();
    } else {
        packageJson = {
            name: "shared",
            version: "1.0.0",
            main: "index.js",
            types: "index.d.ts",
            license: "MIT",
            dependencies: {
                "@types/express-serve-static-core": "^4.17.18",
            },
        };
    }
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Create .gitignore
    let gitignorePath = path.join(destinationPackagePath, ".gitignore");
    if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, "/node_modules");
    }
}

function getDefaultTypes() {
    let defaultTypesPath = path.join(__dirname, "types.d.ts");
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

function generatePackageContent(types: Set<ts.Node>, validators: Validators, methods: Methods, outputStream: fs.WriteStream) {
    // Copy default types
    outputStream.write(getDefaultTypes());

    let clientClassMethodImplementations: string[] = [];
    let endPointsTypings: string[] = [];
    let routeTypes = new Set<ts.Node>();

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

                routeTypes.add(node.type);
                node.deepReferences.forEach((e) => routeTypes.add(e));
            });

            let path = typeNameToPath(pathTypeName);
            console.log(`${pathTypeName} --> ${path}`);

            let reqType = endpoint.req?.type.name?.text;
            let resType = endpoint.res?.type.name?.text;

            clientClassMethodImplementations.push(`async ${method}${pathTypeName} (${reqType ? "data: " + reqType : ""}): Promise<${resType ?? "void"}> {
                return await this.fetch("${method}", "${path}", data);
            }`);

            endPointsTypings.push(`\t\t"${path}": Endpoint<${reqType ?? "unknown"}, ${resType ?? "unknown"}>;\n`);
        });

        endPointsTypings.push(`\t},\n`);
    });
    endPointsTypings.push(`}\n\n`);

    outputStream.write(`export namespace Routes {\n`);
    outputStream.write(endPointsTypings.join(""));
    routeTypes.forEach((e) => {
        if (ts.isVariableDeclaration(e)) {
            // A variable declaration does not contain its modifiers
            outputStream.write(`export const ${e.getText()}\n`);
        } else {
            outputStream.write(`${e.getText()}\n`);
        }
    });
    outputStream.write(`}\n\n`);

    // Copy all referenced types
    types.forEach((e) => {
        console.log("Type", (e as any)["name"]?.text);
        if (ts.isVariableDeclaration(e)) {
            // A variable declaration does not contain its modifiers
            outputStream.write(`export const ${e.getText()}\n`);
        } else {
            outputStream.write(`${e.getText()}\n`);
        }
    });

    let validatorImplementations: string[] = [];

    Object.keys(validators).forEach((validateTypeName) => {
        let validator = validators[validateTypeName];
        let paramName = validator.paramType.getText();
        validatorImplementations.push(`public static validate${validateTypeName}(data: ${paramName}): ErrorMap<${paramName}> {\n`);
        if (validator.customValidator) validatorImplementations.push(validator.customValidator.getText());
        validatorImplementations.push(`}\n`);
        console.log(`${validateTypeName} (${paramName}) hasCustom=${!!validator.customValidator}`);
    });

    // Create Client class typedefs
    outputStream.write(`

export async function defaultFetcher(url: any, method: any, body: any) {
    let res = await fetch(url, {
        method,
        body: typeof body === "object" ? JSON.stringify(body) : null,
        headers: { "Content-Type": "application/json" },
    });
    if (res.status === 200) {
        return await res.json();
    } else if (res.status === 401) {
        throw new Error(
            \`Unauthorized. To implement authorization, override fetcher in the client settings.\`
        );
    } else if (res.status === 404 || (res.status > 200 && res.status < 300)) {
        return null;
    } else {
        throw new Error(
            \`Could not fetch '\${method}' (HTTP \${res.status}: \${res.statusText})\`
        );
    }
}

interface ClientSettings {
    path?: string;
    fetcher?: (url: string, method: string, body?: object) => Promise<any>;
}

class Client {
    public readonly settings: ClientSettings;

    public constructor(settings: ClientSettings = {}) {
        settings.path ||= "";
        settings.fetcher ||= module.exports.defaultFetcher;
        if (settings.path.endsWith("/"))
            settings.path = settings.path.substring(
                0,
                settings.path.length - 1
            );
        this.settings = settings;
    }

    public fetch<Method extends keyof Endpoints, Path extends MethodPath<Method>>(
        method: Method,
        path: Path,
        body?: Endpoints[Method][Path]["req"],
        query?: Endpoints[Method][Path]["query"]
    ): Promise<Endpoints[Method][Path]["res"]> {
        return this.settings.fetcher(path, method, body);
    }

    ${clientClassMethodImplementations.join("\n\n")}
    ${validatorImplementations.join("\n\n")}
}
    `);
}

function getRouteTypes(node: ts.Node, typeChecker: ts.TypeChecker, methods: Methods, validators: Validators) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
        let name = node.name.text;
        let m;
        let regex = /^(Get|Post|Put|Patch|Delete|Head|Options)([a-zA-Z0-9_]+)(Response|Request)$/;
        if ((m = name.match(regex))) {
            let method = m[1].toLowerCase() as Method;
            let pathType = m[2];
            let apiType = m[3] === "Request" ? "req" : "res";

            let references = new Set<ts.Node>();
            resolveRecursiveTypeReferences(node, typeChecker, references);

            methods[method] = {
                ...methods[method],
                [pathType]: {
                    ...methods[method]?.[pathType],
                    [apiType]: {
                        type: node,
                        deepReferences: references,
                    },
                },
            };

            references.forEach((e) => {
                if (ts.isVariableDeclaration(e)) return;
                let type = typeChecker.getTypeAtLocation(e);
                if (!type || (!type.symbol && !type.aliasSymbol)) throw new Error(`Type to validate was not found. ${ts.SyntaxKind[e.kind]} ${e.getText()} `);
                let symbol = type.aliasSymbol ?? type.symbol;
                if (validators[symbol.name]) return;
                validators[symbol.name] = {
                    ...validators[symbol.name],
                    paramType: e,
                };
            });
        } else {
            throw new Error(`Malformed route type name '${name}', please match '${regex.source}'`);
        }
    } else {
        throw new Error(`Unsupported route type '${ts.SyntaxKind[node.kind]}' at line ${node.getSourceFile().fileName}:${node.pos}`);
    }
}

function getCustomValidatorTypes(node: ts.Node, typeChecker: ts.TypeChecker, output: Validators) {
    if (ts.isFunctionDeclaration(node)) {
        if (!node.name) throw new Error(`Every validator function requires a name`);
        let name = node.name.text;
        if (node.parameters.length < 1) throw new Error(`The validator '${name}' does not have a parameter which specifies the type it validates.`);
        let paramType = node.parameters[0].type;
        if (!paramType) throw new Error(`The validator '${name}' parameter type is not set.`);
        if (!ts.isTypeReferenceNode(paramType)) throw new Error(`The validator '${name}' parameter type must reference a type directly ('${paramType.getText()}' is invalid).`);

        let targetTypeName = paramType.typeName.getText();
        let type = typeChecker.getTypeAtLocation(paramType);
        if (!type || (!type.symbol && !type.aliasSymbol)) throw new Error(`Type to validate (${targetTypeName}) was not found.`);
        let symbol = type.aliasSymbol ?? type.symbol;

        console.log("Validator " + symbol.name);
        if (output[symbol.name]?.customValidator) throw new Error(`Duplicate validator for type ${symbol.name}`);
        output[symbol.name] = {
            ...output[symbol.name],
            paramType: paramType,
            customValidator: node,
        };

        let references = new Set<ts.Node>();
        resolveRecursiveTypeReferences(paramType, typeChecker, references);
        references.forEach((e) => {
            if (ts.isVariableDeclaration(e)) return;
            let type = typeChecker.getTypeAtLocation(e);
            if (!type || (!type.symbol && !type.aliasSymbol)) throw new Error(`Type to validate was not found. ${e.getText()}`);
            let symbol = type.aliasSymbol ?? type.symbol;
            if (output[symbol.name]) return;
            output[symbol.name] = {
                ...output[symbol.name],
                paramType: e,
            };
        });
    } else {
        throw new Error(`Unsupported validator type '${ts.SyntaxKind[node.kind]}' at line ${node.getSourceFile().fileName}:${node.pos}`);
    }
}

function generateFromSourceFile(program: ts.Program, file: ts.SourceFile, types: Set<ts.Node>, methodTypes: Methods, validatorTypes: Validators) {
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
        } else if (ts.isImportDeclaration(stmt)) {
            // if (!stmt.importClause) throw new Error("Import clause is required");
            // if (stmt.importClause!.isTypeOnly) {
            //     // 'import type {} from "" -> Only copy types
            //     console.log("Importing types from " + stmt.moduleSpecifier.getText());
            //     if (stmt.importClause!.name || !stmt.importClause.namedBindings || !ts.isNamedImports(stmt.importClause.namedBindings))
            //         throw new Error("Only named imports are supported.");
            //     let imports = stmt.importClause.namedBindings;
            //     imports.elements.forEach((imprt) => resolveRecursiveTypeReferences(imprt, checker, types));
            // } else {
            //     // 'import {} from ""' -> Add library reference
            //     console.log("Importing from " + stmt.moduleSpecifier.getText());
            //     throw new Error("Non-type import not yet supported");
            //     // let from = stmt.moduleSpecifier.getText();
            //     // if (from.startsWith("./")) {
            //     // } else {
            //     //     // Add lib to package.json
            //     // }
            // }
        } else {
            if (ts.isInterfaceDeclaration(stmt)) console.log("Resolving types for", stmt.name.text);
            types.add(stmt);
            resolveRecursiveTypeReferences(stmt, checker, types);
        }
    });

    // console.log("Type count: " + types.size);
    // types.forEach((e) => console.log(e.getText()));
    // Object.keys(validatorTypes).forEach((typeName) => {
    //     console.log("Validate " + typeName);
    // });
}

function main() {
    console.log("Starting...");

    let routeDefinitionsPath = process.argv[2]; // .slice(2).join(" ")
    if (!routeDefinitionsPath) {
        throw new Error("Invalid usage, please specify the files containing your routes");
    }
    console.log("Reading routes from ", routeDefinitionsPath);

    let destinationPackagePath = "example/shared";
    fs.mkdirSync(destinationPackagePath, { recursive: true });

    let configFileName = ts.findConfigFile(routeDefinitionsPath, ts.sys.fileExists, "tsconfig.json");
    if (!configFileName) {
        throw new Error("tsconfig.json could not be found");
    }
    let configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
    let config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./").options;

    let program = ts.createProgram([routeDefinitionsPath], config);

    let types = new Set<ts.Node>();
    let validatorTypes: Validators = {};
    let methodTypes: Methods = {};
    // files.forEach((file) => generateFromSourceFile(program, program.getSourceFile(file)!, types, methodTypes, validatorTypes));
    let sourceFile = program.getSourceFile(routeDefinitionsPath)!;
    generateFromSourceFile(program, sourceFile, types, methodTypes, validatorTypes);

    let output = fs.createWriteStream(path.join(destinationPackagePath, "index.ts"));
    generatePackageContent(types, validatorTypes, methodTypes, output);
    output.close();

    updatePackage(destinationPackagePath);
}

main();
