import React, { useEffect, useState } from "react";
import { Client } from "shared";

function App() {
    let client = new Client({ path: "http://localhost:3002/" });
    const [result, setResult] = useState<any>({});

    return (
        <div>
            <pre>{result === null ? "loading..." : JSON.stringify(result, null, 2)}</pre>

            <button
                onClick={async (ev) => {
                    setResult(null);
                    let resp = await client.postUser({
                        user: {
                            birthDate: new Date(),
                            email: prompt() as any,
                            gender: "male",
                            id: 123,
                            password: "asdf",
                        },
                    });
                    setResult(resp);
                }}
            >
                Fetch
            </button>
        </div>
    );
}

export default App;
