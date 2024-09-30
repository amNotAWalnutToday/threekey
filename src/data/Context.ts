import { createContext } from 'react';
import PlayerSchema from '../schemas/PlayerSchema';
import UserSchema from '../schemas/UserSchema';

interface UserContextInterface {
    user: UserSchema | undefined,
    setUser: React.Dispatch<React.SetStateAction<UserSchema | undefined>>,
    character: PlayerSchema,
    setCharacter: React.Dispatch<React.SetStateAction<PlayerSchema>>,
    party: PlayerSchema[],
    setParty: React.Dispatch<React.SetStateAction<PlayerSchema[]>>,
    enemies: any,
    setEnemies: any,
}

const UserContext = createContext({} as UserContextInterface);

export default UserContext;
