import ts from "byots";
import fs from "fs";
import path from "path";
import { getFromSourceFile, generatePackageContent, Validators, Methods } from "./generator";

function main() {
    console.log("Starting...");

    let routeDefinitionsPath = process.argv[2]; // .slice(2).join(" ")
    if (!routeDefinitionsPath) {
        throw new Error("Invalid usage, please specify the files containing your routes");
    }
    console.log("Reading routes from ", routeDefinitionsPath);

    let configFileName = ts.findConfigFile(routeDefinitionsPath, ts.sys.fileExists, "tsconfig.json");
    if (!configFileName) {
        throw new Error("tsconfig.json could not be found");
    }
    let compilerOptionsFile = ts.readConfigFile(configFileName, ts.sys.readFile);
    let compilerOptions = ts.parseJsonConfigFileContent(compilerOptionsFile.config, ts.sys, "./").options;

    let program = ts.createProgram([routeDefinitionsPath], compilerOptions);

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
    getFromSourceFile(program, sourceFile, methodTypes, validatorTypes);

    let output = fs.createWriteStream(path.join(path.dirname(routeDefinitionsPath), "generatedClient.ts"));
    generatePackageContent(program.getTypeChecker(), validatorTypes, methodTypes, output, path.dirname(routeDefinitionsPath));
    output.close();
}

main();
