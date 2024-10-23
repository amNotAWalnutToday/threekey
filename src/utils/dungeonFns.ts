import { get, ref, onValue, set } from "firebase/database";
import accountFns from "./accountFns";
import TileSchema from "../schemas/TileSchema";
import FloorSchema from "../schemas/FloorSchema";
import trapData from '../data/traps.json';
import enemyData from '../data/enemies.json';
import itemData from '../data/items.json';

const { db } = accountFns;

type Coords = {
    x: number,
    y: number
}

export default (() => {
    const getTile = (tiles: TileSchema[], search: { XY?: number[], type?: string}) => {
        for(let i = 0; i < tiles.length; i++) {
            if(search.XY) {
                if(tiles[i].XY[0] === search.XY[0] && tiles[i].XY[1] === search.XY[1]) return { state: tiles[i], index: i};
            }
            if(search.type) {
                if(tiles[i].type === search.type) return { state: tiles[i], index: i};
            }
        }
    }

    const getFloor = async (floorNum: number) => {
        const floorRef = ref(db, `/dungeon/${floorNum}/`);
        let floor;
        await get(floorRef).then(async(snapshot) => {
            const data = await snapshot.val();
            if(!data) return;
            floor = data;
        });

        return floor;
    }

    const getTrap = (trapType: string) => {
        for(const trap of trapData) {
            if(trap.type === trapType) return trap;
        }
    }

    const getPossibleTraps = (biome: string, floorNum: number) => {
        const possibleTraps = [];
        for(const trap of trapData) {
            for(const trapBiome of trap.biomes) {
                if(biome === trapBiome && trap.minFloor <= floorNum) possibleTraps.push(trap);
            }
        }

        return possibleTraps;
    }

    const getPossibleItems = (biome: string, floorNum: number) => {
        const possibleItems = [];

        for(const item of itemData) {
            for(const itemBiome of item.biomes) {
                if(biome === itemBiome && item.minFloor <= floorNum) possibleItems.push(item);
            }
        }

        return possibleItems;
    }

    const getBiomes = (floorNum: number) => {
        let defaultBiomes = ['forest', 'scrapyard', 'crypt']
        const medBiomes = ['hive', 'factory', 'abyss'] 
        const highBiomes = ['cataclysmic desert', 'simulation', 'realm of divinity'];
        if(floorNum > 24) defaultBiomes = defaultBiomes.concat(medBiomes);
        if(floorNum > 49) defaultBiomes = defaultBiomes.concat(highBiomes);
        console.log(defaultBiomes);
        return defaultBiomes;        
    }

    const getRandomBiome = (floorNum: number) => {
        const biomes = getBiomes(floorNum);
        const biomeRan = Math.floor(Math.random() * biomes.length);
        const chosenBiome = biomes[biomeRan];
        return chosenBiome;
    }

    const getEnemies = (floorNum: number, biome: string, amount: number) => {
        const possibleEnemies = [];
        for(const enemy of enemyData.all) {
            for(const enemyBiome of enemy.biomes) {
                if(enemyBiome === biome && floorNum >= enemy.minFloor) possibleEnemies.push(enemy);
            }
        }

        const enemies = [];
        for(let i = 0; i < amount; i++) {
            const ran = Math.floor(Math.random() * possibleEnemies.length);
            enemies.push(possibleEnemies[ran]);
        }
        
        return Array.from(enemies, enemy => enemy.id);
    }

    const rotate = (neighbours: number[][], middle: number[], facing: string) => {
        if(facing === 'north') return neighbours;
        return neighbours.map((XY) => {
            // Translate to origin
            const [x, y] = [XY[0], XY[1]];
            const translatedX = x - middle[0];
            const translatedY = y - middle[1];
            
            let rotatedX, rotatedY;

            // Rotate based on facing direction
            if (facing === 'west') {
                rotatedX = translatedY;
                rotatedY = -translatedX;
            } else if (facing === 'east') {
                rotatedX = -translatedY;
                rotatedY = translatedX;
            } else if (facing === 'south') {
                rotatedX = -translatedX;
                rotatedY = -translatedY;
            }
            
            // Translate back
            if(rotatedX === undefined || rotatedY === undefined) return [-1, -1];
            return [rotatedX + middle[0], rotatedY + middle[1]];
        });
    };

    const getTileNeighbours = (tiles: TileSchema[], XY: number[], facing: string) => {
        const neighbours = [
            [XY[0] +1, XY[1] + 1],
            [XY[0], XY[1] + 1],
            [XY[0] - 1, XY[1] + 1],
            [XY[0] + 1, XY[1]],
            [XY[0], XY[1]],
            [XY[0] - 1, XY[1]],
            [XY[0] + 1, XY[1] - 1],
            [XY[0], XY[1] - 1],
            [XY[0] - 1, XY[1] - 1],
        ];
        const rotatedNeighbours = rotate(neighbours, XY, facing);

        const populatedTiles = [];
        for(const neighbour of rotatedNeighbours) {
            const tile = getTile(tiles, { XY: neighbour });
            if(!tile) {
                populatedTiles.push({type: 'wall'} as TileSchema);
                continue;
            }
            populatedTiles.push(tile.state);
        }

        return populatedTiles;
    }

    const disarmTrap = (tile: TileSchema, floor: FloorSchema) => {
        const updatedTile = {...tile};
        updatedTile.trap = "";
        uploadDungeon("tile", { tile: updatedTile, floor });
    }

    const assignRandomTileAttributes = (tile: TileSchema, floorNum: number, biome: string) => {
        const biomeRan = Math.floor(Math.random() * 100);
        const chosenBiome = biomeRan > 79 ? getRandomBiome(floorNum + 10) : biome;
        tile.type = chosenBiome;
        // choose trap
        const possibleTraps = getPossibleTraps(chosenBiome, floorNum);
        const shouldTrap = Math.floor(Math.random() * 100);
        const possibleTrapRan = Math.floor(Math.random() * possibleTraps.length);
        if(shouldTrap >= 70) {
            tile.trap = possibleTraps[possibleTrapRan].type ?? "";
        }
        return tile;
    }

    const getKey = (XY: number[]) => `${XY[0]}x${XY[1]}`;
    
    const assignPaths = (
        tiles: TileSchema[], start: number[], target: number[],
        biome: string, floorNum: number,
    ) => {
        if(!start || !target) return;
        console.log(start, target);
        const queue: Coords[] = [];
        const parentForKey: { [key: string]:  {key: string, position: Coords}} = {};

        const startKey = getKey(start);
        const targetKey = getKey(target);

        parentForKey[startKey] = {
            key: getKey(start),
            position: { x: -1, y: -1 },
        }

        queue.push({x: start[0], y: start[1]});

        while(queue.length > 0) {
            const lastItemInQueue = queue.shift();
            if(!lastItemInQueue) break;
            const { x, y } = lastItemInQueue;

            const currentKey = getKey([x, y]);

            if(currentKey === targetKey) break;

            const neighbours = [
                {x, y: y - 1,},
                {x: x - 1, y,},
                {x, y: y + 1,},
                {x: x + 1, y,},
            ];

            for(let i = 0; i < neighbours.length; i++) {
                const neighbour = neighbours[i];
                const tile = getTile(tiles, { XY: [neighbour.x, neighbour.y] });
                if(!tile) continue;
                // if(tile.state.type === "wall") continue;
                const key = getKey([neighbour.x, neighbour.y]);
                if(key in parentForKey) continue;

                parentForKey[key] = {
                    key: currentKey,
                    position: { x, y },
                }

                queue.push(neighbour);
            }
        }

        const path = [];

        let currentKey = targetKey;
        let currentPos = parentForKey[targetKey].position;

        while(currentKey !== startKey) {
            const pos = currentPos;
            path.push(pos);

            const { key, position } = parentForKey[currentKey];
            currentKey = key;
            currentPos = position;
        }

        for(const point of path) {
            const tile = getTile(tiles, { XY: [point.x, point.y] });
            if(!tile) continue;
            if(tile.state.type.length) continue;
            tiles[tile.index] = assignRandomTileAttributes(tile.state, floorNum, biome);
        }
        return tiles;
    }

    const createFloor = (
        characterLocation: number[],
        floorNum: number,
        setFloor: React.Dispatch<React.SetStateAction<FloorSchema>>,
    ) => {
        const tiles: TileSchema[] = [];
        const totalRooms: number[][] = [];

        const chosenBiome = getRandomBiome(floorNum);

        for(let i = 10; i > 0; i--) {
            for(let j = 10; j > 0; j--) {
                const roomRan = Math.floor(Math.random() * 40); 
                const check = roomRan === 1 && totalRooms.length <= 3;
                if(check) totalRooms.push([j, i]);
                const tile = { XY: [j, i], type: check ? 'room' : '' };
                tiles.push(tile);
            }
        }
        const downStairsRan = Math.floor(Math.random() * tiles.length);
        const upstairsTile = getTile(tiles, { XY: characterLocation });
        const upstairsRan = upstairsTile?.index ?? Math.floor(Math.random() * tiles.length);
        tiles[upstairsRan].type = 'upstairs',
        tiles[downStairsRan].type = 'downstairs',
        
        assignPaths([...tiles], tiles[upstairsRan].XY, tiles[downStairsRan].XY, chosenBiome, floorNum);
        for(const coords of totalRooms) {
            assignPaths([...tiles], tiles[upstairsRan].XY, coords, chosenBiome, floorNum);
            const neighbours = [
                [coords[0], coords[1] - 1],
                [coords[0] - 1, coords[1]],
                [coords[0], coords[1] + 1],
                [coords[0] + 1, coords[1]],
                [coords[0] - 1, coords[1] - 1],
                [coords[0] + 1, coords[1] + 1],
                [coords[0] - 1, coords[1] + 1],
                [coords[0] + 1, coords[1] - 1],
            ];
            for(const neighbour of neighbours) {
                const tile = getTile(tiles, { XY: neighbour });
                if(!tile) continue;
                if(tile.state.type !== '') continue; 
                tiles[tile.index] = assignRandomTileAttributes(tile.state, floorNum, chosenBiome);
            }
        }

        return {
            tiles, 
            number: floorNum,
            biome: chosenBiome,
        };
    }

    const connectFloor = async(
        floorNum: number,
        setFloor: React.Dispatch<React.SetStateAction<FloorSchema>>,
    ) => {
        try {
            const floorRef = ref(db, `/dungeon/${floorNum}`);
            await onValue(floorRef, async(snapshot) => {
                const data: FloorSchema = await snapshot.val();
                if(!data) return data;
                if(floorNum === data.number) setFloor(() => data);
            });
        } catch(e) {
            return console.error(e);
        }
    }

    const uploadDungeon = async (
        type: string, 
        payload: { 
            floor?: FloorSchema,
            tile?: TileSchema,
        },
    ) => {
        const { floor, tile } = payload;

        switch(type) {
            case "floor":
                if(!floor) return;
                uploadFloor(floor);
                break;
            case "tile": 
                if(!tile || !floor) return;
                uploadTile(floor, tile);
                break;
        }
    }

    const uploadFloor = async (floor: FloorSchema) => {
        const floorRef = ref(db, `/dungeon/${floor.number}`);
        await set(floorRef, floor);
    }

    const uploadTile = async (floor: FloorSchema, tile: TileSchema) => {
        const tileIndex = getTile(floor.tiles, { XY: tile.XY })?.index ?? -1;
        const tileRef = ref(db, `/dungeon/${floor.number}/tiles/${tileIndex}`);
        await set(tileRef, tile);
    }

    const createUIEnemy = (id: string) => {
        return id; 
    }

    return {
        getTile,
        getFloor,
        getTrap,
        getPossibleItems,
        getTileNeighbours,
        getEnemies,
        disarmTrap,
        createFloor,
        createUIEnemy,
        connectFloor,
        uploadDungeon,
    }
})();