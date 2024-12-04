/**
 * 粒子网络动画效果
 * @author 0x5c0f
 * @description 创建可交互的粒子网络动画，支持鼠标交互和自定义配置, 通过 cursor 编辑器 claude 模型创建 
 * @last update: 2024-11-14
 */

// 使用 FixIt 主题的设备检测

if ( typeof window.ExtUtils === 'undefined' ) {
    window.ExtUtils = class {
        static isMobile() {
            return window.matchMedia("only screen and (max-width: 680px)").matches;
        }
    };
}


// 默认配置
var defaultConfig = {
    // 画布配置
    canvasId: "bgCanvas",              // canvas元素ID
    backgroundColor: "transparent",     // 画布背景色

    // 主题配置
    lightMode: {
        particleColor: "rgba(0,0,0,0.1)",    // 亮色主题粒子颜色
        lineColor: "rgba(0,0,0,0.05)"        // 亮色主题连线颜色
    },
    darkMode: {
        particleColor: "rgba(255,255,255,0.15)",    // 增加暗色主题粒子不透明度
        lineColor: "rgba(255,255,255,0.1)"        // 增加暗色主题连线不透明度
    },

    // 粒子配置
    particleCount: isMobileDevice() ? 1110 : 120,                 // 粒子数量
    particleSize: 3,                   // 粒子大小(像素)

    // 连线配置
    lineWidth: 1,                      // 连线宽度
    connectDistance: 150,              // 连线最大距离

    // 运动配置
    moveSpeed: 1,                      // 移动速度

    // 鼠标交互配置
    mouseEffect: !isMobileDevice(),                 // 是否启用鼠标效果
    mouseRadius: 300,                  // 鼠标影响半径
    orbitRadius: 80,                   // 鼠标周围轨道半径
    rotationSpeed: 0.001              // 轨道旋转速度
};

(function (name, factory) {
    if (typeof window === "object") {
        window[name] = factory();
    }
})
    ("Particle", function () {
        var _w = window, _b = document.body, _d = document.documentElement;

        //随机函数
        var random = function () {
            if (arguments.length === 1) {
                if (Array.isArray(arguments[0])) {
                    var index = Math.round(random(0, arguments[0].length - 1));
                    return arguments[0][index];
                }
                return random(0, arguments[0]);
            } else
                if (arguments.length === 2) {
                    return Math.random() * (arguments[1] - arguments[0]) + arguments[0];
                }
            return 0;
        };

        //屏幕信息
        var screenInfo = function (e) {
            var width = Math.max(0, _w.innerWidth || _d.clientWidth || _b.clientWidth || 0),
                height = Math.max(0, _w.innerHeight || _d.clientHeight || _b.clientHeight || 0),
                scrollx = Math.max(0, _w.pageXOffset || _d.scrollLeft || _b.scrollLeft || 0) - (_d.clientLeft || 0),
                scrolly = Math.max(0, _w.pageYOffset || _d.scrollTop || _b.scrollTop || 0) - (_d.clientTop || 0);
            return {
                width: width,
                height: height,
                ratio: width / height,
                centerx: width / 2,
                centery: height / 2,
                scrollx: scrollx,
                scrolly: scrolly
            };
        };

        var mouseInfo = function (e) {
            var screen = screenInfo(e),
                mousex = e ? Math.max(0, e.pageX || e.clientX || 0) : 0,
                mousey = e ? Math.max(0, e.pageY || e.clientY || 0) : 0;

            return {
                mousex: mousex,
                mousey: mousey,
                centerx: mousex - screen.width / 2,
                centery: mousey - screen.height / 2
            };
        };

        //点
        var Point = function (x, y) {
            this.x = 0;
            this.y = 0;
            this.set(x, y);
        };
        //点运算
        Point.prototype = {
            constructor: Point,
            set: function (x, y) {
                this.x = x || 0; this.y = y || 0;
            },
            copy: function (point) {
                this.x = point.x || 0; this.y = point.y || 0; return this;
            },
            multiply: function (x, y) {
                this.x *= x || 1; this.y *= y || 1; return this;
            },
            divide: function (x, y) {
                this.x /= x || 1; this.y /= y || 1; return this;
            },
            add: function (x, y) {
                this.x += x || 0; this.y += y || 0; return this;
            },
            subtract: function (x, y) {
                this.x -= x || 0; this.y -= y || 0; return this;
            },
            clampX: function (min, max) {
                this.x = Math.max(min, Math.min(this.x, max)); return this;
            },
            clampY: function (min, max) {
                this.y = Math.max(min, Math.min(this.y, max)); return this;
            },
            flipX: function () {
                this.x *= -1; return this;
            },
            flipY: function () {
                this.y *= -1; return this;
            }
        };

        // 在 Factory 类定义之前添加 Particle 类
        var Particle = function(x, y, index) {
            this.x = x || 0;
            this.y = y || 0;
            this.vx = random(-1, 1);  // 水平速度
            this.vy = random(-1, 1);  // 垂直速度
            this.orbitAngle = null; // 添加轨道角度属性
            this.index = index; // 添加索引属性
        };

        //带画板
        var Factory = function (options) {
            this._canvas = null;
            this._context = null;
            this._sto = null;
            this._width = 0;
            this._height = 0;
            this._scroll = 0;
            this._particles = [];
            this._time = 0;
            this._mouse = { x: 0, y: 0 };

            // 合并配置
            this._options = Object.assign({}, defaultConfig, options || {});
            
            // 初始化主题颜色
            this.updateThemeColors();

            // 绑定方法
            this._onDraw = this._onDraw.bind(this);
            this._onResize = this._onResize.bind(this);
            this._onScroll = this._onScroll.bind(this);
            this._onMouseMove = this._onMouseMove.bind(this);
            this._onThemeChange = this._onThemeChange.bind(this);

            this.init();
        };
        Factory.prototype = {
            constructor: Factory,
            setOptions: function (options) {
                if (typeof options === "object") {
                    for (var key in options) {
                        if (options.hasOwnProperty(key)) {
                            this._options[key] = options[key];
                        }
                    }
                }
            },
            //初始化
            init: function () {
                //初始化画板
                try {
                    this._canvas = document.createElement("canvas");
                    this._canvas.style["display"] = "block";
                    this._canvas.style["position"] = "fixed";
                    this._canvas.style["margin"] = "0";
                    this._canvas.style["padding"] = "0";
                    this._canvas.style["border"] = "0";
                    this._canvas.style["outline"] = "0";
                    this._canvas.style["left"] = "0";
                    this._canvas.style["top"] = "0";
                    this._canvas.style["width"] = "100%";
                    this._canvas.style["height"] = "100%";
                    this._canvas.style["z-index"] = "-1";
                    this._canvas.style["background-color"] = this._options.backgroundColor;
                    this._canvas.id = this._options.id;
                    this._onResize();
                    this._context = this._canvas.getContext("2d");
                    this._context.clearRect(0, 0, this._width, this._height);
                    window.addEventListener("resize", this._onResize);
                    window.addEventListener("scroll", this._onScroll);
                    window.addEventListener("mousemove", this._onMouseMove);
                    document.body.appendChild(this._canvas);
                }
                catch (e) {
                    console.warn("Canvas Context Error: " + e.toString());
                    return;
                }
                // 初始化一些粒子
                for (var i = 0; i < this._options.particleCount; i++) {
                    this.addParticle();
                }
                this._time = 0; // 添加时间计数器
                this._onDraw();

                // 添加主题切换监听
                if (window.fixit) {
                    window.fixit.switchThemeEventSet.add(() => {
                        this._onThemeChange();
                    });
                }

                // 只在非移动设备上添加鼠标事件监听
                if (!isMobileDevice()) {
                    window.addEventListener("mousemove", this._onMouseMove.bind(this));
                }
            },
            //生成一条丝带
            addParticle: function () {
                var x = Math.random() * this._width;
                var y = Math.random() * this._height;
                var particle = new Particle(x, y, this._particles.length); // 传入索引
                // 添加速度属性
                particle.vx *= this._options.moveSpeed;
                particle.vy *= this._options.moveSpeed;
                this._particles.push(particle);
            },
            //绘制一个三角形方块
            _drawParticle: function (particle) {
                if (!this._context) return;
                
                var dx = this._mouse.x - particle.x;
                var dy = this._mouse.y - particle.y;
                var distance = Math.sqrt(dx * dx + dy * dy);
                
                // 只在启用鼠标效果时检测鼠标范围
                particle.isNearMouse = this._options.mouseEffect && distance < this._options.mouseRadius;
                
                // 限制粒子最大速度
                var maxSpeed = 1.5;
                var speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
                if (speed > maxSpeed) {
                    particle.vx = (particle.vx / speed) * maxSpeed;
                    particle.vy = (particle.vy / speed) * maxSpeed;
                }
                
                // 绘制粒子
                this._context.beginPath();
                this._context.arc(particle.x, particle.y, this._options.particleSize, 0, Math.PI * 2);
                this._context.fillStyle = this._options.particleColor;
                this._context.fill();
                
                // 更新粒子位置
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                // 边界检查 - 让粒子从另一边重新进入
                if (particle.x < 0) particle.x = this._width;
                if (particle.x > this._width) particle.x = 0;
                if (particle.y < 0) particle.y = this._height;
                if (particle.y > this._height) particle.y = 0;
            },
            //新增连线方法
            _drawLines: function () {
                // 如果禁用鼠标效果，将所有粒子的 isNearMouse 设为 false
                if (!this._options.mouseEffect) {
                    this._particles.forEach(p => p.isNearMouse = false);
                }

                // 获取当前主题
                const isDark = document.documentElement.dataset.theme === 'dark';
                
                // 调整基础透明度
                const normalOpacity = isDark ? 0.05 : 0.02;    // 普通连线透明度
                const mouseOpacity = isDark ? 0.15 : 0.08;     // 鼠标区域连线透明度
                
                // 绘制粒子之间的连线
                for (var i = 0; i < this._particles.length; i++) {
                    for (var j = i + 1; j < this._particles.length; j++) {
                        var dx = this._particles[i].x - this._particles[j].x;
                        var dy = this._particles[i].y - this._particles[j].y;
                        var distance = Math.sqrt(dx * dx + dy * dy);
                        
                        var bothNearMouse = this._particles[i].isNearMouse && this._particles[j].isNearMouse;
                        
                        var effectiveDistance = bothNearMouse ? 
                            this._options.connectDistance : 
                            this._options.connectDistance * 0.4;
                        
                        if (distance < effectiveDistance) {
                            var baseOpacity = bothNearMouse ? mouseOpacity : normalOpacity;
                            var opacity = (1 - distance / effectiveDistance) * baseOpacity;
                            
                            this._context.beginPath();
                            this._context.strokeStyle = this._options.lineColor;
                            this._context.lineWidth = this._options.lineWidth;
                            this._context.moveTo(this._particles[i].x, this._particles[i].y);
                            this._context.lineTo(this._particles[j].x, this._particles[j].y);
                            this._context.stroke();
                        }
                    }
                    
                    // 绘制到鼠标的连线
                    if (this._particles[i].isNearMouse) {
                        var dx = this._mouse.x - this._particles[i].x;
                        var dy = this._mouse.y - this._particles[i].y;
                        var distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < this._options.mouseRadius * 1.5) {
                            var force = (this._options.mouseRadius * 1.5 - distance) / (this._options.mouseRadius * 1.5);
                            
                            this._context.beginPath();
                            this._context.moveTo(this._particles[i].x, this._particles[i].y);
                            this._context.lineTo(this._mouse.x, this._mouse.y);
                            // 调整鼠标连线透明度
                            var mouseLineOpacity = isDark ? 0.2 : 0.06;
                            this._context.strokeStyle = `rgba(${isDark ? '255,255,255' : '0,0,0'},${mouseLineOpacity * force})`;
                            this._context.stroke();
                        }
                    }
                }
            },
            //绘制丝带
            _onDraw: function () {
                if (!this._context) return;
                
                this._time++; // 更新时间计数器
                this._context.clearRect(0, 0, this._width, this._height);
                
                // 绘制所有粒子和连线
                this._drawLines();
                for (var i = 0; i < this._particles.length; i++) {
                    this._drawParticle(this._particles[i]);
                }
                
                requestAnimationFrame(this._onDraw);
            },
            //重新设置窗体大小时需要获取窗体大小
            _onResize: function (e) {
                var screen = screenInfo(e);
                this._width = this._canvas.width = screen.width;
                this._height = this._canvas.height = screen.height;
            },
            //滚动时获取滚动距离
            _onScroll: function (e) {
                var screen = screenInfo(e);
                this._scroll = screen.scrolly;
            },
            _onMouseMove: function (e) {
                // 只在启用鼠标效果时更新鼠标位置
                if (this._options.mouseEffect) {
                    var rect = this._canvas.getBoundingClientRect();
                    var scaleX = this._canvas.width / rect.width;    // 处理画布缩放
                    var scaleY = this._canvas.height / rect.height;
                    
                    this._mouse.x = (e.clientX - rect.left) * scaleX;
                    this._mouse.y = (e.clientY - rect.top) * scaleY;
                }
            },
            // 添加主题更新方法
            updateThemeColors: function() {
                const isDark = document.documentElement.dataset.theme === 'dark';
                const themeColors = isDark ? this._options.darkMode : this._options.lightMode;
                this._options.particleColor = themeColors.particleColor;
                this._options.lineColor = themeColors.lineColor;
            },
            // 主题切换监听
            _onThemeChange: function() {
                this.updateThemeColors();
            }
        }; return Factory;
});

window.addEventListener('load', function() {
    // 等待 FixIt 主题初始化完成
    setTimeout(() => {
        new Particle(defaultConfig);
    }, 0);
});