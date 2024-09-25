import { useState, useContext } from 'react';
import classes from '../data/classes.json';
import abilities from '../data/abilities.json';
import UserContext from '../data/Context';

export default function CharacterCreate() {
    const { user, setUser } = useContext(UserContext);

    const [playerName, setPlayerName] = useState("");
    const [selectedClass, setSelectedClass] = useState("");

    const assignAbilities = (playerClass: string) => {
        const usableAbilities = [];

        for(const ability of abilities.all) {
            for(const users of ability.users) {
                if(users === playerClass) usableAbilities.push(ability);
            }
        }

        return usableAbilities;
    }

    const createClass = () => {
        const { stats } = {...classes.naturalist};
        const abilities = assignAbilities("naturalist");
        const player = {
            username: playerName,
            pid: "1",
            npc: false,
            dead: false,
            isAttacking: 0,
            status: [],
            stats,
            abilities,
        }
        setUser(() => player);
        console.log(user);
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
