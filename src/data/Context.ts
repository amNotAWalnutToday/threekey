import { createContext } from 'react';

interface UserContextInterface {
    user: any,
    setUser: any,
}

const UserContext = createContext({} as UserContextInterface);

export default UserContext;
