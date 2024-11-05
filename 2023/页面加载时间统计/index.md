# 页面加载时间统计


<!--more-->

## js 组件
- 直接保存为文件, 插入到 `html` 末尾即可, 用来统计当前页面的各类加载时间然后推送到远端(当然，后端需要自己构建接口)   
- `<script id="tracking-script" src="./pcheck.js" data-tracking-code="{{ TRACKING_CODE }}"></script>`  
  ```js
  // 采集信息推送目标
  const apiUrl = "//example.com/rz/api/v1/performance/webpage/data/";

  // 日志打印控制变量, 由后端服务控制
  let enableLog = true;

  // 获取跟踪代码
  function getTrackingCode() {
    try {
      const currentScript = document.getElementById("performance-check-script");
      return currentScript.getAttribute("data-tracking-code");
    } catch (error) {
      console.error(error);
      console.log('请在引入该脚本的script标签上添加id="performance-check-script"属性');
      return null;
    }
  }

  // 采集数据推送
  async function sendPerformanceData(data) {
    if (!data.tracking_code) {
      if (enableLog) console.log("No tracking code provided. Skipping performance data collection.");
      return;
    }

    if (enableLog) console.log("Sending performance data:", data);

    const postOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };

    try {
      const response = await fetch(apiUrl, postOptions);
      if (response.ok) {
        const result = await response.json();
        if (enableLog) console.log("Performance data sent successfully:", result);
      } else {
        if (enableLog) console.error(`Request failed with status: ${response.status}`);
      }
    } catch (error) {
      if (enableLog) console.error("Error sending performance data:", error);
    }
  }

  // 收集性能数据的主函数
  async function collectPerformanceData() {
    const trackingCode = getTrackingCode();
    if (!trackingCode) {
      if (enableLog) console.log("No tracking code provided. Skipping performance data collection.");
      return;
    }

    let performanceData;
    if (window.PerformanceNavigationTiming) {
      const entry = performance.getEntriesByType("navigation")[0];
      performanceData = extractPerformanceDataFromNavigationEntry(entry);
    } else {
      performanceData = extractPerformanceDataFromTimingAPI();
    }

    performanceData.tracking_code = trackingCode;
    performanceData.request_uri = window.location.pathname;
    performanceData.tracking_domain = window.location.hostname;

    await sendPerformanceData(performanceData);
  }

  function extractPerformanceDataFromNavigationEntry(entry) {
    return {
      frontend_performance: entry.duration,
      dns_time: entry.domainLookupEnd - entry.domainLookupStart,
      redirect_time: entry.redirectEnd - entry.redirectStart,
      dom_load_time: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      ttfb_time: entry.responseStart - entry.requestStart,
      content_load_time: entry.loadEventStart - entry.responseEnd,
      onload_callback_time: entry.loadEventEnd - entry.loadEventStart,
      dns_cache_time: entry.domainLookupStart,
      unload_time: entry.unloadEventEnd - entry.unloadEventStart,
      tcp_handshake_time: entry.connectEnd - entry.connectStart
    };
  }

  function extractPerformanceDataFromTimingAPI() {
    const timing = performance.timing;
    return {
      frontend_performance: timing.loadEventEnd - timing.navigationStart,
      dns_time: timing.domainLookupEnd - timing.domainLookupStart,
      redirect_time: timing.redirectEnd - timing.redirectStart,
      dom_load_time: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
      ttfb_time: timing.responseStart - timing.requestStart,
      content_load_time: timing.loadEventStart - timing.responseEnd,
      onload_callback_time: timing.loadEventEnd - timing.loadEventStart,
      dns_cache_time: timing.domainLookupStart,
      unload_time: timing.unloadEventEnd - timing.unloadEventStart,
      tcp_handshake_time: timing.connectEnd - timing.connectStart
    };
  }

  // 当脚本加载完成后立即执行
  (function () {
    if (document.readyState === "complete") {
      setTimeout(collectPerformanceData, 0);
    } else {
      window.addEventListener("load", function () {
        setTimeout(collectPerformanceData, 0);
      });
    }
  })();

  // 提供一个方法来控制日志打印
  function setLogEnabled(enabled) {
    enableLog = enabled;
  }


  ```
