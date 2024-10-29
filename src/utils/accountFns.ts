import { initializeApp } from "firebase/app";
import { getDatabase, get, ref, set } from "firebase/database";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import firebaseConfig from '../../firebaseConfig';
import UserSchema from "../schemas/UserSchema";
import PlayerSchema from "../schemas/PlayerSchema";
import StatusSchema from "../schemas/StatusSchema";
import abilityData from '../data/abilities.json';
import classData from '../data/classes.json';


export default (() => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app, firebaseConfig.databaseURL);
    const auth = getAuth();
    
    const createAccountAnon = async (
        setUser: React.Dispatch<React.SetStateAction<UserSchema | undefined>>
    ) => {
        await signInAnonymously(auth).then((acc) => {
            console.log(acc);
        });
        await onAuthStateChanged(auth, async (user) => {
            if(user) {
                const uid = user.uid;
                const reference = ref(db, `users/${uid}`);
                const hasAccount: false | UserSchema = await checkAccountExists(uid);
                if(!hasAccount) {
                    const newUser = {
                        username: "Anon",
                        uid,
                        characters: [],
                    }
                    await set(reference, newUser);
                    setUser((prev) => Object.assign({}, prev, newUser));
                } else {
                    await set(reference, hasAccount);
                    setUser((prev) => Object.assign({}, prev, hasAccount ? {...hasAccount} : {}));
                }
            } else {
                signOut(auth);
            }
        });
    }

    const checkAccountExists = async (userId: string): Promise<UserSchema | false> => {
        const userRef = ref(db, `/users/${userId}`);
        let isUser: false | UserSchema = false;
        await get(userRef).then( async (snapshot) => {
            const data = await snapshot.val();
            if(data) isUser = data;
        });
        return isUser;
    }

    const getCharacters = async (user: UserSchema): Promise<PlayerSchema[] | false> => {
        const charactersRef = ref(db, `/users/${user.uid}/characters`);
        let hasCharacters = false;
        const characters: PlayerSchema[] = [];
        await get(charactersRef).then( async (snapshot) => {
            const data = snapshot.val();
            if(!data) return;
            data?.forEach((character: PlayerSchema) => {
                const convertedCharacter = createPlayer(character.name, character.pid, character.role, character.stats, character.status, character.location, character.inventory, character.abilities, character.order);
                characters.push(convertedCharacter);
                hasCharacters = true;
            });
        });
        
        return hasCharacters ? characters : [];
    }

    const createPlayer = (
        name: string, pid: string, playerClass: string, 
        combatStats: typeof classData.naturalist.stats, 
        status: StatusSchema[], location: { map: string, XY: number[] },
        inventory: { id: string, amount: number }[], abilityRefs: {id: string, level: number}[],
        order: string[],
    ) => {
        const stats = combatStats ? combatStats : classData.naturalist.stats;
        const abilities = abilityRefs ?? assignAbilities(playerClass);
        const player: PlayerSchema = {
            name,
            role: playerClass,
            pid,
            npc: false,
            dead: false,
            isAttacking: 0,
            location: location ?? { map: "-1", XY: [1, 1] },
            inventory: inventory ?? [],
            status: status ?? [],
            order: order ?? [],
            stats,
            abilities,
        }

        return player;
    }

    const assignAbilities = (playerClass: string) => {
        const usableAbilities = [];

        for(const ability of abilityData.all) {
            for(const users of ability.users) {
                const abilityRef = {
                    id: ability.id,
                    level: 0,
                }
                if(users === playerClass) usableAbilities.push(abilityRef);
            }
        }

        return usableAbilities;
    }

    return {
        db,
        createAccountAnon,
        createPlayer,
        getCharacters,
    }
})();