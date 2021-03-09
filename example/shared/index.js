
module.exports.defaultFetcher = async function (url, method, body) {
    let res = await fetch(url, {
        method,
        body: typeof body === "object" ? JSON.stringify(body) : null,
        headers: { "Content-Type": "application/json" },
    });
    if (res.status === 200) {
        return await res.json();
    } else if (res.status === 401) {
        throw new Error(
            `Unauthorized. To implement authorization, override fetcher in the client settings.`
        );
    } else if (res.status === 404 || (res.status > 200 && res.status < 300)) {
        return null;
    } else {
        throw new Error(
            `Could not fetch '${method}' (HTTP ${res.status}: ${res.statusText})`
        );
    }
}

module.exports.Client = class Client {
    constructor(settings = {}) {
        settings.path ||= "";
        settings.fetcher ||= module.exports.defaultFetcher;
        if (settings.path.endsWith("/"))
            settings.path = settings.path.substring(
                0,
                settings.path.length - 1
            );
        this.settings = settings;
    }

    async fetch(method, path, body) {
        return this.settings.fetcher(path, method, body);
    }

    async postPost (data) { 
                    return await this.fetch("post", "/post", data);
                }
};
    