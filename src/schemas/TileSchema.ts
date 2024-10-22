interface TileSchema {
    XY: number[],
    type: string, // stairs | trap | event | '' = normal,
    trap?: string,
    checked?: string,
    event?: string,
}

export default TileSchema;
