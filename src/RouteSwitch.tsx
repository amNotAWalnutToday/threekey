import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import UserContext from "./data/Context";
import Home from './pages/Home';
import Combat from "./pages/Combat";
import Map from "./pages/Map";
import CharacterCreate from "./pages/CharacterCreate";
import Town from "./pages/Town";
import PlayerSchema from "./schemas/PlayerSchema";
import UserSchema from "./schemas/UserSchema";

export default function RouteSwitch() {
    const [user, setUser] = useState<UserSchema>();
    const [character, setCharacter] = useState<PlayerSchema>({} as PlayerSchema);
    const [party, setParty] = useState<PlayerSchema[]>([]);

    return (
        <Router basename="threekey" >
            <UserContext.Provider value={{ user, setUser, character, setCharacter, party, setParty }}>
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
                        path='/create-character'
                        element={
                            <CharacterCreate />
                        }
                    />
                    <Route 
                        path='/map'
                        element={
                            <Map />
                        }
                    />
                    <Route 
                        path='/town'
                        element={
                            <Town />
                        }
                    />
                </Routes>
            </UserContext.Provider>.
        </Router>
    );
}