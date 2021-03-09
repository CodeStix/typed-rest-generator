import ts from "typescript";
import fs from "fs";
import path from "path";
import { decapitalize, splitCapitalized } from "./helpers";
import semver from "semver";
import { notEqual } from "assert";

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

function findRouteTypes(statements: ts.NodeArray<ts.Statement>, output: Methods) {
    for (let i = 0; i < statements.length; i++) {
        let statement = statements[i];
        if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isClassDeclaration(statement)) {
            let name = statement.name!.text;
            let m;
            if ((m = name.match(/^(Get|Post|Put|Patch|Delete|Head|Options)([a-zA-Z]+)(Response|Request)$/))) {
                let method = m[1].toLowerCase() as Method;
                let pathType = m[2];
                let apiType = m[3] === "Request" ? "req" : "res";

                output[method] = {
                    ...output[method],
                    [pathType]: {
                        ...output[method]?.[pathType],
                        [apiType]: statement,
                    },
                };
            }
        } else if (ts.isModuleDeclaration(statement) && statement.body) {
            findRouteTypes((statement.body as ts.ModuleBlock).statements, output);
        }
    }
}

const SKIP_TYPES = ["Date", "BigInt", "Decimal"];

function resolveRecursiveTypeReferences(node: ts.Node, typeChecker: ts.TypeChecker, output: Set<ts.Node>) {
    if (ts.isVariableDeclaration(node)) {
        // Add the variable statement (parent.parent), which contains modifiers
        output.add(node.parent.parent);
    } else if (ts.isInterfaceDeclaration(node) || ts.isTypeLiteralNode(node)) {
        // Type literal was already added below
        if (ts.isInterfaceDeclaration(node)) {
            if (output.has(node)) return;
            output.add(node);
        }
        node.members.forEach((member) => {
            if (ts.isPropertySignature(member) && member.type) {
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
        symbol.declarations.forEach((decl) => resolveRecursiveTypeReferences(decl, typeChecker, output));
    } else if (ts.isTypeAliasDeclaration(node)) {
        if (!output.has(node)) {
            output.add(node);
            resolveRecursiveTypeReferences(node.type, typeChecker, output);
        }
    } else if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
        node.types.forEach((type) => resolveRecursiveTypeReferences(type, typeChecker, output));
    } else if (ts.isImportSpecifier(node)) {
        let name = node.propertyName?.getText() ?? node.name.getText();
        let type = typeChecker.getTypeAtLocation(node);
        let symbol = type.aliasSymbol ?? type.symbol;
        if (!symbol) throw new Error(`Type ${name} was not found`);
        symbol.declarations.forEach((decl) => resolveRecursiveTypeReferences(decl, typeChecker, output));
    } else {
        console.warn(`Unsupported node ${ts.SyntaxKind[node.kind]}`);
    }
}

function typeNameToPath(typeName: string) {
    return (
        "/" +
        splitCapitalized(typeName)
            .map((e) => decapitalize(e))
            .join("/")
    );
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

function generatePackageContent(validators: Validators, routeTypes: Methods, typingsStream: fs.WriteStream, codeStream: fs.WriteStream) {
    // Copy default types
    typingsStream.write(getDefaultTypes());

    let clientClassMethodTypings: string[] = [];
    let clientClassMethodImplementations: string[] = [];
    let endPointsTypings: string[] = [];
    let referencedTypes = new Set<ts.Node>();

    // Create Endpoints type
    endPointsTypings.push(`export type Endpoints = {\n`);
    Object.keys(routeTypes).forEach((method) => {
        let pathTypes = routeTypes[method as Method]!;

        endPointsTypings.push(`\t${method}: {\n`);

        Object.keys(pathTypes).forEach((pathTypeName) => {
            let endpoint = pathTypes[pathTypeName];

            Object.keys(endpoint).forEach((apiType) => {
                let node = endpoint[apiType as ApiType];
                if (!node) return;

                referencedTypes.add(node.type);
                node.deepReferences.forEach((e) => referencedTypes.add(e));
            });

            let path = typeNameToPath(pathTypeName);
            console.log(`${pathTypeName} --> ${path}`);

            let reqType = endpoint.req?.type.name?.text;
            let resType = endpoint.res?.type.name?.text;

            clientClassMethodTypings.push(`async ${method}${pathTypeName} (${reqType ? "data: " + reqType : ""}): Promise<${resType ?? "void"}>;`);

            clientClassMethodImplementations.push(
                `async ${method}${pathTypeName} (data) { 
                    return await this.fetch("${method}", "${path}", data);
                }`
            );

            endPointsTypings.push(`\t\t"${path}": Endpoint<${reqType ?? "unknown"}, ${resType ?? "unknown"}>;\n`);
        });

        endPointsTypings.push(`\t},\n`);
    });
    endPointsTypings.push(`}\n\n`);
    typingsStream.write(endPointsTypings.join(""));

    // Copy all referenced types
    referencedTypes.forEach((e) => typingsStream.write(e.getText() + "\n"));

    // Create Client class typedefs
    typingsStream.write(`
interface ClientSettings {
    path?: string;
    fetcher?: (url: string, method: string, body?: object) => Promise<any>;
}

class Client {
    public readonly settings: ClientSettings;

    constructor(settings?: ClientSettings);

    fetch<Method extends keyof Endpoints, Path extends MethodPath<Method>>(
        method: Method,
        path: Path,
        body?: Endpoints[Method][Path]["req"],
        query?: Endpoints[Method][Path]["query"]
    ): Promise<Endpoints[Method][Path]["res"]>;

    ${clientClassMethodTypings.join("\n\n")}
}
    `);

    codeStream.write(`
module.exports.defaultFetcher = async function (url, method, body) {
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

module.exports.Client = class Client {
    constructor(settings = {}) {
        settings.path ||= "";
        settings.fetcher ||= module.exports.defaultFetcher;
        if (settings.path.endsWith("/"))
            settings.path = settings.path.substring(
                0,
                settings.path.length - 1
            );
        this.settings = settings;
    }

    async fetch(method, path, body, query) {
        return this.settings.fetcher(path, method, body);
    }

    ${clientClassMethodImplementations.join("\n\n")}
};
    `);
}

function generateFromProgram(program: ts.Program, files: string[]) {
    files.forEach((file) => generateFromSourceFile(program, program.getSourceFile(file)!));
}

function generateRoute(node: ts.Node, typeChecker: ts.TypeChecker, output: Methods, validators: Validators) {
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

            output[method] = {
                ...output[method],
                [pathType]: {
                    ...output[method]?.[pathType],
                    [apiType]: {
                        type: node,
                        deepReferences: references,
                    },
                },
            };

            validators[name] = {
                ...validators[name],
                validateType: node,
            };
        } else {
            throw new Error(`Malformed route type name '${name}', please match '${regex.source}'`);
        }
    } else {
        throw new Error(`Unsupported route type '${ts.SyntaxKind[node.kind]}' at line ${node.getSourceFile().fileName}:${node.pos}`);
    }
}

type Validators = {
    [typeName: string]: {
        validateType: ts.Node;
        customValidator?: ts.FunctionDeclaration;
    };
};

function generateCustomValidator(node: ts.Node, typeChecker: ts.TypeChecker, output: Validators) {
    if (ts.isFunctionDeclaration(node)) {
        if (!node.name) throw new Error(`Every validator function requires a name`);
        let name = node.name.text;
        if (node.parameters.length < 1) throw new Error(`The validator '${name}' does not have a parameter which specifies the type it validates.`);
        let paramType = node.parameters[0].type;
        if (!paramType) throw new Error(`The validator '${name}' parameter type is not set.`);
        if (!ts.isTypeReferenceNode(paramType)) throw new Error(`The validator '${name}' parameter type must reference a type directly ('${paramType.getText()}' is invalid).`);
        let targetTypeName = paramType.typeName.getText();
        if (output[targetTypeName]) throw new Error(`Duplicate validator for type ${targetTypeName}`);
        let type = typeChecker.getTypeAtLocation(paramType);
        if (!type || (!type.symbol && !type.aliasSymbol)) throw new Error(`Type to validate (${targetTypeName}) was not found.`);
        let symbol = type.aliasSymbol ?? type.symbol;
        output[symbol.name] = {
            customValidator: node,
            validateType: paramType,
        };
    } else {
        throw new Error(`Unsupported validator type '${ts.SyntaxKind[node.kind]}' at line ${node.getSourceFile().fileName}:${node.pos}`);
    }
}

function generateFromSourceFile(program: ts.Program, file: ts.SourceFile) {
    let checker = program.getTypeChecker();
    let types = new Set<ts.Node>();
    let validatorTypes: Validators = {};
    let methodTypes: Methods = {};
    file.statements.forEach((stmt) => {
        if (ts.isModuleDeclaration(stmt)) {
            if (stmt.name.text === "Validation") {
                let body = stmt.body! as ts.ModuleBlock;
                body.statements.forEach((validateFunc) => generateCustomValidator(validateFunc, checker, validatorTypes));
            } else if (stmt.name.text === "Routes") {
                let body = stmt.body! as ts.ModuleBlock;
                body.statements.forEach((routeType) => generateRoute(routeType, checker, methodTypes, validatorTypes));
            } else {
                throw new Error(`Unsupported namespace '${stmt.name.text}', expected 'Validation' or 'Routes'`);
            }
        } else if (ts.isImportDeclaration(stmt)) {
            if (!stmt.importClause) throw new Error("Import clause is required");
            if (stmt.importClause!.isTypeOnly) {
                // 'import type {} from "" -> Only copy types
                console.log("Importing types from " + stmt.moduleSpecifier.getText());
                if (stmt.importClause!.name || !stmt.importClause.namedBindings || !ts.isNamedImports(stmt.importClause.namedBindings))
                    throw new Error("Only named imports are supported.");
                let imports = stmt.importClause.namedBindings;
                imports.elements.forEach((imprt) => resolveRecursiveTypeReferences(imprt, checker, types));
            } else {
                // 'import {} from ""' -> Add library reference
                console.log("Importing from " + stmt.moduleSpecifier.getText());
                throw new Error("Non-type import not yet supported");
                // let from = stmt.moduleSpecifier.getText();
                // if (from.startsWith("./")) {
                // } else {
                //     // Add lib to package.json
                // }
            }
        } else {
            types.add(stmt);
        }
    });

    // console.log("Type count: " + types.size);
    types.forEach((e) => console.log(e.getText()));
    Object.keys(validatorTypes).forEach((typeName) => {
        console.log("Validate " + typeName);
    });
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
    let sourceFile = program.getSourceFile(routeDefinitionsPath);

    generateFromSourceFile(program, sourceFile!);

    // let routeTypes: Methods = {};
    // findRouteTypes(program.getSourceFile(routeDefinitionsPath)!.statements, routeTypes);

    // // Generate index.d.ts and index.js
    // let typingsOutput = fs.createWriteStream(path.join(destinationPackagePath, "index.d.ts"));
    // let output = fs.createWriteStream(path.join(destinationPackagePath, "index.js"));
    // generatePackageContent(program, routeTypes, typingsOutput, output);
    // typingsOutput.close();
    // output.close();

    // updatePackage(destinationPackagePath);
}

main();
