import { useState, useContext } from 'react';
import UserContext from '../data/Context';
import combatFns from '../utils/combatFns';
import accountFns from '../utils/accountFns';
import classData from '../data/classes.json';
import { useNavigate } from 'react-router-dom';

const { createPlayer } = accountFns
const { upload } = combatFns;

export default function CharacterCreateMenu() {
    const { user, setCharacter } = useContext(UserContext);
    const navigate = useNavigate();

    const [playerName, setPlayerName] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedPrimary, setSelectedPrimary] = useState("");
    const [selectedSecondary, setSelectedSecondary] = useState("");
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

    const createClass = async () => {
        if(!user || !selectedClass.length) return;
        if(!selectedPrimary || !selectedSecondary) return;
        const role = getClass(selectedClass);
        if(!role) return;
        const player = createPlayer(playerName, user.uid, selectedClass, role.stats, [], { map: "-1", XY: [1, 1] }, [], [], [selectedPrimary, selectedSecondary]);
        setCharacter(() => player);
        const index = user.characters ? user.characters.length : 0;
        await upload('character', { fieldId: '', user, player: { state: player, index } });
        navigate('../town');
    }

    return (
        <div className='character_create character_btn' >
            <h1 className='menu_title' >New Character</h1>
            <div>
                <h3>Stats</h3>
                {
                    selectedClass.length
                    ?
                    <div style={{display: "flex", alignItems: "center", gap: "2rem"}} >
                        <div>
                            <p>Attack { stats.attack }</p>
                            <p>Defence { stats.defence }</p>
                            <p>Speed { stats.speed }</p>
                        </div>
                        <div className={`${selectedClass} front player`} ></div>
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
            <hr />
            <h3>Select Class</h3>
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
            <hr />
            <h3>*left click for primary skillset | *right click for secondary skillset</h3>
            {selectedClass === "naturalist" 
            && 
            <div style={{display: "flex", gap: "0.5rem"}}>
                <button
                    className={`menu_btn ${selectedPrimary === 'plants' ? "selected" : ""} ${selectedSecondary === 'plants' ? "selected_secondary" : ""}`}
                    onClick={() => {
                        if(selectedSecondary === "plants") setSelectedSecondary("");
                        setSelectedPrimary('plants')
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if(selectedPrimary === "plants") setSelectedPrimary("");
                        setSelectedSecondary("plants");
                    }}
                >
                    Plants
                </button>
                <button
                    className={`menu_btn ${selectedPrimary === 'insects' ? "selected" : ""} ${selectedSecondary === 'insects' ? "selected_secondary" : ""}`}
                    onClick={() => {
                        if(selectedSecondary === "insects") setSelectedSecondary("");
                        setSelectedPrimary('insects')
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if(selectedPrimary === "insects") setSelectedPrimary("");
                        setSelectedSecondary("insects");
                    }}
                >
                    Insects
                </button>
                <button
                    className={`menu_btn ${selectedPrimary === 'weather' ? "selected" : ""} ${selectedSecondary === 'weather' ? "selected_secondary" : ""}`}
                    onClick={() => {
                        if(selectedSecondary === "weather") setSelectedSecondary("");
                        setSelectedPrimary('weather')
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if(selectedPrimary === "weather") setSelectedPrimary("");
                        setSelectedSecondary("weather");
                    }}
                >
                    Weather
                </button>
            </div>}
            {selectedClass === "technologist" 
            && 
            <div style={{display: "flex", gap: "0.5rem"}}>
                <button
                    className={`menu_btn ${selectedPrimary === 'overheat' ? "selected" : ""} ${selectedSecondary === 'overheat' ? "selected_secondary" : ""}`}
                    onClick={() => { 
                        if(selectedSecondary === "overheat") setSelectedSecondary("");
                        setSelectedPrimary('overheat')
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if(selectedPrimary === "overheat") setSelectedPrimary("");
                        setSelectedSecondary("overheat");
                    }}
                >
                    Overheat
                </button>
                <button
                    className={`menu_btn ${selectedPrimary === 'overload' ? "selected" : ""} ${selectedSecondary === 'overload' ? "selected_secondary" : ""}`}
                    onClick={() => {
                        if(selectedSecondary === "overload") setSelectedSecondary("");
                        setSelectedPrimary('overload')
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if(selectedPrimary === "overload") setSelectedPrimary("");
                        setSelectedSecondary("overload");
                    }}
                >
                    Overload
                </button>
                <button
                    className={`menu_btn ${selectedPrimary === 'shield' ? "selected" : ""} ${selectedSecondary === 'shield' ? "selected_secondary" : ""}`}
                    onClick={() => {
                        if(selectedSecondary === "shield") setSelectedSecondary("");
                        setSelectedPrimary('shield')
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if(selectedPrimary === "shield") setSelectedPrimary("");
                        setSelectedSecondary("shield");
                    }}
                >
                    Shield
                </button>
            </div>}
            <hr />
            <button 
                className='menu_btn'
                onClick={createClass}
            >
                Create Character
            </button>
        </div>
    )
}