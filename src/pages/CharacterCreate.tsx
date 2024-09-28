import { useState, useContext } from 'react';
import combatFns from '../utils/combatFns';
import UserContext from '../data/Context';

const { createPlayer } = combatFns;

export default function CharacterCreate() {
    const { user, setUser, setCharacter } = useContext(UserContext);

    const [playerName, setPlayerName] = useState("");
    const [selectedClass, setSelectedClass] = useState("");

    const createClass = () => {
        const player = createPlayer(playerName, user.uid, 'naturalist');
        setCharacter(player);
    }

    return (
        <div>
            <p>{selectedClass}</p>
            <button onClick={() => setSelectedClass(() => "N")}>N</button>
            <button onClick={() => setSelectedClass(() => "S")}>S</button>
            <button onClick={() => setSelectedClass(() => "T")}>T</button>
            <input type="text" onChange={(e) => setPlayerName(e.target.value)} />
            <button 
                className='btn'
                onClick={createClass}
            >
                Create
            </button>
        </div>
    )
}
