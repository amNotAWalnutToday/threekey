import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from './pages/Home';
import Combat from "./pages/Combat";
import Map from "./pages/Map";
import CharacterCreate from "./pages/CharacterCreate";

export default function RouteSwitch() {
    return (
        <Router basename="threekey" >
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
        </Router>
    );
}