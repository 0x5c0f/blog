class Util {
  /**
   * 检查当前设备是否为移动设备
   * @returns {boolean} 如果是移动设备返回true，否则返回false
   */
  static isMobileDevice() {
      return window.matchMedia('only screen and (max-width: 680px)').matches;
  }

  isTocStatic() {
    return window.matchMedia('only screen and (max-width: 960px)').matches;
  }
  
}


const util = new Util();

console.log(Util.isMobileDevice());

console.log(Util.isTocStatic());