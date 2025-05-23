# 磁盘管理(半草稿)


# 磁盘管理  
磁盘的最小存储单位是扇区，大小为`0.5kb(512Bytes)`，多个连续的扇区称之为块 
操作系统文件存取的最小单位是块(block)，为`8`个连续扇区,大小是`8 x 0.5 = 4kb`,即使文件小于`4k`,也会占用`4k` 

## 硬件设备 
- `IDE`硬盘: `/dev/hd[a-d]`   
- `SCSI/SATA`硬盘: `/dev/sd[a-d]`   
- 软盘: `/dev/fd[0-1]` 
- 打印机: `/dev/lp[0-2]`
- 鼠标: `/dev/psaux`  `/dev/mouse`  

## 软硬链接 
- 软连接: 类似`windowns`的快捷方式 
- 硬链接: `inode`一致  

## mount 命令
- `mount -o` 参数详情 
```bash
`async` 以异步的方式处理文件系统IO，加速写入，数据不会同步写入到磁盘，而是写入到一个缓冲区，提供系统性能，但损失安全性。 
`sync` 所有的IO操着同步处理，数据同步写入到磁盘，性能较弱，但安全性提高 
`atime/noatime` 文件被访问的时候，是否修改其时间戳，大量文件可以提升IO速度 
`auto/noauto` 时候自动挂载  
`defaults`  默认包含`rw`,`suid`,`dev`,`exec`,`auto`,`nouser`,`async等等` 
`exec/noexec` 是否允许挂载点内的可执行文件执行命令，只是禁止了从当前目录运行,并未禁止通过指定`bash`解释器来运行  
`ro` 只读
`rw` 读写 
```
## buffer cache

- `buffer`: 用于写入数据的缓冲 
- `cache`: 用于读取数据时的缓存

#　raid 
> [https://support.hp.com/cn-zh/document/c01193785](https://support.hp.com/cn-zh/document/c01193785)    

- `raid 0` : 100%利用存储空间。最少需要两块盘(据说一块也可以，不过个人觉得一块应该没啥用)， 没用冗余数据，不做备份，任何一块磁盘损坏都无法运行。理论读写是单块磁盘的n倍。存储性能最好，但安全性不高。 
- `raid 1`: 50%的利用空间，磁盘最小需要`2n`块,总空间以最小盘为准，镜像同步数据，理论读取速度不受影响，甚至更快一点，写入速度受影响，更换盘后需要长时间的镜像同步，但外部读取读写不受影响。 
- `raid 3`: 至少需要3块盘，最后一块盘用于存储奇偶校验数据(专用的奇偶校验)，空间利用率`n - 1`,  可用性、成本和性能折中，但由于需要奇偶校验，因此速度较慢。 
- `raid 5`: 和`raid 3`类似,也是至少需要3块盘，每个奇偶校验数据是存储于每一个相同的数据块(分布式存储奇偶校验数据)
- `raid 10`: `raid 0 + raid 1`,又称为`raid 01`



---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/%E7%A3%81%E7%9B%98%E7%AE%A1%E7%90%86/  

