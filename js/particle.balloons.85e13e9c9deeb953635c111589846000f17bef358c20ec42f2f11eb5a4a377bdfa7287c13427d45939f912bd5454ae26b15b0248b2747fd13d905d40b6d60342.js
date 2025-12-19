/**
 * 粒子动画特效，由 xAI grok-beta 模型生成
 * @author 0x5c0f
 * @version 1.3
 * @update: 2024-12-31
 */

if (typeof window.ExtUtils === 'undefined') {
    window.ExtUtils = {};
  }
  
  // 检查并添加 isMobile 方法
  if (typeof window.ExtUtils.isMobile !== 'function') {
    window.ExtUtils.isMobile = function() {
        return window.matchMedia("only screen and (max-width: 680px)").matches;
    };
  }

class Circle {
    constructor(width, height, minSize = 2, maxSize = 5) {
        this.pos = { x: Math.random() * width, y: height + Math.random() * 100 };
        this.alpha = 0.1 + Math.random() * 0.3;
        this.scale = 0.1 + Math.random() * 0.3;
        this.velocity = Math.random();
        this.size = Math.floor(Math.random() * (maxSize - minSize + 1) + minSize); // 随机生成尺寸
    }

    draw(ctx, particleColor) {
        if (this.alpha <= 0) {
            this.init();
        }
        this.pos.y -= this.velocity;
        this.alpha -= 0.0005;

        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, 2 * Math.PI, false); // 使用 `size` 属性
        ctx.fillStyle = `rgba(${particleColor},${this.alpha})`;
        ctx.fill();

        this.checkBounds();
    }

    init(minSize, maxSize) { // 重置粒子时传入尺寸范围
        this.pos.x = Math.random() * window.innerWidth;
        this.pos.y = window.innerHeight + Math.random() * 100;
        this.alpha = 0.1 + Math.random() * 0.3;
        this.scale = 0.1 + Math.random() * 0.3;
        this.velocity = Math.random();
        this.size = Math.floor(Math.random() * (maxSize - minSize + 1) + minSize);
    }

    checkBounds() {
        if (this.pos.y < 0) {
            this.init(); // 如果粒子移动出屏幕上方，重置位置
        }
    }
}

class ParticleEffect {
    constructor(particleConfig = {}) {
        this.canvas = document.createElement('canvas');
        this.ctx = null;
        this.circles = [];
        this.animateHeader = true;
        this.particleColor = this.getThemeColor();

        this.particleCount = particleConfig.count || 50; // 默认50个粒子
        this.particleSize = {
            min: particleConfig.minSize || 2,
            max: particleConfig.maxSize || 5
        };
    }

    init() {
        this.canvas.id = 'demo-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.bottom = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");

        this.resize();
        window.addEventListener("resize", () => this.resize());
        window.addEventListener("scroll", () => this.scrollCheck());

        for (let x = 0; x < this.particleCount; x++) {
            const c = new Circle(window.innerWidth, window.innerHeight, this.particleSize.min, this.particleSize.max);
            this.circles.push(c);
        }
        this.animate();

        // 添加主题切换监听
        if (window.fixit) {
            window.fixit.switchThemeEventSet.add(this.onThemeChange.bind(this));
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // 重新初始化所有粒子以适应新的大小
        this.circles.forEach(circle => circle.init(this.particleSize.min, this.particleSize.max));
    }

    scrollCheck() {
        this.animateHeader = document.body.scrollTop <= window.innerHeight;
    }

    animate() {
        if (this.animateHeader) {
            this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            for (const circle of this.circles) {
                circle.draw(this.ctx, this.particleColor);
            }
        }
        requestAnimationFrame(() => this.animate());
    }

    getThemeColor() {
        const theme = document.documentElement.dataset.theme || 'light';
        return theme === 'dark' ? "255,255,255" : "0,0,0";
    }

    onThemeChange() {
        this.particleColor = this.getThemeColor();
    }
}

// 初始化粒子特效
if (!ExtUtils.isMobile()) {
    document.addEventListener("DOMContentLoaded", () => {
        const particleEffect = new ParticleEffect({count: 600, minSize: 2, maxSize: 4}); // 可以根据需要调整数量和大小
        particleEffect.init();
    });
}

// 确保 ParticleEffect 在全局范围内可用
window.ParticleEffect = ParticleEffect;
