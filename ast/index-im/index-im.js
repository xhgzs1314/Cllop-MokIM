console.clear();
let dcfs_messagenew = 0;
var useridd = sessionStorage.getItem('user');
var quill;
let ltddfid;
let timesetinvel;
var nowcolorbackground;
let musicplayerofmesay = 0;
var usermyimg = sessionStorage.getItem('sspng');
var layer;
var allgroupinfo = [];
let allgroupofmyinadmin;
var adminhtmlmenber;
let starbulidiopvideo;
var myusernamefor = sessionStorage.getItem('user_nm');
var myinfoforsayed = sessionStorage.getItem('user_sayed');
var userhtmlmenber;
layui.use(function () {
    layer = layui.layer;
    var util = layui.util;
    var upload = layui.upload;
    var $ = layui.$;
    upload.render({
        elem: '#ID-upload-demo-drag',
        url: '/api/other/upload.php',
        choose: function (obj) {
            obj.preview(function (index, file, result) {
                jxfor_canvasewmuserme(result);
            });
        }
    });
    $(document).on('dblclick', 'img', function () {
        const srcimgdbclick = this.src;
        layer.photos({
            photos: {
                "title": "图片详情",
                "start": 0,
                "data": [
                    {
                        "alt": "图片详情",
                        "pid": 1,
                        "src": srcimgdbclick,
                    },
                ]
            }
        });
    });
});
function dangerouslyPasteHTML_toremove(danasteHTML) {
    var nowhtmlcontent = quill.root.innerHTML;
    if (nowhtmlcontent !== null) {
        var newedcontent = nowhtmlcontent + danasteHTML;
        quill.clipboard.dangerouslyPasteHTML(newedcontent);
    } else {
        quill.clipboard.dangerouslyPasteHTML(newedcontent);
    }
}
function imjjthesqformetojoinmyfriendorgroup(wherfrom, trueorfalse, otherinfo, bzid) {
    if (trueorfalse === 'truet') {
        if (otherinfo.length > 7) {
            fetch('/api/canbefriend.php?id=' + bzid + '&forwho=' + wherfrom + '&myid=' + useridd + '&otherinfo=' + otherinfo + '&type=group')
                .then(response => response.json())
                .then(data => {
                    if (data.code === 200) {
                        Qmsg.success('操作成功');
                        beloadinpagetoloadingwaitnot();
                    } else {
                        Qmsg.error('操作失败');
                        console.log('/api/canbefriend.php?id=' + bzid + '&forwho=' + wherfrom + '&myid=' + useridd + '&otherinfo=' + otherinfo + '&type=group');
                    }
                    layer.closeAll();
                });
        } else {
            fetch('/api/canbefriend.php?id=' + bzid + '&forwho=' + wherfrom + '&myid=' + useridd + '&otherinfo=' + otherinfo + '&type=friend')
                .then(response => response.json())
                .then(data => {
                    if (data.code === 200) {
                        Qmsg.success('操作成功');
                        beloadinpagetoloadingwaitnot();
                    } else {
                        Qmsg.error('操作失败');
                    }
                    layer.closeAll();
                });
        }
    } else {
        fetch('/api/notbefriend.php?id=' + bzid + '&forwho=' + wherfrom + '&myid=' + useridd)
            .then(response => response.json())
            .then(data => {
                if (data.code === 200) {
                    Qmsg.success('操作成功');
                } else {
                    Qmsg.error('操作失败');
                }
                layer.closeAll();
            });

    }
}
function ceatenewingroupofthenoticeinmine() {
    dcfs_messagenew += 1;
    if (dcfs_messagenew > 3) {
        Qmsg.error('消息接受太频繁,请15s后再试');
        if (dcfs_messagenew > 4) {
            setTimeout(function () { dcfs_messagenew = 0; }, 15000);
        }
        return false;
    }
    fetch('/api/notice/other.php?fromid=' + useridd)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
            } else {
                Qmsg.error('你没有收到任何信息！');
                return;
            }
            document.getElementById('sidebarfrom-toshowneofme').innerHTML = '';
            (data.notice).forEach(function (item) {
                const announcementContainer = document.createElement('div');
                let ifelseorcontent = '';
                announcementContainer.className = 'announcements';
                const announcement = document.createElement('div');
                announcement.className = 'announcement';
                const announcementContent = document.createElement('div');
                announcementContent.className = 'announcement-content';
                const announcementTitle = document.createElement('h2');
                announcementTitle.className = 'announcement-title';
                announcementTitle.textContent = (item.head).split('|')[1];
                if ((item.head).split('|')[0] === 'add' || (item.head).split('|')[0] === 'addgr') {
                    ifelseorcontent = `<button class="layui-btn layui-btn-sm" onclick="imjjthesqformetojoinmyfriendorgroup('${item.fromwho}','truet','${item.other}','${item.id}')">同意申请</button>
        <button class="layui-btn layui-btn-sm" onclick="imjjthesqformetojoinmyfriendorgroup('${item.fromwho}','truets','${item.other}','${item.id}')">拒绝申请</button>`;
                }
                const announcementText = document.createElement('p');
                announcementText.className = 'announcement-text';
                announcementText.textContent = item.body;
                const announcementDate = document.createElement('span');
                announcementDate.className = 'announcement-date';
                announcementDate.textContent = item.time;
                announcementContent.appendChild(announcementTitle);
                announcementContent.appendChild(announcementText);
                announcementContent.appendChild(announcementDate);
                announcement.appendChild(announcementContent);
                announcement.addEventListener('click', function () {
                    layer.open({
                        type: 1,
                        area: ['420px', 'auto'],
                        title: (item.head).split('|')[1],
                        zIndex: 19891014,
                        content: `
                <div style="padding: 20px;line-height: 22px; background-color: #F8F8F8; color: #333;">${item.body}</br>${ifelseorcontent}</div>
            `
                    });
                });
                document.getElementById('sidebarfrom-toshowneofme').appendChild(announcement);
            });
        });
}
function jxfor_canvasewmuserme(imageurl) {
    qrcodeParser(imageurl).then(res => {
        searehgroupfriend_button_onclick(res);
    })
}
async function voicefunccho(blobUrl) {
    yhload.show();
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('file', blob, 'yymy.wav');
    const uploadResponse = await fetch('/api/uploadvoice.php', {
        method: 'POST',
        body: formData
    });
    if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        if (data.status === 'success') {
            quill.insertText(0, `<audio controls src="/api/${data.file_path}" class="audio-player-voice"></audio>`);
            sendMessage();
            yhload.hide();
        }
    } else {
        console.error('Upload failed');
    }
}

var chunks = [];
const recordBtn = document.querySelector("#voiceInput");
const constraints = { audio: true };
navigator.mediaDevices.getUserMedia(constraints).then(
    stream => {
        const mediaRecorder = new MediaRecorder(stream);
        recordBtn.onclick = () => {
            if (musicplayerofmesay === 0) {
                nowcolorbackground = document.getElementById('voiceInput').style.backgroundColor;
                document.getElementById('voiceInput').style.backgroundColor = '#ff0000';
                musicplayerofmesay = 1;
            } else {
                document.getElementById('voiceInput').style.backgroundColor = nowcolorbackground;
                musicplayerofmesay = 0;
            }
            if (mediaRecorder.state === "recording") {
                mediaRecorder.stop();
            } else {
                mediaRecorder.start();
            }
        };
        mediaRecorder.ondataavailable = e => {
            chunks.push(e.data);
        };
        mediaRecorder.onstop = e => {
            var blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
            chunks = [];
            var audioURL = window.URL.createObjectURL(blob);
            voicefunccho(audioURL);
        };
    },
    () => {
    }
);
document.addEventListener('DOMContentLoaded', function () {
    quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: '#toolbar'
        },
        placeholder: '输入内容...',
    });
});
function openotherwindow(zjnamefor) {
    const friendList = document.getElementById('friend-list');
    const chatWindow = document.getElementById(zjnamefor);
    chatWindow.style.display = 'block';
    const rect = friendList.getBoundingClientRect();
    chatWindow.style.top = `28px`;
    chatWindow.style.left = `400px`;
    chatWindow.classList.add('open');
    friendList.classList.add('close');
    setTimeout(() => {
        chatWindow.classList.remove('close');
    }, 300);
}
function closeotherwindow() {
    const chatWindow = document.getElementById('addfriend');
    const chat2window = document.getElementById('addgroup');
    const friendList = document.getElementById('friend-list');
    chatWindow.classList.add('close');
    chat2window.classList.add('close');
    friendList.classList.add('open');
    setTimeout(() => {
        chatWindow.style.display = 'none';
        friendList.style.display = 'block';
        chat2window.style.display = 'none';
        friendList.classList.remove('open', 'close');
        chatWindow.classList.remove('open', 'close');
        chat2window.classList.remove('open', 'close');
    }, 300);
}
function closeotherwindow2(pcdid) {
    const chatWindow = document.getElementById('addfriend');
    const chat2window = document.getElementById('addgroup');
    const friendList = document.getElementById('friend-list');
    chatWindow.classList.add('open');
    chat2window.classList.add('close');
    friendList.classList.add('close');
    setTimeout(() => {
        chatWindow.style.display = 'block';
        friendList.style.display = 'none';
        chat2window.style.display = 'none';
        friendList.classList.remove('open', 'close');
        chatWindow.classList.remove('open', 'close');
        chat2window.classList.remove('open', 'close');
    }, 300);
}
function closeotherwindow3(pcdid) {
    const chatWindow = document.getElementById('addfriend');
    const chat2window = document.getElementById('addgroup');
    const friendList = document.getElementById('friend-list');
    chatWindow.classList.add('close');
    chat2window.classList.add('open');
    friendList.classList.add('close');
    setTimeout(() => {
        chatWindow.style.display = 'none';
        friendList.style.display = 'none';
        chat2window.style.display = 'block';
        friendList.classList.remove('open', 'close');
        chatWindow.classList.remove('open', 'close');
        chat2window.classList.remove('open', 'close');
    }, 300);
}
function tabchange(choosenum, jthf) {
    if (choosenum === 1) {
        var delelem = document.querySelectorAll('.friend-item');
        closeotherwindow();
        for (var i = 0; i < delelem.length; i++) {
            if (delelem[i].style.visibility === 'hidden') {
                delelem[i].style.visibility = 'visible';
            }
        }
    } else {
        var delelem = document.querySelectorAll('.friend-item');
        for (var i = 0; i < delelem.length; i++) {
            delelem[i].style.visibility = 'hidden';
        }
        if (jthf === 2) {
            closeotherwindow2('addfriend');
            openotherwindow('addfriend');
        } else if (jthf === 3) {
            closeotherwindow3('addgroup');
            openotherwindow('addgroup');
        }
    }
}
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        var atabnow = this.id;
        switch (atabnow) {
            case 'message-list1':
                tabchange(1);
                break;
            case 'message-list2':
                tabchange(2, 2);
                break;
            case 'message-list3':
                tabchange(2, 3);
                break;
        }
    });
});
function beloadinpagetoloadingwaitnot() {
    fetch('api/alllist.php?searchValue=' + useridd)
        .then(res => res.json())
        .then(data => {
            data.forEach(friend => {
                const friendList = document.getElementById('friend-list');
                const friendItem = document.createElement('div');
                let friendmrbrage = sessionStorage.getItem('newmsg_' + friend.id);
                const bragefromnum = friend.count;
                const friendmrbrageshow = (bragefromnum > 0 || friendmrbrage !== null && friendmrbrage > 0) ? 'inline' : 'none';
                if (bragefromnum > 0) {
                    friendmrbrage = bragefromnum;
                    (friend.messages).forEach((message) => {
                        sxmessage_foronep(friend.id, message.content);
                    });
                }
                friendItem.className = `friend-item ${friend.status === 1 ? 'friend-online' : 'friend-offline'}`;
                friendItem.setAttribute('data-id', friend.id);
                friendItem.innerHTML = `
                    <div class="friend-avatar" >
                    <img id="mytximg_${friend.id}" src='${friend.tximg}'></img>
                    </div>
                    <div class="friend-info">
                    <span id="badge-messagenum_${friend.id}" style="display:${friendmrbrageshow}" class="layui-badge">${friendmrbrage}</span>
                        <div id="myname_${friend.id}" class="friend-name">${friend.uname}</div>
                        <div id="mysayed_${friend.id}" class="friend-status">${friend.sayed}</div>
                    </div>
                `;
                friendItem.addEventListener('click', function () {
                    openchatwindow(friend.uname, friend.id, friend.tximg, friend.sayed);
                });
                friendList.appendChild(friendItem);
            });
        })
    fetch('api/alllistgroup.php?searchValue=' + useridd)
        .then(res => res.json())
        .then(data => {
            data.forEach(friend => {
                const friendList = document.getElementById('friend-list');
                const friendItem = document.createElement('div');
                const friendmrbrage = sessionStorage.getItem('newmsg_' + friend.id);
                const bragefromnum = friend.count;
                const friendmrbrageshow = (bragefromnum > 0 || friendmrbrage !== null && friendmrbrage > 0) ? 'inline' : 'none';
                if (bragefromnum > 0) {
                    friendmrbrage = bragefromnum;
                    (friend.messages).forEach((message) => {
                        sxmessage2_forgroup(friend.id, message.content, message.other);
                    });
                }
                friendItem.className = 'friend-item friend-online';
                friendItem.innerHTML = `
                    <div class="friend-avatar" >
                    <img id="mytximg_${friend.id}" src='${friend.group_img}'></img>
                    </div>
                    <div class="friend-info">
                    <span id="badge-messagenum_${friend.id}" style="display:${friendmrbrageshow}" class="layui-badge">${friendmrbrage}</span>
                        <div id="myname_${friend.id}" class="friend-name">${friend.group_name}</div>
                        <div  id="mysayed_${friend.id}" class="friend-status">${friend.group_tell}</div>
                    </div>
                `;
                friendItem.setAttribute('data-menber', friend.group_menber);
                friendItem.setAttribute('data-admin', friend.group_admin);
                friendItem.setAttribute('data-id', friend.id);
                sessionStorage.setItem('whatingrouptonosay_' + friend.id, friend.group_nosay);
                friendItem.addEventListener('click', function () {
                    openchatwindow2(friend.group_name, friend.id, friend.group_img, friend.group_tell, friend.group_menber, friend.group_admin, friend.group_nosay);
                });
                friendList.appendChild(friendItem);
            });
        });
}
document.addEventListener('DOMContentLoaded', function () {
    var loadIndex = layer.msg('加载中', {
        icon: 16,
        shade: 0.01
    });;
    beloadinpagetoloadingwaitnot();
    new QRCode(document.getElementById("qrCanvas"), useridd);
    layer.close(loadIndex);
});
function sxmessage2(chatid, content) {
    const id = Date.now().toString();
    let db;
    const request = indexedDB.open(chatid, 1);
    request.onerror = function (event) {
        console.error("Database error: " + event.target.errorCode);
    };
    request.onsuccess = function (event) {
        db = event.target.result;
        let transaction = db.transaction(["messages"], "readwrite");
        let store = transaction.objectStore("messages");
        let request = store.get(id);
        request.onsuccess = function () {
            if (request.result) {
            } else {
                let message = { sender: useridd, content: content, id: id, lter: chatid };
                let addRequest = store.add(message);
                addRequest.onsuccess = function () {
                };
                addRequest.onerror = function (event) {
                };
            }
        };
        request.onerror = function (event) {
        };
    };

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        let store = db.createObjectStore("messages", { keyPath: "id" });
        store.createIndex("sender", "sender", { unique: false });
    };
}
function sxmessage(chatid, content) {
    const id = Date.now().toString();
    let db;
    const request = indexedDB.open(useridd + chatid, 1);
    request.onerror = function (event) {
        console.error("Database error: " + event.target.errorCode);
    };
    request.onsuccess = function (event) {
        db = event.target.result;
        let transaction = db.transaction(["messages"], "readwrite");
        let store = transaction.objectStore("messages");
        let request = store.get(id);
        request.onsuccess = function () {
            if (request.result) {
            } else {
                let message = { sender: useridd, content: content, id: id, lter: chatid };
                let addRequest = store.add(message);
                addRequest.onsuccess = function () {
                };
                addRequest.onerror = function (event) {
                };
            }
        };
        request.onerror = function (event) {
        };
    };

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        let store = db.createObjectStore("messages", { keyPath: "id" });
        store.createIndex("sender", "sender", { unique: false });
    };
}

function playNewMessageSound() {
    const audio = new Audio('/ast/music/call.mp3');
    audio.play();
}

function showMenu(env) {
    env.preventDefault();
    var e = env || window.event;
    var context = document.getElementById("context");
    context.style.display = "block";
    var x = e.clientX;
    var y = e.clientY;
    context.style.left = x - 200 + "px"
    context.style.top = y - 35 + "px"
    return false;
};
document.onclick = function () {
    closeMenu()

};
function closeMenu() {
    var contextmenu = document.getElementById("context");
    contextmenu.style.display = "none";
}
function messageunder() {
    var chatbody = document.getElementById('chat-body2');
    chatbody.scrollTop = chatbody.scrollHeight;
}

function message_init(chatId, friendname, friendimg) {
    let db;
    const request = indexedDB.open(chatId, 1);
    request.onerror = function (event) {
        console.error("Database error: " + event.target.errorCode);
    };
    request.onsuccess = function (event) {
        db = event.target.result;
        let transaction = db.transaction(["messages"], "readonly");
        let store = transaction.objectStore("messages");
        let request = store.getAll();
        request.onsuccess = function () {
            let messages = request.result;
            let chatContainer = document.getElementById('chat-body2');
            let currentMessageCount = 0;
            let savedMessageCount = sessionStorage.getItem(ltddfid + '_messageCount');
            messages.forEach(message => {
                if (message.sender !== useridd && message.lter === ltddfid) {
                    currentMessageCount++;
                }
            });
            if (currentMessageCount !== parseInt(savedMessageCount, 10) && currentMessageCount > 0) {
                playNewMessageSound();
                sessionStorage.setItem(ltddfid + '_messageCount', currentMessageCount);
            }
            messages.forEach(message => {
                let existingElement = chatContainer.querySelector(`[data-id="${message.id}"]`);
                if (!existingElement && message.lter === ltddfid) {
                    const messageElement = document.createElement('div');
                    const messageClass = message.sender === useridd ? 'message right' : 'message left';
                    messageElement.className = messageClass;
                    messageElement.dataset.id = message.id;
                    messageElement.innerHTML = `<div class="message-content">[我]</div>`;
                    if (messageClass === 'message left') {
                        messageElement.innerHTML = `<div class="avatar"><img src=${friendimg} alt="Other's Avatar"></div>` + messageElement.innerHTML;
                        messageElement.querySelector('.message-content').innerHTML = `[${friendname}]<div>${(message.content)}</div>`;
                    } else {
                        messageElement.innerHTML += `<div class="avatar own"><img src=${usermyimg} alt="Your Avatar"></div>`;
                        messageElement.querySelector('.message-content').innerHTML += `<div>${(message.content)}</div>`;
                    }
                    chatContainer.appendChild(messageElement);
                }
            });
        };
        request.onerror = function (event) {
            console.error("Error reading messages: " + event.target.errorCode);
        };
    };
    request.onupgradeneeded = function (event) {
        db = event.target.result;
        let store = db.createObjectStore("messages", { keyPath: "id" });
        store.createIndex("sender", "sender", { unique: false });
    };
}
function message_init2(chatId) {
    let db;
    const request = indexedDB.open(useridd + chatId, 1);
    request.onerror = function (event) {
        console.error("Database error: " + event.target.errorCode);
    };
    request.onsuccess = function (event) {
        db = event.target.result;
        let transaction = db.transaction(["messages"], "readonly");
        let store = transaction.objectStore("messages");
        let request = store.getAll();
        request.onsuccess = function () {
            let messages = request.result;
            let chatContainer = document.getElementById('chat-body2');
            let currentMessageCount = 0;
            let savedMessageCount = sessionStorage.getItem(ltddfid + '_messageCount');
            messages.forEach(message => {
                if (message.sender !== useridd && message.lter === ltddfid) {
                    currentMessageCount++;
                }
            });
            if (currentMessageCount !== parseInt(savedMessageCount, 10) && currentMessageCount > 0) {
                playNewMessageSound();
                sessionStorage.setItem(ltddfid + '_messageCount', currentMessageCount);
            }
            messages.forEach(message => {
                let existingElement = chatContainer.querySelector(`[data-id="${message.id}"]`);
                if (!existingElement && message.lter === ltddfid) {
                    let messageClass;
                    const messageElement = document.createElement('div');
                    if (message.sender === 'notice') {
                        messageClass = 'system-message';
                    } else {
                        messageClass = message.sender === useridd ? 'message right' : 'message left';
                    }
                    messageElement.className = messageClass;
                    messageElement.dataset.id = message.id;
                    messageElement.innerHTML = `<div class="message-content">[我]</div>`;
                    if (messageClass === 'message left') {
                        const foundthissay = allgroupinfo.filter(userf => userf.id === message.sender)[0];
                        messageElement.innerHTML = `<div class="avatar"><img onclick="bindingroupoutsidenotisinlistdown('${foundthissay.tximg}','${foundthissay.uname}','${message.sender}');" src=${foundthissay.tximg} alt="Other's Avatar"></div>` + messageElement.innerHTML;
                        messageElement.querySelector('.message-content').innerHTML = `[${foundthissay.uname}]<div>${(message.content)}</div>`;
                    } else if (messageClass === 'message right') {
                        messageElement.innerHTML += `<div class="avatar own"><img  src=${usermyimg} alt="Your Avatar"></div>`;
                        messageElement.querySelector('.message-content').innerHTML += `<div>${(message.content)}</div>`;
                    } else {
                        messageElement.innerHTML = `<div class="message-content">[系统]</div>`;
                        messageElement.className = 'system-message';
                        let messageContainer = document.createElement('div');
                        messageContainer.className = 'message-container';
                        let content = document.createElement('div');
                        content.className = 'message-content';
                        content.innerHTML = message.content;
                        messageContainer.appendChild(content);
                        messageElement.appendChild(messageContainer);
                    }
                    chatContainer.appendChild(messageElement);
                }
            });
        };
        request.onerror = function (event) {
            console.error("错误" + event.target.errorCode);
        };
    };
    request.onupgradeneeded = function (event) {
        db = event.target.result;
        let store = db.createObjectStore("messages", { keyPath: "id" });
        store.createIndex("sender", "sender", { unique: false });
    };
}
function htmldecode(text) {
    if (/&[a-zA-Z0-9#]+;/.test(text)) {
        var temp = document.createElement("div");
        temp.innerHTML = text;
        var output = temp.innerText || temp.textContent;
        temp = null;
        return output;
    } else {
        return text;
    }
}
function sendMessage() {
    var inputcontent2 = quill.root.innerHTML;
    var inputcontent = htmldecode(inputcontent2);
    sxmessage2(ltddfid, inputcontent);
    fightingout.newmessage(inputcontent, 2, ltddfid, useridd, 1);
    quill.root.innerHTML = 'content';
}
function sendMessage2() {
    var inputcontent2 = quill.root.innerHTML;
    var inputcontent = htmldecode(inputcontent2);
    sxmessage(ltddfid, inputcontent);
    const newarraygroup = allgroupinfo.filter(neum => neum.id !== useridd);
    newarraygroup.forEach(everyus => {
        fightingout.newmessage(inputcontent, 2, everyus.id, ltddfid, useridd);
    })
    quill.root.innerHTML = '';
}
function deltheidindeddb(dbName) {
    if (!('indexedDB' in window)) {
        return;
    }
    let deleteRequest = indexedDB.deleteDatabase(dbName);
    deleteRequest.onsuccess = function () {
    };
    deleteRequest.onerror = function (event) {
        console.error('');
    };
    deleteRequest.onblocked = function () {
        console.log(`?`);
    };
    Qmsg.success('聊天记录删除成功');
    layer.closeAll();
}
function deltheidindeddb_group(dbName) {
    if (!('indexedDB' in window)) {
        return;
    }
    let deleteRequest = indexedDB.deleteDatabase(useridd + dbName);
    deleteRequest.onsuccess = function () {
    };
    deleteRequest.onerror = function (event) {
        console.error(``);
    };
    deleteRequest.onblocked = function () {
        console.log(``);
    };
    Qmsg.success('聊天记录删除成功');
    layer.closeAll();
}
function delbeforetalk() {
    fetch('/api/deltalk.php?qqqzid=' + useridd + '&sqzid=' + ltddfid, {
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).then(response => {
        if (response.ok) {
            deltheidindeddb(ltddfid);
            fightingout.newmessage('delid', 3, ltddfid, useridd);
            layer.msg('好友删除成功');
            setTimeout(() => {
                closechatwindow();
            }, 1500);
        } else {
            throw new Error('网络响应错误，状态码：' + response.status);
        }
    })
        .catch(error => {
            if (error.message.includes('400')) {
                layer.msg('会话删除失败');
            } else {
                layer.msg('请求失败：' + error.message);
            }
        });
}
function cmd_tocheckorfecktheplayeringroup(ybtcdperid, ybtcdpername) {
    fetch('/api/deltalk_group.php?qqqzid=' + ybtcdperid + '&sqzid=' + ltddfid, {
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).then(response => {
        if (response.ok) {
            yhload.show();
            const newarraygroup = allgroupinfo.filter(neum => neum.id !== ybtcdperid);
            newarraygroup.forEach(everyus => {
                fightingout.newmessage(ybtcdpername + '已被管理员踢出本群', 4, everyus.id, ltddfid);
            })
            yhload.hide();
            setTimeout(() => {
                closechatwindow();
            }, 1500);
            layer.msg('踢出成功');
        } else {
            throw new Error('网络响应错误，状态码：' + response.status);
        }
    })
        .catch(error => {
            if (error.message.includes('400')) {
                layer.msg('会话删除失败');
            } else {
                layer.msg('请求失败：' + error.message);
            }
        });
}
function delbeforetalk2() {
    fetch('/api/deltalk_group.php?qqqzid=' + useridd + '&sqzid=' + ltddfid, {
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).then(response => {
        if (response.ok) {
            yhload.show();
            const newarraygroup = allgroupinfo.filter(neum => neum.id !== useridd);
            newarraygroup.forEach(everyus => {
                fightingout.newmessage(myusernamefor + '已退出本群', 4, everyus.id, ltddfid);
            })
            deltheidindeddb_group(ltddfid);
            layer.msg('群聊退出成功');
            yhload.hide();
            setTimeout(() => {
                closechatwindow();
            }, 1500);
        } else {
            throw new Error('网络响应错误，状态码：' + response.status);
        }
    })
        .catch(error => {
            if (error.message.includes('400')) {
                layer.msg('会话删除失败');
            } else {
                layer.msg('请求失败：' + error.message);
            }
        });

}
function clearmsgbrage(msgfrom) {
    const msgnownum = sessionStorage.getItem('newmsg_' + msgfrom);
    const brageyourmsg = document.getElementById('badge-messagenum_' + msgfrom);
    if (msgnownum >= 1) {
        sessionStorage.setItem('newmsg_' + msgfrom, 0);
        brageyourmsg.style.display = 'none';
    }

}
function openchatwindow(friendName, friendid, friendimg, friendsay) {
    sessionStorage.setItem('whatimnowin', friendid);
    document.getElementById('sendmsg_button2').onclick = function () {
        sendMessage();
    };
    document.getElementById('sendmsg_button2').textContent = '发送';
    document.getElementById('sendmsg_button2').disabled = false;
    ltddfid = friendid;
    clearmsgbrage(friendid);
    sessionStorage.setItem('nowiminfriend', friendid);
    document.getElementById('chat-body2').innerHTML = '';
    messageunder();
    const friendList = document.getElementById('friend-list');
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.style.display = 'block';
    document.getElementById('chatTitle').innerHTML = `与 <span id="button_whofriend"  style="color: blue; cursor: pointer;">${friendName}</span>的聊天`;
    const rect = friendList.getBoundingClientRect();
    chatWindow.style.top = `${window.scrollY + rect.top}px`;
    chatWindow.style.left = `400px`;
    chatWindow.classList.add('open');
    friendList.classList.add('close');
    setTimeout(() => {
        chatWindow.classList.remove('close');
    }, 300);
    message_init(friendid, friendName, friendimg);
    timesetinvel = setInterval(function () {
        message_init(ltddfid, friendName, friendimg);
    }, 1500);
    document.getElementById('button_whofriend').addEventListener('click', function () {
        layer.open({
            type: 1,
            area: ['420px', '240px'],
            title: '好友信息',
            content: `
            <link rel="stylesheet" href="/ast/index-im/indexfriend.css">
            <div class="friend-profile">
            <img src="${friendimg}" alt="好友头像" class="friend-image">
            <div class="friend-info">
                <div class="friend-name">${friendName}</div>
                <div class="friend-bio">${friendsay}</div>
                <div class="friend-actions">
                    <button class="delete-btn">删除</button>
                    <button class="clear-btn">清空聊天记录</button>
                </div>
            </div>
        </div>
            `
        });
        document.querySelector('.delete-btn').addEventListener('click', function () {
            layer.confirm('确定删除该好友吗？', {
                btn: ['确定', '取消']
            }, function () {
                delbeforetalk();
            });
        });
        document.querySelector('.clear-btn').addEventListener('click', function () {
            layer.confirm('确定清空聊天记录吗？', {
                btn: ['确定', '取消']
            }, function () {
                deltheidindeddb(ltddfid);
            });
        });
    });
}
function bindallimgingrouplist_formeall() {
    const userImgs = document.querySelectorAll('.lookformetobuttoninadd');
    userImgs.forEach(img => {
        img.addEventListener('click', function () {
            var tasids = img.getAttribute('hisshis');
            var hisname = img.getAttribute('hisnameis');
            layer.open({
                type: 1,
                area: ['420px', '240px'],
                title: 'TA的信息',
                zIndex: 19891014,
                content: `
                <link rel="stylesheet" href="/ast/index-im/indexfriend.css">
                <div class="friend-profile">
                <img src="${this.src}" alt="它的头像" class="friend-image">
                <div class="friend-info">
                    <div class="friend-name">${hisname}</div>
                    <div class="friend-actions">
                        <button class="add-btn">添加好友</button>
                        <button class="clearper-btn">踢出群聊</button>
                    </div>
                </div>
            </div>
                `
            });
            document.querySelector('.add-btn').addEventListener('click', function () {
                if (useridd === tasids) {
                    Qmsg.error('不能添加自己为好友');
                    return;
                }
                layer.closeAll();
                document.getElementById('message-list1').classList.remove('active');
                document.getElementById('message-list2').classList.add('active');
                closechatwindow();
                tabchange(2, 2);
                searehgroupfriend_button_onclick(tasids);
            });
            document.querySelector('.clearper-btn').addEventListener('click', function () {
                layer.confirm('确定要踢掉TA吗？', {
                    btn: ['确定', '取消']
                }, function () {
                    if (!allgroupofmyinadmin.includes(useridd)) {
                        Qmsg.error('你的权限不足');
                        layer.closeAll();
                        return;
                    }
                    if (allgroupofmyinadmin[0] !== useridd && allgroupofmyinadmin.includes(tasids)) {
                        Qmsg.error('你没有权限踢掉TA');
                        layer.closeAll();
                        return;
                    }
                    if (tasids === useridd) {
                        Qmsg.error('不能踢掉自己');
                        layer.closeAll();
                        return;
                    }
                    cmd_tocheckorfecktheplayeringroup(tasids, hisname);
                });
            });
        });
    });
}
function bindingroupoutsidenotisinlistdown(txis, txname, txid) {
    layer.open({
        type: 1,
        area: ['420px', '240px'],
        title: 'TA的信息',
        zIndex: 19891014,
        content: `
                <link rel="stylesheet" href="/ast/index-im/indexfriend.css">
                <div class="friend-profile">
                <img src="${txis}" alt="它的头像" class="friend-image">
                <div class="friend-info">
                    <div class="friend-name">${txname}</div>
                    <div class="friend-actions">
                        <button class="add-btn">添加好友</button>
                        <button class="clearper-btn">踢出群聊</button>
                    </div>
                </div>
            </div>
                `
    });
    document.querySelector('.add-btn').addEventListener('click', function () {
        if (useridd === txid) {
            Qmsg.error('不能添加自己为好友');
            return;
        }
        layer.closeAll();
        document.getElementById('message-list1').classList.remove('active');
        document.getElementById('message-list2').classList.add('active');
        closechatwindow();
        tabchange(2, 2);
        searehgroupfriend_button_onclick(txid);
    });
    document.querySelector('.clearper-btn').addEventListener('click', function () {
        layer.confirm('确定要踢掉TA吗？', {
            btn: ['确定', '取消']
        }, function () {
            if (!allgroupofmyinadmin.includes(useridd)) {
                Qmsg.error('你的权限不足');
                layer.closeAll();
                return;
            }
            if (allgroupofmyinadmin[0] !== useridd && allgroupofmyinadmin.includes(txid)) {
                Qmsg.error('你没有权限踢掉TA');
                layer.closeAll();
                return;
            }
            if (txid === useridd) {
                Qmsg.error('不能踢掉自己');
                layer.closeAll();
                return;
            }
            cmd_tocheckorfecktheplayeringroup(txid, txname);
        });
    });
}
function searchandliorderall(group_menber, group_admin) {
    adminhtmlmenber = '';
    userhtmlmenber = '';
    group_menber.forEach(function (item) {
        var namelength = item.uname.length;
        var cols = namelength > 4 ? 3 : 4;
        if (group_admin.includes(item.id)) {
            adminhtmlmenber += '<div class="user-item" style="width: ' + (100 / cols) + '%; float: left; margin-right: 10px; margin-top: 10px;">' +
                '<img hisshis="' + item.id + '" hisnameis="' + item.uname + '" hissayis="' + item.sayed + '" class="lookformetobuttoninadd"  src="' + item.tximg + '" alt="' + item.uname + '"><span>' + item.uname + '</span></div>';
            if (adminhtmlmenber.match(/(<div class="user-item"[^]*?){3}/)) {
                adminhtmlmenber += '<div style="clear: both;"></div>';
            }
        } else {
            userhtmlmenber += '<div class="user-item" style="width: ' + (100 / cols) + '%; float: left; margin-right: 10px; margin-top: 10px;">' +
                '<img hisshis="' + item.id + '" hisnameis="' + item.uname + '" hissayis="' + item.sayed + '" class="lookformetobuttoninadd" src="' + item.tximg + '" alt="' + item.uname + '"><span>' + item.uname + '</span></div>';
            if (userhtmlmenber.match(/(<div class="user-item"[^]*?){3}/)) {
                userhtmlmenber += '<div style="clear: both;"></div>';
            }
        }
    });
}
function ceatenewingroupofthenotice() {
    fetch('/api/notice/?fromid=' + ltddfid)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
            } else {
                Qmsg.error('公告拉取失败');
                return;
            }
            document.getElementById('tab-item-003-notice').innerHTML = '';
            (data.notice).forEach(function (item) {
                const announcementContainer = document.createElement('div');
                announcementContainer.className = 'announcements';
                const announcement = document.createElement('div');
                announcement.className = 'announcement';
                const announcementContent = document.createElement('div');
                announcementContent.className = 'announcement-content';
                const announcementTitle = document.createElement('h2');
                announcementTitle.className = 'announcement-title';
                announcementTitle.textContent = item.title;
                const announcementText = document.createElement('p');
                announcementText.className = 'announcement-text';
                announcementText.textContent = item.content;
                const announcementDate = document.createElement('span');
                announcementDate.className = 'announcement-date';
                announcementDate.textContent = item.time;
                announcementContent.appendChild(announcementTitle);
                announcementContent.appendChild(announcementText);
                announcementContent.appendChild(announcementDate);
                announcement.appendChild(announcementContent);
                announcement.addEventListener('click', function () {
                    layer.open({
                        type: 1,
                        area: ['420px', 'auto'],
                        title: item.title,
                        zIndex: 19891014,
                        zIndex: 999,
                        content: `
                <div style="padding: 20px;z-index:9999 ;line-height: 22px; background-color: #F8F8F8; color: #333;">${item.content}</div>
            `
                    });
                });
                document.getElementById('tab-item-003-notice').appendChild(announcement);
            });
        });
}
function add_thenoticeinthegroup(notice, titlecon) {
    fetch('/api/notice/new.php', {
        method: 'POST',
        body: new URLSearchParams({
            notice: notice,
            groupid: ltddfid,
            title: titlecon
        }),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                Qmsg.success('公告发布成功');
            } else {
                Qmsg.error('公告发布失败' + '，原因是' + data.message);
            }
        })
}
function update_thegroupnosayedofmine() {
    fetch('/api/other/onoffnosayed.php?qunid=' + ltddfid)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                Qmsg.success(data.msg);
                if (data.ifelse === 1) {
                    const newarraygroup = allgroupinfo.filter(neum => neum.id !== useridd);
                    newarraygroup.forEach(everyus => {
                        fightingout.newmessage(myusernamefor + data.msg, 5, everyus.id, ltddfid);
                    })
                } else {
                    const newarraygroup = allgroupinfo.filter(neum => neum.id !== useridd);
                    newarraygroup.forEach(everyus => {
                        fightingout.newmessage(myusernamefor + data.msg, 6, everyus.id, ltddfid);
                    })
                }
            } else {
                Qmsg.error(data.msg);
            }
        })
}
function alleveryonebothtobanthesayed(nosayifelse) {
    let showyouruserifcontent;
    if (nosayifelse === 1) {
        showyouruserifcontent = '是否关闭全群禁言';
    } else {
        showyouruserifcontent = '是否开启全群禁言';
    }
    layer.confirm(showyouruserifcontent, {
        btn: ['确定', '取消']
    }, function () {
        layer.closeAll();
        update_thegroupnosayedofmine();
    })
}
function alleveryonebothtonewseenotice() {
    layer.confirm('请使用|||来分隔标题和内容；例如：标题|||内容', {
        btn: ['确定', '取消']
    }, function () {
        layer.closeAll();
        layer.prompt({ title: 'new notice', formType: 2 }, function (text, index) {
            if (text !== '') {
                var textarr = text.split('|||');
                if (textarr[0] !== '' && textarr[1] !== '') {
                    add_thenoticeinthegroup(textarr[1], textarr[0]);
                } else if (textarr[0] === '') {
                    Qmsg.error('请输入公告标题');
                } else {
                    Qmsg.error('请输入公告内容');
                }
            } else {
                Qmsg.error('请完善内容');
            }
            layer.close(index);
        });
    });
}
function nosayedtogroup_inbuttononclick() {
    Qmsg.error('全局禁言中...您无法发言');
}
function openchatwindow2(groupname, groupid, groupimg, group_tell, group_menber, group_admin, group_nosay) {
    sessionStorage.setItem('whatimnowin', groupid);
    document.getElementById('sendmsg_button2').onclick = function () {
        sendMessage2();
    };
    ltddfid = groupid;
    allgroupinfo = group_menber;
    allgroupofmyinadmin = group_admin;
    const nowjyinkhdfesidew = sessionStorage.getItem('whatingrouptonosay_' + ltddfid);
    messageunder();
    if (group_nosay === 1 && !allgroupofmyinadmin.includes(useridd)) {
        document.getElementById('sendmsg_button2').textContent = '禁言中...';
        document.getElementById('sendmsg_button2').disabled = true;
        document.getElementById('sendmsg_button2').onclick = function () {
            nosayedtogroup_inbuttononclick();
        };
    } else {
        if (nowjyinkhdfesidew === 'jy') {
            document.getElementById('sendmsg_button2').textContent = '禁言中...';
            document.getElementById('sendmsg_button2').disabled = true;
            document.getElementById('sendmsg_button2').onclick = function () {
                nosayedtogroup_inbuttononclick();
            };
        } else {
            document.getElementById('sendmsg_button2').textContent = '发送';
            document.getElementById('sendmsg_button2').disabled = false;
        }
    }
    searchandliorderall(group_menber, group_admin);
    const allmenbernumin = group_menber.length;
    clearmsgbrage(groupid);
    sessionStorage.setItem('nowiminfriend', groupid);
    document.getElementById('chat-body2').innerHTML = '';
    const friendList = document.getElementById('friend-list');
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.style.display = 'block';
    document.getElementById('chatTitle').innerHTML = `<span id="button_whofriend"  style="color: blue; cursor: pointer;">${groupname}</span>(${allmenbernumin})<i style="margin-left:5px" id="button_putlistmen" class="layui-icon layui-icon-down layui-font-12"></i>`;
    const rect = friendList.getBoundingClientRect();
    chatWindow.style.top = `${window.scrollY + rect.top}px`;
    chatWindow.style.left = `400px`;
    chatWindow.classList.add('open');
    friendList.classList.add('close');
    setTimeout(() => {
        chatWindow.classList.remove('close');
    }, 300);
    message_init2(groupid);
    timesetinvel = setInterval(function () {
        message_init2(ltddfid);
    }, 1500);
    document.getElementById('button_whofriend').addEventListener('click', function () {
        layer.open({
            type: 1,
            area: ['420px', '240px'],
            title: '群聊信息',
            content: `
            <link rel="stylesheet" href="/ast/index-im/indexfriend.css">
            <div class="friend-profile">
            <img src="${groupimg}" alt="群聊头像" class="friend-image">
            <div class="friend-info">
                <div class="friend-name">${groupname}</div>
                <div class="friend-bio">${group_tell}</div>
                <div class="friend-actions">
                    <button class="delete-btn">退群</button>
                    <button class="clear-btn">清空聊天记录</button>
                </div>
            </div>
        </div>
            `
        });
        document.querySelector('.delete-btn').addEventListener('click', function () {
            layer.confirm('确定退出该群聊吗？', {
                btn: ['确定', '取消']
            }, function () {
                delbeforetalk2();
            });
        });
        document.querySelector('.clear-btn').addEventListener('click', function () {
            layer.confirm('确定清空聊天记录吗？', {
                btn: ['确定', '取消']
            }, function () {
                deltheidindeddb_group(ltddfid);
            });
        });
    });
    layui.use(function () {
        var dropdown = layui.dropdown;
        dropdown.render({
            elem: '#button_putlistmen',
            content: `<div class="layui-tab layui-tab-brief" style="padding: 10px;" lay-filter="filter-demo">
          <ul class="layui-tab-title">
            <li class="layui-this">群管理员</li>
            <li>群成员</li>
            <li>群公告</li>
            <li>其它-设置</li>
          </ul>
          <div class="layui-tab-content">
            <div class="layui-tab-item layui-show" style="padding: 10px; overflow-y: auto; height: 150px;">
              ${adminhtmlmenber}
            </div>
            <div class="layui-tab-item" style="padding: 10px; overflow-y: auto; height: 150px;">
              ${userhtmlmenber}
            </div>
            <div  class="layui-tab-item" style="padding: 10px; overflow-y: auto; height: 150px;">
            <div id="tab-item-003-notice" class="announcements">
    </div>
  </div>
  <div class="layui-tab-item" style="padding: 10px; overflow-y: auto; height: 150px;">
    <div class="qr-canvas-container">
    <div id="qrCanvas_group"  class="qr-canvas">
    </div>
    <div style="margin-top:10px">
      <button id="talk-group-bansayed" button="alleveryonebothtobanthesayed();" class="layui-btn layui-btn-sm">全群禁言[关]</button>
      <button id="talk-group-newtalknotice" button="alleveryonebothtonewseenotice();" class="layui-btn layui-btn-sm">发布群公告</button>
    </div>
            </div>
          </div>
        </div>`,
            className: 'dropdown-tab-list-group',
            style: 'width: 470px; height: 250px; box-shadow: 1px 1px 30px rgb(0 0 0 / 12%);',
            ready: function () {
                layui.use('element', function (element) {
                    element.render('tab');
                    bindallimgingrouplist_formeall();
                    element.on('tab(filter-demo)', function (data) {
                        if (data.index === 2) {
                            ceatenewingroupofthenotice();
                        } else if (data.index === 3) {
                            new QRCode(document.getElementById("qrCanvas_group"), ltddfid);
                            if (!allgroupofmyinadmin.includes(useridd)) {
                                document.getElementById('talk-group-bansayed').remove();
                                document.getElementById('talk-group-newtalknotice').remove();
                            }
                            if (group_nosay === 1) {
                                document.getElementById('talk-group-bansayed').textContent = '全群禁言[开]';
                            }
                            document.getElementById('talk-group-bansayed').addEventListener('click', function () {
                                alleveryonebothtobanthesayed(group_nosay);
                            });
                            document.getElementById('talk-group-newtalknotice').addEventListener('click', function () {
                                alleveryonebothtonewseenotice();
                            });
                        }
                    });
                });
            }
        });
    });
}
function closechatwindow() {
    sessionStorage.setItem('whatimnowin', 0);
    sessionStorage.setItem('nowiminfriend', 0);
    clearInterval(timesetinvel);
    const chatWindow = document.getElementById('chatWindow');
    const friendList = document.getElementById('friend-list');
    chatWindow.classList.add('close');
    friendList.classList.add('open');
    setTimeout(() => {
        chatWindow.style.display = 'none';
        friendList.style.display = 'block';
        friendList.classList.remove('open', 'close');
        chatWindow.classList.remove('open', 'close');
    }, 300);
}
document.getElementById('chatWindow').addEventListener('animationend', function (e) {
    if (e.animationName === 'flipOut') {
        this.style.display = 'none';
    }
});
document.getElementById('languanew').addEventListener('change', function () {
    var selectedLanguage = this.value;
    switch (selectedLanguage) {
        case 'zh':
            chinese_website();
            break;
        case 'en':
            english_website();
            break;
        default:
            console.log('你没有选择合适的语言');
    }
});
function chinese_website() {
    translate.listener.start();
    translate.changeLanguage('chinese');
}
function english_website() {
    translate.listener.start();
    translate.changeLanguage('english');
}
function button_addfriendjsonputsx(searchgrouporfriend_val_button) {
    const friendinfodivs = document.querySelectorAll('div.friend-info');
    friendinfodivs.forEach(div => {
        const spans = div.querySelectorAll('span');
        spans.forEach(span => {
            const id = span.id;
            if (id.startsWith('badge-messagenum_')) {
                const value = id.split('_')[1];
                if (value === searchgrouporfriend_val_button) {
                    document.getElementById('addfriendorgroup_button').disabled = true;
                    document.getElementById('addfriendorgroup_button').textContent = '已添加';
                    return;
                }
            }
        });
    });
}
function button_addfriendalertput(searvaluename, searvalieid) {
    layer.confirm('确定添加' + searvaluename + '吗？', {
        btn: ['确定', '取消']
    }, function () {
        fetch('/api/addfriend.php?searchid=' + useridd + '&dfid=' + searvalieid + '&dfname=' + searvaluename)
            .then(res => res.json())
            .then(data => {
                if (data.code === 1) {
                    Qmsg.success('好友申请已发送');
                } else {
                    Qmsg.error(data.msg);
                }
            })
            .catch(err => {
                console.log(err);
                console.log('/api/addfriend.php?searchid=' + useridd + '&dfid=' + searvalieid + '&dfname=' + searvaluename);
            });
        layer.closeAll();
    });
}
function searehgroupfriend_button_onclick(searvalueorgroup) {
    if (searvalueorgroup === '') {
        Qmsg.error('请输入要搜索的人id或群号');
        return;
    }
    if (searvalueorgroup === useridd) {
        Qmsg.error('难道你有替身人格？');
        return;
    }
    fetch('/api/searchnewfrie.php?searchid=' + searvalueorgroup)
        .then(res => res.json())
        .then(data => {
            if (data.status === 1) {
                jsonjxa = data.msg;
                document.getElementById('qr-canvas-container-ids').style.visibility = 'hidden';
                document.getElementById('profile-container-id').style.visibility = 'visible';
                if (jsonjxa.type === 'friend') {
                    Qmsg.success('搜索到以下个人');
                    document.getElementById('profile-usernametext').textContent = jsonjxa.uname;
                    document.getElementById('profile-usersayedtext').textContent = jsonjxa.sayed;
                    document.getElementById('profile-userimgsrctext').src = jsonjxa.tximg;
                    document.getElementById('addfriendorgroup_button').addEventListener('click', function () {
                        button_addfriendalertput(jsonjxa.uname, jsonjxa.id);
                    });
                } else {
                    Qmsg.success('搜索到以下群');
                    document.getElementById('profile-usernametext').textContent = jsonjxa.group_name;
                    document.getElementById('profile-usersayedtext').textContent = jsonjxa.group_tell;
                    document.getElementById('profile-userimgsrctext').src = jsonjxa.group_img;
                    document.getElementById('addfriendorgroup_button').addEventListener('click', function () {
                        button_addfriendalertput(jsonjxa.group_name, jsonjxa.id);
                    });
                }
                document.getElementById('addfriendorgroup_button').disabled = false;
                document.getElementById('addfriendorgroup_button').textContent = '添加';
                button_addfriendjsonputsx(searvalueorgroup);
            } else {
                Qmsg.error('未搜索到此人或群聊：' + searvalueorgroup);
                document.getElementById('qr-canvas-container-ids').style.visibility = 'visible';
                document.getElementById('profile-container-id').style.visibility = 'hidden';
            }
        })
}
document.getElementById('searchgrouporfriend').addEventListener('click', function (
) {
    var searvalueorgroup = document.getElementById('searchgrouporfriend_val').value;
    searehgroupfriend_button_onclick(searvalueorgroup);
})
function lookmyinfoandupdatemyinfo(updatetovalue, choosenumvalue) {
    fetch('/api/page/update/info.php?myid=' + useridd + '&updatevalue=' + updatetovalue + '&choosenum=' + choosenumvalue + '&type=mine')
        .then(res => res.text())
        .then(data => {
            Qmsg.success('修改成功');
        })
}
document.getElementById('user-avatar-id-toopenapage').addEventListener('click', function () {
    layer.open({
        type: 1,
        area: ['420px', '240px'],
        title: '我的信息',
        content: `
        <link rel="stylesheet" href="/ast/index-im/indexfriend.css">
        <div class="friend-profile">
        <img src="${usermyimg}" alt="我的头像" class="friend-image">
        <div class="friend-info">
            <div class="friend-name">${myusernamefor}</div>
            <div class="friend-bio">欲成尊，先拜天，天上宫阙有神仙</div>
            <div class="friend-actions">
            <button class="clear-btn">修改个人信息</button>
            <button class="delete-btn-idfromlogout">退出登录</button>
        </div>
            </div>
    </div>
        `
    });
    document.querySelector('.delete-btn-idfromlogout').addEventListener('click', function () {
        layer.confirm('确定退出登录吗？', {
            btn: ['确定', '取消']
        }, function () {
            layer.closeAll();
            sessionStorage.removeItem('user');
            setTimeout(function () {
                window.location.reload();
            }, 1000);

        });
    });
    document.querySelector('.clear-btn').addEventListener('click', function () {
        layer.prompt({ title: '修改名称', formType: 2 }, function (text, index) {
            layer.close(index);
            if (text !== '') {
                lookmyinfoandupdatemyinfo(text, 'name');
            }
        });
        layer.prompt({ title: '修改个性签名', formType: 2 }, function (text, index) {
            layer.close(index);
            if (text !== '') {
                lookmyinfoandupdatemyinfo(text, 'sayed');
            }
        });
        layer.prompt({ title: '修改头像', formType: 2 }, function (text, index) {
            layer.close(index);
            if (text !== '') {
                lookmyinfoandupdatemyinfo(text, 'img');
            }
        });
        layer.prompt({ title: '修改密码', formType: 2 }, function (text, index) {
            layer.close(index);
            if (text !== '') {
                lookmyinfoandupdatemyinfo(text, 'password');
            }
        });
    });
})
document.getElementById('imageinserttheinput').addEventListener('click', function (event) {
    event.preventDefault();
    layer.prompt({ title: '图片URL', formType: 2 }, function (text, index2) {
        if (text !== '') {
            layer.close(index2);
            var html = `<img src="${text}" alt="图片">`;
            dangerouslyPasteHTML_toremove(html);
        } else {
            layer.msg('请输入图片URL');
        }
    })
})
function addtheemojitotheinput(thistextinner) {
    var replacesnow = thistextinner.replace(/<\/?.+?\/?>/g, '');
    dangerouslyPasteHTML_toremove(replacesnow);
}
document.getElementById('emoji-inputtoenter').addEventListener('click', function (event) {
    const emojiContainer = document.getElementById('emoji-putinthecontiner');
    emojiContainer.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'emoji-container';
    for (var a = 128512; a <= 128580; a++) {
        const emojis = '&#' + a;
        const emojiItem = document.createElement('p');
        emojiItem.className = 'emoji-item';
        emojiItem.innerHTML = emojis;
        container.appendChild(emojiItem);
    }
    for (var b = 129296; b <= 129488; b++) {
        const emojis = '&#' + b;
        const emojiItem = document.createElement('p');
        emojiItem.className = 'emoji-item';
        emojiItem.innerHTML = emojis;
        container.appendChild(emojiItem);
    }

    emojiContainer.appendChild(container);
    layer.open({
        type: 1,
        title: 'Emoji',
        content:
            emojiContainer.innerHTML,
        area: ['300px', '300px']
        ,
        success: function (layero, index) {
            const emojiItems = document.querySelectorAll('.emoji-item');
            for (var i = 0; i < emojiItems.length; i++) {
                emojiItems[i].addEventListener('click', function () {
                    addtheemojitotheinput(this.innerHTML);
                });
            }
        }
    });
})
function friend_fromasid_tobuild_videoorvoiceth(anserorques) {
    starbulidiopvideo = layer.open({
        type: 2,
        title: '视频通话',
        area: ['700px', '480px'],
        content: '/api/video_client/video-nowbegain.php?type=' + anserorques,
        end: function () {
            fightingout.newmessage(myusernamefor + '已挂断视频通话', 8, ltddfid, useridd);
        }
    });
}
document.getElementById('voiceforvideon').addEventListener('click', function (event) {
    sessionStorage.setItem('typevideoth_user', ltddfid);
    if (ltddfid.length > 7) {
        layer.msg('不支持群聊直线开启会议');
    } else {
        friend_fromasid_tobuild_videoorvoiceth('offer');
        fightingout.newmessage(myusernamefor + '向您发来了视频通话申请...', 7, ltddfid, useridd);
    }
})
document.getElementById('searchthepersonorgroup').addEventListener('input', function (event) {
    const searchValue = event.target.value.toLowerCase();
    const friendItems = document.querySelectorAll('.friend-item');
    friendItems.forEach(friendItem => {
        const friendName = friendItem.querySelector('.friend-name') ? friendItem.querySelector('.friend-name').textContent.toLowerCase() : '';
        let friendId = friendItem.getAttribute('data-id') ? friendItem.getAttribute('data-id').toLowerCase() : '';
        if (searchValue && friendId !== 'system-search') {
            if (friendName.includes(searchValue) || friendId.includes(searchValue)) {
                friendItem.style.display = '';
            } else {
                friendItem.style.display = 'none';
            }
        } else {
            friendItem.style.display = '';
        }
    });
});
function ouuaboutforyoupapershow() {
    layer.open({
        type: 2,
        area: ['420px', '360px'],
        title: '协议',
        content: '/api/page/about.html'
    });
}
document.getElementById('buttons-onteamgroup').addEventListener('click', function (event) {
    const checkboxin = document.getElementById('checkbox-onteamgroup');
    if (checkboxin.checked === false) {
        Qmsg.error('请先同意协议');
        return false;
    }
    event.preventDefault();
    const inputintheboxonevalue = document.getElementById('group-nameinbs').value;
    const inputintheboxtwovalue = document.getElementById('group-introinbs').value;
    const inputintheboxthreevalue = document.getElementById('group-imginbs').value;
    if (inputintheboxtwovalue.length > 50) {
        Qmsg.error('群介绍不能超过50个字');
        return false;
    }
    fetch('/api/other/group_credit.php', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: inputintheboxonevalue,
            intro: inputintheboxtwovalue,
            img: inputintheboxthreevalue,
            uid: useridd
        })
    }).then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                layer.msg('创建成功');
                setTimeout(() => {
                    location.reload();
                }, timeout = 1500);
            } else {
                Qmsg.error(data.msg);
            }
        });
});