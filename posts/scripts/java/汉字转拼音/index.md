# Java汉字转拼音


# 汉字转拼音(非使用依赖包) 

{{&lt; highlight java &gt;}}

import java.nio.ByteBuffer;
import java.util.TreeMap;
/**
 *
 * 汉字转化为全拼
 * JDK版本: 6
 * 需要注意的是：这里面利用gb2312的编码规则，根据拼音区间来获取拼音，主要可以练习TreeMap的使用。
 *            但其实拼音规则涵盖的中文并不全面，要求较高的地方不建议使用这个类。
 *            附上拼音和汉字对照表pinyin1.txt，可以利用这个文件建立Map。
 */
 
public class CharactorTool {
    private static TreeMap &lt; Integer, String &gt; spellTree = new TreeMap &lt; Integer, String &gt; ();
    static {
        initTreeMap();
    }
    private CharactorTool() {}
    private static void initTreeMap() {
        spellTree.put(-20319, &#34;a&#34;);
        spellTree.put(-20317, &#34;ai&#34;);
        spellTree.put(-20304, &#34;an&#34;);
        spellTree.put(-20295, &#34;ang&#34;);
        spellTree.put(-20292, &#34;ao&#34;);
        spellTree.put(-20283, &#34;ba&#34;);
        spellTree.put(-20265, &#34;bai&#34;);
        spellTree.put(-20257, &#34;ban&#34;);
        spellTree.put(-20242, &#34;bang&#34;);
        spellTree.put(-20230, &#34;bao&#34;);
        spellTree.put(-20051, &#34;bei&#34;);
        spellTree.put(-20036, &#34;ben&#34;);
        spellTree.put(-20032, &#34;beng&#34;);
        spellTree.put(-20026, &#34;bi&#34;);
        spellTree.put(-20002, &#34;bian&#34;);
        spellTree.put(-19990, &#34;biao&#34;);
        spellTree.put(-19986, &#34;bie&#34;);
        spellTree.put(-19982, &#34;bin&#34;);
        spellTree.put(-19976, &#34;bing&#34;);
        spellTree.put(-19805, &#34;bo&#34;);
        spellTree.put(-19784, &#34;bu&#34;);
        spellTree.put(-19775, &#34;ca&#34;);
        spellTree.put(-19774, &#34;cai&#34;);
        spellTree.put(-19763, &#34;can&#34;);
        spellTree.put(-19756, &#34;cang&#34;);
        spellTree.put(-19751, &#34;cao&#34;);
        spellTree.put(-19746, &#34;ce&#34;);
        spellTree.put(-19741, &#34;ceng&#34;);
        spellTree.put(-19739, &#34;cha&#34;);
        spellTree.put(-19728, &#34;chai&#34;);
        spellTree.put(-19725, &#34;chan&#34;);
        spellTree.put(-19715, &#34;chang&#34;);
        spellTree.put(-19540, &#34;chao&#34;);
        spellTree.put(-19531, &#34;che&#34;);
        spellTree.put(-19525, &#34;chen&#34;);
        spellTree.put(-19515, &#34;cheng&#34;);
        spellTree.put(-19500, &#34;chi&#34;);
        spellTree.put(-19484, &#34;chong&#34;);
        spellTree.put(-19479, &#34;chou&#34;);
        spellTree.put(-19467, &#34;chu&#34;);
        spellTree.put(-19289, &#34;chuai&#34;);
        spellTree.put(-19288, &#34;chuan&#34;);
        spellTree.put(-19281, &#34;chuang&#34;);
        spellTree.put(-19275, &#34;chui&#34;);
        spellTree.put(-19270, &#34;chun&#34;);
        spellTree.put(-19263, &#34;chuo&#34;);
        spellTree.put(-19261, &#34;ci&#34;);
        spellTree.put(-19249, &#34;cong&#34;);
        spellTree.put(-19243, &#34;cou&#34;);
        spellTree.put(-19242, &#34;cu&#34;);
        spellTree.put(-19238, &#34;cuan&#34;);
        spellTree.put(-19235, &#34;cui&#34;);
        spellTree.put(-19227, &#34;cun&#34;);
        spellTree.put(-19224, &#34;cuo&#34;);
        spellTree.put(-19218, &#34;da&#34;);
        spellTree.put(-19212, &#34;dai&#34;);
        spellTree.put(-19038, &#34;dan&#34;);
        spellTree.put(-19023, &#34;dang&#34;);
        spellTree.put(-19018, &#34;dao&#34;);
        spellTree.put(-19006, &#34;de&#34;);
        spellTree.put(-19003, &#34;deng&#34;);
        spellTree.put(-18996, &#34;di&#34;);
        spellTree.put(-18977, &#34;dian&#34;);
        spellTree.put(-18961, &#34;diao&#34;);
        spellTree.put(-18952, &#34;die&#34;);
        spellTree.put(-18783, &#34;ding&#34;);
        spellTree.put(-18774, &#34;diu&#34;);
        spellTree.put(-18773, &#34;dong&#34;);
        spellTree.put(-18763, &#34;dou&#34;);
        spellTree.put(-18756, &#34;du&#34;);
        spellTree.put(-18741, &#34;duan&#34;);
        spellTree.put(-18735, &#34;dui&#34;);
        spellTree.put(-18731, &#34;dun&#34;);
        spellTree.put(-18722, &#34;duo&#34;);
        spellTree.put(-18710, &#34;e&#34;);
        spellTree.put(-18697, &#34;en&#34;);
        spellTree.put(-18696, &#34;er&#34;);
        spellTree.put(-18526, &#34;fa&#34;);
        spellTree.put(-18518, &#34;fan&#34;);
        spellTree.put(-18501, &#34;fang&#34;);
        spellTree.put(-18490, &#34;fei&#34;);
        spellTree.put(-18478, &#34;fen&#34;);
        spellTree.put(-18463, &#34;feng&#34;);
        spellTree.put(-18448, &#34;fo&#34;);
        spellTree.put(-18447, &#34;fou&#34;);
        spellTree.put(-18446, &#34;fu&#34;);
        spellTree.put(-18239, &#34;ga&#34;);
        spellTree.put(-18237, &#34;gai&#34;);
        spellTree.put(-18231, &#34;gan&#34;);
        spellTree.put(-18220, &#34;gang&#34;);
        spellTree.put(-18211, &#34;gao&#34;);
        spellTree.put(-18201, &#34;ge&#34;);
        spellTree.put(-18184, &#34;gei&#34;);
        spellTree.put(-18183, &#34;gen&#34;);
        spellTree.put(-18181, &#34;geng&#34;);
        spellTree.put(-18012, &#34;gong&#34;);
        spellTree.put(-17997, &#34;gou&#34;);
        spellTree.put(-17988, &#34;gu&#34;);
        spellTree.put(-17970, &#34;gua&#34;);
        spellTree.put(-17964, &#34;guai&#34;);
        spellTree.put(-17961, &#34;guan&#34;);
        spellTree.put(-17950, &#34;guang&#34;);
        spellTree.put(-17947, &#34;gui&#34;);
        spellTree.put(-17931, &#34;gun&#34;);
        spellTree.put(-17928, &#34;guo&#34;);
        spellTree.put(-17922, &#34;ha&#34;);
        spellTree.put(-17759, &#34;hai&#34;);
        spellTree.put(-17752, &#34;han&#34;);
        spellTree.put(-17733, &#34;hang&#34;);
        spellTree.put(-17730, &#34;hao&#34;);
        spellTree.put(-17721, &#34;he&#34;);
        spellTree.put(-17703, &#34;hei&#34;);
        spellTree.put(-17701, &#34;hen&#34;);
        spellTree.put(-17697, &#34;heng&#34;);
        spellTree.put(-17692, &#34;hong&#34;);
        spellTree.put(-17683, &#34;hou&#34;);
        spellTree.put(-17676, &#34;hu&#34;);
        spellTree.put(-17496, &#34;hua&#34;);
        spellTree.put(-17487, &#34;huai&#34;);
        spellTree.put(-17482, &#34;huan&#34;);
        spellTree.put(-17468, &#34;huang&#34;);
        spellTree.put(-17454, &#34;hui&#34;);
        spellTree.put(-17433, &#34;hun&#34;);
        spellTree.put(-17427, &#34;huo&#34;);
        spellTree.put(-17417, &#34;ji&#34;);
        spellTree.put(-17202, &#34;jia&#34;);
        spellTree.put(-17185, &#34;jian&#34;);
        spellTree.put(-16983, &#34;jiang&#34;);
        spellTree.put(-16970, &#34;jiao&#34;);
        spellTree.put(-16942, &#34;jie&#34;);
        spellTree.put(-16915, &#34;jin&#34;);
        spellTree.put(-16733, &#34;jing&#34;);
        spellTree.put(-16708, &#34;jiong&#34;);
        spellTree.put(-16706, &#34;jiu&#34;);
        spellTree.put(-16689, &#34;ju&#34;);
        spellTree.put(-16664, &#34;juan&#34;);
        spellTree.put(-16657, &#34;jue&#34;);
        spellTree.put(-16647, &#34;jun&#34;);
        spellTree.put(-16474, &#34;ka&#34;);
        spellTree.put(-16470, &#34;kai&#34;);
        spellTree.put(-16465, &#34;kan&#34;);
        spellTree.put(-16459, &#34;kang&#34;);
        spellTree.put(-16452, &#34;kao&#34;);
        spellTree.put(-16448, &#34;ke&#34;);
        spellTree.put(-16433, &#34;ken&#34;);
        spellTree.put(-16429, &#34;keng&#34;);
        spellTree.put(-16427, &#34;kong&#34;);
        spellTree.put(-16423, &#34;kou&#34;);
        spellTree.put(-16419, &#34;ku&#34;);
        spellTree.put(-16412, &#34;kua&#34;);
        spellTree.put(-16407, &#34;kuai&#34;);
        spellTree.put(-16403, &#34;kuan&#34;);
        spellTree.put(-16401, &#34;kuang&#34;);
        spellTree.put(-16393, &#34;kui&#34;);
        spellTree.put(-16220, &#34;kun&#34;);
        spellTree.put(-16216, &#34;kuo&#34;);
        spellTree.put(-16212, &#34;la&#34;);
        spellTree.put(-16205, &#34;lai&#34;);
        spellTree.put(-16202, &#34;lan&#34;);
        spellTree.put(-16187, &#34;lang&#34;);
        spellTree.put(-16180, &#34;lao&#34;);
        spellTree.put(-16171, &#34;le&#34;);
        spellTree.put(-16169, &#34;lei&#34;);
        spellTree.put(-16158, &#34;leng&#34;);
        spellTree.put(-16155, &#34;li&#34;);
        spellTree.put(-15959, &#34;lia&#34;);
        spellTree.put(-15958, &#34;lian&#34;);
        spellTree.put(-15944, &#34;liang&#34;);
        spellTree.put(-15933, &#34;liao&#34;);
        spellTree.put(-15920, &#34;lie&#34;);
        spellTree.put(-15915, &#34;lin&#34;);
        spellTree.put(-15903, &#34;ling&#34;);
        spellTree.put(-15889, &#34;liu&#34;);
        spellTree.put(-15878, &#34;long&#34;);
        spellTree.put(-15707, &#34;lou&#34;);
        spellTree.put(-15701, &#34;lu&#34;);
        spellTree.put(-15681, &#34;lv&#34;);
        spellTree.put(-15667, &#34;luan&#34;);
        spellTree.put(-15661, &#34;lue&#34;);
        spellTree.put(-15659, &#34;lun&#34;);
        spellTree.put(-15652, &#34;luo&#34;);
        spellTree.put(-15640, &#34;ma&#34;);
        spellTree.put(-15631, &#34;mai&#34;);
        spellTree.put(-15625, &#34;man&#34;);
        spellTree.put(-15454, &#34;mang&#34;);
        spellTree.put(-15448, &#34;mao&#34;);
        spellTree.put(-15436, &#34;me&#34;);
        spellTree.put(-15435, &#34;mei&#34;);
        spellTree.put(-15419, &#34;men&#34;);
        spellTree.put(-15416, &#34;meng&#34;);
        spellTree.put(-15408, &#34;mi&#34;);
        spellTree.put(-15394, &#34;mian&#34;);
        spellTree.put(-15385, &#34;miao&#34;);
        spellTree.put(-15377, &#34;mie&#34;);
        spellTree.put(-15375, &#34;min&#34;);
        spellTree.put(-15369, &#34;ming&#34;);
        spellTree.put(-15363, &#34;miu&#34;);
        spellTree.put(-15362, &#34;mo&#34;);
        spellTree.put(-15183, &#34;mou&#34;);
        spellTree.put(-15180, &#34;mu&#34;);
        spellTree.put(-15165, &#34;na&#34;);
        spellTree.put(-15158, &#34;nai&#34;);
        spellTree.put(-15153, &#34;nan&#34;);
        spellTree.put(-15150, &#34;nang&#34;);
        spellTree.put(-15149, &#34;nao&#34;);
        spellTree.put(-15144, &#34;ne&#34;);
        spellTree.put(-15143, &#34;nei&#34;);
        spellTree.put(-15141, &#34;nen&#34;);
        spellTree.put(-15140, &#34;neng&#34;);
        spellTree.put(-15139, &#34;ni&#34;);
        spellTree.put(-15128, &#34;nian&#34;);
        spellTree.put(-15121, &#34;niang&#34;);
        spellTree.put(-15119, &#34;niao&#34;);
        spellTree.put(-15117, &#34;nie&#34;);
        spellTree.put(-15110, &#34;nin&#34;);
        spellTree.put(-15109, &#34;ning&#34;);
        spellTree.put(-14941, &#34;niu&#34;);
        spellTree.put(-14937, &#34;nong&#34;);
        spellTree.put(-14933, &#34;nu&#34;);
        spellTree.put(-14930, &#34;nv&#34;);
        spellTree.put(-14929, &#34;nuan&#34;);
        spellTree.put(-14928, &#34;nue&#34;);
        spellTree.put(-14926, &#34;nuo&#34;);
        spellTree.put(-14922, &#34;o&#34;);
        spellTree.put(-14921, &#34;ou&#34;);
        spellTree.put(-14914, &#34;pa&#34;);
        spellTree.put(-14908, &#34;pai&#34;);
        spellTree.put(-14902, &#34;pan&#34;);
        spellTree.put(-14894, &#34;pang&#34;);
        spellTree.put(-14889, &#34;pao&#34;);
        spellTree.put(-14882, &#34;pei&#34;);
        spellTree.put(-14873, &#34;pen&#34;);
        spellTree.put(-14871, &#34;peng&#34;);
        spellTree.put(-14857, &#34;pi&#34;);
        spellTree.put(-14678, &#34;pian&#34;);
        spellTree.put(-14674, &#34;piao&#34;);
        spellTree.put(-14670, &#34;pie&#34;);
        spellTree.put(-14668, &#34;pin&#34;);
        spellTree.put(-14663, &#34;ping&#34;);
        spellTree.put(-14654, &#34;po&#34;);
        spellTree.put(-14645, &#34;pu&#34;);
        spellTree.put(-14630, &#34;qi&#34;);
        spellTree.put(-14594, &#34;qia&#34;);
        spellTree.put(-14429, &#34;qian&#34;);
        spellTree.put(-14407, &#34;qiang&#34;);
        spellTree.put(-14399, &#34;qiao&#34;);
        spellTree.put(-14384, &#34;qie&#34;);
        spellTree.put(-14379, &#34;qin&#34;);
        spellTree.put(-14368, &#34;qing&#34;);
        spellTree.put(-14355, &#34;qiong&#34;);
        spellTree.put(-14353, &#34;qiu&#34;);
        spellTree.put(-14345, &#34;qu&#34;);
        spellTree.put(-14170, &#34;quan&#34;);
        spellTree.put(-14159, &#34;que&#34;);
        spellTree.put(-14151, &#34;qun&#34;);
        spellTree.put(-14149, &#34;ran&#34;);
        spellTree.put(-14145, &#34;rang&#34;);
        spellTree.put(-14140, &#34;rao&#34;);
        spellTree.put(-14137, &#34;re&#34;);
        spellTree.put(-14135, &#34;ren&#34;);
        spellTree.put(-14125, &#34;reng&#34;);
        spellTree.put(-14123, &#34;ri&#34;);
        spellTree.put(-14122, &#34;rong&#34;);
        spellTree.put(-14112, &#34;rou&#34;);
        spellTree.put(-14109, &#34;ru&#34;);
        spellTree.put(-14099, &#34;ruan&#34;);
        spellTree.put(-14097, &#34;rui&#34;);
        spellTree.put(-14094, &#34;run&#34;);
        spellTree.put(-14092, &#34;ruo&#34;);
        spellTree.put(-14090, &#34;sa&#34;);
        spellTree.put(-14087, &#34;sai&#34;);
        spellTree.put(-14083, &#34;san&#34;);
        spellTree.put(-13917, &#34;sang&#34;);
        spellTree.put(-13914, &#34;sao&#34;);
        spellTree.put(-13910, &#34;se&#34;);
        spellTree.put(-13907, &#34;sen&#34;);
        spellTree.put(-13906, &#34;seng&#34;);
        spellTree.put(-13905, &#34;sha&#34;);
        spellTree.put(-13896, &#34;shai&#34;);
        spellTree.put(-13894, &#34;shan&#34;);
        spellTree.put(-13878, &#34;shang&#34;);
        spellTree.put(-13870, &#34;shao&#34;);
        spellTree.put(-13859, &#34;she&#34;);
        spellTree.put(-13847, &#34;shen&#34;);
        spellTree.put(-13831, &#34;sheng&#34;);
        spellTree.put(-13658, &#34;shi&#34;);
        spellTree.put(-13611, &#34;shou&#34;);
        spellTree.put(-13601, &#34;shu&#34;);
        spellTree.put(-13406, &#34;shua&#34;);
        spellTree.put(-13404, &#34;shuai&#34;);
        spellTree.put(-13400, &#34;shuan&#34;);
        spellTree.put(-13398, &#34;shuang&#34;);
        spellTree.put(-13395, &#34;shui&#34;);
        spellTree.put(-13391, &#34;shun&#34;);
        spellTree.put(-13387, &#34;shuo&#34;);
        spellTree.put(-13383, &#34;si&#34;);
        spellTree.put(-13367, &#34;song&#34;);
        spellTree.put(-13359, &#34;sou&#34;);
        spellTree.put(-13356, &#34;su&#34;);
        spellTree.put(-13343, &#34;suan&#34;);
        spellTree.put(-13340, &#34;sui&#34;);
        spellTree.put(-13329, &#34;sun&#34;);
        spellTree.put(-13326, &#34;suo&#34;);
        spellTree.put(-13318, &#34;ta&#34;);
        spellTree.put(-13147, &#34;tai&#34;);
        spellTree.put(-13138, &#34;tan&#34;);
        spellTree.put(-13120, &#34;tang&#34;);
        spellTree.put(-13107, &#34;tao&#34;);
        spellTree.put(-13096, &#34;te&#34;);
        spellTree.put(-13095, &#34;teng&#34;);
        spellTree.put(-13091, &#34;ti&#34;);
        spellTree.put(-13076, &#34;tian&#34;);
        spellTree.put(-13068, &#34;tiao&#34;);
        spellTree.put(-13063, &#34;tie&#34;);
        spellTree.put(-13060, &#34;ting&#34;);
        spellTree.put(-12888, &#34;tong&#34;);
        spellTree.put(-12875, &#34;tou&#34;);
        spellTree.put(-12871, &#34;tu&#34;);
        spellTree.put(-12860, &#34;tuan&#34;);
        spellTree.put(-12858, &#34;tui&#34;);
        spellTree.put(-12852, &#34;tun&#34;);
        spellTree.put(-12849, &#34;tuo&#34;);
        spellTree.put(-12838, &#34;wa&#34;);
        spellTree.put(-12831, &#34;wai&#34;);
        spellTree.put(-12829, &#34;wan&#34;);
        spellTree.put(-12812, &#34;wang&#34;);
        spellTree.put(-12802, &#34;wei&#34;);
        spellTree.put(-12607, &#34;wen&#34;);
        spellTree.put(-12597, &#34;weng&#34;);
        spellTree.put(-12594, &#34;wo&#34;);
        spellTree.put(-12585, &#34;wu&#34;);
        spellTree.put(-12556, &#34;xi&#34;);
        spellTree.put(-12359, &#34;xia&#34;);
        spellTree.put(-12346, &#34;xian&#34;);
        spellTree.put(-12320, &#34;xiang&#34;);
        spellTree.put(-12300, &#34;xiao&#34;);
        spellTree.put(-12120, &#34;xie&#34;);
        spellTree.put(-12099, &#34;xin&#34;);
        spellTree.put(-12089, &#34;xing&#34;);
        spellTree.put(-12074, &#34;xiong&#34;);
        spellTree.put(-12067, &#34;xiu&#34;);
        spellTree.put(-12058, &#34;xu&#34;);
        spellTree.put(-12039, &#34;xuan&#34;);
        spellTree.put(-11867, &#34;xue&#34;);
        spellTree.put(-11861, &#34;xun&#34;);
        spellTree.put(-11847, &#34;ya&#34;);
        spellTree.put(-11831, &#34;yan&#34;);
        spellTree.put(-11798, &#34;yang&#34;);
        spellTree.put(-11781, &#34;yao&#34;);
        spellTree.put(-11604, &#34;ye&#34;);
        spellTree.put(-11589, &#34;yi&#34;);
        spellTree.put(-11536, &#34;yin&#34;);
        spellTree.put(-11358, &#34;ying&#34;);
        spellTree.put(-11340, &#34;yo&#34;);
        spellTree.put(-11339, &#34;yong&#34;);
        spellTree.put(-11324, &#34;you&#34;);
        spellTree.put(-11303, &#34;yu&#34;);
        spellTree.put(-11097, &#34;yuan&#34;);
        spellTree.put(-11077, &#34;yue&#34;);
        spellTree.put(-11067, &#34;yun&#34;);
        spellTree.put(-11055, &#34;za&#34;);
        spellTree.put(-11052, &#34;zai&#34;);
        spellTree.put(-11045, &#34;zan&#34;);
        spellTree.put(-11041, &#34;zang&#34;);
        spellTree.put(-11038, &#34;zao&#34;);
        spellTree.put(-11024, &#34;ze&#34;);
        spellTree.put(-11020, &#34;zei&#34;);
        spellTree.put(-11019, &#34;zen&#34;);
        spellTree.put(-11018, &#34;zeng&#34;);
        spellTree.put(-11014, &#34;zha&#34;);
        spellTree.put(-10838, &#34;zhai&#34;);
        spellTree.put(-10832, &#34;zhan&#34;);
        spellTree.put(-10815, &#34;zhang&#34;);
        spellTree.put(-10800, &#34;zhao&#34;);
        spellTree.put(-10790, &#34;zhe&#34;);
        spellTree.put(-10780, &#34;zhen&#34;);
        spellTree.put(-10764, &#34;zheng&#34;);
        spellTree.put(-10587, &#34;zhi&#34;);
        spellTree.put(-10544, &#34;zhong&#34;);
        spellTree.put(-10533, &#34;zhou&#34;);
        spellTree.put(-10519, &#34;zhu&#34;);
        spellTree.put(-10331, &#34;zhua&#34;);
        spellTree.put(-10329, &#34;zhuai&#34;);
        spellTree.put(-10328, &#34;zhuan&#34;);
        spellTree.put(-10322, &#34;zhuang&#34;);
        spellTree.put(-10315, &#34;zhui&#34;);
        spellTree.put(-10309, &#34;zhun&#34;);
        spellTree.put(-10307, &#34;zhuo&#34;);
        spellTree.put(-10296, &#34;zi&#34;);
        spellTree.put(-10281, &#34;zong&#34;);
        spellTree.put(-10274, &#34;zou&#34;);
        spellTree.put(-10270, &#34;zu&#34;);
        spellTree.put(-10262, &#34;zuan&#34;);
        spellTree.put(-10260, &#34;zui&#34;);
        spellTree.put(-10256, &#34;zun&#34;);
        spellTree.put(-10254, &#34;zuo&#34;);
    }
    /**
     * 获得单个汉字的Ascii.
     *
     * @param cn
     *          char 汉字字符
     * @return int
     *         错误返回 0,否则返回ascii
     */
    public static int getCnAscii(char cn) {
        try {
            byte[] bytes = (String.valueOf(cn)).getBytes(&#34;gb2312&#34;);
            if (bytes == null || bytes.length &gt; 2 || bytes.length &lt;= 0) { // 错误
                return 0;
            }
            if (bytes.length == 1) { // 英文字符
                return bytes[0];
            }
            if (bytes.length == 2) { // 中文字符
                ByteBuffer bf = ByteBuffer.wrap(bytes);
                return bf.getShort();
            }
        } catch (Exception e) {}
        return 0; // 错误
    }
    /**
     * 根据ASCII码到SpellMap中查找对应的拼音
     *
     * @param ascii
     *            int 字符对应的ASCII
     * @return String 拼音,
     *            首先判断ASCII是否&gt;0&amp;&lt;160,如果是返回对应的字符,
     *
     *            否则到SpellMap中查找,如果没有找到拼音,则返回null,如果找到则返回拼音.
     */
    public static String getSpellByAscii(int ascii) {
        if (ascii &gt; 0 &amp;&amp; ascii &lt; 160) { // 单字符
            return String.valueOf((char) ascii);
        } else if (ascii &lt; -20319 || ascii &gt; -10247) { // 不知道的字符
            return null;
        }
        Integer key = spellTree.floorKey(ascii);
        if (key != null) {
            return spellTree.get(key);
        }
        return null;
    }
    /**
     * 返回字符串的全拼,是汉字转化为全拼,其它字符不进行转换
     *
     * @param cnStr
     *            String 字符串
     * @return String 转换成全拼后的字符串
     */
    public static String getFullSpell(String cnStr) {
        if (null == cnStr || &#34;&#34;.equals(cnStr.trim())) {
            return cnStr;
        }
        char[] chars = cnStr.toCharArray();
        StringBuffer retuBuf = new StringBuffer();
        for (int i = 0, Len = chars.length; i &lt; Len; i&#43;&#43;) {
            int ascii = getCnAscii(chars[i]);
            if (ascii == 0) { // 取ascii时出错
                retuBuf.append(chars[i]);
            } else {
                String spell = getSpellByAscii(ascii);
                if (spell == null) {
                    retuBuf.append(chars[i]);
                } else {
                    retuBuf.append(spell);
                } // end of if spell == null
            } // end of if ascii &lt;= -20400
        } // end of for
        return retuBuf.toString();
    }
    /**
     * 返回字符串的拼音的首字母,是汉字转化为全拼,其它字符不进行转换
     *
     * @param cnStr String 字符串
     * @return String 转换成全拼后的字符串的首字母
     */
    public static String getFirstSpell(String cnStr) {
        if (cnStr.substring(0, 1).equals(&#34;沣&#34;)) return &#34;f&#34;;
        if (cnStr.substring(0, 1).equals(&#34;骊&#34;)) return &#34;l&#34;;
        if (cnStr.substring(0, 1).equals(&#34;杈&#34;)) return &#34;c&#34;;
        if (cnStr.substring(0, 1).equals(&#34;阿&#34;)) return &#34;e&#34;;
        if (cnStr.substring(0, 1).equals(&#34;怡&#34;)) return &#34;y&#34;;
        if (cnStr.substring(0, 1).equals(&#34;灞&#34;)) return &#34;b&#34;;
        else return getFullSpell(cnStr).substring(0, 1);
    }
    /**
     * 返回字符串每个中文的首字母集合，其他字符不进行转换
     *
     * @param cnStr 转换字符串
     * @return String 每个中文首字母的字符串
     */
    public static String getEveryFirstSpell(String cnStr) {
        String result = &#34;&#34;;
        for (int i = 0; i &lt; cnStr.length(); i&#43;&#43;) {
            result &#43;= getFirstSpell(cnStr.substring(i, i &#43; 1));
        }
        return result;
    }
    public static void main(String[] args) {
        String s = &#34;小&#34;;
        System.out.println(getFullSpell(s));
    }
}
{{&lt; /highlight &gt;}}


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/scripts/java/%E6%B1%89%E5%AD%97%E8%BD%AC%E6%8B%BC%E9%9F%B3/  

