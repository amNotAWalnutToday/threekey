import PlayerSchema from "./PlayerSchema";

interface PartySchema {
    host: number,
    grouped: boolean,
    inCombat: boolean,
    location: { map: string, XY: number[] }
    players: PlayerSchema[]
}

export default PartySchema;
