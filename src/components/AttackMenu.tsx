import PlayerSchema from "../schemas/PlayerSchema";
import AbilitySchema from "../schemas/AbilitySchema";

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

    const checkCanUseAbility = (ability: AbilitySchema, player: PlayerSchema) => {
        const { health, resources } = player.stats.combat;
        const { mana, psp, msp, soul } = resources;
        const usedResources = [];

        for(const cost in ability.cost) usedResources.push(cost);
        for(const cost of usedResources) {
            switch(cost) {
                case "mana":
                    if(!mana || !ability.cost.mana) return;
                    if(mana.cur < ability.cost.mana) return false;
                    break;
                case "health":
                    if(!health || !ability.cost.health) return;
                    if(health.cur < ability.cost.health) return false;
                    break;
            }
        }

        return true;
    }

    const mapAbilities = () => {
        return selectedPlayer?.state.abilities.map((ability, ind) => {
            return (
                <button 
                    key={`ability-${ind}`}
                    onClick={() => { 
                        if(!checkCanUseAbility(ability, selectedPlayer.state)) return;
                        target(Array.from(selectedTargets), ability);
                    }} 
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