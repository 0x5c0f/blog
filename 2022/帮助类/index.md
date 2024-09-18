# javascript 帮助类


```javascript
function check_browser() {
   Opera = (navigator .userAgent .indexOf ("Opera", 0) != -1 )?1: 0;
   MSIE = (navigator .userAgent .indexOf ("Microsoft", 0) != -1 )?1: 0;
   FX = (navigator .userAgent .indexOf ("Mozilla", 0) != -1 )?1: 0;
   if ( Opera ) brow_type = "Opera";
   else if ( FX )brow_type = "Firefox";
   else if ( MSIE )brow_type = "MSIE";
   return brow_type ;
}

function getWindowHeight() {
       var windowHeight = 0 ;
       if ( typeof(window.innerHeight ) == 'number') {
            windowHeight = window .innerHeight ;
       }
       else {
             if ( document.documentElement && document.documentElement. clientHeight) {
                  windowHeight = document .documentElement .clientHeight ;
             }
             else {
                   if ( document.body && document .body .clientHeight ) {
                        windowHeight = document .body .clientHeight ;
                   }
             }
       }
       return windowHeight;
}

function getWindowWidth() {
       var windowWidth = 0 ;
       if ( typeof(window.innerWidth ) == 'number') {
            windowWidth = window .innerWidth ;
       }
       else {
             if ( document.documentElement && document.documentElement. clientWidth) {
                  windowWidth = document .documentElement .clientWidth ;
             }
             else {
                   if ( document.body && document .body .clientWidth ) {
                        windowWidth = document .body .clientWidth ;
                   }
             }
       }
       return windowWidth;
}


/*open window at the middle&center of screen*/
function openwindow(url,name,iWidth,iHeight,isFullScreen )
{
       var url;
       var name;
       var iWidth;
       var iHeight;
       if(isFullScreen !=undefined && isFullScreen== '1')
       {
            iWidth = window .screen .availWidth - 10;
            iHeight = window .screen .availHeight - 30;
       }
       var iTop = ( window.screen.availHeight -30- iHeight)/2 ;
       var iLeft = ( window.screen.availWidth -10- iWidth)/2 ;
      window .open (url ,name ,'height='+ iHeight+',innerHeight=' +iHeight +',width='+ iWidth+',innerWidth=' +iWidth +',top='+ iTop+',left=' +iLeft +',toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=no,status=yes,titlebar=yes' );
}
/*
 function: compare old_str and new_str, then output add_str and del_str
 example_1:      old_str=1,2,3,5;new_str=1,3,4,6;compareStr(old_str,new_str)=4,6;2,5
 notice: under any condition, ';' exists all the same!
*/
function compareStr(oldStr,newStr)
{
       if(oldStr==newStr)
       {
             return ';' ;
       }
       if(oldStr=='' )
       {
             return newStr+ ';';
       }
       if(newStr=='' )
       {
             return ';' +oldStr ;
       }
       var oldArr = oldStr.split(',' );
       var newArr = newStr.split(',' );
       var dels = '' ;
       var adds = '' ;
       for(var i= 0;i<oldArr .length ;i ++)
       {     
             var tag = 0 ;
             for(var j= 0;j<newArr .length ;j ++)
             {
                   if(oldArr[i] == newArr[j] )
                   {
                        tag = 1;
                         break;
                   }
             }
             if(tag == 0)
             {
                  dels = dels + oldArr[i] + ',';
             }
       }
       for(var i= 0;i<newArr .length ;i ++)
       {     
             var tag = 0 ;
             for(var j= 0;j<oldArr .length ;j ++)
             {
                   if(newArr[i] == oldArr[j] )
                   {
                        tag = 1;
                         break;
                   }
             }
             if(tag == 0)
             {
                  adds = adds + newArr[i] + ',';
             }
       }
       if(dels=='' && adds!='' )
       {
             return adds. substring(0 ,adds .lastIndexOf (',')) + ';' ;
       }
       else if (adds =='' && dels !='')
       {
             return ';' + dels.substring (0, dels.lastIndexOf (','));
       }
       else if (adds =='' && dels =='')
       {
             return ';' ;
       }
       else
       {
             return adds. substring(0 ,adds .lastIndexOf (',')) + ';' + dels.substring( 0,dels.lastIndexOf (','));
       }
}

/*JS高精度计算*/
//除法
function accDiv(arg1,arg2){
       var t1= 0,t2=0 ,r1 ,r2 ;
       try{t1=arg1.toString ().split( ".")[1].length}catch (e ){}
       try{t2=arg2.toString ().split( ".")[1].length}catch (e ){}
       with(Math){
            r1 =Number (arg1 .toString ().replace( ".","" ))
            r2 =Number (arg2 .toString ().replace( ".","" ))
             return ( r1/ r2)* pow(10 ,t2 -t1 );
       }
}
//乘法
function accMul(arg1,arg2)
{
       var m= 0,s1=arg1.toString (),s2= arg2.toString ();
       try{m+=s1.split("." )[ 1] .length }catch( e){}
       try{m+=s2.split("." )[ 1] .length }catch( e){}
       return Number(s1. replace("." ,""))* Number(s2.replace("." ,""))/ Math.pow(10 ,m );
}
//加法
function accAdd(arg1,arg2){
       var r1, r2, m;
       try{r1=arg1.toString ().split( ".")[1].length}catch (e ){r1 =0}
       try{r2=arg2.toString ().split( ".")[1].length}catch (e ){r2 =0}
      m =Math .pow (10, Math.max(r1,r2))
       return ( arg1*m+arg2*m)/m;
}
//减法
function accSubtr(arg1,arg2){
     var r1 ,r2 ,m ,n ;
     try{ r1= arg1.toString ().split( ".")[1].length}catch (e ){r1 =0}
     try{ r2= arg2.toString ().split( ".")[1].length}catch (e ){r2 =0}
     m=Math.pow(10 ,Math .max (r1 ,r2 ));
     //last modify by deeka
     //动态控制精度长度
     n=(r1>=r2)?r1:r2;
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
                  required : "必填项",   
                remote : "请修正该字段" ,  
                email : "请输入正确格式的电子邮件" ,  
                url : "请输入合法的网址" , 
                date : "请输入合法的日期" ,  
                dateISO : "请输入合法的日期 (ISO)." , 
                number : "请输入合法的数字" ,   
                digits : "只能输入整数" ,  
                creditcard : "请输入合法的信用卡号" ,  
                equalTo : "请再次输入相同的值" ,   
                accept : "请输入拥有合法后缀名的字符串" ,  
                maxlength : jQuery .format ("请输入一个长度最多是 {0} 的字符串" ),  
                minlength : jQuery .format ("请输入一个长度最少是 {0} 的字符串" ),  
                rangelength : jQuery .format ("请输入一个长度介于 {0} 和 {1} 之间的字符串" ),   
                range : jQuery .format ("请输入一个介于 {0} 和 {1} 之间的值" ),  
                max : jQuery .format ("请输入一个最大为 {0} 的值" ), 
                min : jQuery .format ("请输入一个最小为 {0} 的值" )
             }
       );
       return $( "#"+formId).validate ({
            meta : "valid",
            errorPlacement : function(error, element ) {
                   var $elm= $( element);
                   if(!error.is(':empty' )) {
                         if($elm.siblings ("p > label.error"). length>0 ){
                              $elm .siblings ("p > label.error").replaceWith (error );
                         }else{
                               var $tmperr = $("<p></p>"). wrapInner(error);
                              $elm .after ($tmperr );
                         }
                   }
             },
            success : function(label){
                  label .parent ("p"). remove();
             },
             //验证通过时的回调方法
            submitHandler :function( form){
                  _submitBeforeMaskCallback (form );
                  $ (form ).mask ("请稍后...");
                  form .submit ();
                   //alert('submitHandler');
             },
             //验证失败时的回调方法
            invalidHandler : function(form, validator ) {
                  _invalidMethodCallback (form ,validator );
                   //alert('invalidHandler');
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
                  required : "必选字段" ,   
                remote : "请修正该字段" ,  
                email : "请输入正确格式的电子邮件" ,  
                url : "请输入合法的网址" , 
                date : "请输入合法的日期" ,  
                dateISO : "请输入合法的日期 (ISO)." , 
                number : "请输入合法的数字" ,   
                digits : "只能输入整数" ,  
                creditcard : "请输入合法的信用卡号" ,  
                equalTo : "请再次输入相同的值" ,   
                accept : "请输入拥有合法后缀名的字符串" ,  
                maxlength : jQuery .format ("请输入一个长度最多是 {0} 的字符串" ),  
                minlength : jQuery .format ("请输入一个长度最少是 {0} 的字符串" ),  
                rangelength : jQuery .format ("请输入一个长度介于 {0} 和 {1} 之间的字符串" ),   
                range : jQuery .format ("请输入一个介于 {0} 和 {1} 之间的值" ),  
                max : jQuery .format ("请输入一个最大为 {0} 的值" ), 
                min : jQuery .format ("请输入一个最小为 {0} 的值" )
             }
       );
       return $( "#"+formId).validate ({
            meta : "valid",
            errorPlacement : function(error, element ) {
                   var $elm= $( element);
                   if(!error.is(':empty' )) {
                         if($elm.siblings ("p > label.error"). length>0 ){
                              $elm .siblings ("p > label.error").replaceWith (error );
                         }else{
                               var $tmperr = $("<p></p>"). wrapInner(error);
                              $elm .after ($tmperr );
                         }
                   }
             },
            success : function(label){
                  label .parent ("p"). remove();
             },
             //验证通过时的回调方法
            submitHandler :function( form,validator ){
                  _submitBeforeMaskCallback (form );
                  $ (form ).mask ("请稍后...");
                  _ajaxSubmitForm (form );
                   //alert('submitHandler');
             },
             //验证失败时的回调方法
            invalidHandler : function(form, validator ) {
                  _invalidMethodCallback (form ,validator );
                   //alert('invalidHandler');
             }
       });
}

/**
 * 将数字转换成大写金额函数
 */ 
function rmbCapital(numberValue ){  
      var   numberValue =new String (Math .round (numberValue *100));    //   数字金额  
      var   chineseValue ="";                      //   转换后的汉字金额  
      var   String1   =   "零壹贰叁肆伍陆柒捌玖" ;               //   汉字数字  
      var   String2   =   "万仟佰拾亿仟佰拾万仟佰拾元角分" ;           //   对应单位  
      var   len =numberValue .length ;                   //   numberValue   的字符串长度  
      var   Ch1 ;                           //   数字的汉语读法  
      var   Ch2 ;                           //   数字位的汉字读法  
      var   nZero =0;                          //   用来计算连续的零值的个数  
      var   String3 ;                         //   指定位置的数值  
      if( len>15 ){  
              alert ("超出计算范围");  
              return   "" ;  
      }  
      if   (numberValue ==0){   
              chineseValue   =   "零元整";  
              return   chineseValue;   
      }  
      String2   =   String2 .substr (String2 .length -len ,   len );       //   取出对应位数的STRING2的值  
      for( var   i= 0;   i <len;    i++){  
              String3   =   parseInt (numberValue .substr (i ,   1),10 );       //   取出需转换的某一位的值  
              if   (    i   !=   (len   -   3)   &&   i   !=    (len   -   7)   &&   i   !=    (len   -   11)   &&   i   !=( len   -   15)   ){  
                      if   (    String3   ==   0   ){  
                              Ch1   =   "";  
                              Ch2   =   "";  
                              nZero   =   nZero   +   1;  
                      }  
                      else   if   (   String3   !=   0   &&   nZero   !=    0   ){   
                              Ch1   =   "零"   +    String1.substr( String3,   1);  
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
                      if(   String3   !=   0   &&   nZero   !=    0   ){  
                              Ch1   =   "零"   +    String1.substr( String3,   1);  
                              Ch2   =   String2 .substr (i ,   1);  
                              nZero   =   0;  
                      }  
                      else   if   (   String3   !=   0   &&   nZero   ==    0   ){   
                              Ch1   =   String1 .substr (String3 ,   1);  
                              Ch2   =   String2 .substr (i ,   1);  
                              nZero   =   0;  
                      }  
                      else   if(   String3   ==    0   &&   nZero   >=    3   ){   
                              Ch1   =   "";  
                              Ch2   =   "";  
                              nZero   =   nZero   +   1;  
                      }  
                      else{  
                              Ch1   =   "";  
                              Ch2   =   String2 .substr (i ,   1);  
                              nZero   =   nZero   +   1;  
                      }  
                      if(   i   ==   (len   -   11)   ||   i   ==   (len   -   3 )){         //   如果该位是亿位或元位，则必须写上  
                              Ch2   =   String2 .substr (i ,   1);  
                      }  
              }  
              chineseValue   =   chineseValue   +   Ch1   +   Ch2 ;  
      }  
      if   (   String3   ==   0   ){                       //   最后一位（分）为0时，加上“整”  
              chineseValue   =   chineseValue   +   "整";  
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
        return this .replace (/(^\s*)/g, "" );
}


/*
===========================================
//去除右边的空格
===========================================
*/
String.prototype .Rtrim = function()
{
    return this.replace(/(\s*$)/g, "");
}


/*
===========================================
//去除前后空格
===========================================
*/
String.prototype .Trim = function()
{
    return this .replace (/(^\s*)|(\s*$)/g, "" );
}


//监听键盘，只允许输入数字和小数点(只能一个)  、del、backspace，左、右键
function checkmsMoney(targetObject) {
    $(targetObject).keypress(function (event) {
        var keyCode = event.which;
        var tmpV = $(this).val();

        if (keyCode == 46 && /^(0|([1-9](\d)*))$/.test(tmpV)) {//当0或者整数时，可输入小数点
            return true;
        } else if (keyCode >= 48 && keyCode <= 57) {
            return true;
        } else if ((keyCode >= 48 && keyCode <= 57) && (tmpV == "" || /^(([1-9](\d)*))$/.test(tmpV))) {//当整数时，可输入数字
            return true;
        } else if (((keyCode >= 48 && keyCode <= 57)) && /(\.|(\.\d)){1}$/.test(tmpV)) {//当已经有小数点或者小数点1位时，可以输入1位数字
            return true;
        } else if (keyCode == 8 || keyCode == 37 || keyCode == 39) {//退格键，del，左右键
            return true;
        } else {
            return false;
        }
    }).focus(function () {
        this.style.imeMode = 'disabled';
    });
}
// 调用
// onfocus = "checkmsMoney(this);"

//首字母转换大小写
function UpperFirstLetter(str) {
    return str.replace(/\b\w+\b/g, function (word) {
        return word.substring(0, 1).toUpperCase() + word.substring(1);
    });
}
// ------------------
//数字输入验证
function numberInputValidate(keyCode, originalVal) {
    var tmpV = originalVal;
    if (keyCode == 46 && /^(0|([1-9](\d)*))$/.test(tmpV)) {//当0或者整数时，可输入小数点
        return true;
    } else if (keyCode >= 48 && keyCode <= 57) {
        return true;
    } else if ((keyCode >= 48 && keyCode <= 57) && (tmpV == "" || /^(([1-9](\d)*))$/.test(tmpV))) {//当整数时，可输入数字
        return true;
    } else if (((keyCode >= 48 && keyCode <= 57)) && /(\.|(\.\d)){1}$/.test(tmpV)) {//当已经有小数点或者小数点1位时，可以输入1位数字
        return true;
    } else if (keyCode == 8 || keyCode == 37 || keyCode == 39) {//退格键，del，左右键
        return true;
    } else {
        return false;
    }
}

$("input[name='decAmountInput']").keypress(function (event) {
    var keyCode = event.which;
    var result = numberInputValidate(keyCode, this.value);
    return result;
}).focus(function () {
    this.style.imeMode = 'disabled';
});
// -------------------

```
