import { useEffect, useState } from "react";
import PlayerSchema from "../schemas/PlayerSchema";
import AbilitySchema from "../schemas/AbilitySchema";
import combatFns from "../utils/combatFns";
import AbilityButton from "./AbilityButton";

const { getAbility, getAbilityRef } = combatFns;

type Props = {
    selectedPlayer: { state: PlayerSchema, index: number } | null;
    selectedTargets: string[];
    target: (targets: string[], ability: AbilitySchema) => void;
    selectTargetByAbility: (ability: string) => void;
    actionValue: number;
}

export default function AttackMenu(
    {
        selectedPlayer, 
        selectedTargets,
        target, 
        selectTargetByAbility,
        actionValue,
    }: Props
) {
    const [abilities, setAbilities] = useState<AbilitySchema[]>([]);

    useEffect(() => {
        if(!selectedPlayer) return;
        if(!selectedPlayer.state) return;
        const uiAbilities: AbilitySchema[] = [];
        for(const abilityId of selectedPlayer.state.abilities) {
            const ability = getAbility(abilityId.id);
            if(!ability) continue;
            uiAbilities.push(ability);
        }
        setAbilities(() => uiAbilities);
        /*eslint-disable-next-line*/
    }, [selectedPlayer]);

    const checkCanUseAbility = (ability: AbilitySchema, player: PlayerSchema) => {
        if(player.dead) return false; 
        const { health, shield, resources } = player.stats.combat;
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
                    if(health.cur < Math.ceil((health.max / 100) * ability.cost.health)) return false;
                    break;
                case "shield":
                    if(!shield || !ability.cost.shield) return;
                    if(shield.cur < Math.ceil((shield.max / 100) * ability.cost.shield)) return false;
                    break;
                case "psp":
                    if(!psp || !ability.cost?.psp) return;
                    if(psp.cur < ability.cost.psp) return false;
                    break;
                case "msp":
                    if(!msp || !ability.cost?.msp) return;
                    if(msp.cur < ability.cost.msp) return false;
                    break;
            }
        }

        return true;
    }

    const mapAbilities = () => {
        if(!abilities.length) return;
        if(!selectedPlayer) return;
        return abilities.map((ability, ind) => {
            const abilityRef = getAbilityRef(selectedPlayer.state, ability.id);
            if(!abilityRef.state.level) return;
            function clickHandler() {
                if(!selectedTargets.length) return;
                if(!selectedPlayer) return;
                if(!checkCanUseAbility(ability, selectedPlayer.state)) return;
                target(Array.from(selectedTargets), ability);
            }
            return (
                <AbilityButton
                    key={`ability-${ind}`}
                    selectTargetByAbility={selectTargetByAbility}
                    ability={ability}
                    click={clickHandler}
                />
            )
        });
    }

    return (
        <div className="sidemenu gamelog" >
            {/* <div>
                <p>{selectedPlayer?.state?.name ?? "*_____*"}</p>
            </div>  */}
            <div className="attacks_menu">
                <h2 className="grid_header" >Action Points: {actionValue}</h2>
                { mapAbilities() }
            </div>
        </div>
    )
}