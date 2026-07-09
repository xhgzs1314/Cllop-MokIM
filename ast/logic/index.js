const root = document.documentElement;
const collapseBtn = document.getElementById('collapseBtn');
const sidebarRight = document.getElementById('sidebarRight');
const tabItems = document.querySelectorAll('.tab-item');
collapseBtn.addEventListener('click', () => {
  sidebarRight.classList.toggle('collapsed');
  const icon = collapseBtn.querySelector('i');
  if (sidebarRight.classList.contains('collapsed')) {
    icon.classList.remove('bi-chevron-right');
    icon.classList.add('bi-chevron-left');
  } else {
    icon.classList.remove('bi-chevron-left');
    icon.classList.add('bi-chevron-right');
  }
});
tabItems.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    tabItems.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.profile-details, .content-list, .automation-settings').forEach(el => {
      el.style.display = 'none';
    });
    switch (index) {
      case 0:
        document.querySelector('.profile-details').style.display = 'block';
        document.querySelectorAll('.content-list')[0].style.display = 'block';
        break;
      case 1:
        document.querySelectorAll('.content-list')[1].style.display = 'block';
        break;
      case 2:
        document.querySelectorAll('.content-list')[2].style.display = 'block';
        break;
      case 3:
        document.querySelectorAll('.content-list')[3].style.display = 'block';
        break;
      case 4:
        document.querySelector('.automation-settings').style.display = 'block';
        break;
    }
  });
});
document.querySelectorAll('.switch-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
  });
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    root.style.transition = 'none';
  } else {
    root.style.transition = 'background-color 250ms ease-in-out, color 250ms ease-in-out, box-shadow 250ms ease-in-out, transform 250ms ease-in-out';
  }
});
