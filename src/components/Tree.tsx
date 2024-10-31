import { useState, useContext, useEffect } from "react";
import UserContext from "../data/Context";
import TownSchema from "../schemas/TownSchema";
import townFns from "../utils/townFns";
import combatFns from "../utils/combatFns";
import Item from "./Item";
import PlayerSchema from "../schemas/PlayerSchema";
import AbilitySchema from "../schemas/AbilitySchema";
import AbilityTooltip from "./AbilityTooltip";
import Category from "./Category";

const { populateItem, removeItem, getItem, getAbility, getAbilityRef, getRank, getRankValue} = combatFns;
const { assignBuildingLevel } = townFns

type Props = {
    town: TownSchema;
    uploadCharacter: (character: PlayerSchema) => void;
    logMessage: (message: string) => void;
}

interface Category {
    name: string, 
    level: number,
    requirements: {id: string, amount: number}[],
    pre?: string,
    id?: string,
}

export default function Tree({town, uploadCharacter, logMessage}: Props) {
    const { character } = useContext(UserContext);
    const [categories, setCategories] = useState<Category[][]>([]);
    const [selectedSkill, setSelectedSkill] = useState({} as Category);
    const [selectedTab, setSelectedTab] = useState("");
    const [selectedRankReq, setSelectedRankReq] = useState("");

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
            const amount = key === "inn" && value.level === 0 ? 1 : 5;
            const requirements = id.length ? [{id, amount}] : [];
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
            const idIndex = Math.floor(ref.level / 20);
            const safeIndex = Math.min(idIndex, itemIds.length - 1);
            const id = itemIds[safeIndex].id;
            const amount = Math.max(ref.level % 20, 1);
            const requirements = [{id, amount: amount}];
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

    const mapCategories = (group: Category[], groupIndex: number) => {
        return group.map((category, index) => {
            return (
                <Category
                    key={`building-${groupIndex}-${index}`}
                    category={category}
                    selected={selectedSkill.name === category.name}
                    index={index}
                    groupIndex={groupIndex}
                    hasTooltip={selectedTab !== "town"}
                    click={() => {
                        setSelectedSkill({name: category.name, level: category.level, requirements: category.requirements, id: category.id ?? '', pre: category.pre})
                        setSelectedRankReq(`${getRank(Math.min(index * 2, 7))}`)
                    }}
                />
            )
        });
    }

    const splitAtFirstNumber = (input: string): [string, string] => {
        const match = input.match(/(\d)/);
        if (match) {
            const index = match.index!;
            return [input.slice(0, index), input.slice(index)];
        }
        return [input, ''];
    }

    const matchIdToTree = (id: string) => {
        switch(id) {
            case "P":
                return "plants";
            case "I":
                return "insects";
            case "W":
                return "weather";
            case "OH":
                return "overheat";
            case "OL":
                return "overload";
            case "SH":
                return "shield";
            case "SP":
                return "spirits";
            case "D":
                return "divinity";
            case "A":
                return "abyssal";
        }
        return "";
    }

    const getRequiredAmount = (amount: number, id: string) => {
        const townReqs = ["002", "003", "004", "005", "006"];
        if(townReqs.includes(id)) return amount;
        const currentSkillTree = matchIdToTree(splitAtFirstNumber(selectedSkill?.id ?? "")[0]);
        const requiredAmount = currentSkillTree === character.order[0] ? amount : currentSkillTree === character.order[1] ? amount * 2 : amount * 3
        return requiredAmount
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
                    requiredAmount={getRequiredAmount(req.amount, req.id)}
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
                const requiredAmount = getRequiredAmount(req.amount, req.id);
                if(req.id === item.id && item.amount >= requiredAmount) error = false; 
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
        logMessage(`${character.name} has leveled up the town skill ${selectedSkill.name}`);
    }

    const levelUpAbility = () => {
        if(checkRequirements()) return;
        if(getRankValue(character.stats.rank) < getRankValue(selectedRankReq)) return;
        const ability = getAbilityRef(character, selectedSkill?.id ?? '');
        const preAbility = getAbilityRef(character, selectedSkill?.pre ?? '');
        if(preAbility.index >= 0 && preAbility.state.level <= ability.state.level) return;
        ability.state.level++;
        if(ability.index < 0) return;
        let updatedCharacter = {...character};
        updatedCharacter.abilities[ability.index] = ability.state;
        for(const req of selectedSkill.requirements) {
            req.amount = getRequiredAmount(req.amount, req.id);
            updatedCharacter = removeItem(updatedCharacter, req);
        }
        uploadCharacter(updatedCharacter);
        logMessage(`${character.name} has leveled up the skill ${selectedSkill.name}`);
        setSelectedSkill(() => ({} as Category));
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
            <div className={`cen-flex tree_reqs`} >
                {selectedRankReq && 
                <p
                    className={`${getRankValue(character.stats.rank) < getRankValue(selectedRankReq) ? "red_text" : "uncommon_text"}`}
                >
                    Rank: {character.stats.rank} / {selectedRankReq}
                </p>}
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