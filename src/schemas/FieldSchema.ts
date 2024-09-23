import PlayerSchema from "./PlayerSchema";
import ActionSchema from "./ActionSchema";

interface FieldSchema {
    players: PlayerSchema[],
    enemies: PlayerSchema[],
    actionQueue: ActionSchema[],
}

export default FieldSchema;
