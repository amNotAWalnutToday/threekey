import { useRef, useEffect } from 'react'; 
import ActionSchema from "../schemas/ActionSchema"
import PlayerSchema from "../schemas/PlayerSchema";
import combatFns from "../utils/combatFns";

const { getPlayer } = combatFns;

type Props = {
    actionQueue: ActionSchema[],
    players: PlayerSchema[],
    enemies: PlayerSchema[],
}

export default function ActionQueue({actionQueue, players, enemies}: Props) {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(container === null || container.current === null) return;
        container.current.scrollTo(
            0,
            container.current.offsetHeight + (actionQueue.length * 1000)
        );
    }, [actionQueue]);

    const mapActionQueue = () => {
        if(!actionQueue?.length) return;
        return actionQueue.map((action, index) => {
            if(index === 0) return;
            const user = getPlayer([...players, ...enemies], action.user);
            return (
                <div
                    key={`action-${index}`}
                    className="action"
                >
                    <p>{user.state.name}</p>
                    <hr />
                    <p>{action.ability}</p>
                </div>
            )
        });
    }
    
    return (
        <div className="action_queue" >
            <div className="action_group" ref={container} >{mapActionQueue()}</div>
        </div>
    )
}