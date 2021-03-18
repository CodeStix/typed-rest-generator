import React, { useEffect, useState } from "react";
import { Client, ErrorMap, Post, Routes, User } from "shared";
import { FormError, FormInput, FormSelect, useForm } from "typed-react-form";

let client = new Client({ path: "http://localhost:3002/" });

function App() {
    const form = useForm<Routes.UserCreateRequest>(
        { password: "", birthDate: new Date(), email: "", gender: "male" },
        (data) => (Client.validateUserCreateRequest(data) as ErrorMap<Routes.UserCreateRequest>) ?? {},
        true,
        false
    );
    const [users, setUsers] = useState<User[] | null>(null);

    console.log(client.version);

    useEffect(() => {
        (async () => {
            setUsers((await client.userList()).users);
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
                              <button
                                  onClick={async () => {
                                      // async () => alert(JSON.stringify(await client.userGet({ userId: e.id })))
                                      let user = await client.userGet({ userId: e.id });
                                      alert(JSON.stringify(user, null, 2));
                                  }}
                              >
                                  More info
                              </button>
                          </li>
                      ))}
            </ul>

            <h3>Create new user</h3>
            <form
                onSubmit={async (ev) => {
                    ev.preventDefault();
                    await form.validate();
                    console.log("submit", form.errorMap);

                    if (form.error) return;
                    form.setState({ isSubmitting: true });
                    let res = await client.userCreate(form.values);
                    if (res.status === "error" && res.error && typeof res.error === "object") {
                        form.setErrors(res.error);
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
