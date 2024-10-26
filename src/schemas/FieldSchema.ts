import PlayerSchema from "./PlayerSchema";
import ActionSchema from "./ActionSchema";

interface FieldSchema {
    players: PlayerSchema[],
    enemies: PlayerSchema[],
    actionQueue: ActionSchema[],
    loot: {id: string, amount: number, pid: string}[],
    id: string,
    joinedPlayers: number,
    start: boolean,
}

export default FieldSchema;
