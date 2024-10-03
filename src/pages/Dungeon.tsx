import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import TileSchema from '../schemas/TileSchema';
import FloorSchema from '../schemas/FloorSchema';
import dungeonFns from '../utils/dungeonFns';
import combatFns from '../utils/combatFns';
import partyFns from '../utils/partyFns';
import UserContext from '../data/Context';
import enemydata from '../data/enemies.json';
import PartySchema from '../schemas/PartySchema';

const { connectParty, uploadParty, syncPartyMemberToAccount } = partyFns;
const { getTile, getTileNeighbours, getFloor, createFloor, createUIEnemy } = dungeonFns;
const { upload } = combatFns;

export default function Dungeon() {
    const { character, enemies, setEnemies, setParty, party } = useContext(UserContext);

    const [isHost, setIsHost] = useState(character.pid === party.players[0].pid); 
    const [floor, setFloor] = useState<FloorSchema>({} as FloorSchema);
    const [minimap, setMinimap] = useState<TileSchema[]>([]);
    const [location, setLocation] = useState(character.location ?? {map: "1", XY: [1, 1]});
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
        uploadParty('location', { partyId: party.players[0].pid, location: { map: party.location.map, XY: [x, y] } });
        // setLocation((prev) => { 
        //     const newLocation = Object.assign({}, prev, {XY: [x, y]});
        //     assignMinimap(floor.tiles, getTile(floor.tiles, { XY: newLocation.XY })?.state.XY ?? [0,0], facing);
        //     return newLocation;
        // });
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

    const leaveFloor = async () => {
        if(floor.number <= 0) {
            for(const member of party.players) {
                await syncPartyMemberToAccount(member);
            }
            navigate('/town');
        } else {
            nextFloor('down');
        }
    }

    const nextFloor = async (dir: string) => {
        const newMapLocation = dir === 'up' ? Number(party.location.map) + 1 : Number(party.location.map) - 1;
        let newFloor;
        newFloor = await getFloor(newMapLocation) 
        if(!newFloor) newFloor = createFloor(party.location.XY, setFloor);
        newFloor.number = newMapLocation;
        setFloor(() => newFloor);
        upload('floor', { floor: newFloor, fieldId: '' });
        const start = getTile(newFloor.tiles, { type: dir === "up" ? "upstairs" : "downstairs" })?.state;
        if(!start) return newFloor;
        uploadParty('location', { partyId: party.players[0].pid, location: { map: `${newMapLocation}`, XY: start.XY } });
        return newFloor;
    }

    const getEncounters = () => {
        const encountered = Math.floor(Math.random() * 3);
        if(encountered === 1) {
            setEnemies(() => {
                const ran = Math.floor(Math.random() * 4);
                const enemies = [];
                for(let i = 0; i < ran; i++) enemies.push(createUIEnemy(enemydata.all[0].id));
                return enemies;
            });
        } else {
            setEnemies(() => []);
        }
    }

    const initializeDungeon = async () => {
        const updatedParty: PartySchema = await connectParty(party.players[0].pid, setParty);
        if(!updatedParty) return;
        let newFloor;
        newFloor = await getFloor(Number(party.location.map));
        if(!newFloor) { 
            newFloor = createFloor(party.location.XY, setFloor);
            newFloor.number = Number(party.location.map);
            upload('floor', { floor: newFloor, fieldId: '' });
        }
        const start = getTile(newFloor.tiles, { type: 'upstairs' });
        if(!start) return;
        setFloor(() => newFloor);
        if(!updatedParty.inCombat) await uploadParty('location', { partyId: party.players[0].pid, location: { map: party.location.map, XY: start.state.XY } });
        if(updatedParty.inCombat && isHost) await uploadParty('inCombat', { partyId: party.players[0].pid, isInCombat: false });
        assignMinimap(newFloor.tiles, start.state.XY, facing);
    }

    useEffect(() => {
        initializeDungeon();
    }, []);

    const changeFloor = async () => {
        const nextFloor = await getFloor(Number(party.location.map));
        console.log(nextFloor);
        if(!nextFloor) return;
        setFloor(() => nextFloor);
    }

    useEffect(() => {
        setLocation(() => {
            if(`${floor.number}` !== party.location.map) {
                changeFloor();
            }
            if(floor.tiles) assignMinimap(floor.tiles, party.location.XY, facing);
            return party.location;
        });
    }, [party.location]);

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
                    onClick={() => nextFloor('up')}
                >
                    Go Down
                </button>
            }
            {
                enemies.length &&
                <button
                    onClick={async () => { 
                        await uploadParty('inCombat', { partyId: party.players[0].pid, isInCombat: true });
                        navigate('../combat')
                    }}
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