import { ref, set, get, child, onValue, remove } from "firebase/database";
import accountFns from "./accountFns";
import PlayerSchema from "../schemas/PlayerSchema";
import PartySchema from "../schemas/PartySchema";

const { db } = accountFns;

export default (() => {
    const getParties = async (
        pid: string,
        name: string,
        setParties: React.Dispatch<React.SetStateAction<PartySchema[]>>,
        setParty: React.Dispatch<React.SetStateAction<PartySchema>>,
        setOtherCharacterBusy: React.Dispatch<React.SetStateAction<boolean>>,
    ) => {
        try {
            const partyRef = ref(db, `/party/`);
            await get(partyRef).then( async (snapshot) => {
                const data = await snapshot.val();
                const parties: PartySchema[] = [];
                for(const p in data) parties.push(data[p]);
                for(const party of parties) {
                    for(const player of party.players) {
                        if(player.pid === pid && player.name === name) { 
                            await connectParty(party.players[0].pid, setParty);
                        } else if(player.pid === pid && player.name !== name) {
                            setOtherCharacterBusy(() => true);
                        }
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
                inCombat: false,
                host: 0,
            }
            await set(partyRef, party);
            await connectParty(party.players[0].pid, setParty);
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
    ): Promise<PartySchema>=> {
        try {
            const partyRef = ref(db, `/party/${partyId}`);
            let party = {} as PartySchema;
            await get(partyRef).then(async (snapshot) => {
                const data = await snapshot.val();
                if(!data) return data;
                party = data;
            });
            await onValue(partyRef, async (snapshot) => {
                const data = await snapshot.val();
                if(!data) return data;
                setParty(() => data);
            });
            return party;
        } catch(e) {
            console.error(e);
            return {} as PartySchema;
        }
    }

    const removePlayer = (players: PlayerSchema[], playerIndex: number) => {
        const firstHalf = players.slice(0, playerIndex);
        const lastHalf = players.slice(playerIndex + 1);
        return firstHalf.concat(lastHalf);
    }

    const leaveParty = async (
        partyId: string,
        player: PlayerSchema,
        setParty: React.Dispatch<React.SetStateAction<PartySchema>>,
    ) => {
        const partyRef = ref(db, `/party/${partyId}`);
        await get(partyRef).then( async (snapshot) => {
            const data = await snapshot.val();
            const players = [...data.players];
            const playerIndex = players.findIndex((e) => e.pid === player.pid);
            const updatedPlayers = removePlayer(players, playerIndex);
            await set(child(partyRef, `/players`), updatedPlayers);
            setParty(() => ({} as PartySchema));
        });
    }

    const destroyRoom = async (
        partyId: string,
        setParty: React.Dispatch<React.SetStateAction<PartySchema>>,
    ) => {
        try {
            const partyRef = ref(db, `/party/${partyId}`);
            await remove(partyRef);
            setParty(() => ({} as PartySchema));
        } catch(e) {
            return console.error(e);
        }
    }

    const uploadParty = async (
        type: string, 
        payload: { 
            partyId: string, 
            location?: { map: string, XY: number[] } ,
            isInCombat?: boolean,
            players?: PlayerSchema[],
            enemyIds?: string[],
        },
    ) => {
        const { partyId, location, isInCombat, players, enemyIds } = payload;

        switch(type) {
            case "players":
                if(!players) return;
                uploadPlayers(partyId, players);
                break;
            case "enemies":
                if(!enemyIds) return;
                uploadEnemies(partyId, enemyIds);
                break;
            case "location":
                if(!location) break;
                uploadLocation(partyId, location);
                break;
            case "inCombat":
                uploadInCombat(partyId, isInCombat ?? false);
                break;
            case "wasInCombat":
                uploadWasInCombat(partyId, isInCombat ?? false);
                break;
        }
    }

    const uploadPlayers = async (partyId: string, players: PlayerSchema[]) => {
        const playersRef = ref(db, `/party/${partyId}/players`);
        await set(playersRef, players);
    }

    const uploadEnemies = async (partyId: string, enemyIds: string[]) => {
        const enemiesRef = ref(db, `/party/${partyId}/enemies`);
        await set(enemiesRef, enemyIds);
    }

    const uploadLocation = async (partyId: string, location: { map: string, XY: number[] }) => {
        const locationRef = ref(db, `/party/${partyId}/location`);
        await set(locationRef, location);
    }

    const uploadInCombat = async (partyId: string, isInCombat: boolean) => {
        const reference = ref(db, `/party/${partyId}/inCombat`);
        await set(reference, isInCombat);
    }

    const uploadWasInCombat = async (partyId: string, isInCombat: boolean) => {
        const reference = ref(db, `/party/${partyId}/wasInCombat`);
        await set(reference, isInCombat);
    }

    const syncPartyMemberToAccount = async (player: PlayerSchema) => {
        const userRef = ref(db, `/users/${player.pid}/characters/`);
        await get(userRef).then(async(snapshot) => {
            const data = snapshot.val();
            if(!data) return console.error("No Characters under this user id");
            for(let i = 0; i < data.length; i++) {
                if(data[i].name === player.name) await set(child(userRef, `/${i}`), player);
            }
        });
    }
    
    return {
        getParties,
        createParty,
        destroyRoom,
        leaveParty,
        joinParty,
        connectParty,
        uploadParty,
        syncPartyMemberToAccount,
    }
})();