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

    const mapAbilities = () => {
        return selectedPlayer?.state.abilities.map((ability, ind) => {
            return (
                <button 
                    key={`ability-${ind}`}
                    onClick={() => target(Array.from(selectedTargets))} 
                    onMouseEnter={() => selectTargetByAbility(ability.type)}
                    className="btn"
                >
                    {ability.name}
                </button>
            )
        });
    }

    return (
        <div className="sidemenu" >
            <div>
                <p>{selectedPlayer?.state.username ?? "*_____*"}</p>
            </div> 
            { mapAbilities() }
        </div>
    )
}