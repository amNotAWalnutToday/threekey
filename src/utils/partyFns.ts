import { ref, set, get, child } from "firebase/database";
import accountFns from "./accountFns";
import PlayerSchema from "../schemas/PlayerSchema";

const { db } = accountFns;

export default (() => {
    const getParties = async (
        pid: string,
        setParties: React.Dispatch<React.SetStateAction<PlayerSchema[][]>>,
        setParty: React.Dispatch<React.SetStateAction<PlayerSchema[]>>,
    ) => {
        try {
            const partyRef = ref(db, `/party/`);
            await get(partyRef).then( async (snapshot) => {
                const data = await snapshot.val();
                const parties: PlayerSchema[][] = [];
                for(const p in data) parties.push(data[p]);
                for(const party of parties) {
                    for(const player of party) {
                        if(player.pid === pid) setParty(party);
                        console.log(party);
                    }
                }
                setParties(parties);
            });
        } catch(e) {
            console.error(e);
        }
    }

    const createParty = async (
        player: PlayerSchema,
        setParty: React.Dispatch<React.SetStateAction<PlayerSchema[]>>,
    ) => {
        try {
            const partyRef = ref(db, `/party/${player.pid}`);
            await set(partyRef, [player]);
            setParty(() => [player]);
        } catch(e) {
            console.error(e);
        }
    }

    const joinParty = async (
        player: PlayerSchema, 
        partyId: string,
        setParty: React.Dispatch<React.SetStateAction<PlayerSchema[]>>,
    ) => {
        try {
            const partyRef = ref(db);
            await get(child(partyRef, `party/${partyId}`)).then(async(snapshot) => {
                const data = await snapshot.val();
                for(const otherPlayers of data) {
                    if(otherPlayers.pid === player.pid) return; 
                }
                const updatedPlayers = [...data, player];
                await set(child(partyRef, `party/${partyId}`), updatedPlayers);
                setParty(updatedPlayers);
            });
        } catch(e) {
            console.error(e);
        }
    }
    
    return {
        getParties,
        createParty,
        joinParty,
    }
})();