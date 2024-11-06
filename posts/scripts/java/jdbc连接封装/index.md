# Jdbc连接封装


# java 的jdbc 连接封装 
{{&lt; highlight java &gt;}}
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.CallableStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import com.sun.corba.se.spi.orbutil.fsm.Guard.Result;


public class DB {
    // 数据库驱动类
    private final static String DRIVER_NAME = &#34;oracle.jdbc.driver.OracleDriver&#34;;
    // 数据库URL地址
    private static final String URL = &#34;jdbc:oracle:thin:@localhost:1521:orcl&#34;;
    // 数据库用户名
    private static final String USERNAME = &#34;scott&#34;;
    // 密码
    private static final String PASSWORD = &#34;tiger&#34;;
    private Connection con = null;
    private PreparedStatement ps = null;
    private ResultSet rs = null;
    static {
        try {
            Class.forName(DRIVER_NAME);
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        }
    }
    /**
     * 获得数据库连接
     *
     * @return 数据库连接
     */
    public Connection getConnection() throws ClassNotFoundException,
        SQLException {
            if (con == null) {
                con = DriverManager.getConnection(URL, USERNAME, PASSWORD);
            }
            return con;
        }
    public ResultSet executeQuery(String sql, Object...params) throws ClassNotFoundException, SQLException {
        con = this.getConnection();
        ps = con.prepareStatement(sql);
        for (int i = 0; i &lt; params.length; i&#43;&#43;) {
            Object o = params[i];
            if (o instanceof Date) {
                Date d = (Date) o;
                Timestamp t = new Timestamp(d.getTime());
                ps.setTimestamp(i &#43; 1, t);
            } else {
                ps.setObject(i &#43; 1, o);
            }
        }
        rs = ps.executeQuery();
        return rs;
    }
    /**
     * 执行查询操作，返回一个结果接
     *
     * @param sql 要执行的SQL语句
     * @param list SQL参数的集合
     * @return 结果集
     * @throws SQLException
     * @throws ClassNotFoundException
     */
    public ResultSet executeQuery(String sql, List list) throws ClassNotFoundException, SQLException {
        con = this.getConnection();
        // 获得预编译语句对象
        ps = con.prepareStatement(sql);
        // 传递参数
        if (list != null) {
            for (int i = 0; i &lt; list.size(); i&#43;&#43;) {
                Object o = list.get(i);
                if (o instanceof Date) {
                    Date d = (Date) o;
                    Timestamp t = new Timestamp(d.getTime());
                    ps.setTimestamp(i &#43; 1, t);
                } else {
                    ps.setObject(i &#43; 1, o);
                }
            }
        }
        rs = ps.executeQuery();
        return rs;
    }
    public int executeUpdate(String sql, Object...params) throws ClassNotFoundException, SQLException {
        con = this.getConnection();
        ps = con.prepareStatement(sql);
        for (int i = 0; i &lt; params.length; i&#43;&#43;) {
            Object o = params[i];
            if (o instanceof Date) {
                Date d = (Date) o;
                Timestamp t = new Timestamp(d.getTime());
                ps.setTimestamp(i &#43; 1, t);
            } else {
                ps.setObject(i &#43; 1, o);
            }
        }
        return ps.executeUpdate();
    }
    /**
     * 执行增删改语句，返回受影响的行数
     * @param sql sql语句
     * @param list sql语句的参数集合
     */
    public int executeUpdate(String sql, List list) throws ClassNotFoundException, SQLException {
        con = this.getConnection();
        ps = con.prepareStatement(sql);
        if (list != null) {
            for (int i = 0; i &lt; list.size(); i&#43;&#43;) {
                Object o = list.get(i);
                if (o instanceof Date) {
                    Date d = (Date) o;
                    Timestamp t = new Timestamp(d.getTime());
                    ps.setTimestamp(i &#43; 1, t);
                } else {
                    ps.setObject(i &#43; 1, o);
                }
            }
        }
        return ps.executeUpdate();
    }

   /**
     * 无参数的存储过程
     *
     * @throws SQLException
     * @throws ClassNotFoundException
     */
     public void prepareCall(String storename, Object... params)
                 throws ClassNotFoundException, SQLException {
          con = this.getConnection();
          String str = &#34; call &#34;&#43; storename;
          cs = con.prepareCall(str);
           for (int i = 0; i &lt; params.length; i&#43;&#43;) {
                Object o = params[i];
                 if (o instanceof Date) {
                      Date d = (Date) o;
                      Timestamp t = new Timestamp(d.getTime());
                      cs.setTimestamp(i &#43; 1, t);
                } else {
                      cs.setObject(i &#43; 1, o);
                }
          }

          cs.execute();
    }

     /**
     * 调用有输出参数 (输出参数类型只能为Stirng类型的数据)的存储过程
     *
     * @throws List&lt;Integer&gt; 指定注册类型
     * @throws SQLException
     * @throws ClassNotFoundException
     */
     public List&lt;String&gt; prepareCall(String storename, List&lt;Integer&gt; list,
                Object.. . params) throws ClassNotFoundException, SQLException {
          con = this.getConnection();
          String str = &#34; call &#34;&#43; storename;
          cs = con.prepareCall(str);
          List&lt;Integer&gt; klist = new ArrayList&lt;Integer&gt;();
          List&lt;String&gt; relist = new ArrayList&lt;String&gt;();
           if (params.length != 0) {
                 for (int i = 0; i &lt; params.length; i&#43;&#43;) {
                      Object o = params[i];
                       if (o instanceof Date) {
                            Date d = (Date) o;
                            Timestamp t = new Timestamp(d.getTime());
                            cs.setTimestamp(i &#43; 1, t);
                      } else {
                            cs.setObject(i &#43; 1, o);
                      }

                       if (params.length - 1 == i &amp;&amp; list.size() != 0) {

                             for (int k = 0; k &lt; list.size(); k&#43;&#43;) {
                                  cs.registerOutParameter((i &#43; (k &#43; 2)), list.get(k));
                                  klist.add(i&#43;(k&#43; 2));
                            }

                      }
                }
          }
          cs.execute();
           for(int i = 0;i&lt;klist.size();i&#43;&#43;){
                relist.add(cs.getString(klist.get(i)));
          }
           return relist;
    }
    
    /**
     * 关闭连接
     */
    public void close() {
        try {
            if (rs != null) {
                rs.close();
            }
            if (ps != null) {
                ps.close();
            }
            if (con != null) {
                con.close();
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    public static void main(String[] args) {
        DB db = new DB();
        String sql = &#34;insert into tab_message values(mesid_seq.nextval,?,?,?,sysdate,0)&#34;;
        try {
            db.executeUpdate(sql, &#34;短信内容&#34;, &#34;zhangsan&#34;, &#34;admin&#34;);
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        } catch (SQLException e) {
            e.printStackTrace();
        } finally {
            db.close();
        }
    }
}
{{&lt; /highlight &gt;}}

#  ODBC 连接配置 
ODBC配置：开始--&gt;管理工具 --&gt;数据源--&gt; 用户DSN--&gt;添加 --&gt;选择`Oracle in OraDb10g_home1`--&gt;完成  
`Data Source Name`中填`JdbcOdbc`  
`Description`为描述可不填  
`TNS Service Name`中选择`Oracle`  
User ID中填你要使用的数据库中的用户  
完成配置后确定  
Java文件中需要配置的东西:
定义三个值 :
```java
Connection con = null;
PreparedStatement pst = null;
ResultSet rs = null;
```

下面的是需要处理异常的代码段:
```java
Class.forName( &#34;sun.jdbc.odbc.JdbcOdbcDriver&#34; );
String url = &#34;jdbc:odbc:JdbcOdbc&#34; ;
con = DriverManager.getConnection(url, &#34;cxd&#34;, &#34;cxd&#34; );
String sql = &#34;select * from code where username =&#39;name&#39; and userpassword =&#39;password&#39; &#34;;
pst = con.prepareStatement(sql);
rs = pst.executeQuery(); //执行查询操作
String sql = &#34;delete from name &#34;;
pst = con.prepareStatement(sql);
pst.executeUpdate(); //执行删除操作&lt;增删改都使用它&gt;
```
//任何时候都要进行关闭       
```java
if (rs != null) {
              rs.close();
        }
         if (pst != null) {
              pst.close();
        }
         if (con != null) {
              con.close();
        }
  } catch (SQLException e) {
        e.printStackTrace();
  }
```


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/scripts/java/jdbc%E8%BF%9E%E6%8E%A5%E5%B0%81%E8%A3%85/  

