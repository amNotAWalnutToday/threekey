import PlayerSchema from "./PlayerSchema";

type action = {
    ability: string,
    targets: string[],
}

interface FieldSchema {
    players: PlayerSchema[],
    enemies: any[],
    actionQueue: action[],
}

export default FieldSchema;
