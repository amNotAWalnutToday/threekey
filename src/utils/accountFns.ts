import { initializeApp } from "firebase/app";
import { getDatabase, get, ref, set } from "firebase/database";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import firebaseConfig from '../../firebaseConfig';
import UserSchema from "../schemas/UserSchema";
import PlayerSchema from "../schemas/PlayerSchema";

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
        let characters = false;
        await get(charactersRef).then( async (snapshot) => {
            const data = snapshot.val();
            if(data) characters = data;
        });

        return characters;
    }

    return {
        db,
        createAccountAnon,
        getCharacters,
    }
})();