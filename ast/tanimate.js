class Blog3DAnimation {
  defaultOptions = {
    titleText: '墨·文',                    
    sloganText: '墨韵书香 · 心随笔动',     
    particleCount: {
      mobile: 250,                         
      desktop: 350
    },
    titleColors: [
      '#2C1810',   
      '#5D4037',   
      '#795548',  
      '#3E2723'    
    ],
    particleColors: [                      
      '#2C1810', '#3E2723', '#4E342E', '#5D4037', '#6D4C41',
      '#795548', '#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8'
    ],
    animationDuration: {
      mobile: 6500,                       
      desktop: 7500
    },
    contentSelector: '#blog-content',
    inkTexture: 'data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M30 0c-5 10-15 15-25 20 10 5 20 10 25 20 5-10 15-15 25-20-10-5-20-10-25-20z" fill="%232C1810" opacity="0.15"/%3E%3C/svg%3E'
  };

  constructor(options = {}) {
    this.options = { ...this.defaultOptions, ...options };
    this.animationCleanupTimer = null;
    this.isMobile = window.innerWidth < 768;
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('blog-3d-animation-style')) return;

    const style = document.createElement('style');
    style.id = 'blog-3d-animation-style';
    style.textContent = `
      @layer utilities {
        .perspective-3000 { perspective: 3000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }

       
        .ink-glow {
          text-shadow: 
            0 0 15px rgba(44, 24, 16, 0.8),
            0 0 30px rgba(93, 64, 55, 0.6),
            0 0 45px rgba(121, 85, 72, 0.4),
            0 0 60px rgba(62, 39, 35, 0.2);
        }


        .ink-particle {
          position: absolute;
          border-radius: 50%;
          opacity: 0;
          filter: blur(1.5px);
          background-image: url("${this.options.inkTexture}");
          background-size: cover;
          box-shadow: 
            inset 0 0 10px rgba(44, 24, 16, 0.6),
            0 0 12px rgba(44, 24, 16, 0.4);
          animation: ink-flow 9s cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
          pointer-events: none;
          z-index: 1;
        }


        .rice-paper-bg {
          background: 
            linear-gradient(135deg, #FFF8F0 0%, #F5EDE6 100%),
            url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h100v100H0z' fill='none' stroke='%23D7CCC8' stroke-width='0.5' opacity='0.3'/%3E%3C/svg%3E");
          background-size: cover, 100px 100px;
          animation: paper-shimmer 20s linear infinite;
        }

      
        .brush-shadow {
          text-shadow: 
            0 1px 0 #B0A599,
            0 2px 0 #A59387,
            0 3px 0 #9A8576,
            0 4px 0 #8F7765,
            0 5px 0 #846954,
            0 6px 1px rgba(0,0,0,0.1),
            0 0 10px rgba(44,24,16,0.3),
            0 2px 5px rgba(44,24,16,0.4),
            0 8px 15px rgba(44,24,16,0.2),
            0 15px 25px rgba(44,24,16,0.15);
        }

 
        .char-wrapper { 
          display: inline-block; 
          position: relative;
          font-family: "Noto Serif SC", serif;
          font-weight: 700;
        }

 
        .seal-print {
          position: absolute;
          width: 120px;
          height: 120px;
          border: 3px solid #8B4513;
          border-radius: 5px;
          opacity: 0;
          transform: rotate(15deg) scale(0.8);
          background: rgba(139, 69, 19, 0.05);
          mix-blend-mode: multiply;
        }
      }

      
      @keyframes ink-flow {
        0% {
          opacity: 0;
          transform: translate3d(var(--start-x), var(--start-y), var(--start-z)) scale(0.1);
          filter: blur(3px) brightness(0.5);
        }
        15% { opacity: 0.9; filter: blur(2px) brightness(1.2); }
        40% { transform: translate3d(var(--path-1-x), var(--path-1-y), var(--path-1-z)) scale(var(--scale-1)); }
        65% { transform: translate3d(var(--path-2-x), var(--path-2-y), var(--path-2-z)) scale(var(--scale-2)); }
        85% { opacity: 0.7; transform: translate3d(var(--path-3-x), var(--path-3-y), var(--path-3-z)) scale(var(--scale-3)); }
        100% {
          opacity: 0;
          transform: translate3d(var(--end-x), var(--end-y), var(--end-z)) scale(0.05);
          filter: blur(4px) brightness(0.3);
        }
      }

 
      @keyframes paper-shimmer {
        0% { background-position: 0 0, 0 0; }
        100% { background-position: 100px 100px, 100px 100px; }
      }

   
      @keyframes scroll-unfold {
        0% {
          opacity: 0;
          transform: translateY(100px) rotateX(60deg) scaleY(0.3);
          filter: brightness(0);
        }
        70% {
          opacity: 1;
          transform: translateY(-10px) rotateX(0deg) scaleY(1.05);
          filter: brightness(1.2);
        }
        100% {
          opacity: 1;
          transform: translateY(0) rotateX(0deg) scaleY(1);
          filter: brightness(1);
        }
      }

      
      @keyframes brush-write {
        0% {
          opacity: 0;
          transform: translate3d(var(--char-start-x), var(--char-start-y), var(--char-start-z)) 
                    scale(var(--char-start-scale)) skewX(10deg);
          filter: blur(5px) brightness(0);
        }
        60% {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1.05) skewX(0deg);
          filter: blur(0) brightness(1.5);
        }
        80% { transform: scale(1.02); }
        100% {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
          filter: blur(0) brightness(1);
        }
      }

     
      @keyframes scroll-roll {
        0% { opacity: 1; transform: scale(1) translateY(0); }
        100% { opacity: 0; transform: scale(0.95) translateY(-50px); visibility: hidden; }
      }

     
      @keyframes content-float {
        0% { opacity: 0; transform: translateY(60px) rotate3d(1, 0, 0, 10deg); }
        100% { opacity: 1; transform: translateY(0) rotate3d(0, 0, 0, 0deg); }
      }

   
      #blog-animation-loader {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        font-family: "Noto Serif SC", "SimSun", serif;
      }

     
      #blog-animation-title {
        font-size: clamp(3.5rem, 10vw, 8rem);
        font-weight: 900;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: clamp(0.8rem, 2vw, 1.5rem);
        letter-spacing: 0.1em;
      }

     
      #blog-animation-slogan {
        font-size: clamp(1rem, 3vw, 1.8rem);
        color: #5D4037;
        margin-top: 2rem;
        letter-spacing: 0.8em;
        font-weight: 300;
        opacity: 0;
        text-shadow: 0 2px 8px rgba(93, 64, 55, 0.3);
      }

  
      .blog-content-animate {
        animation: content-float 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        animation-delay: 0.3s;
        opacity: 0;
      }
    `;
    document.head.appendChild(style);
  }

  createAnimationDOM() {
    if (document.getElementById('blog-animation-loader')) return;

    const loader = document.createElement('div');
    loader.id = 'blog-animation-loader';
    loader.className = 'perspective-3000 preserve-3d rice-paper-bg';

    const particleContainer = document.createElement('div');
    particleContainer.id = 'blog-animation-particles';
    particleContainer.className = 'absolute w-full h-full pointer-events-none';

    const textCenter = document.createElement('div');
    textCenter.className = 'preserve-3d text-center backface-hidden';

    const title = document.createElement('h1');
    title.id = 'blog-animation-title';
    title.className = 'ink-glow brush-shadow';

    const slogan = document.createElement('p');
    slogan.id = 'blog-animation-slogan';
    slogan.textContent = this.options.sloganText;

    
    const seal = document.createElement('div');
    seal.className = 'seal-print';
    seal.style.bottom = '20%';
    seal.style.right = '15%';

    textCenter.appendChild(title);
    textCenter.appendChild(slogan);
    loader.appendChild(particleContainer);
    loader.appendChild(textCenter);
    loader.appendChild(seal);
    document.body.appendChild(loader);

    const content = document.querySelector(this.options.contentSelector);
    if (content) {
      content.classList.add('blog-content-animate');
      content.style.display = 'none';
    }
  }

  createConvergingChars() {
    const title = document.getElementById('blog-animation-title');
    if (!title) return;

    const chars = this.options.titleText.split('');
    title.innerHTML = '';

    chars.forEach((char, index) => {
      const charWrapper = document.createElement('span');
      charWrapper.className = 'char-wrapper';
      charWrapper.textContent = char;

      
      const startPos = {
        x: (Math.random() - 0.5) * 1800,
        y: (Math.random() - 0.5) * 1200,
        z: (Math.random() - 0.5) * 800
      };

      const startScale = Math.random() * 8 + 0.3;
      const startSkew = Math.random() * 20 - 10;

      charWrapper.style.setProperty('--char-start-x', `${startPos.x}px`);
      charWrapper.style.setProperty('--char-start-y', `${startPos.y}px`);
      charWrapper.style.setProperty('--char-start-z', `${startPos.z}px`);
      charWrapper.style.setProperty('--char-start-scale', startScale);
      charWrapper.style.setProperty('--char-start-skew', `${startSkew}deg`);

      charWrapper.style.color = this.options.titleColors[index % this.options.titleColors.length];

      
      charWrapper.style.animation = 
        `brush-write ${1.8 + index * 0.4}s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`;
      charWrapper.style.animationDelay = `${index * 0.25}s`;

      title.appendChild(charWrapper);
    });
  }

  createInkParticles() {
    const container = document.getElementById('blog-animation-particles');
    if (!container) return;

    const count = this.isMobile ? this.options.particleCount.mobile : this.options.particleCount.desktop;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.classList.add('ink-particle');

      
      let size;
      const sizeRand = Math.random();
      if (sizeRand < 0.05) size = Math.random() * 18 + 12;   
      else if (sizeRand < 0.2) size = Math.random() * 10 + 6; 
      else size = Math.random() * 5 + 2;                    

      const color = this.options.particleColors[Math.floor(Math.random() * this.options.particleColors.length)];
      const delay = Math.random() * 1.5;

    
      const pathPoints = {
        start: {
          x: centerX + (Math.random() - 0.5) * windowWidth * 1.8,
          y: centerY + (Math.random() - 0.5) * windowHeight * 1.8,
          z: (Math.random() - 0.5) * 900
        },
        path1: {
          x: centerX + (Math.random() - 0.5) * windowWidth * 1.2,
          y: centerY + (Math.random() - 0.5) * windowHeight * 1.2,
          z: (Math.random() - 0.5) * 600,
          scale: Math.random() * 0.8 + 0.4
        },
        path2: {
          x: centerX + (Math.random() - 0.5) * windowWidth * 0.6,
          y: centerY + (Math.random() - 0.5) * windowHeight * 0.6,
          z: (Math.random() - 0.5) * 300,
          scale: Math.random() * 1.2 + 0.6
        },
        path3: {
          x: centerX + (Math.random() - 0.5) * windowWidth * 0.2,
          y: centerY + (Math.random() - 0.5) * windowHeight * 0.2,
          z: (Math.random() - 0.5) * 150,
          scale: Math.random() * 0.9 + 0.3
        },
        end: {
          x: centerX + (Math.random() - 0.5) * 30,
          y: centerY + (Math.random() - 0.5) * 30,
          z: (Math.random() - 0.5) * 1000
        }
      };

      
      Object.entries(pathPoints).forEach(([key, value]) => {
        if (key === 'start' || key === 'end') {
          particle.style.setProperty(`--${key}-x`, `${value.x}px`);
          particle.style.setProperty(`--${key}-y`, `${value.y}px`);
          particle.style.setProperty(`--${key}-z`, `${value.z}px`);
        } else {
          particle.style.setProperty(`--${key}-x`, `${value.x}px`);
          particle.style.setProperty(`--${key}-y`, `${value.y}px`);
          particle.style.setProperty(`--${key}-z`, `${value.z}px`);
          particle.style.setProperty(`--scale-${key.slice(-1)}`, value.scale);
        }
      });

      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = color;
      particle.style.animationDelay = `${delay}s`;
      particle.style.transformOrigin = 'center center';

      container.appendChild(particle);
    }
  }

  cleanupAnimationResources() {
    if (this.animationCleanupTimer) clearTimeout(this.animationCleanupTimer);

    const loader = document.getElementById('blog-animation-loader');
    if (loader) {
      loader.style.animation = 'scroll-roll 1.2s ease forwards';
      setTimeout(() => {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 1200);
    }

    const content = document.querySelector(this.options.contentSelector);
    if (content) {
      content.style.display = 'block';
    }


  }

  start() {
    this.createAnimationDOM();
    this.createConvergingChars();
    this.createInkParticles();

  
    const title = document.getElementById('blog-animation-title');
    if (title) {
      title.style.animation = 'scroll-unfold 2.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards';
      title.style.animationDelay = '0.5s';
    }

  
    const slogan = document.getElementById('blog-animation-slogan');
    if (slogan) {
      setTimeout(() => {
        slogan.style.animation = 'content-float 2s ease forwards';
      }, 2000);
    }

  
    const seal = document.querySelector('.seal-print');
    if (seal) {
      setTimeout(() => {
        seal.style.transition = 'opacity 1.5s ease, transform 1.5s ease';
        seal.style.opacity = '0.6';
        seal.style.transform = 'rotate(-5deg) scale(1)';
      }, 3000);
    }

    const totalDuration = this.isMobile ? this.options.animationDuration.mobile : this.options.animationDuration.desktop;
    this.animationCleanupTimer = setTimeout(() => {
      this.cleanupAnimationResources();
    }, totalDuration);
  }
}

window.Blog3DAnimation = Blog3DAnimation;