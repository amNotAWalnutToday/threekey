import { Link } from "react-router-dom"
import { useContext } from "react"
import UserContext from "../data/Context"
import testdata from '../data/testdata.json';

export default function Home() {
    const { character, setUser, setCharacter } = useContext(UserContext);
    
    return (
        <div>
            <Link to='/combat'> Fight!</Link>
            <Link to='/create-character'> create</Link>
            <Link to='/map'> map</Link>
            <Link to='/town'> town</Link>
            <Link to='/dungeon'> Dungeon</Link>
            <button 
                onClick={() => {
                    setUser(() => testdata.tsuki);
                    setCharacter(() => testdata.tsuki.characters[0]);
                    console.log(character);
                }}
            >
                Select Tsuki
            </button>
            <button 
                onClick={() => {
                    setUser(() => testdata.werly);
                    setCharacter(() => testdata.werly.characters[0]);
                    console.log(character);
                }}
            >
                Select Werly
            </button>
        </div>
    )
}