# Java文件处理组件


{{&lt; highlight java &gt;}}
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;

import com.ultrapower.eoms.common.RecordLog;

/**
* 文件处理组件
* @version Apr 21, 2010 5:50:00 PM
*/
public class FileOperUtil {
     /**
     * 删除目录下的所有文件
     * @param path 文件夹路径
     * @exception Exception
     */
     public static void deleteFile(String path) throws Exception {
          File file = new File(path);
          if (file.isDirectory()) {
               File[] files = file.listFiles();
               int len = files.length ;
               for (int i = 0; i &lt; len; i&#43;&#43;) {
                    deleteFile(files[i].getAbsolutePath());
               }
          }
          file.delete();
     }

     /**
     * 新建目录
     * @param folderPath 文件夹路径 例如:c:/test
     */
     public static void newFolder(String folderPath) {
          try {
               String filePath = folderPath;
               filePath = filePath.toString();
               java.io.File myFilePath = new java.io.File(filePath);
               if (!myFilePath.exists()) {
                    myFilePath.mkdir();
               }
          } catch (Exception e) {
               RecordLog.printLog(&#34;新建目录,&#34;&#43;folderPath&#43; &#34;,出错,&#34;&#43;e.getMessage(), RecordLog.LOG_LEVEL_ERROR);
               e.printStackTrace();
          }
     }

     /**
     * 新建文件
     * @param filePathAndName 文件路径 例如:c:/test/a.txt
     * @param fileContent 文件的内容
     * @throws IOException
     */
     public static void newFile(String filePathAndName, String fileContent) throws IOException {
          String filePath = filePathAndName;
          filePath = filePath.toString();
          File myFilePath = new File(filePath);
          if (!myFilePath.exists()) {
               myFilePath.createNewFile();
          }
          FileWriter resultFile = new FileWriter(myFilePath);
          PrintWriter myFile = new PrintWriter(resultFile);
          String strContent = fileContent;
          myFile.println(strContent);
          resultFile.close();
     }

     /**
     * 删除文件
     *
     * @param filePathAndName
     *            文件路径 例如:c:/test/a.txt
     */
     public static void delFile(String filePathAndName) {
          try {
               String filePath = filePathAndName;
               filePath = filePath.toString();
               java.io.File myDelFile = new java.io.File(filePath);
               myDelFile.delete();
          } catch (Exception e) {
               RecordLog.printLog(&#34;删除文件,&#34;&#43;filePathAndName&#43; &#34;,出错,&#34;&#43;e.getMessage(), RecordLog.LOG_LEVEL_ERROR);
               e.printStackTrace();
          }
     }


     /**
     * 删除文件夹
     * @param folderPath 文件夹路径 例如:c:/test
     * @return 如果删除成功,则返回 true;否则返回 false。
     */
     public static boolean delFolder(String folderPath) {
          boolean flag = false;
          try {
               delAllFile(folderPath); //删除完里面所有内容
               String filePath = folderPath;
               filePath = filePath.toString();
               java.io.File myFilePath = new java.io.File(filePath);
               flag = myFilePath.delete(); //删除空文件夹
          } catch (Exception e) {
               RecordLog.printLog(&#34;删除文件夹,&#34;&#43;folderPath&#43;&#34;,出错,&#34; &#43;e.getMessage(), RecordLog .LOG_LEVEL_ERROR);
               e.printStackTrace();
          }
          return flag;
     }

     /**
     * 删除文件夹里面的所有文件
     * @param path 文件夹路径 例如:c:/test
     */
     public static void delAllFile(String path) {
          File file = new File(path);
          if (!file.exists()) {
               return;
          }
          if (!file.isDirectory()) {
               return;
          }
          String[] tempList = file.list();
          File temp = null;
          for (int i = 0; i &lt; tempList.length; i&#43;&#43;) {
               if (path.endsWith(File.separator)) {
                    temp = new File(path &#43; tempList[i]);
               } else {
                    temp = new File(path &#43; File.separator &#43; tempList[i]);
               }
               if (temp.isFile()) {
                    temp.delete();
               }
               if (temp.isDirectory()) {
                    delAllFile(path &#43; &#34;/&#34; &#43; tempList[i]); // 先删除文件夹里面的文件
                    delFolder(path &#43; &#34;/&#34; &#43; tempList[i]); // 再删除空文件夹
               }
          }
     }

     /**
     * 复制单个文件
     * @param oldPath 文件夹路径 例如:c:/test/a.txt
     * @param newPath 文件夹路径 例如:c:/test/a.txt
     * @throws IOException
     */
     public static void copyFile(String oldPath, String newPath) throws IOException {
               int bytesum = 0;
               int byteread = 0;
               File oldfile = new File(oldPath);
               if (oldfile.exists()) { // 文件存在时
                    InputStream inStream = new FileInputStream(oldPath); // 读入原文件
                    FileOutputStream fs = new FileOutputStream(newPath);
                    byte[] buffer = new byte[1444];
                    while ((byteread = inStream.read(buffer)) != -1) {
                         bytesum &#43;= byteread; // 字节数 文件大小
                         System. out.println(bytesum);
                         fs.write(buffer, 0, byteread);
                    }
                    inStream.close();
               }
     }

     /**
     * 复制整个文件夹内容
     * @param oldPath 文件夹路径 例如:c:/test
     * @param newPath 文件夹路径 例如:c:/abc
     */
     public static void copyFolder(String oldPath, String newPath) {
          try {
               ( new File(newPath)).mkdirs(); // 如果文件夹不存在 则建立新文件夹
               File a = new File(oldPath);
               String[] file = a.list();
               File temp = null;
               for (int i = 0; i &lt; file.length; i&#43;&#43;) {
                    if (oldPath.endsWith(File.separator)) {
                         temp = new File(oldPath &#43; file[i]);
                    } else {
                         temp = new File(oldPath &#43; File.separator &#43; file[i]);
                    }
                    if (temp.isFile()) {
                         FileInputStream input = new FileInputStream(temp);
                         FileOutputStream output = new FileOutputStream(newPath
                                   &#43; &#34;/&#34; &#43; (temp.getName()).toString());
                         byte[] b = new byte[1024 * 5];
                         int len;
                         while ((len = input.read(b)) != -1) {
                              output.write(b, 0, len);
                         }
                         output.flush();
                         output.close();
                         input.close();
                    }
                    if (temp.isDirectory()) {// 如果是子文件夹
                         copyFolder(oldPath &#43; &#34;/&#34; &#43; file[i], newPath &#43; &#34;/&#34; &#43; file[i]);
                    }
               }
          } catch (Exception e) {
               RecordLog.printLog(&#34;复制整个文件夹内容操作出错,&#34; &#43;e.getMessage(), RecordLog .LOG_LEVEL_ERROR);
               e.printStackTrace();
          }
     }


     /**
     * 移动文件到指定目录
     * @param oldPath 文件夹路径 例如:c:/test/a.txt
     * @param newPath 文件夹路径 例如:c:/abc/a.txt
     * @throws IOException
     */
     public static void moveFile(String oldPath, String newPath) throws IOException {
          copyFile(oldPath, newPath);
          delFile(oldPath);

     }

     /**
     * 移动文件到指定目录
     * @param oldPath String 如：c:/test
     * @param newPath String 如：d:/abc
     */
     public static void moveFolder(String oldPath, String newPath) {
          copyFolder(oldPath, newPath);
          delFolder(oldPath);
     }
   
     public static void main(String[] args){
          rename(&#34;d:/aaa&#34;, &#34;av.xml&#34;,&#34;ne.xml&#34; );
     }
   
     public static boolean rename(String filepath,String srcname,String destname){
          boolean flag = false;
          File f = new File(filepath&#43;File.separator&#43;srcname);
          String c = f.getParent();
          File mm = new File(c &#43; File.separator &#43; destname);
          if (f.renameTo(mm))
               flag = true;
          return flag;
     }
}
{{&lt; /highlight &gt;}}

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/scripts/java/%E6%96%87%E4%BB%B6%E5%A4%84%E7%90%86%E7%BB%84%E4%BB%B6/  

