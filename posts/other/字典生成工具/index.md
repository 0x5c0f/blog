# Crunch字典生成工具


密码生成工具  
# 安装
```bash
# https://salsa.debian.org/debian/crunch 
tar zxvf crunch-3.6.tgz  
cd crunch-3.6  
gcc -Wall -lm -pthread -std=c99 -m64 -D_LARGEFILE_SOURCE -D_FILE_OFFSET_BITS=64 crunch.c -o crunch -lm  
make install  
```
# 使用
```bash
crunch 1 8  
#生成最小1位，最大8位，由26个小写字母为元素的所有组合  
crunch 1 6 abcdefg  
#生成 最小为1,最大为6.由abcdefg为元素的所有组合  
crunch 1 6 abcdefg\  
#生成 最小为1,最大为6.由abcdefg和空格为元素的所有组合（/代表空格）  
crunch 1 8 -f charset.lst mixalpha-numeric-all-space -o wordlist.txt  
#调用密码库 charset.lst， 生成最小为1，最大为8,元素为密码库 charset.lst中 mixalpha-numeric-all-space的项目，并保存为 wordlist.txt；其中 charset.lst在kali_linux的目录为 /usr/share/crunch/charset.lst， charset.lst中 mixalpha-numeric-all-space项目包含最常见的元素组合（即大小写字母&#43;数字&#43;常见符号）  
crunch 8 8 -f charset.lst mixalpha-numeric-all-space -o wordlist.txt -t @@dog @@@ -s cbdogaaa  
#调用密码库 charset.lst，生成8位密码；其中元素为 密码库 charset.lst中 mixalpha-numeric-all-space的项；格式为“两个小写字母&#43;dog&#43;三个小写字母”，并以cbdogaaa开始枚举（@代表小写字母）  
crunch 2 3 -f charset.lst ualpha -s BB  
#调用密码库charset.lst，生成2位和3位密码；其中元素为密码库charset.lst中ualpha的项；并且以BB开头  
crunch 4 5 -p abc  
#crunch将会生成abc, acb, bac, bca, cab, cba，虽然数字4和5这里没用，但必须有  
crunch 4 5 -p dog cat bird  
#crunch将生成以“dog”“cat”“bird”为元素的所有密码组合：birdcatdog，birddogcat，catbirddog, catdogbird, dogbirdcat, dogcatbird  
crunch 1 5 -o START -c 6000 -z bzip2  
# 生成最小为1位，最大为5位元素为所有小写字母的密码字典，其中每一个字典文件包含6000个密码，并将密码文件保存为bz2文件，文件名将以 &#34;第一个密码&#34; &#43; &#34; - &#34; &#43; &#34;最后一个密码&#34; &#43; &#34; .txt.bz2 &#34; 保存（比如000-999.txt.bz2）；下面是生成几种格式的压缩文件所用的时间和体积大小对比：  
crunch 4 5 -b 20mib -o START  
# 生成最小为4位，最大为5位元素为所有小写字母的密码字典，并以20M进行分割；这时会生成4个文件：aaaa-gvfed.txt, gvfee-ombqy.txt, ombqz-wcydt.txt, wcydu-zzzzz.txt：其中前三个大概每个20M，最后一个10M左右（因为总共70M）  
crunch 4 4 &#43; &#43; 123 &#43; -t %%@^  
#生成4位密码，其中格式为“两个数字”&#43;“一个小写字母”&#43;“常见符号”（其中数字这里被指定只能为123组成的所有2位数字组合）。比如12f# 32j^ 13t$ ......  
crunch 3 3 abc &#43; 123 @#! -t @%^  
#生成3位密码，其中第一位由“a，b，c”中的一个；第二位为“1,2,3”中的一个；第三位为“！，@，#”中的一个。比如1a！ 2a# 3b@ ......  
crunch 3 3 abc &#43; 123 @#! -t ^%@  
#生成3位密码，其中格式为“字符&#43;数字&#43;字母”，这里字符范围为！@# ，数字范围为 1 2 3 , 字母范围为a b c比如！1c @3b @2a ......  
crunch 5 5 -t ddd@@ -p dog cat bird  
#生成5个元素组成的密码，其中前三个为 dog cat bird任意组合，后两个为两个小写字母的任意组合。比如birddogcatuz catdogbirdab birdcatdogff ......  
crunch 7 7 -t p@ss,%^ -l a@aaaaa  
#生成7位密码，格式为“字符p@ss”&#43;大写字母&#43;数字&#43;符号 比如 p@ssZ9&gt; ......  
crunch 5 5 -s @4#S2 -t @%^,% -e @8 Q2 -l @dddd -b 10KB -o START  
#生成5位密码，格式为小写字母&#43;数字&#43;符号&#43;大写字母&#43;数字，并以 @4#S2开始，分割为10k大小。。。  
crunch 5 5 -d 2@ -t @@@%%  
#生成5位密码，格式为三个字母&#43;两个数字，并限制每个密码最少出现2种字母  
crunch 10 10 -t @@@^%%%%^^ -d 2@ -d 3% -b 20mb -o START  
#生成10位密码，格式为三个小写字母&#43;一个符号&#43;四个数字&#43;两个符号，限制每个密码至少2种字母和至少3种数字  
crunch 8 8 -d 2@  
#生成8位密码，每个密码至少出现两种字母  
crunch 4 4 -f unicode_test.lst the-greeks -t @@%% -l @xdd  
#调用密码库 unicode_test.lst中的 the-greeks项目字符，生成4位密码，其中格式为两小写字母&#43;两数字，同样kali_linux中 unicode_test.lst 在/usr/share/crunch目录  
-b #体积大小，比如后跟20mib  
-c #密码个数（行数），比如8000  
-d #限制出现相同元素的个数（至少出现元素个数），-d 3就不会出现zzf ffffgggg之类的  
-e #定义停止生成密码 ，比如-e 222222：到222222停止生成密码  
-f #调用密码库文件，比如/usr/share/crunch/charset.lst  
-i #改变输出格式  
-l #与-t搭配使用  
-m #与-p搭配使用  
-o #保存为  
-p #定义密码元素  
-q #读取字典  
-r #定义从某一个地方重新开始  
-s #第一个密码，从xxx开始  
-t #定义输出格式  
@代表小写字母  
，代表大写字母  
  
%代表数字  
  
^代表符号  
-z #打包压缩，格式支持 gzip, bzip2, lzma, 7z  
#crunch 起始值 终止值 -f 指定算法文件 算法参数 -o 指定生产文件位置(默认当前)
#sudo crunch 6 6 -f /usr/share/crunch/charset.lst numeric -o wordlist.txt  
#sudo crunch 9 9 -d 1 -f ./charset.lst lalpha-numeric-symbol14 -c 4
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/other/%E5%AD%97%E5%85%B8%E7%94%9F%E6%88%90%E5%B7%A5%E5%85%B7/  

