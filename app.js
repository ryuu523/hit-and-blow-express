"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server);
const waitingPlayers = []; // マッチング待ちのプレイヤーを格納する配列
const activeRooms = {}; // アクティブなルームを格納するオブジェクト
app.use(express_1.default.static("public"));
app.get("/", (req, res) => {
});
io.on("connection", (socket) => {
    console.log(socket.id + " is connected.");
    socket.on("matching-join", (playerName) => {
        console.log(socket.id + ":JOIN  name=" + playerName);
        socket.emit("matching-now");
        waitingPlayers.push({
            socket: socket,
            name: playerName
        });
        if (waitingPlayers.length >= 2) {
            const roomName = generateRoomName();
            const players = [...Array(2)].map(() => waitingPlayers.shift());
            const turn = Math.floor(Math.random() * players.length);
            players.map(p => p.socket.join(roomName));
            activeRooms[roomName] = {
                users: players.map(p => p.socket),
                names: players.map(p => p.name),
                turn: turn,
                turnCount: 1,
                answer: generateAnswer(),
            };
            console.log("マッチング成功:" + roomName);
            const firstPlayer = activeRooms[roomName].users[turn];
            const secondPlayer = activeRooms[roomName].users[1 - turn];
            console.log(activeRooms[roomName].answer);
            firstPlayer.emit("matching-success", {
                turn: true,
                opponentName: players[1 - turn].name,
                answer: activeRooms[roomName].answer
            });
            secondPlayer.emit("matching-success", {
                turn: false,
                opponentName: players[turn].name,
                answer: activeRooms[roomName].answer
            });
        }
    });
    socket.on("colorSelected", (circleIndex) => {
        console.log("colorSelected", circleIndex);
        const roomName = getRoomName(socket);
        console.log(roomName);
        if (roomName === null) {
            return;
        }
        console.log("roomnamegetsuccess", roomName);
        io.to(roomName).emit("colorIndex", circleIndex);
    });
    socket.on("circleSelect", (blockIndex, circleIndex, circleBGC) => {
        const roomName = getRoomName(socket);
        if (roomName === null) {
            return;
        }
        io.to(roomName).emit("circleSelected", blockIndex, circleIndex, isFull(circleBGC, blockIndex));
    });
    socket.on("judge", (circleBGC) => {
        console.log(circleBGC);
        const roomName = getRoomName(socket);
        if (roomName === null) {
            return;
        }
        const answer = activeRooms[roomName].answer;
        let hitNum = 0;
        let blowNum = 0;
        let answerflag = false;
        let anscopy = activeRooms[roomName].answer.concat();
        circleBGC.forEach((color, index) => {
            if (color === answer[index]) {
                hitNum++;
                anscopy.forEach((a, index, array) => {
                    if (a === color) {
                        array[index] = "aa";
                    }
                });
            }
        });
        circleBGC.forEach((color, index) => {
            if (anscopy.filter((item, i) => i !== index).includes(color)) {
                blowNum++;
                anscopy.forEach((a, index, array) => {
                    if (a == color) {
                        array[index] = "aa";
                    }
                });
            }
        });
        console.log(hitNum, blowNum);
        if (hitNum === 4) {
            answerflag = true;
        }
        io.to(roomName).emit("judge-end", hitNum, blowNum, answerflag, activeRooms[roomName].turnCount);
    });
    socket.on("turn-process", () => {
        const roomName = getRoomName(socket);
        if (roomName === null) {
            return;
        }
        activeRooms[roomName].turnCount += 1;
        io.to(roomName).emit("next-turn", activeRooms[roomName].turnCount);
    });
    socket.on("disconnect", () => {
        console.log(socket.id + " is disconnected.");
        // アクティブルーム切断時処理
        for (const roomName of Object.keys(activeRooms)) {
            const index = activeRooms[roomName].users.map(user => user.id).indexOf(socket.id);
            console.log(index, roomName, activeRooms[roomName].users.map(user => user.id));
            if (index >= 0) {
                // もう一方のプレイヤーをマッチング待機に移行
                const connectingUser = {
                    socket: activeRooms[roomName].users[1 - index],
                    name: activeRooms[roomName].names[1 - index],
                };
                connectingUser.socket.emit("matching-rejoin");
                connectingUser.socket.emit("intialize");
                // アクティブルームを削除
                delete activeRooms[roomName];
            }
        }
        // マッチングルーム切断時処理
        for (let i = 0; i < waitingPlayers.length; i++) {
            const player = waitingPlayers[i];
            if (player.socket.id === socket.id) {
                waitingPlayers.splice(i, 1);
            }
        }
    });
});
function generateAnswer() {
    const colors = [
        "rgb(255, 63, 63)",
        "rgb(255, 63, 255)",
        "rgb(255, 255, 63)",
        "rgb(63, 255, 63)",
        "rgb(63, 63, 255)",
        "rgb(63, 255, 255)", //水色
    ];
    const answer = [...Array(4)].map(() => {
        return colors[Math.floor(Math.random() * colors.length)];
    });
    return answer;
}
function getRoomName(socket) {
    for (const roomName of Object.keys(activeRooms)) {
        const idList = activeRooms[roomName].users.map(user => user.id);
        if (idList.includes(socket.id)) {
            return roomName;
        }
    }
    return null;
}
function generateRoomName() {
    return `room-${Math.floor(Math.random() * 1000)}`;
}
const isFull = (circleBGC, blockIndex) => {
    for (let i = 0; i <= 3; i++) {
        if (circleBGC[blockIndex][i] == "black") {
            return false;
        }
    }
    return true;
};
server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
