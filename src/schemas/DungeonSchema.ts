type FloorSchema = {
    number: number,
    biome: string,
    grid: [],
}

interface DungeonSchema {
    floors: FloorSchema[],
}

export default DungeonSchema;
