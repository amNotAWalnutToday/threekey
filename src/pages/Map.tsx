import { useState, useEffect, useCallback } from 'react';

export default function Map() { 
    const [generated, setGenerated] = useState(false);
    const [mapSize, setMapSize] = useState([10, 10]);
    
    const getWeight = (possibles: string[], weighting: number[]) => {
        const weightedArray = [];
        
        for(let i = 0; i < possibles.length; i++) {
            for(let j = weighting[i]; j > 0; j--) {
                weightedArray.push(possibles[i]);
            }
        }

        return weightedArray;
    }

    const generateMap = () => {
        const blankTiles = [];

        for(let i = 0; i < mapSize[0]; i++) {
            for(let j = 0; j < mapSize[1]; j++){
                const tile = {
                    num: [i, j],
                    type: null,
                };
                blankTiles.push(tile);
            }
        }

        return blankTiles;
    }

    const [tiles, setTiles] = useState([...generateMap()]);

    const getTile = useCallback(() => {
        for(const tile of tiles) {
            if(tile.type === null) return tile;
        }
    }, [tiles]);

    const getTilesAround = useCallback((tileX, tileY) => {
        // inverted grid
        if(tileX === 0 || tileY === 0 || tileX >= mapSize[0] - 1 || tileY >= mapSize[1] - 1) return 'EDGE';

        const directions = {
            N: tiles[tileX - 1][tileY],
            E: tiles[tileX][tileY - 1],
            S: tiles[tileX + 1][tileY],
            W: tiles[tileX][tileY + 1], 
        }

    }, [tiles, mapSize]);

    const collapse = useCallback(() => {
        const selectedTile = getTile();
        if(!selectedTile) return setGenerated(true);

        const updatedTiles = [...tiles];

        const weightedArray = getWeight(['water', 'dirt', 'grass'], [1, 15, 10]);
        const ran = Math.floor(Math.random() * weightedArray.length);

        selectedTile.type = getTilesAround(selectedTile.num[0], selectedTile.num[1]) === 'EDGE' ? 'water' : weightedArray[ran];

        updatedTiles[selectedTile.num[0]][selectedTile.num[1]] = selectedTile;
        setTiles(updatedTiles);

    }, [getTile, tiles, getTilesAround]);

    useEffect(() => {
        if(generated) return;
        const id = setInterval(collapse, 100);
        return () => clearInterval(id);
    }, [tiles, collapse, generated]);

    const mapTiles = () => {
        return tiles.map((tile, i) => {
            return (
                <div key={`grid-${i}`} className={`${tile.type}`}>
                    <p style={{fontSize: '8px'}}>{tile.num[0]}, {tile.num[1]}</p>
                </div>
            )
        });
    }

    return (
        <div className="grid" >
            { mapTiles() }
            <button onClick={() => getTilesAround(5, 5)}>hai</button>
        </div>
    )
}
