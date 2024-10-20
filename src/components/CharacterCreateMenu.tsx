import { useState, useContext } from 'react';
import UserContext from '../data/Context';
import combatFns from '../utils/combatFns';
import classData from '../data/classes.json';
import { useNavigate } from 'react-router-dom';

const { createPlayer, upload } = combatFns;

export default function CharacterCreateMenu() {
    const { user, setCharacter } = useContext(UserContext);
    const navigate = useNavigate();

    const [playerName, setPlayerName] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [stats, setStats] = useState(classData.naturalist.stats.combat);

    const getClass = (c: string) => {
        switch(c) {
            case "naturalist":
                return classData.naturalist;
            case "spiritualist":
                return classData.spiritualist;
            case "technologist":
                return classData.technologist;
        }
    }

    const selectClass = (c: string) => {
        const role = getClass(c);
        console.log(role);
        if(!role) return;
        setStats(() => role?.stats.combat);
        setSelectedClass(() => c);
    }

    const createClass = () => {
        if(!user || !selectedClass.length) return;
        const role = getClass(selectedClass);
        if(!role) return;
        const player = createPlayer(playerName, user.uid, selectedClass, role.stats, [], { map: "-1", XY: [1, 1] }, []);
        setCharacter(player);
        const index = user.characters ? user.characters.length : 0;
        upload('character', { fieldId: '', user, player: { state: player, index } });
        navigate('../town');
    }

    return (
        <div className='character_create character_btn' >
            <h1 className='menu_title' >New Character</h1>
            <div>
                {
                    selectedClass.length
                    ?
                    <div>
                        <p>Attack { stats.attack }</p>
                        <p>Defence { stats.defence }</p>
                        <p>Speed { stats.speed }</p>
                    </div>
                    :
                    <div>

                    </div>
                }
            </div>
            <input 
                className='menu_input'
                type="text"
                placeholder='Player Name..'
                onChange={(e) => setPlayerName(e.target.value)} 
            />
            <div style={{display: "flex", gap: "0.5rem"}}>
                <button
                    className={`menu_btn ${selectedClass === 'naturalist' ? "selected" : ""}`}
                    onClick={() => selectClass('naturalist')}
                >
                    naturalist
                </button>
                <button
                    className={`menu_btn ${selectedClass === 'spiritualist' ? "selected" : ""}`}
                    onClick={() => selectClass("spiritualist")}
                >
                    spiritualist
                </button>
                <button
                    className={`menu_btn ${selectedClass === 'technologist' ? "selected" : ""}`}
                    onClick={() => selectClass("technologist")}
                >
                    technologist
                </button>
            </div>
            <button 
                className='menu_btn'
                onClick={createClass}
            >
                Create Character
            </button>
        </div>
    )
}