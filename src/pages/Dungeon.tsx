import { useEffect, useState } from 'react';
import TileSchema from '../schemas/TileSchema';
import FloorSchema from '../schemas/FloorSchema';
import dungeonFns from '../utils/dungeonFns';

const { createFloor } = dungeonFns;

export default function Dungeon() {
    const [floor, setFloor] = useState<FloorSchema>({} as FloorSchema);
    
    const mapFloor = () => {
        return floor?.tiles?.map((tile, index) => {
            return (
                <div  
                    key={`tile-${index}`}
                    className={`${tile.type !== "" ? 'dirt' : 'water'}`}
                >
                    <p style={{fontSize: '8px'}} >{ tile.XY[0] } { tile.XY[1] }</p>
                    <p>{tile.type}</p>
                </div>
            )
        });
    } 

    useEffect(() => {
        createFloor(setFloor);
    }, []);

    return (
        <div className='grid' >
            { mapFloor() }
        </div>
    )
}