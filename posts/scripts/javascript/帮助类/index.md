# Javascript 帮助类


```javascript
function check_browser() {
   Opera = (navigator .userAgent .indexOf (&#34;Opera&#34;, 0) != -1 )?1: 0;
   MSIE = (navigator .userAgent .indexOf (&#34;Microsoft&#34;, 0) != -1 )?1: 0;
   FX = (navigator .userAgent .indexOf (&#34;Mozilla&#34;, 0) != -1 )?1: 0;
   if ( Opera ) brow_type = &#34;Opera&#34;;
   else if ( FX )brow_type = &#34;Firefox&#34;;
   else if ( MSIE )brow_type = &#34;MSIE&#34;;
   return brow_type ;
}

function getWindowHeight() {
       var windowHeight = 0 ;
       if ( typeof(window.innerHeight ) == &#39;number&#39;) {
            windowHeight = window .innerHeight ;
       }
       else {
             if ( document.documentElement &amp;&amp; document.documentElement. clientHeight) {
                  windowHeight = document .documentElement .clientHeight ;
             }
             else {
                   if ( document.body &amp;&amp; document .body .clientHeight ) {
                        windowHeight = document .body .clientHeight ;
                   }
             }
       }
       return windowHeight;
}

function getWindowWidth() {
       var windowWidth = 0 ;
       if ( typeof(window.innerWidth ) == &#39;number&#39;) {
            windowWidth = window .innerWidth ;
       }
       else {
             if ( document.documentElement &amp;&amp; document.documentElement. clientWidth) {
                  windowWidth = document .documentElement .clientWidth ;
             }
             else {
                   if ( document.body &amp;&amp; document .body .clientWidth ) {
                        windowWidth = document .body .clientWidth ;
                   }
             }
       }
       return windowWidth;
}


/*open window at the middle&amp;center of screen*/
function openwindow(url,name,iWidth,iHeight,isFullScreen )
{
       var url;
       var name;
       var iWidth;
       var iHeight;
       if(isFullScreen !=undefined &amp;&amp; isFullScreen== &#39;1&#39;)
       {
            iWidth = window .screen .availWidth - 10;
            iHeight = window .screen .availHeight - 30;
       }
       var iTop = ( window.screen.availHeight -30- iHeight)/2 ;
       var iLeft = ( window.screen.availWidth -10- iWidth)/2 ;
      window .open (url ,name ,&#39;height=&#39;&#43; iHeight&#43;&#39;,innerHeight=&#39; &#43;iHeight &#43;&#39;,width=&#39;&#43; iWidth&#43;&#39;,innerWidth=&#39; &#43;iWidth &#43;&#39;,top=&#39;&#43; iTop&#43;&#39;,left=&#39; &#43;iLeft &#43;&#39;,toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=no,status=yes,titlebar=yes&#39; );
}
/*
 function: compare old_str and new_str, then output add_str and del_str
 example_1:      old_str=1,2,3,5;new_str=1,3,4,6;compareStr(old_str,new_str)=4,6;2,5
 notice: under any condition, &#39;;&#39; exists all the same!
*/
function compareStr(oldStr,newStr)
{
       if(oldStr==newStr)
       {
             return &#39;;&#39; ;
       }
       if(oldStr==&#39;&#39; )
       {
             return newStr&#43; &#39;;&#39;;
       }
       if(newStr==&#39;&#39; )
       {
             return &#39;;&#39; &#43;oldStr ;
       }
       var oldArr = oldStr.split(&#39;,&#39; );
       var newArr = newStr.split(&#39;,&#39; );
       var dels = &#39;&#39; ;
       var adds = &#39;&#39; ;
       for(var i= 0;i&lt;oldArr .length ;i &#43;&#43;)
       {     
             var tag = 0 ;
             for(var j= 0;j&lt;newArr .length ;j &#43;&#43;)
             {
                   if(oldArr[i] == newArr[j] )
                   {
                        tag = 1;
                         break;
                   }
             }
             if(tag == 0)
             {
                  dels = dels &#43; oldArr[i] &#43; &#39;,&#39;;
             }
       }
       for(var i= 0;i&lt;newArr .length ;i &#43;&#43;)
       {     
             var tag = 0 ;
             for(var j= 0;j&lt;oldArr .length ;j &#43;&#43;)
             {
                   if(newArr[i] == oldArr[j] )
                   {
                        tag = 1;
                         break;
                   }
             }
             if(tag == 0)
             {
                  adds = adds &#43; newArr[i] &#43; &#39;,&#39;;
             }
       }
       if(dels==&#39;&#39; &amp;&amp; adds!=&#39;&#39; )
       {
             return adds. substring(0 ,adds .lastIndexOf (&#39;,&#39;)) &#43; &#39;;&#39; ;
       }
       else if (adds ==&#39;&#39; &amp;&amp; dels !=&#39;&#39;)
       {
             return &#39;;&#39; &#43; dels.substring (0, dels.lastIndexOf (&#39;,&#39;));
       }
       else if (adds ==&#39;&#39; &amp;&amp; dels ==&#39;&#39;)
       {
             return &#39;;&#39; ;
       }
       else
       {
             return adds. substring(0 ,adds .lastIndexOf (&#39;,&#39;)) &#43; &#39;;&#39; &#43; dels.substring( 0,dels.lastIndexOf (&#39;,&#39;));
       }
}

/*JS高精度计算*/
//除法
function accDiv(arg1,arg2){
       var t1= 0,t2=0 ,r1 ,r2 ;
       try{t1=arg1.toString ().split( &#34;.&#34;)[1].length}catch (e ){}
       try{t2=arg2.toString ().split( &#34;.&#34;)[1].length}catch (e ){}
       with(Math){
            r1 =Number (arg1 .toString ().replace( &#34;.&#34;,&#34;&#34; ))
            r2 =Number (arg2 .toString ().replace( &#34;.&#34;,&#34;&#34; ))
             return ( r1/ r2)* pow(10 ,t2 -t1 );
       }
}
//乘法
function accMul(arg1,arg2)
{
       var m= 0,s1=arg1.toString (),s2= arg2.toString ();
       try{m&#43;=s1.split(&#34;.&#34; )[ 1] .length }catch( e){}
       try{m&#43;=s2.split(&#34;.&#34; )[ 1] .length }catch( e){}
       return Number(s1. replace(&#34;.&#34; ,&#34;&#34;))* Number(s2.replace(&#34;.&#34; ,&#34;&#34;))/ Math.pow(10 ,m );
}
//加法
function accAdd(arg1,arg2){
       var r1, r2, m;
       try{r1=arg1.toString ().split( &#34;.&#34;)[1].length}catch (e ){r1 =0}
       try{r2=arg2.toString ().split( &#34;.&#34;)[1].length}catch (e ){r2 =0}
      m =Math .pow (10, Math.max(r1,r2))
       return ( arg1*m&#43;arg2*m)/m;
}
//减法
function accSubtr(arg1,arg2){
     var r1 ,r2 ,m ,n ;
     try{ r1= arg1.toString ().split( &#34;.&#34;)[1].length}catch (e ){r1 =0}
     try{ r2= arg2.toString ().split( &#34;.&#34;)[1].length}catch (e ){r2 =0}
     m=Math.pow(10 ,Math .max (r1 ,r2 ));
     //last modify by deeka
     //动态控制精度长度
     n=(r1&gt;=r2)?r1:r2;
     return ((arg1 *m -arg2 *m )/m ).toFixed (n );
}

/**
 *验证初始化，系统自动监控sumbit按钮，在提交时自动添加遮罩，并且把表单覆盖（不让编辑）
 *如果需要在提交成功
 *返回Validator，详细见http://docs.jquery.com/Plugins/Validation
 */
function _submitBeforeMaskCallback(form){};
function _invalidMethodCallback(form,validator ){};
function validForm(formId){
      jQuery .extend (jQuery .validator .messages ,{
                  required : &#34;必填项&#34;,   
                remote : &#34;请修正该字段&#34; ,  
                email : &#34;请输入正确格式的电子邮件&#34; ,  
                url : &#34;请输入合法的网址&#34; , 
                date : &#34;请输入合法的日期&#34; ,  
                dateISO : &#34;请输入合法的日期 (ISO).&#34; , 
                number : &#34;请输入合法的数字&#34; ,   
                digits : &#34;只能输入整数&#34; ,  
                creditcard : &#34;请输入合法的信用卡号&#34; ,  
                equalTo : &#34;请再次输入相同的值&#34; ,   
                accept : &#34;请输入拥有合法后缀名的字符串&#34; ,  
                maxlength : jQuery .format (&#34;请输入一个长度最多是 {0} 的字符串&#34; ),  
                minlength : jQuery .format (&#34;请输入一个长度最少是 {0} 的字符串&#34; ),  
                rangelength : jQuery .format (&#34;请输入一个长度介于 {0} 和 {1} 之间的字符串&#34; ),   
                range : jQuery .format (&#34;请输入一个介于 {0} 和 {1} 之间的值&#34; ),  
                max : jQuery .format (&#34;请输入一个最大为 {0} 的值&#34; ), 
                min : jQuery .format (&#34;请输入一个最小为 {0} 的值&#34; )
             }
       );
       return $( &#34;#&#34;&#43;formId).validate ({
            meta : &#34;valid&#34;,
            errorPlacement : function(error, element ) {
                   var $elm= $( element);
                   if(!error.is(&#39;:empty&#39; )) {
                         if($elm.siblings (&#34;p &gt; label.error&#34;). length&gt;0 ){
                              $elm .siblings (&#34;p &gt; label.error&#34;).replaceWith (error );
                         }else{
                               var $tmperr = $(&#34;&lt;p&gt;&lt;/p&gt;&#34;). wrapInner(error);
                              $elm .after ($tmperr );
                         }
                   }
             },
            success : function(label){
                  label .parent (&#34;p&#34;). remove();
             },
             //验证通过时的回调方法
            submitHandler :function( form){
                  _submitBeforeMaskCallback (form );
                  $ (form ).mask (&#34;请稍后...&#34;);
                  form .submit ();
                   //alert(&#39;submitHandler&#39;);
             },
             //验证失败时的回调方法
            invalidHandler : function(form, validator ) {
                  _invalidMethodCallback (form ,validator );
                   //alert(&#39;invalidHandler&#39;);
             }
       });
}

/**
 * 在具体页面中中实现，用与ajaxValidForm验证成功后回调
 * @param form
 */
function _ajaxSubmitForm(form){};
/**
 * ajax的验证form框架
 * @param formId
 * @returns
 */
function ajaxValidForm(formId){
      jQuery .extend (jQuery .validator .messages ,{
                  required : &#34;必选字段&#34; ,   
                remote : &#34;请修正该字段&#34; ,  
                email : &#34;请输入正确格式的电子邮件&#34; ,  
                url : &#34;请输入合法的网址&#34; , 
                date : &#34;请输入合法的日期&#34; ,  
                dateISO : &#34;请输入合法的日期 (ISO).&#34; , 
                number : &#34;请输入合法的数字&#34; ,   
                digits : &#34;只能输入整数&#34; ,  
                creditcard : &#34;请输入合法的信用卡号&#34; ,  
                equalTo : &#34;请再次输入相同的值&#34; ,   
                accept : &#34;请输入拥有合法后缀名的字符串&#34; ,  
                maxlength : jQuery .format (&#34;请输入一个长度最多是 {0} 的字符串&#34; ),  
                minlength : jQuery .format (&#34;请输入一个长度最少是 {0} 的字符串&#34; ),  
                rangelength : jQuery .format (&#34;请输入一个长度介于 {0} 和 {1} 之间的字符串&#34; ),   
                range : jQuery .format (&#34;请输入一个介于 {0} 和 {1} 之间的值&#34; ),  
                max : jQuery .format (&#34;请输入一个最大为 {0} 的值&#34; ), 
                min : jQuery .format (&#34;请输入一个最小为 {0} 的值&#34; )
             }
       );
       return $( &#34;#&#34;&#43;formId).validate ({
            meta : &#34;valid&#34;,
            errorPlacement : function(error, element ) {
                   var $elm= $( element);
                   if(!error.is(&#39;:empty&#39; )) {
                         if($elm.siblings (&#34;p &gt; label.error&#34;). length&gt;0 ){
                              $elm .siblings (&#34;p &gt; label.error&#34;).replaceWith (error );
                         }else{
                               var $tmperr = $(&#34;&lt;p&gt;&lt;/p&gt;&#34;). wrapInner(error);
                              $elm .after ($tmperr );
                         }
                   }
             },
            success : function(label){
                  label .parent (&#34;p&#34;). remove();
             },
             //验证通过时的回调方法
            submitHandler :function( form,validator ){
                  _submitBeforeMaskCallback (form );
                  $ (form ).mask (&#34;请稍后...&#34;);
                  _ajaxSubmitForm (form );
                   //alert(&#39;submitHandler&#39;);
             },
             //验证失败时的回调方法
            invalidHandler : function(form, validator ) {
                  _invalidMethodCallback (form ,validator );
                   //alert(&#39;invalidHandler&#39;);
             }
       });
}

/**
 * 将数字转换成大写金额函数
 */ 
function rmbCapital(numberValue ){  
      var   numberValue =new String (Math .round (numberValue *100));    //   数字金额  
      var   chineseValue =&#34;&#34;;                      //   转换后的汉字金额  
      var   String1   =   &#34;零壹贰叁肆伍陆柒捌玖&#34; ;               //   汉字数字  
      var   String2   =   &#34;万仟佰拾亿仟佰拾万仟佰拾元角分&#34; ;           //   对应单位  
      var   len =numberValue .length ;                   //   numberValue   的字符串长度  
      var   Ch1 ;                           //   数字的汉语读法  
      var   Ch2 ;                           //   数字位的汉字读法  
      var   nZero =0;                          //   用来计算连续的零值的个数  
      var   String3 ;                         //   指定位置的数值  
      if( len&gt;15 ){  
              alert (&#34;超出计算范围&#34;);  
              return   &#34;&#34; ;  
      }  
      if   (numberValue ==0){   
              chineseValue   =   &#34;零元整&#34;;  
              return   chineseValue;   
      }  
      String2   =   String2 .substr (String2 .length -len ,   len );       //   取出对应位数的STRING2的值  
      for( var   i= 0;   i &lt;len;    i&#43;&#43;){  
              String3   =   parseInt (numberValue .substr (i ,   1),10 );       //   取出需转换的某一位的值  
              if   (    i   !=   (len   -   3)   &amp;&amp;   i   !=    (len   -   7)   &amp;&amp;   i   !=    (len   -   11)   &amp;&amp;   i   !=( len   -   15)   ){  
                      if   (    String3   ==   0   ){  
                              Ch1   =   &#34;&#34;;  
                              Ch2   =   &#34;&#34;;  
                              nZero   =   nZero   &#43;   1;  
                      }  
                      else   if   (   String3   !=   0   &amp;&amp;   nZero   !=    0   ){   
                              Ch1   =   &#34;零&#34;   &#43;    String1.substr( String3,   1);  
                              Ch2   =   String2 .substr (i ,   1);  
                              nZero   =   0;  
                      }  
                      else{  
                              Ch1   =   String1 .substr (String3 ,   1);  
                              Ch2   =   String2 .substr (i ,   1);  
                              nZero   =   0;  
                      }  
              }  
              else{                             //   该位是万亿，亿，万，元位等关键位  
                      if(   String3   !=   0   &amp;&amp;   nZero   !=    0   ){  
                              Ch1   =   &#34;零&#34;   &#43;    String1.substr( String3,   1);  
                              Ch2   =   String2 .substr (i ,   1);  
                              nZero   =   0;  
                      }  
                      else   if   (   String3   !=   0   &amp;&amp;   nZero   ==    0   ){   
                              Ch1   =   String1 .substr (String3 ,   1);  
                              Ch2   =   String2 .substr (i ,   1);  
                              nZero   =   0;  
                      }  
                      else   if(   String3   ==    0   &amp;&amp;   nZero   &gt;=    3   ){   
                              Ch1   =   &#34;&#34;;  
                              Ch2   =   &#34;&#34;;  
                              nZero   =   nZero   &#43;   1;  
                      }  
                      else{  
                              Ch1   =   &#34;&#34;;  
                              Ch2   =   String2 .substr (i ,   1);  
                              nZero   =   nZero   &#43;   1;  
                      }  
                      if(   i   ==   (len   -   11)   ||   i   ==   (len   -   3 )){         //   如果该位是亿位或元位，则必须写上  
                              Ch2   =   String2 .substr (i ,   1);  
                      }  
              }  
              chineseValue   =   chineseValue   &#43;   Ch1   &#43;   Ch2 ;  
      }  
      if   (   String3   ==   0   ){                       //   最后一位（分）为0时，加上“整”  
              chineseValue   =   chineseValue   &#43;   &#34;整&#34;;  
      }  
      return   chineseValue ;  
}

/*
===========================================
//去除左边的空格
===========================================

*/
String.prototype .LTrim = function()
{
        return this .replace (/(^\s*)/g, &#34;&#34; );
}


/*
===========================================
//去除右边的空格
===========================================
*/
String.prototype .Rtrim = function()
{
    return this.replace(/(\s*$)/g, &#34;&#34;);
}


/*
===========================================
//去除前后空格
===========================================
*/
String.prototype .Trim = function()
{
    return this .replace (/(^\s*)|(\s*$)/g, &#34;&#34; );
}


//监听键盘，只允许输入数字和小数点(只能一个)  、del、backspace，左、右键
function checkmsMoney(targetObject) {
    $(targetObject).keypress(function (event) {
        var keyCode = event.which;
        var tmpV = $(this).val();

        if (keyCode == 46 &amp;&amp; /^(0|([1-9](\d)*))$/.test(tmpV)) {//当0或者整数时，可输入小数点
            return true;
        } else if (keyCode &gt;= 48 &amp;&amp; keyCode &lt;= 57) {
            return true;
        } else if ((keyCode &gt;= 48 &amp;&amp; keyCode &lt;= 57) &amp;&amp; (tmpV == &#34;&#34; || /^(([1-9](\d)*))$/.test(tmpV))) {//当整数时，可输入数字
            return true;
        } else if (((keyCode &gt;= 48 &amp;&amp; keyCode &lt;= 57)) &amp;&amp; /(\.|(\.\d)){1}$/.test(tmpV)) {//当已经有小数点或者小数点1位时，可以输入1位数字
            return true;
        } else if (keyCode == 8 || keyCode == 37 || keyCode == 39) {//退格键，del，左右键
            return true;
        } else {
            return false;
        }
    }).focus(function () {
        this.style.imeMode = &#39;disabled&#39;;
    });
}
// 调用
// onfocus = &#34;checkmsMoney(this);&#34;

//首字母转换大小写
function UpperFirstLetter(str) {
    return str.replace(/\b\w&#43;\b/g, function (word) {
        return word.substring(0, 1).toUpperCase() &#43; word.substring(1);
    });
}
// ------------------
//数字输入验证
function numberInputValidate(keyCode, originalVal) {
    var tmpV = originalVal;
    if (keyCode == 46 &amp;&amp; /^(0|([1-9](\d)*))$/.test(tmpV)) {//当0或者整数时，可输入小数点
        return true;
    } else if (keyCode &gt;= 48 &amp;&amp; keyCode &lt;= 57) {
        return true;
    } else if ((keyCode &gt;= 48 &amp;&amp; keyCode &lt;= 57) &amp;&amp; (tmpV == &#34;&#34; || /^(([1-9](\d)*))$/.test(tmpV))) {//当整数时，可输入数字
        return true;
    } else if (((keyCode &gt;= 48 &amp;&amp; keyCode &lt;= 57)) &amp;&amp; /(\.|(\.\d)){1}$/.test(tmpV)) {//当已经有小数点或者小数点1位时，可以输入1位数字
        return true;
    } else if (keyCode == 8 || keyCode == 37 || keyCode == 39) {//退格键，del，左右键
        return true;
    } else {
        return false;
    }
}

$(&#34;input[name=&#39;decAmountInput&#39;]&#34;).keypress(function (event) {
    var keyCode = event.which;
    var result = numberInputValidate(keyCode, this.value);
    return result;
}).focus(function () {
    this.style.imeMode = &#39;disabled&#39;;
});
// -------------------

```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/scripts/javascript/%E5%B8%AE%E5%8A%A9%E7%B1%BB/  

