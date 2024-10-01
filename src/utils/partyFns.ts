import { ref, set, get, child, onValue } from "firebase/database";
import accountFns from "./accountFns";
import PlayerSchema from "../schemas/PlayerSchema";
import PartySchema from "../schemas/PartySchema";

const { db } = accountFns;

export default (() => {
    const getParties = async (
        pid: string,
        setParties: React.Dispatch<React.SetStateAction<PartySchema[]>>,
        setParty: React.Dispatch<React.SetStateAction<PartySchema>>,
    ) => {
        try {
            const partyRef = ref(db, `/party/`);
            await get(partyRef).then( async (snapshot) => {
                const data = await snapshot.val();
                const parties: PartySchema[] = [];
                for(const p in data) parties.push(data[p]);
                for(const party of parties) {
                    for(const player of party.players) {
                        if(player.pid === pid) setParty(party);
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
        setParty: React.Dispatch<React.SetStateAction<PartySchema>>,
    ) => {
        try {
            const partyRef = ref(db, `/party/${player.pid}`);
            const party = {
                players: [player],
                location: player.location,
                grouped: true,
                host: 0,
            }
            await set(partyRef, party);
            setParty(() => party);
        } catch(e) {
            console.error(e);
        }
    }

    const joinParty = async (
        player: PlayerSchema, 
        partyId: string,
        setParty: React.Dispatch<React.SetStateAction<PartySchema>>,
    ) => {
        try {
            const partyRef = ref(db);
            await get(child(partyRef, `party/${partyId}`)).then(async(snapshot) => {
                const data: PartySchema = await snapshot.val();
                for(const otherPlayers of data.players) {
                    if(otherPlayers.pid === player.pid) return; 
                }
                const updatedParty = {...data, players: [...data.players, player]};
                await set(child(partyRef, `party/${partyId}`), updatedParty);
                setParty(updatedParty);
            });
        } catch(e) {
            console.error(e);
        }
    }

    const connectParty = async (
        partyId: string,
        setParty: React.Dispatch<React.SetStateAction<PartySchema>>,
    ) => {
        try {
            const partyRef = ref(db, `/party/${partyId}`);
            await onValue(partyRef, async (snapshot) => {
                const data = await snapshot.val();
                if(!data) return;
                setParty(() => data);
            });
        } catch(e) {
            console.error(e);
        }
    }

    const uploadParty = async (
        type: string, 
        payload: { 
            partyId: string, 
            location: { map: string, XY: number[] } 
        },
    ) => {
        const { partyId, location } = payload;

        switch(type) {
            case "location":
                uploadLocation(partyId, location);
                break;
        }
    }

    const uploadLocation = async (partyId: string, location: { map: string, XY: number[] }) => {
        const locationRef = ref(db, `/party/${partyId}/location`);
        await set(locationRef, location);
    }
    
    return {
        getParties,
        createParty,
        joinParty,
        connectParty,
        uploadParty,
    }
})();