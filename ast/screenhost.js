class Screenshot {
  constructor() {
    this.isCapturing = false;
    this.selection = { x: 0, y: 0, width: 0, height: 0 };
    this.startPos = { x: 0, y: 0 };
    this.mode = 'manual';
    this.isSelecting = false;
    this.screenshotContainer = null;
    this.maskLayer = null;
    this.selectionBox = null;
    this.toolbar = null;
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.cancelCapture = this.cancelCapture.bind(this);
    this.captureFullscreen = this.captureFullscreen.bind(this);
    this.captureLongScreenshot = this.captureLongScreenshot.bind(this);
    this.confirmCapture = this.confirmCapture.bind(this);
    this.init();
  }


  init() {
    document.addEventListener('keydown', this.handleKeydown);
  }


  handleKeydown(e) {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      if (!this.isCapturing) {
        this.startCapture();
      }
    }
  }


  startCapture() {
    this.isCapturing = true;
    this.screenshotContainer = document.createElement('div');
    this.screenshotContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      pointer-events: none; 
    `;

    this.screenshotContainer.querySelectorAll('*').forEach(el => {
      el.style.pointerEvents = 'auto';
    });


    this.maskLayer = document.createElement('div');
    this.maskLayer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      cursor: crosshair;
      pointer-events: auto; 
    `;
    this.screenshotContainer.appendChild(this.maskLayer);


    this.selectionBox = document.createElement('div');
    this.selectionBox.style.cssText = `
      position: absolute;
      border: 2px solid #4A90E2;
      background: rgba(255, 255, 255, 0.1);
      display: none;
      z-index: 10;
      pointer-events: none; 
    `;
    this.screenshotContainer.appendChild(this.selectionBox);


    this.createToolbar();


    document.body.appendChild(this.screenshotContainer);
    document.body.style.overflow = 'hidden';


    this.maskLayer.addEventListener('mousedown', this.handleMouseDown);

    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.mouseUpHandler = this.handleMouseUp.bind(this);
    this.escapeHandler = (e) => {
      if (e.key === 'Escape') this.cancelCapture();
    };
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
    document.addEventListener('keydown', this.escapeHandler);
  }


  createToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      padding: 8px 16px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      z-index: 20;
      pointer-events: auto; 
    `;


    const buttons = [
      { text: '全屏', click: this.captureFullscreen, icon: '🖥️' },
      { text: '框选', click: () => { this.mode = 'manual'; }, icon: '📏' },
      { text: '长截屏', click: this.captureLongScreenshot, icon: '📜' },
      { text: '确认', click: this.confirmCapture, icon: '✓', primary: true },
      { text: '取消', click: this.cancelCapture, icon: '✕' }
    ];


    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        background: ${btn.primary ? '#4A90E2' : '#f5f5f5'};
        color: ${btn.primary ? '#fff' : '#333'};
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      `;
      button.innerHTML = `${btn.icon} ${btn.text}`;
      button.addEventListener('mouseover', () => {
        button.style.background = btn.primary ? '#3A80D2' : '#e5e5e5';
      });
      button.addEventListener('mouseout', () => {
        button.style.background = btn.primary ? '#4A90E2' : '#f5f5f5';
      });
      button.addEventListener('click', btn.click);
      this.toolbar.appendChild(button);
    });

    this.screenshotContainer.appendChild(this.toolbar);
  }


  handleMouseDown(e) {
    if (this.mode !== 'manual') return;
    e.preventDefault();

    this.isSelecting = true;
    this.startPos.x = e.clientX;
    this.startPos.y = e.clientY;


    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = `${this.startPos.x}px`;
    this.selectionBox.style.top = `${this.startPos.y}px`;
    this.selectionBox.style.width = '0';
    this.selectionBox.style.height = '0';
  }


  handleMouseMove(e) {
    if (!this.isCapturing || this.mode !== 'manual' || !this.isSelecting) return;


    const currentX = e.clientX;
    const currentY = e.clientY;

    this.selection.x = Math.min(this.startPos.x, currentX);
    this.selection.y = Math.min(this.startPos.y, currentY);
    this.selection.width = Math.abs(currentX - this.startPos.x);
    this.selection.height = Math.abs(currentY - this.startPos.y);


    this.selectionBox.style.left = `${this.selection.x}px`;
    this.selectionBox.style.top = `${this.selection.y}px`;
    this.selectionBox.style.width = `${this.selection.width}px`;
    this.selectionBox.style.height = `${this.selection.height}px`;
  }


  handleMouseUp(e) {
    if (this.mode !== 'manual' || !this.isSelecting) return;

    this.isSelecting = false;


    if (this.selection.width < 10 || this.selection.height < 10) {
      this.selectionBox.style.display = 'none';
      this.selection = { x: 0, y: 0, width: 0, height: 0 };
      return;
    }

  }


  captureFullscreen() {
    this.mode = 'fullscreen';
    this.selection = {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };


    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = '0';
    this.selectionBox.style.top = '0';
    this.selectionBox.style.width = '100vw';
    this.selectionBox.style.height = '100vh';
  }


  captureLongScreenshot() {
    this.mode = 'long';
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );

    this.selection = {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: docHeight
    };
    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = '0';
    this.selectionBox.style.top = '0';
    this.selectionBox.style.width = '100vw';
    this.selectionBox.style.height = `${docHeight}px`;
    const tip = document.createElement('div');
    tip.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      background: rgba(0,0,0,0.7);
      color: white;
      border-radius: 4px;
      font-size: 14px;
      z-index: 20;
      pointer-events: none;
    `;
    tip.textContent = '长截屏模式：已选中整个文档区域，点击确认完成截图';
    this.screenshotContainer.appendChild(tip);

    setTimeout(() => {
      tip.style.opacity = '0';
      tip.style.transition = 'opacity 0.5s';
      setTimeout(() => tip.remove(), 500);
    }, 2000);
  }


  hideCaptureUI() {
    if (this.maskLayer) this.maskLayer.style.display = 'none';
    if (this.toolbar) this.toolbar.style.display = 'none';
    if (this.selectionBox) this.selectionBox.style.display = 'none';
  }


  showCaptureUI() {
    if (this.maskLayer) this.maskLayer.style.display = 'block';
    if (this.toolbar) this.toolbar.style.display = 'flex';
    if (this.selectionBox && (this.selection.width > 10 || this.mode !== 'manual')) {
      this.selectionBox.style.display = 'block';
    }
  }
  async confirmCapture() {
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (!this.selection.width || !this.selection.height) {
        alertMsg('请先选择截图区域');
        return;
      }
      this.hideCaptureUI();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = this.selection.width;
      canvas.height = this.selection.height;
      if (this.mode === 'long') {
        await this.captureLongScreenshotToCanvas(canvas, ctx);
      } else {
        if (window.html2canvas) {
          const screenshotElement = document.documentElement;
          await html2canvas(screenshotElement, {
            x: this.selection.x,
            y: this.selection.y,
            width: this.selection.width,
            height: this.selection.height,
            scale: window.devicePixelRatio || 1,
            useCORS: true,
            logging: false
          }).then(canvas => {
            this.handleScreenshotResult(canvas);
          });
        } else {
          alertMsg('缺少核心依赖库,已降级处理');
          this.fallbackScreenshot(canvas, ctx);
        }
      }
      this.showCaptureUI();
    } catch (error) {
      alertMsg('截图失败，请重试');
      this.showCaptureUI();
      this.cancelCapture();
    }
  }
  captureLongScreenshotToCanvas(canvas, ctx) {
    return new Promise((resolve) => {
      const viewportHeight = window.innerHeight;
      const totalHeight = this.selection.height;
      const scrollStep = viewportHeight;
      let currentY = 0;
      const captureSegment = () => {
        if (currentY >= totalHeight) {
          this.handleScreenshotResult(canvas);
          resolve();
          return;
        }
        window.scrollTo(0, currentY);
        setTimeout(() => {
          this.hideCaptureUI();

          if (window.html2canvas) {
            html2canvas(document.documentElement, {
              x: 0,
              y: 0,
              width: window.innerWidth,
              height: Math.min(scrollStep, totalHeight - currentY),
              scale: window.devicePixelRatio || 1,
              useCORS: true,
              logging: false
            }).then(segmentCanvas => {
              this.showCaptureUI();

              ctx.drawImage(segmentCanvas, 0, currentY);
              currentY += scrollStep;
              captureSegment();
            });
          } else {
            this.fallbackScreenshot(canvas, ctx);
            resolve();
          }
        }, 100);
      };

      captureSegment();
    });
  }
  fallbackScreenshot(canvas, ctx) {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, this.selection.x, this.selection.y, this.selection.width, this.selection.height, 0, 0, this.selection.width, this.selection.height);
      this.handleScreenshotResult(canvas);
      this.showCaptureUI();
    };
    img.src = document.documentElement.toDataURL('image/png');
  }
  handleScreenshotResult(canvas) {
    const imageData = canvas.toDataURL('image/png');
    this.createPreviewWindow(imageData);
    this.cleanup();
  }
  createPreviewWindow(imageData) {
    const preview = document.createElement('div');
    preview.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 999999;
      max-width: 90vw;
      max-height: 90vh;
    `;
    const img = document.createElement('img');
    img.src = imageData;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '80vh';
    preview.appendChild(img);
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 15px; justify-content: center;';
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '复制图片';
    copyBtn.style.cssText = `
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background: #4A90E2;
      color: white;
      cursor: pointer;
    `;
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': await fetch(imageData).then(res => res.blob())
          })
        ]);
        alertMsg('图片已复制到剪贴板');
        document.getElementById('overlay_screenshot_downmok').remove();
        preview.remove();
      } catch (err) {
        alertMsg('复制失败，请手动保存');
      }
    });
    btnContainer.appendChild(copyBtn);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
    `;
    closeBtn.addEventListener('click', () => {
      document.getElementById('overlay_screenshot_downmok').remove();
      preview.remove();
    });
    btnContainer.appendChild(closeBtn);
    preview.appendChild(btnContainer);
    document.body.appendChild(preview);
    const overlay = document.createElement('div');
    overlay.id = 'overlay_screenshot_downmok';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.5);
      z-index: 999998;
    `;
    document.body.appendChild(overlay);
  }

  cancelCapture() {
    this.cleanup();
  }
  cleanup() {
    this.isCapturing = false;
    this.isSelecting = false;
    if (this.screenshotContainer) {
      this.screenshotContainer.remove();
    }
    document.body.style.overflow = '';
    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.mouseUpHandler) {
      document.removeEventListener('mouseup', this.mouseUpHandler);
    }
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
    this.selection = { x: 0, y: 0, width: 0, height: 0 };
  }
  destroy() {
    document.removeEventListener('keydown', this.handleKeydown);
    this.cleanup();
  }
}
