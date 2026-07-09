<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>World For You</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: #f2efe6;  
      font-family: 'Times New Roman', 'Songti SC', '宋体', serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background-image: 
        radial-gradient(circle at 20% 30%, rgba(210, 190, 170, 0.08) 0%, transparent 30%),
        radial-gradient(circle at 80% 70%, rgba(180, 160, 140, 0.06) 0%, transparent 40%);
    }

   
    .welcome-card {
      max-width: 720px;
      width: 100%;
      background: #fcf9f3;     
      padding: 3.5rem 2.5rem;
      border-radius: 24px;
      box-shadow: 
        0 12px 28px rgba(0, 0, 0, 0.04),
        0 4px 12px rgba(0, 0, 0, 0.02),
        inset 0 1px 0 rgba(255, 247, 235, 0.6);
      border: 1px solid #e7dfd2;
      transition: all 0.2s ease;
      text-align: center;
    
      position: relative;
    }


    .welcome-card::before {
      content: '';
      position: absolute;
      top: -8px;
      left: 15%;
      width: 70%;
      height: 6px;
      background: repeating-linear-gradient(90deg, 
        transparent, 
        transparent 8px, 
        #d8cfbe 8px, 
        #d8cfbe 10px
      );
      opacity: 0.25;
      border-radius: 50%;
      filter: blur(1px);
    }

    .welcome-card::after {
      content: '';
      position: absolute;
      bottom: -6px;
      right: 10%;
      width: 40%;
      height: 4px;
      background: repeating-linear-gradient(90deg, 
        transparent, 
        transparent 12px, 
        #cbbca8 12px, 
        #cbbca8 14px
      );
      opacity: 0.15;
      border-radius: 50%;
      filter: blur(1px);
    }

   
    .greeting {
      font-size: clamp(2.6rem, 10vw, 4.2rem);
      font-weight: 400;
      font-family: 'Times New Roman', 'Songti SC', '华文宋体', serif;
      color: #3d352a;
      letter-spacing: 0.04em;
      line-height: 1.3;
      margin-bottom: 0.5rem;
      text-shadow: 0 1px 0 #f5ede0, 0 2px 4px rgba(100, 80, 60, 0.05);
      word-break: break-word;
    }

   
    .sub-motto {
      font-size: 1.1rem;
      color: #7f7060;
      font-family: 'Times New Roman', 'Songti SC', '宋体', serif;
      letter-spacing: 0.25em;
      margin-top: 0.2rem;
      margin-bottom: 1.8rem;
      border-top: 1px dashed #d6ccbc;
      border-bottom: 1px dashed #d6ccbc;
      padding: 0.8rem 0.5rem;
      display: inline-block;
      font-style: italic;
      opacity: 0.8;
      background: rgba(235, 224, 210, 0.15);
      border-radius: 40px;
      padding-left: 1.8rem;
      padding-right: 1.8rem;
      backdrop-filter: blur(2px);
    }

   
    .pixel-dots {
      display: flex;
      justify-content: center;
      gap: 0.8rem;
      margin: 1.8rem 0 2.2rem 0;
      flex-wrap: wrap;
    }

    .pixel-dot {
      width: 0.8rem;
      height: 0.8rem;
      background: #b7a690;
      transform: rotate(45deg);
      opacity: 0.2;
      border-radius: 2px;
      transition: opacity 0.2s;
    }

    .pixel-dot:nth-child(2) {
      background: #9b8a78;
      opacity: 0.3;
      width: 1rem;
      height: 1rem;
    }
    .pixel-dot:nth-child(3) {
      background: #a3917e;
      opacity: 0.25;
      width: 0.6rem;
      height: 0.6rem;
    }
    .pixel-dot:nth-child(4) {
      background: #bfaea0;
      opacity: 0.15;
    }
    .pixel-dot:nth-child(5) {
      background: #887a6a;
      opacity: 0.2;
      width: 0.9rem;
      height: 0.9rem;
    }

    
    .message {
      font-size: 1.2rem;
      line-height: 1.7;
      color: #4d4237;
      font-family: 'Times New Roman', 'KaiTi', '楷体', serif;
      letter-spacing: 0.03em;
      margin: 1.2rem 0 1.8rem 0;
      padding: 0 0.2rem;
      border-left: 3px solid #d3c5b4;
      border-right: 3px solid #d3c5b4;
      padding: 0.4rem 1.2rem;
      display: inline-block;
      background: #faf6ef;
      border-radius: 30px;
      box-shadow: inset 0 1px 4px rgba(150, 130, 110, 0.04);
    }


    .divider-line {
      width: 50px;
      height: 2px;
      margin: 0.5rem auto 1.5rem auto;
      background: #d9cdbc;
      border-radius: 4px;
      opacity: 0.5;
    }


    .game-icon {
      font-size: 2.4rem;
      line-height: 1;
      display: inline-block;
      margin: 0.2rem 0.3rem;
      filter: drop-shadow(0 2px 2px rgba(0,0,0,0.02));
      opacity: 0.35;
      font-family: 'Segoe UI', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;
      letter-spacing: 0.1em;
    }

    
    .footer-note {
      margin-top: 2.8rem;
      font-size: 0.8rem;
      color: #b3a392;
      letter-spacing: 0.08em;
      border-top: 1px solid #e3d9cc;
      padding-top: 1.5rem;
      display: flex;
      justify-content: center;
      gap: 1.2rem;
      flex-wrap: wrap;
    }

    .footer-note span {
      background: #f5efe8;
      padding: 0.2rem 0.8rem;
      border-radius: 40px;
      font-family: 'Times New Roman', 'Songti SC', serif;
      font-style: italic;
      opacity: 0.7;
      font-size: 0.75rem;
      border: 1px solid #e4d9cd;
    }

  
    @media (max-width: 480px) {
      .welcome-card {
        padding: 2.2rem 1.2rem;
      }
      .greeting {
        font-size: 2.8rem;
      }
      .sub-motto {
        font-size: 0.9rem;
        padding: 0.4rem 1rem;
        letter-spacing: 0.15em;
      }
      .message {
        font-size: 1rem;
        padding: 0.3rem 0.8rem;
      }
      .pixel-dots {
        gap: 0.5rem;
      }
    }
    ::-webkit-scrollbar{
        display: none;
    }
  </style>
</head>
<body>
  <main class="welcome-card">
    <div class="pixel-dots" aria-hidden="true">
      <span class="pixel-dot"></span>
      <span class="pixel-dot"></span>
      <span class="pixel-dot"></span>
      <span class="pixel-dot"></span>
      <span class="pixel-dot"></span>
    </div>
    <h1 class="greeting">✦ 欢迎来到游戏世界 ✦</h1>
    <div class="sub-motto">— 探索 · 冒险 · 无限可能 —</div>
    <div class="game-icon" aria-hidden="true">
      🎲 🕹️ 🎮
    </div>
    <p class="message">
      无论你是勇士、法师，还是孤独的旅人<br>
      这里都为你留着一扇门。
    </p>
    <div class="divider-line" aria-hidden="true"></div>
    <div style="font-size: 1.8rem; line-height: 1; opacity: 0.2; letter-spacing: 6px; margin: 0.4rem 0;" aria-hidden="true">
      ◇ ◈ ◇
    </div>
    <footer class="footer-note">
      <span>✦ 像素中的诗 ✦</span>
      <span>⚔️ 行囊已备 ⚔️</span>
      <span>🌿 出发吧 🌿</span>
    </footer>
  </main>
</body>
</html>