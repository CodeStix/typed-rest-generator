import ts from "typescript";
import fs from "fs";
import path from "path";
import { decapitalize, splitCapitalized } from "./helpers";
import semver from "semver";

export type Method =
    | "get"
    | "post"
    | "put"
    | "delete"
    | "patch"
    | "options"
    | "head";

export type Methods = {
    [M in Method]?: PathTypes;
};

export type PathTypes = {
    [path: string]: EndPoint;
};

export type EndPoint = {
    req?:
        | ts.InterfaceDeclaration
        | ts.TypeAliasDeclaration
        | ts.ClassDeclaration;
    res?:
        | ts.InterfaceDeclaration
        | ts.TypeAliasDeclaration
        | ts.ClassDeclaration;
    query?:
        | ts.InterfaceDeclaration
        | ts.TypeAliasDeclaration
        | ts.ClassDeclaration;
    params?:
        | ts.InterfaceDeclaration
        | ts.TypeAliasDeclaration
        | ts.ClassDeclaration;
};

export type ApiType = keyof EndPoint;

function apiTypeNameToApiTypePropertyName(
    typeName: string
): "res" | "req" | "query" | "params" {
    switch (typeName) {
        case "Response":
            return "res";
        case "Request":
            return "req";
        case "RequestQuery":
            return "query";
        case "RequestParams":
            return "params";
        default:
            throw new Error(
                `Invalid endpoint type ${name} (what is ${typeName}?)`
            );
    }
}

function findRouteTypes(
    statements: ts.NodeArray<ts.Statement>,
    output: Methods
) {
    for (let i = 0; i < statements.length; i++) {
        let statement = statements[i];
        if (
            ts.isTypeAliasDeclaration(statement) ||
            ts.isInterfaceDeclaration(statement) ||
            ts.isClassDeclaration(statement)
        ) {
            let name = statement.name!.text;
            let m;
            if (
                (m = name.match(
                    /^(Get|Post|Put|Patch|Delete|Head|Options)([a-zA-Z]+)(Response|Request|RequestQuery|RequestParams)$/
                ))
            ) {
                let method = m[1].toLowerCase() as Method;
                let pathType = m[2];
                let apiType = apiTypeNameToApiTypePropertyName(m[3]);

                output[method] = {
                    ...output[method],
                    [pathType]: {
                        ...output[method]?.[pathType],
                        [apiType]: statement,
                    },
                };
            }
        } else if (ts.isModuleDeclaration(statement) && statement.body) {
            findRouteTypes(
                (statement.body as ts.ModuleBlock).statements,
                output
            );
        }
    }
}

const SKIP_TYPES = ["Date", "BigInt", "Decimal"];

function resolveTypeReferences(
    node: ts.Node,
    typeChecker: ts.TypeChecker,
    output: Set<ts.Node>
) {
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
                resolveTypeReferences(member.type, typeChecker, output);
            }
        });
    } else if (ts.isTypeReferenceNode(node)) {
        // Find where type is defined
        let name = node.typeName.getText();
        if (SKIP_TYPES.includes(name)) return;
        let type = typeChecker.getTypeFromTypeNode(node);
        let symbol = type.aliasSymbol ?? type.symbol;
        if (!symbol) throw new Error(`Type ${name} was not found`);
        // if (symbol.declarations.length > 1)
        //     console.warn(`Multiple declarations for type '${name}'`);
        symbol.declarations.forEach((decl) =>
            resolveTypeReferences(decl, typeChecker, output)
        );
    } else if (ts.isTypeAliasDeclaration(node)) {
        if (!output.has(node)) {
            output.add(node);
            resolveTypeReferences(node.type, typeChecker, output);
        }
    } else if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
        node.types.forEach((type) =>
            resolveTypeReferences(type, typeChecker, output)
        );
    } else {
        // console.warn(`Unsupported node ${ts.SyntaxKind[node.kind]}`);
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
                qs: "^6.9.6",
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

function generateIndex(output: fs.WriteStream) {
    output.write(`
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
}
`);
}

function generatePackageContent(
    program: ts.Program,
    routeTypes: Methods,
    typingsStream: fs.WriteStream,
    codeStream: fs.WriteStream
) {
    // Copy default types
    typingsStream.write(getDefaultTypes());

    let referencedTypes = new Set<ts.Node>();
    let clientClassMethodTypings: string[] = [];
    let clientClassMethodImplementations: string[] = [];

    // Write Endpoints type
    typingsStream.write(`export type Endpoints = {\n`);

    Object.keys(routeTypes).forEach((method) => {
        let pathTypes = routeTypes[method as Method]!;

        typingsStream.write(`\t${method}: {\n`);

        Object.keys(pathTypes).forEach((pathTypeName) => {
            let endpoint = pathTypes[pathTypeName];

            Object.keys(endpoint).forEach((apiType) => {
                let node = endpoint[apiType as ApiType];
                if (!node) return;

                resolveTypeReferences(
                    node,
                    program.getTypeChecker(),
                    referencedTypes
                );
            });

            let path = typeNameToPath(pathTypeName);
            console.log(`${pathTypeName} --> ${path}`);

            let reqType = endpoint.req?.name?.text;
            let resType = endpoint.res?.name?.text;
            let paramsType = endpoint.params?.name?.text;
            let queryType = endpoint.query?.name?.text;

            let paramDefs = [reqType, queryType].filter((e) => e);
            clientClassMethodTypings.push(
                `async ${method}${pathTypeName} (${
                    paramDefs.length > 0 ? "data: " + paramDefs.join(" & ") : ""
                }): Promise<${resType ?? "void"}>;`
            );

            clientClassMethodImplementations.push(
                `async ${method}${pathTypeName} (data) { 
                    return await this.fetch("${method}", "${path}", data);
                }`
            );

            typingsStream.write(
                `\t\t"${path}": Endpoint<${reqType ?? "unknown"}, ${
                    resType ?? "unknown"
                }, ${paramsType ?? "unknown"}, ${queryType ?? "unknown"}>;\n`
            );
        });

        typingsStream.write(`\t},\n`);
    });

    typingsStream.write(`}\n\n`);

    // Copy all referenced types
    referencedTypes.forEach((e) => {
        let t = e.getText();
        typingsStream.write(t + "\n");
    });

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
async function defaultFetcher(url, method, body) {
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
        settings.fetcher ||= defaultFetcher;
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

function main() {
    let routeDefinitionsPath = process.argv[2]; // .slice(2).join(" ")
    if (!routeDefinitionsPath) {
        throw new Error(
            "Invalid usage, please specify the files containing your routes"
        );
    }
    console.log("Reading routes from ", routeDefinitionsPath);

    let destinationPackagePath = "example/shared";
    fs.mkdirSync(destinationPackagePath, { recursive: true });

    let configFileName = ts.findConfigFile(
        routeDefinitionsPath,
        ts.sys.fileExists,
        "tsconfig.json"
    );
    if (!configFileName) {
        throw new Error("tsconfig.json could not be found");
    }
    let configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
    let config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./")
        .options;

    let program = ts.createProgram([routeDefinitionsPath], config);

    let routeTypes: Methods = {};
    findRouteTypes(
        program.getSourceFile(routeDefinitionsPath)!.statements,
        routeTypes
    );

    // Generate index.d.ts and index.js
    let typingsOutput = fs.createWriteStream(
        path.join(destinationPackagePath, "index.d.ts")
    );
    let output = fs.createWriteStream(
        path.join(destinationPackagePath, "index.js")
    );
    generatePackageContent(program, routeTypes, typingsOutput, output);
    typingsOutput.close();
    output.close();

    updatePackage(destinationPackagePath);
}

main();
