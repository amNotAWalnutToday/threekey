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
    const [isPartyMenuOpen, setIsPartyMenuOpen] = useState(false);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isInnOpen, setIsInnOpen] = useState(false);
    const [otherCharacterBusy, setOtherCharacterBusy] = useState(false);
    const [parties, setParties] = useState<PartySchema[]>([]);

    const toggleOffMenus = (exception: string) => {
        if(exception !== "partyMenu") setIsPartyMenuOpen(() => false);
        if(exception !== "inventoryMenu") setIsInventoryOpen(() => false);
        if(exception !== "innMenu") setIsInnOpen(() => false);
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

    const applyRest = () => {
        let updatedCharacter = assignHeal(character, character.stats.combat.health.max, true);
        updatedCharacter = assignResource(updatedCharacter, character.stats.combat.resources.mana.max);
        updatedCharacter.status = [];
        if(party.players) {
            const playerIndex = getPlayer(party.players, character.pid).index;
            const updatedParty = [...party.players];
            updatedParty[playerIndex] = updatedCharacter;
            uploadParty('players', { partyId: party.players[0].pid, players: updatedParty });
        } 
        syncPartyMemberToAccount(updatedCharacter);
        setCharacter(() => updatedCharacter);
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
                >
                    Inn
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
        </div>
    )
}
