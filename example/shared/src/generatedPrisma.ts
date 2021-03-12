export const Gender: {
    male: "male";
    female: "female";
} = { male: "male", female: "female" };

export type Gender = typeof Gender[keyof typeof Gender];

export type User = {
    id: number;
    email: string;
    password: string;
    birthDate: Date;
    gender: Gender;
};

export type UserWithoutId = {
    email: string;
    password: string;
    birthDate: Date;
    gender: Gender;
};

export type Post = {
    id: string;
    title: string;
    content: string;
    userId: number;
};
