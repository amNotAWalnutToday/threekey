import { useState, useEffect } from "react";
import PlayerSchema from "../schemas/PlayerSchema";
import testdata from '../data/testdata.json';

const battleTimer = {
    initTime: 0,
    procTime: 0,
    done: true,
}

const setBattleTimer = () => {
    const time = Date.now();
    battleTimer.procTime = time + 10000;
    battleTimer.done = false;
}

const cb = (attack) => {
    const { procTime } = battleTimer;
    const currentTime = Date.now();
    battleTimer.initTime = procTime - currentTime;
    if(currentTime > procTime) { 
        attack();
        battleTimer.done = true;
    }
    if(battleTimer.done) setBattleTimer();
}

export default function Combat() {
    const [currentTime, setCurrentTime] = useState(0);

    const [player, setPlayer] = useState<PlayerSchema>({
        username: testdata.user1.username,
        location: testdata.user1.location,
        stats: testdata.user1.stats,
    });
    
    const [enemy, setEnemy] = useState<PlayerSchema>({
        username: testdata.user2.username,
        location: testdata.user2.location,
        stats: testdata.user2.stats,
    });

    const attack = () => {
        const newEnemy = {...enemy};
        newEnemy.stats.combat.health.cur -= player.stats.combat.attack;
        setEnemy(() => newEnemy);
    }

    useEffect(() => {
        setInterval(() => {
            cb(attack);
            setCurrentTime(battleTimer.initTime);
        }, 24);
    }, []);

    const getTime = () => {
        return currentTime / 10;
    }

    return (
        <div>
            <div className="player">
                <div className="emptyBar">
                    <div style={{width: player.stats.combat.health.cur}} className="health"></div>
                </div>
            </div>
            <div className="enemy player">
                <div className="emptyBar">
                    <div style={{width: enemy.stats.combat.health.cur}} className="health"></div>
                </div>
            </div>
            <div className="cen-flex">
                <div className="battleTimer">
                    <div style={{width: getTime()}} className="fill"></div>
                </div>
            </div>
            <button onClick={attack}>Attack</button>
        </div>
    )
}