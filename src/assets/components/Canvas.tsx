import { useRef, useState } from "react";

function Can({ref}: {ref: React.Ref<HTMLCanvasElement>}){
 return <canvas ref={ref} />
}

export default function CanvasEditor(){
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [width, setWidth] = useState<number>(1)
    const [height, setHeight] = useState<number>(1)

    function setDimensions(){
        canvasRef.current!.style.height = height + "px"
        canvasRef.current!.style.width = width + "px"

    }

    return (
        <>
        
            <label htmlFor="inHeight">Wysokość: </label>
            <input type="number" name="inHeight" value={height} onChange={(e) => {setHeight(e.target.valueAsNumber)}} min="1" max="4096"/>
            <label htmlFor="inWidth"> Szerokość: </label>
            <input type="number" name="inWidth" value={width} onChange={(e) => {setWidth(e.target.valueAsNumber)}} min="1" max="4096"/>
            <br />
            <button onClick={setDimensions}>Submit</button>
            
            <br />
            <Can ref={canvasRef} />

        
        </>
    );
}