import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../data/Context";
import partyFns from "../utils/partyFns"
import townFns from "../utils/townFns";
import combatFns from "../utils/combatFns";
import PlayerSchema from "../schemas/PlayerSchema";
import PartySchema from "../schemas/PartySchema";
import PartyMenu from "../components/PartyMenu";
import Inventory from "../components/Inventory";
import TownSchema from "../schemas/TownSchema";
import Inn from "./Inn";
import Tree from "../components/Tree";
import CharacterProfile from "../components/CharacterProfile";

const { 
    getParties, createParty, joinParty, leaveParty, destroyRoom, uploadParty,
    syncPartyMemberToAccount,
} = partyFns;
const { connectTown } = townFns;
const { assignHeal, assignResource, getPlayer } = combatFns;

export default function Town() {
    const { user, character, setCharacter, party, setParty } = useContext(UserContext);
    const navigate = useNavigate();

    const [town, setTown] = useState<TownSchema>({} as TownSchema);
    const [otherCharacterBusy, setOtherCharacterBusy] = useState(false);
    const [parties, setParties] = useState<PartySchema[]>([]);

    // menu state
    const [isPartyMenuOpen, setIsPartyMenuOpen] = useState(false);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isInnOpen, setIsInnOpen] = useState(false);
    const [isTreeOpen, setIsTreeOpen] = useState(false);
    const [inspectCharacter, setInspectCharacter] = useState({} as PlayerSchema);


    const toggleOffMenus = (exception: string) => {
        if(exception !== "partyMenu") setIsPartyMenuOpen(() => false);
        if(exception !== "inventoryMenu") setIsInventoryOpen(() => false);
        if(exception !== "innMenu") setIsInnOpen(() => false);
        if(exception !== "characterProfileMenu") setInspectCharacter(() => ({} as PlayerSchema));
        if(exception !== "treeMenu") setIsTreeOpen(() => false);
    }

    const mapParties = () => {
        return parties.map((party, index) => {
            return party.players.length ? (
                <div
                    key={`party-${index}`}
                    onClick={() => {
                        joinParty(character, party.players[0].pid, setParty);
                    }}
                >
                    <p>{ party.players[0].name }</p>
                </div>
            ) : null 
        });
    }

    const uploadCharacterTown = (updatedCharacter: PlayerSchema) => {
        if(party.players) {
            const playerIndex = getPlayer(party.players, character.pid).index;
            const updatedParty = [...party.players];
            updatedParty[playerIndex] = updatedCharacter;
            uploadParty('players', { partyId: party.players[0].pid, players: updatedParty });
        } 
        syncPartyMemberToAccount(updatedCharacter);
        setCharacter(() => updatedCharacter);
    }

    const applyRest = () => {
        let updatedCharacter = assignHeal(character, character.stats.combat.health.max, true);
        if(town.inn.level >= 2) updatedCharacter = assignResource(updatedCharacter, character.stats.combat.resources.mana.max);
        if(town.inn.level >= 3) updatedCharacter.status = [];
        uploadCharacterTown(updatedCharacter);
    }

    useEffect(() => {
        if(!party?.players) {
            console.log("getting party");
            getParties(character.pid, character.name, setParties, setParty, setOtherCharacterBusy); 
            setIsPartyMenuOpen(false);
        }
        /*eslint-disable-next-line*/
    }, [party]);

    useEffect(() => {
        if(!user?.uid) return navigate('/');
        connectTown(setTown);
        /*eslint-disable-next-line*/
    }, [])
    
    return (
        <div>
            {party.players
            &&
            <PartyMenu
            
            />
            }
            {!party.players ? 
            <div>
                <button
                    className="menu_btn"
                    onClick={() => createParty(character, setParty)}
                    disabled={otherCharacterBusy}
                >
                    Create Party
                </button>
                <button
                    className="menu_btn"
                    disabled={otherCharacterBusy}
                    onClick={() => {
                        if(!isPartyMenuOpen) getParties(character.pid, character.name, setParties, setParty, setOtherCharacterBusy);
                        setIsPartyMenuOpen(() => !isPartyMenuOpen)
                    }}
                >
                    Join Party
                </button>
            </div>
            :
            <button
                className="menu_btn"
                disabled={otherCharacterBusy}
                onClick={() => { 
                    const isHost = party.players[0].pid === character.pid
                    if(isHost) return destroyRoom(party.players[0].pid, setParty);
                    else return leaveParty(party.players[0].pid, character, setParty);
                }}
            >
                Leave Party
            </button>
            }
            <div>
                { isPartyMenuOpen ? mapParties() : null }
            </div>
            <div>
                <button 
                    className="menu_btn"
                    onClick={() => { 
                        setIsInventoryOpen((prev) => !prev);
                        toggleOffMenus("inventoryMenu");
                    }}
                >
                    Inventory
                </button>
                <button 
                    className="menu_btn" 
                    onClick={() => { 
                        setIsInnOpen((prev) => !prev);
                        toggleOffMenus("innMenu");
                    }}
                    disabled={town?.inn?.level < 1}
                >
                    Inn
                </button>
                <button 
                    className="menu_btn" 
                    onClick={() => { 
                        setInspectCharacter((prev) => prev.pid ? {} as PlayerSchema : {...character});
                        toggleOffMenus("characterProfileMenu");
                    }}
                >
                    Profile
                </button>
                <button 
                    className="menu_btn" 
                    onClick={() => { 
                        setIsTreeOpen((prev) => !prev);
                        toggleOffMenus("treeMenu");
                    }}
                >
                    Skills
                </button>
                <button 
                    className="menu_btn" 
                    onClick={() => navigate('../dungeon')}
                    disabled={!party.players}
                >
                    Dungeon
                </button>
            </div>
            {
                isInnOpen 
                && 
                <Inn 
                    town={town} 
                    applyRest={applyRest}
                />
            }
            { isInventoryOpen 
            && 
            <Inventory 
                inventory={character.inventory} 
                position="center"
                buttons={["use", "destroy"]}
            /> 
            }
            { inspectCharacter.pid
            &&
            <CharacterProfile
                character={inspectCharacter}
            />
            }
            { isTreeOpen
            &&
            <Tree 
                town={town}
                uploadCharacter={uploadCharacterTown}
            />
            }
            <button
                onClick={() => {
                    const updatedCharacter = {...character};
                    updatedCharacter.stats.combat.resources.mana.cur = 100;
                    uploadCharacterTown(updatedCharacter);
                }}
            >manad down</button>
        </div>
    )
}
