import { useState } from "react"
import AbilityTooltip from "./AbilityTooltip"
import combatFns from "../utils/combatFns"
import AbilitySchema from "../schemas/AbilitySchema"

const { getAbility } = combatFns

interface Category {
    name: string, 
    level: number,
    requirements: {id: string, amount: number}[],
    pre?: string,
    id?: string,
}

type Props = {
    category: Category;
    selected: boolean;
    index: number;
    groupIndex: number;
    click: () => void;
    hasTooltip?: boolean;
}

export default function Category({category, selected, groupIndex, index, hasTooltip, click}: Props) {
    const [showTooltip, setShowTooltip] = useState(false);

    const passAbility = () => {
        const ability = getAbility(category.id ?? category.name);
        if(!ability) return {} as AbilitySchema;
        return ability;
    }
    
    return (
        <div className="tree_special_tooltip_holder" >
            { groupIndex === 0
            &&
            <h2 className="category_title" >Tier {index + 1}</h2>
            }
            <div
                className={`box category_box ${selected ? 'selected' : ''}`}
                onClick={click}
                onMouseEnter={() => setShowTooltip(() => true)}
                onMouseLeave={() => setShowTooltip(() => false)}
            >
                <p>{category.name}</p>
                <p>{category.level}</p>
            </div>
            {showTooltip && hasTooltip
                &&
                <AbilityTooltip
                    ability={passAbility()}
                />
            }
        </div>
    )
}