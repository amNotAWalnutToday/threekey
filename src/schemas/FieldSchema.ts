import PlayerSchema from "./PlayerSchema";

type action = {
    ability: string,
    targets: string[],
}

interface FieldSchema {
    players: PlayerSchema[],
    actionQueue: action[],
}

export default FieldSchema;
