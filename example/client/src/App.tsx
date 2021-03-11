import React, { useEffect, useState } from "react";
import { Client, User, Routes, UserWithoutId, ErrorMap } from "shared";
import { FormError, FormInput, FormSelect, useForm } from "typed-react-form";

let client = new Client({ path: "http://localhost:3002/" });

function App() {
    const form = useForm<UserWithoutId>({ password: "", birthDate: new Date(), email: "", gender: "male" });
    const [users, setUsers] = useState<User[] | null>(null);

    useEffect(() => {
        (async () => {
            setUsers((await client.getUsers()).users);
        })();
    }, []);

    return (
        <div style={{ margin: "2em" }}>
            <h3>Users</h3>
            <ul>
                {users === null
                    ? "Loading users..."
                    : users.length === 0
                    ? "No users yet"
                    : users.map((e) => (
                          <li>
                              {e.email} ({e.gender})<button onClick={async () => alert(JSON.stringify(await client.getUser({ userId: e.id })))}>More info</button>
                          </li>
                      ))}
            </ul>

            <h3>Create new user</h3>
            <form
                onSubmit={async (ev) => {
                    ev.preventDefault();
                    form.setState({ isSubmitting: true });
                    let res = await client.postUser({ user: form.values });
                    if (res.status === "error" && typeof res.error === "object") {
                        form.setErrors(res.error.user as any);
                    }
                    form.setState({ isSubmitting: false });
                }}
            >
                <p>Email</p>
                <FormError form={form} name="email" />
                <FormInput form={form} name="email" type="email" />
                <p>Password</p>
                <FormError form={form} name="password" />
                <FormInput form={form} name="password" type="password" />
                <p>Gender</p>
                <FormSelect form={form} name="gender">
                    <option>male</option>
                    <option>female</option>
                </FormSelect>
                <button>Create</button>
            </form>
        </div>
    );
}

export default App;
