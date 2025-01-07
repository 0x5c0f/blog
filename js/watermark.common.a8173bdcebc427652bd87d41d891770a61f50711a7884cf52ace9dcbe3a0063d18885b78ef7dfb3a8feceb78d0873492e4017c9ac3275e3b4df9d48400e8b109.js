if (typeof window.ExtUtils === 'undefined') {
    window.ExtUtils = class {
        static isMobile() {
            return window.matchMedia("only screen and (max-width: 680px)").matches;
        }
    };
}

(function() {
    var defaultConfig = {
        startTime: '2022-06-21',
        textWatermark: {
            watermarkCount: 3,
            gradient: 'linear-gradient(45deg, rgba(255,255,255,0.3), rgba(0,0,0,0.3))',
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            width: '430px',
            height: '200px',
            rotate: '-45deg',
            margin: '10%',
            zIndex: 9999,
            opacity: 0.2,
        },
        sealWatermark: {
            watermarkCount: 2,
            size: 200,
            avatarUrl: '/icons/logo_transparent.svg',
            fontFamily: 'Arial, sans-serif',
            circleColor: '#8A8C8D4C',
            textGradient: ['#FBFDFF', '#8A8C8D'],
            margin: '10%',
            zIndex: 9999,
            opacity: 0.5,
            rotationAngle: -30,
            textRotationDuration: 30,
        },
        mobileConfig: {
            type: 'seal',
    // 合并配置
    function mergeConfig(userConfig) {
        var config = Object.assign({}, defaultConfig, userConfig);
        config.startTime = new Date(config.startTime);
        return config;
    }
            textWatermark: {
                watermarkCount: 1
            },
            sealWatermark: {
    // 合并配置
    function mergeConfig(userConfig) {
        var config = Object.assign({}, defaultConfig, userConfig);
        config.startTime = new Date(config.startTime);
        return config;
    }

    // 创建文本水印
    function createTextWatermark(config) {
        var container = document.createElement('div');
        container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:' + config.zIndex + ';';
        
        for (var i = 0; i < config.watermarkCount; i++) {
            var watermark = document.createElement('div');
            watermark.className = 'site-watermark';

            // 计算随机位置，但保持在边缘margin以内
            var marginPercentage = parseInt(config.margin) / 100;
            var topPosition = marginPercentage + (Math.random() * (1 - 2 * marginPercentage));
            var leftPosition = marginPercentage + (Math.random() * (1 - 2 * marginPercentage));

            watermark.style.cssText = 'position:absolute;user-select:none;' +
                'font-family:' + config.fontFamily + ';font-size:' + config.fontSize + ';' +
                'width:' + config.width + ';height:' + config.height + ';' +
                'top:' + (topPosition * 100) + '%;left:' + (leftPosition * 100) + '%;' +
                'transform:rotate(' + config.rotate + ');' +
                'opacity:' + config.opacity + ';' +
                'background:' + config.gradient + ';-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;';
            
            container.appendChild(watermark);
                watermarkCount: 1
            }
        },
        pcConfig: {
            type: 'text',
            textWatermark: {
                watermarkCount: 3
            },
            sealWatermark: {
                watermarkCount: 2
            }
        }
    };
    function createSealWatermark(config) {
    // 创建文本水印
    function mergeConfig(userConfig) {
        var config = Object.assign({}, defaultConfig, userConfig);
        config.startTime = new Date(config.startTime);
        return config;
    }
        container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:' + config.zIndex + ';';
        
        for (var i = 0; i < config.watermarkCount; i++) {
            var watermark = document.createElement('div');
            watermark.className = 'site-watermark';

            // 计算随机位置，但保持在边缘margin以内

            // 计算随机位置，但保持在边缘margin以内
            var leftPosition = marginPercentage + (Math.random() * (1 - 2 * marginPercentage));

            watermark.style.cssText = 'position:absolute;user-select:none;' +
                'top:' + (topPosition * 100) + '%;left:' + (leftPosition * 100) + '%;' +
                'width:' + config.size + 'px;height:' + config.size + 'px;' +
                'opacity:' + config.opacity + ';';

            // 创建SVG水印
            const svg = createWatermarkSVG(config, '初始运行时间文本');
            watermark.appendChild(svg);
            container.appendChild(watermark);
        }
        
        document.body.appendChild(container);
    }

    // 创建SVG印章水印
    function createWatermarkSVG(config, runningTime) {
    // 创建印章水印
        var svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", config.size);
        svg.setAttribute("height", config.size);
        svg.setAttribute("viewBox", "0 0 100 100");

        // 定义渐变
        var defs = document.createElementNS(svgNS, "defs");
        var gradient = document.createElementNS(svgNS, "linearGradient");
        gradient.setAttribute("id", "textGradient");
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("y1", "0%");
        gradient.setAttribute("x2", "100%");
        gradient.setAttribute("y2", "100%");
        
        var stop1 = document.createElementNS(svgNS, "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", config.textGradient[0]);
        
        var stop2 = document.createElementNS(svgNS, "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", config.textGradient[1]);
        
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.appendChild(defs);

        // 创建一个组来包含所有元素，并应用旋转
        var mainGroup = document.createElementNS(svgNS, "g");
        mainGroup.setAttribute("transform", "rotate(" + config.rotationAngle + " 50 50)");
        svg.appendChild(mainGroup);

        // 外圈
        var circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", "50");
        circle.setAttribute("cy", "50");
        circle.setAttribute("r", "49");
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", config.circleColor);
        circle.setAttribute("stroke-width", "1");
        mainGroup.appendChild(circle);

        // 运行时间文本路径
        var textPath = document.createElementNS(svgNS, "path");
        textPath.setAttribute("id", "textCirclePath");
        textPath.setAttribute("d", "M50,10 A40,40 0 0,1 50,90 A40,40 0 0,1 50,10");
        textPath.setAttribute("fill", "none");
        mainGroup.appendChild(textPath);

        var textGroup = document.createElementNS(svgNS, "g");
        mainGroup.appendChild(textGroup);

        var text = document.createElementNS(svgNS, "text");
        text.setAttribute("fill", "url(#textGradient)");
        text.setAttribute("font-size", "8");
        text.setAttribute("font-family", config.fontFamily);

        var textPathElement = document.createElementNS(svgNS, "textPath");
        textPathElement.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#textCirclePath");
        textPathElement.setAttribute("startOffset", "0%");
        textPathElement.setAttribute("id", "runningTimeText");
        textPathElement.textContent = "站点运行时间: " + runningTime;
        text.appendChild(textPathElement);
        textGroup.appendChild(text);

        // 添加逆向旋转动画
        var animateTransform = document.createElementNS(svgNS, "animateTransform");
        animateTransform.setAttribute("attributeName", "transform");
        animateTransform.setAttribute("attributeType", "XML");
        animateTransform.setAttribute("type", "rotate");
        animateTransform.setAttribute("from", "360 50 50");
        animateTransform.setAttribute("to", "0 50 50");
        animateTransform.setAttribute("dur", config.textRotationDuration + "s");
        animateTransform.setAttribute("repeatCount", "indefinite");
        textGroup.appendChild(animateTransform);

        // 头像
        if (config.avatarUrl) {
            var avatar = document.createElementNS(svgNS, "image");
            avatar.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", config.avatarUrl);
            avatar.setAttribute("x", "25");
            avatar.setAttribute("y", "25");
            avatar.setAttribute("width", "50");
            avatar.setAttribute("height", "50");
            avatar.setAttribute("clip-path", "url(#avatarClip)");
            
            // 创建圆形裁剪路径
            var clipPath = document.createElementNS(svgNS, "clipPath");
            clipPath.setAttribute("id", "avatarClip");
            var clipCircle = document.createElementNS(svgNS, "circle");
            clipCircle.setAttribute("cx", "50");
            clipCircle.setAttribute("cy", "50");
            clipCircle.setAttribute("r", "25");
            clipPath.appendChild(clipCircle);
            defs.appendChild(clipPath);

            mainGroup.appendChild(avatar);
        }

        return svg;
    }

    // 更新水印内容
    function updateWatermarks(config) {
        var now = new Date();
        var runningTime = now - config.startTime;
        var days = Math.floor(runningTime / (1000 * 60 * 60 * 24));
        var hours = Math.floor((runningTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((runningTime % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((runningTime % (1000 * 60)) / 1000);
        
        var runningTimeText = days + '天 ' + hours + '时 ' + minutes + '分 ' + seconds + '秒';

        // 根据水印类型更新
        if (config.watermarkType === 'text') {
            // 更新文本水印
            const watermarks = document.getElementsByClassName('site-watermark');
            for (var i = 0; i < watermarks.length; i++) {
                watermarks[i].textContent = '站点运行时长: ' + runningTimeText;
            }
        } else if (config.watermarkType === 'seal') {
            // 更新印章水印
            const watermarks = document.getElementsByClassName('site-watermark');
            for (var i = 0; i < watermarks.length; i++) {
                var runningTimeElement = watermarks[i].querySelector('#runningTimeText');
                if (runningTimeElement) {
                    runningTimeElement.textContent = "站点运行时长: " + runningTimeText;
                } else {
                    watermarks[i].innerHTML = ''; // 清空之前的内容
                    watermarks[i].appendChild(createWatermarkSVG(config.sealWatermark, runningTimeText)); // 更新内容
                }
            }
        }
    }

    // 主函数
    function initWatermark(userConfig) {
        var config = mergeConfig(userConfig);
        if (config.watermarkType === 'text') {
            createTextWatermark(config.textWatermark);
        } else if (config.watermarkType === 'seal') {
            createSealWatermark(config.sealWatermark);
        }
        updateWatermarks(config);
        setInterval(function() { updateWatermarks(config); }, 1000);
    }

    // 检查浏览器是否支持必要的特性
    function checkBrowserSupport() {
        return ('querySelector' in document &&
                'addEventListener' in window &&
                ('createElementNS' in document || 'getComputedStyle' in window));
    }

    // 仅在浏览器支持的情况下初始化水印
    if (checkBrowserSupport()) {
        document.addEventListener('DOMContentLoaded', function() {
            initWatermark();
        });

        // 暴露一个全局函数，允许用户后续自定义配置
        window.customizeWatermark = function(userConfig) {
            var existingWatermarks = document.querySelector('div[style*="pointer-events:none"]');
            if (existingWatermarks) {
                existingWatermarks.parentNode.removeChild(existingWatermarks);
            }
            initWatermark(userConfig);
        };
    } else {
        console.warn('浏览器不支持水印功能所需的特性');
    }
})();