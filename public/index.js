const socket = io()
const colors = ['rgb(255, 63, 63)', 'rgb(255, 63, 255)', 'rgb(255, 255, 63)', 'rgb(63, 255, 63)', 'rgb(63, 63, 255)', 'rgb(63, 255, 255)']
const txt = document.getElementById("txt")
const btn2 = document.getElementById("btn2")
const namebtn= document.getElementById("namebtn")
const username=document.getElementById("name")
const namep=document.getElementById("namep")
const start = document.querySelector('.start')
const games = document.querySelector('.games')
const colorpalet = document.querySelector('.colorpalet')
const ballslast = document.querySelector('.ballslast')
const boxslast = document.querySelector('.boxslast')
const boxs = Array.from(document.getElementsByClassName('boxs'))
const btn = Array.from(document.getElementsByClassName('btn'))
const hb = document.querySelector('.hb')
const turntext = document.querySelector(".turntext")
const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const talkarea = document.querySelector(".talkarea")
const textarea = document.querySelector(".textarea")
let tokendata
let colorNum
let turnflag
let answer
let turn = -1
let colorselement
let resetcount = 0
let you_or_other

//時間置くやつ

async function wait(ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}
socket.on("token",data=>{
    tokendata=data
    console.log(tokendata);
})
//スタート時の名前決め
namebtn.addEventListener("click",()=>{
    if(username.value==""||username.value.length>5){
        namep.textContent="５文字以内１文字以上にしてください"
        return
    }
    start.style.display="none"
    games.style.display="block"
    textarea.style.display="block"
    const b = document.createElement("p")
    b.textContent = "マッチング待機中です..."
    b.style.color = "blue"
    b.style.fontWeight = "bold"
    talkarea.appendChild(b)
    socket.emit("start",username.value,tokendata)
    setTimeout(()=>{
        socket.emit("start",username.value,tokendata)
    },3000)
    
    


})

//イニシャライズ
function init() {
    turn = -1
    if (resetcount == 0) {
        for (let i = 0; i < 4; i++) {
            let el = document.createElement('div')
            el.innerHTML = "？"
            el.classList.add('balllast')
            ballslast.appendChild(el)
            resetcount++
        }
    }
    hb.classList.add("hide")

}

//色のパレット生成
colors.forEach((color, index) => {
    let el = document.createElement('div')
    el.style.backgroundColor = color
    el.classList.add('color');
    el.addEventListener('click', () => {
        const colorsdiv = document.querySelectorAll('.colorpalet > .color')
        colorsdiv.forEach((colorElement) => {
            colorElement.style.borderColor = '#252525';
        })
        el.style.borderColor = 'orange'
        colorNum = index
    })
    colorpalet.appendChild(el)
})
//チャット打つところ
txt.addEventListener("keydown", (e) => {
    if (e.key == "Enter") {
        if (txt.value == "") {
            return
        }
        socket.emit("msg", txt.value,tokendata)
        txt.value = ""
    }
})
btn2.addEventListener("click", () => {
    if (txt.value == "") {
        return
    }
    socket.emit("msg", txt.value,tokendata)
    txt.value = ""
})
function autoscroll(){
    let  talk=document.querySelector(".talkarea")
    let talkAreaHeight = talk.scrollHeight;
    talk.scrollTop = talkAreaHeight;
}
//切断された時の処理
socket.on("break", (data) => {
    reset()
    const pp = Array.from(document.querySelectorAll(".talkarea>p"))
    for (let i = 0; i < pp.length; i++) {
        talkarea.lastChild.remove()
    }
    const p = document.createElement("p")
    p.textContent = "切断されました"
    p.style.color = "blue"
    p.style.fontWeight = "bold"
    const b = document.createElement("p")
    b.textContent = "マッチング待機中です..."
    b.style.color = "blue"
    b.style.fontWeight = "bold"
    talkarea.appendChild(b)
})
//ターン切り替え
socket.on("turnCount", (data) => {
    if (data == 1) {
        turntext.textContent = "YOURTURN"
        turnflag = false
        turn++
    }
    else {
        turntext.textContent = "ENEMYTURN"
        turnflag = true
        turn++
    }
    

})
//マッチング成功の文字生成
socket.on("msg", (data,id) => {
    const p = document.createElement("p")
    p.textContent = data
    p.style.color = "blue"
    p.style.fontWeight = "bold"
    talkarea.appendChild(p)
    you_or_other=id
    // console.log(id);

})
//チャット
socket.on("talk", (data,id) => {
    // console.log(id);
    const p = document.createElement("p")
    data=id+":"+data
    
    p.textContent = data
    talkarea.appendChild(p)
    autoscroll()
})
socket.on("colordata", (data) => {
    data.forEach((color, index) => {
        let balls = Array.from(document.querySelectorAll("#b" + (turn) + ">.balls>.ball"))
        balls[index].style.backgroundColor = color
    })
})
socket.on("hitblow", (hitnum, blownum) => {
    let hnum = 0, bnum = 0
    const box = boxs[turn - 1]
    const pins = box.getElementsByClassName('pin')
    for (let i = 0; i < hitnum; i++) {
        setTimeout(() => {
            pins[i].style.backgroundColor = "red";
        }, 300 * hnum);
        hnum++
    }
    for (let i = hitnum; i < blownum + hitnum; i++) {
        setTimeout(() => {
            pins[i].style.backgroundColor = "white";

        }, 300 * (bnum + hnum));
        bnum++
    }
    blowhitdraw(hnum, bnum)
    if(turn==8){
        socket.emit("draw")
        turntext.textContent = "DRAW"
        turnflag = false
    }
})
socket.on("bingo", (data) => {
    let el = document.getElementsByClassName("balllast")
    data.forEach((color, index) => {
        el[index].innerHTML = ""
        el[index].style.backgroundColor = color
        el[index].classList.add("fadein")
    })
})
socket.on("v-or-d", (data) => {
    turntext.textContent = data
    turnflag = true
})

async function blowhitdraw(h, b) {
    await wait((b + h + 2) * 300)
    if (h == 4) {
        hb.innerHTML = "4ヒット!!";
        socket.emit("bingo")
    }
    else {
        hb.innerHTML = h + "ヒット" + b + "ブロー";
    }

    hb.classList.remove("hide")
    await wait(2000)
    hb.classList.add("hide")
    

}
//丸を塗ってOKボタン出す系の処理
boxs.forEach((box, index) => {
    const blocks = Array.from(box.getElementsByClassName("ball"))
    blocks.forEach((el) => {
        el.addEventListener('click', () => {
            if (!turnflag) {
                if (turn == index) {
                    el.style.backgroundColor = colors[colorNum]
                    el.classList.add("selected")
                    if (blocks.every(color => color.classList.contains("selected"))) {
                        btn.forEach((b, ind) => {
                            if (index === ind) {
                                b.classList.remove('hide')
                            }
                        })
                    }
                }

            }

        })
    })
})
//OKボタン押したときの動作
async function OK() {
    btn.forEach(b => {
        b.classList.add('hide')
    })
    // console.log(turn);
    socket.emit("nextturn")
    let ballsColor = Array.from(document.querySelectorAll("#b" + (turn + 1) + ">.balls>.ball"))
    let arraycolors = []
    ballsColor.forEach((ele) => {
        arraycolors.push(ele.style.backgroundColor)
    })
    socket.emit("colors", arraycolors)
}
function reset() {
    init()
    boxs.forEach((box, index) => {
        const blocks = Array.from(box.getElementsByClassName("ball"))
        const pins = Array.from(box.getElementsByClassName('pin'))
        pins.forEach((pin) => {
            pin.style.backgroundColor = "rgb(14, 14, 14)"
        })
        blocks.forEach((el) => {

            el.style.backgroundColor = "rgb(14, 14, 14)"
            el.classList.remove("selected")

        })
    })
    hb.innerHTML = " "
    hb.style.color = "white"
    hb.style.fontSize = "40px"
    hb.classList.add("hide")
    btn.forEach(b => {
        b.classList.add('hide')
    })
    let balllast = Array.from(document.getElementsByClassName("balllast"))

    balllast.forEach(el => {
        el.innerHTML = "？"
        el.style.backgroundColor = "rgb(14, 14, 14)"
    })

}

init()