import TileSchema from "./TileSchema"

interface FloorSchema {
    number: number,
    biome: string,
    tiles: TileSchema[],
}

export default FloorSchema;
