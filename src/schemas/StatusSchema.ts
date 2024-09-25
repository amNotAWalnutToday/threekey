interface StatusSchema {
    name: string,
    type: "dot" | "buff" | "debuff",
    amount: number, 
    duration: number,
    affects: string[],
    refs: string[],
}

export default StatusSchema;