import { useState, useContext, useEffect } from "react";
import UserContext from "../data/Context";
import TownSchema from "../schemas/TownSchema";
import townFns from "../utils/townFns";
import combatFns from "../utils/combatFns";
import Item from "./Item";
import PlayerSchema from "../schemas/PlayerSchema";
import AbilitySchema from "../schemas/AbilitySchema";

const { populateItem, removeItem, getItem, getAbility, getAbilityRef } = combatFns;
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
    id?: string,
}

export default function Tree({town, uploadCharacter}: Props) {
    const { character } = useContext(UserContext);
    const [categories, setCategories] = useState<Category[][]>([]);
    const [selectedSkill, setSelectedSkill] = useState({} as Category);
    const [selectedTab, setSelectedTab] = useState("");

    const selectTab = (tab: string) => {
        setSelectedTab(() => tab);
        setSelectedSkill(() => ({} as Category));
    }

    const sortItems = (items: Category[]): Category[] => {
        const sorted: Category[] = [];
        const visited: { [key: string]: boolean } = {};
        
        function visit(item: Category) {
            if (!visited[item.name]) {
                visited[item.name] = true;
                if (item.pre) {
                    const dependency = items.find(i => { 
                        let isHere = false;
                        if(i.name === item.pre) isHere = true;
                        if(i?.id === item.pre) isHere = true;
                        return isHere;
                    });
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

    const groupItems = (sortedItems: Category[], byId?: boolean): Category[][] => {
        const categories: Category[][] = [];
        const itemToCategory: { [key: string]: number } = {};
        
        sortedItems.forEach(item => {
            const itemToCategoryIndex = !byId ? item.name : item?.id ?? ""; 
            if (item.pre && itemToCategory[item.pre] !== undefined) {
                const categoryIndex = itemToCategory[item.pre];
                categories[categoryIndex].push(item);
                itemToCategory[itemToCategoryIndex] = categoryIndex;
            } else {
                const newCategoryIndex = categories.length;
                categories.push([item]);
                itemToCategory[itemToCategoryIndex] = newCategoryIndex;
            }
        });
        
        return categories;
    }

    const assignTownCategories = () => {
        const levelsArray: Category[] = [];
        
        Object.entries(town).forEach(([key, value]) => {
            const pre = key === "storage" ? "inn" : undefined;
            const itemIds = ["002", "003", "004", "005", "006"];
            const id = itemIds[value.level] ?? "";
            const requirements = id.length ? [{id, amount: 5}] : [];
            const building = { level: value.level, name: key, pre, requirements };
            levelsArray.push(building);
        });
        
        const sortedItems = sortItems(levelsArray);
        const grouped = groupItems(sortedItems);
        
        setCategories(() => grouped);
        return grouped;
    }

    const assignAbilityCategories = () => {
        const abilities = Array.from(character.abilities, (ref) => {
            const ability = getAbility(ref.id) ?? {} as AbilitySchema;
            const itemIds = ability.unlocks?.req;
            const idIndex = Math.floor(ref.level / 10);
            const safeIndex = Math.min(idIndex, itemIds.length - 1);
            const id = itemIds[safeIndex].id;
            const requirements = [{id, amount: Math.max(ref.level % 10, 1)}];
            if(requirements[0].amount < 0) requirements[0].amount = 1; 
            const category: Category = { 
                level: ref.level,
                name: ability?.name ?? "",
                requirements: requirements ?? [],
                pre: ability?.unlocks.pre,
                id: ability?.id,
            };
            return category;
        });
        const sortedItems = sortItems(abilities);
        const grouped = groupItems(sortedItems, true);

        setCategories(() => grouped);
    }

    const assignExplorationCategories = () => {
        setCategories(() => []);
    }

    const mapTownTree = () => {
        if(!town) return;
        return categories.map((category, gIndex) => {
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
                        onClick={() => setSelectedSkill({name: building.name, level: building.level, requirements: building.requirements, id: building.id ?? ''})}
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
            const fromInventory = getItem(character.inventory, req).state;
            if(!fullItem) return;
            return req.id.length ? (
                <Item 
                    key={`req-${index}`}
                    item={fullItem}
                    amount={fromInventory?.amount ?? 0}
                    requiredAmount={req.amount}
                    selected={false}
                />
            ) : (
                <p
                    key={`req-${index}`}
                >
                    MAX!
                </p>
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

    const levelUpBuilding = () => {
        if(checkRequirements()) return;
        const updatedBuilding = assignBuildingLevel(selectedSkill);
        setSelectedSkill(updatedBuilding);
        let updatedPlayer = {...character};
        for(const req of selectedSkill.requirements) {
            updatedPlayer = removeItem(updatedPlayer, req);
        }
        uploadCharacter(updatedPlayer);
    }

    const levelUpAbility = () => {
        if(checkRequirements()) return;
        const ability = getAbilityRef(character, selectedSkill?.id ?? '');
        ability.state.level++;
        if(ability.index < 0) return;
        let updatedCharacter = {...character};
        updatedCharacter.abilities[ability.index] = ability.state;
        for(const req of selectedSkill.requirements) {
            updatedCharacter = removeItem(updatedCharacter, req);
        }
        uploadCharacter(updatedCharacter);
    }

    useEffect(() => {
        if(selectedTab === "town") assignTownCategories();
        /*eslint-disable-next-line*/
    }, [town]);

    useEffect(() => {
        if(selectedTab === "ability") assignAbilityCategories();
        /*eslint-disable-next-line*/
    }, [character]);
    
    return (
        <div className="menu inventory tree_menu center_abs_hor" >
            <div className="skill_tree" >
                { mapTownTree() }
            </div>
            <div className="cen-flex" >
                { mapRequirements() }
            </div>
            {selectedSkill?.requirements?.length 
            ?
            <button 
                    className="menu_btn" 
                    onClick={() => { 
                        switch(selectedTab) {
                            case "town":
                                levelUpBuilding()
                                break;
                            case "ability":
                                levelUpAbility()
                                break;
                        }
                    }}
                    disabled={checkRequirements()}
            >
                Level Up
            </button>
            : <p>MAX!</p>}
            <div className="tree_btn_bar" >
                <button 
                    className="menu_btn" 
                    onClick={() => { 
                        //TBA
                        assignTownCategories();
                        selectTab("town")
                    }}
                    disabled={selectedTab === "town"}
                >
                    Town
                </button>
                <button 
                    className="menu_btn" 
                    onClick={() => { 
                        //TBA
                        assignAbilityCategories();
                        selectTab("ability")
                    }}
                    disabled={selectedTab === "ability"}
                >
                    Abilities
                </button>
                <button 
                    className="menu_btn" 
                    onClick={() => { 
                        //TBA
                        assignExplorationCategories();
                        selectTab("exploration")
                    }}
                    disabled={selectedTab === "exploration"}
                >
                    Exploration
                </button>
            </div>
        </div>
    )
}