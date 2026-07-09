(function () {
    if (window._themeSystemInitialized) return;
    window._themeSystemInitialized = true;
    const STORAGE_KEY = 'mok_im_theme_config';
    let currentConfig = {
        theme: 'modern',
        bubbleShape: 'rounded',
        dynamicBg: 'none',
        fontScheme: 'default',
        fontSize: 14,
        fontColor: 'default'
    };

    const THEMES = {
        modern: {
            name: '现代简约',
            description: '清爽简洁，专注沟通',
            icon: 'fas fa-leaf',
            colors: {
                '--bg-global': '#F5F7FA',
                '--bg-card': '#FFFFFF',
                '--border': '#E5E9F0',
                '--text-primary': '#2C3E50',
                '--text-secondary': '#7F8C8D',
                '--text-tertiary': '#95A5A6',
                '--text-inverse': '#FFFFFF',
                '--primary': '#3498DB',
                '--secondary': '#5DADE2',
                '--accent': '#E74C3C',
                '--msg-self-bg': '#3498DB20',
                '--msg-self-text': '#2C3E50',
                '--msg-other-bg': '#ECF0F1',
                '--msg-other-text': '#2C3E50',
                '--hover-bg': '#F0F3F8',
                '--shadow': '0 2px 12px rgba(0, 0, 0, 0.08)',
                '--input-bg': '#F5F7FA',
                '--toolbar-bg': '#F9FAFB'
            }
        },
        darknight: {
            name: '深邃暗夜',
            description: '护眼深色，沉浸体验',
            icon: 'fas fa-moon',
            colors: {
                '--bg-global': '#0A0E17',
                '--bg-card': '#141A26',
                '--border': '#1E2A3A',
                '--text-primary': '#E8EDF5',
                '--text-secondary': '#8899B0',
                '--text-tertiary': '#5A6A80',
                '--text-inverse': '#141A26',
                '--primary': '#6C8CFF',
                '--secondary': '#4A6CF7',
                '--accent': '#FF6B8A',
                '--msg-self-bg': '#6C8CFF25',
                '--msg-self-text': '#E8EDF5',
                '--msg-other-bg': '#1E2A3A',
                '--msg-other-text': '#E8EDF5',
                '--hover-bg': '#1E2A3A',
                '--shadow': '0 2px 12px rgba(0, 0, 0, 0.5)',
                '--input-bg': '#0A0E17',
                '--toolbar-bg': '#0A0E17'
            }
        },
        cyberpunk: {
            name: '赛博朋克',
            description: '霓虹炫彩，未来科技',
            icon: 'fas fa-microchip',
            colors: {
                '--bg-global': '#080C1A',
                '--bg-card': '#0E1428',
                '--border': '#00FFCC40',
                '--text-primary': '#00FFCC',
                '--text-secondary': '#FF00FF80',
                '--text-tertiary': '#FF006680',
                '--text-inverse': '#080C1A',
                '--primary': '#FF00FF',
                '--secondary': '#00FFCC',
                '--accent': '#FF0066',
                '--msg-self-bg': '#FF00FF25',
                '--msg-self-text': '#00FFCC',
                '--msg-other-bg': '#00FFCC15',
                '--msg-other-text': '#FF00FF',
                '--hover-bg': '#1A1F3A',
                '--shadow': '0 0 30px #FF00FF30, 0 0 10px #00FFCC20',
                '--input-bg': '#0A0E1A',
                '--toolbar-bg': '#0A0E1A'
            }
        },
        sakura: {
            name: '樱花和风',
            description: '粉嫩温柔，春日气息',
            icon: 'fas fa-cherry-blossom',
            colors: {
                '--bg-global': '#FFF5F6',
                '--bg-card': '#FFFFFF',
                '--border': '#FFD1DC',
                '--text-primary': '#5E3A4A',
                '--text-secondary': '#B5838D',
                '--text-tertiary': '#D4A5B0',
                '--text-inverse': '#FFFFFF',
                '--primary': '#FF8DA1',
                '--secondary': '#FFB3C1',
                '--accent': '#FF6B8B',
                '--msg-self-bg': '#FF8DA120',
                '--msg-self-text': '#5E3A4A',
                '--msg-other-bg': '#FFE4E9',
                '--msg-other-text': '#5E3A4A',
                '--hover-bg': '#FFF0F3',
                '--shadow': '0 2px 12px rgba(255, 141, 161, 0.15)',
                '--input-bg': '#FFF5F6',
                '--toolbar-bg': '#FFF5F6'
            }
        },
        ocean: {
            name: '海洋之心',
            description: '蔚蓝深邃，宁静致远',
            icon: 'fas fa-water',
            colors: {
                '--bg-global': '#E8F4F8',
                '--bg-card': '#FFFFFF',
                '--border': '#B8DFE8',
                '--text-primary': '#1A3C4A',
                '--text-secondary': '#5B8A9A',
                '--text-tertiary': '#7BA8B8',
                '--text-inverse': '#FFFFFF',
                '--primary': '#2E86AB',
                '--secondary': '#5BA4C4',
                '--accent': '#FF8C42',
                '--msg-self-bg': '#2E86AB20',
                '--msg-self-text': '#1A3C4A',
                '--msg-other-bg': '#D6EEF5',
                '--msg-other-text': '#1A3C4A',
                '--hover-bg': '#EDF7FA',
                '--shadow': '0 2px 12px rgba(46, 134, 171, 0.12)',
                '--input-bg': '#E8F4F8',
                '--toolbar-bg': '#E8F4F8'
            }
        }
    };

    const FONT_COLOR_SCHEMES = {
        default: {
            name: '跟随主题',
            description: '使用主题预设颜色'
        },
        pureBlack: {
            name: '纯黑字体',
            description: '高对比度，清晰易读',
            colors: {
                '--text-primary': '#1A1A1A',
                '--text-secondary': '#4A4A4A',
                '--text-tertiary': '#757575',
                '--msg-self-text': '#1A1A1A',
                '--msg-other-text': '#1A1A1A'
            }
        },
        warmBrown: {
            name: '暖棕色',
            description: '护眼舒适，纸质质感',
            colors: {
                '--text-primary': '#4A3728',
                '--text-secondary': '#6B5344',
                '--text-tertiary': '#8B7355',
                '--msg-self-text': '#4A3728',
                '--msg-other-text': '#4A3728'
            }
        },
        softGray: {
            name: '柔和灰',
            description: '低调优雅，减轻视觉疲劳',
            colors: {
                '--text-primary': '#4A5568',
                '--text-secondary': '#718096',
                '--text-tertiary': '#A0AEC0',
                '--msg-self-text': '#4A5568',
                '--msg-other-text': '#4A5568'
            }
        },
        highContrast: {
            name: '高对比',
            description: '黑白分明，适合弱视',
            colors: {
                '--text-primary': '#000000',
                '--text-secondary': '#333333',
                '--text-tertiary': '#666666',
                '--msg-self-text': '#000000',
                '--msg-other-text': '#000000'
            }
        }
    };

    let originalThemeColors = {};
    let currentFontColorScheme = 'default';

    const BUBBLE_SHAPES = {
        rounded: {
            name: '标准圆角',
            description: '经典舒适，适合日常',
            self: { 'border-radius': '12px 12px 4px 12px' },
            other: { 'border-radius': '12px 12px 12px 4px' }
        },
        largeRounded: {
            name: '大圆角',
            description: '柔和亲切，现代风格',
            self: { 'border-radius': '24px 24px 8px 24px' },
            other: { 'border-radius': '24px 24px 24px 8px' }
        },
        sharp: {
            name: '方形锐利',
            description: '简洁干练，高效直接',
            self: { 'border-radius': '4px 4px 0 4px' },
            other: { 'border-radius': '4px 4px 4px 0' }
        },
        comic: {
            name: '漫画风格',
            description: '趣味个性，活泼可爱',
            self: {
                'border-radius': '20px 8px 20px 20px',
                'border': '2px solid currentColor',
                'transform': 'rotate(-0.5deg)'
            },
            other: {
                'border-radius': '8px 20px 20px 20px',
                'border': '2px solid currentColor',
                'transform': 'rotate(0.5deg)'
            }
        },
        imessage: {
            name: 'iMessage风格',
            description: 'iOS原生，精致优雅',
            self: {
                'border-radius': '18px 18px 4px 18px',
                'padding': '10px 16px'
            },
            other: {
                'border-radius': '18px 18px 18px 4px',
                'padding': '10px 16px'
            }
        }
    };




    const STAR_COLORS = ['#FFD700', '#FFFFFF', '#87CEEB', '#FF6B6B', '#7B68EE', '#00FFCC', '#FF00FF', '#FFA500', '#00BFFF'];

    function createParticleStarSystem(container) {

        container.style.position = 'relative';
        container.style.overflow = 'hidden';


        const origBg = container.style.background;
        container.style.background = 'radial-gradient(ellipse at center, #0a0a1a 0%, #050510 100%)';

        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '1';
        canvas.style.pointerEvents = 'none';


        const messages = container.querySelectorAll('.message-item, .chat-messages-inner, .message-time-group');
        messages.forEach(el => {
            if (el) {
                el.style.position = 'relative';
                el.style.zIndex = '2';
            }
        });

        container.appendChild(canvas);

        let ctx = canvas.getContext('2d');
        let stars = [];
        let shootingStars = [];
        let nebulaParticles = [];
        let animationId = null;
        let mouseX = 0.5;
        let mouseY = 0.5;
        let width = 0;
        let height = 0;


        const onMouseMove = (e) => {
            const rect = container.getBoundingClientRect();
            mouseX = (e.clientX - rect.left) / rect.width;
            mouseY = (e.clientY - rect.top) / rect.height;
            mouseX = Math.max(0, Math.min(1, mouseX));
            mouseY = Math.max(0, Math.min(1, mouseY));
        };
        container.addEventListener('mousemove', onMouseMove);


        function resizeCanvas() {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            width = rect.width || container.clientWidth || 300;
            height = rect.height || container.clientHeight || 300;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.scale(dpr, dpr);
            initStars();
            initNebula();
        }

        function initStars() {
            const count = Math.floor((width * height) / 2000) + 80;
            stars = [];
            for (let i = 0; i < count; i++) {
                const size = Math.random() * 3 + 0.5;
                const isGiant = size > 2.5;
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    radius: size,
                    baseAlpha: Math.random() * 0.6 + 0.3,
                    speed: Math.random() * 0.015 + 0.003,
                    phase: Math.random() * Math.PI * 2,
                    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
                    isGiant: isGiant,

                    parallaxX: (Math.random() - 0.5) * 60,
                    parallaxY: (Math.random() - 0.5) * 60,

                    driftX: (Math.random() - 0.5) * 0.3,
                    driftY: (Math.random() - 0.5) * 0.3,
                    driftPhase: Math.random() * Math.PI * 2
                });
            }
        }

        function initNebula() {
            const count = 8;
            nebulaParticles = [];
            for (let i = 0; i < count; i++) {
                nebulaParticles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    radius: Math.random() * 120 + 60,
                    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
                    alpha: Math.random() * 0.06 + 0.02,
                    speed: Math.random() * 0.002 + 0.001,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }


        function spawnShootingStar() {
            if (shootingStars.length > 3) return;
            const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.8;
            const speed = Math.random() * 8 + 6;
            const length = Math.random() * 80 + 60;
            shootingStars.push({
                x: Math.random() * width * 1.2 - width * 0.1,
                y: Math.random() * height * 0.6,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                length: length,
                life: 1.0,
                decay: Math.random() * 0.008 + 0.006,
                width: Math.random() * 2 + 1.5
            });
        }


        function drawStars(time) {
            ctx.clearRect(0, 0, width, height);


            nebulaParticles.forEach(neb => {
                const pulse = Math.sin(time * neb.speed + neb.phase) * 0.3 + 0.7;
                const grad = ctx.createRadialGradient(
                    neb.x + Math.sin(time * neb.speed * 0.5 + neb.phase) * 20,
                    neb.y + Math.cos(time * neb.speed * 0.7 + neb.phase) * 20,
                    0,
                    neb.x,
                    neb.y,
                    neb.radius
                );
                const alpha = neb.alpha * pulse;
                grad.addColorStop(0, neb.color + Math.floor(alpha * 80).toString(16).padStart(2, '0'));
                grad.addColorStop(0.5, neb.color + Math.floor(alpha * 40).toString(16).padStart(2, '0'));
                grad.addColorStop(1, neb.color + '00');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
                ctx.fill();
            });


            const parallaxX = (mouseX - 0.5) * 40;
            const parallaxY = (mouseY - 0.5) * 40;

            stars.forEach(star => {
                const twinkle = Math.sin(time * star.speed + star.phase) * 0.4 + 0.6;
                const alpha = Math.min(star.baseAlpha * twinkle, 0.95);


                const px = star.x + parallaxX * (star.parallaxX / 60);
                const py = star.y + parallaxY * (star.parallaxY / 60);


                const driftX = Math.sin(time * 0.001 + star.driftPhase) * star.driftX;
                const driftY = Math.cos(time * 0.0013 + star.driftPhase * 1.3) * star.driftY;

                const finalX = px + driftX;
                const finalY = py + driftY;


                const glowRadius = star.radius * (4 + Math.sin(time * star.speed * 0.5 + star.phase) * 1);
                const grad = ctx.createRadialGradient(
                    finalX, finalY, 0,
                    finalX, finalY, glowRadius
                );
                const colorAlpha = Math.floor(alpha * 60).toString(16).padStart(2, '0');
                grad.addColorStop(0, star.color + Math.floor(alpha * 180).toString(16).padStart(2, '0'));
                grad.addColorStop(0.4, star.color + colorAlpha);
                grad.addColorStop(1, star.color + '00');

                ctx.beginPath();
                ctx.arc(finalX, finalY, glowRadius, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();


                const coreGlow = alpha * (0.8 + Math.sin(time * star.speed * 2 + star.phase) * 0.2);
                ctx.beginPath();
                ctx.arc(finalX, finalY, star.radius * (0.8 + Math.sin(time * star.speed * 0.7 + star.phase) * 0.2), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${coreGlow * 0.9})`;
                ctx.fill();


                if (star.isGiant) {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
                    ctx.lineWidth = 1;
                    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                        const len = star.radius * (3 + Math.sin(time * star.speed * 0.3 + star.phase + angle) * 1);
                        ctx.beginPath();
                        ctx.moveTo(finalX + Math.cos(angle) * star.radius * 1.2, finalY + Math.sin(angle) * star.radius * 1.2);
                        ctx.lineTo(finalX + Math.cos(angle) * len, finalY + Math.sin(angle) * len);
                        ctx.stroke();
                    }

                    const extraGlow = ctx.createRadialGradient(
                        finalX, finalY, 0,
                        finalX, finalY, star.radius * 6
                    );
                    extraGlow.addColorStop(0, star.color + '15');
                    extraGlow.addColorStop(1, star.color + '00');
                    ctx.fillStyle = extraGlow;
                    ctx.beginPath();
                    ctx.arc(finalX, finalY, star.radius * 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            });


            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const ss = shootingStars[i];
                ss.x += ss.vx;
                ss.y += ss.vy;
                ss.life -= ss.decay;

                if (ss.life <= 0 || ss.x > width * 1.5 || ss.y > height * 1.2) {
                    shootingStars.splice(i, 1);
                    continue;
                }

                const grad = ctx.createLinearGradient(
                    ss.x, ss.y,
                    ss.x - ss.vx / ss.vx * ss.length,
                    ss.y - ss.vy / ss.vy * ss.length
                );
                const alpha = ss.life * ss.life;
                grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
                grad.addColorStop(0.3, `rgba(200, 220, 255, ${alpha * 0.5})`);
                grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

                ctx.strokeStyle = grad;
                ctx.lineWidth = ss.width * ss.life;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(ss.x, ss.y);
                ctx.lineTo(ss.x - ss.vx / ss.vx * ss.length * ss.life, ss.y - ss.vy / ss.vy * ss.length * ss.life);
                ctx.stroke();


                const headGlow = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, ss.width * 8);
                headGlow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.4})`);
                headGlow.addColorStop(1, `rgba(255, 255, 255, 0)`);
                ctx.fillStyle = headGlow;
                ctx.beginPath();
                ctx.arc(ss.x, ss.y, ss.width * 8, 0, Math.PI * 2);
                ctx.fill();
            }


            if (Math.random() < 0.008) {
                spawnShootingStar();
            }
        }


        function animate() {
            const time = Date.now() * 0.001;
            drawStars(time);
            animationId = requestAnimationFrame(animate);
        }


        resizeCanvas();
        animate();


        const resizeObserver = new ResizeObserver(() => {
            resizeCanvas();
        });
        resizeObserver.observe(container);


        return {
            cleanup: () => {
                if (animationId) cancelAnimationFrame(animationId);
                resizeObserver.disconnect();
                container.removeEventListener('mousemove', onMouseMove);
                canvas.remove();

                container.style.background = origBg || '';
                container.style.position = '';
                container.style.overflow = '';

                messages.forEach(el => {
                    if (el) {
                        el.style.position = '';
                        el.style.zIndex = '';
                    }
                });
            },
            resize: resizeCanvas
        };
    }




    function createGlassEffect(container) {
        container._originalBackdropFilter = container.style.backdropFilter;
        container._originalBackground = container.style.background;
        container._originalPosition = container.style.position;
        container._originalOverflow = container.style.overflow;

        container.style.position = 'relative';
        container.style.overflow = 'hidden';


        const root = document.documentElement;
        const bgGlobal = getComputedStyle(root).getPropertyValue('--bg-global').trim();
        const isDark = bgGlobal.includes('0A') || bgGlobal.includes('0F') ||
            bgGlobal.includes('1A') || bgGlobal.includes('08') ||
            bgGlobal.includes('0E') || bgGlobal.includes('0a') ||
            bgGlobal.includes('0f') || bgGlobal.includes('1a') ||
            bgGlobal.includes('08') || bgGlobal.includes('0e');


        const baseColor = isDark ? 'rgba(10, 14, 23, 0.45)' : 'rgba(255, 255, 255, 0.25)';
        container.style.background = baseColor;
        container.style.backdropFilter = 'blur(20px) saturate(180%) contrast(1.05)';


        const glassLayer = document.createElement('div');
        glassLayer.style.position = 'absolute';
        glassLayer.style.top = '0';
        glassLayer.style.left = '0';
        glassLayer.style.width = '100%';
        glassLayer.style.height = '100%';
        glassLayer.style.zIndex = '0';
        glassLayer.style.pointerEvents = 'none';
        glassLayer.style.background = isDark ?
            'radial-gradient(ellipse at 30% 40%, rgba(108, 140, 255, 0.08) 0%, transparent 70%), radial-gradient(ellipse at 70% 60%, rgba(0, 255, 204, 0.05) 0%, transparent 70%)' :
            'radial-gradient(ellipse at 30% 40%, rgba(255, 255, 255, 0.4) 0%, transparent 70%), radial-gradient(ellipse at 70% 60%, rgba(64, 158, 255, 0.08) 0%, transparent 70%)';
        container.appendChild(glassLayer);


        const glowLayer = document.createElement('canvas');
        glowLayer.style.position = 'absolute';
        glowLayer.style.top = '0';
        glowLayer.style.left = '0';
        glowLayer.style.width = '100%';
        glowLayer.style.height = '100%';
        glowLayer.style.zIndex = '0';
        glowLayer.style.pointerEvents = 'none';
        glowLayer.style.opacity = isDark ? '0.5' : '0.3';
        container.appendChild(glowLayer);

        let glowCtx = glowLayer.getContext('2d');
        let glowWidth = 0;
        let glowHeight = 0;
        let glowAnimationId = null;
        let glowTime = 0;

        function resizeGlow() {
            const rect = container.getBoundingClientRect();
            glowWidth = rect.width || container.clientWidth || 300;
            glowHeight = rect.height || container.clientHeight || 300;
            glowLayer.width = glowWidth;
            glowLayer.height = glowHeight;
        }

        function drawGlow() {
            if (!glowCtx || glowWidth === 0 || glowHeight === 0) return;
            glowCtx.clearRect(0, 0, glowWidth, glowHeight);
            glowTime += 0.003;


            const spots = [
                { cx: 0.25 + Math.sin(glowTime * 0.3) * 0.15, cy: 0.3 + Math.cos(glowTime * 0.4) * 0.15, r: 0.4, color: isDark ? 'rgba(108, 140, 255, 0.12)' : 'rgba(64, 158, 255, 0.10)' },
                { cx: 0.75 + Math.sin(glowTime * 0.2 + 1.5) * 0.15, cy: 0.7 + Math.cos(glowTime * 0.3 + 1.2) * 0.15, r: 0.5, color: isDark ? 'rgba(0, 255, 204, 0.08)' : 'rgba(255, 141, 161, 0.08)' },
                { cx: 0.5 + Math.sin(glowTime * 0.15 + 0.8) * 0.2, cy: 0.5 + Math.cos(glowTime * 0.2 + 0.6) * 0.2, r: 0.6, color: isDark ? 'rgba(255, 107, 138, 0.06)' : 'rgba(255, 200, 50, 0.06)' }
            ];

            spots.forEach(spot => {
                const x = spot.cx * glowWidth;
                const y = spot.cy * glowHeight;
                const r = spot.r * Math.min(glowWidth, glowHeight);
                const grad = glowCtx.createRadialGradient(x, y, 0, x, y, r);
                grad.addColorStop(0, spot.color);
                grad.addColorStop(0.5, spot.color.replace(/[\d.]+\)$/, (m) => (parseFloat(m) * 0.5) + ')'));
                grad.addColorStop(1, 'transparent');
                glowCtx.fillStyle = grad;
                glowCtx.beginPath();
                glowCtx.arc(x, y, r, 0, Math.PI * 2);
                glowCtx.fill();
            });

            glowAnimationId = requestAnimationFrame(drawGlow);
        }

        resizeGlow();
        drawGlow();

        const resizeObserver = new ResizeObserver(() => {
            resizeGlow();
        });
        resizeObserver.observe(container);


        const noiseLayer = document.createElement('canvas');
        noiseLayer.style.position = 'absolute';
        noiseLayer.style.top = '0';
        noiseLayer.style.left = '0';
        noiseLayer.style.width = '100%';
        noiseLayer.style.height = '100%';
        noiseLayer.style.zIndex = '0';
        noiseLayer.style.pointerEvents = 'none';
        noiseLayer.style.opacity = '0.03';
        container.appendChild(noiseLayer);

        function generateNoise() {
            const nw = noiseLayer.width = 256;
            const nh = noiseLayer.height = 256;
            const nctx = noiseLayer.getContext('2d');
            const imageData = nctx.createImageData(nw, nh);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const val = Math.random() * 255;
                data[i] = val;
                data[i + 1] = val;
                data[i + 2] = val;
                data[i + 3] = Math.random() * 60 + 20;
            }
            nctx.putImageData(imageData, 0, 0);
            noiseLayer.style.width = '100%';
            noiseLayer.style.height = '100%';
        }
        generateNoise();


        return {
            cleanup: () => {
                if (glowAnimationId) cancelAnimationFrame(glowAnimationId);
                resizeObserver.disconnect();
                container.style.backdropFilter = container._originalBackdropFilter || '';
                container.style.background = container._originalBackground || '';
                container.style.position = container._originalPosition || '';
                container.style.overflow = container._originalOverflow || '';
                if (glassLayer) glassLayer.remove();
                if (glowLayer) glowLayer.remove();
                if (noiseLayer) noiseLayer.remove();
            },
            resize: () => {
                resizeGlow();
            }
        };
    }




    const DYNAMIC_BACKGROUNDS = {
        none: {
            name: '无',
            description: '使用主题自带背景',
            apply: () => { },
            cleanup: () => { }
        },
        waves: {
            name: '海浪波纹',
            description: '动态波浪动画',
            apply: (container) => {
                container.style.position = 'relative';
                container.style.overflow = 'hidden';

                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', '0 0 1200 120');
                svg.setAttribute('preserveAspectRatio', 'none');
                svg.style.position = 'absolute';
                svg.style.bottom = '0';
                svg.style.left = '0';
                svg.style.width = '100%';
                svg.style.height = '100%';
                svg.style.zIndex = '0';
                svg.style.opacity = '0.3';
                svg.style.pointerEvents = 'none';

                svg.innerHTML = `
                    <defs>
                        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.3"/>
                            <stop offset="50%" stop-color="var(--secondary)" stop-opacity="0.2"/>
                            <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.3"/>
                        </linearGradient>
                    </defs>
                    <path class="wave1" fill="url(#waveGrad)" d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,69.3C960,64,1056,64,1152,69.3C1200,72,1248,75,1296,74.7L1344,74.7L1344,128L1296,128C1248,128,1152,128,1056,128C960,128,864,128,768,128C672,128,576,128,480,128C384,128,288,128,192,128C96,128,48,128,0,128Z"/>
                    <path class="wave2" fill="url(#waveGrad)" d="M0,96L48,90.7C96,85,192,75,288,80C384,85,480,107,576,112C672,117,768,107,864,101.3C960,96,1056,96,1152,101.3C1200,104,1248,107,1296,106.7L1344,106.7L1344,128L1296,128C1248,128,1152,128,1056,128C960,128,864,128,768,128C672,128,576,128,480,128C384,128,288,128,192,128C96,128,48,128,0,128Z"/>
                `;

                const style = document.createElement('style');
                style.textContent = `
                    @keyframes wave1 {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    @keyframes wave2 {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(50%); }
                    }
                    .wave1 { animation: wave1 8s ease-in-out infinite; }
                    .wave2 { animation: wave2 6s ease-in-out infinite; }
                `;

                container.appendChild(style);
                container.appendChild(svg);

                container._dynamicBgElement = svg;
                container._dynamicBgStyle = style;
            },
            cleanup: (container) => {
                if (container._dynamicBgElement) container._dynamicBgElement.remove();
                if (container._dynamicBgStyle) container._dynamicBgStyle.remove();
            }
        },
        stars: {
            name: '粒子星空',
            description: '3D视差·流星·星云',
            apply: (container) => {
                const starSystem = createParticleStarSystem(container);
                container._starSystem = starSystem;
            },
            cleanup: (container) => {
                if (container._starSystem) {
                    container._starSystem.cleanup();
                    delete container._starSystem;
                }
            }
        },
        blur: {
            name: '毛玻璃效果',
            description: '多层模糊·动态光晕·质感',
            apply: (container) => {
                const glass = createGlassEffect(container);
                container._glassEffect = glass;
            },
            cleanup: (container) => {
                if (container._glassEffect) {
                    container._glassEffect.cleanup();
                    delete container._glassEffect;
                }
            }
        }
    };




    function applyThemeAdaptations(themeKey) {
        const styleId = 'theme-adaptation-styles';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        let css = '';

        if (themeKey === 'darknight') {
            css = `
                
                .sidebar-left, .sidebar-conversations, .sidebar-right {
                    background-color: var(--bg-card) !important;
                }
                .chat-header, .chat-input-area {
                    background-color: var(--bg-card) !important;
                }
                .chat-messages {
                    background-color: var(--bg-global) !important;
                }
                .message-item.other .message-bubble {
                    background-color: #1E2A3A !important;
                    color: #E8EDF5 !important;
                }
                .message-item.self .message-bubble {
                    background-color: rgba(108, 140, 255, 0.25) !important;
                    color: #E8EDF5 !important;
                }
                .conversation-item.active {
                    background-color: rgba(108, 140, 255, 0.15) !important;
                }
                .conversation-item:hover:not(.active) {
                    background-color: rgba(108, 140, 255, 0.08) !important;
                }
                .profile-card {
                    background-color: var(--bg-card) !important;
                    border-color: var(--border) !important;
                }
                .profile-stats-bar {
                    background-color: rgba(10, 14, 23, 0.5) !important;
                }
                .profile-details .text-secondary {
                    background-color: rgba(10, 14, 23, 0.3) !important;
                }
                .theme-modal-container {
                    background: var(--bg-card) !important;
                }
                .theme-card, .shape-card, .bg-card, .font-card, .fontcolor-card {
                    background: rgba(10, 14, 23, 0.6) !important;
                    border-color: var(--border) !important;
                }
                .theme-card:hover, .shape-card:hover, .bg-card:hover, .font-card:hover, .fontcolor-card:hover {
                    background: rgba(30, 42, 58, 0.8) !important;
                }
                .settings-sidebar {
                    background: rgba(10, 14, 23, 0.6) !important;
                    border-color: var(--border) !important;
                }
                .settings-content {
                    background: var(--bg-card) !important;
                }
                .mail-drawer-panel {
                    background: var(--bg-card) !important;
                }
                .mail-item:hover {
                    background: rgba(108, 140, 255, 0.08) !important;
                }
                .mail-item.unread {
                    background: rgba(108, 140, 255, 0.12) !important;
                }
                .contact-manager-panel {
                    background: var(--bg-card) !important;
                }
                .contact-item:hover {
                    background: rgba(108, 140, 255, 0.08) !important;
                }
                .contact-group {
                    border-color: var(--border) !important;
                }
                .group-header {
                    background: rgba(10, 14, 23, 0.3) !important;
                }
                .action-card {
                    background: rgba(10, 14, 23, 0.4) !important;
                    border-color: var(--border) !important;
                }
                .action-card:hover {
                    background: rgba(30, 42, 58, 0.6) !important;
                }
                .chat-toolbar {
                    background-color: var(--toolbar-bg) !important;
                    border-bottom-color: var(--border) !important;
                }
                .chat-input {
                    background-color: var(--input-bg) !important;
                    border-color: var(--border) !important;
                    color: var(--text-primary) !important;
                }
                .chat-input:focus {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 2px rgba(108, 140, 255, 0.2) !important;
                }
                .settings-modal-box {
                    background: var(--bg-card) !important;
                }
                .settings-modal-header {
                    border-bottom-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .settings-modal-footer {
                    border-top-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .tab-item.active::after {
                    background-color: var(--primary) !important;
                }
                .tab-item:hover {
                    color: var(--text-primary) !important;
                }
                .switch-toggle {
                    background-color: #2A3A4A !important;
                }
                .switch-toggle.active {
                    background-color: var(--primary) !important;
                }
                .theme-tab.active {
                    color: var(--primary) !important;
                    border-bottom-color: var(--primary) !important;
                }
                .theme-tab:hover {
                    color: var(--text-primary) !important;
                }
                .theme-tabs {
                    border-bottom-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .theme-modal-header {
                    border-bottom-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .theme-modal-footer {
                    border-top-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .profile-modal-container {
                    background: var(--bg-card) !important;
                }
                .profile-modal-header {
                    border-bottom-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .profile-modal-footer {
                    border-top-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .profile-tabs {
                    border-bottom-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .profile-field-item {
                    background: rgba(10, 14, 23, 0.3) !important;
                }
                .profile-stat-card {
                    background: rgba(10, 14, 23, 0.3) !important;
                }
                .profile-avatar-section {
                    background: rgba(10, 14, 23, 0.3) !important;
                }
                .notice-card {
                    background: rgba(10, 14, 23, 0.4) !important;
                    border-color: var(--border) !important;
                }
                .notice-card:hover {
                    background: rgba(30, 42, 58, 0.6) !important;
                }
                .pagination-bar {
                    background: var(--bg-card) !important;
                    border-top-color: var(--border) !important;
                }
                .notice-modal-box {
                    background: var(--bg-card) !important;
                }
                .notice-modal-header {
                    background: var(--bg-card) !important;
                    border-bottom-color: var(--border) !important;
                }
                .notice-modal-body {
                    background: var(--bg-card) !important;
                }
                .custom-dialog-box {
                    background: var(--bg-card) !important;
                }
                .custom-dialog-header {
                    border-bottom-color: var(--border) !important;
                }
                .lanzou-upload-container {
                    background: var(--bg-card) !important;
                }
                .lanzou-upload-header {
                    background: var(--bg-card) !important;
                    border-bottom-color: var(--border) !important;
                }
                .lanzou-tabs {
                    background: var(--bg-card) !important;
                    border-bottom-color: var(--border) !important;
                }
                .file-upload-area {
                    border-color: var(--border) !important;
                }
                .file-upload-area:hover {
                    border-color: var(--primary) !important;
                    background: rgba(108, 140, 255, 0.05) !important;
                }
                .emoji-panel {
                    background: var(--bg-card) !important;
                    border-color: var(--border) !important;
                }
                .emoji-item:hover {
                    background: rgba(108, 140, 255, 0.1) !important;
                }
                     .tip-card {
            background: rgba(10, 14, 23, 0.6) !important;
            border-color: #1E2A3A !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        }
        .tip-card-header {
            border-bottom-color: #1E2A3A !important;
        }
        .tip-title {
            color: #E8EDF5 !important;
        }
        .tip-title i {
            color: #6C8CFF !important;
        }
        .tip-list li {
            color: #8899B0 !important;
        }
        .tip-list li i {
            color: #6C8CFF !important;
        }
        .tip-footer-note {
            color: #5A6A80 !important;
            border-top-color: #1E2A3A !important;
        }
        .tip-footer-note i {
            color: #6C8CFF !important;
        }

        
        .glinput-search input {
            background-color: #0A0E17 !important;
            border-color: #1E2A3A !important;
            color: #E8EDF5 !important;
        }
        .glinput-search input::placeholder {
            color: #5A6A80 !important;
        }
        .glinput-search input:hover {
            border-color: #2A3A4A !important;
        }
        .glinput-search input:focus {
            border-color: #6C8CFF !important;
            box-shadow: 0 0 0 4px rgba(108, 140, 255, 0.15) !important;
        }
        .glinput-search .search-icon {
            color: #5A6A80 !important;
        }
        .glinput-search input:focus + .search-icon {
            color: #6C8CFF !important;
        }
        .glinput-search .clear-btn {
            color: #5A6A80 !important;
        }
        .glinput-search .clear-btn:hover {
            color: #E8EDF5 !important;
        }
            `;
        } else if (themeKey === 'cyberpunk') {
            css = `
                
                .sidebar-left, .sidebar-conversations, .sidebar-right {
                    background-color: var(--bg-card) !important;
                    border-color: var(--border) !important;
                }
                .chat-header, .chat-input-area {
                    background-color: var(--bg-card) !important;
                    border-color: var(--border) !important;
                }
                .chat-messages {
                    background-color: var(--bg-global) !important;
                }
                .message-item.other .message-bubble {
                    background-color: rgba(0, 255, 204, 0.12) !important;
                    color: #FF00FF !important;
                    border: 1px solid rgba(0, 255, 204, 0.2) !important;
                    box-shadow: 0 0 15px rgba(0, 255, 204, 0.05) !important;
                }
                .message-item.self .message-bubble {
                    background-color: rgba(255, 0, 255, 0.20) !important;
                    color: #00FFCC !important;
                    border: 1px solid rgba(255, 0, 255, 0.2) !important;
                    box-shadow: 0 0 15px rgba(255, 0, 255, 0.05) !important;
                }
                .conversation-item.active {
                    background-color: rgba(255, 0, 255, 0.12) !important;
                    border-left: 2px solid #00FFCC !important;
                }
                .conversation-item:hover:not(.active) {
                    background-color: rgba(0, 255, 204, 0.06) !important;
                }
                .conversation-item .conv-name {
                    color: var(--text-primary) !important;
                }
                .conversation-item .conv-preview {
                    color: var(--text-secondary) !important;
                }
                .profile-card {
                    background-color: rgba(14, 20, 40, 0.8) !important;
                    border-color: var(--border) !important;
                    backdrop-filter: blur(10px) !important;
                }
                .profile-stats-bar {
                    background-color: rgba(0, 255, 204, 0.05) !important;
                    border: 1px solid rgba(0, 255, 204, 0.1) !important;
                }
                .profile-details .text-secondary {
                    background-color: rgba(0, 255, 204, 0.05) !important;
                    border: 1px solid rgba(255, 0, 255, 0.08) !important;
                }
                .profile-details .text-secondary:hover {
                    background-color: rgba(255, 0, 255, 0.08) !important;
                }
                .theme-modal-container {
                    background: var(--bg-card) !important;
                    border: 1px solid var(--border) !important;
                    box-shadow: 0 0 60px rgba(255, 0, 255, 0.15), 0 0 120px rgba(0, 255, 204, 0.05) !important;
                }
                .theme-card, .shape-card, .bg-card, .font-card, .fontcolor-card {
                    background: rgba(14, 20, 40, 0.7) !important;
                    border-color: var(--border) !important;
                    backdrop-filter: blur(5px) !important;
                }
                .theme-card:hover, .shape-card:hover, .bg-card:hover, .font-card:hover, .fontcolor-card:hover {
                    background: rgba(30, 40, 70, 0.8) !important;
                    border-color: #00FFCC !important;
                    box-shadow: 0 0 30px rgba(0, 255, 204, 0.1) !important;
                }
                .theme-card.active, .shape-card.active, .bg-card.active, .font-card.active, .fontcolor-card.active {
                    border-color: #FF00FF !important;
                    box-shadow: 0 0 30px rgba(255, 0, 255, 0.15) !important;
                }
                .settings-sidebar {
                    background: rgba(8, 12, 26, 0.8) !important;
                    border-color: var(--border) !important;
                }
                .settings-nav-item {
                    color: var(--text-secondary) !important;
                }
                .settings-nav-item:hover {
                    background: rgba(0, 255, 204, 0.08) !important;
                    color: var(--text-primary) !important;
                }
                .settings-nav-item.active {
                    background: rgba(255, 0, 255, 0.12) !important;
                    color: #FF00FF !important;
                }
                .settings-content {
                    background: var(--bg-card) !important;
                }
                .settings-section-title {
                    border-bottom-color: var(--border) !important;
                }
                .mail-drawer-panel {
                    background: var(--bg-card) !important;
                    border-left-color: var(--border) !important;
                }
                .mail-item {
                    border-bottom-color: var(--border) !important;
                }
                .mail-item:hover {
                    background: rgba(0, 255, 204, 0.06) !important;
                }
                .mail-item.unread {
                    background: rgba(255, 0, 255, 0.08) !important;
                }
                .contact-manager-panel {
                    background: var(--bg-card) !important;
                    border-color: var(--border) !important;
                }
                .contact-item {
                    border-bottom-color: var(--border) !important;
                }
                .contact-item:hover {
                    background: rgba(0, 255, 204, 0.06) !important;
                }
                .contact-item.selected {
                    background: rgba(255, 0, 255, 0.10) !important;
                    border-left-color: #FF00FF !important;
                }
                .contact-group {
                    border-color: var(--border) !important;
                }
                .group-header {
                    background: rgba(0, 255, 204, 0.04) !important;
                }
                .group-header:hover {
                    background: rgba(0, 255, 204, 0.08) !important;
                }
                .action-card {
                    background: rgba(14, 20, 40, 0.6) !important;
                    border-color: var(--border) !important;
                    backdrop-filter: blur(5px) !important;
                }
                .action-card:hover {
                    background: rgba(30, 40, 70, 0.7) !important;
                    border-color: #00FFCC !important;
                    box-shadow: 0 0 30px rgba(0, 255, 204, 0.08) !important;
                }
                .action-card .action-card-icon {
                    background: rgba(255, 0, 255, 0.12) !important;
                    color: #FF00FF !important;
                }
                .action-card:hover .action-card-icon {
                    background: #FF00FF !important;
                    color: #080C1A !important;
                }
                .chat-toolbar {
                    background-color: var(--toolbar-bg) !important;
                    border-bottom-color: var(--border) !important;
                }
                .chat-toolbar .toolbar-btn i {
                    color: var(--text-secondary) !important;
                }
                .chat-toolbar .toolbar-btn:hover {
                    background: rgba(0, 255, 204, 0.08) !important;
                }
                .chat-toolbar .toolbar-btn:hover i {
                    color: #00FFCC !important;
                }
                .chat-input {
                    background-color: var(--input-bg) !important;
                    border-color: var(--border) !important;
                    color: var(--text-primary) !important;
                }
                .chat-input:focus {
                    border-color: #00FFCC !important;
                    box-shadow: 0 0 20px rgba(0, 255, 204, 0.15) !important;
                }
                .settings-modal-box {
                    background: var(--bg-card) !important;
                    border: 1px solid var(--border) !important;
                    box-shadow: 0 0 60px rgba(255, 0, 255, 0.1) !important;
                }
                .settings-modal-header {
                    border-bottom-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .settings-modal-footer {
                    border-top-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .tab-item.active::after {
                    background-color: #00FFCC !important;
                    box-shadow: 0 0 20px rgba(0, 255, 204, 0.3) !important;
                }
                .tab-item:hover {
                    color: var(--text-primary) !important;
                }
                .switch-toggle {
                    background-color: #1A2A3A !important;
                }
                .switch-toggle.active {
                    background-color: #00FFCC !important;
                    box-shadow: 0 0 20px rgba(0, 255, 204, 0.2) !important;
                }
                .theme-tab.active {
                    color: #00FFCC !important;
                    border-bottom-color: #00FFCC !important;
                }
                .theme-tab:hover {
                    color: var(--text-primary) !important;
                }
                .theme-tabs {
                    border-bottom-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .theme-modal-header {
                    border-bottom-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .theme-modal-footer {
                    border-top-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .theme-close-btn {
                    background: #FF00FF !important;
                }
                .theme-close-btn:hover {
                    background: #CC00CC !important;
                }
                .profile-modal-container {
                    background: var(--bg-card) !important;
                    border: 1px solid var(--border) !important;
                    box-shadow: 0 0 60px rgba(255, 0, 255, 0.1) !important;
                }
                .profile-modal-header {
                    border-bottom-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .profile-modal-footer {
                    border-top-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .profile-tabs {
                    border-bottom-color: var(--border) !important;
                    background: var(--bg-card) !important;
                }
                .profile-tab.active {
                    color: #00FFCC !important;
                    border-bottom-color: #00FFCC !important;
                }
                .profile-field-item {
                    background: rgba(0, 255, 204, 0.04) !important;
                    border: 1px solid rgba(0, 255, 204, 0.06) !important;
                }
                .profile-stat-card {
                    background: rgba(0, 255, 204, 0.04) !important;
                    border: 1px solid rgba(0, 255, 204, 0.06) !important;
                }
                .profile-avatar-section {
                    background: rgba(0, 255, 204, 0.04) !important;
                    border: 1px solid rgba(0, 255, 204, 0.06) !important;
                }
                .profile-btn-primary {
                    background: #FF00FF !important;
                }
                .profile-btn-primary:hover {
                    background: #CC00CC !important;
                }
                .notice-card {
                    background: rgba(14, 20, 40, 0.6) !important;
                    border-color: var(--border) !important;
                    backdrop-filter: blur(5px) !important;
                }
                .notice-card:hover {
                    background: rgba(30, 40, 70, 0.7) !important;
                    border-color: #00FFCC !important;
                }
                .pagination-bar {
                    background: var(--bg-card) !important;
                    border-top-color: var(--border) !important;
                }
                .pagination-bar button {
                    background: rgba(14, 20, 40, 0.6) !important;
                    border-color: var(--border) !important;
                    color: var(--text-secondary) !important;
                }
                .pagination-bar button:hover:not(:disabled) {
                    background: rgba(0, 255, 204, 0.1) !important;
                    border-color: #00FFCC !important;
                    color: #00FFCC !important;
                }
                .notice-modal-box {
                    background: var(--bg-card) !important;
                    border: 1px solid var(--border) !important;
                }
                .notice-modal-header {
                    background: var(--bg-card) !important;
                    border-bottom-color: var(--border) !important;
                }
                .notice-modal-body {
                    background: var(--bg-card) !important;
                }
                .custom-dialog-box {
                    background: var(--bg-card) !important;
                    border: 1px solid var(--border) !important;
                }
                .custom-dialog-header {
                    border-bottom-color: var(--border) !important;
                }
                .custom-dialog-btn-primary {
                    background: #FF00FF !important;
                }
                .custom-dialog-btn-primary:hover {
                    background: #CC00CC !important;
                }
                .lanzou-upload-container {
                    background: var(--bg-card) !important;
                    border: 1px solid var(--border) !important;
                }
                .lanzou-upload-header {
                    background: var(--bg-card) !important;
                    border-bottom-color: var(--border) !important;
                }
                .lanzou-tabs {
                    background: var(--bg-card) !important;
                    border-bottom-color: var(--border) !important;
                }
                .lanzou-tab-item.active {
                    color: #00FFCC !important;
                    border-bottom-color: #00FFCC !important;
                }
                .file-upload-area {
                    border-color: var(--border) !important;
                }
                .file-upload-area:hover {
                    border-color: #00FFCC !important;
                    background: rgba(0, 255, 204, 0.05) !important;
                    box-shadow: 0 0 30px rgba(0, 255, 204, 0.05) !important;
                }
                .btn-primary {
                    background: #FF00FF !important;
                }
                .btn-primary:hover:not(:disabled) {
                    background: #CC00CC !important;
                }
                .emoji-panel {
                    background: var(--bg-card) !important;
                    border-color: var(--border) !important;
                    backdrop-filter: blur(10px) !important;
                }
                .emoji-item:hover {
                    background: rgba(0, 255, 204, 0.1) !important;
                }
                .contact-side-panel {
                    background: var(--bg-card) !important;
                    border-left-color: var(--border) !important;
                }
                .contact-side-header {
                    background: var(--bg-card) !important;
                    border-bottom-color: var(--border) !important;
                }
                .btn-chat {
                    background: #FF00FF !important;
                }
                .btn-chat:hover {
                    background: #CC00CC !important;
                }
                .btn-secondary {
                    background: rgba(0, 255, 204, 0.08) !important;
                    border-color: var(--border) !important;
                    color: var(--text-secondary) !important;
                }
                .btn-secondary:hover {
                    background: rgba(0, 255, 204, 0.15) !important;
                    color: #00FFCC !important;
                }
                .tip-card {
                    background: rgba(14, 20, 40, 0.6) !important;
                    border-color: var(--border) !important;
                    backdrop-filter: blur(5px) !important;
                }
                .tip-card-header {
                    border-bottom-color: var(--border) !important;
                }
                .modify-note-btn {
                    background: rgba(255, 0, 255, 0.10) !important;
                    border-color: rgba(255, 0, 255, 0.2) !important;
                    color: #FF00FF !important;
                }
                .modify-note-btn:hover {
                    background: rgba(255, 0, 255, 0.20) !important;
                    border-color: #FF00FF !important;
                    color: #00FFCC !important;
                    box-shadow: 0 0 40px rgba(255, 0, 255, 0.15) !important;
                }
                    .tip-card {
            background: rgba(14, 20, 40, 0.6) !important;
            border-color: rgba(0, 255, 204, 0.15) !important;
            backdrop-filter: blur(5px) !important;
            box-shadow: 0 0 30px rgba(255, 0, 255, 0.05) !important;
        }
        .tip-card-header {
            border-bottom-color: rgba(0, 255, 204, 0.1) !important;
        }
        .tip-title {
            color: #00FFCC !important;
        }
        .tip-title i {
            color: #FF00FF !important;
        }
        .tip-list li {
            color: rgba(255, 0, 255, 0.7) !important;
        }
        .tip-list li i {
            color: #00FFCC !important;
        }
        .tip-footer-note {
            color: rgba(255, 0, 255, 0.5) !important;
            border-top-color: rgba(0, 255, 204, 0.1) !important;
        }
        .tip-footer-note i {
            color: #00FFCC !important;
        }

        
        .glinput-search input {
            background-color: rgba(8, 12, 26, 0.8) !important;
            border-color: rgba(0, 255, 204, 0.2) !important;
            color: #00FFCC !important;
            box-shadow: 0 0 20px rgba(255, 0, 255, 0.03) !important;
        }
        .glinput-search input::placeholder {
            color: rgba(255, 0, 255, 0.4) !important;
        }
        .glinput-search input:hover {
            border-color: rgba(255, 0, 255, 0.3) !important;
            box-shadow: 0 0 30px rgba(255, 0, 255, 0.05) !important;
        }
        .glinput-search input:focus {
            border-color: #00FFCC !important;
            box-shadow: 0 0 0 4px rgba(0, 255, 204, 0.08), 0 0 40px rgba(0, 255, 204, 0.05) !important;
        }
        .glinput-search .search-icon {
            color: rgba(255, 0, 255, 0.4) !important;
        }
        .glinput-search input:focus + .search-icon {
            color: #00FFCC !important;
        }
        .glinput-search .clear-btn {
            color: rgba(255, 0, 255, 0.4) !important;
        }
        .glinput-search .clear-btn:hover {
            color: #00FFCC !important;
        }
            `;
        } else {

            css = '';
        }

        styleEl.textContent = css;
    }




    const FONT_SCHEMES = {
        default: {
            name: '系统默认',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        large: {
            name: '大字号',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            extraStyle: '.message-text, .chat-input, .conv-name { font-size: 16px; }'
        },
        songti: {
            name: '优雅宋体',
            fontFamily: '"宋体", "SimSun", "Times New Roman", serif'
        },
        heiti: {
            name: '现代黑体',
            fontFamily: '"Microsoft YaHei", "PingFang SC", "Helvetica Neue", sans-serif'
        }
    };

    function applyTheme(themeKey) {
        const theme = THEMES[themeKey];
        if (!theme) return;
        const root = document.documentElement;
        originalThemeColors = { ...theme.colors };

        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        const themeIcon = document.querySelector('.customize-theme-icon');
        if (themeIcon) themeIcon.innerHTML = `<i class="${theme.icon}"></i>`;


        applyThemeAdaptations(themeKey);

        if (currentFontColorScheme !== 'default') {
            applyFontColorScheme(currentFontColorScheme);
        }
    }

    function applyFontColorScheme(schemeKey) {
        const scheme = FONT_COLOR_SCHEMES[schemeKey];
        if (!scheme) return;

        const root = document.documentElement;

        if (schemeKey === 'default') {
            const theme = THEMES[currentConfig.theme];
            if (theme) {
                Object.entries(theme.colors).forEach(([key, value]) => {
                    root.style.setProperty(key, value);
                });
            }

            applyThemeAdaptations(currentConfig.theme);
        } else {
            Object.entries(scheme.colors).forEach(([key, value]) => {
                root.style.setProperty(key, value);
            });
        }

        currentFontColorScheme = schemeKey;
    }

    function applyBubbleShape(shapeKey) {
        const shape = BUBBLE_SHAPES[shapeKey];
        if (!shape) return;

        const styleId = 'dynamic-bubble-style';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        let css = '';

        css += `.message-item.self .message-bubble {`;
        Object.entries(shape.self).forEach(([prop, val]) => {
            css += `${prop}: ${val} !important;`;
        });
        css += `}`;

        css += `.message-item.other .message-bubble {`;
        Object.entries(shape.other).forEach(([prop, val]) => {
            css += `${prop}: ${val} !important;`;
        });
        css += `}`;

        css += `
            .message-item.self .message-bubble {
                color: var(--msg-self-text) !important;
            }
            .message-item.other .message-bubble {
                color: var(--msg-other-text) !important;
            }
        `;

        styleEl.textContent = css;
    }

    function applyDynamicBackground(bgKey) {
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages) return;


        const bg = DYNAMIC_BACKGROUNDS[currentConfig.dynamicBg];
        if (bg && bg.cleanup) {
            bg.cleanup(chatMessages);
        }


        chatMessages.style.position = '';
        chatMessages.style.overflow = '';
        chatMessages.style.backdropFilter = '';
        chatMessages.style.background = '';
        chatMessages.style.zIndex = '';

        const newBg = DYNAMIC_BACKGROUNDS[bgKey];
        if (newBg && bgKey !== 'none') {
            newBg.apply(chatMessages);
        }
    }

    function applyFontScheme(schemeKey, fontSize) {
        const scheme = FONT_SCHEMES[schemeKey];
        if (!scheme) return;

        const styleId = 'dynamic-font-style';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        let css = `body, .chat-messages, .chat-input, .message-text, .conv-name, .conv-preview, .profile-name { font-family: ${scheme.fontFamily}; }`;
        css += `.message-text, .chat-input, .conv-preview { font-size: ${fontSize}px; }`;
        if (scheme.extraStyle) css += scheme.extraStyle;

        styleEl.textContent = css;

        const fontSizeValue = document.querySelector('.font-size-value');
        if (fontSizeValue) fontSizeValue.textContent = `${fontSize}px`;
    }




    function loadSavedConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                currentConfig = { ...currentConfig, ...parsed };
                if (parsed.fontColor) {
                    currentFontColorScheme = parsed.fontColor;
                }
            }
        } catch (e) { console.warn('加载主题配置失败', e); }
    }

    function saveConfig() {
        const configToSave = { ...currentConfig, fontColor: currentFontColorScheme };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
    }

    function applyAllStyles() {
        applyTheme(currentConfig.theme);
        applyBubbleShape(currentConfig.bubbleShape);
        applyDynamicBackground(currentConfig.dynamicBg);
        applyFontScheme(currentConfig.fontScheme, currentConfig.fontSize);
        applyFontColorScheme(currentFontColorScheme);
    }




    function createThemeModal() {
        const existingModal = document.getElementById('themeSystemModal');
        if (existingModal) existingModal.remove();

        const modalMask = document.createElement('div');
        modalMask.id = 'themeSystemModal';
        modalMask.className = 'theme-modal-mask';
        let themesHtml = '';
        for (const [key, theme] of Object.entries(THEMES)) {
            const isActive = currentConfig.theme === key;
            themesHtml += `
                <div class="theme-card ${isActive ? 'active' : ''}" data-theme="${key}">
                    <div class="theme-card-preview" style="background: ${theme.colors['--primary']}20">
                        <i class="${theme.icon}"></i>
                    </div>
                    <div class="theme-card-name">${theme.name}</div>
                    <div class="theme-card-desc">${theme.description}</div>
                    ${isActive ? '<div class="theme-card-badge"><i class="fas fa-check-circle"></i> 当前</div>' : ''}
                </div>
            `;
        }

        let shapesHtml = '';
        for (const [key, shape] of Object.entries(BUBBLE_SHAPES)) {
            const isActive = currentConfig.bubbleShape === key;
            shapesHtml += `
                <div class="shape-card ${isActive ? 'active' : ''}" data-shape="${key}">
                    <div class="shape-preview">
                        <div class="shape-preview-bubble shape-preview-self">我</div>
                        <div class="shape-preview-bubble shape-preview-other">对方</div>
                    </div>
                    <div class="shape-name">${shape.name}</div>
                    <div class="shape-desc">${shape.description}</div>
                </div>
            `;
        }

        let bgHtml = '';
        for (const [key, bg] of Object.entries(DYNAMIC_BACKGROUNDS)) {
            const isActive = currentConfig.dynamicBg === key;
            bgHtml += `
                <div class="bg-card ${isActive ? 'active' : ''}" data-dynamicbg="${key}">
                    <div class="bg-card-preview ${key === 'none' ? 'bg-default' : ''}" data-bg-type="${key}">
                        ${key === 'waves' ? '<div class="wave-preview"></div>' : ''}
                        ${key === 'stars' ? '<div class="stars-preview"><span>✨</span><span>⭐</span><span>🌟</span></div>' : ''}
                        ${key === 'blur' ? '<div class="blur-preview"></div>' : ''}
                        ${key === 'none' ? '<i class="fas fa-ban"></i>' : ''}
                    </div>
                    <div class="bg-name">${bg.name}</div>
                    <div class="bg-desc">${bg.description}</div>
                </div>
            `;
        }

        let fontsHtml = '';
        for (const [key, font] of Object.entries(FONT_SCHEMES)) {
            const isActive = currentConfig.fontScheme === key;
            fontsHtml += `
                <div class="font-card ${isActive ? 'active' : ''}" data-font="${key}">
                    <div class="font-preview" style="font-family: ${font.fontFamily}">
                        你好，世界！
                    </div>
                    <div class="font-name">${font.name}</div>
                </div>
            `;
        }

        let fontColorHtml = '';
        for (const [key, scheme] of Object.entries(FONT_COLOR_SCHEMES)) {
            const isActive = currentFontColorScheme === key;
            fontColorHtml += `
                <div class="fontcolor-card ${isActive ? 'active' : ''}" data-fontcolor="${key}">
                    <div class="fontcolor-preview" style="color: ${key === 'default' ? 'var(--text-primary)' : scheme.colors?.['--text-primary'] || '#333'}">
                        <span class="preview-large">Aa</span>
                        <span class="preview-text">文字颜色预览</span>
                    </div>
                    <div class="fontcolor-name">${scheme.name}</div>
                    <div class="fontcolor-desc">${scheme.description}</div>
                </div>
            `;
        }

        modalMask.innerHTML = `
            <div class="theme-modal-container">
                <div class="theme-modal-header">
                    <h3><i class="fas fa-palette"></i> 个性化定制</h3>
                    <button class="theme-modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="theme-modal-body">
                    <div class="theme-tabs">
                        <div class="theme-tab active" data-tab="themes"><i class="fas fa-paint-brush"></i> 主题皮肤</div>
                        <div class="theme-tab" data-tab="bubbles"><i class="fas fa-comment-dots"></i> 气泡形状</div>
                        <div class="theme-tab" data-tab="background"><i class="fas fa-image"></i> 动态背景</div>
                        <div class="theme-tab" data-tab="fonts"><i class="fas fa-font"></i> 字体方案</div>
                        <div class="theme-tab" data-tab="fontcolor"><i class="fas fa-fill-drip"></i> 字体颜色</div>
                    </div>
                    <div class="theme-content">
                        <div class="theme-panel active" id="panel-themes">
                            <div class="theme-section-title">
                                <i class="fas fa-star"></i> 精选主题
                                <span class="section-desc">5款精心设计，一键切换整体风格</span>
                            </div>
                            <div class="theme-grid">
                                ${themesHtml}
                            </div>
                        </div>
                        <div class="theme-panel" id="panel-bubbles">
                            <div class="theme-section-title">
                                <i class="fas fa-comment-dots"></i> 气泡形状
                                <span class="section-desc">独立于主题，自由搭配</span>
                            </div>
                            <div class="shape-grid">
                                ${shapesHtml}
                            </div>
                        </div>
                        <div class="theme-panel" id="panel-background">
                            <div class="theme-section-title">
                                <i class="fas fa-water"></i> 动态背景
                                <span class="section-desc">让聊天界面更生动</span>
                            </div>
                            <div class="bg-grid">
                                ${bgHtml}
                            </div>
                        </div>
                        <div class="theme-panel" id="panel-fonts">
                            <div class="theme-section-title">
                                <i class="fas fa-font"></i> 字体方案
                                <span class="section-desc">调整阅读体验</span>
                            </div>
                            <div class="font-grid">
                                ${fontsHtml}
                            </div>
                            <div class="font-size-control">
                                <label>字号大小：</label>
                                <input type="range" id="fontSizeSlider" min="12" max="20" value="${currentConfig.fontSize}" step="1">
                                <span class="font-size-value">${currentConfig.fontSize}px</span>
                            </div>
                        </div>
                        <div class="theme-panel" id="panel-fontcolor">
                            <div class="theme-section-title">
                                <i class="fas fa-fill-drip"></i> 字体颜色方案
                                <span class="section-desc">调整文字颜色，提高可读性</span>
                            </div>
                            <div class="fontcolor-grid">
                                ${fontColorHtml}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="theme-modal-footer">
                    <button class="theme-reset-btn"><i class="fas fa-undo-alt"></i> 恢复默认</button>
                    <button class="theme-close-btn">完成</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalMask);
        bindModalEvents(modalMask);
    }

    function bindModalEvents(modalMask) {
        const closeBtn = modalMask.querySelector('.theme-modal-close');
        const closeBtn2 = modalMask.querySelector('.theme-close-btn');
        const resetBtn = modalMask.querySelector('.theme-reset-btn');

        const closeModal = () => modalMask.remove();
        closeBtn.addEventListener('click', closeModal);
        closeBtn2.addEventListener('click', closeModal);
        modalMask.addEventListener('click', (e) => {
            if (e.target === modalMask) closeModal();
        });

        const tabs = modalMask.querySelectorAll('.theme-tab');
        const panels = modalMask.querySelectorAll('.theme-panel');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                panels.forEach(panel => panel.classList.remove('active'));
                const targetPanel = modalMask.querySelector(`#panel-${targetTab}`);
                if (targetPanel) targetPanel.classList.add('active');
            });
        });

        const themeCards = modalMask.querySelectorAll('.theme-card');
        themeCards.forEach(card => {
            card.addEventListener('click', () => {
                const themeKey = card.dataset.theme;
                if (themeKey) {
                    themeCards.forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    currentConfig.theme = themeKey;
                    saveConfig();
                    applyTheme(themeKey);
                    applyBubbleShape(currentConfig.bubbleShape);

                    themeCards.forEach(c => {
                        const badge = c.querySelector('.theme-card-badge');
                        if (badge) badge.remove();
                    });
                    const badge = document.createElement('div');
                    badge.className = 'theme-card-badge';
                    badge.innerHTML = '<i class="fas fa-check-circle"></i> 当前';
                    card.appendChild(badge);
                }
            });
        });

        const shapeCards = modalMask.querySelectorAll('.shape-card');
        shapeCards.forEach(card => {
            card.addEventListener('click', () => {
                const shapeKey = card.dataset.shape;
                if (shapeKey) {
                    shapeCards.forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    currentConfig.bubbleShape = shapeKey;
                    saveConfig();
                    applyBubbleShape(shapeKey);
                }
            });
        });

        const bgCards = modalMask.querySelectorAll('.bg-card');
        bgCards.forEach(card => {
            card.addEventListener('click', () => {
                const bgKey = card.dataset.dynamicbg;
                if (bgKey !== undefined) {
                    bgCards.forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    currentConfig.dynamicBg = bgKey;
                    saveConfig();
                    applyDynamicBackground(bgKey);
                }
            });
        });

        const fontCards = modalMask.querySelectorAll('.font-card');
        fontCards.forEach(card => {
            card.addEventListener('click', () => {
                const fontKey = card.dataset.font;
                if (fontKey) {
                    fontCards.forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    currentConfig.fontScheme = fontKey;
                    saveConfig();
                    applyFontScheme(fontKey, currentConfig.fontSize);
                }
            });
        });

        const fontColorCards = modalMask.querySelectorAll('.fontcolor-card');
        fontColorCards.forEach(card => {
            card.addEventListener('click', () => {
                const colorKey = card.dataset.fontcolor;
                if (colorKey) {
                    fontColorCards.forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    currentFontColorScheme = colorKey;
                    saveConfig();
                    applyFontColorScheme(colorKey);
                    applyBubbleShape(currentConfig.bubbleShape);
                }
            });
        });

        const fontSizeSlider = modalMask.querySelector('#fontSizeSlider');
        if (fontSizeSlider) {
            fontSizeSlider.addEventListener('input', (e) => {
                const newSize = parseInt(e.target.value);
                currentConfig.fontSize = newSize;
                saveConfig();
                applyFontScheme(currentConfig.fontScheme, newSize);
                const sizeValue = modalMask.querySelector('.font-size-value');
                if (sizeValue) sizeValue.textContent = `${newSize}px`;
            });
        }

        resetBtn.addEventListener('click', () => {
            currentConfig = {
                theme: 'modern',
                bubbleShape: 'rounded',
                dynamicBg: 'none',
                fontScheme: 'default',
                fontSize: 14
            };
            currentFontColorScheme = 'default';
            saveConfig();
            applyAllStyles();
            modalMask.remove();
            createThemeModal();
        });
    }




    function initThemeSystem() {
        loadSavedConfig();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                applyAllStyles();
                bindThemeButton();
            });
        } else {
            applyAllStyles();
            bindThemeButton();
        }
    }

    function bindThemeButton() {
        let themeBtn = document.getElementById('customized_delver');
        if (themeBtn) {
            themeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                createThemeModal();
            });
        }
    }

    window.ThemeSystem = {
        init: initThemeSystem,
        applyTheme: applyTheme,
        applyBubbleShape: applyBubbleShape,
        applyDynamicBackground: applyDynamicBackground,
        applyFontScheme: applyFontScheme,
        applyFontColorScheme: applyFontColorScheme,
        getConfig: () => ({ ...currentConfig, fontColor: currentFontColorScheme })
    };

    initThemeSystem();
})();