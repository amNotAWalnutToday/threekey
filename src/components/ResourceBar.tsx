type Props = {
    max?: number,
    cur?: number,
    type: string,
    index: number,
}

export default function ResourceBar({max, cur, type, index}: Props) {
    return max && cur ? (
        <div className="emptyBar" style={{ transform: 'translate(01)' }}>
            <div style={{width: 100 / max * cur}} className={`${type}_fill`}>
                <p style={{fontSize: "10px", whiteSpace: "nowrap", marginLeft: "10px"}} >{cur} / {max}</p>
            </div>
        </div>
    ) : null
}