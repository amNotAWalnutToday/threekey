import PlayerSchema from "./PlayerSchema";
import ActionSchema from "./ActionSchema";

interface FieldSchema {
    players: PlayerSchema[],
    enemies: PlayerSchema[],
    actionQueue: ActionSchema[],
    id: string,
    joinedPlayers: number,
    start: boolean,
}

export default FieldSchema;
