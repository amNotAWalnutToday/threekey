import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import UserContext from "./data/Context";
import Home from './pages/Home';
import Combat from "./pages/Combat";
import Map from "./pages/Map";
import CharacterCreate from "./pages/CharacterCreate";

export default function RouteSwitch() {
    const [user, setUser] = useState();

    return (
        <Router basename="threekey" >
            <UserContext.Provider value={{ user, setUser }}>
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
                </Routes>
            </UserContext.Provider>.
        </Router>
    );
}