type Props = {
    max: number,
    cur: number,
    type: string,
    index: number,
}

export default function ResourceBar({max, cur, type, index}: Props) {
    const getWidth = () => {
        const updatedCur = type === "shield" ? cur * 2 : cur; 
        const width = Math.min(100 / max * updatedCur, 100);
        return width;
    }

    return max ? (
        <div className={`emptyBar ${type}`}>
            <div style={{width: getWidth()}} className={`${type}_fill`}>
                {type !== "shield" && <p style={{fontSize: "10px", whiteSpace: "nowrap", marginLeft: "10px"}} >{cur} / {max}</p>}
            </div>
        </div>
    ) : null
}