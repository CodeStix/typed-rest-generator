# Typed-rest-generator

The ultimate cli tool to generate typescript code that connects your client-side application to your server.

**Caution: very experimental**

## How it works

1. You create a typescript file (in a shared package between your client and server) containing your routes in a _Routes_ namespace:

    ```ts
    // routes.ts
    // Must end with Routes
    export namespace UserRoutes {

        // Must end with Request
        export UserCreateRequest {
            name: string;
            email: string;
            password: string;
        }

        // Must end with Response
        export UserCreateResponse {
            user: User;
        }
    }
    ```

    ```ts
    // index.ts
    export * from "./routes.ts";
    ```

2. Run the cli tool: `npx typedrest -i index.ts -o generatedClient.ts`. The tool will look for the _Routes_ namespaces and will generate a script containing validators, the `Client` class and the `typedRouter` helper.
3. The generated code can be used in the following ways:

    **Shared package**

    ```ts
    // index.ts
    export * from "./routes.ts";
    export * from "./generatedClient.ts"; // <-- make sure to export it first
    ```

    **Client side**

    ```ts
    // Import from shared package
    import { Client } from "shared";

    let client = new Client({ path: "http://localhost:3002/" });

    // Generated function!
    let resp = await client.userCreate(/* takes UserCreateRequest */);
    console.log(resp.user); // resp is UserCreateResponse
    ```

    **Server-side using express**

    ```ts
    import express from "express";
    import { typedRouter } from "shared";

    // Wrap express with typedRouter to enable type-checking
    const app = typedRouter(express());

    // Even the path is type-checked
    app.typed("/user/create", (req, res, next) => {
        // A validator for UserCreateRequest was automatically generated and tested on req.body.

        // req and res are type checked!
        console.log(req.body.name);

        res.json({}); // error: `user` is missing in type UserCreateResponse
    });
    ```

## Command usage

```
Usage: typedrest [options]

Options:
  -V, --version       output the version number
  -i --input <file>   The input .ts file.
  -o --output <file>  The destination file to generate. Will be overwritten. (default: "generatedClient.ts")
  -w --watch          Watch the input file for changes.
  -h, --help          display help for command
```
