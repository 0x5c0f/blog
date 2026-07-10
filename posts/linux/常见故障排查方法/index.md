# 常见故障排查方法


# 系统故障 
## linux 系统无法启动 
- 原因1: 文件系统配置不当，比如 `/etc/fstab` 文件等配置错误或丢失，导致系统错误无法启动。一般是认为修改错误或文件系统错误。
- 排查方法：系统配置 `/etc/fstab` 错误或丢失而无法启动，当启动的时候，出现`starting system logger` 后停止了
- 解决方法: 想办法恢复`/etc/fstab`文件， 利用 `linux rescue`修复模式登录系统，从而获取挂载点和分区信息，重构`/etc/fstab`文件.

- 原因2: 非法关机，导致`root`文件系统破坏，也就是`linux`根分区破坏，系统无法正常启动。
- 排查方法：  
    `Linux` 下普遍采用的是`ext3`文件系统，`ext3`是一个具有日志记录的功能的日志文件系统，可以进行简单的容错和恢复，但是在一个高负荷读写的`ext3`文件系统下，如果突然发生掉电，就很有可能发生文件系统内部结构不一致，导致文件系统破坏。  
    `Linux` 在启动时，会自动取分析和检查系统分区，如果发现文件系统有简单的错误，会自动修复。如果文件系统破坏比较严重，系统无法完成修复时，系统就会自动进入单用户模式下或者出现一个交互界面，提示用户介入手动修复，现象类似下面所示:  
    ```
        checking root filesystem
        /dev/sdb5 contains a file system with errors,check forced
        /dev/sdb5:
        Unattached inode 6833812
        /dev/sdb5: UNEXPECTED INCONSISTENCY; RUN fsck MANUALLY.
        (i.e., without -a or -p options)
        FAILED
        /contains a file system with errors,check forced
        an eror occurred during the file system check
        *dropping you to a shell; the system will reboot
        when you leave the shell
        Press enter for maintenance 
        (or type Control-D to continue):
        give root password for maintenance
    ```
    从这个错误可以看出，系统根分区文件系统出现了问题，系统在启动时无法自动修复，然后进入到了一个交互界面，提示用户进行系统修复。  
    这个问题发生的几率很高，引起这个问题的主要原因就是系统突然掉电，引起文件系统结构不一致，一般情况下解决此问题的办法是采用`fsck`命令，进行强制修复。  

- 解决方法： 根据上面的错误提示，当按下`Control-D`组合键后系统自动重启，当属如root密码后进入系统修复模式，在修复模式下，可以执行fsck命令，具体操作如下：  
    ```bash
    [root@localhost /]# umount /dev/sdb5
    [root@localhost /]# fsck.ext3 -y /dev/sdb5
    e2fsck 1.39 (29-May-2006)
    / continues a file system with errors,check forced.
    Pass 1: Checking inodes, blocks, and sizes
    Pass 2: Checking directory structure
    Pass 3: Checking directory connectivity
    Pass 4: Checking reference counts
    Inode 6833812 ref count is 2,should be 1. Fix? yes
    Unattached inode 6833812
    Connect to /lost+found? yes
    Inode 6833812 ref count is 2, should be 1. Fix? yes
    Pass 5: Checking group summary information
    Block bitmap differences: -(519--529) -9273
    Fix? yes... ...
    /: * FILE SYSTEM WAS MODIFIED **
    /: 19/128520 files (0.0% non-contiguous), 1829/512000 blocks
    ```
    **需要注意的是，在执行fsck的时候，一定要先卸载要修复的分区，然后在执行修复操作!**  

- 原因3: linux 内核文件丢失或崩溃，从而无法启动，也可能是因为内核升级错误或者内核存在bug。
这种情况一般`linux`系统会报错找不到内核文件，而内核文件存储在`/boot`分区，主要包括内核文件和初始化文件：  

    1. `vmlinuz`: 内核镜像文件，包含内核代码和数据  
        显示 `error: file '/vmlinuz' not found`  
        解决方案：   
            a. 使用客气动修复介质启动系统，并挂载系统磁盘的`/boot`分区:   
            b. 从安装介质或系统备份中提取`vmlinuz`内核文件，复制到`/boot`分区  
            c. 更新引导配置(`grub.cfg`) 将`menuentry`块中的`linux`行指向`vmlinuz`文件  
            d. 重启系统,在引导菜单选择更新后的菜单项启动系统  
    2. `initrd/initramfs`:  初始化`RAM`磁盘，包含启动时需要的模块和驱动  
        显示 `error: file '/initrd.img' not found `
        解决方案:   
            a. 参考内核文件丢失的解决步骤a, 挂载`/boot`分区和获取`initrd.img`文件
            b. 将`initrd.img` 文件复制到`/boot`分区
            c. 更新`grub.cfg`,找到`initrd`相关行，将其指向新文件
            d. 重启系统,在引导菜单选择更新后的菜单项启动系统

- 原因4: 硬件故障，比如主板、电源、硬盘等出现问题，导致`linux`无法启动
  解决方法: 一般来说由硬件造成的故障，只需更换硬件设备即可解决。

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/%E5%B8%B8%E8%A7%81%E6%95%85%E9%9A%9C%E6%8E%92%E6%9F%A5%E6%96%B9%E6%B3%95/  

