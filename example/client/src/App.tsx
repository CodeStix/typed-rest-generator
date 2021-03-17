import React, { useEffect, useState } from "react";
import { Client, Post, Routes, User, UserWithoutId } from "shared";
import { FormError, FormInput, FormSelect, useForm } from "typed-react-form";

let client = new Client({ path: "http://localhost:3002/" });

function App() {
    const form = useForm<Routes.UserCreateRequest>(
        { password: "", birthDate: new Date(), email: "", gender: "male" },
        (data) => (Client.validateUserCreateRequest(data) as any) ?? {},
        true,
        false
    );
    const [users, setUsers] = useState<User[] | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);

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
                                      let posts = await client.userPostList({ userId: e.id });
                                      setPosts(posts.posts);
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
                        form.setErrors(res.error as any);
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

            <h3>Posts</h3>
            {posts.length === 0
                ? "No posts!"
                : posts.map((post) => (
                      <div key={post.id} style={{ background: "#0001", padding: "1em" }}>
                          <h4>{post.title}</h4>
                          <pre>{post.content}</pre>
                      </div>
                  ))}

            <button
                onClick={async () => {
                    let newPost = await client.postCreate({ content: "Proident qui sint laborum duis eu do officia anim irure pariatur.", title: prompt("Enter title") as any });
                    setPosts([...posts, newPost.post]);
                }}
            >
                Create post!
            </button>
        </div>
    );
}

export default App;
