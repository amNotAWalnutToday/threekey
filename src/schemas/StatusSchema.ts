interface StatusSchema {
    name: string,
    type: string, //"dot" | "buff" | "debuff",
    amount: number, 
    duration: number,
    affects: string[],
    refs: string[],
}

export default StatusSchema;