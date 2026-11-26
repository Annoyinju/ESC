import { useRef, useState, useEffect } from "react";
import { Eraser } from "lucide-react";
import { api } from "../../api";

interface Point{ 
     x: number;
     y: number 
};

interface Format{ 
     label: string;
     mime: string;
      ext: string 
};

interface CanvasEditorProps {
    loggedIn: boolean;
    onLoginRequire: () => void;
    canShare: boolean
}

interface CanvasProps{
     width: number;
     height: number;
     color: string;
     canvasRef:React.RefObject<HTMLCanvasElement | null>; 
     zoom: number;
     isErasing: boolean;
     lineWidth: number;
     
};

interface CanvasWrapProps extends Omit<CanvasProps, "isErasing" | "color" | "lineWidth">,CanvasEditorProps{
     wrapperRef: React.Ref<HTMLElement>;
     onResize: (w: number, h: number) => void;

}

interface SetupProps extends Pick<CanvasWrapProps,"height" | "width" >{
     setHeight: (n: number) => void;
     setWidth: (n: number) => void;
     onSubmit: () => void;
     onCancel: () => void;
}

interface ResizeProps extends Pick<CanvasWrapProps,"height" | "width" >{
     onResize: (w: number, h: number) => void;
}

interface ShareProps extends Pick<CanvasWrapProps, "canvasRef" | "loggedIn" | "onLoginRequire" | "canShare">{

}

const FORMATS: Format[] = [
    { label: "PNG",  mime: "image/png",  ext: "png" },
    { label: "JPEG", mime: "image/jpeg", ext: "jpg" },
    { label: "WebP", mime: "image/webp", ext: "webp" },
];

const MAX_UPLOAD = 10 * 1024 * 1024;


function ShareMenu({ canvasRef, loggedIn, canShare, onLoginRequire }: ShareProps) {
    const [open, setOpen] = useState<boolean>(false);
    const [title, setTitle] = useState<string>("");
    const [desc, setDesc] = useState<string>("");
    const [busy, setBusy] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const toggle = () => {
        if (!loggedIn) { onLoginRequire(); return; }
        if (!canShare) { alert("Your account can't share yet."); return; }
        setMessage("");
        setOpen((o) => !o);
    };

    const share = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // White background so transparent areas don't look black in the gallery
        const out = document.createElement("canvas");
        out.width = canvas.width;
        out.height = canvas.height;
        const ctx = out.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(canvas, 0, 0);

        setBusy(true);
        setMessage("");

        out.toBlob(async (blob) => {
            try {
                if (!blob) { setMessage("Could not export the canvas."); return; }
                if (blob.size > MAX_UPLOAD) { setMessage("Image is over 10 MB. Resize it first."); return; }

                const form = new FormData();
                form.append("image", blob, "drawing.png");
                form.append("isPublic", "true");
                if (title.trim()) form.append("title", title.trim());
                if (desc.trim()) form.append("desc", desc.trim());

                const res = await api("/drawings", { method: "POST", body: form });

                if (res.status === 401) { setOpen(false); onLoginRequire(); return; }
                if (res.status === 403) { setMessage("Your account isn't allowed to share."); return; }
                if (!res.ok) { setMessage("Sharing failed. Try again."); return; }

                setMessage("Shared! It now appears in Explore.");
                setTitle("");
                setDesc("");
            } catch {
                setMessage("Could not reach the server.");
            } finally {
                setBusy(false);
            }
        }, "image/png");
    };

    return (
        <div ref={menuRef} className="shareMenu">
            <button onClick={toggle} title={loggedIn ? "" : "Log in to share"}>Share ▾</button>

            {open && (
                <div className="resizePanel">
                    <label htmlFor="shareTitle">Title</label>
                    <input id="shareTitle" type="text" maxLength={100} value={title}
                        onChange={(e) => setTitle(e.target.value)} placeholder="optional" />

                    <label htmlFor="shareDesc">Description</label>
                    <input id="shareDesc" type="text" maxLength={500} value={desc}
                        onChange={(e) => setDesc(e.target.value)} placeholder="optional" />

                    <span style={{ gridColumn: "1 / -1", fontSize: 12 }}>
                        This will be visible to everyone.
                    </span>

                    <button onClick={share} disabled={busy}>
                        {busy ? "Sharing..." : "Share publicly"}
                    </button>

                    {message && <span style={{ gridColumn: "1 / -1" }}>{message}</span>}
                </div>
            )}
        </div>
    );
}

function DownloadMenu({canvasRef}: Pick<CanvasProps, "canvasRef">) {
    const [open, setOpen] = useState<boolean>(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (e: PointerEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const download = (format: Format) => {
        const canvas = canvasRef!.current;
        if (!canvas) return;

        const out = document.createElement("canvas");
        out.width = canvas.width;
        out.height = canvas.height;
        const ctx = out.getContext("2d");
        if (!ctx) return;

        if (format.mime === "image/jpeg") {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, out.width, out.height);
        }
        ctx.drawImage(canvas, 0, 0);

        out.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `drawing.${format.ext}`;
            a.click();
            URL.revokeObjectURL(url);
        }, format.mime, 0.92);

        setOpen(false);
    };

    return (
        <div ref={menuRef} className="downloadMenu">
            <button onClick={() => setOpen((o) => !o)}>Download ▾</button>

            {open && (
                <div className="downloadList">
                    {FORMATS.map((f) => (
                        <button key={f.ext} onClick={() => download(f)}>
                            {f.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ResizeMenu({ width, height, onResize}: ResizeProps) {
    const [open, setOpen] = useState<boolean>(false)
    const [w, setW] = useState<string>(String(width));
    const [h, setH] = useState<string>(String(height));
    const menuRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        if (!open) return;

        const onPointerDown = (e: PointerEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const toggle = () => {
        if (!open) {
            // Start each time from the current size
            setW(String(width));
            setH(String(height));
        }
        setOpen((o) => !o);
    };

    const nw = Number(w);
    const nh = Number(h);
    const valid =
        Number.isInteger(nw) && Number.isInteger(nh) &&
        nw >= 1 && nw <= 4096 && nh >= 1 && nh <= 4096;

    const apply = () => {
        if (!valid) return;
        onResize(nw, nh);
        setOpen(false);
    };

    return (
        <div ref={menuRef} className="resizeMenu">
            <button onClick={toggle}>Resize ▾</button>

            {open && (
                <div className="resizePanel">
                    <label htmlFor="resW">Width</label>
                    <input id="resW" type="number" value={w} min="1" max="4096"
                        onChange={(e) => setW(e.target.value)} />

                    <label htmlFor="resH">Height</label>
                    <input id="resH" type="number" value={h} min="1" max="4096"
                        onChange={(e) => setH(e.target.value)} />

                    <button onClick={apply} disabled={!valid}>Apply</button>
                </div>
            )}
        </div>
    );
}

function Canvas({width, height, color, canvasRef, zoom, isErasing, lineWidth }: CanvasProps ){
    const isDrawing = useRef<boolean>(false);
    
    const lastPos = useRef<Point>({ x: 0, y: 0 });
    

    // Convert mouse position on the page to a position on the canvas
    const getPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        isDrawing.current = true;
        lastPos.current = getPos(e);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current) return;

        const ctx = e.currentTarget.getContext('2d');
        if (!ctx) return;


        const pos = getPos(e);


        ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
        ctx.strokeStyle = color!;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        lastPos.current = pos;
    };

    

    const stopDrawing = () => {
        isDrawing.current = false;
    };












    return (
       <canvas ref={canvasRef} width={width} height={height} style={{width: width * zoom!, height: height * zoom!}} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing}  />
    )
}
    
function CanvasWrapper({width, height, zoom, canvasRef, wrapperRef, loggedIn, canShare, onLoginRequire, onResize }: CanvasWrapProps){
        const  [isErasing, setIsErasing]= useState<boolean>(false);
        const [color, setColor] = useState<string>("#000000")
        const [lineWidth, setLineWidth] = useState<number>(3)

            

        

        return (
            <section id="editorWrapper">
                <section id="canvasOptions">
                    <input type="number" name="LineWidth" id="LineWidth" onChange={(e) => {setLineWidth(e.target.valueAsNumber)}} />
                    <label htmlFor="LineWidth">px.</label>
                    <button onClick={() => setIsErasing(!isErasing)}> <Eraser /></button>
                    <input type="color" value={color} onChange={(e) => {setColor(e.target.value)}} />
                    <ResizeMenu width={width} height={height} onResize={onResize} />
                    <DownloadMenu canvasRef={canvasRef}/>
                    <ShareMenu canvasRef={canvasRef} loggedIn={loggedIn} canShare={canShare} onLoginRequire={onLoginRequire} />
                </section>

                <section id="canvasWrapper" ref={wrapperRef}>
                    <Canvas width={width} height={height} color={color} canvasRef={canvasRef} zoom={zoom} isErasing={isErasing} lineWidth={lineWidth} />
                </section>
            </section>
        )
}

function SetupWindow({height, width, onSubmit, setHeight, setWidth, onCancel}: SetupProps) {
    
       
        return (
            <div className="popupBackdrop">
            <section className="popup" role="dialog">
                <header className="popupTitleBar">
                    <span>Set Dimensions</span>
                    <button className="popupClose" onClick={onCancel} aria-label="Close">✕</button>
                </header>

               


                <div className="popupBody">

                     
                    <label htmlFor="inHeight">Height: </label>
                    <input type="number" name="inHeight" value={height}
                    onChange={(e) => {setHeight!(e.target.valueAsNumber <= Number(e.target.max) || Number.isNaN(e.target.valueAsNumber) ? e.target.valueAsNumber : Number(e.target.max))}}
                    id="inHeight" min="1" max="4096"/><br />
                    

                    
                    <label htmlFor="inWidth"> Width: </label>
                <input type="number" name="inWidth" value={width}
                 onChange={(e) => {setWidth!((e.target.valueAsNumber <= Number(e.target.max) || Number.isNaN(e.target.valueAsNumber)) ? e.target.valueAsNumber : Number(e.target.max))}} 
                 id="inWidth" min="1" max="4096"/><br />

                    
                                        
                </div>
                

               

                <footer className="popupFooter">
                    
                    <button onClick={onSubmit}>Set</button>
                </footer>
            </section>
        </div>
            // <section className="popup">
                

               
                
                
                 
            // </section>
        )
}

export default function CanvasEditor({loggedIn, canShare, onLoginRequire}: CanvasEditorProps){
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapperRef = useRef<HTMLElement>(null)
    const [width, setWidth] = useState<number>(1)
    const [height, setHeight] = useState<number>(1)
    const [popstate, setPopstate] = useState<boolean>(false)
    const [dimension, setDimension] = useState<boolean>(false)
    const [zoom, setZoom] = useState<number>(1);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loadedImage, setLoadedImage] = useState<CanvasImageSource | null>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            setWidth(img.naturalWidth);
            setHeight(img.naturalHeight);
            setLoadedImage(img);
            setPopstate(false);
            setDimension(true);
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            alert("Could not open this file.");
        };

        img.src = url;
        e.target.value = ""; // lets the user pick the same file again later
    };

    const resizeCanvas = (w: number, h: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const snapshot = document.createElement("canvas");
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext("2d")?.drawImage(canvas, 0, 0);

    setWidth(w);
    setHeight(h);
    setLoadedImage(snapshot); 
};

    
    useEffect(() => {
    if (!dimension || !loadedImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);
    }

    setLoadedImage(null);
}, [dimension, loadedImage]);






    

    
    useEffect(() => {
        if (!dimension) return;
        const el = wrapperRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            setZoom((z) => z*(zoom * e.deltaY < 0 ? 1.20 : .80))
                
        };

        el.addEventListener('wheel', onWheel, { passive: false });
         return () => el.removeEventListener('wheel', onWheel);
    }, [dimension]);
        

   




    
    

    return (
        <>

            <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFile}
            style={{ display: "none" }}
            />


            

            
            {popstate ? <SetupWindow height={height} width={width} onSubmit={() => {setDimension(true); setPopstate(false)}} setHeight={setHeight} setWidth={setWidth} onCancel={() => {setPopstate(false)}}/> :
             dimension ? <CanvasWrapper width={width} height={height} zoom={zoom} canvasRef={canvasRef} wrapperRef={wrapperRef} onResize={resizeCanvas} loggedIn={loggedIn} canShare={canShare} onLoginRequire={onLoginRequire} /> :
              <><button onClick={() => setPopstate(true)}>Create</button>
            <button onClick={() => fileInputRef.current?.click()}>Open...</button> </> }
            

           

        
        </>
    );
}
