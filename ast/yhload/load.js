(function() {
const html_loading_yh = `<link rel="stylesheet" href="/ast/yhload/animate-load.css">
<div class="overlay-yh">
  <div class="loading four-balls"></div>
  <div class="four-balls-text">Loading...</div>
</div>`;
const html_tips_yh = `
<link rel="stylesheet" href="/ast/yhload/tip.css">
<div id="tips-windowyh-on" class="tips-windowyh">
  <div class="modal-background"></div>
  <div class="tips-windowyh-content">
    <div class="tips-windowyh-header">
      <span id='acceptButton2' class="close">&times;</span>
      <h1 id='title-yhtip'>私信-必看</h1>
    </div>
    <div style='font-size:1.27em' id='tip-coninyh' class="tips-windowyh-body">
    </div>
    <div class="tips-windowyh-footer">
      <button class="button-jump" id="acceptButton">朕已阅</button>
    </div>
  </div>
</div>
`;
function isnowok() {
    return document.querySelector('.yh-loadingnow') !== null;
}
function show(){
    if (!isnowok()) {
        const loadingElement = document.createElement('div');
        loadingElement.className = 'yh-loadingnow';
        loadingElement.innerHTML = html_loading_yh;
        document.body.appendChild(loadingElement);
    }
}
function hide(){
    if (isnowok()) {
        const loadingElement = document.querySelector('.yh-loadingnow');
        document.body.removeChild(loadingElement);
    }
}
function tip(titlecon,contentin,ifbuttonno){
    const tipselement = document.createElement('div');
    tipselement.className = 'yh-tipsnow';
    tipselement.innerHTML = html_tips_yh;
    document.body.appendChild(tipselement);
    if (document.querySelector('.yh-tipsnow') === null) {
        document.body.appendChild(tipselement);
    }else{
        document.body.removeChild(document.querySelector('.yh-tipsnow'));
        document.body.appendChild(tipselement);
    }
    document.getElementById('title-yhtip').innerText = titlecon;
    document.getElementById('tip-coninyh').innerHTML = contentin;
    if(ifbuttonno){
        document.getElementById('acceptButton').style.visibility = 'hidden';
        document.getElementById('acceptButton2').style.visibility = 'hidden';
    }else{
    document.getElementById('acceptButton').onclick = function(){
        document.getElementById('tips-windowyh-on').style.display = 'none';
    };
    document.getElementById('acceptButton2').onclick = function(){
        document.getElementById('tips-windowyh-on').style.display = 'none';
    };
}
    document.getElementById('tips-windowyh-on').style.display = 'block';
}
function tips(){
    if (document.querySelector('.yh-tipsnow') !== null) {
        document.body.removeChild(document.querySelector('.yh-tipsnow'));
    }
}
yhload = {
    show,
    hide,
    tip,
    tips
};
})();