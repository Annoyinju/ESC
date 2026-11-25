const API = import.meta.env.VITE_API_URL;

export async function api(path: string, init: RequestInit = {}) {
    return fetch(API + path, { credentials: "include", ...init }); 
}

export interface User {
    id: number;
    email: string;
    username: string;
    role: "USER_NOAUTH" | "USER_AUTH" | "ADMIN";
}