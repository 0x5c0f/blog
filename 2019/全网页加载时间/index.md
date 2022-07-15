# Python全网页加载时间


本文介绍的是一个关于站点全网页加载时间的一个脚本,前段时间在网络上找了很久关于在线站点全页加载的时间的,一直没有找到合适的,翻越了很久的github终于找到了一个比较适合我现在需求的一个项目,于是拿下来修改了下,目前这个有个问题是不能异步加载  
<!--more-->

参考项目:[https://github.com/donjajo/loady.git]  
修改代码提交地址:[~~https://github.com/0x5c0f/zbx_page_load.git~~]  
脚本依赖的额外模块: bs4(Beautiful Soup 4.x)   

模块安装:   
`pip3 install bs4` ​(或 `python3 -m pip install bs4`)

检测脚本`page-load.py`  
```python
#!/usr/bin/env python3
#
#UserParameter=custom.page.load[*],/opt/sh/zbx_discover_site/page-load.py $1
#
import requests
from bs4 import BeautifulSoup
import re
import urllib.parse
import sys
from time import time

debug=0

class Loady:
	files = {
		'js' : {},
		'css' : {},
		'img' : {}
	}

	def __init__( self, url, headers = {} ):
		if not isinstance( headers, dict ):
			raise ValueError( 'Headers argument must be dict instance' )

		self.url = url
		self.total_time = 0
		self.js = []
		self.css = []
		self.img = []
		self.http_headers = headers
		self.soup = None
		self.total_size = 0

	def _get( self, tag ):
		"""Gets all site additional files and prepares their URL to be loaded"""

		# Get current URL data
		domain_scheme, domain, _, _, _, _ = urllib.parse.urlparse( self.url )
		urls = []

		if tag is 'script':
			# Get all script tag with src attribute
#			print(self.soup.find_all( 'script', { 'src' : re.compile( r'.*' ) } ))
			tags = self.soup.find_all( 'script', { 'src' : re.compile( r'.*' ) } )
		elif tag is 'img':
#			print(self.soup.find_all( 'img', { 'src' : re.compile( r'.*' ) } ))
			tags = self.soup.find_all( 'img', { 'src' : re.compile( r'.*' ) } )
		# elif tag is 'i':
		# 	print(tags = self.soup.find_all('i', {'style': re.compile(r'.*')}))
		# 	tags = self.soup.find_all('i', {'style': re.compile(r'.*')})
		else:
			# Get all link tag with rel=stylesheet
#			print(self.soup.find_all( 'link', { 'rel' : 'stylesheet' } ))
			tags = self.soup.find_all( 'link', { 'rel' : 'stylesheet' } )

		for each_tag in tags:
			# Get the value of src or href
			val = each_tag[ 'src' ] if tag is 'script' or tag is 'img' else each_tag[ 'href' ]
			#val = ''
			#if tag is 'script' or tag is 'img':
			#	val = each_tag['src']
			#else:
			#	val = each_tag['href']

			# parse the URL of the gotten URL
			url = urllib.parse.urlparse( val )

			if not url[ 0 ] and url[ 1 ]:
				# If URL has no scheme but has domain name, we assume it is a URL that supports HTTP(S). We just append the main site scheme to it
				if not val.startswith("//"):
					urls.append( '{0}://{1}'.format( domain_scheme, val ) )
				else:
					urls.append( '{0}:{1}'.format( domain_scheme, val ) )
			elif not url[ 1 ]:
				# URL has no domain, its a relative path. Append the domain name to it
				if not val.startswith("/"):
					urls.append( '{0}://{1}/{2}'.format( domain_scheme, domain, val ) )
				else:
					urls.append( '{0}://{1}{2}'.format( domain_scheme, domain, val ) )
			else:
				# Its an absolute path, no issues bro!
				urls.append( val )

		if tag is 'script':
			self.js = urls
		elif tag is 'img':
			self.img = urls
		else:
			self.css = urls

	def _load( self, t ):
		"""Load the gotten links, check for response time and size. Appends it to self.files object"""
		_link_obj = []
		if t is 'script':
			_link_obj = self.js
		elif t is 'img':
			_link_obj = self.img
		else:
			_link_obj = self.css
#		for link in ( self.js if t is 'script' else self.css ):
		for link in (_link_obj):
			if debug == 1:
				print(link)
			try:
				start = time()
				r = requests.get( link )
				end = time()
				# Calculate the total time taken to load link
				response_time = ( end - start )
				# Page loaded successfully
				if r.status_code == 200:
					# Get the size of page content
					size = sys.getsizeof(r.content) if t is 'img' else sys.getsizeof(r.text)
					# Add results to self.files object
					obj = ''
					if t is 'style':
						obj = 'css'
					elif t is 'img':
						obj = 'img'
					else:
						obj = 'js'
					self.files[obj][link] = {'byte_size': size, 'load_time': response_time}
					# Sum up total time to the existing load time
					self.total_time += response_time
					self.total_size += size
			except Exception as e:
				if debug == 1:
					print(e,link)
				continue

	def get( self ):
		"""Loads the main website, calculate response time, page size and get additional files in site"""

		start = time()
		r = requests.get( self.url, headers = self.http_headers )
		stop = time()
		if r.status_code == 200:
			response = r.text
			self.total_time = self.total_time + ( stop - start )
			self.total_size += sys.getsizeof( response )
			self.soup = BeautifulSoup( response, 'html.parser' )

			self._get( 'script' )
			self._load( 'script' )
			self._get( 'style' )
			self._load( 'style' )
			self._get( 'img' )
			self._load('img')


load = Loady( sys.argv[1] , headers={ 'User-Agent' : 'zabbix pageload monitor' })
#load = Loady( sys.argv[1], headers={ 'User-Agent' : 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:57.0) Gecko/20100101 Firefox/57.0' })
load.get()
#print("{TIME:\"",load.total_time,"\"}",sep='')
print("%.3f"%load.total_time)
#print( load.total_size ) # total load size
#print( load.files )   #load file and load size
```
由于我是用来监控的, 于是在zabbix创建了一个自动发现.
自动发现脚本`discover_site.py`
```python
#!/usr/bin/env python3
#discover site

file = open("/opt/sh/zbx_discover_site/site.txt")
print("{")
print("\t\"data\":[")
try:
	lines = file.readlines();
	count = 1
	for line in lines:
		line = line.strip("\n")
		print("\t\t{")
		print("\t\t\t\"{#SITE}\":\"",end='')
		print(line,end='')
		print("\"")
		print("\t\t}",end='')
		if count < len(lines):
			print(",")
		count = count + 1
finally:
	file.close()
print("\n\t]")
print("}")
```
站点配置文件`site.txt`  
```txt
https://www.example.com
http://www.example.com
```

zabbix 前端配置,我是直接固定一个主机来还专门作这个的.配置成模板的需求感觉不大。  

创建自动发现: 配置--主机(模板)--自动发现--创建自动发现,添加键址添加: discover.site  

过滤器配置:  

`{#SITE}` 匹配 `@Linux site for autodiscovery` 

监控项原型配置:  
名称: `page load on [{#SITE}]`  
键值: `custom.page.load[{#SITE}]`  
信息类型:`浮点型`  
单位:`s`  
数据更新时间: `300` (个人建议)  

图形原型配置:  
名称: `page load on {#SITE}`  

新建系统正则表达式:  
名字: `Linux site for autodiscovery`   (与上述过滤器配置一致)  
结果为真:`^((http|ftp|https)://)` (此处应该配置标准的url匹配规则,不过我这儿就之匹配了以http/https/ftp开头的就让他通过了)  


所有配置项完成后,重启`zabbix agent` 就可以了,如果你是配置的模板,把模板加入到对应主机就可以了.  
