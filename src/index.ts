import ts from "typescript";
import fs from "fs";

console.log(process.argv);

function findRouteTypesInFile(fileName: string) {
    let file = ts.createSourceFile(
        fileName,
        fs.readFileSync(fileName, "utf8"),
        ts.ScriptTarget.ES2015
    );

    findRouteTypes(file.statements);
}

function findRouteTypes(statements: ts.NodeArray<ts.Statement>) {
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
                    /^(Get|Post|Put|Patch|Delete|Head|Options)([a-zA-Z]+)(Response|Request|RequestQuery|RequestParams)$/i
                ))
            ) {
                let [, method, path, type] = m;
                console.log(`method=${method} path=${path} type=${type}`);
            }
        } else if (ts.isModuleDeclaration(statement) && statement.body) {
            findRouteTypes((statement.body as ts.ModuleBlock).statements);
        }
    }
}
findRouteTypesInFile("example/shared/index.d.ts");
