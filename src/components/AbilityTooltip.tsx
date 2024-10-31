import { useContext } from "react";
import UserContext from "../data/Context"
import AbilitySchema from "../schemas/AbilitySchema";
import combatFns from "../utils/combatFns";
import statusData from '../data/statuses.json';

const { assignAbilityLevelStats, getAbilityRef, getStatus } = combatFns;

type Props = {
    ability: AbilitySchema;
}

export default function AbilityTooltip({ability}: Props) {
    const { character } = useContext(UserContext);
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
            const status = getStatus(statusData.all, ability.id);
            if(status.state.type === "cc") {
                return `${ability?.description} of ${getLeveledAbilityStats}%`
            } else {
                return `${ability?.description} of ${getLeveledAbilityStats()}`
            }
        }
    }
    
    return (
        <div className="tooltip" >
            <p>{ability.name}</p>
            <p>Targets: {ability.type}</p>
            <p>{getAmount()}</p>
            <p className="uncommon_text" >{ability.av}AP</p>
            <p className="red_text" >{ability.cost.health && `${ability.cost.health} %Hp`}</p>
            <p className="aqua_text" >{ability.cost.shield && `${ability.cost.shield} % Shield`}</p>
            <p className="rare_text" >{ability.cost.mana && `${ability.cost.mana}Mp`}</p>
            <p className="red_text" >{ability.cost.psp && `${ability.cost.psp} OH`}</p>
            <p className="rare_text" >{ability.cost.msp && `${ability.cost.msp} OL`}</p>
            <p className="rare_text" >{ability.cost.soul && `${ability.cost.soul} SOUL`}</p>
        </div>
    )
}