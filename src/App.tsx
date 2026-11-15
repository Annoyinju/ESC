

import './App.css'
import  Canvan from './assets/components/Canvas.tsx'

function App() {
  

  return (
    <>
    <header>
      <p>Head</p>
    </header>
    <section className='main'>
     <section className='side'>
      <p>One</p>
      <p>Two</p>
      <p>Three</p>
      <p>Four</p>
     </section>

     <section className='content'>
      
      <p>MAIN</p>
      <Canvan />
     </section>
     </section>
    </>
  )
}

export default App
