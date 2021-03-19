import ts from "byots";
import fs from "fs";
import path from "path";
import { decapitalize, splitCapitalized, getMostSuitableDeclaration, getSymbolImportName, isDefaultType, getFullTypeName, capitalize } from "./helpers";
import { createSchemaForTypeDeclaration, TypeSchema, RootTypes, rootTypesToTypes } from "./typeExtractor";

export type PathTypes = {
    [path: string]: EndPoint;
};
export type EndPoint = {
    req?: {
        type: ts.Type;
    };
    res?: {
        type: ts.Type;
    };
};
export type ApiType = keyof EndPoint;

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

export function registerRouteType(node: ts.Node, typeChecker: ts.TypeChecker, paths: PathTypes, throwOnNoMatch?: boolean) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isClassDeclaration(node)) {
        let name = node.name!.text;
        let m;
        let regex = /^([a-zA-Z0-9_]+)(Response|Request)$/;
        if ((m = name.match(regex))) {
            let pathType = m[1];
            let apiType = m[2] === "Request" ? "req" : "res";

            paths[pathType] = {
                ...paths[pathType],
                [apiType]: {
                    type: typeChecker.getDeclaredTypeOfSymbol(typeChecker.getSymbolAtLocation(node.name!)!),
                },
            };
        } else if (throwOnNoMatch) {
            throw new Error(`Malformed route type name '${name}', please match '${regex.source}'`);
        }
    } else if (throwOnNoMatch) {
        throw new Error(`Unsupported route type '${ts.SyntaxKind[node.kind]}' at line ${node.getSourceFile().fileName}:${node.pos}`);
    }
}

export function getRouteTypes(checker: ts.TypeChecker, file: ts.SourceFile, paths: PathTypes) {
    file.statements.forEach((stmt) => registerRouteType(stmt, checker, paths, false));
}

export function getRouteTypesFromRoutesNamespace(checker: ts.TypeChecker, file: ts.SourceFile, paths: PathTypes) {
    file.statements.forEach((stmt) => {
        if (ts.isModuleDeclaration(stmt)) {
            if (stmt.name.text.endsWith("Routes")) {
                let body = stmt.body! as ts.ModuleBlock;
                body.statements.forEach((routeType) => registerRouteType(routeType, checker, paths, true));
            }
        }
    });
}

export function followImport(node: ts.ImportSpecifier, typeChecker: ts.TypeChecker) {
    let symbol = typeChecker.getSymbolAtLocation(node.propertyName ?? node.name);
    if (!symbol) throw new Error(`Symbol '${node.getText()}' not found`);
    let type = typeChecker.getDeclaredTypeOfSymbol(symbol);
    if (!type.symbol && !type.aliasSymbol) throw new Error(`Type '${node.getText()}' not found`);
    return type.aliasSymbol ?? type.symbol;
}

export function generatePackageContent(typeChecker: ts.TypeChecker, paths: PathTypes, outputStream: fs.WriteStream, outputDirectory: string, version: string) {
    // Write default types
    outputStream.write(getDefaultTypes());

    let clientClassMethodImplementations: string[] = [];
    let typesToImport = new Set<ts.Symbol>();
    let endPointsTypings: string[] = [];
    let typeSchemas: RootTypes = {};
    let pathTypes: {
        [path: string]: string;
    } = {};

    // Create Endpoints type
    endPointsTypings.push(`export type Endpoints = {\n`);
    Object.keys(paths).forEach((pathTypeName) => {
        let endpoint = paths[pathTypeName];

        // Import Request/Response types
        Object.keys(endpoint).forEach((apiType) => {
            let node = endpoint[apiType as ApiType];
            if (!node) return;

            typesToImport.add(node.type.aliasSymbol ?? node.type.symbol);
        });

        let path = typeNameToPath(pathTypeName);
        let functionName = decapitalize(pathTypeName);
        let reqType = endpoint.req ? getFullTypeName(endpoint.req.type, typeChecker) : null;
        let resType = endpoint.res ? getFullTypeName(endpoint.res.type, typeChecker) : null;
        console.log(`${path} --> ${functionName}`);

        // Create client fetch function
        clientClassMethodImplementations.push(`
        /**
         * Fetches "${path}" from the server. (\`${pathTypeName}\`)
         */
        public async ${functionName}(${reqType ? "data: " + reqType : ""}): Promise<${resType ?? "void"}> {
            ${resType ? "return " : ""}await this.fetch("post", "${path}"${reqType ? ", data" : ""});
        }`);

        // Create Endpoints type entry
        endPointsTypings.push(`\t\t"${path}": {
            req: ${reqType ? reqType : "never"},
            res: ${resType ? resType : "never"},
        },\n`);

        if (endpoint.req) {
            createSchemaForTypeDeclaration(
                (endpoint.req.type.aliasSymbol ?? endpoint.req.type.symbol).declarations![0] as ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.ClassDeclaration,
                typeChecker,
                typeSchemas
            );
            pathTypes[path] = getFullTypeName(endpoint.req.type, typeChecker);
        }
    });

    Object.keys(typeSchemas).forEach((typeName) => {
        let type = typeSchemas[typeName];
        typesToImport.add(type.type.aliasSymbol ?? type.type.symbol);
        type.type.aliasTypeArguments?.forEach((e) => {
            let sym = e.aliasSymbol ?? e.symbol;
            if (sym) typesToImport.add(sym);
        });

        let sanitizedTypeName = typeName
            .split(/[^a-zA-Z]/)
            .map((e) => capitalize(e))
            .join("");
        clientClassMethodImplementations.push(`
        /**
         * Validates \`${typeName}\` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validate${sanitizedTypeName}<Error extends string>(data: ${typeName}, settings?: ValidationSettings): ErrorType<${typeName}, Error> | null {
            return validate<${typeName}, Error>(SCHEMAS[${JSON.stringify(typeName)}], data, { otherTypes: SCHEMAS, ...settings })[0];
        }`);
    });

    endPointsTypings.push(`}\n\n`);

    // Generate import statements
    let imports: {
        [file: string]: Set<string>;
    } = {};
    typesToImport.forEach((symbol) => {
        // Do not import default types like Date ...
        if (isDefaultType(symbol)) return;

        let decl = getMostSuitableDeclaration(symbol.declarations);
        if (!decl) throw new Error(`Type ${symbol.name} not found`);

        let importName;
        if (ts.isImportSpecifier(decl)) {
            importName = (decl.parent.parent.parent.moduleSpecifier as ts.StringLiteral).text;
        } else {
            let file = decl.getSourceFile();
            importName = path.relative(outputDirectory, file.fileName);
            if (importName.endsWith(".ts")) importName = importName.substring(0, importName.length - 3);
            if (!importName.startsWith(".")) importName = "./" + importName;
        }
        let names = imports[importName];
        if (!names) {
            names = new Set<string>();
            imports[importName] = names;
        }
        names.add(getSymbolImportName(symbol));
    });

    // Write import statements
    Object.keys(imports).forEach((importName) => {
        let elems = imports[importName];
        outputStream.write(`import { ${[...elems].join(", ")} } from "${importName}"\n`);
    });

    outputStream.write(`\nconst PATH_VALIDATORS: {
        [Key in keyof Endpoints]?: keyof typeof SCHEMAS;
    } = ${JSON.stringify(pathTypes)}\n`);

    // outputStream.write("}\n");

    // Write code
    outputStream.write(`
${endPointsTypings.join("")}

const VERSION = "${version}";

export class Client extends BaseClient<Endpoints> {
    
${clientClassMethodImplementations.join("\n\n")}
}

const SCHEMAS = ${JSON.stringify(rootTypesToTypes(typeSchemas), null, 4)} as const;
    `);
}
