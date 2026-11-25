import { Link} from 'react-router-dom';


export default function About(){
    return (
        <>
        <p>ESC 'Explore Share Create' is a site that allows Viewing, sharing and creating images, all in one place </p><br />

        
        <p><Link to="/">Home</Link> Leads here</p>
        <p><Link to="/explore">Explore</Link> will allow you to see all the shared Images</p>
        <p><Link to="/canvas">Create</Link> (WIP - Highly limited features) currently allows you to create a blank canvas or create it from a chosen image,Brush function, Downloading the canvas in 3 formats (PNG,JPEG,WEBP) and sharing (Non authenticated Users cannot Share their canvases)</p>
        </>
    )
}


