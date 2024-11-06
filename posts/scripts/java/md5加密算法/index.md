# Java下的Md5加密算法


# java 下的  MD5 算法  

{{&lt; highlight java &gt;}}
/************************************************
MD5 算法的Java Bean
@author:Topcat Tuppin
Last Modified:10,Mar,2001
*************************************************/
import java.lang.reflect.*;
/*************************************************
md5 类实现了RSA Data Security, Inc.在提交给IETF
的RFC1321中的MD5 message -digest 算法。
*************************************************/
public class MD5 {
    /* 下面这些S11-S44实际上是一个4*4的矩阵，在原始的C实现中是用#define 实现的，
    这里把它们实现成为static final是表示了只读，切能在同一个进程空间内的多个
    Instance间共享*/
    static final int S11 = 7;
    static final int S12 = 12;
    static final int S13 = 17;
    static final int S14 = 22;
    static final int S21 = 5;
    static final int S22 = 9;
    static final int S23 = 14;
    static final int S24 = 20;
    static final int S31 = 4;
    static final int S32 = 11;
    static final int S33 = 16;
    static final int S34 = 23;
    static final int S41 = 6;
    static final int S42 = 10;
    static final int S43 = 15;
    static final int S44 = 21;
    static final byte[] PADDING = {-128,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
    };
    /* 下面的三个成员是MD5计算过程中用到的3个核心数据，在原始的C实现中
       被定义到MD5_CTX结构中
      
     */
    private long[] state = new long[4]; // state (ABCD)
    private long[] count = new long[2]; // number of bits, modulo 2^64 (lsb first)
    private byte[] buffer = new byte[64]; // input buffer
    /* digestHexStr是MD5的唯一一个公共成员，是最新一次计算结果的
      16进制ASCII表示.
    */
    public String digestHexStr;
    /* digest,是最新一次计算结果的2进制内部表示，表示128bit的MD5值.
     */
    private byte[] digest = new byte[16];
    /*
      getMD5ofStr是类MD5最主要的公共方法，入口参数是你想要进行MD5变换的字符串
      返回的是变换完的结果，这个结果是从公共成员digestHexStr取得的．
    */
    public String getMD5ofStr(String inbuf) {
        md5Init();
        md5Update(inbuf.getBytes(), inbuf.length());
        md5Final();
        digestHexStr = &#34;&#34;;
        for (int i = 0; i &lt; 16; i&#43;&#43;) {
            digestHexStr &#43;= byteHEX(digest[i]);
        }
        return digestHexStr;
    }
    // 这是MD5这个类的标准构造函数，JavaBean要求有一个public的并且没有参数的构造函数
    public MD5() {
        md5Init();
        return;
    }
    /* md5Init是一个初始化函数，初始化核心变量，装入标准的幻数 */
    private void md5Init() {
        count[0] = 0 L;
        count[1] = 0 L;
        ///* Load magic initialization constants.
        state[0] = 0x67452301 L;
        state[1] = 0xefcdab89 L;
        state[2] = 0x98badcfe L;
        state[3] = 0x10325476 L;
        return;
    }
    /* F, G, H ,I 是4个基本的MD5函数，在原始的MD5的C实现中，由于它们是
        简单的位运算，可能出于效率的考虑把它们实现成了宏，在java中，我们把它们
       实现成了private方法，名字保持了原来C中的。 */
    private long F(long x, long y, long z) {
        return (x &amp; y) | ((~x) &amp; z);
    }
    private long G(long x, long y, long z) {
        return (x &amp; z) | (y &amp; (~z));
    }
    private long H(long x, long y, long z) {
        return x ^ y ^ z;
    }
    private long I(long x, long y, long z) {
        return y ^ (x | (~z));
    }
    /*
       FF,GG,HH和II将调用F,G,H,I进行近一步变换
       FF, GG, HH, and II transformations for rounds 1, 2, 3, and 4.
       Rotation is separate from addition to prevent recomputation.
    */
    private long FF(long a, long b, long c, long d, long x, long s, long ac) {
        a &#43;= F(b, c, d) &#43; x &#43; ac;
        a = ((int) a &lt;&lt; s) | ((int) a &gt;&gt;&gt; (32 - s));
        a &#43;= b;
        return a;
    }
    private long GG(long a, long b, long c, long d, long x, long s, long ac) {
        a &#43;= G(b, c, d) &#43; x &#43; ac;
        a = ((int) a &lt;&lt; s) | ((int) a &gt;&gt;&gt; (32 - s));
        a &#43;= b;
        return a;
    }
    private long HH(long a, long b, long c, long d, long x, long s, long ac) {
        a &#43;= H(b, c, d) &#43; x &#43; ac;
        a = ((int) a &lt;&lt; s) | ((int) a &gt;&gt;&gt; (32 - s));
        a &#43;= b;
        return a;
    }
    private long II(long a, long b, long c, long d, long x, long s, long ac) {
        a &#43;= I(b, c, d) &#43; x &#43; ac;
        a = ((int) a &lt;&lt; s) | ((int) a &gt;&gt;&gt; (32 - s));
        a &#43;= b;
        return a;
    }
    /*
     md5Update是MD5的主计算过程， inbuf是要变换的字节串， inputlen是长度，这个
     函数由getMD5ofStr调用，调用之前需要调用md5init，因此把它设计成private的
    */
    private void md5Update(byte[] inbuf, int inputLen) {
        int i, index, partLen;
        byte[] block = new byte[64];
        index = (int)(count[0] &gt;&gt;&gt; 3) &amp; 0x3F;
        // /* Update number of bits */
        if ((count[0] &#43;= (inputLen &lt;&lt; 3)) &lt; (inputLen &lt;&lt; 3)) count[1]&#43;&#43;;
        count[1] &#43;= (inputLen &gt;&gt;&gt; 29);
        partLen = 64 - index;
        // Transform as many times as possible.
        if (inputLen &gt;= partLen) {
            md5Memcpy(buffer, inbuf, index, 0, partLen);
            md5Transform(buffer);
            for (i = partLen; i &#43; 63 &lt; inputLen; i &#43;= 64) {
                md5Memcpy(block, inbuf, 0, i, 64);
                md5Transform(block);
            }
            index = 0;
        } else i = 0;
        ///* Buffer remaining input */
        md5Memcpy(buffer, inbuf, index, i, inputLen - i);
    }
    /*
      md5Final整理和填写输出结果
    */
    private void md5Final() {
        byte[] bits = new byte[8];
        int index, padLen;
        ///* Save number of bits */
        Encode(bits, count, 8);
        ///* Pad out to 56 mod 64.
        index = (int)(count[0] &gt;&gt;&gt; 3) &amp; 0x3f;
        padLen = (index &lt; 56) ? (56 - index) : (120 - index);
        md5Update(PADDING, padLen);
        ///* Append length (before padding) */
        md5Update(bits, 8);
        ///* Store state in digest */
        Encode(digest, state, 16);
    }
    /* md5Memcpy是一个内部使用的byte数组的块拷贝函数，从input的 inpos开始把len长度的
      字节拷贝到output的 outpos位置开始
        */
    private void md5Memcpy(byte[] output, byte[] input, int outpos, int inpos, int len) {
        int i;
        for (i = 0; i &lt; len; i&#43;&#43;) output[outpos &#43; i] = input[inpos &#43; i];
    }
    /*
       md5Transform是MD5核心变换程序，有md5Update调用，block是分块的原始字节
    */
    private void md5Transform(byte block[]) {
        long a = state[0], b = state[1], c = state[2], d = state[3];
        long[] x = new long[16];
        Decode(x, block, 64);
        /* Round 1 */
        a = FF(a, b, c, d, x[0], S11, 0xd76aa478 L); /* 1 */
        d = FF(d, a, b, c, x[1], S12, 0xe8c7b756 L); /* 2 */
        c = FF(c, d, a, b, x[2], S13, 0x242070db L); /* 3 */
        b = FF(b, c, d, a, x[3], S14, 0xc1bdceee L); /* 4 */
        a = FF(a, b, c, d, x[4], S11, 0xf57c0faf L); /* 5 */
        d = FF(d, a, b, c, x[5], S12, 0x4787c62a L); /* 6 */
        c = FF(c, d, a, b, x[6], S13, 0xa8304613 L); /* 7 */
        b = FF(b, c, d, a, x[7], S14, 0xfd469501 L); /* 8 */
        a = FF(a, b, c, d, x[8], S11, 0x698098d8 L); /* 9 */
        d = FF(d, a, b, c, x[9], S12, 0x8b44f7af L); /* 10 */
        c = FF(c, d, a, b, x[10], S13, 0xffff5bb1 L); /* 11 */
        b = FF(b, c, d, a, x[11], S14, 0x895cd7be L); /* 12 */
        a = FF(a, b, c, d, x[12], S11, 0x6b901122 L); /* 13 */
        d = FF(d, a, b, c, x[13], S12, 0xfd987193 L); /* 14 */
        c = FF(c, d, a, b, x[14], S13, 0xa679438e L); /* 15 */
        b = FF(b, c, d, a, x[15], S14, 0x49b40821 L); /* 16 */
        /* Round 2 */
        a = GG(a, b, c, d, x[1], S21, 0xf61e2562 L); /* 17 */
        d = GG(d, a, b, c, x[6], S22, 0xc040b340 L); /* 18 */
        c = GG(c, d, a, b, x[11], S23, 0x265e5a51 L); /* 19 */
        b = GG(b, c, d, a, x[0], S24, 0xe9b6c7aa L); /* 20 */
        a = GG(a, b, c, d, x[5], S21, 0xd62f105d L); /* 21 */
        d = GG(d, a, b, c, x[10], S22, 0x2441453 L); /* 22 */
        c = GG(c, d, a, b, x[15], S23, 0xd8a1e681 L); /* 23 */
        b = GG(b, c, d, a, x[4], S24, 0xe7d3fbc8 L); /* 24 */
        a = GG(a, b, c, d, x[9], S21, 0x21e1cde6 L); /* 25 */
        d = GG(d, a, b, c, x[14], S22, 0xc33707d6 L); /* 26 */
        c = GG(c, d, a, b, x[3], S23, 0xf4d50d87 L); /* 27 */
        b = GG(b, c, d, a, x[8], S24, 0x455a14ed L); /* 28 */
        a = GG(a, b, c, d, x[13], S21, 0xa9e3e905 L); /* 29 */
        d = GG(d, a, b, c, x[2], S22, 0xfcefa3f8 L); /* 30 */
        c = GG(c, d, a, b, x[7], S23, 0x676f02d9 L); /* 31 */
        b = GG(b, c, d, a, x[12], S24, 0x8d2a4c8a L); /* 32 */
        /* Round 3 */
        a = HH(a, b, c, d, x[5], S31, 0xfffa3942 L); /* 33 */
        d = HH(d, a, b, c, x[8], S32, 0x8771f681 L); /* 34 */
        c = HH(c, d, a, b, x[11], S33, 0x6d9d6122 L); /* 35 */
        b = HH(b, c, d, a, x[14], S34, 0xfde5380c L); /* 36 */
        a = HH(a, b, c, d, x[1], S31, 0xa4beea44 L); /* 37 */
        d = HH(d, a, b, c, x[4], S32, 0x4bdecfa9 L); /* 38 */
        c = HH(c, d, a, b, x[7], S33, 0xf6bb4b60 L); /* 39 */
        b = HH(b, c, d, a, x[10], S34, 0xbebfbc70 L); /* 40 */
        a = HH(a, b, c, d, x[13], S31, 0x289b7ec6 L); /* 41 */
        d = HH(d, a, b, c, x[0], S32, 0xeaa127fa L); /* 42 */
        c = HH(c, d, a, b, x[3], S33, 0xd4ef3085 L); /* 43 */
        b = HH(b, c, d, a, x[6], S34, 0x4881d05 L); /* 44 */
        a = HH(a, b, c, d, x[9], S31, 0xd9d4d039 L); /* 45 */
        d = HH(d, a, b, c, x[12], S32, 0xe6db99e5 L); /* 46 */
        c = HH(c, d, a, b, x[15], S33, 0x1fa27cf8 L); /* 47 */
        b = HH(b, c, d, a, x[2], S34, 0xc4ac5665 L); /* 48 */
        /* Round 4 */
        a = II(a, b, c, d, x[0], S41, 0xf4292244 L); /* 49 */
        d = II(d, a, b, c, x[7], S42, 0x432aff97 L); /* 50 */
        c = II(c, d, a, b, x[14], S43, 0xab9423a7 L); /* 51 */
        b = II(b, c, d, a, x[5], S44, 0xfc93a039 L); /* 52 */
        a = II(a, b, c, d, x[12], S41, 0x655b59c3 L); /* 53 */
        d = II(d, a, b, c, x[3], S42, 0x8f0ccc92 L); /* 54 */
        c = II(c, d, a, b, x[10], S43, 0xffeff47d L); /* 55 */
        b = II(b, c, d, a, x[1], S44, 0x85845dd1 L); /* 56 */
        a = II(a, b, c, d, x[8], S41, 0x6fa87e4f L); /* 57 */
        d = II(d, a, b, c, x[15], S42, 0xfe2ce6e0 L); /* 58 */
        c = II(c, d, a, b, x[6], S43, 0xa3014314 L); /* 59 */
        b = II(b, c, d, a, x[13], S44, 0x4e0811a1 L); /* 60 */
        a = II(a, b, c, d, x[4], S41, 0xf7537e82 L); /* 61 */
        d = II(d, a, b, c, x[11], S42, 0xbd3af235 L); /* 62 */
        c = II(c, d, a, b, x[2], S43, 0x2ad7d2bb L); /* 63 */
        b = II(b, c, d, a, x[9], S44, 0xeb86d391 L); /* 64 */
        state[0] &#43;= a;
        state[1] &#43;= b;
        state[2] &#43;= c;
        state[3] &#43;= d;
    }
    /*Encode把long数组按顺序拆成byte数组，因为java的long类型是64bit的，
      只拆低32bit，以适应原始C实现的用途
    */
    private void Encode(byte[] output, long[] input, int len) {
        int i, j;
        for (i = 0, j = 0; j &lt; len; i&#43;&#43;, j &#43;= 4) {
            output[j] = (byte)(input[i] &amp; 0xff L);
            output[j &#43; 1] = (byte)((input[i] &gt;&gt;&gt; 8) &amp; 0xff L);
            output[j &#43; 2] = (byte)((input[i] &gt;&gt;&gt; 16) &amp; 0xff L);
            output[j &#43; 3] = (byte)((input[i] &gt;&gt;&gt; 24) &amp; 0xff L);
        }
    }
    /*Decode把byte数组按顺序合成成long数组，因为java的long类型是64bit的，
      只合成低32bit，高32bit清零，以适应原始C实现的用途
    */
    private void Decode(long[] output, byte[] input, int len) {
        int i, j;
        for (i = 0, j = 0; j &lt; len; i&#43;&#43;, j &#43;= 4) output[i] = b2iu(input[j]) | (b2iu(input[j &#43; 1]) &lt;&lt; 8) | (b2iu(input[j &#43; 2]) &lt;&lt; 16) | (b2iu(input[j &#43; 3]) &lt;&lt; 24);
        return;
    }
    /*
      b2iu是我写的一个把byte按照不考虑正负号的原则的＂升位＂程序，因为java没有unsigned运算
    */
    public static long b2iu(byte b) {
        return b &lt; 0 ? b &amp; 0x7F &#43; 128 : b;
    }
    /*byteHEX()，用来把一个byte类型的数转换成十六进制的ASCII表示，
    因为java中的byte的toString无法实现这一点，我们又没有C语言中的
      sprintf(outbuf ,&#34;%02X&#34;,ib)
    */
    public static String byteHEX(byte ib) {
        char[] Digit = {
            &#39;0&#39;,
            &#39;1&#39;,
            &#39;2&#39;,
            &#39;3&#39;,
            &#39;4&#39;,
            &#39;5&#39;,
            &#39;6&#39;,
            &#39;7&#39;,
            &#39;8&#39;,
            &#39;9&#39;,
            &#39;A&#39;,
            &#39;B&#39;,
            &#39;C&#39;,
            &#39;D&#39;,
            &#39;E&#39;,
            &#39;F&#39;
        };
        char[] ob = new char[2];
        ob[0] = Digit[(ib &gt;&gt;&gt; 4) &amp; 0X0F];
        ob[1] = Digit[ib &amp; 0X0F];
        String s = new String(ob);
        return s;
    }
    public static void main(String args[]) {
        MD5 m = new MD5();
        if (Array.getLength(args) == 0) { //如果没有参数，执行标准的Test Suite
            System.out.println(&#34;MD5 Test suite:&#34;);
            System.out.println(&#34;MD5(\&#34;\&#34;):&#34; &#43; m.getMD5ofStr(&#34;&#34;));
            System.out.println(&#34;MD5(\&#34;a\&#34;):&#34; &#43; m.getMD5ofStr(&#34;a&#34;));
            System.out.println(&#34;MD5(\&#34;abc\&#34;):&#34; &#43; m.getMD5ofStr(&#34;abc&#34;));
            System.out.println(&#34;MD5(\&#34;message digest\&#34;):&#34; &#43; m.getMD5ofStr(&#34;message digest&#34;));
            System.out.println(&#34;MD5(\&#34;abcdefghijklmnopqrstuvwxyz\&#34;):&#34; &#43; m.getMD5ofStr(&#34;abcdefghijklmnopqrstuvwxyz&#34;));
            System.out.println(&#34;MD5(\&#34;ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\&#34;):&#34; &#43; m.getMD5ofStr(&#34;ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789&#34;));
        } else System.out.println(&#34;MD5(&#34; &#43; args[0] &#43; &#34;)=&#34; &#43; m.getMD5ofStr(args[0]));
    }
}
{{&lt; /highlight &gt;}}

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/scripts/java/md5%E5%8A%A0%E5%AF%86%E7%AE%97%E6%B3%95/  

