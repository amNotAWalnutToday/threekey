import { useState } from 'react';
import classes from '../data/classes.json'

export default function CharacterCreate() {
    const [selectedClass, setSelectedClass] = useState("");
    const [classStats, setClassStats] = useState(classes.naturalist); 

    const createClass = () => {
        
    }

    return (
        <div>
            <p>{selectedClass}</p>
            <button onClick={() => setSelectedClass(() => "N")}>N</button>
            <button onClick={() => setSelectedClass(() => "S")}>S</button>
            <button onClick={() => setSelectedClass(() => "T")}>T</button>
            <button className='btn'>Create</button>
        </div>
    )
}
