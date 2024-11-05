import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import UserContext from "./data/Context";
import Home from './pages/Home';
import Combat from "./pages/Combat";
import CharacterSelect from "./pages/CharacterSelect";
import Town from "./pages/Town";
import Dungeon from "./pages/Dungeon";
import PlayerSchema from "./schemas/PlayerSchema";
import UserSchema from "./schemas/UserSchema";
import PartySchema from "./schemas/PartySchema";

export default function RouteSwitch() {
    const [user, setUser] = useState<UserSchema>();
    const [character, setCharacter] = useState<PlayerSchema>({} as PlayerSchema);
    const [party, setParty] = useState<PartySchema>({} as PartySchema);
    const [enemies, setEnemies] = useState([]);

    return (
        <Router basename="threekey" >
            <UserContext.Provider value={{ user, setUser, character, setCharacter, party, setParty, enemies, setEnemies }}>
                <Routes>
                    <Route 
                        path='/'
                        element={
                            <Home />
                        }
                    />
                    <Route 
                        path='/combat'
                        element={
                            <Combat />
                        }
                    />
                    <Route 
                        path='/characters'
                        element={
                            <CharacterSelect />
                        }
                    />
                    <Route 
                        path='/town'
                        element={
                            <Town />
                        }
                    />
                    <Route 
                        path='/dungeon'
                        element={
                            <Dungeon />
                        }
                    />
                </Routes>
            </UserContext.Provider>
        </Router>
    );
}