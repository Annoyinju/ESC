
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css'
import  CanvasEditor from './assets/components/CanvasEditor.tsx'
import Explore from './assets/components/Explore.tsx';
import { api, type User } from "../src/api.tsx";
import LoginWindow from './assets/components/LoginWindow.tsx';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState<boolean>(false);

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
    <BrowserRouter>
    <header>
      {user ? (
      <>
      <div>Zalogowano Jako: {user.username}</div>
      <button onClick={logout}>Wyloguj</button>
      </>  
      ): (
      <>
      <button onClick={() => {setShowAuth(true)}}>Zaloguj</button>
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
        <Link to="/">Home</Link>
        <Link to="/explore">Explore</Link>
        <Link to="/canvas">Create</Link>
      </nav>
      
     </section>

     <section className='content'>
      <Routes>
        <Route path="/" element={<CanvasEditor />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/canvas" element={<CanvasEditor />} />
      </Routes>

     </section>
     </section>
    </BrowserRouter>
  )
}

export default App
