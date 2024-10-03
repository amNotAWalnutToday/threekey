import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import combatFns from '../utils/combatFns';
import accountFns from '../utils/accountFns';
import classData from '../data/classes.json';
import UserContext from '../data/Context';
import PlayerSchema from '../schemas/PlayerSchema';

const { createPlayer, upload } = combatFns;
const { getCharacters } = accountFns;

export default function CharacterSelect() {
    const { user, setUser, setCharacter } = useContext(UserContext);
    const navigate = useNavigate();

    const [characters, setCharacters] = useState<PlayerSchema[]>([]);
    const [playerName, setPlayerName] = useState("");
    const [selectedClass, setSelectedClass] = useState("");

    const createClass = () => {
        if(!user) return;
        const player = createPlayer(playerName, user.uid, 'naturalist', classData.naturalist.stats, [], { map: "-1", XY: [1, 1] }, []);
        setCharacter(player);
        const index = user.characters ? user.characters.length : 0;
        upload('character', { fieldId: '', user, player: { state: player, index } });
        assignCharacters();
    }

    const assignCharacters = async () => {
        if(!user) return;
        const characters = await getCharacters(user);
        if(!characters) return;
        setCharacters(() => {
            return characters;
        });
    }

    const mapCharacters = () => {
        return characters.map((character, index) => {
            return (
                <div
                    key={`character-${index}`}
                    onClick={() => {
                        setCharacter(character);
                        navigate('../town');
                    }}
                >
                    <p>{character.name}</p>
                </div>
            )
        });
    }

    useEffect(() => {
        assignCharacters();
    }, []);

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
            { mapCharacters() }
            <button
                onClick={() => navigate('../town')}
            >
                Skip to town
            </button>
        </div>
    )
}
