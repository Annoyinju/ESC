
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css'
import  CanvasEditor from './assets/components/CanvasEditor.tsx'
import Explore from './assets/components/Explore.tsx';

function App() {
  

  return (
    <BrowserRouter>
    <header>
      <p>Head</p>
    </header>
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
