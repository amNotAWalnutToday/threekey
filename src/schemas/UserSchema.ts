import PlayerSchema from "./PlayerSchema"

interface UserSchema {
    username: string,
    uid: string,
    characters: PlayerSchema[],
}

export default UserSchema;
