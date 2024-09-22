import PlayerSchema from "../schemas/PlayerSchema"
import { useEffect, useState } from "react";

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
    const [status, setStatus] = useState('');

    const checkIfTargeted = () => {
        for(let i = 0; i < selectedTargets.length; i++) {
            if(selectedTargets[i] === player.pid) return true;
        }
        return false;
    }

    useEffect(() => {
        setStatus('damaged');
        setTimeout(() => setStatus(''), 600);
    }, [player.stats.combat.health.cur]);

    return (
        <div 
            className={`player ${status} ${checkIfTargeted() ? "target" : ""}`} 
            onClick={() => selectPlayer({state: player, index})}
            onContextMenu={(e) => {
                e.preventDefault();
                selectTarget(player.pid)
            }}
        >
            <div className="emptyBar">
                <div style={{width: 100 / player.stats.combat.health.max * player.stats.combat.health.cur}} className="health">
                    <p style={{fontSize: "10px", whiteSpace: "nowrap", marginLeft: "10px"}} >{player.stats.combat.health.cur} / {player.stats.combat.health.max}</p>
                </div>
            </div>
        </div>
    )
}
