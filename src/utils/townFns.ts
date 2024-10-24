import { onValue, ref, remove, set } from "firebase/database";
import TownSchema from "../schemas/TownSchema";
import accountFns from "./accountFns";
import itemData from '../data/items.json';

const { db } = accountFns;
const template = {} as TownSchema;
interface Building {
    name: string,
    level: number,
    requirements: {id: string, amount: number}[],
}

export default (() => {
    const createTown = (
        levels: {[key: string]: number},
        inventory: {id: string, amount: number}[],
        quests: [],
        questsCompleted: [],
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
                const updatedTown = createTown({storage: storageLvl, inn: innLvl, guild: guildLvl, shop: shopLvl }, data.storage.inventory, data.guild.quests, data.guild.questsCompleted);
                setTown(() => {
                    console.log(updatedTown);
                    return updatedTown
                });
            });
        } catch(e) {
            return console.error(e);
        }
    }

    const getShopStock = (shopLvl: number) => {
        const stock = [];
        for(const item of itemData) {
            if(!item.shopLevel) continue;
            console.log(item);
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

    const uploadTown = async (
        type: string, 
        payload: {
            storageInventory?: typeof template.storage.inventory,
            building?: Building,
        }
    ) => {
        const { storageInventory, building } = payload;
        switch(type) {
            case "inventory":
                if(!storageInventory) return console.error("No Storage Inventory");
                uploadStorageInventory(storageInventory);
                break;
            case "level":
                if(!building) return console.error("No building");
                uploadLevels(building);
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
    
    return {
        createTown,
        connectTown,
        getShopStock,
        removeStoredItem,
        assignItemToStorage,
        assignBuildingLevel,
        uploadTown,
    }
})();