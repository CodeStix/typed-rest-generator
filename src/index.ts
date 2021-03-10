import ts, { SymbolFlags } from "byots";
import fs from "fs";
import path from "path";
import { decapitalize, splitCapitalized } from "./helpers";
import semver from "semver";

type Validators = {
    [typeName: string]: {
        // paramType: ts.Node;
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
        // type: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.ClassDeclaration;
        symbol: ts.Symbol;
        deepReferences: Set<ts.Symbol>;
    };
    res?: {
        // type: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.ClassDeclaration;
        symbol: ts.Symbol;
        deepReferences: Set<ts.Symbol>;
    };
};

export type ApiType = keyof EndPoint;

const SKIP_TYPES = ["Date", "BigInt", "Decimal"];

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
        if (SKIP_TYPES.includes(name)) return;

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
        if (output.has(symbol)) return;
        output.add(symbol);
        symbol.declarations!.forEach((decl) => resolveRecursiveTypeReferences(decl, typeChecker, output));
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

function symbolFlagsToString(flags: SymbolFlags) {
    let str = [];
    for (let flag in ts.SymbolFlags) {
        let n = parseInt(ts.SymbolFlags[flag]);
        if ((flags & n) === n) {
            str.push(flag);
        }
    }
    return str.join(", ");
}

function getImportName(symbol: ts.Symbol): string {
    if (!symbol.parent?.parent) return symbol.name;
    return getImportName(symbol.parent);
}

function getUsageName(symbol: ts.Symbol): string {
    if (!symbol.parent?.parent) return symbol.name;
    return getUsageName(symbol.parent) + "." + symbol.name;
}

function generatePackageContent(typeChecker: ts.TypeChecker, validators: Validators, methods: Methods, outputStream: fs.WriteStream) {
    // Copy default types
    outputStream.write(getDefaultTypes());

    let clientClassMethodImplementations: string[] = [];
    let endPointsTypings: string[] = [];
    // let routeTypes = new Set<ts.Node>();

    let typesToImport = new Set<ts.Symbol>();

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

                // routeTypes.add(node.type);
                node.deepReferences.forEach((e) => typesToImport.add(e));
            });

            let path = typeNameToPath(pathTypeName);
            console.log(`${pathTypeName} --> ${path}`);

            // let reqType = endpoint.req?.type.name?.text;
            // let resType = endpoint.res?.type.name?.text;
            let reqType = endpoint.req ? getUsageName(endpoint.req?.symbol) : null;
            let resType = endpoint.res ? getUsageName(endpoint.res?.symbol) : null;

            clientClassMethodImplementations.push(`async ${method}${pathTypeName} (${reqType ? "data: " + reqType : ""}): Promise<${resType ?? "void"}> {
                ${resType ? "return " : ""}await this.fetch("${method}", "${path}", data);
            }`);

            endPointsTypings.push(`\t\t"${path}": {
                req: ${reqType ? reqType : "never"},
                res: ${resType ? resType : "never"},
            },\n`);
        });

        endPointsTypings.push(`\t},\n`);
    });
    endPointsTypings.push(`}\n\n`);

    let validatorImplementations: string[] = [];
    Object.keys(validators).forEach((validateTypeName) => {
        let validator = validators[validateTypeName];
        if (validator.customValidator) typesToImport.add(validator.customValidator);

        typesToImport.add(validator.symbol);
        console.log(`${validator.symbol.name} hasCustom=${!!validator.customValidator} importName=${getImportName(validator.symbol)} usageName=${getUsageName(validator.symbol)}`);
    });

    // Generate import statements
    let imports: {
        [file: string]: Set<string>;
    } = {};
    typesToImport.forEach((symbol) => {
        let decl = symbol.declarations!.find(
            (e) => ts.isFunctionDeclaration(e) || ts.isInterfaceDeclaration(e) || ts.isTypeAliasDeclaration(e) || ts.isClassDeclaration(e) || ts.isImportSpecifier(e)
        );
        // if (symbol.declarations.length > 1) console.warn(`Multiple declarations for ${symbol.name} found, using first one`);
        if (!decl) throw new Error(`Type ${symbol.name} not found`);

        let importName;
        if (ts.isImportSpecifier(decl)) {
            importName = (decl.parent.parent.parent.moduleSpecifier as ts.StringLiteral).text;
        } else {
            let file = decl.getSourceFile();
            importName = path.relative(process.cwd(), file.fileName);
            if (importName.endsWith(".ts")) importName = importName.substring(0, importName.length - 3);
            if (!importName.startsWith(".")) importName = "./" + importName;
        }
        let names = imports[importName];
        if (!names) {
            names = new Set<string>();
            imports[importName] = names;
        }
        names.add(getImportName(symbol));
    });
    Object.keys(imports).forEach((importName) => {
        let elems = imports[importName];
        outputStream.write(`import { ${[...elems].join(", ")} } from "${importName}"\n`);
    });

    // outputStream.write(endPointsTypings.join(""));

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

interface ClientSettings {
    path?: string;
    fetcher?: (url: string, method: string, body?: object) => Promise<any>;
}

class BaseClient<Endpoints extends EndpointsConstraint> {
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
        return this.settings.fetcher!(path as string, method, body);
    }
}

class Client extends BaseClient<Endpoints> {
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

            let references = new Set<ts.Symbol>();
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

            references.forEach((symbol) => {
                if (validators[symbol.name]) return;
                validators[symbol.name] = {
                    ...validators[symbol.name],
                    symbol: symbol,
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

function generateFromSourceFile(program: ts.Program, file: ts.SourceFile, methodTypes: Methods, validatorTypes: Validators) {
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

function main() {
    console.log("Starting...");

    let routeDefinitionsPath = process.argv[2]; // .slice(2).join(" ")
    if (!routeDefinitionsPath) {
        throw new Error("Invalid usage, please specify the files containing your routes");
    }
    console.log("Reading routes from ", routeDefinitionsPath);

    // let destinationPackagePath = "example/shared";
    // fs.mkdirSync(destinationPackagePath, { recursive: true });

    let configFileName = ts.findConfigFile(routeDefinitionsPath, ts.sys.fileExists, "tsconfig.json");
    if (!configFileName) {
        throw new Error("tsconfig.json could not be found");
    }
    let configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
    let config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./").options;

    let program = ts.createProgram([routeDefinitionsPath], config);

    let validatorTypes: Validators = {};
    let methodTypes: Methods = {
        post: {},
        get: {},
        put: {},
        delete: {},
        patch: {},
        options: {},
        head: {},
        all: {},
    };
    // files.forEach((file) => generateFromSourceFile(program, program.getSourceFile(file)!, types, methodTypes, validatorTypes));
    let sourceFile = program.getSourceFile(routeDefinitionsPath)!;
    generateFromSourceFile(program, sourceFile, methodTypes, validatorTypes);

    let output = fs.createWriteStream("output.ts");
    generatePackageContent(program.getTypeChecker(), validatorTypes, methodTypes, output);
    output.close();

    // updatePackage(destinationPackagePath);
}

main();
