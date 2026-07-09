const mailcode = Math.random().toString(36).substr(2, 6).toUpperCase(); 
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('.login-form');
    const registerForm = document.querySelector('.register-form');
    const toggleButtons = document.querySelectorAll('.form-toggle .toggle-btn');
    function switchForm(target) {
        if (target === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            document.getElementById("headery").innerHTML="登录";
        } else {
            loginForm.style.display = 'none';
            document.getElementById("headery").innerHTML="注册";
            registerForm.style.display = 'block';
        }
    }

    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            switchForm(target);
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
});
function createCode() {
    const code = Math.random().toString(36).substr(2, 6).toUpperCase(); 
    document.querySelector('.captcha-display').textContent = code;
}
function createmailCode() {
    var mail = document.getElementById("mail").value;
    var mailbu = document.getElementById("getmail");
    var mailcode_i = document.getElementById("mail_code");
    if(mail === ""){
        layer.msg('邮箱不能为空');
        return false;
}
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://v.api.aa1.cn/api/qqemail/new/?to='+mail+'&subject=注册验证码&message=注册验证码：'+mailcode+'&from_mail=1466416773@qq.com', true);
      xhr.send();
      layer.msg('验证码已发送至邮箱，请注意查收');
      mailbu.style.display = "none";
      mailcode_i.style.display = "block";
        }
document.addEventListener('DOMContentLoaded', function() {
    createCode(); 
});
function regzc(){
    var post_user = document.getElementById("zcuser").value;  
    var post_pass = document.getElementById("zcpass").value;  
    var accoutcode = document.getElementById("accoutcode").value; 
    var mailcode2 = document.getElementById("mail_code").value; 
    var mailz = document.getElementById("mail").value; 
    if(accoutcode != document.querySelector('.captcha-display').textContent){
        layer.msg("验证码错误");
        createCode();
        return false;
    }
    if(post_user === "" || post_pass === ""){
        layer.msg("账号或密码不能为空");
        createCode();
        return false;
    }
    if(mailcode2 === "" || mailcode2 != mailcode){
        layer.msg("邮箱验证码不能为空或错误");
        createCode();
        return false;
    }
    var encodedUser = encodeURIComponent(post_user);
    var encodedPass = encodeURIComponent(post_pass);
    var encodedmail = encodeURIComponent(mailz);
    var query = 'account=' + encodedUser + '&password=' + encodedPass+'&mail='+encodedmail;
    fetch('./api/reg.php?' + query)
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        if (data.code === 1) {
            Qmsg.success('注册成功');
        }else{
            Qmsg.error(data.msg);
        }
    });
}
function leaveandchange(){
    const loginwindow = document.getElementById('addlogin');
    const friendList = document.getElementById('friend-list');
    friendList.classList.add('open');
    loginwindow.classList.add('close');
    setTimeout(() => {
        loginwindow.style.display = 'none';
        friendList.style.display = 'block';
        friendList.classList.remove('open', 'close');
        loginwindow.classList.remove('open', 'close');
    }, 300); 
}
function czsxlistfriednd(useridd){
    fetch('api/alllist.php?searchValue='+useridd)
    .then(res => res.json())
    .then(data => {
        data.forEach(friend => {
            const friendList = document.getElementById('friend-list');
                const friendItem = document.createElement('div');
                const friendmrbrage = sessionStorage.getItem('newmsg_'+friend.id);
                const friendmrbrageshow = (friendmrbrage !== null && friendmrbrage >0) ? 'inline' : 'none';
                friendItem.className = `friend-item ${friend.status === 1 ? 'friend-online' : 'friend-offline'}`;
                friendItem.innerHTML = `
                    <div class="friend-avatar" >
                    <img src='${friend.tximg}'></img>
                    </div>
                    <div class="friend-info">
                    <span id="badge-messagenum_${friend.id}" style="display:${friendmrbrageshow}" class="layui-badge">${friendmrbrage}</span>
                        <div class="friend-name">${friend.uname}</div>
                        <div class="friend-status">${friend.sayed}</div>
                    </div>
                `;
                friendItem.addEventListener('click', function() {
                    openchatwindow(friend.uname, friend.id,friend.tximg,friend.sayed);
                });
                friendList.appendChild(friendItem);
        });
    })
    fetch('api/alllistgroup.php?searchValue='+useridd)
    .then(res => res.json())
    .then(data => {
        data.forEach(friend => {
            const friendList = document.getElementById('friend-list');
                const friendItem = document.createElement('div');
                const friendmrbrage = sessionStorage.getItem('newmsg_'+friend.id);
                const friendmrbrageshow = (friendmrbrage !== null && friendmrbrage >0) ? 'inline' : 'none';
                friendItem.className = `friend-item ${friend.status === 1 ? 'friend-online' : 'friend-offline'}`;
                friendItem.innerHTML = `
                    <div class="friend-avatar" >
                    <img src='${friend.group_img}'></img>
                    </div>
                    <div class="friend-info">
                    <span id="badge-messagenum_${friend.id}" style="display:${friendmrbrageshow}" class="layui-badge">${friendmrbrage}</span>
                        <div class="friend-name">${friend.group_name}</div>
                        <div class="friend-status">${friend.group_tell}</div>
                    </div>
                `;
                friendItem.addEventListener('click', function() {
                    openchatwindow2(friend.group_name, friend.id,friend.group_img,friend.group_tell,friend.group_menber,friend.group_admin);
                });
                friendList.appendChild(friendItem);
        });
    });
}
function logzc(){
    var post_userl = document.getElementById("louser").value;  
    var post_passl = document.getElementById("lopass").value;  
    if(post_userl === "" || post_passl === ""){
        alert("账号或密码不能为空");
        createCode();
        return false;
    }
    var encodedUserl = encodeURIComponent(post_userl);
    var encodedPassl = encodeURIComponent(post_passl);
    var query = 'account2=' + encodedUserl + '&password2=' + encodedPassl;
    fetch('./api/log.php?' + query)
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        if (data.code === 1) {
            Qmsg.success('登录成功');
            document.getElementById('message-list2').style.visibility = 'visible';
  document.getElementById('message-list3').style.visibility = 'visible';
            sessionStorage.setItem('user', data.userid);
            sessionStorage.setItem('user_nm', data.username);
            sessionStorage.setItem('user_sayed', data.sayed);
            sessionStorage.setItem('sspng', data.tximg);
            document.getElementById('useridname').textContent = data.username;
    document.querySelector('.user-avatar').src = data.tximg;
    czsxlistfriednd(data.userid);
            leaveandchange();
        }else{
            Qmsg.error(data.msg);
        }
});
}