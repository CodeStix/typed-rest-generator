import ts from "typescript";
import fs from "fs";
import { decapitalize, splitCapitalized } from "./helpers";
import { join, resolve } from "path";

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

function findRouteTypesInFile(fileName: string, output: Methods) {
    let file = ts.createSourceFile(
        fileName,
        fs.readFileSync(fileName, "utf8"),
        ts.ScriptTarget.ES2015,
        true
    );

    findRouteTypes(file.statements, output);
}

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

function mergeArrays<T>(...arr: T[][]): T[] {
    let a: T[] = [];
    arr.forEach((e) => a.push(...e));
    return a;
}

function resolveTypeReferences(
    node: ts.Node,
    typeChecker: ts.TypeChecker,
    output: Set<ts.Symbol>
) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeLiteralNode(node)) {
        if (ts.isInterfaceDeclaration(node)) {
            let interfaceType = typeChecker.getTypeAtLocation(node).symbol;
            output.add(interfaceType);
        }

        node.members.forEach((member) => {
            if (
                ts.isPropertySignature(member) &&
                member.type &&
                ts.isTypeReferenceNode(member.type)
            ) {
                let name = member.type.typeName.getText();
                let symbol = typeChecker
                    .getTypeAtLocation(member.type)
                    .getSymbol();
                if (!symbol) throw new Error(`Type ${name} was not found`);
                if (symbol.declarations.length > 1)
                    throw new Error(`Multiple declarations for ${name}`);

                console.log("symbol", name);
                if (!output.has(symbol)) {
                    console.log(`looking at ${name}`);
                    resolveTypeReferences(
                        symbol.declarations[0],
                        typeChecker,
                        output
                    );
                } else {
                    console.log(`already looked at ${name}`);
                }
            }
        });
    } else if (ts.isTypeAliasDeclaration(node)) {
        let aliasType = typeChecker.getTypeAtLocation(node).aliasSymbol!;
        output.add(aliasType);
        resolveTypeReferences(node.type, typeChecker, output);
    }
}

function main() {
    let path = process.argv.slice(2).join(" ") || process.cwd();
    console.log("path", path);

    let output = fs.createWriteStream("output.d.ts");

    // let typeOutputs: string[] = [];

    function typeNameToPath(typeName: string) {
        return (
            "/" +
            splitCapitalized(typeName)
                .map((e) => decapitalize(e))
                .join("/")
        );
    }

    let configFileName = ts.findConfigFile(
        path,
        ts.sys.fileExists,
        "tsconfig.json"
    );
    if (!configFileName) {
        throw new Error("tsconfig.json could not be found");
    }
    let configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
    let config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./")
        .options;

    let program = ts.createProgram([path], config);
    // let source = program.getSourceFile(path);
    let referencedTypes = new Set<ts.Symbol>();
    // source!.statements.forEach((statement) => {
    //     resolveTypeReferences(
    //         statement,
    //         program.getTypeChecker(),
    //         referencedTypes
    //     );
    // });

    let methods: Methods = {};
    findRouteTypes(program.getSourceFile(path)!.statements, methods);
    // findRouteTypesInFile("example/shared/index.d.ts", methods);

    output.write(`export type Endpoints = {\n`);

    Object.keys(methods).forEach((method) => {
        let pathTypes = methods[method as Method]!;

        output.write(`\t${method}: {\n`);

        Object.keys(pathTypes).forEach((pathTypeName) => {
            let endpoint = pathTypes[pathTypeName];

            Object.keys(endpoint).forEach((apiType) => {
                let type = endpoint[apiType as ApiType];
                if (!type) return;

                resolveTypeReferences(
                    type,
                    program.getTypeChecker(),
                    referencedTypes
                );

                // typeOutputs.push(type.getFullText() + "\n");
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
        console.log("Referenced", e.name);
        output.write(e.declarations[0].getFullText() + "\n");
    });

    output.close();
}

main();
