import ts from "typescript";
import fs from "fs";

console.log(process.argv);

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

function decapitalize(str: string) {
    return str[0].toLowerCase() + str.substring(1);
}

function isUpperCase(str: string, at: number) {
    let c = str.charCodeAt(at);
    return c >= 65 && c <= 90;
}

// UserPost -> ["User","Post"]
// UserPostSettingsAAAAaaa -> ["User", "Post", "Settings", "AAAAaaa"]
function splitCapitalized(str: string) {
    let parts: string[] = [];
    let current = "";
    for (let i = 0; i < str.length; i++) {
        if (isUpperCase(str, i) && !isUpperCase(str, i - 1) && i > 0) {
            parts.push(current);
            current = "";
        }
        current += str[i];
    }
    if (current.length > 0) parts.push(current);
    return parts;
}

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

function main() {
    let methods: Methods = {};
    findRouteTypesInFile("example/shared/index.d.ts", methods);
    let output = fs.createWriteStream("output.d.ts");

    let typeOutputs: string[] = [];

    function typeNameToPath(typeName: string) {
        return (
            "/" +
            splitCapitalized(typeName)
                .map((e) => decapitalize(e))
                .join("/")
        );
    }

    output.write(`export type Endpoints = {\n`);

    Object.keys(methods).forEach((method) => {
        let pathTypes = methods[method as Method]!;

        output.write(`\t${method}: {\n`);

        Object.keys(pathTypes).forEach((pathTypeName) => {
            let endpoint = pathTypes[pathTypeName];

            Object.keys(endpoint).forEach((apiType) => {
                let type = endpoint[apiType as ApiType];
                if (!type) return;

                typeOutputs.push(type.getFullText() + "\n");
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

    typeOutputs.forEach((t) => output.write(t));

    output.close();
}

main();
