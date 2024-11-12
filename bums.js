const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { DateTime } = require('luxon');
const md5 = require('md5');

class Bums {
    constructor() {
        this.baseUrl = 'https://api.bums.bot';
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en",
            "Content-Type": "multipart/form-data",
            "Origin": "https://app.bums.bot",
            "Referer": "https://app.bums.bot/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?1",
            "Sec-Ch-Ua-Platform": '"Android"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors", 
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
        };        
        this.SECRET_KEY = '7be2a16a82054ee58398c5edb7ac4a5a';
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [✓] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [✗] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [!] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [ℹ] ${msg}`.blue);
        }
    }

    async countdown(seconds) {
        for (let i = seconds; i > 0; i--) {
            const timestamp = new Date().toLocaleTimeString();
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`[${timestamp}] [*] Chờ ${i} giây để tiếp tục...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
    }

    async login(initData, invitationCode) {
        const url = `${this.baseUrl}/miniapps/api/user/telegram_auth`;
        const formData = new FormData();
        formData.append('invitationCode', invitationCode);
        formData.append('initData', initData);

        try {
            const response = await axios.post(url, formData, { headers: this.headers });
            if (response.status === 200 && response.data.code === 0) {
                return { 
                    success: true, 
                    token: response.data.data.token,
                    data: response.data.data
                };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getGameInfo(token) {
        const url = `${this.baseUrl}/miniapps/api/user_game_level/getGameInfo`;
        const headers = { 
            ...this.headers, 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };
        
        try {
            const response = await axios.get(url, { headers });
    
            if (response.status === 200 && response.data.code === 0) {
                const { userInfo, gameInfo, tapInfo, mineInfo } = response.data.data;
                return { 
                    success: true,
                    userId: userInfo.userId,
                    username: userInfo.telegramUsername,
                    nickname: userInfo.nickName,
                    daysInGame: userInfo.daysInGame,
                    invitedFriends: userInfo.invitedFriendsCount,
                    level: gameInfo.level,
                    experience: gameInfo.experience,
                    coin: gameInfo.coin,
                    energySurplus: gameInfo.energySurplus,
                    nextLevelExp: gameInfo.nextExperience,
                    collectInfo: tapInfo.collectInfo,
                    minePower: mineInfo.minePower,
                    mineOfflineCoin: mineInfo.mineOfflineCoin,
                    data: response.data.data
                };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            const errorMessage = error.response?.data?.msg || error.message;
            return { success: false, error: errorMessage };
        }
    }

    generateHashCode(collectAmount, collectSeqNo) {
        const data = `${collectAmount}${collectSeqNo}${this.SECRET_KEY}`;
        return md5(data);
    }

    distributeEnergy(totalEnergy) {
        const parts = 10;
        let remaining = parseInt(totalEnergy);
        const distributions = [];
        
        for (let i = 0; i < parts; i++) {
            const isLast = i === parts - 1;
            if (isLast) {
                distributions.push(remaining);
            } else {
                const maxAmount = Math.min(300, Math.floor(remaining / 2));
                const amount = Math.floor(Math.random() * maxAmount) + 1;
                distributions.push(amount);
                remaining -= amount;
            }
        }
        
        return distributions;
    }

    async collectCoins(token, collectSeqNo, collectAmount) {
        const url = `${this.baseUrl}/miniapps/api/user_game/collectCoin`;
        const headers = { 
            ...this.headers, 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
        };
        
        const hashCode = this.generateHashCode(collectAmount, collectSeqNo);
        const formData = new FormData();
        formData.append('hashCode', hashCode);
        formData.append('collectSeqNo', collectSeqNo.toString());
        formData.append('collectAmount', collectAmount.toString());

        try {
            const response = await axios.post(url, formData, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return {
                    success: true,
                    newCollectSeqNo: response.data.data.collectSeqNo,
                    data: response.data.data
                };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processEnergyCollection(token, energy, initialCollectSeqNo) {
        const energyDistributions = this.distributeEnergy(energy);
        let currentCollectSeqNo = initialCollectSeqNo;
        let totalCollected = 0;

        for (let i = 0; i < energyDistributions.length; i++) {
            const amount = energyDistributions[i];
            this.log(`Thu thập lần ${i + 1}/10: ${amount} năng lượng`, 'custom');
            
            const result = await this.collectCoins(token, currentCollectSeqNo, amount);
            
            if (result.success) {
                totalCollected += amount;
                currentCollectSeqNo = result.newCollectSeqNo;
                this.log(`Thành công! Đã thu thập: ${totalCollected}/${energy}`, 'success');
            } else {
                this.log(`Lỗi khi thu thập: ${result.error}`, 'error');
                break;
            }

            if (i < energyDistributions.length - 1) {
                await this.countdown(5);
            }
        }

        return totalCollected;
    }

    async getTaskLists(token) {
        const url = `${this.baseUrl}/miniapps/api/task/lists`;
        const headers = { 
            ...this.headers, 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json" 
        };
        
        try {
            const response = await axios.get(url, { 
                headers,
                params: {
                    _t: Date.now()
                }
            });
            
            if (response.status === 200 && response.data.code === 0) {
                return { 
                    success: true,
                    tasks: response.data.data.lists.filter(task => task.isFinish === 0)
                };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async finishTask(token, taskId) {
        const url = `${this.baseUrl}/miniapps/api/task/finish_task`;
        const headers = { 
            ...this.headers, 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded" 
        };
        
        const params = new URLSearchParams();
        params.append('id', taskId.toString());
        params.append('_t', Date.now().toString());

        try {
            const response = await axios.post(url, params, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processTasks(token) {
        this.log('Đang lấy danh sách nhiệm vụ...', 'info');
        const taskList = await this.getTaskLists(token);
        
        if (!taskList.success) {
            this.log(`Không thể lấy danh sách nhiệm vụ: ${taskList.error}`, 'error');
            return;
        }

        if (taskList.tasks.length === 0) {
            this.log('Không có nhiệm vụ mới!', 'warning');
            return;
        }

        for (const task of taskList.tasks) {
            this.log(`Đang thực hiện nhiệm vụ: ${task.name}`, 'info');
            const result = await this.finishTask(token, task.id);
            
            if (result.success) {
                this.log(`Làm nhiệm vụ ${task.name} thành công | Phần thưởng: ${task.rewardParty}`, 'success');
            } else {
                this.log(`Không thể hoàn thành nhiệm vụ ${task.name}: chưa đủ điều kiện hoặc cần tự làm`, 'error');
            }

            await this.countdown(5);
        }
    }

    async getMineList(token) {
        const url = `${this.baseUrl}/miniapps/api/mine/getMineLists`;
        const headers = { 
            ...this.headers, 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };
        
        try {
            const response = await axios.post(url, null, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { 
                    success: true,
                    mines: response.data.data.lists
                };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async upgradeMine(token, mineId) {
        const url = `${this.baseUrl}/miniapps/api/mine/upgrade`;
        const headers = { 
            ...this.headers, 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
        };
        
        const formData = new FormData();
        formData.append('mineId', mineId.toString());

        try {
            const response = await axios.post(url, formData, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processMineUpgrades(token, currentCoin) {
        this.log('Đang lấy danh sách thẻ...', 'info');
        const config = require('./config.json');
        const mineList = await this.getMineList(token);
        
        if (!mineList.success) {
            this.log(`Không thể lấy danh sách thẻ: ${mineList.error}`, 'error');
            return;
        }

        let availableMines = mineList.mines
            .filter(mine => 
                mine.status === 1 && 
                parseInt(mine.nextLevelCost) <= Math.min(currentCoin, config.maxUpgradeCost)
            )
            .sort((a, b) => parseInt(b.nextPerHourReward) - parseInt(a.nextPerHourReward));

        if (availableMines.length === 0) {
            this.log('Không có thẻ nào có thể nâng cấp!', 'warning');
            return;
        }

        let remainingCoin = currentCoin;
        for (const mine of availableMines) {
            const cost = parseInt(mine.nextLevelCost);
            if (cost > remainingCoin) continue;

            this.log(`Đang nâng cấp thẻ ID ${mine.mineId} | Cost: ${cost} | Reward/h: ${mine.nextPerHourReward}`, 'info');
            const result = await this.upgradeMine(token, mine.mineId);
            
            if (result.success) {
                remainingCoin -= cost;
                this.log(`Nâng cấp thẻ ID ${mine.mineId} thành công | Remaining coin: ${remainingCoin}`, 'success');
            } else {
                this.log(`Không thể nâng cấp thẻ ID ${mine.mineId}: ${result.error}`, 'error');
            }

            await this.countdown(5);
        }
    }

    askQuestion(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }))
    }

    async getSignLists(token) {
        const url = `${this.baseUrl}/miniapps/api/sign/getSignLists`;
        const headers = { 
            ...this.headers, 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };
        
        try {
            const response = await axios.get(url, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { 
                    success: true,
                    lists: response.data.data.lists
                };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async sign(token) {
        const url = `${this.baseUrl}/miniapps/api/sign/sign`;
        const headers = { 
            ...this.headers, 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
        };
        
        const formData = new FormData();

        try {
            const response = await axios.post(url, formData, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processSignIn(token) {
        this.log('Đang kiểm tra điểm danh...', 'info');
        const signList = await this.getSignLists(token);
        
        if (!signList.success) {
            this.log(`Không thể lấy thông tin điểm danh: ${signList.error}`, 'error');
            return;
        }

        const availableDay = signList.lists.find(day => day.status === 0);
        
        if (!availableDay) {
            this.log('Không có ngày nào cần điểm danh!', 'warning');
            return;
        }

        this.log(`Đang điểm danh ngày ${availableDay.days}...`, 'info');
        const result = await this.sign(token);
        
        if (result.success) {
            this.log(`Điểm danh ngày ${availableDay.days} thành công | Phần thưởng: ${availableDay.normal}`, 'success');
        } else {
            this.log(`Điểm danh thất bại: ${result.error}`, 'error');
        }
    }

    async getGangLists(token) {
        const url = `${this.baseUrl}/miniapps/api/gang/gang_lists`;
        const headers = { 
            ...this.headers, 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
        };
        
        const formData = new FormData();
        formData.append('boostNum', '15');
        formData.append('powerNum', '35');

        try {
            const response = await axios.post(url, formData, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { 
                    success: true,
                    myGang: response.data.data.myGang,
                    gangLists: response.data.data.lists
                };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async joinGang(token, gangName = 'A_Airdrops') {
        const url = `${this.baseUrl}/miniapps/api/gang/gang_join`;
        const headers = { 
            ...this.headers, 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
        };
        
        const formData = new FormData();
        formData.append('name', gangName);

        try {
            const response = await axios.post(url, formData, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processGangJoin(token) {
        this.log('Đang kiểm tra thông tin gang...', 'info');
        const gangList = await this.getGangLists(token);
        
        if (!gangList.success) {
            this.log(`Không thể lấy thông tin gang: ${gangList.error}`, 'error');
            return;
        }

        if (!gangList.myGang.gangId) {
            this.log('Bạn chưa tham gia gang nào, đang thử gia nhập Gang Dân Cày Airdrop...', 'info');
            const result = await this.joinGang(token);
            
            if (result.success) {
                this.log('Bạn đã gia nhập Gang Dân Cày Airdrop thành công!', 'success');
            } else {
                this.log(`Không thể gia nhập gang: ${result.error}`, 'error');
            }
        } else {
            this.log(`Bạn đã là thành viên của gang ${gangList.myGang.name}`, 'custom');
        }
    }
	
    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        if (!fs.existsSync(dataFile)) {
            this.log('Không tìm thấy file data.txt!', 'error');
            return;
        }

        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        if (data.length === 0) {
            this.log('File data.txt trống!', 'error');
            return;
        }

        this.log('Bums Bot|Made by @Crypto_Titan0|Subscribe Here https://youtube.com/@crypto_titan0'.green);
        
        const nhiemvu = await this.askQuestion('Do you want to do the tasks? (y/n): ');
        const hoinhiemvu = nhiemvu.toLowerCase() === 'y';

        const nangcap = await this.askQuestion('Want to upgrade your card?  (y/n): ');
        const hoinangcap = nangcap.toLowerCase() === 'y';

        while (true) {
            for (let i = 0; i < data.length; i++) {
                const initData = data[i];
                try {
                    const userData = JSON.parse(decodeURIComponent(initData.split('user=')[1].split('&')[0]));
                    const userId = userData.id;
                    const firstName = userData.first_name;

                    console.log(`\n========== Tài khoản ${i + 1}/${data.length} | ${firstName.green} ==========`);
                    
                    this.log(`Đang đăng nhập...`, 'info');
                    const loginResult = await this.login(initData, 'SkDATcHN');
                    
                    if (!loginResult.success) {
                        this.log(`Đăng nhập không thành công: ${loginResult.error}`, 'error');
                        continue;
                    }

                    this.log('Đăng nhập thành công!', 'success');
                    const token = loginResult.token;
                    await this.processSignIn(token);
					await this.processGangJoin(token);
                    const gameInfo = await this.getGameInfo(token);
                    if (gameInfo.success) {
                        this.log(`Coin: ${gameInfo.coin}`, 'custom');
                        this.log(`Energy: ${gameInfo.energySurplus}`, 'custom');
                        
                        if (parseInt(gameInfo.energySurplus) > 0) {
                            this.log(`Bắt đầu thu thập năng lượng...`, 'info');
                            const collectSeqNo = gameInfo.data.tapInfo.collectInfo.collectSeqNo;
                            await this.processEnergyCollection(token, gameInfo.energySurplus, collectSeqNo);
                        } else {
                            this.log(`Không đủ năng lượng để thu thập`, 'warning');
                        }
                    } else {
                        this.log(`Không thể lấy thông tin game: ${gameInfo.error}`, 'error');
                    }
                    if(hoinhiemvu) {
                        await this.processTasks(token);
                    }
                    if(hoinangcap) {
                        await this.processMineUpgrades(token, parseInt(gameInfo.coin));
                    }

                    if (i < data.length - 1) {
                        await this.countdown(5);
                    }
                } catch (error) {
                    this.log(`Lỗi xử lý tài khoản: ${error.message}`, 'error');
                    continue;
                }
            }
            await this.countdown(60 * 60);
        }
    }
}

const client = new Bums();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});
