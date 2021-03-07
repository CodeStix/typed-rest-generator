export function decapitalize(str: string) {
    return str[0].toLowerCase() + str.substring(1);
}

export function isUpperCase(str: string, at: number) {
    let c = str.charCodeAt(at);
    return c >= 65 && c <= 90;
}

// UserPost -> ["User","Post"]
// UserPostSettingsAAAAaaa -> ["User", "Post", "Settings", "AAAAaaa"]
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
