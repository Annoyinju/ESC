import { useEffect, useState } from "react";
import { api, type User } from "../../api"; // adjust the path

interface Me extends User {
    hasPassword: boolean;
    isGoogle: boolean;
}

interface ProfileProps {
    loggedIn: boolean;
    onLoginRequire: () => void;
    onUserChange: (u: User | null) => void;
}

async function errorText(res: Response, fallback: string): Promise<string> {
    const data = await res.json().catch(() => null);
    return typeof data?.error === "string" ? data.error : fallback;
}


interface AdminUser {
    id: number;
    email: string;
    username: string;
    role: User["role"];
    createdAt: string;
    _count: { drawings: number };
}

function AdminPanel({ myId }: { myId: number }) {
    const [query, setQuery] = useState<string>("");
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [cursor, setCursor] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");

    const load = async (q: string, after?: number) => {
        setLoading(true);
        setMessage("");
        try {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (after) params.set("cursor", String(after));

            const res = await api(`/admin/users?${params}`);
            if (!res.ok) { setMessage(await errorText(res, "Could not load users")); return; }

            const data: { items: AdminUser[]; nextCursor: number | null } = await res.json();
            setUsers((prev) => (after ? [...prev, ...data.items] : data.items));
            setCursor(data.nextCursor);
        } catch {
            setMessage("Could not reach the server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => load(query.trim()), 300);
        return () => clearTimeout(t);
    }, [query]);

    const changeRole = async (u: AdminUser, role: User["role"]) => {
        const res = await api(`/admin/users/${u.id}/role`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role }),
        });
        if (!res.ok) { setMessage(await errorText(res, "Role change failed")); return; }
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
    };

    const remove = async (u: AdminUser) => {
        if (!confirm(`Delete ${u.email} and their ${u._count.drawings} drawing(s)? This can't be undone.`)) return;
        const res = await api(`/admin/users/${u.id}`, { method: "DELETE" });
        if (!res.ok) { setMessage(await errorText(res, "Delete failed")); return; }
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
    };

    return (
        <section className="profileCard">
            <h3>Admin: users</h3>
            <input
                type="search"
                placeholder="Search by email or username"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            {message && <p className="profileError">{message}</p>}

            <div className="adminTableWrap">
                <table className="adminTable">
                    <thead>
                        <tr><th>Email</th><th>Username</th><th>Drawings</th><th>Role</th><th /></tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id}>
                                <td>{u.email}</td>
                                <td>{u.username}</td>
                                <td>{u._count.drawings}</td>
                                <td>
                                    <select
                                        value={u.role}
                                        disabled={u.id === myId}
                                        onChange={(e) => changeRole(u, e.target.value as User["role"])}
                                    >
                                        <option value="USER_NOAUTH">USER_NOAUTH</option>
                                        <option value="USER_AUTH">USER_AUTH</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </td>
                                <td>
                                    <button disabled={u.id === myId} onClick={() => remove(u)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {loading && <p>Loading...</p>}
            {!loading && users.length === 0 && <p>No users found.</p>}
            {cursor && !loading && <button onClick={() => load(query.trim(), cursor)}>Load more</button>}
        </section>
    );
}


export default function Profile({ loggedIn, onLoginRequire, onUserChange }: ProfileProps) {
    const [me, setMe] = useState<Me | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const [username, setUsername] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [emailPassword, setEmailPassword] = useState<string>("");
    const [accountMsg, setAccountMsg] = useState<string>("");

    const [currentPassword, setCurrentPassword] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [passwordMsg, setPasswordMsg] = useState<string>("");

    useEffect(() => {
        if (!loggedIn) { setMe(null); setLoading(false); return; }

        setLoading(true);
        api("/auth/profile")
            .then((res) => (res.ok ? res.json() : null))
            .then((data: Me | null) => {
                setMe(data);
                if (data) { setUsername(data.username); setEmail(data.email); }
            })
            .catch(() => setMe(null))
            .finally(() => setLoading(false));
    }, [loggedIn]);

    if (loading) return <p>Loading...</p>;

    if (!loggedIn || !me) {
        return (
            <section className="profileCard">
                <h3>Profile</h3>
                <p>You need to log in to see your profile.</p>
                <button onClick={onLoginRequire}>Log in</button>
            </section>
        );
    }

    const emailChanged = email.trim().toLowerCase() !== me.email;

    const saveAccount = async () => {
        setAccountMsg("");
        const body: Record<string, string> = {};
        if (username !== me.username) body.username = username;
        if (emailChanged) { body.email = email.trim(); body.currentPassword = emailPassword; }
        if (Object.keys(body).length === 0) { setAccountMsg("Nothing to change."); return; }

        const res = await api("/auth/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) { setAccountMsg(await errorText(res, "Check your input")); return; }

        const updated: User = await res.json();
        setMe({ ...me, ...updated });
        setEmail(updated.email);
        setEmailPassword("");
        onUserChange({ ...updated }); 
        setAccountMsg("Saved.");
    };

    const savePassword = async () => {
        setPasswordMsg("");
        const res = await api("/auth/password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        if (!res.ok) { setPasswordMsg(await errorText(res, "Password needs 8+ characters")); return; }

        setCurrentPassword("");
        setNewPassword("");
        setPasswordMsg("Password changed. Other devices were logged out.");
    };

    return (
        <div className="profilePage">
            <section className="profileCard">
                <h3>Account</h3>
                <p>Role: <strong>{me.role}</strong></p>

                <label htmlFor="pfUser">Username</label>
                <input id="pfUser" type="text" value={username} minLength={3} maxLength={30}
                    onChange={(e) => setUsername(e.target.value)} />

                <label htmlFor="pfEmail">Email</label>
                <input id="pfEmail" type="email" value={email} disabled={me.isGoogle}
                    onChange={(e) => setEmail(e.target.value)} />
                {me.isGoogle && <small>Your email comes from Google and can't be changed.</small>}

                {emailChanged && !me.isGoogle && (
                    <>
                        <label htmlFor="pfEmailPw">Current password (needed to change email)</label>
                        <input id="pfEmailPw" type="password" value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)} />
                    </>
                )}

                <button onClick={saveAccount}>Save changes</button>
                {accountMsg && <p>{accountMsg}</p>}
            </section>

            <section className="profileCard">
                <h3>Password</h3>
                {me.hasPassword ? (
                    <>
                        <label htmlFor="pfOld">Current password</label>
                        <input id="pfOld" type="password" value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)} />

                        <label htmlFor="pfNew">New password (8+ characters)</label>
                        <input id="pfNew" type="password" value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)} />

                        <button onClick={savePassword}
                            disabled={!currentPassword || newPassword.length < 8}>
                            Change password
                        </button>
                        {passwordMsg && <p>{passwordMsg}</p>}
                    </>
                ) : (
                    <p>This account signs in with Google, so it has no password.</p>
                )}
            </section>

            {me.role === "ADMIN" && <AdminPanel myId={me.id} />}
        </div>
    );
}