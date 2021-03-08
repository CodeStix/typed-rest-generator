
export type Endpoint<Req, Res, Params = never, Query = never> = {
    req: Req;
    res: Res;
    params: Params;
    query: Query;
};

export type MethodPath<Method> = keyof Endpoints[Method];

    export type Endpoints = {
	post: {
		"/post": Endpoint<PostPostRequest, PostPostResponse, unknown, unknown>;
		"/user": Endpoint<PostUserRequest, PostUserResponse, PostUserRequestParams, PostUserRequestQuery>;
		"/user/post": Endpoint<PostUserPostRequest, unknown, unknown, unknown>;
	},
}

export type PostPostRequest = {
    id: string;
};
export interface PostPostResponse {
    post: Date;
}
export interface PostUserRequest {
    id: number;
}
export interface PostUserResponse {
    user: User;
}
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
export interface PostUserRequestQuery {
    queryValue: string;
}
export interface PostUserRequestParams {
    paramValue: string;
}
export interface PostUserPostRequest {
    id: number;
    text: string;
}
