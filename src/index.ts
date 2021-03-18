#!/usr/bin/env node

import ts from "byots";
import fs from "fs";
import path from "path";
import { generatePackageContent, getRouteTypes, getRouteTypesFromRoutesNamespace, PathTypes } from "./generator";
import { Command } from "commander";
import chokidar from "chokidar";
import pack from "../package.json";

function main() {
    let program = new Command(pack.name);
    program.version(pack.version);
    program.requiredOption("-i --input <file>", "The .ts file containing request/response types.");
    program.option("-o --output <file>", "The destination file to generate. Will be overwritten.", "");
    program.option("-w --watch", "Watch the input file for changes.");
    program.option("-n --namespace", "Look for route types in `Routes` namespaces.");
    program.parse(process.argv);
    let options = program.opts();
    let inputFile = options.input;
    let outputFile = options.output;
    let namespaceOnly = options.namespace;
    if (!outputFile) outputFile = path.join(path.dirname(inputFile), "generatedClient.ts");

    if (options.watch) {
        console.log("Watching for changes...");
        execute(inputFile, outputFile, namespaceOnly, pack.version);
        let watchFiles = getProgramPaths(inputFile).filter((e) => e !== outputFile);
        chokidar.watch(watchFiles, {}).on("change", () => {
            try {
                execute(inputFile, outputFile, namespaceOnly, pack.version);
            } catch (ex) {
                console.error(ex);
            }
        });
    } else {
        execute(inputFile, outputFile, namespaceOnly, pack.version);
    }
}

function getProgramPaths(inputFile: string) {
    let compilerOptions = getCompilerOptions();
    let typescriptProgram = ts.createProgram([inputFile], compilerOptions);
    return typescriptProgram.getSourceFiles().map((e) => path.relative(process.cwd(), e.fileName));
}

function getCompilerOptions() {
    let configFileName = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json");
    if (!configFileName) {
        throw new Error("tsconfig.json could not be found");
    }
    let compilerOptionsFile = ts.readConfigFile(configFileName, ts.sys.readFile);
    return ts.parseJsonConfigFileContent(compilerOptionsFile.config, ts.sys, "./").options;
}

function execute(inputFile: string, outputFile: string, onlyNamespace: boolean, version: string) {
    console.log(`${inputFile} -> ${outputFile}`);
    let compilerOptions = getCompilerOptions();
    let typescriptProgram = ts.createProgram([inputFile], compilerOptions);
    let checker = typescriptProgram.getTypeChecker();
    let pathTypes: PathTypes = {};

    let files = typescriptProgram.getSourceFiles();

    files.forEach((f) => {
        if (f.fileName.includes("node_modules/")) return;
        console.log("File", path.relative(process.cwd(), f.fileName));
        if (onlyNamespace) getRouteTypesFromRoutesNamespace(checker, f, pathTypes);
        else getRouteTypes(checker, f, pathTypes);
    });

    let output = fs.createWriteStream(outputFile);
    generatePackageContent(checker, pathTypes, output, path.dirname(outputFile), version);
    output.close();
}

main();
