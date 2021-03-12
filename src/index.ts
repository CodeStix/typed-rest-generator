import ts, { programContainsEs6Modules } from "byots";
import fs from "fs";
import path from "path";
import { getFromSourceFile, generatePackageContent, Validators, Methods } from "./generator";
import { Command } from "commander";
import chokidar from "chokidar";

function main() {
    let program = new Command("route-gen");
    program.version("1.0.0");
    program.requiredOption("-i --input <file>", "The .ts file containing Routes/Validation namespaces.");
    program.option("-o --output <file>", "The destination file to generate. Will be overwritten.", "generatedClient.ts");
    program.option("-w --watch", "Watch the input file for changes.");
    program.parse(process.argv);
    let options = program.opts();
    let inputFile = options.input;
    let outputFile = options.output;

    if (options.watch) {
        console.log("Watching for changes...");
        chokidar.watch(inputFile, {}).on("change", (ev, file) => {
            execute(inputFile, outputFile);
        });
    } else {
        execute(inputFile, outputFile);
    }
}

function execute(inputFile: string, outputFile: string) {
    let inputFileDir = path.dirname(inputFile);
    console.log(`${inputFile} -> ${outputFile}`);
    let configFileName = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json");
    if (!configFileName) {
        throw new Error("tsconfig.json could not be found");
    }
    let compilerOptionsFile = ts.readConfigFile(configFileName, ts.sys.readFile);
    let compilerOptions = ts.parseJsonConfigFileContent(compilerOptionsFile.config, ts.sys, "./").options;
    let typescriptProgram = ts.createProgram([inputFile], compilerOptions);
    let inputSourceFile = typescriptProgram.getSourceFile(inputFile)!;
    if (!inputSourceFile) throw new Error(`Input file '${inputFile}' does not exist.`);

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
    getFromSourceFile(typescriptProgram, inputSourceFile, methodTypes, validatorTypes);

    let output = fs.createWriteStream(outputFile); // path.join(inputFileDir, outputFile)
    generatePackageContent(typescriptProgram.getTypeChecker(), validatorTypes, methodTypes, output, inputFileDir);
    output.close();
}

main();
