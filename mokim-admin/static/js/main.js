document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            const username = loginForm.querySelector('input[name="username"]').value.trim();
            const password = loginForm.querySelector('input[name="password"]').value.trim();
            
            if (username === '') {
                alert('请输入用户名');
                e.preventDefault();
                return;
            }
            if (password === '') {
                alert('请输入密码');
                e.preventDefault();
                return;
            }
        });
    }
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            if (!confirm('确定要退出登录吗？')) {
                e.preventDefault();
            }
        });
    }
});