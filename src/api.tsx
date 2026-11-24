const API = "http://localhost:3000/api";

export async function api(path: string, init: RequestInit = {}) {
    return fetch(API + path, { credentials: "include", ...init }); 
}

export interface User {
    id: number;
    email: string;
    username: string;
}