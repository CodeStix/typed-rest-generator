import ts from "typescript";
import fs from "fs";
import path from "path";
import { decapitalize, splitCapitalized } from "./helpers";
import semver from "semver";

type Method = "get" | "post" | "put" | "delete" | "patch" | "options" | "head";

type Methods = {
    [M in Method]?: PathTypes;
};

type PathTypes = {
    [path: string]: EndPoint;
};

type EndPoint = {
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

type ApiType = "req" | "res" | "query" | "params";

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

function main() {
    let routesFileName = process.argv[2]; // .slice(2).join(" ")
    if (!routesFileName) {
        throw new Error(
            "Invalid usage, please specify the files containing your routes"
        );
    }
    console.log("path", routesFileName);

    let destinationPackagePath = "example/shared";
    fs.mkdirSync(destinationPackagePath, { recursive: true });
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
        };
    }
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    let typingsPath = path.join(destinationPackagePath, "index.d.ts");
    let output = fs.createWriteStream(typingsPath);

    let configFileName = ts.findConfigFile(
        routesFileName,
        ts.sys.fileExists,
        "tsconfig.json"
    );
    if (!configFileName) {
        throw new Error("tsconfig.json could not be found");
    }
    let configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
    let config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./")
        .options;

    let program = ts.createProgram([routesFileName], config);

    let referencedTypes = new Set<ts.Node>();
    let routeTypes: Methods = {};
    findRouteTypes(
        program.getSourceFile(routesFileName)!.statements,
        routeTypes
    );

    output.write(`export type Endpoints = {\n`);

    Object.keys(routeTypes).forEach((method) => {
        let pathTypes = routeTypes[method as Method]!;

        output.write(`\t${method}: {\n`);

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

            output.write(
                `\t\t"${path}": Endpoint<${
                    endpoint.req?.name?.text ?? "unknown"
                }, ${endpoint.res?.name?.text ?? "unknown"}, ${
                    endpoint.params?.name?.text ?? "unknown"
                }, ${endpoint.query?.name?.text ?? "unknown"}>;\n`
            );
        });

        output.write(`\t},\n`);
    });

    output.write(`}\n\n`);

    referencedTypes.forEach((e) => {
        let t = e.getText();
        output.write(t + "\n");
    });

    output.close();
}

main();
