type Props = {
    max?: number,
    cur?: number,
    type: string,
    index: number,
}

export default function ResourceBar({max, cur, type, index}: Props) {
    return max && cur ? (
        <div className="emptyBar">
            <div style={{width: Math.min(100 / max * cur, 100)}} className={`${type}_fill`}>
                <p style={{fontSize: "10px", whiteSpace: "nowrap", marginLeft: "10px"}} >{cur} / {max}</p>
            </div>
        </div>
    ) : null
}