# Java汉字及unicode互转


# java 汉字和unicode互转 
{{&lt; highlight java &gt;}}
import java.io.UnsupportedEncodingException;
public class UnicodeConverter {
    public static void main(String[] args) throws UnsupportedEncodingException {
        String s = &#34; \t小\u51AC&#34;;
        System.out.println(&#34;Original:\t\t&#34; &#43; s);
        s = toEncodedUnicode(s, true);
        System.out.println(&#34;to unicode:\t\t&#34; &#43; s);
        s = fromEncodedUnicode(s.toCharArray(), 0, s.length());
        System.out.println(&#34;from unicode:\t&#34; &#43; s);
    }
    private static final char[] hexDigit = {
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
    private static char toHex(int nibble) {
        return hexDigit[(nibble &amp; 0xF)];
    }
    /**
     * 将字符串编码成 Unicode 形式的字符串. 如 &#34;小&#34; to &#34;\u5c0f&#34;
     * Converts unicodes to encoded \\uxxxx and escapes
     * special characters with a preceding slash
     * 
     * @param theString
     *        待转换成Unicode编码的字符串。
     * @param escapeSpace
     *        是否忽略空格，为true时在空格后面是否加个反斜杠。
     * @return 返回转换后Unicode编码的字符串。
     */
    public static String toEncodedUnicode(String theString, boolean escapeSpace) {
        int len = theString.length();
        int bufLen = len * 2;
        if (bufLen &lt; 0) {
            bufLen = Integer.MAX_VALUE;
        }
        StringBuffer outBuffer = new StringBuffer(bufLen);
        for (int x = 0; x &lt; len; x&#43;&#43;) {
            char aChar = theString.charAt(x);
            // Handle common case first, selecting largest block that
            // avoids the specials below
            if ((aChar &gt; 61) &amp;&amp; (aChar &lt; 127)) {
                if (aChar == &#39;\\&#39;) {
                    outBuffer.append(&#39;\\&#39;);
                    outBuffer.append(&#39;\\&#39;);
                    continue;
                }
                outBuffer.append(aChar);
                continue;
            }
            switch (aChar) {
                case &#39; &#39;:
                    if (x == 0 || escapeSpace) outBuffer.append(&#39;\\&#39;);
                    outBuffer.append(&#39; &#39;);
                    break;
                case &#39;\t&#39;:
                    outBuffer.append(&#39;\\&#39;);
                    outBuffer.append(&#39;t&#39;);
                    break;
                case &#39;\n&#39;:
                    outBuffer.append(&#39;\\&#39;);
                    outBuffer.append(&#39;n&#39;);
                    break;
                case &#39;\r&#39;:
                    outBuffer.append(&#39;\\&#39;);
                    outBuffer.append(&#39;r&#39;);
                    break;
                case &#39;\f&#39;:
                    outBuffer.append(&#39;\\&#39;);
                    outBuffer.append(&#39;f&#39;);
                    break;
                case &#39;=&#39;: // Fall through
                case &#39;:&#39;: // Fall through
                case &#39;#&#39;: // Fall through
                case &#39;!&#39;:
                    outBuffer.append(&#39;\\&#39;);
                    outBuffer.append(aChar);
                    break;
                default:
                    if ((aChar &lt; 0x0020) || (aChar &gt; 0x007e)) {
                        // 每个unicode有16位，每四位对应的16进制从高位保存到低位
                        outBuffer.append(&#39;\\&#39;);
                        outBuffer.append(&#39;u&#39;);
                        outBuffer.append(toHex((aChar &gt;&gt; 12) &amp; 0xF));
                        outBuffer.append(toHex((aChar &gt;&gt; 8) &amp; 0xF));
                        outBuffer.append(toHex((aChar &gt;&gt; 4) &amp; 0xF));
                        outBuffer.append(toHex(aChar &amp; 0xF));
                    } else {
                        outBuffer.append(aChar);
                    }
            }
        }
        return outBuffer.toString();
    }
    /**
     * 从 Unicode 形式的字符串转换成对应的编码的特殊字符串。 如 &#34;\u5c0f&#34; to &#34;小&#34;.
     * Converts encoded \\uxxxx to unicode chars
     * and changes special saved chars to their original forms
     * 
     * @param in
     *        Unicode编码的字符数组。
     * @param off
     *        转换的起始偏移量。
     * @param len
     *        转换的字符长度。
     * @param convtBuf
     *        转换的缓存字符数组。
     * @return 完成转换，返回编码前的特殊字符串。
     */
    public static String fromEncodedUnicode(char[] in , int off, int len) {
        char aChar;
        char[] out = new char[len]; // 只短不长
        int outLen = 0;
        int end = off &#43; len;
        while (off &lt; end) {
            aChar = in [off&#43;&#43;];
            if (aChar == &#39;\\&#39;) {
                aChar = in [off&#43;&#43;];
                if (aChar == &#39;u&#39;) {
                    // Read the xxxx
                    int value = 0;
                    for (int i = 0; i &lt; 4; i&#43;&#43;) {
                        aChar = in [off&#43;&#43;];
                        switch (aChar) {
                            case &#39;0&#39;:
                            case &#39;1&#39;:
                            case &#39;2&#39;:
                            case &#39;3&#39;:
                            case &#39;4&#39;:
                            case &#39;5&#39;:
                            case &#39;6&#39;:
                            case &#39;7&#39;:
                            case &#39;8&#39;:
                            case &#39;9&#39;:
                                value = (value &lt;&lt; 4) &#43; aChar - &#39;0&#39;;
                                break;
                            case &#39;a&#39;:
                            case &#39;b&#39;:
                            case &#39;c&#39;:
                            case &#39;d&#39;:
                            case &#39;e&#39;:
                            case &#39;f&#39;:
                                value = (value &lt;&lt; 4) &#43; 10 &#43; aChar - &#39;a&#39;;
                                break;
                            case &#39;A&#39;:
                            case &#39;B&#39;:
                            case &#39;C&#39;:
                            case &#39;D&#39;:
                            case &#39;E&#39;:
                            case &#39;F&#39;:
                                value = (value &lt;&lt; 4) &#43; 10 &#43; aChar - &#39;A&#39;;
                                break;
                            default:
                                throw new IllegalArgumentException(&#34;Malformed \\uxxxx encoding.&#34;);
                        }
                    }
                    out[outLen&#43;&#43;] = (char) value;
                } else {
                    if (aChar == &#39;t&#39;) {
                        aChar = &#39;\t&#39;;
                    } else if (aChar == &#39;r&#39;) {
                        aChar = &#39;\r&#39;;
                    } else if (aChar == &#39;n&#39;) {
                        aChar = &#39;\n&#39;;
                    } else if (aChar == &#39;f&#39;) {
                        aChar = &#39;\f&#39;;
                    }
                    out[outLen&#43;&#43;] = aChar;
                }
            } else {
                out[outLen&#43;&#43;] = (char) aChar;
            }
        }
        return new String(out, 0, outLen);
    }
}
{{&lt; /highlight &gt;}} 


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/scripts/java/%E6%B1%89%E5%AD%97%E5%8F%8Aunicode%E4%BA%92%E8%BD%AC/  

