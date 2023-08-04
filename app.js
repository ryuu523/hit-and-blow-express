const express = require('express')
const { Socket } = require('socket.io')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const PORT = process.env.PORT || 7000
// console.log(__dirname);
const rootPath = __dirname + "/public"
// const rootPath = "/home/public"
const waitingPlayers = []; // マッチング待ちのプレイヤーを格納する配列
const activeRooms = {}; // アクティブなルームを格納するオブジェクト
const users = []
const nowusers=[]
app.use(express.static(rootPath))
app.get("/", (req, res) => {
  res.sendFile(rootPath + "/index.html")
})

io.on('connection', (socket) => {
  // 接続時の処理
  console.log('ユーザーが接続しました');
  nowusers.push(socket)
  users.push({
    "user": socket,
    "name": "user"
  })
  // console.log(users);
  //トークン配布
  io.to(socket.id).emit("token", socket.id)
  // console.log("入る前users");
  // console.log(users);
  socket.on("start", (namedata, tokenid) => {
    // console.log(tokenid+"がgameに入りました");
    // プレイヤーがマッチング待ちに入る
    // console.log(tokenid);
    users.forEach((user, index) => {
      // console.log(">>");
      if (user["user"]["id"] == tokenid) {
        users[index]["name"] = namedata
        nowusers.splice(index)
        const b = users.splice(index,1)
        waitingPlayers.push(b[0])
        // console.log(index)
        // console.log(b);
        // console.log("入った後users");
        // console.log(users);
        // // waitingPlayers.push()
        // console.log(waitingPlayers);
      }
    })
    // console.log("waitingPlayers");
    // console.log(waitingPlayers);
    // console.log(waitingPlayers.length);
    if (waitingPlayers.length >= 2) {
      const p1 = waitingPlayers.shift()
      const p2 = waitingPlayers.shift()
      console.log("マッチング後waitingPlayers");
      const roomName = generateRoomName();
      // console.log(p1);
      // console.log(p2);
      p1["user"].join(roomName)
      p2["user"].join(roomName);
      activeRooms[roomName] = {}
      activeRooms[roomName]["users"]=[p1,p2]
      activeRooms[roomName]["players"] = [p1["user"], p2["user"]]
      activeRooms[roomName]["names"] = [p1["name"], p2["name"]]
      activeRooms[roomName]["turn"] = Math.floor(Math.random() * 2)
      const colors = ['rgb(255, 63, 63)', 'rgb(255, 63, 255)', 'rgb(255, 255, 63)', 'rgb(63, 255, 63)', 'rgb(63, 63, 255)', 'rgb(63, 255, 255)']
      const answer = []
      // activeRooms[roomName]["rand"] = [String(Math.floor(Math.random() * 10)), String(Math.floor(Math.random() * 10)), String(Math.floor(Math.random() * 10)), String(Math.floor(Math.random() * 10))]


      for (let i = 0; i < 4; i++) {
        answer.push(colors[Math.floor(Math.random() * colors.length)])
      }
      console.log(answer);
      activeRooms[roomName]["answer"] = answer
      console.log("マッチング成功:" + roomName);
      io.to(roomName).emit("msg", "マッチング成功")
      const parentPlayer = activeRooms[roomName]["players"][activeRooms[roomName]["turn"]]
      const anotherPlayer = activeRooms[roomName]["players"][(1 - activeRooms[roomName]["turn"])]
      parentPlayer.emit("msg", "あなたが先行です", 1)
      anotherPlayer.emit("msg", "あなたが後攻です", 0)
      parentPlayer.emit("turnCount", 1)
      anotherPlayer.emit("turnCount", 0)
    }
    socket.on("msg", (data, tokendata) => {
      for (const roomName in activeRooms) {
        const roomPlayers = activeRooms[roomName]["players"]
        const playerIndex = roomPlayers.indexOf(socket);
        if (playerIndex == -1) {
          continue
        }
        roomPlayers.forEach((p,index)=>{
          if(p["id"]==tokendata){
            io.to(roomName).emit("talk", data, activeRooms[roomName]["names"][index])
          }
        })
        

        // io.to(roomName).emit("talk", data, you_or_other)
        break
      }
    })
    socket.on("nextturn", (data) => {
      for (const roomName in activeRooms) {
        const roomPlayers = activeRooms[roomName]["players"]
        const playerIndex = roomPlayers.indexOf(socket);
        if (playerIndex == -1) {
          continue
        }
        activeRooms[roomName]["turn"] = 1 - activeRooms[roomName]["turn"]
        const pPlayer = activeRooms[roomName]["players"][activeRooms[roomName]["turn"]]
        const aPlayer = activeRooms[roomName]["players"][(1 - activeRooms[roomName]["turn"])]
        pPlayer.emit("turnCount", 1)
        aPlayer.emit("turnCount", 0)
        break
      }
    })
    socket.on("colors", (data) => {
      for (const roomName in activeRooms) {
        let hitnum = 0, blownum = 0
        let anscopy = activeRooms[roomName]["answer"].concat()
        const roomPlayers = activeRooms[roomName]["players"]
        const playerIndex = roomPlayers.indexOf(socket);
        if (playerIndex == -1) {
          continue
        }
        data.forEach((color, index) => {
          if (color === activeRooms[roomName]["answer"][index]) {
            hitnum++
            anscopy.forEach((a, index, array) => {
              if (a === color) {
                array[index] = "aa"
              }
            })
          }
        });
        data.forEach((color, index) => {
          if (anscopy.filter((item, i) => i !== index).includes(color)) {
            blownum++
            anscopy.forEach((a, index, array) => {
              if (a == color) {
                array[index] = "aa"
              }
            })
          }
        })
        // console.log(hitnum);
        // console.log(blownum);
        // console.log(roomName);
        io.to(roomName).emit("colordata", data)
        io.to(roomName).emit("hitblow", hitnum, blownum)
        // io.to(roomName).emit("blow",blownum)
        break
      }


    })
    socket.on("draw", (data) => {
      for (const roomName in activeRooms) {
        let anscopy = activeRooms[roomName]["answer"].concat()
        const roomPlayers = activeRooms[roomName]["players"]
        const playerIndex = roomPlayers.indexOf(socket);
        if (playerIndex == -1) {
          continue
        }
        io.to(roomName).emit("v-or-d", "DRAW")
        io.to(roomName).emit("bingo", anscopy)
      }
    })
    socket.on("bingo", (data) => {
      for (const roomName in activeRooms) {
        let anscopy = activeRooms[roomName]["answer"].concat()
        const roomPlayers = activeRooms[roomName]["players"]
        const playerIndex = roomPlayers.indexOf(socket);
        if (playerIndex == -1) {
          continue
        }
        activeRooms[roomName]["players"][1 - activeRooms[roomName]["turn"]].emit("v-or-d", "YOUWIN")
        activeRooms[roomName]["players"][activeRooms[roomName]["turn"]].emit("v-or-d", "YOULOSE")
        io.to(roomName).emit("bingo", anscopy)
      }
    })
    // プレイヤーが切断した場合の処理
    socket.on('disconnect', () => {
      // マッチング待ちのプレイヤーから削除
      const index = waitingPlayers.indexOf(socket);
      // console.log(index);
      if (index !== -1) {
        
        waitingPlayers.splice(index, 1);
      }

      // アクティブなルームから削除
      for (const roomName in activeRooms) {
        const roomPlayers = activeRooms[roomName]["players"];
        const roomusers = activeRooms[roomName]["users"];
        const pIndex = roomPlayers.indexOf(socket);
        if (pIndex !== -1) {
          roomPlayers.splice(pIndex, 1);
          roomusers.splice(pIndex, 1);

          const anotherPlayer = roomPlayers[0]
          // console.log(anotherPlayer);
          anotherPlayer.emit("break", "切断されました")
          delete activeRooms[roomName]; // ルームが空になったら削除
          anotherPlayer.leave(roomName)
          waitingPlayers.push(roomusers[0])
          break;
        }
      }
      
      console.log('ユーザーが切断しました');
      console.log(waitingPlayers);
    });
    function generateRoomName() {
      return `room-${Math.floor(Math.random() * 1000)}`;
    }
  })
  socket.on('disconnect', () => {
    // マッチング待ちのプレイヤーから削除
    const index = nowusers.indexOf(socket);
    // console.log(index);
    if (index !== -1) {
      nowusers.splice(index, 1);
    }
    console.log(">>"+nowusers);
  })
})
http.listen(3000, () => {
  console.log('Server is running on port 3000');
});