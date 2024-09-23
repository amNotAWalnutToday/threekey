import PlayerSchema from "./PlayerSchema";
import ActionSchema from "./ActionSchema";

interface FieldSchema {
    players: PlayerSchema[],
    enemies: any[],
    actionQueue: ActionSchema[],
}

export default FieldSchema;
