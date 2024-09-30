import { useEffect, useState } from 'react';
import TileSchema from '../schemas/TileSchema';
import FloorSchema from '../schemas/FloorSchema';
import dungeonFns from '../utils/dungeonFns';

const { getTile, getTileNeighbours, createFloor } = dungeonFns;

export default function Dungeon() {
    const [floor, setFloor] = useState<FloorSchema>({} as FloorSchema);
    const [minimap, setMinimap] = useState<TileSchema[]>([]);
    const [location, setLocation] = useState({map: "", coords: [0, 0]});
    const [facing, setFacing] = useState('north');
    
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

    const mapMinimap = () => {
        return minimap?.map((tile, index) => {
            return  tile.type !== 'wall' ? (
                <div  
                    key={`tile-${index}`}
                    className={`${tile.type !== "" ? 'dirt' : 'water'}`}
                >
                    <p style={{fontSize: '8px'}} >{ tile.XY[0] } { tile.XY[1] }</p>
                    <p>{tile.type}</p>
                </div>
            ) : (
                <div
                    key={`tile-${index}`}
                    className='grass'
                >

                </div>
            )
        });
    }

    const move = (dir: string) => {
        const tile = getTile(floor.tiles, { XY: location.coords })?.state;
        if(!tile) return;
        let x = tile.XY[0];
        let y = tile.XY[1];
        if(dir === 'up') y += 1;
        else if(dir === 'down') y -= 1;
        else if(dir === 'left') x -= 1;
        else if(dir === 'right') x += 1;
        console.log(x, y, location);
        const targetTile = getTile(floor.tiles, { XY: [x, y] });
        if(!targetTile) return;
        if(targetTile.state.type === '') return;
        setLocation((prev) => { 
            const newLocation = Object.assign({}, prev, {coords: [x, y]});
            assignMinimap(floor.tiles, getTile(floor.tiles, { XY: newLocation.coords })?.state.XY ?? [0,0], facing);
            return newLocation;
        });
    }

    const assignMinimap = (tiles: TileSchema[], startXY: number[], facing: string) => {
        setMinimap(() => {
            const visibleTiles = [];
            const neighbours = getTileNeighbours(tiles, startXY, facing);
            for(const neighbour of neighbours) visibleTiles.push(neighbour);
            return visibleTiles;
        });
    }

    const turn = (dir: string) => {
        const directions = ['north', 'east', 'south', 'west'];
        setFacing((prev) => {
            const currentIndex = directions.indexOf(prev);
            const newIndex = (currentIndex + (dir === 'left' ? -1 : 1) + directions.length) % 4;
            assignMinimap(floor.tiles, getTile(floor.tiles, { XY: location.coords })?.state.XY ?? [0,0], directions[newIndex]);
            return directions[newIndex];
        });
    }

    const getDirection = () => {
        if(facing === 'north') return 'up';
        else if(facing === 'east') return 'left';
        else if(facing === 'west') return 'right';
        else if(facing === 'south') return 'down';
        return '';
    }

    useEffect(() => {
        const tiles = createFloor(setFloor);
        const start = getTile(tiles, { type: 'upstairs' });
        if(!start) return;
        setLocation((prev) => {
            return Object.assign({}, prev, {coords: start?.state.XY});
        });
        assignMinimap(tiles, start.state.XY, facing);
    }, []);

    return (
        <div>
            <div className="grid">{ mapFloor() }</div>
            <p>Location: [{location.coords[0]},{location.coords[1]}]</p>
            <p>Facing: {facing}</p>
            <button
                onClick={() => turn('left')}
            >
                turn left
            </button>
            <button
                onClick={() => move(getDirection())}
            >
                move forward
            </button>
            <button
                onClick={() => turn('right')}
            >
                turn right
            </button>
            <div className="minimap">{ mapMinimap() }</div>
        </div>
    )
}