# Java系统ip获取


# java 获取系统ip 
{{< highlight java >}}
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;
import java.util.regex.Pattern;
public class IPUtil {
    public static final String LOCALHOST = "127.0.0.1";
    public static final String ANYHOST = "0.0.0.0";
    private static final Pattern IP_PATTERN = Pattern.compile("\\d{1,3}(\\.\\d{1,3}){3,5}$");
    public static InetAddress getLocalAddress0() {
        InetAddress localAddress = null;
        try {
            localAddress = InetAddress.getLocalHost();
            if (isValidAddress(localAddress)) {
                return localAddress;
            }
        } catch (Throwable e) {
            System.out.println("Failed to retriving ip address, " + e.getMessage());
        }
        try {
            Enumeration < NetworkInterface > interfaces = NetworkInterface.getNetworkInterfaces();
            if (interfaces != null) {
                while (interfaces.hasMoreElements()) {
                    try {
                        NetworkInterface network = interfaces.nextElement();
                        Enumeration < InetAddress > addresses = network.getInetAddresses();
                        if (addresses != null) {
                            while (addresses.hasMoreElements()) {
                                try {
                                    InetAddress address = addresses.nextElement();
                                    if (isValidAddress(address)) {
                                        return address;
                                    }
                                } catch (Throwable e) {
                                    System.out.println("Failed to retriving ip address, " + e.getMessage());
                                }
                            }
                        }
                    } catch (Throwable e) {
                        System.out.println("Failed to retriving ip address, " + e.getMessage());
                    }
                }
            }
        } catch (Throwable e) {
            System.out.println("Failed to retriving ip address, " + e.getMessage());
        }
        System.out.println("Could not get local host ip address, will use 127.0.0.1 instead.");
        return localAddress;
    }
    private static boolean isValidAddress(InetAddress address) {
        if (address == null || address.isLoopbackAddress()) return false;
        String name = address.getHostAddress();
        return (name != null && !ANYHOST.equals(name) && !LOCALHOST.equals(name) && IP_PATTERN.matcher(name).matches());
    }
    public static void main(String[] args) {
        System.out.println(IPUtil.getLocalAddress0().getHostAddress());
    }
}
{{< /highlight >}}

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/scripts/java/%E7%B3%BB%E7%BB%9Fip%E8%8E%B7%E5%8F%96/  

