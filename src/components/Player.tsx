import PlayerSchema from "../schemas/PlayerSchema"

type Props = {
    player: PlayerSchema,
    index: number,
    selectedTargets: string[]
    selectPlayer: (player: { state: PlayerSchema, index: number } | null) => void,
    selectTarget: (target: string) => void,
}

export default function Player(
    {
        player, 
        index, 
        selectedTargets,
        selectPlayer, 
        selectTarget
    }: Props
) {
    const checkIfTargeted = () => {
        for(let i = 0; i < selectedTargets.length; i++) {
            if(selectedTargets[i] === player.pid) return true;
        }
        return false;
    }

    return (
        <div 
            className={`player ${checkIfTargeted() ? "target" : ""}`} 
            onClick={() => selectPlayer({state: player, index})}
            onContextMenu={(e) => {
                e.preventDefault();
                selectTarget(player.pid)
            }}
        >
            <div className="emptyBar">
                <div style={{width: player.stats.combat.health.cur}} className="health">
                    <p style={{fontSize: "10px"}} >{player.stats.combat.health.cur} / {player.stats.combat.health.max}</p>
                </div>
            </div>
        </div>
    )
}
