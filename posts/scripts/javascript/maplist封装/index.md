# Javascript 封装map、list

**当年收藏的一个封装脚本**  

```javascript
/*
 * Util.$(objid)：获取指定ID的dom对象
 *
 * Util.ie：判断浏览器是否为IE
 *
 * List类：模拟java的List，支持iterator
 *   add(obj)：向List的最后追加一个对象
 *   addat(index, obj)：在List的index位置插入一个对象
 *   get(index)：在List获取index位置的对象
 *   set(index, obj)：在List的替换index位置的对象
 *   size()：获取List的对象个数
 *   remove(index)：移除List中index位置的对象
 *   clear()：清空List
 *   iterator()：获取到List的迭代对象
 *
 * Map类：模拟java的Map，支持直接对value的iterator
 *   put(key, value)：在Map的添加一个key value的键值对
 *   get(key)：在Map获取键为key的值
 *   remove(key)：溢出Map中键为key的对象
 *   containsKey(key)：判断Map中是否存在指定key的对象
 *   keySet()：获取Map中所有的键的List
 *   values()：获取Map中所有的值的List
 *   size()：获取List的对象个数
 *   clear()：清空List
 *   iterator()：获取到List的迭代对象
 *
 * Iterator用法：for(var it = list.iterator(); it.hasNext();) { var item = it.next(); }
 *
 * Url类：获取url中参数的值，使用var u = new Url(location.search); var value = url.getvalue(para);即可得到
 *
 * EventHandler类：封装事件方法，可以为事件方法的调用添加参数，屏蔽了浏览器差异
 *   EventHandler.createEvent(func, ...args)：创建事件对象，args为参数值，需要与func的参数对应，不需要传递event对象
 *   EventHandler.getEvent()：在事件的处理方法中获取当前的event对象
 *   EventHandler.getElement(e)：获取触发event事件的dom对象
 *   EventHandler.attachEvent(obj, eventname, func)：为obj添加eventname事件，事件处理方法为func
 *   EventHandler.detachEvent(obj, eventname, func)：为obj注销eventname事件的func方法
 *
 * EventType类：封装了客户端的大多数事件类型，屏蔽了浏览器差异
 * 使用方式：EventHandler.attachEvent(obj, EventType.click, func)
 * 目前封装了click, rclick, mousedown, mousemove, mouseup, mouseover, mouseout, scroll, focus, blur, change, keypress, keydown, keyup, submit
 */

/*
 * 修改记录
 */

function Util() {}
Util.$ = function (objid) {
  return document.getElementById(objid);
};
//浏览器的判断，true为IE，false为Firefox
Util.ie = navigator.appName.indexOf(&#34;Microsoft&#34;) != -1 ? true : false;

function Iterator(iteratorArray) {
  this.itArr = iteratorArray;
  this.index = -1;
}

Iterator.prototype = {
  hasNext: function () {
    if (this.index &#43; 1 &gt;= this.itArr.length) {
      return false;
    } else {
      return true;
    }
  },

  next: function () {
    this.index&#43;&#43;;
    return this.itArr[this.index];
  },
};

function Map() {
  this.arr = new Array();
}

Map.prototype = {
  put: function (key, value) {
    if (!this.containsKey(key)) {
      this.arr.push([key, value]);
    } else {
      for (var i = 0; i &lt; this.arr.length; i&#43;&#43;) {
        if (this.arr[i][0] == key) {
          this.arr[i][1] = value;
          return;
        }
      }
    }
  },

  get: function (key) {
    for (var i = 0; i &lt; this.arr.length; i&#43;&#43;) {
      if (this.arr[i][0] == key) {
        return this.arr[i][1];
      }
    }
    return null;
  },

  remove: function (key) {
    for (var i = 0; i &lt; this.arr.length; i&#43;&#43;) {
      if (this.arr[i][0] == key) {
        this.arr.splice(i, 1);
        return;
      }
    }
  },

  containsKey: function (key) {
    for (var i = 0; i &lt; this.arr.length; i&#43;&#43;) {
      if (this.arr[i][0] == key) {
        return true;
      }
    }
    return false;
  },

  keySet: function () {
    var l = new List();
    for (var i = 0; i &lt; this.arr.length; i&#43;&#43;) {
      l.add(this.arr[i][0]);
    }
    return l;
  },

  values: function () {
    var l = new List();
    for (var i = 0; i &lt; this.arr.length; i&#43;&#43;) {
      l.add(this.arr[i][1]);
    }
    return l;
  },

  size: function () {
    return this.arr.length;
  },

  clear: function () {
    this.arr = [];
  },

  iterator: function () {
    var vs = new Array();
    for (var i = 0; i &lt; this.arr.length; i&#43;&#43;) {
      vs.push(this.arr[i][1]);
    }
    var it = new Iterator(vs);
    return it;
  },
};

function List() {
  this.arr = new Array();
}

List.prototype = {
  add: function (obj) {
    this.arr.push(obj);
  },

  addat: function (index, obj) {
    this.arr.splice(index, 0, obj);
  },

  get: function (index) {
    return this.arr[index];
  },

  set: function (index, obj) {
    this.arr.splice(index, 1, obj);
  },

  size: function () {
    return this.arr.length;
  },

  remove: function (index) {
    this.arr.splice(index, 1);
  },

  clear: function () {
    this.arr = [];
  },

  iterator: function () {
    var it = new Iterator(this.arr);
    return it;
  },
};

function Url(urlstr) {
  this.paraMap = new Map();

  if (urlstr.indexOf(&#34;?&#34;) &gt; -1) {
    urlstr = urlstr.substr(1);
  }
  if (urlstr.indexOf(&#34;&amp;&#34;) &gt; -1) {
    var pvarr = urlstr.split(&#34;&amp;&#34;);
    for (var i = 0; i &lt; pvarr.length; i&#43;&#43;) {
      var pv = pvarr[i].split(&#34;=&#34;);
      this.paraMap.put(pv[0], pv[1]);
    }
  } else {
    var pv = urlstr.split(&#34;=&#34;);
    this.paraMap.put(pv[0], pv[1]);
  }
}

Url.prototype = {
  getvalue: function (para) {
    return this.paraMap.get(para);
  },
};

function EventType() {}

//鼠标单击
EventType.click = Util.ie ? &#34;onclick&#34; : &#34;click&#34;;
EventType.rclick = Util.ie ? &#34;oncontextmenu&#34; : &#34;contextmenu&#34;;
EventType.mousedown = Util.ie ? &#34;onmousedown&#34; : &#34;mousedown&#34;;
EventType.mousemove = Util.ie ? &#34;onmousemove&#34; : &#34;mousemove&#34;;
EventType.mouseup = Util.ie ? &#34;onmouseup&#34; : &#34;mouseup&#34;;
EventType.mouseover = Util.ie ? &#34;onmouseover&#34; : &#34;mouseover&#34;;
EventType.mouseout = Util.ie ? &#34;onmouseout&#34; : &#34;mouseout&#34;;
EventType.scroll = Util.ie ? &#34;onscroll&#34; : &#34;scroll&#34;;
EventType.focus = Util.ie ? &#34;onfocus&#34; : &#34;focus&#34;;
EventType.blur = Util.ie ? &#34;onblur&#34; : &#34;blur&#34;;
EventType.change = Util.ie ? &#34;onchange&#34; : &#34;change&#34;;
EventType.keypress = Util.ie ? &#34;onkeypress&#34; : &#34;keypress&#34;;
EventType.keydown = Util.ie ? &#34;onkeydown&#34; : &#34;keydown&#34;;
EventType.keyup = Util.ie ? &#34;onkeyup&#34; : &#34;keyup&#34;;
EventType.submit = Util.ie ? &#34;onsubmit&#34; : &#34;submit&#34;;

function EventHandler() {}

//创建事件对象
EventHandler.createEvent = function (func) {
  var argarr = [];
  for (var i = 1; i &lt; arguments.length; i&#43;&#43;) argarr.push(arguments[i]);
  return function () {
    func.apply(window, argarr);
  };
};

//获取事件的句柄
EventHandler.getEvent = function () {
  if (Util.ie) {
    return window.event;
  } else {
    var ev = null;
    if (EventHandler.getEvent.caller.caller)
      ev = EventHandler.getEvent.caller.caller.arguments[0];
    return ev;
  }
};

EventHandler.getElement = function (e) {
  var ev = e;
  if (!ev) {
    if (Util.ie) {
      return window.event;
    } else {
      if (EventHandler.getEvent.caller.caller)
        ev = EventHandler.getEvent.caller.caller.arguments[0];
      return ev;
    }
  }
  return Util.ie ? ev.srcElement : ev.target;
};

//添加事件
EventHandler.attachEvent = function (obj, eventname, func) {
  if (Util.ie) {
    obj.attachEvent(eventname, func);
  } else {
    obj.addEventListener(eventname, func, true);
  }
};

//注销事件
EventHandler.detachEvent = function (obj, eventname, func) {
  if (Util.ie) {
    obj.detachEvent(eventname, func);
  } else {
    obj.removeEventListener(eventname, func, true);
  }
};

```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/scripts/javascript/maplist%E5%B0%81%E8%A3%85/  

