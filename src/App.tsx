
import { Routes, Route, NavLink, HashRouter } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css'
import  CanvasEditor from './assets/components/CanvasEditor.tsx'
import Explore from './assets/components/Explore.tsx';
import { api, type User } from "../src/api.tsx";
import LoginWindow from './assets/components/LoginWindow.tsx';
import About from './assets/components/About.tsx';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const requireLogin = () => { setUser(null); setShowAuth(true); };
  const canShare = !!user && user.role !== "USER_NOAUTH";


  useEffect(() => {
      api("/auth/profile")
          .then((res) => (res.ok ? res.json() : null))
          .then(setUser)
          .catch(() => setUser(null));
  }, []);

  const logout = async () => {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
  };

  return (
    <HashRouter>
    <header>
      {user ? (
      <>
      <div>Logged in as: {user.username}</div>
      <button onClick={logout}>Sign out</button>
      </>  
      ): (
      <>
      <button onClick={() => {setShowAuth(true)}}>Sign in</button>
      </>)}
    </header>
    {showAuth && (
    <LoginWindow
        onSuccess={(u) => { setUser(u); setShowAuth(false); }}
        onCancel={() => setShowAuth(false)}
    />
)}
    <section className='main'>
     <section className='side'>
      <nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/explore">Explore</NavLink>
        <NavLink to="/canvas">Create</NavLink>
      </nav>
      
     </section>

     <section className='content'>
      <Routes>
        <Route path="/" element={<About />} />
        <Route path="/explore" element={<Explore isAdmin={user?.role === "ADMIN"} loggedIn={!!user} />} />
        <Route path="/canvas" element={<CanvasEditor loggedIn={!!user} canShare={canShare} onLoginRequire={requireLogin}/>} />
      </Routes>

     </section>
     </section>
    </HashRouter>
  )
}

export default App
