import PlayerSchema from "./PlayerSchema";

interface PartySchema {
    host: number,
    grouped: boolean,
    location: { map: string, XY: number[] }
    players: PlayerSchema[]
}

export default PartySchema;
