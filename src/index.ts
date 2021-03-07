import ts from "typescript";
import fs from "fs";

console.log(process.argv);

type Method = "get" | "post" | "put" | "delete" | "patch" | "options" | "head";

type Methods = {
    [M in Method]?: Paths;
};

type Paths = {
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

// interface EndpointStatement {
//     apiType: ApiType;
//     type: ts.Statement;
//     method: Method;
//     path: string;
// }

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
                let method = m[1] as Method;
                let path = m[2].toLowerCase();
                let apiType = apiTypeNameToApiTypePropertyName(m[3]);

                output[method] = {
                    ...output[method],
                    [path]: {
                        ...output[method]?.[path],
                        [apiType]: statement,
                    },
                };
                console.log(`method=${method} path=${path} type=${apiType}`);
            }
        } else if (ts.isModuleDeclaration(statement) && statement.body) {
            findRouteTypes(
                (statement.body as ts.ModuleBlock).statements,
                output
            );
        }
    }
}

// function groupBy<T, O>(x: Array<T>, f: (f: T) => keyof O): O {
//     return x.reduce((a, b) => ((a[f(b)] ||= []).push(b), a), {} as any);
// }

function main() {
    let methods: Methods = {};
    findRouteTypesInFile("example/shared/index.d.ts", methods);
    let output = fs.createWriteStream("output.d.ts");

    let typeOutputs: string[] = [];

    output.write(`export type Endpoints = {`);

    Object.keys(methods).forEach((method) => {
        let paths = methods[method as Method]!;

        output.write(`\t ${method}: {\n`);

        Object.keys(paths).forEach((path) => {
            let types = paths[path];

            Object.keys(types).forEach((apiType) => {
                let type = types[apiType as ApiType];
                if (!type) return;

                typeOutputs.push(type.getFullText() + "\n");
            });

            output.write(
                `\t\t"/${path}": Endpoint<${
                    types.req?.name?.text ?? "unknown"
                }, ${types.res?.name?.text ?? "unknown"}, ${
                    types.params?.name?.text ?? "unknown"
                }, ${types.query?.name?.text ?? "unknown"}>;\n`
            );
        });

        output.write(`\t},\n`);
    });

    output.write(`}\n\n`);

    typeOutputs.forEach((t) => output.write(t));

    output.close();
}

main();
