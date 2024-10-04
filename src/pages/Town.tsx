import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import UserContext from "../data/Context";
import partyFns from "../utils/partyFns"
import PlayerSchema from "../schemas/PlayerSchema";
import PartySchema from "../schemas/PartySchema";
import PartyMenu from "../components/PartyMenu";

const { getParties, createParty, joinParty, leaveParty, destroyRoom } = partyFns;

export default function Town() {
    const { character, party, setParty } = useContext(UserContext);

    const [isPartyMenuOpen, setIsPartyMenuOpen] = useState(false);
    const [parties, setParties] = useState<PartySchema[]>([]);

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

    useEffect(() => {
        console.log(party);
        if(!party?.players) {
            console.log("getting party");
            getParties(character.pid, setParties, setParty); 
            setIsPartyMenuOpen(false);
        }
        /*eslint-disable-next-line*/
    }, [party]);
    
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
                >
                    Create Party
                </button>
                <button
                    className="menu_btn"
                    onClick={() => {
                            if(!isPartyMenuOpen) getParties(character.pid, setParties, setParty);
                            setIsPartyMenuOpen(() => !isPartyMenuOpen)
                        }}
                >
                    Join Party
                </button>
            </div>
            :
            <button
                className="menu_btn"
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
            <Link to={'../dungeon'}>Dungeon</Link>
        </div>
    )
}
