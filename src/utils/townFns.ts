import { onValue, ref, set } from "firebase/database";
import TownSchema from "../schemas/TownSchema";
import accountFns from "./accountFns";
import itemData from '../data/items.json';
import QuestSchema from "../schemas/QuestSchema";

const { db } = accountFns;
const template = {} as TownSchema;

interface Building {
    name: string,
    level: number,
    requirements: {id: string, amount: number}[],
}

interface QuestsCompleted {
    pid: string,
    name: string,
    amount: number,
    score: number,
}

export default (() => {
    const createTown = (
        levels: {[key: string]: number},
        inventory: {id: string, amount: number}[],
        quests: QuestSchema[],
        questsCompleted: [],
        cancelCd: number
    ) => {
        const town: TownSchema = {
            storage: {
                level: levels.storage ?? 0,
                inventory: inventory ?? [],
            },
            inn: {
                level: levels.inn ?? 0,
            },
            guild: {
                level: levels.guild ?? 0,
                quests: quests ?? [],
                questsCompleted: questsCompleted ?? [],
                cancelCd: cancelCd ?? 0
            },
            shop: {
                level: levels.shop ?? 0,
            }
        }
        // const reference = ref(db, `/town/`) 
        // set(reference, town);
        return town;
    }

    const connectTown = async (
        setTown: React.Dispatch<React.SetStateAction<TownSchema>>,
    ) => {
        try {
            const townRef = ref(db, `/town/`);
            await onValue(townRef, async (snapshot) => {
                const data = await snapshot.val();
                if(!data) return data;
                const [storageLvl, innLvl, guildLvl, shopLvl] = [data.storage.level, data.inn.level, data.guild.level, data.shop.level];
                const updatedTown = createTown({storage: storageLvl, inn: innLvl, guild: guildLvl, shop: shopLvl }, data.storage.inventory, data.guild.quests, data.guild.questsCompleted, data.guild.cancelCd);
                setTown(() => {
                    console.log(updatedTown);
                    return updatedTown
                });
            });
        } catch(e) {
            return console.error(e);
        }
    }

    const createQuestCompletion = (pid: string, name: string, amount: number, score: number) => {
        const completedQuest = {
            pid: pid ?? "",
            name: name ?? "",
            amount: amount ?? 0,
            score: score ?? 0,
        }
        return completedQuest;
    }

    const createQuest = (item: {id: string, amount: number}, rank: number, reward?: {id: string, amount: number}) => {
        const quest = {
            item: item ?? { 
                id: "",
                amount: 0
            },
            rank: rank ?? 0,
            reward: reward ?? {
                id: "",
                amount: 0
            }
        }

        return quest;
    }

    const getQuestItem = (guildLvl: number) => {
        const possibleQuests = [];
        for(const item of itemData) {
            if(!item.questRank) continue;
            if(Math.floor(item.questRank / 2) + 1 <= guildLvl) {
                const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
                const rareValue = Math.max(rarities.indexOf(item.rarity), 1);
                const amount = Math.ceil(Math.random() * ((item.questRank * 2) / rareValue))
                const convertedItem = { id: item.id, amount }
                possibleQuests.push(createQuest(convertedItem, item.questRank));
            }
        }
        const chance = Math.floor(Math.random() * possibleQuests.length);
        return possibleQuests[chance];
    }

    const getQuestScore = (questsCompleted: QuestsCompleted[], pid: string, name: string) => {
        for(let i = 0; i < questsCompleted.length; i++) {
            if(pid === questsCompleted[i].pid
            && name === questsCompleted[i].name) return questsCompleted[i].score;
        }
        return 0;
    }

    const getShopStock = (shopLvl: number) => {
        const stock = [];
        for(const item of itemData) {
            if(!item.shopLevel) continue;
            if(item.shopLevel <= shopLvl) {
                const convertedItem = { id: item.id, amount: 999 }
                stock.push(convertedItem);
            }
        }

        return stock;
    }

    const removeStoredItem = (inventory: typeof template.storage.inventory, item: {id: string, amount: number}) => {
        let shouldRemoveFullStack = false;
        let itemIndex = -1;
        for(let i = 0; i < inventory.length; i++) {
            if(inventory[i].id === item.id) {
                if(item.amount >= inventory[i].amount) { 
                    shouldRemoveFullStack = true;
                    itemIndex = i;
                }
                else inventory[i].amount -= item.amount;
            }
        }
        if(shouldRemoveFullStack) {
            inventory.splice(itemIndex, 1);
        }
        return inventory;
    }

    const assignItemToStorage = (inventory: typeof template.storage.inventory, item: {id:string, amount:number}) => {
        let inInventory = false;
        for(let i = 0; i < inventory.length; i++) {
            if(inventory[i].id === item.id) {
                inventory[i].amount += item.amount;
                inInventory = true;
            }
        }
        if(!inInventory) inventory.push(item);
        return inventory;
    }

    const assignBuildingLevel = (building: Building, amount?: number) => {
        const updatedBuilding = {...building};
        updatedBuilding.level += amount ?? 1;
        uploadTown("level", {building: updatedBuilding});
        return updatedBuilding;
    }

    const assignQuestCompleted = (completedQuest: QuestsCompleted, questsCompleted: QuestsCompleted[], score: number) => {
        let inList = false;
        for(let i = 0; i < questsCompleted.length; i++) {
            if(questsCompleted[i].name === completedQuest.name
            && questsCompleted[i].pid === completedQuest.pid) {
                questsCompleted[i].amount += 1;
                questsCompleted[i].score += score;
                inList = true;
            }
        }
        if(!inList) questsCompleted.push(completedQuest)
        return questsCompleted;
    }

    const uploadTown = async (
        type: string, 
        payload: {
            storageInventory?: typeof template.storage.inventory,
            building?: Building,
            quests?: QuestSchema[],
            questsCompleted?: QuestsCompleted[],
            cancelCd?: number,
        }
    ) => {
        const { storageInventory, building, quests, questsCompleted, cancelCd } = payload;
        switch(type) {
            case "inventory":
                if(!storageInventory) return console.error("No Storage Inventory");
                uploadStorageInventory(storageInventory);
                break;
            case "level":
                if(!building) return console.error("No building");
                uploadLevels(building);
                break;
            case "quests":
                if(!quests) return console.error("No quests");
                uploadQuests(quests)
                break;
            case "questsCompleted":
                if(!questsCompleted) return console.error("No quests completed");
                uploadQuestsCompleted(questsCompleted);
                break;
            case "cancelCd":
                if(!cancelCd) return console.error("No cd");
                uploadCancelCd(cancelCd);
                break;
        }
    }

    const uploadStorageInventory = async (storageInventory: typeof template.storage.inventory) => {
        const storageInventoryRef = ref(db, `/town/storage/inventory`);
        await set(storageInventoryRef, storageInventory ?? []);
    }

    const uploadLevels = async (building: Building) => {
        const buildingRef = ref(db, `/town/${building.name}/level`);
        await set(buildingRef, building.level);
    }

    const uploadQuests = async (quests: QuestSchema[]) => {
        const questsRef = ref(db, `/town/guild/quests`);
        await set(questsRef, quests);
    }

    const uploadQuestsCompleted = async (questsCompleted: QuestsCompleted[]) => {
        const questsRef = ref(db, `/town/guild/questsCompleted`);
        await set(questsRef, questsCompleted);
    }

    const uploadCancelCd = async (cancelCd: number) => {
        const questsRef = ref(db, `/town/guild/cancelCd`);
        await set(questsRef, cancelCd);
    }
    
    return {
        createTown,
        connectTown,
        createQuestCompletion,
        getQuestItem,
        getQuestScore,
        getShopStock,
        removeStoredItem,
        assignItemToStorage,
        assignBuildingLevel,
        assignQuestCompleted,
        uploadTown,
    }
})();