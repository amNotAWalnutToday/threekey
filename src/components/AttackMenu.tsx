import PlayerSchema from "../schemas/PlayerSchema"

type Props = {
    selectedPlayer: { state: PlayerSchema, index: number } | null
    selectedTargets: string[],
    target: (targets: string[]) => void;
    selectTargetByAbility: (ability: string) => void;
}

export default function AttackMenu(
    {
        selectedPlayer, 
        selectedTargets,
        target, 
        selectTargetByAbility
    }: Props
) {
    return (
        <div className="sidemenu" >
            <div>
                <p>{selectedPlayer?.state.username ?? "*_____*"}</p>
            </div> 
            <button 
                onClick={() => target(Array.from(selectedTargets[0]))} 
                onMouseEnter={() => selectTargetByAbility('single')}
                className="btn"
            >
                    Attack
            </button>
            <button 
                onClick={() => target(Array.from(selectedTargets))} 
                onMouseEnter={() => selectTargetByAbility('aoe')}
                className="btn"
            >
                    AoE Attack
            </button>
        </div>
    )
}