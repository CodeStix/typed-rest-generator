#!/usr/bin/env node

import ts from "byots";
import fs from "fs";
import path from "path";
import { getFromSourceFile, generatePackageContent, Validators, PathTypes } from "./generator";
import { Command } from "commander";
import chokidar from "chokidar";

function main() {
    let program = new Command("typed-rest-generator");
    program.version("1.0.0");
    program.requiredOption("-i --input <file>", "The .ts file containing Routes/Validation namespaces.");
    program.option("-o --output <file>", "The destination file to generate. Will be overwritten.", "");
    program.option("-w --watch", "Watch the input file for changes.");
    program.parse(process.argv);
    let options = program.opts();
    let inputFile = options.input;
    let outputFile = options.output;
    if (!outputFile) outputFile = path.join(path.dirname(inputFile), "generatedClient.ts");

    if (options.watch) {
        console.log("Watching for changes...");
        execute(inputFile, outputFile);
        chokidar.watch(inputFile, {}).on("change", (ev, file) => {
            try {
                execute(inputFile, outputFile);
            } catch (ex) {
                console.error(ex);
            }
        });
    } else {
        execute(inputFile, outputFile);
    }
}

function execute(inputFile: string, outputFile: string) {
    console.log(`${inputFile} -> ${outputFile}`);
    let configFileName = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json");
    if (!configFileName) {
        throw new Error("tsconfig.json could not be found");
    }
    let compilerOptionsFile = ts.readConfigFile(configFileName, ts.sys.readFile);
    let compilerOptions = ts.parseJsonConfigFileContent(compilerOptionsFile.config, ts.sys, "./").options;
    let typescriptProgram = ts.createProgram([inputFile], compilerOptions);
    let validatorTypes: Validators = {};
    let methodTypes: PathTypes = {};

    let files = typescriptProgram.getSourceFiles();

    files.forEach((f) => {
        if (f.fileName.includes("node_modules/")) return;
        console.log("File", path.relative(process.cwd(), f.fileName));
        getFromSourceFile(typescriptProgram, f, methodTypes, validatorTypes);
    });

    let output = fs.createWriteStream(outputFile);
    generatePackageContent(typescriptProgram.getTypeChecker(), validatorTypes, methodTypes, output, path.dirname(outputFile));
    output.close();
}

main();
