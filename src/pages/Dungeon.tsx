import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import TileSchema from '../schemas/TileSchema';
import FloorSchema from '../schemas/FloorSchema';
import dungeonFns from '../utils/dungeonFns';
import UserContext from '../data/Context';
import enemydata from '../data/enemies.json';

const { getTile, getTileNeighbours, createFloor, createUIEnemy } = dungeonFns;

export default function Dungeon() {
    const { character, enemies, setEnemies } = useContext(UserContext);

    const [floor, setFloor] = useState<FloorSchema>({} as FloorSchema);
    const [minimap, setMinimap] = useState<TileSchema[]>([]);
    const [location, setLocation] = useState(character.location ?? {map: "floor_1", XY: [1, 1]});
    const [facing, setFacing] = useState('north');

    const navigate = useNavigate();
    
    const mapFloor = () => {
        return floor?.tiles?.map((tile, index) => {
            return (
                <div  
                    key={`tile-${index}`}
                    className={`${tile.type !== "" ? 'dirt' : 'wall'}`}
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
                    className={`${tile.type !== "" ? 'dirt' : 'wall'}`}
                >
                    <p style={{fontSize: '8px'}} >{ tile.XY[0] } { tile.XY[1] }</p>
                    <p>{tile.type}</p>
                </div>
            ) : (
                <div
                    key={`tile-${index}`}
                    className='wall'
                >

                </div>
            )
        });
    }

    const move = (dir: string) => {
        const tile = getTile(floor.tiles, { XY: location.XY })?.state;
        if(!tile) return;
        let x = tile.XY[0];
        let y = tile.XY[1];
        if(dir === 'up') y += 1;
        else if(dir === 'down') y -= 1;
        else if(dir === 'left') x -= 1;
        else if(dir === 'right') x += 1;
        const targetTile = getTile(floor.tiles, { XY: [x, y] });
        if(!targetTile) return;
        if(targetTile.state.type === '') return;
        setLocation((prev) => { 
            const newLocation = Object.assign({}, prev, {XY: [x, y]});
            assignMinimap(floor.tiles, getTile(floor.tiles, { XY: newLocation.XY })?.state.XY ?? [0,0], facing);
            return newLocation;
        });
        getEncounters();
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
            assignMinimap(floor.tiles, getTile(floor.tiles, { XY: location.XY })?.state.XY ?? [0,0], directions[newIndex]);
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

    const leaveFloor = () => {
        if(floor.number === 1) {
            navigate('/town');
        } else {
            setFloor((prev) => {
                return Object.assign({}, prev, {number: prev.number - 1});
            });
        }
    }

    const nextFloor = () => {
        createFloor(location.XY, setFloor);
    }

    const getEncounters = () => {
        const encountered = Math.floor(Math.random() * 3);
        if(encountered === 1) {
            setEnemies(() => {
                const ran = Math.floor(Math.random() * 3);
                const enemies = [];
                for(let i = 0; i < ran; i++) enemies.push(createUIEnemy(enemydata.all[0].id));
                return enemies;
            });
        } else {
            setEnemies(() => []);
        }
    }

    useEffect(() => {
        const tiles = createFloor(location.XY, setFloor);
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
            <p>Location: [{location.XY[0]},{location.XY[1]}]</p>
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
            {
                floor.tiles &&
                getTile(floor.tiles, { XY: location.XY })?.state.type === 'upstairs'
                &&
                <button
                onClick={leaveFloor}
                >
                    Go Up
                </button>
            }
            {
                floor.tiles &&
                getTile(floor.tiles, { XY: location.XY })?.state.type === 'downstairs'
                &&
                <button
                    onClick={nextFloor}
                >
                    Go Down
                </button>
            }
            {
                enemies.length &&
                <button
                    onClick={() => navigate('../combat')}
                >
                    Enter Combat
                </button>
            }   
            
            <button
                    onClick={() => console.log(enemies)}
                >
                    check enemies
                </button>
        </div>
    )
}