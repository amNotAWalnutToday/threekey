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
import Log from "../components/Log";
import UIButtonBar from "../components/UIBtnBar";
import Shop from "./Shop";
import Guild from "./Guild";

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
    const [gameLog, setGameLog] = useState<string[]>([]);

    const logMessage = (message: string) => {
        const updatedGamelog = [...gameLog];
        updatedGamelog.push(message);
        if(updatedGamelog.length > 101) updatedGamelog.shift();
        setGameLog(() => updatedGamelog);
    }

    /**MENU STATE*/
    const [isPartyMenuOpen, setIsPartyMenuOpen] = useState(false);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isInnOpen, setIsInnOpen] = useState(false);
    const [isTreeOpen, setIsTreeOpen] = useState(false);
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isGuildOpen, setIsGuildOpen] = useState(false);
    const [inspectCharacter, setInspectCharacter] = useState({} as PlayerSchema);

    const toggleOffMenus = (exception: string) => {
        if(exception !== "partyMenu") setIsPartyMenuOpen(() => false);
        if(exception !== "inventoryMenu") setIsInventoryOpen(() => false);
        if(exception !== "innMenu") setIsInnOpen(() => false);
        if(exception !== "characterProfileMenu") setInspectCharacter(() => ({} as PlayerSchema));
        if(exception !== "treeMenu") setIsTreeOpen(() => false);
        if(exception !== "shopMenu") setIsShopOpen(() => false);
        if(exception !== "guildMenu") setIsGuildOpen(() => false);
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
        updatedCharacter.stats.combat.shield.cur = 0;
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
        if(!party?.players) return;
        if(Number(party.location.map) > -1) navigate('../dungeon');
        /*eslint-disable-next-line*/
    }, [party.location]);

    useEffect(() => {
        if(!user?.uid) return navigate('/');
        connectTown(setTown);
        if(character.dead && character.stats.combat.health.cur > 0) setCharacter((prev) => ({...prev, dead: false}));
        /*eslint-disable-next-line*/
    }, [])
    
    return (
        <div>
            {party.players
            &&
            <PartyMenu
                toggleCharacterProfile={(player: PlayerSchema) => {
                    setInspectCharacter((prev) => prev.pid ? {} as PlayerSchema : {...player});
                    toggleOffMenus("characterProfileMenu");
                }}
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
                        setIsShopOpen((prev) => !prev);
                        toggleOffMenus("shopMenu");
                    }}
                    disabled={town?.shop?.level < 1}
                >
                    Shop
                </button>
                <button 
                    className="menu_btn" 
                    onClick={() => { 
                        setIsGuildOpen((prev) => !prev);
                        toggleOffMenus("guildMenu");
                    }}
                    disabled={town?.guild?.level < 1}
                >
                    Guild
                </button>
                <button 
                    className="menu_btn" 
                    onClick={() => uploadParty("location", { partyId: party.players[0].pid, location: {...party.location, map: "0"}})}
                    disabled={!party.players}
                >
                    Dungeon
                </button>
            </div>
            <UIButtonBar 
                showInventory={() => {
                    setIsInventoryOpen((prev) => !prev);
                    toggleOffMenus("inventoryMenu");
                }}
                showProfile={() => {
                    setInspectCharacter((prev) => prev.pid ? {} as PlayerSchema : {...character});
                    toggleOffMenus("characterProfileMenu");
                }}
                showTree={() => {
                    setIsTreeOpen((prev) => !prev);
                    toggleOffMenus("treeMenu");
                }}
            />
            <Log 
                messages={gameLog}
            />
            {
                isInnOpen 
                && 
                <Inn 
                    town={town} 
                    applyRest={applyRest}
                    logMessage={logMessage}
                />
            }
            { isInventoryOpen 
            && 
            <Inventory 
                inventory={character.inventory} 
                position="center"
                buttons={["use", "destroy"]}
                limit={10}
                logMessage={logMessage}
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
                logMessage={logMessage}
            />
            }
            { isShopOpen
            &&
            <Shop 
                town={town}
                logMessage={logMessage}
            />
            }
            { isGuildOpen
            &&
            <Guild 
                town={town}
                uploadCharacterTown={uploadCharacterTown}
                logMessage={logMessage}
            />
            }
        </div>
    )
}
