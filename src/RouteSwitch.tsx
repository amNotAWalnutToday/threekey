import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from './pages/Home';
import Combat from "./pages/Combat";
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
            </Routes>
        </Router>
    );
}