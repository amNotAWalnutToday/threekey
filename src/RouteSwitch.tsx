import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from './pages/Home';
import Combat from "./pages/Combat";

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
            </Routes>
        </Router>
    );
}