import TileSchema from "../schemas/TileSchema";
import FloorSchema from "../schemas/FloorSchema";

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
            if(!rotatedX || !rotatedY) return [-1, -1];
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

    const getKey = (XY: number[]) => `${XY[0]}x${XY[1]}`;
    
    const assignPaths = (tiles: TileSchema[], start: number[], target: number[]) => {
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
            tiles[tile.index].type = 'path';
        }
        return tiles;
    }

    const createFloor = (
        setFloor: React.Dispatch<React.SetStateAction<FloorSchema>>
    ) => {
        const tiles: TileSchema[] = [];
        const totalRooms: number[][] = [];

        for(let i = 10; i > 0; i--) {
            for(let j = 10; j > 0; j--) {
                const roomRan = Math.floor(Math.random() * 40); 
                const check = roomRan === 1 && totalRooms.length <= 3;
                if(check) totalRooms.push([j, i]);
                const tile = { XY: [j, i], type: check ? 'room' : '' };
                tiles.push(tile);
            }
        }
        const upstairsRan = Math.floor(Math.random() * tiles.length);
        const downStairsRan = Math.floor(Math.random() * tiles.length);
        tiles[upstairsRan].type = 'upstairs',
        tiles[downStairsRan].type = 'downstairs',
        
        setFloor(() => { 
            assignPaths([...tiles], tiles[upstairsRan].XY, tiles[downStairsRan].XY);
            for(const coords of totalRooms) {
                assignPaths([...tiles], tiles[upstairsRan].XY, coords);
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
                    tiles[tile.index].type = 'room';
                }
            }
            return {
                tiles,
                number: 1,
                biome: ''
            };
        });
        return tiles;
    }

    return {
        getTile,
        getTileNeighbours,
        createFloor,
    }
})();