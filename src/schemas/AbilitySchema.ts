interface AbilitySchema {
    id: string,
    type: string,
    name: string,
    damage: {
        type: string,
        base: number
    },
    cost: {
        ap: number,
    },
}

export default AbilitySchema;
