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
import PlayerSchema from '../schemas/PlayerSchema';
import Log from '../components/Log';
import UIButtonBar from '../components/UIBtnBar';
import PartyMenu from '../components/PartyMenu';
import Inventory from '../components/Inventory';
import CharacterProfile from '../components/CharacterProfile';
import Tree from '../components/Tree';

const { connectParty, uploadParty, syncPartyMemberToAccount } = partyFns;
const { getTile, getTileNeighbours, getFloor, createFloor, createUIEnemy,
    connectFloor, uploadDungeon, getTrap, disarmTrap, getEnemies,
} = dungeonFns;
// const { upload } = combatFns;

export default function Dungeon() {
    const { character, enemies, setEnemies, setParty, party, user } = useContext(UserContext);
    const navigate = useNavigate();

    const [isHost, setIsHost] = useState(false); 
    const [floor, setFloor] = useState<FloorSchema>({} as FloorSchema);
    const [minimap, setMinimap] = useState<TileSchema[]>([]);
    const [location, setLocation] = useState(character.location ?? {map: "1", XY: [1, 1]});
    const [facing, setFacing] = useState('north');

    const [gameLog, setGameLog] = useState<string[]>([]);

    const logMessage = (message: string) => {
        const updatedGamelog = [...gameLog];
        updatedGamelog.push(message);
        if(updatedGamelog.length > 101) updatedGamelog.shift();
        setGameLog(() => updatedGamelog);
    }

    /**MENU STATE*/
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isTreeOpen, setIsTreeOpen] = useState(false);
    const [inspectCharacter, setInspectCharacter] = useState({} as PlayerSchema);

    const toggleOffMenus = (exception: string) => {
        if(exception !== "inventoryMenu") setIsInventoryOpen(() => false);
        if(exception !== "characterProfileMenu") setInspectCharacter(() => ({} as PlayerSchema));
        if(exception !== "treeMenu") setIsTreeOpen(() => false);
    }
    
    const mapFloor = () => {
        return floor?.tiles?.map((tile, index) => {
            return (
                <div  
                    key={`tile-${index}`}
                    className={`${tile.type !== "" ? tile.type : 'wall'}`}
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
                    className={`${tile.type !== "" ? tile.type : 'wall'}`}
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
        if(targetTile.state.trap) encounterTrap(targetTile.state.trap);
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

    const applyUseTile = (tile: TileSchema, useType: string) => {
        const type = useType === "type" ? tile.type : useType === "trap" ? tile.trap : tile.event;
        switch(type) {
            case "upstairs":
                leaveFloor();
                break;
            case "downstairs":
                nextFloor('up', 1);
                break;
            case "pitfall":
                nextFloor('down', 2);
                break;
        }
    }

    const applyDisarmTile = (tile: TileSchema) => {
        const trap = getTrap(tile.trap ?? "");
        if(!trap) return;
        if(trap.disarmType === "random") {
            const ran = Math.floor(Math.random() * 100);
            if(ran > 49) {
                logMessage(`${trap.type} has been disarmed.`)
                disarmTrap(tile, floor);
            } else { 
                logMessage(`you failed to disarm the trap and fell for it instead`);
                applyUseTile(tile, 'trap');
            }
        }
    }

    const enterFight = async () => {
        await uploadParty('wasInCombat', { partyId: party.players[0].pid, isInCombat: true });
        await uploadParty('inCombat', { partyId: party.players[0].pid, isInCombat: true });
    }

    const avoidFight = () => {
        const ran = Math.floor(Math.random() * 100);
        if(ran > 49) {
            logMessage('You successfully avoided the enemies.');
            uploadParty("enemies", { partyId: party.players[0].pid, enemyIds: [] });
        } else { 
            enterFight();
        }
    }

    const leaveFloor = async () => {
        if(floor.number <= 0) {
            for(const member of party.players) {
                await syncPartyMemberToAccount(member);
            }
            uploadParty("location", { partyId: party.players[0].pid, location: {...party.location, map: "-1"} });
            // navigate('/town');
        } else {
            nextFloor('down', 1);
        }
    }

    const nextFloor = async (dir: string, floorsMoved: number) => {
        const newMapLocation = dir === 'up' ? Number(party.location.map) + floorsMoved : Number(party.location.map) - floorsMoved;
        let newFloor;
        newFloor = await getFloor(newMapLocation) 
        if(!newFloor) newFloor = createFloor(party.location.XY, newMapLocation, setFloor);
        newFloor.number = newMapLocation;
        setFloor(() => newFloor);
        uploadDungeon('floor', { floor: newFloor });
        const start = getTile(newFloor.tiles, { type: dir === "up" ? "upstairs" : "downstairs" })?.state;
        if(!start) return newFloor;
        uploadParty('location', { partyId: party.players[0].pid, location: { map: `${newMapLocation}`, XY: start.XY } });
        return newFloor;
    }

    const getEncounters = () => {
        const encountered = Math.floor(Math.random() * 3);
        if(encountered === 1) {
            const amount = Math.floor(Math.random() * 4);
            const enemies = getEnemies(floor.number, floor.biome, amount);
            uploadParty('enemies', { partyId: party.players[0].pid, enemyIds: enemies });
        } else {
            setEnemies(() => []);
        }
    }

    const encounterTrap = (trap: string) => {
        logMessage(`You have encountered a ${trap} trap!`);
    }

    const initializeDungeon = async () => {
        const updatedParty: PartySchema = await connectParty(party.players[0].pid, setParty);
        if(!updatedParty) return;
        let newFloor;
        newFloor = await getFloor(Number(party.location.map));
        if(!newFloor) { 
            newFloor = createFloor(party.location.XY, Number(party.location.map), setFloor);
            newFloor.number = Number(party.location.map);
            uploadDungeon('floor', { floor: newFloor });
        }
        const start = getTile(newFloor.tiles, { type: 'upstairs' });
        if(!start) return;
        setFloor(() => newFloor);
        if(!updatedParty.wasInCombat) { 
            await uploadParty('location', { partyId: party.players[0].pid, location: { map: party.location.map, XY: start.state.XY } });
            assignMinimap(newFloor.tiles, start.state.XY, facing);
        } else {
            await uploadParty('wasInCombat', { partyId: party.players[0].pid, isInCombat: false });
            assignMinimap(newFloor.tiles, party.location.XY, 'north');
        }

        await connectFloor(Number(party.location.map), setFloor);
    }

    useEffect(() => {
        if(!user?.uid) return navigate('/');
        if(character.pid === party.players[0].pid) setIsHost(() => true);
        initializeDungeon();
    }, []);

    const changeFloor = async () => {
        const nextFloor = await getFloor(Number(party.location.map));
        console.log(nextFloor);
        if(!nextFloor) return;
        setFloor(() => nextFloor);
    }

    useEffect(() => {
        if(!user?.uid) return navigate('/');
        if(Number(party.location.map) < 0) return navigate('/town');
        setLocation(() => {
            if(`${floor.number}` !== party.location.map) {
                changeFloor();
            }
            if(floor.tiles) assignMinimap(floor.tiles, party.location.XY, facing);
            return party.location;
        });
    }, [party.location]);

    useEffect(() => {
        if(party?.inCombat) return navigate('/combat');
    }, [party.inCombat]);

    const checkCanMove = () => {
        if(!floor.tiles) return;
        const currentTile = getTile(floor.tiles, {XY: party.location.XY})?.state;
        if(currentTile?.trap) return false;
        if(party?.enemies) return false;
        return true;
    }

    return (
        <div>
            {/* <div className="grid">{ mapFloor() }</div> */}
            <div className="dungeon_info" >
                <p>Floor: {floor.number}</p>
                <p>Biome: {floor.biome}</p>
                <p>Location: [ {location.XY[0]} , {location.XY[1]} ]</p>
                <p>Facing: {facing}</p>
                {/* <p>Size: {floor.tiles.length / 10}x{floor.tiles.length / 10}</p> */}
            </div>
            <div className="minimap_group">
                {party?.enemies?.length
                &&
                <div className='btn_group' >
                    <button
                        className='menu_btn'
                        onClick={enterFight}
                    >
                        Fight
                    </button> 
                    <button
                        className='menu_btn'
                        onClick={avoidFight}
                    >
                        Avoid
                    </button> 
                </div>
                }
                <div className='btn_group'>
                    <button
                        className='menu_btn'
                        onClick={() => console.log()}
                    >
                        inspect
                    </button>
                    <button
                        className='menu_btn'
                        onClick={() => {
                            const thisTile = getTile(floor.tiles, { XY: party.location.XY })?.state ?? {} as TileSchema;
                            let type = 'type';
                            if(thisTile.trap) type = 'trap';
                            applyUseTile(thisTile, type);
                        }}
                    >
                        use
                    </button>
                    <button
                        className='menu_btn'
                        onClick={() => {
                            const thisTile = getTile(floor.tiles, { XY: party.location.XY })?.state ?? {} as TileSchema;
                            applyDisarmTile(thisTile);
                        }}
                    >
                        disarm
                    </button>
                    <button
                        className='menu_btn'
                        onClick={() => console.log(getEnemies(1, 'forest', 5))}
                    >
                        event
                    </button>
                </div>
                <div className="minimap">{ mapMinimap() }</div>
                <div className="btn_group">
                    <button
                        className='menu_btn'
                        onClick={() => turn('left')}
                        disabled={!checkCanMove()}
                    >
                        turn left
                    </button>
                    <button
                        className='menu_btn'
                        onClick={() => move(getDirection())}
                        disabled={!checkCanMove()}
                    >
                        move forward
                    </button>
                    <button
                        className='menu_btn'
                        onClick={() => turn('right')}
                        disabled={!checkCanMove()}
                    >
                        turn right
                    </button>
                </div>
            </div>
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
            <Log 
                messages={gameLog}
            />
            <UIButtonBar 
                showInventory={() => {
                    setIsInventoryOpen((prev) => !prev);
                    toggleOffMenus("inventoryMenu");
                }}
                showProfile={() => {
                    setInspectCharacter((prev) => prev.pid ? {} as PlayerSchema : {...character});
                    toggleOffMenus("characterProfileMenu");
                }}
                showTree={() => {
                    setIsTreeOpen((prev) => !prev);
                    toggleOffMenus("treeMenu");
                }}
            />
            { isInventoryOpen 
            && 
            <Inventory 
                inventory={character.inventory} 
                position="center"
                buttons={["use", "destroy"]}
                limit={10}
                logMessage={logMessage}
            /> 
            }
            { inspectCharacter.pid
            &&
            <CharacterProfile
                character={inspectCharacter}
            />
            }
            {party.players && <PartyMenu />}
        </div>
    )
}