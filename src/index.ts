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
    statements.forEach((statement) => {
        if (
            ts.isTypeAliasDeclaration(statement) ||
            ts.isInterfaceDeclaration(statement) ||
            ts.isClassDeclaration(statement)
        ) {
            console.log(statement.name?.text);
        } else if (ts.isModuleDeclaration(statement) && statement.body) {
            findRouteTypes((statement.body as ts.ModuleBlock).statements);
        }
    });
}

findRouteTypesInFile("example/shared/routes.d.ts");
