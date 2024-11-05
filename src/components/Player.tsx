import { useEffect, useState } from "react";
import PlayerSchema from "../schemas/PlayerSchema";
import ResourceBar from "./ResourceBar";
import StatusBox from "./StatusBox";

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
    const [prevHealth, setPrevHealth] = useState(player.stats.combat.health.cur);

    const checkIfTargeted = () => {
        for(let i = 0; i < selectedTargets.length; i++) {
            if(selectedTargets[i] === player.pid) return true;
        }
        return false;
    }

    useEffect(() => {
        if(player.stats.combat.health.cur < prevHealth) setStatus('damaged');
        else if(player.stats.combat.health.cur > prevHealth) setStatus('healed');
        else return;

        setPrevHealth(player.stats.combat.health.cur);
        setTimeout(() => setStatus(''), 600);
    }, [player.stats.combat.health.cur, prevHealth]);

    useEffect(() => {
        setStatus('attacking');
        setTimeout(() => setStatus(''), 600);
    }, [player.isAttacking]);

    return (
        <div 
            className={`${player.npc ? "enemy" : "player"} ${player.npc ? `${player.name.split(" ").join("_").toLowerCase()}` : ""} ${player.role} ${status} ${checkIfTargeted() ? "target" : ""} back ${player.dead || player.stats.combat.health.cur <= 0 ? "dead" : ""}`} 
            onClick={() => selectPlayer({state: player, index})}
            onContextMenu={(e) => {
                e.preventDefault();
                selectTarget(player.pid)
            }}
        >
            {player.stats.combat.shield.cur > 0 
            &&
            <ResourceBar
                max={player.stats.combat.shield.max + player.stats.combat.health.max}
                cur={player.stats.combat.shield.cur}
                type={"shield"}
                index={1}
            />
            }
            <ResourceBar
                max={player.stats.combat.health.max}
                cur={player.stats.combat.health.cur}
                type={"health"}
                index={1}
            />
            <ResourceBar
                max={player.stats.combat.resources?.mana?.max}
                cur={player.stats.combat.resources?.mana?.cur}
                type={"mana"}
                index={5}
            />
            <ResourceBar
                max={player.stats.combat.resources?.soul?.max}
                cur={player.stats.combat.resources?.soul?.cur}
                type={"soul"}
                index={5}
            />
            <div className="cen-flex">
                <ResourceBar
                    max={player.stats.combat.resources?.psp?.max}
                    cur={player.stats.combat.resources?.psp?.cur}
                    type={"overheat"}
                    index={5}
                />
                <ResourceBar
                    max={player.stats.combat.resources?.msp?.max}
                    cur={player.stats.combat.resources?.msp?.cur}
                    type={"overload"}
                    index={5}
                />
            </div>
            <div className="status_bar">
                { player?.status?.map((status, index) => {
                    return (
                        <StatusBox
                            key={`status-${player.pid}-${index}`}
                            status={status}
                        />
                    )
                }) }
            </div>
        </div>
    )
}
