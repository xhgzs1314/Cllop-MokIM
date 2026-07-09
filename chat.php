<?php
require('setting.php');
require('cofd/functions.php');
$qx_max_tmp1 = true;
$q_suname = null;
$tcodelogins = $_COOKIE[generateAutoWebsiteIdentifier((true)) . "_log"] ?? 'null';
if ($tcodelogins == 'null') {
  $qx_max_tmp1 = false;
} else {
  require('cofd/tauth.php');
  $decodeers = new TmdbaseauthdownyhoDecrypt(60000 * 60 * 2); //2h验证
  $decodeddata = $decodeers->writebacknewwords($tcodelogins);
  if (!$decodeddata) {
    $qx_max_tmp1 = false;
  }
  require_once('cofd/functions.php');
  $decodeddata2 = encrypt($decodeddata, 'D', generateAutoWebsiteIdentifier(true));
  if (!$decodeddata2) {
    $qx_max_tmp1 = false;
  }
  $tarray = explode('<:>', $decodeddata2);
  if (!isset($tarray[0]) || !isset($tarray[1]) || empty($tarray[0]) || empty($tarray[1]) || !isset($tarray[2]) || empty($tarray[2])) {
    $qx_max_tmp1 = false;
  }
  $q_suname = trim($tarray[2]);
}
$userlogin_expiretime_used = $_COOKIE['mokim_log_expire'] ?? time();
require $_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable($_SERVER['DOCUMENT_ROOT'] . '/ws-server/');
$dotenv->load();
$gout_api_wslinking_address =  $_ENV['WS_LINKING_ADDRESS'] ?? 'ws://localhost:8080/ws';
if ($qx_max_tmp1) {

?>
  <!DOCTYPE html>
  <html lang="zh-CN">

  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $index_array['title']; ?></title>
    <link rel="stylesheet" href="ast/painting/index.css">
    <link rel="stylesheet" href="ast/painting/call.css">
    <link rel="stylesheet" href="ast/fontawe/css/all.min.css">
    <link rel="stylesheet" href="ast/painting/custommized.css">
    <link rel="stylesheet" href="ast/painting/gifts.css">
    <link rel="stylesheet" href="ast/painting/activity.css">
    <link rel="stylesheet" href="ast/painting/gamehall.css">
    <link rel="stylesheet" href="ast/painting/redputpack.css">
    <link rel="stylesheet" href="/ast/painting/mokfufile.css">
  </head>
  <style>
    #fas-dot-im-dot {
      font-size: 48px !important;
    }

    #chat-file-fjslsend {
      font-size: 18px !important;
    }

    #chat-toolbar-emoji {
      font-size: 18px !important;
    }

    .chat-toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 14px;
      border-bottom: 1px solid rgba(229, 231, 235, 0.6);
      background: linear-gradient(180deg, #fafbfc 0%, #f8f9fb 100%);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .chat-toolbar .toolbar-btn {
      position: relative;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 7px 10px;
      border-radius: 10px;
      transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #6b7a8f;
      min-width: 36px;
      height: 36px;
    }

    .chat-toolbar .toolbar-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 10px;
      background: radial-gradient(circle at center, rgba(64, 158, 255, 0.12), transparent 70%);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    .chat-toolbar .toolbar-btn:hover::after {
      opacity: 1;
    }

    .chat-toolbar .toolbar-btn:hover {
      background: rgba(64, 158, 255, 0.10);
      color: #409eff;
      transform: translateY(-1px);
    }

    .chat-toolbar .toolbar-btn:active {
      transform: scale(0.92);
      transition-duration: 0.08s;
    }

    .chat-toolbar .toolbar-btn i {
      font-size: 1.5rem !important;
      color: inherit;
      transition: transform 0.25s ease;
      position: relative;
      z-index: 1;
    }

    .chat-toolbar .toolbar-btn:hover i {
      transform: scale(1.08);
    }

    .chat-toolbar .toolbar-btn:active i {
      transform: scale(0.88);
    }

    .chat-toolbar .toolbar-btn.locked-btn {
      color: #6b7a8f;
    }

    .chat-toolbar .toolbar-btn.locked-btn.active {
      color: #f59e0b;
    }

    .chat-toolbar .toolbar-btn.locked-btn.active i {
      text-shadow: 0 0 16px rgba(245, 158, 11, 0.3);
    }

    .chat-toolbar .toolbar-btn.locked-btn.active::after {
      opacity: 1;
      background: radial-gradient(circle at center, rgba(245, 158, 11, 0.15), transparent 70%);
    }

    .chat-toolbar .toolbar-divider {
      width: 1px;
      height: 26px;
      background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.08), transparent);
      margin: 0 4px;
      flex-shrink: 0;
    }

    [title] {
      position: relative;
    }

    .chat-toolbar .toolbar-btn[title]:hover::before {
      content: attr(title);
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%) scale(0.9);
      background: rgba(30, 41, 59, 0.92);
      backdrop-filter: blur(8px);
      color: #fff;
      padding: 4px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      letter-spacing: 0.3px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      animation: toolbarTooltipIn 0.2s ease forwards;
      z-index: 100;
      pointer-events: none;
    }

    .chat-toolbar .toolbar-btn[title]:hover::after {
      content: '';
      position: absolute;
      bottom: calc(100% + 2px);
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: rgba(30, 41, 59, 0.92);
      z-index: 100;
      pointer-events: none;
    }

    @keyframes toolbarTooltipIn {
      from {
        opacity: 0;
        transform: translateX(-50%) scale(0.85) translateY(4px);
      }

      to {
        opacity: 1;
        transform: translateX(-50%) scale(1) translateY(0);
      }
    }


    body.dark .chat-toolbar {
      background: linear-gradient(180deg, #26282e 0%, #202226 100%);
      border-bottom-color: rgba(63, 66, 72, 0.6);
    }

    body.dark .chat-toolbar .toolbar-btn {
      color: #8f9aa8;
    }

    body.dark .chat-toolbar .toolbar-btn:hover {
      background: rgba(64, 158, 255, 0.12);
      color: #79bbff;
    }

    body.dark .chat-toolbar .toolbar-btn::after {
      background: radial-gradient(circle at center, rgba(64, 158, 255, 0.18), transparent 70%);
    }

    body.dark .chat-toolbar .toolbar-divider {
      background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.08), transparent);
    }

    body.dark .chat-toolbar .toolbar-btn.locked-btn.active {
      color: #fbbf24;
    }

    body.dark .chat-toolbar .toolbar-btn.locked-btn.active::after {
      background: radial-gradient(circle at center, rgba(251, 191, 36, 0.15), transparent 70%);
    }

    .chat-input-area {
      display: flex;
      flex-direction: column;
      border-top: 1px solid #e5e7eb;
      background-color: #fff;
    }

    .input-container {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      padding: 12px;
    }

    .chat-input {
      flex: 1;
      min-height: 40px;
      max-height: 120px;
      resize: vertical;
    }


    #mokim_zujian_send_btn:disabled,
    #mokim_zujian_send_btn[disabled],
    #mokim_zujian_send_btn.disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
      background-color: #a0aec0 !important;
      color: #e2e8f0 !important;
      box-shadow: none !important;
      transform: none !important;
      pointer-events: none !important;
    }

    #mokim_zujian_send_btn:disabled:hover,
    #mokim_zujian_send_btn[disabled]:hover,
    #mokim_zujian_send_btn.disabled:hover {
      background-color: #a0aec0 !important;
      color: #e2e8f0 !important;
      transform: none !important;
      box-shadow: none !important;
      opacity: 0.5 !important;
    }

    body.dark #mokim_zujian_send_btn:disabled,
    body.dark #mokim_zujian_send_btn[disabled],
    body.dark #mokim_zujian_send_btn.disabled {
      background-color: #4a4f56 !important;
      color: #6b7280 !important;
      opacity: 0.4 !important;
    }

    .char-counter {
      display: flex;
      justify-content: flex-end;
      padding: 4px 12px 8px 12px;
      background-color: transparent;
    }

    #mokim_input_charCount {
      font-size: 12px;
      color: #9ca3af;
      transition: color 0.3s ease;
      user-select: none;
      font-family: monospace;
      letter-spacing: 0.5px;
    }

    body.dark .chat-input-area {
      background-color: #1f2125;
      border-top-color: #3f4248;
    }

    .bottom-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2px 12px 6px 12px;
      background-color: transparent;
    }

    .legal-tip {
      display: flex;
      align-items: center;
      color: #8c8c8c;
      gap: 4px;
      user-select: none;
    }

    .legal-tip i {
      font-size: 13px;
      color: #8c8c8c;
    }

    .char-counter {
      display: flex;
      align-items: center;
      font-size: 12px;
      color: #9ca3af;
      font-family: monospace;
      letter-spacing: 0.5px;
    }

    body.dark .legal-tip,
    body.dark .legal-tip i {
      color: #6b7280;
    }

    body.dark .char-counter {
      color: #6b7280;
    }
  </style>

  <body>
    <div class="layout-container">
      <aside class="sidebar-left">
        <input type="text" class="search-box" placeholder="搜索联系人/群聊">
        <ul class="nav-list">
          <li class="nav-item active"><i class="fas fa-comments"></i> 聊天</li>
          <li id="contact-nav-man-get" class="nav-item"><i class="fas fa-users"></i> 联系人</li>
          <li onclick="window.open('/use/moment/','_blank');" class="nav-item"><i class="fas fa-th-large"></i> 朋友圈</li>
          <li id="mailget-tabber-nav" class="nav-item"><i class="fas fa-bell"></i> 站内信</li>
          <li id="userprofile-center-updates" class="nav-item"><i class="fas fa-user"></i> 个人中心</li>
          <li onclick="window.open('use/freetl/')" class="nav-item"><i class="fas fa-cog"></i> 游戏&工具</li>
        </ul>
        <div class="sidebar-bottom">
          <button id="exportorincludemessageused" onmouseenter="javascript:this.style.color = '#409eff';" onmouseleave="javascript:this.style.color = '#16191f';" style="margin-bottom: 15px;" class="settings-btn">
            <i class="fas fa-comments" style="color: #409eff;margin-right:5px"></i>聊天记录管理
          </button>
          <button id="scheduledManageBtn" style="margin-bottom: 15px;" class="settings-btn">
            <i class="fas fa-calendar-alt" style="color: #409eff;margin-right:5px"></i>定时消息管理
          </button>
          <button id="activityCenterBtn" class="settings-btn" onmouseenter="javascript:this.style.color = '#409eff';" onmouseleave="javascript:this.style.color = '#16191f';" style="margin-bottom: 15px;">
            活动中心 <span class="activity-badge">🔥</span>
          </button>
          <button id="setting-btn-index-idget" class="settings-btn">
            <i class="fas fa-cog"></i> 设置
          </button>
        </div>
      </aside>
      <aside class="sidebar-conversations">
        <ul class="conversation-list">
        </ul>
      </aside>
      <main id="chat-window-pclanxs" class="chat-window">
        <div class="chat-header">
          <div class="chat-title">Test</div>
          <div class="chat-actions">
            <div id="fak-header-from-person-operate">
              <button onmouseenter="javascript:this.style.color = '#409eff';" class="chat-action-btn" onmouseleave="javascript:this.style.color = '#16191f';" title="导出聊天记录(证据包)" style="margin-right: 5px;color:#16191f;" id="export-contact-data-auth"><i class="fas fa-shield-alt"></i></button>
              <button onmouseenter="javascript:this.style.color = '#409eff';" class="chat-action-btn" onmouseleave="javascript:this.style.color = '#16191f';" title="私聊通话" style="margin-right: 5px;color:#16191f;" id="videoCallBtn_intact_remote"><i class="fas fa-video"></i></button>
            </div>
            <div style="display: none;" id="fak-header-from-group-operate">
              <button onmouseenter="javascript:this.style.color = '#409eff';" id="user_groupinvitaion_send" onmouseleave="javascript:this.style.color = '#16191f';" style="margin-right: 5px;color:#16191f;" class="chat-action-btn" title="邀请好友进群" id="user_invite_person_getgroup"><i class="fas fa-user-plus"></i></button>
              <button onmouseenter="javascript:this.style.color = '#409eff';" class="chat-action-btn" onmouseleave="javascript:this.style.color = '#16191f';" style="margin-right: 5px;color:#16191f;" title="群日志" id="user_grouplog_seaking"><i class="fas fa-history"></i></button>
              <button onmouseenter="javascript:this.style.color = '#409eff';" class="chat-action-btn" onmouseleave="javascript:this.style.color = '#16191f';" style="margin-left: 5px;margin-right: 5px;color:#16191f;" title="群文件" id="groups_upload_file_xpacev1"><i class="fas fa-file-arrow-up"></i></button>
            </div>
            <button onmouseenter="javascript:this.style.color = '#409eff';" class="chat-action-btn" onmouseleave="javascript:this.style.color = '#16191f';" title="定时消息" style="color:#16191f;" id="scheduledMsgBtn"><i class="fas fa-clock"></i></button>
            <button onmouseenter="javascript:this.style.color = '#409eff';" class="chat-action-btn" onmouseleave="javascript:this.style.color = '#16191f';" style="margin-right: 5px;color:#16191f;" title="个性化定制" id="customized_delver"><i class="fas fa-shirt"></i></button>
            <button onmouseenter="javascript:this.style.color = '#409eff';" class="chat-action-btn" onmouseleave="javascript:this.style.color = '#16191f';" title="游戏大厅" style="color:#16191f;" id="gamecenter_linkingyoume"><i class="fas fa-gamepad"></i></button>
          </div>
        </div>
        <div class="chat-messages">
        </div>
        <div class="chat-input-area">
          <div class="chat-toolbar">
            <button class="toolbar-btn locked-btn" title="消息上锁">
              <i id="chat-message-lockedadded" style="color:#f44336;" class="fas fa-lock"></i>
            </button>
            <button class="toolbar-btn emoji-picker-btn" title="表情">
              <i id="chat-toolbar-emoji" style="font-size: 18px !important;color:#409eff;" class="fas fa-smile"></i>
            </button>
            <button class="toolbar-btn audiototext-picker-btn" title="语音转文字">
              <i id="chat-toolbar-audiototext" style="color:#409eff;" class="fas fa-microphone fa-2x"></i>
            </button>
            <button class="toolbar-btn attach-btn" title="发送文件">
              <i id="chat-file-fjslsend" style="color:#409eff;" class="fas fa-paperclip"></i>
            </button>
            <button class="toolbar-btn file2gpl-btn" title="发送文件(GFL2)">
              <i id="chat-file-fjslsend2" style="color:#409eff;" class="fas fa-file"></i>
            </button>
            <button id="chat-file-fjslsend3" class="toolbar-btn file3gpl-btn" title="发送文件(GFL3)">
              <i style="color:#409eff;" class="fas fa-file-arrow-up"></i>
            </button>
            <button id="chat-toolbar-redpacket" class="toolbar-btn redpacket-btn" title="发红包">
              <i class="fas fa-envelope" style="font-size:18px !important; color:#f44336;"></i>
            </button>
            <button class="toolbar-btn filesmusic-btn" title="音乐分享">
              <i id="chat-file-fjmusicss" style="color:#409eff;" class="fas fa-music"></i>
            </button>
            <button class="toolbar-btn filesvideom-btn" title="视频分享">
              <i id="chat-file-fjvideoss" style="color:#409eff;" class="fas fa-eject"></i>
            </button>
          </div>
          <div class="input-container">
            <textarea class="chat-input" placeholder="输入消息..."></textarea>
            <button disabled id="mokim_zujian_send_btn" class="send-btn">发送</button>
          </div>
          <div class="bottom-bar">
            <div class="legal-tip">
              <i class="fas fa-info-circle"></i>
              <span fuck-now='111' style="font-size: 15px !important;">请遵守法律法规，文明交流，共同维护良好网络环境</span>
            </div>
            <div class="char-counter">
              <span id="mokim_input_charCount">0 / 1500</span>
            </div>
          </div>
        </div>
        <div id="mokim_lock_modal_wrapper" style="display: none;">
          <div id="mokim_lock_modal_overlay">
            <div id="mokim_lock_modal_container">
              <div id="mokim_lock_modal_header">
                <h3 id="mokim_lock_modal_title">
                  <i class="fas fa-lock"></i> 消息上锁
                </h3>
                <button id="mokim_lock_modal_close_btn"><i class="fas fa-times"></i></button>
              </div>
              <div id="mokim_lock_modal_tabs">
                <button class="mokim_lock_tab_btn active" data-lock-tab="overview">总览</button>
                <button class="mokim_lock_tab_btn" data-lock-tab="password">密码防护</button>
                <button class="mokim_lock_tab_btn" data-lock-tab="time">时间防护</button>
                <button class="mokim_lock_tab_btn" data-lock-tab="burn">阅后即焚</button>
              </div>
              <div id="mokim_lock_modal_body">
                <div class="mokim_lock_tab_pane active" id="mokim_lock_pane_overview">
                  <div id="mokim_lock_overview_status">
                    <div class="mokim_lock_status_item">
                      <span class="mokim_lock_status_label">启用状态</span>
                      <span class="mokim_lock_status_value mokim_lock_status_enabled">已启用</span>
                    </div>
                    <div class="mokim_lock_status_item">
                      <span class="mokim_lock_status_label">当前模式</span>
                      <span class="mokim_lock_status_value">阅后即焚</span>
                    </div>
                  </div>
                  <div id="mokim_lock_overview_desc">
                    <p><i class="fas fa-info-circle"></i> 消息上锁功能可为您的私密对话提供额外保护。启用后，对方需通过您设定的验证方式才能查看消息内容。</p>
                    <span id="mokim_lock_version_tag">版本 V1</span>
                  </div>
                  <button id="mokim_lock_disable_btn" class="mokim_lock_disable_btn" style="display: none;">
                    <i class="fas fa-unlock"></i> 取消消息上锁
                  </button>
                </div>
                <div class="mokim_lock_tab_pane" id="mokim_lock_pane_password">
                  <div class="mokim_lock_tab_intro">
                    <p><i class="fas fa-shield-alt"></i> 密码防护模式：对方需正确回答您设定的安全问题才能解锁消息。</p>
                  </div>
                  <div class="mokim_lock_form_group">
                    <label for="mokim_lock_question_input">提示内容（问题）<span class="mokim_lock_required">*</span></label>
                    <input type="text" id="mokim_lock_question_input" placeholder="例如：我的宠物名字是什么？" maxlength="20">
                    <span class="mokim_lock_char_counter">0/20</span>
                  </div>
                  <div class="mokim_lock_form_group">
                    <label for="mokim_lock_answer_input">密码（答案）<span class="mokim_lock_required">*</span></label>
                    <input type="password" id="mokim_lock_answer_input" placeholder="请输入答案（8字符以内）" maxlength="8">
                    <span class="mokim_lock_char_counter">0/8</span>
                  </div>
                  <button class="mokim_lock_enable_btn">启用密码防护</button>
                </div>
                <div class="mokim_lock_tab_pane" id="mokim_lock_pane_time">
                  <div class="mokim_lock_tab_intro">
                    <p><i class="fas fa-clock"></i> 时间防护模式：消息仅在指定时间范围内可读，过期自动失效。</p>
                  </div>
                  <div class="mokim_lock_form_group">
                    <label for="mokim_lock_time_picker">有效期截止时间 <span class="mokim_lock_required">*</span></label>
                    <input type="datetime-local" id="mokim_lock_time_picker" step="1">
                  </div>
                  <button class="mokim_lock_enable_btn">启用时间防护</button>
                </div>
                <div class="mokim_lock_tab_pane" id="mokim_lock_pane_burn">
                  <div class="mokim_lock_tab_intro">
                    <p><i class="fas fa-fire"></i> 阅后即焚模式：消息被对方查看后自动销毁，不留痕迹。</p>
                  </div>
                  <div class="mokim_lock_form_group">
                    <label for="mokim_lock_burn_delay">查看后保留时长 <span class="mokim_lock_required">*</span></label>
                    <div id="mokim_lock_burn_row">
                      <input type="number" id="mokim_lock_burn_delay" value="5" min="10" max="90">
                      <span id="mokim_lock_burn_unit">秒</span>
                      <span id="mokim_lock_burn_hint">（对方阅读后，消息将在该时间后自动消失）</span>
                    </div>
                  </div>
                  <div class="mokim_lock_form_group">
                    <label class="mokim_lock_check_label">
                      <input type="checkbox" id="mokim_lock_burn_notify" checked>
                      <span>通知对方此消息为"阅后即焚"</span>
                    </label>
                  </div>
                  <button class="mokim_lock_enable_btn">启用阅后即焚</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div id="remotevioModal" class="remotio_pas_modal_overlay">
          <div class="remotio_pas_modal_container">
            <div class="remotio_pas_video_stage">
              <video id="remotio_pas_remoteVideo" class="remotio_pas_remote_video" autoplay playsinline muted></video>
              <div class="remotio_pas_local_video_wrapper" id="remotio_pas_localWrapper">
                <video id="remotio_pas_localVideo" class="remotio_pas_local_video" autoplay playsinline muted></video>
              </div>
              <div class="remotio_pas_call_info" id="remotio_pas_callTimer">
                <i class="fas fa-phone-alt" style="margin-right: 6px;"></i> <span id="remotio_pas_duration">00:00</span>
              </div>
              <div id="remotio_pas_remotePlaceholder" class="remotio_pas_video_placeholder" style="display: none; position: absolute; top:0; left:0; width:100%; height:100%; pointer-events: none;">
                <i class="fas fa-video-slash"></i>
                <span>等待对方加入视频...</span>
              </div>
            </div>
            <div class="remotio_pas_controls_bar">
              <button id="remotio_pas_toggleMic" class="remotio_pas_control_btn" title="麦克风开关">
                <i class="fas fa-microphone"></i>
              </button>
              <button id="remotio_pas_toggleCamera" class="remotio_pas_control_btn" title="摄像头开关">
                <i class="fas fa-video"></i>
              </button>
              <button id="remotio_pas_endCall" class="remotio_pas_control_btn remotio_pas_end_call_btn" title="结束通话">
                <i class="fas fa-phone-slash"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="attach-modal-mask" id="attachModal" style="display: none;">
          <div class="attach-modal-box">
            <div class="attach-modal-header">
              <h3>发送文件(通道一)GFL-1</h3>
              <button class="attach-modal-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="attach-modal-body">
              <div class="form-item">
                <label>文件类型：</label>
                <select class="file-type-select" id="fileTypeSelect">
                  <option value="image">图片 (jpg/png/gif/webp)</option>
                  <option value="file">普通文件 (doc/xlsx/zip等)</option>
                </select>
              </div>
              <div class="form-item">
                <label>文件外链：</label>
                <input type="text" class="file-url-input" id="fileUrlInput" placeholder="请输入文件的完整外链地址（如https://xxx.com/xxx.jpg）">
              </div>
            </div>
            <div class="attach-modal-footer">
              <button class="modal-btn cancel-btn" id="cancelAttachBtn">取消</button>
              <button class="modal-btn confirm-btn" id="confirmAttachBtn">发送</button>
            </div>
          </div>
        </div>
      </main>
      <div class="settings-modal-mask" id="settingsModal" style="display: none;">
        <div class="settings-modal-box">
          <div class="settings-modal-header">
            <h3><i class="fas fa-cog" style="margin-right: 8px;"></i>设置</h3>
            <button class="settings-modal-close" id="closeSettingsBtn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="settings-modal-body">
            <div class="settings-sidebar">
              <div class="settings-nav-item active" data-tab="general">
                <i class="fas fa-sliders-h"></i>
                <span>通用设置</span>
              </div>
              <div class="settings-nav-item" data-tab="notification">
                <i class="fas fa-bell"></i>
                <span>消息通知</span>
              </div>
              <div class="settings-nav-item" data-tab="privacy">
                <i class="fas fa-lock"></i>
                <span>隐私安全</span>
              </div>
              <div class="settings-nav-item" data-tab="chat">
                <i class="fas fa-comments"></i>
                <span>聊天设置</span>
              </div>
              <div class="settings-nav-item" data-tab="shortcut">
                <i class="fas fa-keyboard"></i>
                <span>快捷键</span>
              </div>
              <div class="settings-nav-item" data-tab="about">
                <i class="fas fa-info-circle"></i>
                <span>关于我们</span>
              </div>
            </div>


            <div class="settings-content">
              <div class="settings-tab-pane active" id="tab-general">
                <div class="settings-section">
                  <h4 class="settings-section-title">外观设置</h4>
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">主题模式</div>
                      <div class="settings-item-desc">切换深色/浅色主题</div>
                    </div>
                    <div class="settings-item-control">
                      <div class="theme-switch">
                        <button class="theme-option light active">
                          <i class="fas fa-sun"></i>
                          <span>浅色</span>
                        </button>
                        <button class="theme-option dark">
                          <i class="fas fa-moon"></i>
                          <span>深色</span>
                        </button>
                        <button class="theme-option auto">
                          <i class="fas fa-magic"></i>
                          <span>跟随系统</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">字体大小</div>
                      <div class="settings-item-desc">调整聊天界面字体大小</div>
                    </div>
                    <div class="settings-item-control">
                      <div class="font-size-slider">
                        <span class="font-size-min">A</span>
                        <input type="range" class="slider" id="fontSizeSlider" min="12" max="20" value="14">
                        <span class="font-size-max">A</span>
                      </div>
                    </div>
                  </div>

                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">语言选择</div>
                      <div class="settings-item-desc">选择界面显示语言</div>
                    </div>
                    <div class="settings-item-control">
                      <select class="settings-select">
                        <option value="zh-CN">简体中文</option>
                        <option value="en-US">English</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div class="settings-tab-pane" id="tab-notification">
                <div class="settings-section">
                  <h4 class="settings-section-title">通知设置</h4>


                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">通知声音</div>
                      <div class="settings-item-desc">新消息到达时播放提示音</div>
                    </div>
                    <div class="settings-item-control">
                      <label class="switch">
                        <input type="checkbox" id="notifySound" checked>
                        <span class="switch-slider round"></span>
                      </label>
                    </div>
                  </div>

                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">声音选择</div>
                      <div class="settings-item-desc">选择提示音类型</div>
                    </div>
                    <div class="settings-item-control">
                      <select class="settings-select" id="soundSelect">
                        <option value="default">默认提示音</option>
                      </select>
                    </div>
                  </div>
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">桌面通知</div>
                      <div class="settings-item-desc">浏览器在后台时接收新消息通知</div>
                    </div>
                    <div class="settings-item-control">
                      <label class="switch">
                        <input type="checkbox" id="desktopNotify" checked>
                        <span class="switch-slider round"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="settings-tab-pane" id="tab-privacy">
                <div class="settings-section">
                  <h4 class="settings-section-title">隐私设置</h4>
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">已读回执</div>
                      <div class="settings-item-desc">发送已读状态给消息发送者</div>
                    </div>
                    <div class="settings-item-control">
                      <label class="switch">
                        <input type="checkbox" id="readReceipt" checked>
                        <span class="switch-slider round"></span>
                      </label>
                    </div>
                  </div>
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">输入状态</div>
                      <div class="settings-item-desc">显示"正在输入..."状态</div>
                    </div>
                    <div class="settings-item-control">
                      <label class="switch">
                        <input type="checkbox" id="typingStatus" checked>
                        <span class="switch-slider round"></span>
                      </label>
                    </div>
                  </div>

                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">添加好友验证</div>
                      <div class="settings-item-desc">需要验证才能添加为好友</div>
                    </div>
                    <div class="settings-item-control">
                      <label class="switch">
                        <input type="checkbox" id="friendVerify" checked>
                        <span class="switch-slider round"></span>
                      </label>
                    </div>
                  </div>

                </div>

                <div class="settings-section">
                  <h4 class="settings-section-title">安全设置</h4>
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">注销登录</div>
                      <div class="settings-item-desc">注销登录状态</div>
                      <div class="settings-item-desc">Expire-Time:<?php echo date('Y-m-d H:i:s', $userlogin_expiretime_used); ?></div>
                    </div>
                    <div class="settings-item-control">
                      <button onclick="location.href='logout.php';" class="settings-btn-text">退出登录</button>
                    </div>
                  </div>
                </div>
                <div class="settings-section">
                  <h4 class="settings-section-title">其它</h4>
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">注销账号</div>
                      <div class="settings-item-desc">注销账号使用,数据清零</div>
                    </div>
                    <div class="settings-item-control">
                      <button onclick="location.href='notice/Doc/revokeaccount/';" class="settings-btn-text">注销账号</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="settings-tab-pane" id="tab-chat">
                <div class="settings-section">
                  <h4 class="settings-section-title">聊天界面</h4>
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">回车发送消息</div>
                      <div class="settings-item-desc">按回车键直接发送消息</div>
                    </div>
                    <div class="settings-item-control">
                      <label class="switch">
                        <input disabled='true' type="checkbox" id="enterSend" checked>
                        <span class="switch-slider round"></span>
                      </label>
                    </div>
                  </div>

                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">显示时间戳</div>
                      <div class="settings-item-desc">在消息旁显示发送时间</div>
                    </div>
                    <div class="settings-item-control">
                      <label class="switch">
                        <input disabled='true' type="checkbox" id="showTimestamp" checked>
                        <span class="switch-slider round"></span>
                      </label>
                    </div>
                  </div>
                </div>
                <div class="settings-section">
                  <h4 class="settings-section-title">消息安全</h4>
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-label">消息上锁功能</div>
                      <div class="settings-item-desc">启用/禁用消息上锁功能，禁用后文本消息将不受锁保护</div>
                    </div>
                    <div class="settings-item-control">
                      <label class="switch">
                        <input type="checkbox" id="messageLockSwitch" checked>
                        <span class="switch-slider round"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>


              <div class="settings-tab-pane" id="tab-shortcut">
                <div class="settings-section">
                  <h4 class="settings-section-title">常用快捷键</h4>
                  <div class="shortcut-item">
                    <span class="shortcut-label">发送消息</span>
                    <div class="shortcut-key">Enter</div>
                  </div>
                  <div class="shortcut-item">
                    <span class="shortcut-label">换行</span>
                    <div class="shortcut-key">Shift + Enter</div>
                  </div>
                  <div class="shortcut-item">
                    <span class="shortcut-label">截图</span>
                    <div class="shortcut-key">Ctrl + Alt + A</div>
                  </div>
                  <div class="shortcut-item">
                    <span class="shortcut-label">打开活动页</span>
                    <div class="shortcut-key">Ctrl + Shift + B</div>
                  </div>
                  <div class="shortcut-item">
                    <span class="shortcut-label">打开个人中心</span>
                    <div class="shortcut-key">Ctrl + Shift + C</div>
                  </div>
                </div>
              </div>
              <div class="settings-tab-pane" id="tab-about">
                <div class="about-section">
                  <div class="about-logo">
                    <i id="fas-dot-im-dot" class="fas fa-comment-dots" style="font-size:48px; color: #409eff;"></i>
                  </div>
                  <div class="about-name">MOK-IM</div>
                  <div class="about-version">Version 1.0.0</div>
                  <div class="about-desc">
                    一款现代化的即时通讯应用<br>
                    安全、便捷、高效
                  </div>
                  <div class="about-links">
                    <a href="notice/" class="about-link" target="_blank" rel="noopener noreferrer">平台公告</a>
                    <span class="about-link-divider">|</span>
                    <a href="notice/page/1.html" class="about-link" target="_blank" rel="noopener noreferrer">用户协议</a>
                    <span class="about-link-divider">|</span>
                    <a href="notice/page/1.html" class="about-link" target="_blank" rel="noopener noreferrer">隐私政策</a>
                  </div>
                  <div class="about-copyright">
                    © 2026 MOK-IM. All rights reserved.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-modal-footer">
            <button class="settings-btn settings-btn-secondary" id="resetSettingsBtn">恢复默认</button>
            <div class="settings-footer-right">
              <button class="settings-btn settings-btn-text" id="cancelSettingsBtn">取消</button>
              <button class="settings-btn settings-btn-primary" id="saveSettingsBtn">保存设置</button>
            </div>
          </div>
        </div>
      </div>
      <aside class="sidebar-right" id="sidebarRight">
        <div class="sidebar-resizer"></div>
        <button style="display: none;" class="collapse-btn" id="collapseBtn">
          <i class="fas fa-chevron-right"></i>
        </button>
        <div class="sidebar-tabs">
          <div id="tab-item-sidebar-coms1" class="tab-item active">信息</div>
          <div class="tab-item">聊天记录</div>
          <div id="tab-item-sidebar-coms3" style="display: none;" class="tab-item">群公告</div>
          <div class="tab-item">操作</div>
        </div>
        <div class="sidebar-content">
          <div class="profile-card">
            <div class="profile-header-row">
              <div class="profile-avatar">A</div>
              <div class="profile-info-group">
                <div class="profile-name">阿明</div>
                <div class="profile-signature">保持热爱，奔赴山海</div>
              </div>
            </div>
            <div class="profile-stats-bar">
              <div class="stat-item">
                <span id="us_contact_loverbody" class="stat-number">情侣</span>
                <span id="us_contact_loverbglobal" class="stat-label">关系</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span id="us_contact_lovenumber" class="stat-number">114514</span>
                <span id="us_contact_loveglobal" class="stat-label">亲密度</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span id="us_contact_lovejillydays" class="stat-number">520</span>
                <span id="us_contact_lovedayglobal" class="stat-label">相识</span>
              </div>
            </div>
            <div class="profile-details">
              <p id="profile_m_id" class="text-secondary">ID: 10086</p>
              <p id="profile_m_regt" class="text-secondary">添加: 2024-01-01</p>
              <p id="profile_m_alias" class="text-secondary">备注: 阿明哥</p>
              <p id="profile_m_groupto" class="text-secondary">分组: 默认</p>
            </div>
          </div>
          <ul class="content-list">
            <div class="tip-card">
              <div class="tip-card-header">
                <h4 class="tip-title">🔒 安全提示 · 谨防诈骗</h4>
              </div>
              <div class="tip-card-body">
                <ul class="tip-list">
                  <li><i class="fas fa-shield-alt"></i> 官方客服绝不会索要您的密码、验证码以及联系方式</li>
                  <li><i class="fas fa-link"></i> 不要点击陌生人发送的链接或扫描不明二维码</li>
                  <li><i class="fas fa-phone-slash"></i> 任何“转账/汇款/保证金”要求均为诈骗</li>
                  <li><i class="fas fa-comment-dots"></i> 涉及钱财交易请务必通过电话或视频核实身份</li>
                  <li><i class="fas fa-flag-checkered"></i> 如遇可疑情况，请立即举报并联系平台客服</li>
                  <li><i class="fas fa-exclamation-circle"></i> 为保证您的隐私安全及使用体验,群聊默认采用PPU Architecture</li>
                </ul>
                <div class="tip-footer-note">
                  <i class="fas fa-lock"></i> 守护你的数字安全
                </div>
              </div>
            </div>
          </ul>
          <ul class="content-list" style="display: none;">
            <div class="glinput-search">
              <input type="text" placeholder="要查找的聊天内容...(Enter)">
              <i class="fas fa-search search-icon"></i>
              <i class="fas fa-times clear-btn" id="glclearBtn"></i>
            </div>
            <div class="s-content-search-result"></div>
          </ul>
          <ul class="content-list" style="display: none;">
            <div id="gnoticeContainer" class="notice-list">
              <div class="loading-tip"><i class="fas fa-spinner fa-pulse"></i> 加载公告中...</div>
            </div>
            <div id="paginationBar" class="pagination-bar" style="display: none;">
              <button id="prevPageBtn" class="prev-page" disabled><i class="fas fa-chevron-left"></i> 上一页</button>
              <span id="pageInfoSpan" class="page-info">第 1 / 1 页</span>
              <button id="nextPageBtn" class="next-page" disabled>下一页 <i class="fas fa-chevron-right"></i></button>
            </div>
            <button id="modify-add-noticenew-sg" class="modify-note-btn" aria-label="发布公告">
              <span class="modify-btn-icon" aria-hidden="true"></span>
              <span class="modify-btn-text">发布公告</span>
            </button>
          </ul>
          <ul class="content-list" style="display: none;">
            <div id="contact-play-do-init">
              <div class="switch-item">
                <div class="switch-label">消息置顶</div>
                <div id="switch-thumb-solots-ggovers" data_types="person_pin" class="switch-toggle active">
                  <div class="switch-thumb"></div>
                </div>
              </div>
              <div class="action-card-grid">
                <div class="action-card" id="modify-update-alias">
                  <div class="action-card-icon"><i class="fas fa-user-edit"></i></div>
                  <div class="action-card-text">修改备注</div>
                  <div class="action-card-hint">设置新备注名</div>
                </div>
                <div class="action-card" id="modify-update-groupsf">
                  <div class="action-card-icon"><i class="fas fa-folder-plus"></i></div>
                  <div class="action-card-text">修改分组</div>
                  <div class="action-card-hint">移动所属分组</div>
                </div>
                <div class="action-card" id="modify-update-gcoins">
                  <div class="action-card-icon"><i class="fas fa-coins"></i></div>
                  <div class="action-card-text">转赠G币</div>
                  <div class="action-card-hint">赠送G币</div>
                </div>
                <div class="action-card" id="giftActionBtn">
                  <div class="action-card-icon"><i class="fas fa-gift"></i></div>
                  <div class="action-card-text">赠礼</div>
                  <div class="action-card-hint">赠礼给对方</div>
                </div>
                <div class="action-card" id="qinmidu_lovenumget">
                  <div class="action-card-icon"><i class="fas fa-globe"></i></div>
                  <div class="action-card-text">小世界</div>
                  <div class="action-card-hint">我们的世界</div>
                </div>
                <div class="action-card" id="qinmidu_friendpowers">
                  <div class="action-card-icon"><i class="fas fa-user-group"></i></div>
                  <div class="action-card-text">朋友圈设置</div>
                  <div class="action-card-hint">朋友圈权限设置</div>
                </div>
                <div class="action-card" id="modify-update-delmsgs">
                  <div class="action-card-icon"><i class="fas fa-eraser"></i></div>
                  <div class="action-card-text">清除聊天记录</div>
                  <div class="action-card-hint">清空本地消息</div>
                </div>
                <div class="action-card action-card-danger" id="modify-update-delfri">
                  <div class="action-card-icon"><i class="fas fa-user-minus"></i></div>
                  <div class="action-card-text">删除好友</div>
                  <div class="action-card-hint">移除对方</div>
                </div>
                <div class="action-card action-card-danger" id="modify-update-blackhome">
                  <div class="action-card-icon"><i class="fas fa-ban"></i></div>
                  <div class="action-card-text">拉黑好友</div>
                  <div class="action-card-hint">屏蔽对方消息</div>
                </div>
              </div>
            </div>
            <div style="display: none;" id="group-play-do-init">
              <div class="switch-item">
                <div class="switch-label">消息置顶</div>
                <div id="switch-thumb-solots-ggovers" data_types="group_pin" class="switch-toggle active">
                  <div class="switch-thumb"></div>
                </div>
              </div>
              <div class="action-card-grid">
                <div class="action-card" id="modify-update-aliasgroup">
                  <div class="action-card-icon"><i class="fas fa-pen"></i></div>
                  <div class="action-card-text">修改备注</div>
                  <div class="action-card-hint">修改群聊显示名称</div>
                </div>
                <div class="action-card" id="modify-update-groupinfoin">
                  <div class="action-card-icon"><i class="fas fa-edit"></i></div>
                  <div class="action-card-text">编辑群信息</div>
                  <div class="action-card-hint">群名称 / 公告 / 头像</div>
                </div>
                <div class="action-card" id="modify-update-delmsgs">
                  <div class="action-card-icon"><i class="fas fa-trash-alt"></i></div>
                  <div class="action-card-text">清除聊天记录</div>
                  <div class="action-card-hint">清空本地消息</div>
                </div>
                <div class="action-card action-card-danger" id="modify-update-delgroup">
                  <div class="action-card-icon"><i class="fas fa-sign-out-alt"></i></div>
                  <div class="action-card-text">退出群聊</div>
                  <div class="action-card-hint">将不再接收群消息</div>
                </div>
                <div class="action-card action-card-danger" id="modify-update-breakgr">
                  <div class="action-card-icon"><i class="fas fa-users-slash"></i></div>
                  <div class="action-card-text">解散群聊</div>
                  <div class="action-card-hint">群组将被永久删除</div>
                </div>
              </div>
            </div>
          </ul>
        </div>
      </aside>
    </div>
    <div class="mail-drawer-mask" id="mailDrawerMask">
      <div class="mail-drawer-panel">
        <div class="mail-drawer-header">
          <h3><i class="fas fa-envelope"></i> 站内信</h3>
          <button class="mail-drawer-close" id="closeMailDrawerBtn"><i class="fas fa-times"></i></button>
        </div>
        <div class="mail-tabs">
          <div class="mail-tab-item active" data-tab="inbox"><i class="fas fa-inbox"></i> 收信箱 <span class="badge">3</span></div>
          <div class="mail-tab-item" data-tab="unread"><i class="fas fa-circle"></i> 未读</div>
        </div>
        <div class="mail-search">
          <input type="text" class="search-box" placeholder="搜索信件...">
        </div>
        <div class="mail-list-container" id="mailListView">
        </div>
        <div class="mail-detail-view" id="mailDetailView">
          <button class="back-to-list" id="backToListBtn"><i class="fas fa-arrow-left"></i> 返回列表</button>
          <div id="detailContent">
          </div>
        </div>
        <div class="mail-empty-state" id="mailEmptyState" style="display: none;">
          <i class="fas fa-envelope-open"></i>
          <p>暂无站内信&通知</p>
        </div>
      </div>
    </div>
    <div class="activity-modal-mask" id="activityModal" style="display:none;">
      <div class="activity-modal-box">
        <div class="activity-modal-header">
          <h3><i class="fas fa-trophy" style="color:#ffd700;"></i> 活动中心</h3>
          <button class="activity-modal-close" id="closeActivityBtn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="activity-user-bar">
          <div class="activity-user-info">
            <span class="activity-user-id" id="actUserId"><?php echo $q_suname; ?></span>
            <span class="activity-user-level" id="actUserLevel">Lv.0</span>
          </div>
          <div class="activity-coin-display">
            <i class="fas fa-coins" style="color:#ffd700;"></i>
            <span class="activity-coin-amount" id="actCoinAmount">0</span>
          </div>
        </div>
        <div class="activity-exp-bar">
          <div class="activity-exp-track">
            <div class="activity-exp-fill" id="actExpFill" style="width:0%;"></div>
          </div>
          <div class="activity-exp-text" id="actExpText">0 / 200</div>
        </div>
        <div class="activity-tabs">
          <div class="activity-tab active" data-tab="checkin">
            <i class="fas fa-calendar-check"></i> 签到
          </div>
          <div class="activity-tab" data-tab="cdk">
            <i class="fas fa-ticket-alt"></i> CDK
          </div>
          <div class="activity-tab" data-tab="games">
            <i class="fas fa-gamepad"></i> 游戏
          </div>
          <div class="activity-tab" data-tab="loan">
            <i class="fas fa-hand-holding-usd"></i> 借款
          </div>
        </div>
        <div class="activity-tab-content">
          <div class="activity-pane active" id="pane-checkin">
            <div class="checkin-status">
              <div class="checkin-reward">
                <span class="reward-label">签到奖励</span>
                <span class="reward-value">+10 G币</span>
              </div>
              <div class="checkin-streak">
                <span class="streak-label">连续签到</span>
                <span class="streak-value" id="actStreak">0 天</span>
              </div>
            </div>
            <div class="checkin-bonus" id="actBonusTip" style="display:none;">
              🎉 连签7天额外 +10 G币！
            </div>
            <button class="btn btn-primary btn-block" id="actCheckinBtn">
              <i class="fas fa-check"></i> 签到
            </button>
            <div class="checkin-history" id="actCheckinHistory">
            </div>
          </div>
          <div class="activity-pane" id="pane-cdk">
            <div class="cdk-input-group">
              <input type="text" id="actCdkInput" placeholder="请输入激活码" maxlength="20">
              <button class="btn btn-success" id="actCdkBtn">兑换</button>
            </div>
            <div class="cdk-hint">
              <i class="fas fa-info-circle"></i>
              输入有效激活码兑换G币/道具
            </div>
            <div class="cdk-history" id="actCdkHistory">
            </div>
          </div>
          <div class="activity-pane" id="pane-games">
            <div class="games-grid">
              <div class="game-card" data-game="guess">
                <div class="game-icon">🎯</div>
                <div class="game-name">猜数字(低倍率)</div>
                <div class="game-tag">单机 · 下注</div>
              </div>
              <div class="game-card" data-game="dice">
                <div class="game-icon">🎲</div>
                <div class="game-name">掷骰子(低倍率)</div>
                <div class="game-tag">单机 · 下注</div>
              </div>
              <div class="game-card" data-game="blackjack">
                <div class="game-icon">🃏</div>
                <div class="game-name">21点(高倍率)</div>
                <div class="game-tag">单机 · 下注</div>
              </div>
              <div class="game-card" data-game="stock">
                <div class="game-icon">❓</div>
                <div class="game-name">关于</div>
                <div class="game-tag">点我了解详情</div>
              </div>
            </div>
            <div class="games-warning">
              ⚠️ 游戏含下注，请理性娱乐
            </div>
          </div>
          <div class="activity-pane" id="pane-loan">
            <div class="loan-credit-status" id="loanCreditStatus">
              <div class="credit-score">
                <span class="credit-label">📊 信用评分</span>
                <span class="credit-value" id="creditScore">80</span>
              </div>
              <div class="credit-level" id="creditLevel">🟡 良好</div>
            </div>
            <div id="loanEmpty" style="display:block;">
              <div class="loan-info">
                <div class="loan-amount-available">
                  <span class="label">💰 可借额度</span>
                  <span class="value" id="loanAvailable">0</span>
                </div>
                <div class="loan-hint">
                  <i class="fas fa-info-circle"></i>
                  信用越高，可借越多。借款后按时还款可提升信用。
                </div>
              </div>
              <div class="loan-action">
                <input type="number" class="loan-input" id="loanAmountInput" placeholder="输入借款金额" min="10">
                <button class="btn btn-primary btn-block" id="loanBtn">申请借款</button>
              </div>
              <div class="loan-rules">
                <div class="rule-item">📌 借款额度根据信用和G币动态计算</div>
                <div class="rule-item">📌 借款后信用 -2 分</div>
                <div class="rule-item">📌 按时还款信用 +1 分</div>
                <div class="rule-item">📌 逾期(7天)信用 -5 分</div>
              </div>
            </div>
            <div id="loanActive" style="display:none;">
              <div class="loan-detail-card">
                <div class="loan-row">
                  <span class="label">💰 总借款</span>
                  <span class="value" id="loanTotal">0</span>
                </div>
                <div class="loan-row">
                  <span class="label">✅ 已还</span>
                  <span class="value" id="loanRepaid">0</span>
                </div>
                <div class="loan-row">
                  <span class="label">📅 借款时间</span>
                  <span class="value" id="loanTime">-</span>
                </div>
                <div class="loan-progress-wrap">
                  <div class="loan-progress-label">
                    <span>还款进度</span>
                    <span id="loanProgressText">0%</span>
                  </div>
                  <div class="loan-progress-bar">
                    <div class="loan-progress-fill" id="loanProgressFill" style="width:0%;"></div>
                  </div>
                </div>
                <div class="loan-status" id="loanStatus">🟢 进行中</div>
              </div>
              <div class="loan-repay-area">
                <input type="number" class="loan-input" id="repayAmountInput" placeholder="还款金额 (1起步)" min="1">
                <button class="btn btn-success" id="repayBtn">还款</button>
              </div>
              <div class="loan-reminder" id="loanReminder">
                ⚠️ 逾期未还将影响信用，请按时还款
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="rp-send-modal-overlay" id="rpSendModal" style="display: none;">
      <div class="rp-send-modal-container">
        <div class="rp-send-header">
          <h3 class="rp-send-title">
            <i class="fas fa-envelope" style="color: #f44336;"></i> 发红包
          </h3>
          <button class="rp-send-close" id="rpSendCloseBtn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="rp-send-body">
          <div class="rp-send-type-tabs">
            <button class="rp-send-type-btn active" data-type="random">
              <i class="fas fa-random"></i> 拼手气
            </button>
            <button class="rp-send-type-btn" data-type="average">
              <i class="fas fa-equals"></i> 平均红包
            </button>
          </div>
          <div class="rp-send-field">
            <label class="rp-send-label">
              <i class="fas fa-coins" style="color: #ffd700;"></i> 总金额（G币）
            </label>
            <input type="number" class="rp-send-input" id="rpTotalAmount" placeholder="请输入总金额" min="1" step="1" value="10">
            <span class="rp-send-hint">最低 1 G币</span>
          </div>
          <div class="rp-send-field">
            <label class="rp-send-label">
              <i class="fas fa-hashtag"></i> 红包个数
            </label>
            <input type="number" class="rp-send-input" id="rpTotalCount" placeholder="请输入红包个数" min="1" max="100" value="5">
            <span class="rp-send-hint">最多 100 个</span>
          </div>
          <div class="rp-send-field">
            <label class="rp-send-label">
              <i class="fas fa-gift"></i> 祝福语
            </label>
            <input type="text" class="rp-send-input" id="rpBlessing" placeholder="恭喜发财，大吉大利" maxlength="30" value="恭喜发财，大吉大利">
            <span class="rp-send-char-counter" id="rpBlessingCounter">0/30</span>
          </div>
          <div class="rp-send-balance-info">
            <span class="rp-send-balance-label">💰 我的余额</span>
            <span class="rp-send-balance-value" id="rpUserBalance">0 G币</span>
          </div>
        </div>
        <div class="rp-send-footer">
          <button class="rp-send-btn rp-send-btn-cancel" id="rpSendCancelBtn">取消</button>
          <button class="rp-send-btn rp-send-btn-confirm" id="rpSendConfirmBtn">
            <i class="fas fa-hand-holding-heart"></i> 塞钱进红包
          </button>
        </div>
      </div>
    </div>
    <div class="rp-detail-modal-overlay" id="rpDetailModal" style="display: none;">
      <div class="rp-detail-modal-container">
        <div class="rp-detail-card-header">
          <button class="rp-detail-close" id="rpDetailCloseBtn">
            <i class="fas fa-times"></i>
          </button>
          <div class="rp-detail-card-icon">
            <i class="fas fa-envelope" style="font-size: 48px; color: #ffd700;"></i>
          </div>
          <div class="rp-detail-blessing" id="rpDetailBlessing">恭喜发财，大吉大利</div>
          <div class="rp-detail-sender" id="rpDetailSender">
            <span>来自 </span>
            <strong id="rpDetailSenderName">用户昵称</strong>
          </div>
        </div>
        <div class="rp-detail-amount-section">
          <div class="rp-detail-amount-row">
            <span class="rp-detail-amount-label">💰 总金额</span>
            <span class="rp-detail-amount-value" id="rpDetailTotalAmount">0 G币</span>
          </div>
          <div class="rp-detail-amount-row">
            <span class="rp-detail-amount-label">📦 红包个数</span>
            <span class="rp-detail-amount-value" id="rpDetailTotalCount">0 个</span>
          </div>
          <div class="rp-detail-amount-row">
            <span class="rp-detail-amount-label">📭 剩余</span>
            <span class="rp-detail-amount-value" id="rpDetailRemainCount">0 个</span>
          </div>
        </div>
        <div class="rp-detail-grab-section" id="rpDetailGrabSection">
          <button class="rp-detail-grab-btn" id="rpDetailGrabBtn">
            <i class="fas fa-hand-peace"></i> 抢红包
          </button>
          <div class="rp-detail-grab-result" id="rpDetailGrabResult" style="display: none;">
            <span class="rp-detail-grab-amount" id="rpDetailGrabAmount">0.00</span>
            <span class="rp-detail-grab-unit">G币</span>
          </div>
        </div>
        <div class="rp-detail-records-section">
          <div class="rp-detail-records-header">
            <span class="rp-detail-records-title">
              <i class="fas fa-list-ul"></i> 领取记录
            </span>
            <span class="rp-detail-records-count" id="rpDetailRecordsCount">0 人已领</span>
          </div>
          <div class="rp-detail-records-list" id="rpDetailRecordsList">
            <div class="rp-detail-empty-records">
              <i class="fas fa-inbox"></i>
              <span>还没有人领取</span>
            </div>
          </div>
        </div>
        <div class="rp-detail-footer">
          <span class="rp-detail-status" id="rpDetailStatus">⏳ 等待领取中...</span>
        </div>
      </div>
    </div>
    <script>
      const glclearBtn = document.getElementById('glclearBtn');
      const glsearchInput = document.querySelector('.glinput-search input');
      glclearBtn.addEventListener('click', () => {
        glsearchInput.value = '';
        glsearchInput.focus();
      });
    </script>
    <script>
      async function mok_confirm(message) {
        const result = await swal.fire({
          title: '提示',
          text: message,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          didOpen: (popup) => {
            const container = popup.closest('.swal2-container');
            if (container) {
              container.style.zIndex = '999999999999';
            }
          }
        });
        return result.isConfirmed;
      }

      function mokim_compareWithCurrentTime(datetime) {
        const result = {
          success: false,
          code: null,
          message: '',
          detail: null
        };
        const now = new Date();
        if (isNaN(now.getTime())) {
          result.message = '系统当前时间无效';
          result.detail = '系统时间错误';
          return result;
        }
        if (datetime === null || datetime === undefined || datetime === '') {
          result.message = '输入的时间不能为空';
          result.detail = 'Empty or null input';
          return result;
        }
        let targetTime = null;
        if (datetime instanceof Date) {
          targetTime = datetime;
        } else if (typeof datetime === 'number') {
          if (datetime < 0 || datetime > 1e12) {
            result.message = '时间戳超出合理范围';
            result.detail = `Invalid timestamp: ${datetime}`;
            return result;
          }
          targetTime = new Date(datetime);
        } else if (typeof datetime === 'string') {
          const trimmed = datetime.trim();
          if (trimmed === '') {
            result.message = '时间字符串不能为空';
            result.detail = 'Empty string';
            return result;
          }
          let parsed = null;
          let normalized = trimmed;
          if (normalized.includes(' ') && !normalized.includes('T')) {
            normalized = normalized.replace(' ', 'T');
          }
          if (normalized.includes('-') && !normalized.includes('T')) {
            normalized = normalized.replace(/-/g, '/');
          }
          parsed = new Date(normalized);
          if (isNaN(parsed.getTime())) {
            parsed = new Date(trimmed);
          }
          if (isNaN(parsed.getTime())) {
            const match = trimmed.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
            if (match) {
              const [, year, month, day, hour, minute, second] = match;
              parsed = new Date(year, month - 1, day, hour, minute, second);
            }
          }

          targetTime = parsed;
        } else {
          result.message = '不支持的时间类型，请使用 Date 对象、时间戳或字符串';
          result.detail = `Unsupported type: ${typeof datetime}`;
          return result;
        }
        if (!targetTime || isNaN(targetTime.getTime())) {
          result.message = '无法解析的时间格式';
          result.detail = `Invalid datetime: ${datetime}`;
          return result;
        }
        const minDate = new Date(1000, 0, 1);
        const maxDate = new Date(3000, 0, 1);
        if (targetTime < minDate || targetTime > maxDate) {
          result.message = '时间超出合理范围（1000-3000年）';
          result.detail = `Date out of range: ${targetTime}`;
          return result;
        }
        result.success = true;
        const diff = targetTime.getTime() - now.getTime();
        const tolerance = 1000;
        if (Math.abs(diff) <= tolerance) {
          result.code = 'equal';
          result.message = '两个时间相等（相差不超过1秒）';
          result.detail = {
            diff: diff,
            current: now,
            target: targetTime
          };
        } else if (targetTime > now) {
          result.code = 'greater';
          result.message = '变量时间更大（晚于当前时间）';
          result.detail = {
            diff: diff,
            current: now,
            target: targetTime
          };
        } else {
          result.code = 'less';
          result.message = '当前时间更大（晚于变量时间）';
          result.detail = {
            diff: diff,
            current: now,
            target: targetTime
          };
        }

        return result;
      }

      function plugin_post_requests(data, callback, options = {}) {
        const {
          url = '/api/',
            timeout = 10000,
            headers = {},
            withCredentials = false
        } = options;
        const defaultHeaders = {
          'Content-Type': 'application/json',
          ...headers
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        fetch(url, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(data),
            credentials: withCredentials ? 'include' : 'same-origin',
            signal: controller.signal
          })
          .then(async response => {
            clearTimeout(timeoutId);

            const contentType = response.headers.get('content-type');
            let result;

            if (contentType && contentType.includes('application/json')) {
              result = await response.json();
            } else {
              result = await response.text();
            }

            if (!response.ok) {
              throw new Error(result.message || `请求失败: ${response.status}`);
            }

            callback(null, result);
          })
          .catch(error => {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
              callback(new Error('请求超时'), null);
            } else {
              callback(error, null);
            }
          });
      }
    </script>
    <script src="ast/authwrite.js"></script>
    <script src="ast/sweetalert2.all.min.js"></script>
    <script src="ast/plugin/html2canvas.min.js"></script>
    <script src="ast/translate.js"></script> <!-- 翻译插件 -->
    <script src="ast/console.js"></script>
    <style>
      #translate {
        display: none !important;
        z-index: 0 !important;
      }
    </style>
    <script type="module">
      import mokim_AnimationEngine from './ast/logic/gifts/giftsengine.js';
      import YHTVideoPlayerEngine from './ast/logic/videos/videoengine.js';
      import {
        YhMokTTCreateStatsModule,
        YhMokTTisWithin180s
      } from './ast/logic/games/stats.js';
      window.mokim_AnimationEngine = mokim_AnimationEngine;
      window.YHTVideoPlayerEngine = YHTVideoPlayerEngine;
      window.YhMokTTCreateStatsModule = YhMokTTCreateStatsModule;
      window.YhMokTTisWithin180s = YhMokTTisWithin180s;
    </script>
    <script>
      const newfuckingao = new ConsoleDetector();
      newfuckingao.startDetection();
      console.log = function() {};
      console.info = function() {};
      console.warn = function() {};
      console.error = function() {};
      const tmd_newcontroler = new tmdbaseauthdownyho(); //授权对象化
      translate.listener.start(); //翻译插件
      window.qmok_userid_id = <?php echo json_encode($q_suname); ?>; //用户id
      window.qmok_userid_expire = <?php echo $userlogin_expiretime_used; ?>;
      window.goutapi_wslinkingadd = <?php echo json_encode($gout_api_wslinking_address); ?>; //ws链接地址
      class CustomAlert { //自定义弹窗类
        static show(options) {
          const config = Object.assign({
            title: '提示',
            content: '',
            cancelText: '取消',
            confirmText: '确定',
            onCancel: () => {},
            onConfirm: () => {}
          }, options);
          this.destroy();
          const mask = document.createElement('div');
          mask.className = 'custom-alert-mask';
          mask.innerHTML = `
      <div class="custom-alert-box">
        <div class="custom-alert-header">
          <span>${config.title}</span>
          <span class="custom-alert-close"><i class="fas fa-times"></i></span>
        </div>
        <div class="custom-alert-body">${config.content}</div>
        <div class="custom-alert-footer">
          <button class="custom-alert-btn custom-alert-btn-cancel">${config.cancelText}</button>
          <button class="custom-alert-btn custom-alert-btn-confirm">${config.confirmText}</button>
        </div>
      </div>
    `;
          document.body.appendChild(mask);
          const closeBtn = mask.querySelector('.custom-alert-close');
          const cancelBtn = mask.querySelector('.custom-alert-btn-cancel');
          const confirmBtn = mask.querySelector('.custom-alert-btn-confirm');
          const destroy = () => {
            mask.remove();
          };
          closeBtn.addEventListener('click', () => {
            config.onCancel();
            destroy();
          });
          cancelBtn.addEventListener('click', () => {
            config.onCancel();
            destroy();
          });
          confirmBtn.addEventListener('click', () => {
            config.onConfirm();
            destroy();
          });
          mask.addEventListener('click', (e) => {
            if (e.target === mask) {
              config.onCancel();
              destroy();
            }
          });
        }
        static destroy() {
          const oldMask = document.querySelector('.custom-alert-mask');
          if (oldMask) oldMask.remove();
        }
      }

      function alertMsg(content, confirmCallback) {
        CustomAlert.show({
          content: content,
          cancelText: '关闭',
          confirmText: '确定',
          onConfirm: confirmCallback || (() => {})
        });
      }

      function mok_showDialog(options) {
        const config = Object.assign({
          title: '提示',
          content: '',
          buttons: [{
            text: '确定',
            callback: () => {},
            type: 'primary'
          }],
          showClose: true,
          onClose: () => {}
        }, options);
        const existingMask = document.querySelector('.custom-dialog-mask');
        if (existingMask) existingMask.remove();
        const mask = document.createElement('div');
        mask.className = 'custom-dialog-mask';
        let buttonsHtml = '';
        config.buttons.forEach((btn, idx) => {
          let btnClass = 'custom-dialog-btn';
          if (btn.type === 'primary') btnClass += ' custom-dialog-btn-primary';
          else if (btn.type === 'danger') btnClass += ' custom-dialog-btn-danger';
          buttonsHtml += `<button class="${btnClass}" data-idx="${idx}">${btn.text}</button>`;
        });

        mask.innerHTML = `
    <div class="custom-dialog-box">
      <div class="custom-dialog-header">
        <span>${config.title}</span>
        ${config.showClose ? '<span class="custom-dialog-close"><i class="fas fa-times"></i></span>' : ''}
      </div>
      <div class="custom-dialog-body">${config.content}</div>
      <div class="custom-dialog-footer">
        ${buttonsHtml}
      </div>
    </div>
  `;

        document.body.appendChild(mask);
        const destroy = () => {
          mask.remove();
        };
        if (config.showClose) {
          const closeBtn = mask.querySelector('.custom-dialog-close');
          closeBtn.addEventListener('click', () => {
            config.onClose();
            destroy();
          });
        }
        const btns = mask.querySelectorAll('.custom-dialog-btn');
        btns.forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.idx);
            const btnConfig = config.buttons[idx];
            if (btnConfig && typeof btnConfig.callback === 'function') {
              btnConfig.callback();
            }
            destroy();
          });
        });
        mask.addEventListener('click', (e) => {
          if (e.target === mask) {
            config.onClose();
            destroy();
          }
        });
      }
    </script>
    <script src="ast/screenhost.js"></script>
    <script>
      const screenshot = new Screenshot(); //截图工具
    </script>
    <script src="ast/logic/index.js"></script> <!-- 基础 -->
    <script src="ast/logic/settings.js"></script> <!-- 设置 -->
    <script src="ast/logic/init.js"></script> <!-- 核心 -->
    <script src="ast/logic/tranuse.js"></script> <!-- 群聊插件 -->
    <script src="ast/logic/friend.js"></script> <!-- 好友插件 -->
    <script src="ast/logic/mail.js"></script> <!-- 邮件插件 -->
    <script src="ast/logic/contman.js"></script> <!-- 联系人插件 -->
    <script src="ast/logic/remotevideo.js"></script> <!-- 语音/视频通话 -->
    <script src="ast/logic/scheduled-message.js"></script> <!-- 定时消息 -->
    <script src="ast/logic/customized.js"></script> <!-- 个性化定制 -->
    <script src="ast/logic/otrp1.js"></script> <!-- 其他P.1 -->
    <script src="ast/logic/otrp2-files.js"></script> <!-- 其他P.2-文件通道二专项 -->
    <script src="ast/logic/otrp3-person.js"></script> <!-- 其他P.3 个人信息 -->
    <script src="ast/logic/otrp4-gifts.js"></script> <!-- 其他P.4 礼物组件 -->
    <script src="ast/logic/otrp5-music.js"></script> <!-- 其他P.5 音乐分享组件 -->
    <script src="ast/logic/otrp6-video.js"></script> <!-- 其他P.6 视频分享组件 -->
    <script src="ast/logic/otrp7-activity.js"></script> <!-- 其他P.7 活动组件 -->
    <script src="ast/logic/otrp8-game.js"></script> <!-- 其他P.8 游戏组件 -->
    <script src="ast/logic/otrp9-redpacket.js"></script> <!-- 其他P.9 红包组件 -->
    <script src="ast/logic/otrp10-fileupload.js"></script> <!-- 其他P.10 文件上传GFL3 -->
    <script src="ast/logic/otrp11-groupfile.js"></script> <!-- 其他P.11 群文件管理 -->
  </body>
  <script>
    document.getElementById('exportorincludemessageused').addEventListener('click', () => {
      window.open('notice/Doc/convlog/?userId=' + window.qmok_userid_id);
    });
  </script>

  </html>
<?php
} else {
  mokim_ttl_elegant_exit(
    '您当前未登录<a href="/use/user/">点我登录</a>',
    null,
    'error'
  );
}
?>