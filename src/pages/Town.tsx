import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import UserContext from "../data/Context";
import partyFns from "../utils/partyFns"
import PlayerSchema from "../schemas/PlayerSchema";
import PartySchema from "../schemas/PartySchema";

const { getParties, createParty, joinParty } = partyFns;

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
            <button
                onClick={() => createParty(character, setParty)}
            >
                Create Party
            </button>
            {!party.players ? 
            <button
                onClick={() => {
                    if(!isPartyMenuOpen) getParties(character.pid, setParties, setParty);
                    setIsPartyMenuOpen(() => !isPartyMenuOpen)
                }}
            >
                Join Party
            </button>
            :
            <button>
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
