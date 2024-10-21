import { useState, useContext } from "react";
import UserContext from "../data/Context";
import TownSchema from "../schemas/TownSchema";
import townFns from "../utils/townFns";
import combatFns from "../utils/combatFns";
import Item from "./Item";
import PlayerSchema from "../schemas/PlayerSchema";

const { populateItem, removeItem } = combatFns;
const { assignBuildingLevel } = townFns

type Props = {
    town: TownSchema;
    uploadCharacter: (character: PlayerSchema) => void;
}

interface Category {
    name: string, 
    level: number,
    requirements: {id: string, amount: number}[],
    pre?: string,
}

export default function Tree({town, uploadCharacter}: Props) {
    const { character } = useContext(UserContext);
    const [categories, setCategories] = useState<Category[][]>([]);
    const [selectedSkill, setSelectedSkill] = useState({} as Category);


    const sortItems = (items: Category[]): Category[] => {
        const sorted: Category[] = [];
        const visited: { [key: string]: boolean } = {};
        
        function visit(item: Category) {
            if (!visited[item.name]) {
                visited[item.name] = true;
                if (item.pre) {
                    const dependency = items.find(i => i.name === item.pre);
                    if (dependency) {
                        visit(dependency);
                    }
                }
                sorted.push(item);
            }
        }
        items.forEach(item => visit(item));
        return sorted;
    }

    const groupItems = (sortedItems: Category[]): Category[][] => {
        const categories: Category[][] = [];
        const itemToCategory: { [key: string]: number } = {};
        
        sortedItems.forEach(item => {
            if (item.pre && itemToCategory[item.pre] !== undefined) {
                const categoryIndex = itemToCategory[item.pre];
                categories[categoryIndex].push(item);
                itemToCategory[item.name] = categoryIndex;
            } else {
                const newCategoryIndex = categories.length;
                categories.push([item]);
                itemToCategory[item.name] = newCategoryIndex;
            }
        });
        
        return categories;
    }

    const mapTownTree = () => {
        if(!town) return;
        const levelsArray: Category[] = [];
        
        Object.entries(town).forEach(([key, value]) => {
            const pre = key === "storage" ? "inn" : undefined;
            const requirements = [{id: "002", amount: 5}];
            const building = { level: value.level, name: key, pre, requirements };
            levelsArray.push(building);
        });
        
        const sortedItems = sortItems(levelsArray);
        const grouped = groupItems(sortedItems);

        return grouped.map((category, gIndex) => {
            return (
                <div
                    key={`group-${gIndex}`}
                    className="tree_group"
                >
                    { mapCategories(category, gIndex) }
                </div>
            )
        })
    }

    const mapCategories = (category: Category[], groupIndex: number) => {
        return category.map((building, index) => {
            return (
                <div 
                    key={`building-${groupIndex}-${index}`}
                >
                    { groupIndex === 0 
                    &&
                    <h2 className="category_title" >Tier {index}</h2>
                    }
                    <div
                        className={`box ${building.name === selectedSkill.name ? 'selected' : ''}`}
                        onClick={() => setSelectedSkill({name: building.name, level: building.level, requirements: building.requirements})}
                    >
                        <p>{building.name}</p>
                        <p>{building.level}</p>
                    </div>
                </div>
            )
        });
    }

    const mapRequirements = () => {
        if(!selectedSkill.name) return;
        return selectedSkill.requirements.map((req, index) => {
            const fullItem = populateItem(req);
            if(!fullItem) return;
            return (
                <Item 
                    key={`req-${index}`}
                    item={fullItem}
                    amount={req.amount}
                    selected={false}
                />
            )
        });
    }

    const checkRequirements = () => {
        let error = true;
        for(const req of selectedSkill.requirements) {
            for(const item of character.inventory) {
                if(req.id === item.id && item.amount >= req.amount) error = false; 
            }
        }
        return error;
    }
    
    return (
        <div className="menu inventory tree_menu center_abs_hor" >
            { mapTownTree() }
            { mapRequirements() }
            <button 
                    className="menu_btn" 
                    onClick={() => { 
                        if(checkRequirements()) return;
                        const updatedBuilding = assignBuildingLevel(selectedSkill);
                        setSelectedSkill(updatedBuilding);
                        let updatedPlayer = {...character};
                        for(const req of selectedSkill.requirements) {
                            updatedPlayer = removeItem(updatedPlayer, req);
                        }
                        uploadCharacter(updatedPlayer);
                    }}
            >
                Level Up
            </button>
        </div>
    )
}