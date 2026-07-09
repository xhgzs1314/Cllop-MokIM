const mokim_AnimationEngine = {
    rand: (min, max) => Math.random() * (max - min) + min,
    randInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    randomColor: () => {
        const hue = Math.random() * 360;
        return `hsl(${hue}, 90%, 60%)`;
    },
    randomColorPalette: (count) => {
        const base = Math.random() * 360;
        return Array.from({ length: count }, (_, i) =>
            `hsl(${(base + i * (360 / count)) % 360}, 85%, 60%)`
        );
    },
    createCanvas: (container) => {
        const canvas = document.createElement('canvas');
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = (rect.width || window.innerWidth) * dpr;
        canvas.height = (rect.height || window.innerHeight) * dpr;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '10000';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        container.appendChild(canvas);
        return { canvas, ctx, width: canvas.width / dpr, height: canvas.height / dpr };
    },
    redpacket: function (container, options = {}) {
        const { canvas, ctx, width, height } = this.createCanvas(container);
        const centerX = width / 2;
        const centerY = height / 2;
        let startTime = performance.now();
        const config = Object.assign({
            type: 'both', // 'both' | 'coin' | 'intimacy'
            coinAmount: 88, // 红包金额（G币）
            intimacyAmount: 18, // 祝福语数量/强度
            duration: 3000,
            coinColor: '#FF2D2D', // 红包主色 - 中国红
            intimacyColor: '#FFD700' // 祝福语颜色 - 金色
        }, options);

        const particles = [];
        const floatingTexts = [];
        const sparkles = [];
        const envelopeParticles = [];
        const moneyParticles = [];
        function createEnvelopeParticles() {
            const count = 8 + Math.floor(Math.random() * 6);
            for (let i = 0; i < count; i++) {
                const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
                const speed = 80 + Math.random() * 150;
                const size = 20 + Math.random() * 25;
                envelopeParticles.push({
                    x: centerX + (Math.random() - 0.5) * 60,
                    y: centerY + (Math.random() - 0.5) * 40 - 30,
                    vx: Math.cos(angle) * speed * (0.3 + Math.random() * 0.5),
                    vy: Math.sin(angle) * speed * (0.3 + Math.random() * 0.5) - 120,
                    size: size,
                    life: 1,
                    decay: 0.005 + Math.random() * 0.01,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.08,
                    gravity: 60 + Math.random() * 40,
                    hue: 350 + Math.random() * 20, // 红色系
                    lightness: 50 + Math.random() * 20,
                    scale: 0.7 + Math.random() * 0.6,
                    type: 'envelope'
                });
            }
        }
        function createMoneyParticles() {
            const count = 25 + Math.floor(Math.random() * 25);
            const angleSpread = Math.PI * 0.7;
            const baseAngle = -Math.PI / 2 - angleSpread / 2;
            for (let i = 0; i < count; i++) {
                const angle = baseAngle + Math.random() * angleSpread;
                const speed = 100 + Math.random() * 300;
                const size = 6 + Math.random() * 10;
                envelopeParticles.push({
                    x: centerX + (Math.random() - 0.5) * 20,
                    y: centerY + (Math.random() - 0.5) * 20 - 10,
                    vx: Math.cos(angle) * speed * (0.4 + Math.random() * 0.6),
                    vy: Math.sin(angle) * speed * (0.4 + Math.random() * 0.6) - 60,
                    size: size,
                    life: 1,
                    decay: 0.008 + Math.random() * 0.015,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.15,
                    gravity: 100 + Math.random() * 60,
                    hue: 40 + Math.random() * 20, // 金色
                    lightness: 60 + Math.random() * 20,
                    type: 'coin'
                });
            }
        }
        function createSparkles(count = 50) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 30 + Math.random() * 250;
                sparkles.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius - 40,
                    size: 1.5 + Math.random() * 4,
                    life: 0.3 + Math.random() * 0.7,
                    decay: 0.008 + Math.random() * 0.02,
                    pulse: Math.random() * Math.PI * 2,
                    speed: 1 + Math.random() * 2.5,
                    hue: 40 + Math.random() * 30 // 金色系
                });
            }
        }
        function createFloatingTexts() {
            const texts = [];
            if (config.type === 'both' || config.type === 'coin') {
                texts.push({
                    text: `🧧 +${config.coinAmount} G`,
                    x: centerX - 70,
                    y: centerY - 30,
                    size: 34 + Math.random() * 12,
                    vx: -15 + Math.random() * 30,
                    vy: -140 - Math.random() * 80,
                    color: config.coinColor || '#FF2D2D',
                    shadow: '#FF6B35',
                    life: 1,
                    decay: 0.01,
                    rotation: -0.08 + Math.random() * 0.16,
                    rotSpeed: (Math.random() - 0.5) * 0.025,
                    type: 'coin',
                    glow: true
                });
            }
            if (config.type === 'both' || config.type === 'intimacy') {
                const msgs = [
                    '🎊 恭喜发财！',
                    '🧨 大吉大利！',
                    '💰 财源广进！',
                    '✨ 万事如意！',
                    '🏮 鸿运当头！',
                    '🎆 岁岁平安！',
                    '💎 好运连连！',
                    '🌈 心想事成！'
                ];
                const msg = msgs[Math.floor(Math.random() * msgs.length)];
                texts.push({
                    text: msg,
                    x: centerX + 70,
                    y: centerY - 30,
                    size: 28 + Math.random() * 10,
                    vx: -20 + Math.random() * 40,
                    vy: -150 - Math.random() * 60,
                    color: config.intimacyColor || '#FFD700',
                    shadow: '#FF6B00',
                    life: 1,
                    decay: 0.008,
                    rotation: -0.08 + Math.random() * 0.16,
                    rotSpeed: (Math.random() - 0.5) * 0.025,
                    type: 'intimacy',
                    glow: true
                });
            }
            return texts;
        }
        function drawEnvelope(x, y, size, rotation, alpha, scale, hue, lightness) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.scale(scale, scale);
            ctx.globalAlpha = alpha;
            const w = size;
            const h = size * 0.75;
            const r = 3;
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 1.8);
            glow.addColorStop(0, `hsla(${hue}, 100%, 70%, ${alpha * 0.2})`);
            glow.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, w * 1.8, 0, Math.PI * 2);
            ctx.fill();
            const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
            grad.addColorStop(0, `hsla(${hue + 10}, 95%, ${lightness + 15}%, ${alpha})`);
            grad.addColorStop(0.4, `hsla(${hue}, 90%, ${lightness}%, ${alpha})`);
            grad.addColorStop(0.7, `hsla(${hue - 5}, 90%, ${lightness - 10}%, ${alpha})`);
            grad.addColorStop(1, `hsla(${hue + 10}, 95%, ${lightness - 15}%, ${alpha})`);
            ctx.shadowColor = `hsla(${hue}, 100%, 50%, ${alpha * 0.4})`;
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.moveTo(-w / 2 + r, -h / 2);
            ctx.lineTo(w / 2 - r, -h / 2);
            ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
            ctx.lineTo(w / 2, h / 2 - r);
            ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
            ctx.lineTo(-w / 2 + r, h / 2);
            ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
            ctx.lineTo(-w / 2, -h / 2 + r);
            ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `hsla(45, 100%, 60%, ${alpha * 0.5})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-w / 2, -h / 2);
            ctx.lineTo(0, -h / 2 + h * 0.3);
            ctx.lineTo(w / 2, -h / 2);
            ctx.closePath();
            ctx.fillStyle = `hsla(45, 100%, 70%, ${alpha * 0.4})`;
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-w / 2, -h / 2 + h * 0.15);
            ctx.lineTo(w / 2, -h / 2 + h * 0.15);
            ctx.strokeStyle = `hsla(45, 100%, 65%, ${alpha * 0.3})`;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${w * 0.4}px Arial, "PingFang SC", sans-serif`;
            ctx.shadowColor = `rgba(0,0,0,${alpha * 0.2})`;
            ctx.shadowBlur = 8;
            ctx.fillStyle = `hsla(45, 100%, 85%, ${alpha * 0.9})`;
            ctx.fillText('福', 0, 2);
            ctx.shadowBlur = 0;
            ctx.font = `bold ${w * 0.15}px Arial, sans-serif`;
            ctx.fillStyle = `hsla(45, 100%, 80%, ${alpha * 0.5})`;
            ctx.fillText('¥', w * 0.2, h * 0.25);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            ctx.restore();
        }
        function drawCoin(x, y, size, hue, lightness, alpha, rotation) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.globalAlpha = alpha;
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.8);
            glow.addColorStop(0, `hsla(${hue}, 100%, 80%, ${alpha * 0.3})`);
            glow.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.8, 0, Math.PI * 2);
            ctx.fill();
            const grad = ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size);
            grad.addColorStop(0, `hsla(${hue + 10}, 90%, ${lightness + 20}%, ${alpha})`);
            grad.addColorStop(0.5, `hsla(${hue}, 90%, ${lightness}%, ${alpha})`);
            grad.addColorStop(1, `hsla(${hue - 10}, 90%, ${lightness - 20}%, ${alpha})`);
            ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${alpha * 0.5})`;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `hsla(${hue + 20}, 100%, 70%, ${alpha * 0.6})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.fillStyle = `hsla(${hue + 30}, 100%, 95%, ${alpha * 0.9})`;
            ctx.font = `bold ${size * 0.9}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('¥', 0, 1);
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        function drawSparkle(x, y, size, hue, alpha) {
            ctx.save();
            ctx.globalAlpha = alpha;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
            grad.addColorStop(0, `hsla(${hue}, 100%, 95%, ${alpha})`);
            grad.addColorStop(0.4, `hsla(${hue + 20}, 100%, 80%, ${alpha * 0.6})`);
            grad.addColorStop(1, `hsla(${hue + 40}, 100%, 60%, 0)`);
            ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${alpha * 0.3})`;
            ctx.shadowBlur = 15;
            ctx.fillStyle = grad;
            const half = size;
            ctx.beginPath();
            ctx.moveTo(x, y - half * 2);
            ctx.lineTo(x + half * 0.3, y - half * 0.3);
            ctx.lineTo(x + half * 2, y);
            ctx.lineTo(x + half * 0.3, y + half * 0.3);
            ctx.lineTo(x, y + half * 2);
            ctx.lineTo(x - half * 0.3, y + half * 0.3);
            ctx.lineTo(x - half * 2, y);
            ctx.lineTo(x - half * 0.3, y - half * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
            ctx.globalAlpha = 1;
        }
        function drawRing(cx, cy, radius, color, alpha, width) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.shadowColor = color;
            ctx.shadowBlur = 30;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
            ctx.globalAlpha = 1;
        }
        if (config.type === 'both' || config.type === 'coin') {
            createEnvelopeParticles();
            createMoneyParticles();
        }
        if (config.type === 'both' || config.type === 'intimacy') {
            createEnvelopeParticles();
            createMoneyParticles();
        }
        createSparkles(50);
        const floatTexts = createFloatingTexts();
        floatingTexts.push(...floatTexts);
        function animate() {
            const elapsed = (performance.now() - startTime) / 1000;
            const progress = Math.min(elapsed / (config.duration / 1000), 1);
            ctx.clearRect(0, 0, width, height);
            if (progress < 0.3) {
                const flashAlpha = (1 - progress / 0.3) * 0.25;
                const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 350);
                grd.addColorStop(0, `rgba(255, 200, 50, ${flashAlpha})`);
                grd.addColorStop(0.5, `rgba(255, 100, 50, ${flashAlpha * 0.5})`);
                grd.addColorStop(1, 'rgba(255, 50, 0, 0)');
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, width, height);
            }
            for (let i = 0; i < 4; i++) {
                const ringProgress = Math.max(0, (progress - i * 0.06) / (1 - i * 0.06));
                if (ringProgress > 0 && ringProgress < 1) {
                    const radius = 40 + ringProgress * 280;
                    const alpha = (1 - ringProgress) * 0.5;
                    const hue = 350 + i * 10;
                    drawRing(
                        centerX, centerY,
                        radius,
                        `hsla(${hue}, 100%, 70%, ${alpha})`,
                        alpha * 0.4,
                        2.5 - ringProgress * 1.8
                    );
                }
            }
            for (let i = 0; i < 3; i++) {
                const ringProgress = Math.max(0, (progress - 0.1 - i * 0.05) / (0.9 - i * 0.05));
                if (ringProgress > 0 && ringProgress < 1) {
                    const radius = 30 + ringProgress * 320;
                    const alpha = (1 - ringProgress) * 0.3;
                    drawRing(
                        centerX, centerY,
                        radius,
                        `hsla(45, 100%, 60%, ${alpha})`,
                        alpha * 0.3,
                        1.5 - ringProgress * 1.2
                    );
                }
            }
            envelopeParticles.forEach((p) => {
                p.x += p.vx * 0.016;
                p.y += p.vy * 0.016;
                p.vy += p.gravity * 0.016;
                p.vx *= 0.99;
                p.vy *= 0.99;
                p.life -= p.decay;
                p.rotation += p.rotSpeed;
                if (p.life <= 0) return;
                const alpha = p.life;
                const size = p.size * (0.5 + 0.5 * p.life);
                if (p.type === 'envelope') {
                    drawEnvelope(
                        p.x, p.y, size, p.rotation, alpha,
                        p.scale || 1, p.hue || 350, p.lightness || 55
                    );
                } else if (p.type === 'coin') {
                    drawCoin(p.x, p.y, size, p.hue || 45, p.lightness || 65, alpha, p.rotation);
                }
            });
            floatingTexts.forEach((ft) => {
                ft.x += ft.vx * 0.016;
                ft.y += ft.vy * 0.016;
                ft.vy -= 25 * 0.016;
                ft.vy *= 0.98;
                ft.life -= ft.decay;
                ft.rotation += ft.rotSpeed;
                if (ft.life <= 0) return;
                const alpha = Math.min(1, ft.life * 2) * (1 - (1 - ft.life) * 0.4);
                ctx.save();
                ctx.translate(ft.x, ft.y);
                ctx.rotate(ft.rotation);
                ctx.globalAlpha = alpha;
                ctx.shadowColor = ft.shadow;
                ctx.shadowBlur = 45;
                ctx.font = `bold ${ft.size}px Arial, "PingFang SC", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = ft.color;
                ctx.shadowBlur = 50;
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.fillText(ft.text, 0, 0);
                ctx.shadowBlur = 40;
                ctx.shadowColor = ft.shadow;
                ctx.fillText(ft.text, 0, 0);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
                ctx.restore();
            });
            sparkles.forEach((s) => {
                s.life -= s.decay;
                if (s.life <= 0) return;
                const alpha = s.life * (0.5 + 0.5 * Math.sin(elapsed * s.speed + s.pulse));
                drawSparkle(
                    s.x + Math.sin(elapsed * 0.4 + s.pulse) * 25,
                    s.y + Math.cos(elapsed * 0.6 + s.pulse * 1.2) * 20,
                    s.size * (0.5 + 0.5 * s.life),
                    s.hue,
                    alpha * 0.7
                );
            });
            if (progress < 0.4) {
                const glowAlpha = (1 - progress / 0.4) * 0.35;
                const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 180);
                grd.addColorStop(0, `rgba(255, 200, 50, ${glowAlpha * 0.8})`);
                grd.addColorStop(0.5, `rgba(255, 100, 50, ${glowAlpha * 0.3})`);
                grd.addColorStop(1, `rgba(255, 50, 0, 0)`);
                ctx.fillStyle = grd;
                ctx.fillRect(centerX - 180, centerY - 180, 360, 360);
            }
            const hasAliveParticles = envelopeParticles.some(p => p.life > 0);
            const hasAliveTexts = floatingTexts.some(ft => ft.life > 0);
            const hasAliveSparkles = sparkles.some(s => s.life > 0);
            if ((hasAliveParticles || hasAliveTexts || hasAliveSparkles) && progress < 1.5) {
                requestAnimationFrame(animate);
            } else {
                canvas.remove();
            }
        }

        animate();
    },
    loveup: function (container, options = {}) {
        const { canvas, ctx, width, height } = this.createCanvas(container);
        const centerX = width / 2;
        const centerY = height / 2;
        let startTime = performance.now();
        const config = Object.assign({
            type: 'both', // 'both' | 'coin' | 'intimacy'
            coinAmount: 100,
            intimacyAmount: 15,
            duration: 2500,
            coinColor: '#FFD700',
            intimacyColor: '#FF6B9D'
        }, options);
        const particles = [];
        const floatingTexts = [];
        const sparkles = [];
        function createCoinParticles() {
            const count = 40 + Math.floor(Math.random() * 30);
            const angleSpread = Math.PI * 0.8;
            const baseAngle = -Math.PI / 2 - angleSpread / 2;

            for (let i = 0; i < count; i++) {
                const angle = baseAngle + Math.random() * angleSpread;
                const speed = 150 + Math.random() * 350;
                const size = 12 + Math.random() * 16;
                const hue = 40 + Math.random() * 20; // 金色系
                particles.push({
                    x: centerX + (Math.random() - 0.5) * 30,
                    y: centerY + (Math.random() - 0.5) * 30,
                    vx: Math.cos(angle) * speed * (0.5 + Math.random() * 0.5),
                    vy: Math.sin(angle) * speed * (0.5 + Math.random() * 0.5) - 80,
                    size: size,
                    life: 1,
                    decay: 0.008 + Math.random() * 0.015,
                    hue: hue,
                    saturation: 85 + Math.random() * 15,
                    lightness: 55 + Math.random() * 25,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.15,
                    gravity: 120 + Math.random() * 60,
                    type: 'coin'
                });
            }
        }
        function createIntimacyParticles() {
            const count = 50 + Math.floor(Math.random() * 40);
            const angleSpread = Math.PI * 0.9;
            const baseAngle = -Math.PI / 2 - angleSpread / 2;

            for (let i = 0; i < count; i++) {
                const angle = baseAngle + Math.random() * angleSpread;
                const speed = 120 + Math.random() * 280;
                const size = 6 + Math.random() * 14;
                const hue = 330 + Math.random() * 30; // 粉色/红色系
                particles.push({
                    x: centerX + (Math.random() - 0.5) * 40,
                    y: centerY + (Math.random() - 0.5) * 40,
                    vx: Math.cos(angle) * speed * (0.3 + Math.random() * 0.7),
                    vy: Math.sin(angle) * speed * (0.3 + Math.random() * 0.7) - 100,
                    size: size,
                    life: 1,
                    decay: 0.006 + Math.random() * 0.012,
                    hue: hue,
                    saturation: 90 + Math.random() * 10,
                    lightness: 60 + Math.random() * 20,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.12,
                    gravity: 80 + Math.random() * 40,
                    type: 'heart'
                });
            }
        }
        function createSparkles(count = 30) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 30 + Math.random() * 200;
                sparkles.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius - 50,
                    size: 1.5 + Math.random() * 4,
                    life: 0.3 + Math.random() * 0.7,
                    decay: 0.01 + Math.random() * 0.025,
                    pulse: Math.random() * Math.PI * 2,
                    speed: 1 + Math.random() * 2,
                    hue: Math.random() * 360
                });
            }
        }
        function createFloatingTexts() {
            const texts = [];
            if (config.type === 'both' || config.type === 'coin') {
                texts.push({
                    text: `+${config.coinAmount} G`,
                    x: centerX - 60,
                    y: centerY - 20,
                    size: 36 + Math.random() * 12,
                    vx: -20 + Math.random() * 40,
                    vy: -120 - Math.random() * 80,
                    color: config.coinColor,
                    shadow: '#FFD700',
                    life: 1,
                    decay: 0.012,
                    rotation: -0.1 + Math.random() * 0.2,
                    rotSpeed: (Math.random() - 0.5) * 0.03,
                    type: 'coin'
                });
            }
            if (config.type === 'both' || config.type === 'intimacy') {
                texts.push({
                    text: `❤️ +${config.intimacyAmount}`,
                    x: centerX + 60,
                    y: centerY - 20,
                    size: 32 + Math.random() * 10,
                    vx: -30 + Math.random() * 60,
                    vy: -130 - Math.random() * 70,
                    color: config.intimacyColor,
                    shadow: '#FF6B9D',
                    life: 1,
                    decay: 0.01,
                    rotation: -0.1 + Math.random() * 0.2,
                    rotSpeed: (Math.random() - 0.5) * 0.03,
                    type: 'intimacy'
                });
            }
            return texts;
        }
        if (config.type === 'both' || config.type === 'coin') {
            createCoinParticles();
        }
        if (config.type === 'both' || config.type === 'intimacy') {
            createIntimacyParticles();
        }
        createSparkles(40);

        const floatTexts = createFloatingTexts();
        floatingTexts.push(...floatTexts);
        function drawCoin(x, y, size, hue, saturation, lightness, alpha, rotation) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.globalAlpha = alpha;
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.8);
            glow.addColorStop(0, `hsla(${hue}, 100%, 80%, ${alpha * 0.3})`);
            glow.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.8, 0, Math.PI * 2);
            ctx.fill();
            const grad = ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size);
            grad.addColorStop(0, `hsla(${hue + 10}, ${saturation}%, ${lightness + 20}%, ${alpha})`);
            grad.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
            grad.addColorStop(1, `hsla(${hue - 10}, ${saturation}%, ${lightness - 20}%, ${alpha})`);

            ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${alpha * 0.5})`;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `hsla(${hue + 20}, 100%, 70%, ${alpha * 0.6})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = `hsla(${hue + 30}, 100%, 95%, ${alpha * 0.9})`;
            ctx.font = `bold ${size * 1.1}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 2);

            ctx.restore();
            ctx.globalAlpha = 1;
        }
        function drawHeart(x, y, size, hue, saturation, lightness, alpha, rotation) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.globalAlpha = alpha;
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
            glow.addColorStop(0, `hsla(${hue}, 100%, 80%, ${alpha * 0.25})`);
            glow.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${alpha * 0.4})`;
            ctx.shadowBlur = 25;
            const s = size / 20;
            ctx.beginPath();
            ctx.moveTo(0, s * 6);
            ctx.bezierCurveTo(-s * 6, -s * 4, -s * 12, s * 2, 0, s * 14);
            ctx.bezierCurveTo(s * 12, s * 2, s * 6, -s * 4, 0, s * 6);
            ctx.closePath();

            const grad = ctx.createRadialGradient(-s * 3, -s * 3, 0, 0, 0, size);
            grad.addColorStop(0, `hsla(${hue + 10}, ${saturation}%, ${lightness + 25}%, ${alpha})`);
            grad.addColorStop(0.6, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
            grad.addColorStop(1, `hsla(${hue - 10}, ${saturation}%, ${lightness - 15}%, ${alpha})`);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(-s * 3, -s * 3, s * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
            ctx.fill();

            ctx.restore();
            ctx.globalAlpha = 1;
        }
        function drawSparkle(x, y, size, hue, alpha) {
            ctx.save();
            ctx.globalAlpha = alpha;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
            grad.addColorStop(0, `hsla(${hue}, 100%, 90%, ${alpha})`);
            grad.addColorStop(0.5, `hsla(${hue + 30}, 100%, 70%, ${alpha * 0.6})`);
            grad.addColorStop(1, `hsla(${hue + 60}, 100%, 50%, 0)`);

            ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${alpha * 0.3})`;
            ctx.shadowBlur = 15;
            ctx.fillStyle = grad;
            const half = size;
            ctx.beginPath();
            ctx.moveTo(x, y - half * 2);
            ctx.lineTo(x + half * 0.3, y - half * 0.3);
            ctx.lineTo(x + half * 2, y);
            ctx.lineTo(x + half * 0.3, y + half * 0.3);
            ctx.lineTo(x, y + half * 2);
            ctx.lineTo(x - half * 0.3, y + half * 0.3);
            ctx.lineTo(x - half * 2, y);
            ctx.lineTo(x - half * 0.3, y - half * 0.3);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();
            ctx.globalAlpha = 1;
        }
        function drawRing(cx, cy, radius, color, alpha, width) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.shadowColor = color;
            ctx.shadowBlur = 30;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
            ctx.globalAlpha = 1;
        }
        function animate() {
            const elapsed = (performance.now() - startTime) / 1000;
            const progress = Math.min(elapsed / (config.duration / 1000), 1);

            ctx.clearRect(0, 0, width, height);
            if (progress < 0.3) {
                const flashAlpha = (1 - progress / 0.3) * 0.2;
                const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 300);
                grd.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
                grd.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, width, height);
            }
            const ringCount = 3;
            for (let i = 0; i < ringCount; i++) {
                const ringProgress = Math.max(0, (progress - i * 0.08) / (1 - i * 0.08));
                if (ringProgress > 0 && ringProgress < 1) {
                    const radius = 50 + ringProgress * 250;
                    const alpha = (1 - ringProgress) * 0.6;
                    const hue = config.type === 'coin' ? 45 : 340 + i * 15;
                    drawRing(
                        centerX, centerY,
                        radius,
                        `hsla(${hue}, 100%, 70%, ${alpha})`,
                        alpha * 0.5,
                        2 - ringProgress * 1.5
                    );
                }
            }
            particles.forEach((p, idx) => {
                p.x += p.vx * 0.016;
                p.y += p.vy * 0.016;
                p.vy += p.gravity * 0.016;
                p.vx *= 0.99;
                p.vy *= 0.99;
                p.life -= p.decay;
                p.rotation += p.rotSpeed;

                if (p.life <= 0) return;

                const alpha = p.life;
                const size = p.size * (0.5 + 0.5 * p.life);

                if (p.type === 'coin') {
                    drawCoin(p.x, p.y, size, p.hue, p.saturation, p.lightness, alpha, p.rotation);
                } else if (p.type === 'heart') {
                    drawHeart(p.x, p.y, size, p.hue, p.saturation, p.lightness, alpha, p.rotation);
                }
            });
            floatingTexts.forEach((ft) => {
                ft.x += ft.vx * 0.016;
                ft.y += ft.vy * 0.016;
                ft.vy -= 30 * 0.016; // 轻缓上升
                ft.vy *= 0.98;
                ft.life -= ft.decay;
                ft.rotation += ft.rotSpeed;

                if (ft.life <= 0) return;

                const alpha = Math.min(1, ft.life * 2) * (1 - (1 - ft.life) * 0.5);
                ctx.save();
                ctx.translate(ft.x, ft.y);
                ctx.rotate(ft.rotation);
                ctx.globalAlpha = alpha;

                ctx.shadowColor = ft.shadow;
                ctx.shadowBlur = 30;
                ctx.font = `bold ${ft.size}px Arial, "PingFang SC", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowBlur = 40;
                ctx.shadowColor = ft.shadow;
                ctx.fillStyle = ft.color;
                ctx.fillText(ft.text, 0, 0);
                ctx.shadowBlur = 0;
                ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.3})`;
                ctx.lineWidth = 2;
                ctx.strokeText(ft.text, 0, 0);

                ctx.shadowBlur = 0;
                ctx.restore();
                ctx.globalAlpha = 1;
            });
            sparkles.forEach((s) => {
                s.life -= s.decay;
                if (s.life <= 0) return;
                const alpha = s.life * (0.5 + 0.5 * Math.sin(elapsed * s.speed + s.pulse));
                drawSparkle(s.x + Math.sin(elapsed * 0.5 + s.pulse) * 20,
                    s.y + Math.cos(elapsed * 0.7 + s.pulse * 1.3) * 15,
                    s.size * (0.5 + 0.5 * s.life),
                    s.hue, alpha * 0.7);
            });
            if (progress < 0.5) {
                const glowAlpha = (1 - progress / 0.5) * 0.3;
                const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 150);
                const color = config.type === 'coin' ? '255, 215, 0' : '255, 107, 157';
                grd.addColorStop(0, `rgba(${color}, ${glowAlpha * 0.8})`);
                grd.addColorStop(0.5, `rgba(${color}, ${glowAlpha * 0.3})`);
                grd.addColorStop(1, `rgba(${color}, 0)`);
                ctx.fillStyle = grd;
                ctx.fillRect(centerX - 150, centerY - 150, 300, 300);
            }
            const hasAliveParticles = particles.some(p => p.life > 0);
            const hasAliveTexts = floatingTexts.some(ft => ft.life > 0);
            const hasAliveSparkles = sparkles.some(s => s.life > 0);

            if ((hasAliveParticles || hasAliveTexts || hasAliveSparkles) && progress < 1.5) {
                requestAnimationFrame(animate);
            } else {
                canvas.remove();
            }
        }
        animate();
    },
    hearts: function (container) {
        const { canvas, ctx, width, height } = this.createCanvas(container);
        const particles = [];
        const count = 120;
        const centerX = width / 2;
        const centerY = height / 2;
        const heartX = (t) => 16 * Math.pow(Math.sin(t), 3);
        const heartY = (t) => -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        for (let i = 0; i < count; i++) {
            const t = Math.random() * Math.PI * 2;
            const scale = 6 + Math.random() * 8;
            const x = centerX + heartX(t) * scale;
            const y = centerY + heartY(t) * scale;
            const angle = Math.atan2(centerY - y, centerX - x) + (Math.random() - 0.5) * 0.8;
            const speed = 200 + Math.random() * 400;
            const size = 4 + Math.random() * 12;
            const hue = 340 + Math.random() * 30;
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                size,
                life: 1,
                decay: 0.006 + Math.random() * 0.01,
                hue,
                saturation: 90 + Math.random() * 10,
                lightness: 55 + Math.random() * 25,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.1,
                trail: []
            });
        }
        const rings = [];
        for (let r = 0; r < 3; r++) {
            rings.push({
                radius: 20 + r * 30,
                maxRadius: 300 + r * 80,
                speed: 150 + r * 50,
                life: 1,
                width: 4 - r * 0.8,
                hue: 340 + r * 10,
                delay: r * 0.15
            });
        }

        let startTime = performance.now();
        const duration = 3000;

        function animate() {
            const elapsed = (performance.now() - startTime) / 1000;
            const progress = elapsed / (duration / 1000);

            ctx.clearRect(0, 0, width, height);
            rings.forEach((ring) => {
                if (ring.life <= 0) return;
                const p = Math.min((elapsed - ring.delay) * 0.8, 1);
                if (p < 0) return;
                const radius = ring.radius + p * ring.maxRadius;
                const alpha = (1 - p) * 0.8;
                ring.life = 1 - p;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${ring.hue}, 100%, 70%, ${alpha})`;
                ctx.lineWidth = ring.width * (1 - p * 0.5);
                ctx.shadowColor = `hsla(${ring.hue}, 100%, 70%, ${alpha * 0.5})`;
                ctx.shadowBlur = 30;
                ctx.stroke();
                ctx.shadowBlur = 0;
            });
            particles.forEach((p) => {
                p.x += p.vx * 0.016;
                p.y += p.vy * 0.016;
                p.vy += 98 * 0.016; // 重力
                p.vx *= 0.99;
                p.vy *= 0.99;
                p.rotation += p.rotSpeed;
                p.life -= p.decay;
                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > 8) p.trail.shift();

                if (p.life <= 0) return;

                const alpha = p.life;
                const size = p.size * (0.5 + 0.5 * p.life);
                p.trail.forEach((pos, idx) => {
                    const tAlpha = (idx / p.trail.length) * alpha * 0.4;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, size * (idx / p.trail.length) * 0.6, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${tAlpha})`;
                    ctx.fill();
                });
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
                gradient.addColorStop(0, `hsla(${p.hue}, 100%, 90%, ${alpha})`);
                gradient.addColorStop(0.3, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${alpha * 0.9})`);
                gradient.addColorStop(1, `hsla(${p.hue + 20}, 100%, 50%, 0)`);
                ctx.fillStyle = gradient;
                ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, ${alpha * 0.6})`;
                ctx.shadowBlur = 25;
                if (p.size > 7) {
                    const spikes = 5;
                    const outerRadius = size;
                    const innerRadius = size * 0.4;
                    ctx.beginPath();
                    for (let i = 0; i < spikes * 2; i++) {
                        const r = i % 2 === 0 ? outerRadius : innerRadius;
                        const theta = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
                        if (i === 0) ctx.moveTo(Math.cos(theta) * r, Math.sin(theta) * r);
                        else ctx.lineTo(Math.cos(theta) * r, Math.sin(theta) * r);
                    }
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            });
            const glowAlpha = Math.max(0, 1 - progress * 2);
            if (glowAlpha > 0) {
                const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200);
                grd.addColorStop(0, `rgba(255, 100, 150, ${glowAlpha * 0.4})`);
                grd.addColorStop(0.5, `rgba(255, 50, 100, ${glowAlpha * 0.2})`);
                grd.addColorStop(1, 'rgba(255,0,0,0)');
                ctx.fillStyle = grd;
                ctx.fillRect(centerX - 200, centerY - 200, 400, 400);
            }
            const alive = particles.some(p => p.life > 0) || rings.some(r => r.life > 0);
            if (alive && elapsed < 5) {
                requestAnimationFrame(animate);
            } else {
                canvas.remove();
            }
        }
        animate();
    },
    sparkle: function (container) {
        const { canvas, ctx, width, height } = this.createCanvas(container);
        const centerX = width / 2;
        const centerY = height / 2;
        let startTime = performance.now();
        const diamond = {
            x: centerX,
            y: centerY - 30,
            size: 60,
            rotation: 0,
            facets: [
                { points: [[0, -1], [0.3, -0.6], [0, -0.3], [-0.3, -0.6]], color: '#E8F4FD' },
                { points: [[0.3, -0.6], [0.6, -0.3], [0.3, 0], [0, -0.3]], color: '#D4E8F7' },
                { points: [[0.6, -0.3], [0.8, 0], [0.6, 0.3], [0.3, 0]], color: '#C0DCF0' },
                { points: [[0.8, 0], [0.6, 0.3], [0.3, 0.3], [0.6, 0.6]], color: '#A8CCE8' },
                { points: [[0.3, 0.3], [0, 0.6], [-0.3, 0.3], [0, 0]], color: '#B8D4EA' },
                { points: [[-0.3, 0.3], [-0.6, 0.6], [-0.8, 0.3], [-0.3, 0]], color: '#C8DCF0' },
                { points: [[-0.8, 0.3], [-0.6, 0], [-0.8, -0.3], [-0.6, -0.6]], color: '#D8E8F5' },
                { points: [[-0.6, -0.6], [-0.3, -0.6], [0, -0.3], [-0.3, 0]], color: '#E4F0F8' },
            ],
            pavilions: [
                { points: [[0, 0.3], [0.3, 0.6], [0, 1]], color: '#7AB8D4' },
                { points: [[0.3, 0.6], [0.6, 0.6], [0.3, 1]], color: '#6AA8C4' },
                { points: [[0.6, 0.6], [0.3, 0.3], [0.6, 0.3]], color: '#5A9CB8' },
                { points: [[0, 0.3], [0.3, 0.3], [0, 1]], color: '#8AC8E0' },
                { points: [[-0.3, 0.3], [0, 0.3], [-0.3, 1]], color: '#7AB8D4' },
                { points: [[-0.6, 0.6], [-0.3, 0.6], [-0.3, 1]], color: '#6AA8C4' },
                { points: [[-0.6, 0.3], [-0.3, 0.3], [-0.6, 0.6]], color: '#5A9CB8' },
            ]
        };
        const lightRays = [];
        const RAY_COUNT = 36;
        for (let i = 0; i < RAY_COUNT; i++) {
            const angle = (i / RAY_COUNT) * Math.PI * 2;
            lightRays.push({
                angle: angle,
                length: 60 + Math.random() * 100,
                width: 1 + Math.random() * 3,
                speed: 0.3 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2,
                hue: 200 + Math.random() * 40, // 蓝白光芒
                intensity: 0.3 + Math.random() * 0.5
            });
        }
        const sparkles = [];
        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 180;
            sparkles.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius - 20,
                size: 1 + Math.random() * 4,
                speed: 0.5 + Math.random() * 2,
                phase: Math.random() * Math.PI * 2,
                hue: 190 + Math.random() * 50,
                life: 0.5 + Math.random() * 0.5,
                pulseSpeed: 1 + Math.random() * 2
            });
        }
        const fireColors = [
            { hue: 0, sat: 90, light: 70 },    // 红
            { hue: 30, sat: 100, light: 70 },  // 橙
            { hue: 60, sat: 100, light: 70 },  // 黄
            { hue: 120, sat: 90, light: 65 },  // 绿
            { hue: 200, sat: 90, light: 75 },  // 蓝
            { hue: 270, sat: 80, light: 75 },  // 紫
        ];
        function drawDiamond(rot, scale = 1) {
            const s = diamond.size * scale;

            ctx.save();
            ctx.translate(diamond.x, diamond.y);
            ctx.rotate(rot);
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.5);
            glow.addColorStop(0, 'rgba(200, 230, 255, 0.15)');
            glow.addColorStop(0.3, 'rgba(180, 220, 255, 0.08)');
            glow.addColorStop(1, 'rgba(150, 200, 255, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, s * 2.5, 0, Math.PI * 2);
            ctx.fill();
            diamond.facets.forEach(f => {
                ctx.beginPath();
                f.points.forEach((p, idx) => {
                    const x = p[0] * s;
                    const y = p[1] * s;
                    if (idx === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.closePath();
                const grad = ctx.createRadialGradient(0, -s * 0.3, 0, 0, 0, s);
                grad.addColorStop(0, '#FFFFFF');
                grad.addColorStop(0.5, f.color);
                grad.addColorStop(1, f.color);
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            });
            diamond.pavilions.forEach(p => {
                ctx.beginPath();
                p.points.forEach((pt, idx) => {
                    const x = pt[0] * s;
                    const y = pt[1] * s;
                    if (idx === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.closePath();
                ctx.fillStyle = p.color;
                ctx.fill();
            });
            const highlight = ctx.createRadialGradient(0, -s * 0.5, 0, 0, -s * 0.5, s * 0.4);
            highlight.addColorStop(0, 'rgba(255,255,255,0.9)');
            highlight.addColorStop(0.5, 'rgba(255,255,255,0.3)');
            highlight.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = highlight;
            ctx.beginPath();
            ctx.arc(0, -s * 0.5, s * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
        function drawLightRays(elapsed) {
            lightRays.forEach((ray, idx) => {
                const currentAngle = ray.angle + elapsed * ray.speed * 0.2;
                const pulse = 0.6 + 0.4 * Math.sin(elapsed * 1.2 + ray.phase);
                const len = ray.length * pulse;
                const alpha = 0.15 + 0.25 * pulse;

                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(currentAngle);
                const grad = ctx.createLinearGradient(0, 0, 0, len);
                grad.addColorStop(0, `hsla(${ray.hue}, 100%, 90%, ${alpha * 0.8})`);
                grad.addColorStop(0.3, `hsla(${ray.hue + 20}, 100%, 80%, ${alpha * 0.6})`);
                grad.addColorStop(1, `hsla(${ray.hue + 40}, 100%, 70%, 0)`);

                ctx.fillStyle = grad;
                ctx.shadowColor = `hsla(${ray.hue}, 100%, 80%, ${alpha * 0.3})`;
                ctx.shadowBlur = 20;
                const width = ray.width * (0.5 + 0.5 * pulse);
                ctx.beginPath();
                ctx.moveTo(-width, 0);
                ctx.lineTo(-width * 0.3, len);
                ctx.lineTo(width * 0.3, len);
                ctx.lineTo(width, 0);
                ctx.closePath();
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.restore();
            });
        }
        function drawSparkles(elapsed) {
            sparkles.forEach(s => {
                const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(elapsed * s.pulseSpeed + s.phase));
                const size = s.size * (0.6 + 0.4 * Math.sin(elapsed * s.speed + s.phase));
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.globalAlpha = alpha * s.life;
                const len = size * 3;
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
                grad.addColorStop(0, `hsla(${s.hue}, 100%, 95%, ${alpha})`);
                grad.addColorStop(0.5, `hsla(${s.hue}, 90%, 80%, ${alpha * 0.5})`);
                grad.addColorStop(1, `hsla(${s.hue}, 80%, 70%, 0)`);

                ctx.fillStyle = grad;
                ctx.shadowColor = `hsla(${s.hue}, 100%, 80%, ${alpha * 0.3})`;
                ctx.shadowBlur = 15;
                ctx.fillRect(-1, -len, 2, len * 2);
                ctx.fillRect(-len, -1, len * 2, 2);
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${s.hue}, 100%, 100%, ${alpha})`;
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
                ctx.restore();
            });
        }
        function drawFire(elapsed) {
            fireColors.forEach((fc, idx) => {
                const angle = elapsed * 0.3 + idx * (Math.PI * 2 / fireColors.length);
                const radius = 40 + 20 * Math.sin(elapsed * 0.5 + idx * 0.8);
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius - 20;
                const size = 8 + 4 * Math.sin(elapsed * 0.7 + idx * 1.2);
                const alpha = 0.3 + 0.3 * Math.sin(elapsed * 0.6 + idx * 0.5);

                ctx.save();
                ctx.globalAlpha = alpha;

                const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
                grad.addColorStop(0, `hsla(${fc.hue}, ${fc.sat}%, ${fc.light + 20}%, ${alpha})`);
                grad.addColorStop(0.5, `hsla(${fc.hue}, ${fc.sat}%, ${fc.light}%, ${alpha * 0.5})`);
                grad.addColorStop(1, `hsla(${fc.hue}, ${fc.sat}%, ${fc.light}%, 0)`);

                ctx.fillStyle = grad;
                ctx.shadowColor = `hsla(${fc.hue}, 100%, 70%, ${alpha * 0.3})`;
                ctx.shadowBlur = 30;
                ctx.beginPath();
                ctx.arc(x, y, size * 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
                ctx.restore();
            });
        }
        function animate() {
            const elapsed = (performance.now() - startTime) / 1000;

            ctx.clearRect(0, 0, width, height);
            const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 500);
            bgGrad.addColorStop(0, '#0a0e1a');
            bgGrad.addColorStop(0.5, '#060810');
            bgGrad.addColorStop(1, '#020304');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);
            drawLightRays(elapsed);
            drawFire(elapsed);
            const rot = Math.sin(elapsed * 0.3) * 0.08;
            drawDiamond(rot, 1);
            const glowPulse = 0.8 + 0.2 * Math.sin(elapsed * 1.5);
            const glowGrad = ctx.createRadialGradient(centerX, centerY - 20, 0, centerX, centerY - 20, 80 * glowPulse);
            glowGrad.addColorStop(0, `rgba(200, 230, 255, ${0.08 * glowPulse})`);
            glowGrad.addColorStop(0.5, `rgba(180, 220, 255, ${0.04 * glowPulse})`);
            glowGrad.addColorStop(1, 'rgba(150, 200, 255, 0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(centerX, centerY - 20, 80 * glowPulse, 0, Math.PI * 2);
            ctx.fill();
            drawSparkles(elapsed);
            if (elapsed < 5) {
                requestAnimationFrame(animate);
            } else {
                let fadeStart = performance.now();
                function fadeOut() {
                    const fadeElapsed = (performance.now() - fadeStart) / 1000;
                    if (fadeElapsed < 0.5) {
                        ctx.clearRect(0, 0, width, height);
                        const alpha = 1 - fadeElapsed / 0.5;
                        ctx.globalAlpha = alpha;
                        drawLightRays(elapsed + fadeElapsed);
                        drawFire(elapsed + fadeElapsed);
                        drawDiamond(Math.sin((elapsed + fadeElapsed) * 0.3) * 0.08, 1);
                        drawSparkles(elapsed + fadeElapsed);
                        ctx.globalAlpha = 1;
                        requestAnimationFrame(fadeOut);
                    } else {
                        canvas.remove();
                    }
                }
                fadeOut();
            }
        }

        animate();
    },
    cake: function (container) {
        const { canvas, ctx, width, height } = this.createCanvas(container);
        const centerX = width / 2;
        const particles = [];
        const ribbons = [];
        const sprinkles = [];
        const floatingHearts = [];
        let startTime = performance.now();
        let audio = null;
        try {
            audio = new Audio('/ast/music/birthday.mp3');
            audio.loop = false;
            audio.volume = options.volume || 0.8;
            audio.load();
            audio.play().catch(() => { });
        } catch (e) {
            console.warn('音频加载失败:', e);
        }
        const layers = [
            { height: 55, color: '#3498DB', light: '#5DADE2', dark: '#2471A3', flavor: '🫐' },
            { height: 48, color: '#2ECC71', light: '#58D68D', dark: '#1E8449', flavor: '🍵' },
            { height: 45, color: '#8E44AD', light: '#BB6BD9', dark: '#6C3483', flavor: '🍫' },
            { height: 40, color: '#F39C12', light: '#F7C948', dark: '#D68910', flavor: '🧁' },
            { height: 35, color: '#E8485B', light: '#FF6B7A', dark: '#C0392B', flavor: '🍓' },
        ];
        const totalHeight = layers.reduce((sum, l) => sum + l.height, 0);
        const cakeHeight = layers.reduce((sum, l) => sum + l.height, 0);
        const candleTotalHeight = 45 + 20;
        const totalVisualHeight = cakeHeight + candleTotalHeight;
        const centerY = height / 2 - totalVisualHeight / 2 + cakeHeight - 100;
        let currentY = 0;
        layers.forEach((layer, idx) => {
            layer.y = totalHeight - currentY - layer.height;
            currentY += layer.height;
            layer.width = 155 - idx * 13;
        });
        const creamDots = [];
        layers.forEach((layer, idx) => {
            const count = 6 + (layers.length - 1 - idx) * 2;
            const w = layer.width;
            const xStart = centerX - w / 2;
            for (let i = 0; i < count; i++) {
                creamDots.push({
                    x: xStart + 10 + (i / (count - 1 || 1)) * (w - 20) + (Math.random() - 0.5) * 6,
                    y: centerY + layer.y + layer.height - 3,
                    size: 3 + Math.random() * 4,
                    color: `hsl(40, 80%, ${85 + Math.random() * 10}%)`,
                    pulse: Math.random() * Math.PI * 2
                });
            }
        });
        for (let i = 0; i < 60; i++) {
            const layer = layers[Math.floor(Math.random() * layers.length)];
            const w = layer.width;
            const xStart = centerX - w / 2;
            sprinkles.push({
                x: xStart + 10 + Math.random() * (w - 20),
                y: centerY + layer.y + 10 + Math.random() * (layer.height - 20),
                size: 2 + Math.random() * 3,
                color: `hsl(${Math.random() * 360}, 80%, 60%)`,
                shape: Math.random() > 0.5 ? 'circle' : 'rect',
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.02,
            });
        }
        for (let i = 0; i < 80; i++) {
            const hue = Math.random() * 360;
            ribbons.push({
                x: Math.random() * width,
                y: -50 - Math.random() * 300,
                vx: (Math.random() - 0.5) * 80,
                vy: 60 + Math.random() * 100,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.12,
                width: 4 + Math.random() * 10,
                height: 2 + Math.random() * 5,
                color: `hsl(${hue}, 85%, 60%)`,
                life: 0.6 + Math.random() * 0.4,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 1.5 + Math.random() * 3,
                sinOffset: Math.random() * 100,
                sinSpeed: 1 + Math.random() * 2
            });
        }
        for (let i = 0; i < 15; i++) {
            floatingHearts.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 12 + Math.random() * 20,
                vx: (Math.random() - 0.5) * 20,
                vy: -15 - Math.random() * 25,
                hue: 330 + Math.random() * 30,
                life: 0.5 + Math.random() * 0.5,
                delay: Math.random() * 3,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 1 + Math.random() * 2,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: 1 + Math.random() * 1.5
            });
        }
        const bgStars = [];
        for (let i = 0; i < 40; i++) {
            bgStars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 0.5 + Math.random() * 1.5,
                twinkle: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 1.5
            });
        }
        function drawCakeLayer(yOffset, height, color, lightColor, darkColor, layerIndex, flavor, layerWidth) {
            const w = layerWidth || (155 - layerIndex * 13);
            const x = centerX - w / 2;
            const y = centerY + yOffset;
            const r = Math.max(3, 10 - (layers.length - 1 - layerIndex) * 0.8);

            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 5;

            const grad = ctx.createLinearGradient(x, y, x + w, y);
            grad.addColorStop(0, darkColor);
            grad.addColorStop(0.2, color);
            grad.addColorStop(0.5, lightColor);
            grad.addColorStop(0.8, color);
            grad.addColorStop(1, darkColor);

            ctx.fillStyle = grad;
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 3;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + height - r);
            ctx.quadraticCurveTo(x + w, y + height, x + w - r, y + height);
            ctx.lineTo(x + r, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.strokeStyle = `rgba(255,255,255,0.12)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + r + 5, y + 3);
            ctx.lineTo(x + w - r - 5, y + 3);
            ctx.stroke();
            for (let i = 0; i < 10; i++) {
                const tx = x + 12 + i * 10 + Math.sin(i * 1.5) * 3;
                const ty = y + 8 + Math.random() * (height - 16);
                ctx.fillStyle = `rgba(255,255,255,0.05)`;
                ctx.beginPath();
                ctx.arc(tx, ty, 2 + Math.random() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            for (let i = 0; i < 10; i++) {
                const wx = x + 8 + (i / 9) * (w - 16);
                const wy = y + height - 3 + Math.sin(i * 0.8 + layerIndex) * 2;
                const size = 3 + Math.sin(i * 0.5 + layerIndex * 0.7) * 2;
                ctx.fillStyle = `rgba(255,255,240,${0.25 + Math.sin(i * 0.7 + layerIndex) * 0.12})`;
                ctx.beginPath();
                ctx.arc(wx, wy, size, 0, Math.PI * 2);
                ctx.fill();
            }
            const shineGrad = ctx.createLinearGradient(x + w * 0.1, y, x + w * 0.3, y);
            shineGrad.addColorStop(0, 'rgba(255,255,255,0)');
            shineGrad.addColorStop(0.5, `rgba(255,255,255,${0.06 + (layers.length - 1 - layerIndex) * 0.01})`);
            shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = shineGrad;
            ctx.fillRect(x + w * 0.1, y + 2, w * 0.2, height - 4);

            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
        }
        function drawCandle(elapsed) {
            const topLayer = layers[layers.length - 1];
            const cakeTopY = centerY + topLayer.y;
            const cx = centerX;
            const cy = cakeTopY;
            const candleHeight = 45;
            const candleWidth = 10;

            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 5;

            const candleGrad = ctx.createLinearGradient(cx - candleWidth, cy - candleHeight, cx + candleWidth, cy - candleHeight);
            candleGrad.addColorStop(0, '#FF6B6B');
            candleGrad.addColorStop(0.3, '#FF9A9A');
            candleGrad.addColorStop(0.5, '#FFD0D0');
            candleGrad.addColorStop(0.7, '#FF9A9A');
            candleGrad.addColorStop(1, '#E85555');
            ctx.fillStyle = candleGrad;
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 4;

            const r = 4;
            ctx.beginPath();
            ctx.moveTo(cx - candleWidth + r, cy - candleHeight);
            ctx.lineTo(cx + candleWidth - r, cy - candleHeight);
            ctx.quadraticCurveTo(cx + candleWidth, cy - candleHeight, cx + candleWidth, cy - candleHeight + r);
            ctx.lineTo(cx + candleWidth, cy - r);
            ctx.quadraticCurveTo(cx + candleWidth, cy, cx + candleWidth - r, cy);
            ctx.lineTo(cx - candleWidth + r, cy);
            ctx.quadraticCurveTo(cx - candleWidth, cy, cx - candleWidth, cy - r);
            ctx.lineTo(cx - candleWidth, cy - candleHeight + r);
            ctx.quadraticCurveTo(cx - candleWidth, cy - candleHeight, cx - candleWidth + r, cy - candleHeight);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
            for (let i = 0; i < 6; i++) {
                const sy = cy - candleHeight + 6 + i * 7;
                ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.sin(i * 1.2) * 0.05})`;
                ctx.fillRect(cx - candleWidth + 2, sy, candleWidth * 2 - 4, 2);
            }

            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#2C1810';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy - candleHeight);
            ctx.quadraticCurveTo(cx + 1, cy - candleHeight - 5, cx + 0.5, cy - candleHeight - 8);
            ctx.stroke();
            const flicker = 0.85 + 0.15 * Math.sin(elapsed * 8);
            const flicker2 = 0.9 + 0.1 * Math.sin(elapsed * 12 + 1.3);
            const flicker3 = 0.95 + 0.05 * Math.sin(elapsed * 5 + 0.7);

            ctx.shadowColor = 'rgba(255,200,50,0.6)';
            ctx.shadowBlur = 60;

            const flameX = cx + Math.sin(elapsed * 6) * 1.5;
            const flameY = cy - candleHeight - 8;
            const outerGrad = ctx.createRadialGradient(
                flameX, flameY - 4 * flicker2, 0,
                flameX, flameY - 4 * flicker2, 22 * flicker * flicker3
            );
            outerGrad.addColorStop(0, 'rgba(255,255,220,0.9)');
            outerGrad.addColorStop(0.2, 'rgba(255,220,80,0.8)');
            outerGrad.addColorStop(0.5, 'rgba(255,160,30,0.6)');
            outerGrad.addColorStop(0.8, 'rgba(255,80,10,0.3)');
            outerGrad.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.fillStyle = outerGrad;
            ctx.beginPath();
            ctx.ellipse(flameX, flameY - 4 * flicker2, 14 * flicker, 22 * flicker2 * flicker3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 30;
            ctx.shadowColor = 'rgba(255,255,200,0.4)';
            const innerGrad = ctx.createRadialGradient(
                flameX, flameY - 6 * flicker2, 0,
                flameX, flameY - 6 * flicker2, 10 * flicker * flicker3
            );
            innerGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
            innerGrad.addColorStop(0.4, 'rgba(255,255,200,0.8)');
            innerGrad.addColorStop(0.8, 'rgba(255,200,100,0.4)');
            innerGrad.addColorStop(1, 'rgba(255,150,50,0)');
            ctx.fillStyle = innerGrad;
            ctx.beginPath();
            ctx.ellipse(flameX, flameY - 6 * flicker2, 7 * flicker, 12 * flicker2 * flicker3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(255,255,255,0.3)';
            const tipGrad = ctx.createRadialGradient(
                flameX, flameY - 12 * flicker2, 0,
                flameX, flameY - 12 * flicker2, 4 * flicker
            );
            tipGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
            tipGrad.addColorStop(1, 'rgba(255,255,200,0)');
            ctx.fillStyle = tipGrad;
            ctx.beginPath();
            ctx.arc(flameX, flameY - 12 * flicker2, 4 * flicker, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        function drawCreamDots(elapsed) {
            creamDots.forEach(d => {
                const pulse = 0.8 + 0.2 * Math.sin(elapsed * 1.5 + d.pulse);
                const size = d.size * pulse;
                ctx.shadowColor = 'rgba(255,200,150,0.2)';
                ctx.shadowBlur = 10;
                ctx.fillStyle = d.color;
                ctx.beginPath();
                ctx.arc(d.x, d.y, size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath();
                ctx.arc(d.x - size * 0.2, d.y - size * 0.2, size * 0.3, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.shadowBlur = 0;
        }
        function drawSprinkles() {
            sprinkles.forEach(s => {
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.rotation);
                ctx.shadowColor = 'rgba(0,0,0,0.1)';
                ctx.shadowBlur = 5;
                if (s.shape === 'circle') {
                    ctx.fillStyle = s.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, s.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.beginPath();
                    ctx.arc(-s.size * 0.2, -s.size * 0.2, s.size * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = s.color;
                    ctx.fillRect(-s.size, -s.size * 0.4, s.size * 2, s.size * 0.8);
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.fillRect(-s.size * 0.5, -s.size * 0.35, s.size * 0.4, s.size * 0.3);
                }
                ctx.shadowBlur = 0;
                ctx.restore();
            });
        }
        function drawHeart(x, y, size, hue, alpha, rotation) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation || 0);
            ctx.globalAlpha = alpha;
            ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${alpha * 0.4})`;
            ctx.shadowBlur = 25;

            const s = size / 20;
            ctx.beginPath();
            ctx.moveTo(0, s * 6);
            ctx.bezierCurveTo(-s * 6, -s * 4, -s * 12, s * 2, 0, s * 14);
            ctx.bezierCurveTo(s * 12, s * 2, s * 6, -s * 4, 0, s * 6);
            ctx.closePath();

            const grad = ctx.createRadialGradient(-s * 3, -s * 3, 0, 0, 0, size);
            grad.addColorStop(0, `hsla(${hue + 10}, 90%, 75%, ${alpha})`);
            grad.addColorStop(0.6, `hsla(${hue}, 85%, 60%, ${alpha})`);
            grad.addColorStop(1, `hsla(${hue - 10}, 85%, 45%, ${alpha})`);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(-s * 3, -s * 2, s * 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.restore();
        }
        let animationStarted = false;
        function animate() {
            const elapsed = (performance.now() - startTime) / 1000;
            if (!animationStarted && elapsed > 0.1) {
                animationStarted = true;
                if (audio) {
                    audio.currentTime = 0;
                    audio.play().catch(() => {
                    });
                }
            }
            ctx.clearRect(0, 0, width, height);
            const bgGrad = ctx.createRadialGradient(centerX, centerY - 50, 0, centerX, centerY - 50, 500);
            bgGrad.addColorStop(0, '#1a0a2e');
            bgGrad.addColorStop(0.3, '#16213e');
            bgGrad.addColorStop(0.6, '#0f0c29');
            bgGrad.addColorStop(1, '#050510');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);
            bgStars.forEach(s => {
                s.twinkle += 0.02 * s.speed;
                const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.twinkle));
                ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            });
            const glowPulse = 0.8 + 0.2 * Math.sin(elapsed * 0.5);
            const glowGrad = ctx.createRadialGradient(centerX, centerY - 50, 0, centerX, centerY - 50, 300 * glowPulse);
            glowGrad.addColorStop(0, `rgba(255,200,150,${0.04 * glowPulse})`);
            glowGrad.addColorStop(0.5, `rgba(255,150,200,${0.02 * glowPulse})`);
            glowGrad.addColorStop(1, 'rgba(255,100,150,0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, 0, width, height);
            ribbons.forEach((r) => {
                r.x += r.vx * 0.016 + Math.sin(elapsed * r.wobbleSpeed + r.wobble) * 30 * 0.016;
                r.y += r.vy * 0.016;
                r.rotation += r.rotSpeed;
                r.vy += 15 * 0.016;

                if (r.y > height + 50) {
                    r.y = -50 - Math.random() * 100;
                    r.x = Math.random() * width;
                    r.vy = 60 + Math.random() * 100;
                    r.life = 0.6 + Math.random() * 0.4;
                }

                const alpha = r.life * (0.7 + 0.3 * Math.sin(elapsed * r.sinSpeed + r.sinOffset));
                ctx.save();
                ctx.translate(r.x, r.y);
                ctx.rotate(r.rotation);
                ctx.globalAlpha = alpha * 0.6;
                const grad = ctx.createLinearGradient(-r.width / 2, 0, r.width / 2, 0);
                grad.addColorStop(0, r.color);
                grad.addColorStop(0.5, r.color);
                grad.addColorStop(1, r.color);
                ctx.fillStyle = grad;
                ctx.shadowColor = r.color;
                ctx.shadowBlur = 8;
                const tailLen = r.width * 0.8;
                ctx.beginPath();
                ctx.moveTo(-r.width / 2, -r.height / 2);
                ctx.quadraticCurveTo(-r.width / 2 - tailLen, 0, -r.width / 2, r.height / 2);
                ctx.lineTo(r.width / 2, r.height / 2);
                ctx.quadraticCurveTo(r.width / 2 + tailLen * 0.3, 0, r.width / 2, -r.height / 2);
                ctx.closePath();
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
                ctx.restore();
            });
            ctx.save();
            const sway = Math.sin(elapsed * 0.3) * 0.5;
            ctx.translate(sway, 0);
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetX = 10;
            ctx.shadowOffsetY = 20;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + totalHeight + 20, 80, 15, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            layers.forEach((layer, idx) => {
                drawCakeLayer(layer.y, layer.height, layer.color, layer.light, layer.dark, idx, layer.flavor, layer.width);
            });

            drawCreamDots(elapsed);
            drawSprinkles();
            drawCandle(elapsed);
            ctx.restore();
            floatingHearts.forEach((h) => {
                if (h.delay > elapsed) return;
                const life = Math.min(1, (elapsed - h.delay) / 0.8);
                h.x += h.vx * 0.016 + Math.sin(elapsed * h.wobbleSpeed + h.wobble) * 15 * 0.016;
                h.y += h.vy * 0.016;
                h.vy -= 8 * 0.016;
                h.vy *= 0.98;

                const alpha = life * h.life * (0.7 + 0.3 * Math.sin(elapsed * h.pulseSpeed + h.pulse));
                const size = h.size * (0.8 + 0.2 * Math.sin(elapsed * h.pulseSpeed * 0.7 + h.pulse));

                if (h.y < -50) {
                    h.y = height + 30;
                    h.x = Math.random() * width;
                    h.vy = -15 - Math.random() * 25;
                    h.delay = elapsed + Math.random() * 1;
                }

                drawHeart(h.x, h.y, size, h.hue, alpha * 0.7, Math.sin(elapsed * 0.5 + h.wobble) * 0.1);
            });
            if (Math.random() < 0.3) {
                const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
                const speed = 30 + Math.random() * 60;
                particles.push({
                    x: centerX + (Math.random() - 0.5) * 6,
                    y: centerY - 70 + (Math.random() - 0.5) * 10,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 20,
                    size: 1 + Math.random() * 2.5,
                    life: 0.5 + Math.random() * 0.5,
                    decay: 0.02 + Math.random() * 0.03,
                    hue: 30 + Math.random() * 30,
                    gravity: 40 + Math.random() * 40
                });
            }

            particles.forEach((p) => {
                p.x += p.vx * 0.016;
                p.y += p.vy * 0.016;
                p.vy += p.gravity * 0.016;
                p.vx *= 0.98;
                p.vy *= 0.98;
                p.life -= p.decay;

                if (p.life <= 0) return;

                const alpha = p.life;
                ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, ${alpha * 0.5})`;
                ctx.shadowBlur = 15;
                ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * p.life), 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });
            const topLayer = layers[layers.length - 1];
            const topGlowY = centerY + topLayer.y;
            const topGlow = ctx.createRadialGradient(centerX, topGlowY - 20, 0, centerX, topGlowY - 20, 120);
            topGlow.addColorStop(0, `rgba(255,200,100,${0.06 + 0.04 * Math.sin(elapsed * 1.5)})`);
            topGlow.addColorStop(1, 'rgba(255,200,100,0)');
            ctx.fillStyle = topGlow;
            ctx.beginPath();
            ctx.arc(centerX, topGlowY - 20, 120, 0, Math.PI * 2);
            ctx.fill();

            if (elapsed < 14) {
                requestAnimationFrame(animate);
            } else {
                let fadeStart = performance.now();
                function fadeOut() {
                    const fadeElapsed = (performance.now() - fadeStart) / 1000;
                    if (fadeElapsed < 0.8) {
                        ctx.clearRect(0, 0, width, height);
                        ctx.globalAlpha = 1 - fadeElapsed / 0.8;
                        const bgGrad2 = ctx.createRadialGradient(centerX, centerY - 50, 0, centerX, centerY - 50, 500);
                        bgGrad2.addColorStop(0, '#1a0a2e');
                        bgGrad2.addColorStop(0.3, '#16213e');
                        bgGrad2.addColorStop(0.6, '#0f0c29');
                        bgGrad2.addColorStop(1, '#050510');
                        ctx.fillStyle = bgGrad2;
                        ctx.fillRect(0, 0, width, height);
                        ctx.globalAlpha = 1;
                        requestAnimationFrame(fadeOut);
                    } else {
                        if (audio) {
                            try {
                                audio.pause();
                                audio.currentTime = 0;
                            } catch (e) { }
                        }
                        canvas.remove();
                        if (container.parentNode && container.children.length === 0) {
                            container.remove();
                        }
                    }
                }
                fadeOut();
            }
        }

        animate();
    },
    fireworks: function (container) {
        const { canvas, ctx, width, height } = this.createCanvas(container);
        const bursts = [];
        const stars = [];
        let startTime = performance.now();
        const palettes = [
            ['#FF6B6B', '#FF4757', '#FF2D55', '#FF6348'],
            ['#FFD93D', '#F6B93B', '#FF9F43', '#F39C12'],
            ['#6BCB77', '#2ECC71', '#1ABC9C', '#58D68D'],
            ['#4D96FF', '#3498DB', '#2980B9', '#5DADE2'],
            ['#FF6BFF', '#E056A0', '#C39BD3', '#AF7AC5'],
            ['#00D2D3', '#01A3A4', '#00B894', '#00CEC9'],
            ['#F368E0', '#E056A0', '#FD79A8', '#F8A5C2'],
            ['#FF9FF3', '#F368E0', '#E056A0', '#FD79A8'],
        ];
        function createBurst(cx, cy, palette) {
            const count = 80 + Math.floor(Math.random() * 80);
            const particles = [];
            const colorPalette = palette || palettes[Math.floor(Math.random() * palettes.length)];
            const type = Math.random() > 0.5 ? 'circle' : 'star';
            const speed = 150 + Math.random() * 300;

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const velocity = speed * (0.3 + Math.random() * 0.7);
                const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
                const size = 2 + Math.random() * 5;
                const life = 0.8 + Math.random() * 0.8;
                particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * velocity,
                    vy: Math.sin(angle) * velocity - (Math.random() * 50),
                    size: size,
                    color: color,
                    life: life,
                    maxLife: life,
                    decay: 0.008 + Math.random() * 0.015,
                    trail: [],
                    gravity: 60 + Math.random() * 40,
                    type: type,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.1
                });
            }
            return particles;
        }
        for (let i = 0; i < 4; i++) {
            const cx = 10 + Math.random() * 80;
            const cy = 15 + Math.random() * 50;
            const palette = palettes[i % palettes.length];
            const particles = createBurst(cx / 100 * width, cy / 100 * height, palette);
            bursts.push({
                particles,
                startTime: performance.now() + i * 400,
                duration: 2500 + Math.random() * 1000
            });
        }
        for (let i = 0; i < 50; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 0.5 + Math.random() * 1.5,
                twinkle: Math.random() * Math.PI * 2,
                speed: 1 + Math.random() * 2
            });
        }

        function drawParticle(p) {
            const alpha = Math.max(0, p.life / p.maxLife);
            p.trail.forEach((pos, idx) => {
                const tAlpha = (idx / p.trail.length) * alpha * 0.5;
                const tSize = p.size * (idx / p.trail.length) * 0.6;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, tSize, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = tAlpha;
                ctx.fill();
            });
            ctx.globalAlpha = 1;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            const glowSize = p.size * 4;
            const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
            grd.addColorStop(0, p.color);
            grd.addColorStop(0.3, p.color);
            grd.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grd;
            ctx.globalAlpha = alpha * 0.4;
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = alpha;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 20;
            if (p.type === 'star' && p.size > 2) {
                const spikes = 4 + Math.floor(Math.random() * 2);
                const outer = p.size;
                const inner = p.size * 0.4;
                ctx.beginPath();
                for (let i = 0; i < spikes * 2; i++) {
                    const r = i % 2 === 0 ? outer : inner;
                    const theta = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
                    if (i === 0) ctx.moveTo(Math.cos(theta) * r, Math.sin(theta) * r);
                    else ctx.lineTo(Math.cos(theta) * r, Math.sin(theta) * r);
                }
                ctx.closePath();
                ctx.fillStyle = p.color;
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        function animate() {
            const elapsed = (performance.now() - startTime) / 1000;
            ctx.clearRect(0, 0, width, height);
            const bgGrd = ctx.createLinearGradient(0, 0, 0, height);
            bgGrd.addColorStop(0, '#0a0a1a');
            bgGrd.addColorStop(0.5, '#0f0f2a');
            bgGrd.addColorStop(1, '#0a0a1a');
            ctx.fillStyle = bgGrd;
            ctx.fillRect(0, 0, width, height);
            stars.forEach((s) => {
                s.twinkle += 0.02 * s.speed;
                const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.twinkle));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.fill();
            });
            let allDead = true;
            bursts.forEach((burst) => {
                const elapsedBurst = (performance.now() - burst.startTime) / 1000;
                if (elapsedBurst < 0 || elapsedBurst > 5) return;

                burst.particles.forEach((p) => {
                    p.x += p.vx * 0.016;
                    p.y += p.vy * 0.016;
                    p.vy += p.gravity * 0.016;
                    p.vx *= 0.99;
                    p.vy *= 0.99;
                    p.life -= p.decay;
                    p.rotation += p.rotSpeed;

                    p.trail.push({ x: p.x, y: p.y });
                    if (p.trail.length > 6) p.trail.shift();

                    if (p.life > 0) {
                        allDead = false;
                        drawParticle(p);
                    }
                });
            });
            if (elapsed < 8 && Math.random() < 0.02) {
                const cx = 10 + Math.random() * 80;
                const cy = 10 + Math.random() * 50;
                const palette = palettes[Math.floor(Math.random() * palettes.length)];
                const particles = createBurst(cx / 100 * width, cy / 100 * height, palette);
                bursts.push({
                    particles,
                    startTime: performance.now(),
                    duration: 3000
                });
            }

            if (!allDead || elapsed < 8) {
                requestAnimationFrame(animate);
            } else {
                canvas.remove();
            }
        }
        animate();
    },
    celebration: function (container) {
        const { canvas, ctx, width, height } = this.createCanvas(container);
        const particles = [];
        const texts = ['✨', '🎉', '🎊', '⭐', '🌈', '💫', '🎆', '🎇'];
        let startTime = performance.now();
        for (let i = 0; i < 200; i++) {
            const hue = Math.random() * 360;
            particles.push({
                x: Math.random() * width,
                y: -20 - Math.random() * 100,
                vx: (Math.random() - 0.5) * 120,
                vy: 60 + Math.random() * 150,
                size: 3 + Math.random() * 10,
                hue: hue,
                life: 0.7 + Math.random() * 0.3,
                decay: 0.003 + Math.random() * 0.008,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 2 + Math.random() * 4,
                shape: Math.random() > 0.3 ? 'circle' : 'star'
            });
        }
        const floatTexts = [];
        for (let i = 0; i < 20; i++) {
            floatTexts.push({
                text: texts[Math.floor(Math.random() * texts.length)],
                x: Math.random() * width,
                y: Math.random() * height,
                size: 20 + Math.random() * 40,
                vx: (Math.random() - 0.5) * 30,
                vy: -20 - Math.random() * 40,
                rotation: 0,
                rotSpeed: (Math.random() - 0.5) * 0.05,
                life: 0.8 + Math.random() * 0.2,
                delay: Math.random() * 2
            });
        }
        const beams = [];
        for (let i = 0; i < 8; i++) {
            beams.push({
                x: (i / 8) * width + Math.random() * 20,
                width: 3 + Math.random() * 8,
                hue: i * 45 + Math.random() * 20,
                speed: 0.5 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }

        function drawStar(cx, cy, size, hue, alpha) {
            const outer = size;
            const inner = size * 0.4;
            const spikes = 5;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(Math.random() * 0.1);
            ctx.beginPath();
            for (let i = 0; i < spikes * 2; i++) {
                const r = i % 2 === 0 ? outer : inner;
                const theta = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
                if (i === 0) ctx.moveTo(Math.cos(theta) * r, Math.sin(theta) * r);
                else ctx.lineTo(Math.cos(theta) * r, Math.sin(theta) * r);
            }
            ctx.closePath();
            ctx.fillStyle = `hsla(${hue}, 90%, 65%, ${alpha})`;
            ctx.shadowColor = `hsla(${hue}, 90%, 65%, ${alpha * 0.5})`;
            ctx.shadowBlur = 20;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        function animate() {
            const elapsed = (performance.now() - startTime) / 1000;
            ctx.clearRect(0, 0, width, height);
            const grd = ctx.createLinearGradient(0, 0, width, height);
            grd.addColorStop(0, '#0f0c29');
            grd.addColorStop(0.5, '#302b63');
            grd.addColorStop(1, '#24243e');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, width, height);
            beams.forEach((b) => {
                const alpha = 0.3 + 0.3 * Math.sin(elapsed * b.speed + b.phase);
                ctx.fillStyle = `hsla(${b.hue}, 80%, 60%, ${alpha * 0.15})`;
                ctx.fillRect(b.x + Math.sin(elapsed * 0.3 + b.phase) * 20, 0, b.width, height);
            });
            floatTexts.forEach((ft) => {
                if (ft.delay > elapsed) return;
                const life = Math.min(1, (elapsed - ft.delay) / 0.5);
                ft.x += ft.vx * 0.016;
                ft.y += ft.vy * 0.016;
                ft.rotation += ft.rotSpeed;
                const alpha = life * 0.6;
                ctx.save();
                ctx.translate(ft.x, ft.y);
                ctx.rotate(ft.rotation);
                ctx.font = `${ft.size}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.globalAlpha = alpha;
                ctx.shadowColor = 'rgba(255,200,100,0.3)';
                ctx.shadowBlur = 30;
                ctx.fillStyle = `hsl(${Math.random() * 360}, 80%, 70%)`;
                ctx.fillText(ft.text, 0, 0);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
                ctx.restore();
            });
            particles.forEach((p) => {
                p.x += p.vx * 0.016 + Math.sin(elapsed * p.wobbleSpeed + p.wobble) * 20 * 0.016;
                p.y += p.vy * 0.016;
                p.vy += 20 * 0.016;
                p.life -= p.decay;

                if (p.y > height + 20) {
                    p.y = -20;
                    p.x = Math.random() * width;
                    p.vy = 60 + Math.random() * 150;
                    p.life = 0.7 + Math.random() * 0.3;
                    p.hue = Math.random() * 360;
                }

                if (p.life <= 0) return;

                const alpha = p.life;
                if (p.shape === 'star') {
                    drawStar(p.x, p.y, p.size, p.hue, alpha);
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * p.life), 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${alpha})`;
                    ctx.shadowColor = `hsla(${p.hue}, 90%, 65%, ${alpha * 0.3})`;
                    ctx.shadowBlur = 15;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            });

            if (elapsed < 6) {
                requestAnimationFrame(animate);
            } else {
                canvas.remove();
            }
        }
        animate();
    },
    play: function (type, container, options = {}) {
        if (document.getElementById('mokim-overlay')) {
            return;
        }
        const overlay = document.createElement('div');
        overlay.id = 'mokim-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 99998;
            background: transparent;
            cursor: default;
            pointer-events: all;
        `;
        overlay.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); }, true);
        overlay.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); }, true);
        overlay.addEventListener('mouseup', (e) => { e.stopPropagation(); e.preventDefault(); }, true);
        overlay.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); }, true);
        overlay.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); }, true);
        overlay.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); }, true);
        overlay.addEventListener('wheel', (e) => { e.preventDefault(); }, { passive: false });
        overlay.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
        document.body.appendChild(overlay);
        if (!container) {
            container = document.createElement('div');
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                pointer-events: none;
                z-index: 99999;
                overflow: hidden;
                background: transparent;
            `;
            document.body.appendChild(container);
        }
        let animFn = this[type];
        if (!animFn) {
            animFn = this.celebration;
        }
        const list_animate = ['loveup', 'redpacket'];
        try {
            if (list_animate.includes(type)) {
                animFn.call(this, container, options);
            } else {
                animFn.call(this, container);
            }
        } catch (e) {
            overlay.remove();
            if (container && container.parentNode && container.children.length === 0) {
                container.remove();
            }
            this.hearts(container);
        }
        const observer = new MutationObserver(() => {
            const canvases = container.querySelectorAll('canvas');
            if (canvases.length === 0) {
                if (document.getElementById('mokim-overlay')) {
                    document.getElementById('mokim-overlay').remove();
                }
                if (container && container.parentNode && container.children.length === 0) {
                    container.remove();
                }
                observer.disconnect();
            }
        });
        observer.observe(container, { childList: true, subtree: true });
    }
};
export default mokim_AnimationEngine;