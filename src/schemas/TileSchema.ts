interface TileSchema {
    XY: number[],
    type: string, // stairs | trap | event | '' = normal,
    trap?: string,
    checked?: boolean,
    event?: string,
}

export default TileSchema;
