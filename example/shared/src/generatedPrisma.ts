export const Gender: {
    male: "male";
    female: "female";
} = { male: "male", female: "female" };

export type Gender = typeof Gender[keyof typeof Gender];

export type User = {
    id: number;
    /**
     * @v-regex /^\S+@\S+\.\S+$/ Invalid email
     */
    email: string;
    /**
     * @v-min 1 Password must be longer
     */
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
