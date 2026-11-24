import { useState } from "react";
import { api, type User } from "../../api";

interface LoginWindowProps {
    onSuccess: (user: User) => void;
    onCancel: () => void;
}

export default function LoginWindow({ onSuccess, onCancel }: LoginWindowProps) {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [email, setEmail] = useState<string>("");
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [busy, setBusy] = useState<boolean>(false);

    const submit = async () => {
        setError("");
        setBusy(true);
        try {
            const body = mode === "login"
                ? { email, password }
                : { email, username, password };

            const res = await api(`/auth/${mode}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setError(typeof data?.error === "string" ? data.error : "Check your input (password needs 8+ characters)");
                return;
            }
            onSuccess(await res.json());
        } catch {
            setError("Could not reach the server");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="popupBackdrop">
            <section className="popup" role="dialog">
                <header className="popupTitleBar">
                    <span>{mode === "login" ? "Log in" : "Create account"}</span>
                    <button className="popupClose" onClick={onCancel} aria-label="Close">✕</button>
                </header>

               


                <div className="popupBody">

                     {mode === "register" && (
                        <>
                            <label htmlFor="authUser">Username:</label><br />
                            <input id="authUser" type="text" value={username}
                                onChange={(e) => setUsername(e.target.value)} /><br />
                            
                        </>
                    )}
                    <label htmlFor="authEmail">Email:</label><br />
                    <input id="authEmail" type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)} /><br />
                    

                    
                    <label htmlFor="authPass">Password:</label><br />
                    <input id="authPass" type="password" value={password}
                        onChange={(e) => setPassword(e.target.value)} />
                    
                </div>

                {error && <p style={{ color: "#c0392b", margin: "0 16px 10px" }}>{error}</p>}

                <footer className="popupFooter">
                    <button onClick={() => setMode(mode === "login" ? "register" : "login")}>
                        {mode === "login" ? "Need an account?" : "Have an account?"}
                    </button>
                    <button className="primary" onClick={submit} disabled={busy}>
                        {mode === "login" ? "Log in" : "Register"}
                    </button>
                </footer>
            </section>
        </div>
    );
}