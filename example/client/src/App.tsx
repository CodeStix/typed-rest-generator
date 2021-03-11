import React, { useEffect, useState } from "react";
import { Client, User, Routes, UserWithoutId } from "shared";
import { FormInput, FormSelect, useForm } from "typed-react-form";

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
                              {e.email} ({e.gender})
                          </li>
                      ))}
            </ul>

            <h3>Create new user</h3>
            <form
                onSubmit={async (ev) => {
                    ev.preventDefault();
                    form.setState({ isSubmitting: true });
                    await client.postUser({ user: form.values });
                    form.setState({ isSubmitting: false });
                }}
            >
                <p>Email</p>
                <FormInput form={form} name="email" type="email" />
                <p>Password</p>
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
