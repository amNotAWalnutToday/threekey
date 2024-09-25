interface StatusSchema {
    name: string,
    type: "dot" | "buff" | "debuff",
    amount: number, 
    duration: number,
}

export default StatusSchema;