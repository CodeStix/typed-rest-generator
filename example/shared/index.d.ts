export type Endpoints = {
	get: {
		"/post": Endpoint<GetPostRequest, GetPostResponse, unknown, unknown>;
		"/user": Endpoint<GetUserRequest, GetUserResponse, GetUserRequestParams, GetUserRequestQuery>;
		"/user/post": Endpoint<GetUserPostRequest, unknown, unknown, unknown>;
	},
}

export type GetPostRequest = {
    id: string;
};
export interface GetPostResponse {
    yikes: Yikes;
    post: Date;
}
interface Yikes {
    name: string;
    post: Post;
    yikers: Yikes2;
}
export type Post = {
  id: string
  title: string
  content: string
  userId: number
}
type Yikes2 = {
    name: string;
};
export type GetUserRequest = {
    yikes: Yikes | Yikes2;
    id: number;
};
export type GetUserResponse = {
    user: User;
};
export type User = {
  id: number
  email: string
  password: string
  birthDate: Date
  gender: Gender
}
export const Gender: {
  male: 'male',
  female: 'female'
};
export type Gender = (typeof Gender)[keyof typeof Gender]
export type GetUserRequestQuery = {
    queryValue: string;
};
export type GetUserRequestParams = {
    paramValue: string;
};
export interface GetUserPostRequest {
    id: number;
    text: string;
}
