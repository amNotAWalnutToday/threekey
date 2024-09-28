import { createContext } from 'react';
import PlayerSchema from '../schemas/PlayerSchema';

interface UserContextInterface {
    user: any,
    setUser: any,
    character: any,
    setCharacter: any,
    party: PlayerSchema[],
    setParty: React.Dispatch<React.SetStateAction<PlayerSchema[]>>,
}

const UserContext = createContext({} as UserContextInterface);

export default UserContext;
