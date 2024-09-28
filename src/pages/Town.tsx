import { useContext, useEffect, useState } from "react";
import UserContext from "../data/Context";
import partyFns from "../utils/partyFns"
import PlayerSchema from "../schemas/PlayerSchema";

const { getParties, createParty, joinParty } = partyFns;

export default function Town() {
    const { character, party, setParty } = useContext(UserContext);

    const [isPartyMenuOpen, setIsPartyMenuOpen] = useState(false);
    const [parties, setParties] = useState<PlayerSchema[][]>([]);

    const mapParties = () => {
        return parties.map((party, index) => {
            return party.length ? (
                <div
                    key={`party-${index}`}
                    onClick={() => {
                        joinParty(character, party[0].pid, setParty);
                    }}
                >
                    <p>{ party[0].name }</p>
                </div>
            ) : null 
        });
    }

    useEffect(() => {
        if(!party.length) {
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
            {!party.length ? 
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
        </div>
    )
}
