
const ico_xfc = `
<link rel="stylesheet" href="/ast/newright/xfc.css">
<div id="sci-fi-bar">
    <img src="../ast/photo/admin.png" alt=""> 
</div>
`
document.addEventListener('DOMContentLoaded', function() {
    const xfc_id = document.createElement('div');
    xfc_id.innerHTML = ico_xfc;
    document.body.appendChild(xfc_id);
    var sciFiBar = document.getElementById('sci-fi-bar');
    var isDragging = false;
    var offsetX = 0, offsetY = 0; 
    function calculateOffset() {
        var rect = sciFiBar.getBoundingClientRect();
        offsetX = rect.left;
        offsetY = rect.top;
    }
    window.addEventListener('resize', calculateOffset);
    sciFiBar.addEventListener('mousedown', function(e) {
        e.preventDefault(); 
        isDragging = true;
        var startX = e.clientX - offsetX;
        var startY = e.clientY - offsetY;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        function onMouseMove(e) {
            if (isDragging) {
                var newOffsetX = e.clientX - startX;
                var newOffsetY = e.clientY - startY;
                sciFiBar.style.left = newOffsetX + 'px';
                sciFiBar.style.top = newOffsetY + 'px';
            }
        }
        function onMouseUp() {
            isDragging = false;  
            offsetX = parseInt(sciFiBar.style.left, 10);
            offsetY = parseInt(sciFiBar.style.top, 10);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    });
    
    sciFiBar.addEventListener('click', function() {
        layer.open({
            type: 1,
            offset: 'l',
            anim: 'slideRight', 
            area: ['320px', '100%'],
            shade: 0.1,
            shadeClose: true,
            id: 'ID-demo-layer-direction-l',
            title: '消息中心',
            content: '<div id="sidebarfrom-toshowneofme"></div>'
          });
          ceatenewingroupofthenoticeinmine();
        });
    
    calculateOffset();
});

