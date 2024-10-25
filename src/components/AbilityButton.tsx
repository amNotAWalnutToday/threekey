import { useState, useContext } from "react";
import UserContext from "../data/Context"
import AbilitySchema from "../schemas/AbilitySchema";
import combatFns from "../utils/combatFns";

const { assignAbilityLevelStats, getAbilityRef } = combatFns;

type Props = {
    selectTargetByAbility: (abilityType: string) => void;
    ability: AbilitySchema;
    click: () => void;
}

export default function AbilityButton({ability, selectTargetByAbility, click}: Props) {
    const { character } = useContext(UserContext);
    const [showTooltip, setShowTooltip] = useState(false);

    const getLeveledAbilityStats = () => {
        const abilityLevel = getAbilityRef(character, ability.id).state.level;
        if(!abilityLevel) return;
        return assignAbilityLevelStats(ability.damage, abilityLevel, ability.damageType, ability.id);
    }

    const getAmount = () => {
        if(ability.damageType === "heal") {
            return `${getLeveledAbilityStats()} heal`
        } else if(ability.damageType === "damage") {
            return `${getLeveledAbilityStats()}% DMG`
        } else if(ability.damageType === "status") {
            return `${ability?.description} of ${getLeveledAbilityStats()}`
        }
    }

    return (
        <button 
            onClick={click} 
            onMouseEnter={() => {
                selectTargetByAbility(ability.type)
                setShowTooltip(() => true);
            }}
            onMouseLeave={() => setShowTooltip(() => false)}
            className="ability_btn"
        >
            {ability.name}
            {showTooltip
            &&
            <div className="tooltip" >
                <p>Targets: {ability.type}</p>
                <p>{getAmount()}</p>
                <p className="uncommon_text" >{ability.av}AP</p>
                <p className="red_text" >{ability.cost.health && `${ability.cost.health}Hp`}</p>
                <p className="rare_text" >{ability.cost.mana && `${ability.cost.mana}Mp`}</p>
            </div>
            }
        </button>
    )
}