import PlayerSchema from "./PlayerSchema";

interface PartySchema {
    host: number,
    grouped: boolean,
    inCombat: boolean,
    wasInCombat: boolean,
    location: { map: string, XY: number[] },
    enemies: string[],
    players: PlayerSchema[]
}

export default PartySchema;
