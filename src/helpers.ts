import ts from "byots";

export function decapitalize(str: string) {
    if (!str) return str;
    return str[0].toLowerCase() + str.substring(1);
}

export function capitalize(str: string) {
    if (!str) return str;
    return str[0].toUpperCase() + str.substring(1);
}

export function isUpperCase(str: string, at: number) {
    let c = str.charCodeAt(at);
    return c >= 65 && c <= 90;
}

export function parseBoolean(str: string) {
    str = str.trim();
    if (str === "true") return true;
    else if (str === "false") return false;
    else throw new Error("Invalid boolean, please use `true` or `false`.");
}

/**
 * UserPost -> ["User","Post"]
 */
export function splitCapitalized(str: string) {
    let parts: string[] = [];
    let current = "";
    for (let i = 0; i < str.length; i++) {
        if (isUpperCase(str, i) && i > 0 && !isUpperCase(str, i - 1)) {
            parts.push(current);
            current = "";
        }
        current += str[i];
    }
    if (current.length > 0) parts.push(current);
    return parts;
}

/**
 * Get fully qualified type name without the import("asfasdf") statements
 */
export function getFullTypeName(type: ts.Type, checker: ts.TypeChecker) {
    return checker
        .typeToString(type, undefined, ts.TypeFormatFlags.UseFullyQualifiedType | ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.NoTypeReduction)
        .replace(/import\(\"[^\"]+\"\)\./g, "");
}

export function getSymbolImportName(symbol: ts.Symbol): string {
    if (!symbol.parent?.parent) return symbol.name;
    return getSymbolImportName(symbol.parent);
}

export function getSymbolUsageName(symbol: ts.Symbol): string {
    if (!symbol.parent?.parent) return symbol.name;
    return getSymbolUsageName(symbol.parent) + "." + symbol.name;
}

export function getSymbolFullName(symbol: ts.Symbol): string {
    if (!symbol.parent?.parent) return symbol.name;
    return getSymbolFullName(symbol.parent) + symbol.name;
}

export function getMostSuitableDeclaration(decls?: ts.Declaration[]) {
    if (!decls) return decls;
    return decls.find((e) => ts.isClassDeclaration(e) || ts.isFunctionDeclaration(e) || ts.isInterfaceDeclaration(e) || ts.isTypeAliasDeclaration(e) || ts.isImportSpecifier(e))!;
}

/**
 * Returns true if the given type/symbol is located in the typescript/lib folder
 */
export function isDefaultType(symbol: ts.Symbol) {
    return symbol.declarations!.some((e) => e.getSourceFile().fileName.includes("/node_modules/typescript/lib"));
}

export function symbolFlagsToString(flags: ts.SymbolFlags) {
    let str = [];
    for (let flag in ts.SymbolFlags) {
        let n = parseInt(ts.SymbolFlags[flag]);
        if ((flags & n) === n) {
            str.push(flag);
        }
    }
    return str.join(", ");
}

export function typeFlagsToString(flags: ts.TypeFlags): string {
    let fl: string[] = [];
    for (let a in ts.TypeFlags) {
        let n = parseInt(ts.TypeFlags[a]);
        if ((flags & n) === n) {
            fl.push(a);
        }
    }
    return fl.join(",");
}

export function nodeFlagsToString(flags: ts.NodeFlags): string {
    let fl: string[] = [];
    for (let a in ts.NodeFlags) {
        let n = parseInt(ts.NodeFlags[a]);
        if ((flags & n) === n) {
            fl.push(a);
        }
    }
    return fl.join(",");
}

export function symbolHasFlag(symbol: ts.Symbol, flag: ts.SymbolFlags) {
    return (symbol.flags & flag) === flag;
}
