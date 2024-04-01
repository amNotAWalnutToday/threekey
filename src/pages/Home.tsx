import { Link } from "react-router-dom"

export default function Home() {
    return (
        <div>
            <Link to='/combat'> Fight!</Link>
            <Link to='/create-character'> create</Link>
        </div>
    )
}