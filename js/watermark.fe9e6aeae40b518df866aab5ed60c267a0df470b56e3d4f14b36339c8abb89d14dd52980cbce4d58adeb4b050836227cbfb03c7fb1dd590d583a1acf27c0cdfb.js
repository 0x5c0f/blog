/**
 * @author: 0x5c0f
 * @description: 站点运行时长-水印插件, 通过 coze.com 机器人 DevOps Claude 3.5 Sonnet 创建
 * @last update: 2024-11-13
 **/
(function() {
    // 默认配置
    var defaultConfig = {
        startTime: '2022-06-21',    // 网站开始运行的时间，格式为 'YYYY-MM-DD'
        watermarkCount: 3,          // 水印的数量
        gradient: 'linear-gradient(45deg, rgba(255,255,255,0.3), rgba(0,0,0,0.3))',  // 水印的颜色渐变
        fontSize: '24px',           // 水印文字的大小
        fontFamily: 'Arial, sans-serif',  // 水印文字的字体
        width: '430px',             // 水印的宽度
        height: '200px',            // 水印的高度
        rotate: '-45deg',           // 水印的旋转角度
        margin: '10%',              // 水印距离浏览器边缘的最小距离
        zIndex: 9999,               // 水印的 z-index 值
        opacity: 0.2                // 水印的透明度
    };

    // 合并配置
    function mergeConfig(userConfig) {
        var config = {};
        for (var key in defaultConfig) {
            config[key] = userConfig && userConfig.hasOwnProperty(key) ? userConfig[key] : defaultConfig[key];
        }
        config.startTime = new Date(config.startTime);
        return config;
    }

    // 创建水印
    function createWatermarks(config) {
        var container = document.createElement('div');
        container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:' + config.zIndex + ';';
        
        for (var i = 0; i < config.watermarkCount; i++) {
            var watermark = document.createElement('div');
            watermark.className = 'site-watermark';

            // 计算随机位置，但保持在边缘margin以内
            var marginPercentage = parseInt(config.margin) / 100;
            var topPosition = marginPercentage + (Math.random() * (1 - 2 * marginPercentage));
            var leftPosition = marginPercentage + (Math.random() * (1 - 2 * marginPercentage));

            watermark.style.cssText = 'position:absolute;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;' +
                'white-space:nowrap;overflow:hidden;' +
                'font-family:' + config.fontFamily + ';font-size:' + config.fontSize + ';' +
                'width:' + config.width + ';height:' + config.height + ';' +
                'top:' + (topPosition * 100) + '%;left:' + (leftPosition * 100) + '%;' +
                'transform:rotate(' + config.rotate + ');-webkit-transform:rotate(' + config.rotate + ');-moz-transform:rotate(' + config.rotate + ');-ms-transform:rotate(' + config.rotate + ');-o-transform:rotate(' + config.rotate + ');' +
                'opacity:' + config.opacity + ';' +
                'background:' + config.gradient + ';-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;';
            
            container.appendChild(watermark);
        }
        
        document.body.appendChild(container);
    }

    // 更新水印内容
    function updateWatermarks(config) {
        var watermarks = document.getElementsByClassName('site-watermark');
        var now = new Date();
        var runningTime = now - config.startTime;
        var days = Math.floor(runningTime / (1000 * 60 * 60 * 24));
        var hours = Math.floor((runningTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((runningTime % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((runningTime % (1000 * 60)) / 1000);

        var text = '站点运行时长: ' + days + '天 ' + hours + '小时 ' + minutes + '分钟 ' + seconds + '秒';

        for (var i = 0; i < watermarks.length; i++) {
            watermarks[i].textContent = text;
        }
    }

    // 主函数
    function initWatermark(userConfig) {
        var config = mergeConfig(userConfig);
        createWatermarks(config);
        updateWatermarks(config);
        setInterval(function() { updateWatermarks(config); }, 1000);
    }

    // 检查浏览器是否支持必要的特性
    function checkBrowserSupport() {
        return ('querySelector' in document &&
                'addEventListener' in window &&
                'getComputedStyle' in window);
    }

    // 仅在浏览器支持的情况下初始化水印
    if (checkBrowserSupport()) {
        // 在 DOMContentLoaded 事件触发时初始化水印
        document.addEventListener('DOMContentLoaded', function() {
            initWatermark();
        });

        // 暴露一个全局函数，允许用户后续自定义配置
        window.customizeWatermark = function(userConfig) {
            // 移除现有的水印
            var existingWatermarks = document.querySelector('div[style*="pointer-events:none"]');
            if (existingWatermarks) {
                existingWatermarks.parentNode.removeChild(existingWatermarks);
            }
            // 使用新的配置初始化水印
            initWatermark(userConfig);
        };
    } else {
        console.warn('浏览器不支持水印功能所需的特性');
    }
})();
