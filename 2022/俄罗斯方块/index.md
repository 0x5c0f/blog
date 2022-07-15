# Java 俄罗斯方块


```java
import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import javax.swing.border.EtchedBorder;
import javax.swing.border.Border;

/**
 * 游戏主类，继承自JFrame类，负责游戏的全局控制。
 * 内含
 * 1、一个GameCanvas画布类的实例对象，
 * 2、一个保存当前活动块 (ErsBlock)实例的对象，
 * 3、一个保存当前控制面板（ ControlPanel）实例的对象;
 */
public class ErsBlocksGame extends JFrame {
       //每填满一行计多少分
       public final static int PER_LINE_SCORE = 100;
       //积多少分以后能升级
       public final static int PER_LEVEL_SCORE = PER_LINE_SCORE * 20;
       //最大级数是10级
       public final static int MAX_LEVEL = 10;
       //默认级数是5
       public final static int DEFAULT_LEVEL = 5;

       private GameCanvas canvas;
       private ErsBlock block;
       private boolean playing = false;
       private ControlPanel ctrlPanel;

       private JMenuBar bar = new JMenuBar();
       private JMenu mGame = new JMenu("游戏" ),
                  mControl = new JMenu("控制 "),
                  mWindowStyle = new JMenu("游戏风格 "),
                  mInfo = new JMenu("信息 ");
       private JMenuItem miNewGame = new JMenuItem("新游戏" ),
                  miSetBlockColor = new JMenuItem("设置方块颜色 ..."),
                  miSetBackColor = new JMenuItem("设置背景颜色 ..."),
                  miTurnHarder = new JMenuItem("升高游戏难度 "),
                  miTurnEasier = new JMenuItem("降低游戏难度 "),
                  miExit = new JMenuItem("退出 "),

                  miPlay = new JMenuItem("开始 "),
                  miPause = new JMenuItem("暂停 "),
                  miResume = new JMenuItem("恢复 "),
                  miStop = new JMenuItem("中止游戏 "),

                  miAuthor = new JMenuItem("版本：俄罗斯方块 1.0"),
                  miSourceInfo = new JMenuItem("源代码由 Java实现");

       private JCheckBoxMenuItem
              miAsWindows = new JCheckBoxMenuItem("Windows"),
                  miAsMotif = new JCheckBoxMenuItem("Motif"),
                  miAsMetal = new JCheckBoxMenuItem("Metal", true);

       //主游戏类的构造方法@param title String，窗口标题
      @SuppressWarnings( "deprecation")
       public ErsBlocksGame(String title) {
             super(title);
            setSize( 315, 392 );
            Dimension scrSize =
               Toolkit.getDefaultToolkit() .getScreenSize();
            setLocation((scrSize.width - getSize() .width) / 2,
                    (scrSize.height - getSize() .height) / 2);
            createMenu();
            Container container = getContentPane();
            container.setLayout( new BorderLayout(6, 0));
            canvas = new GameCanvas(20, 12);
            ctrlPanel = new ControlPanel(this);
            container.add(canvas, BorderLayout.CENTER);
            container.add(ctrlPanel, BorderLayout.EAST);

            addWindowListener( new WindowAdapter() {
                   public void windowClosing(WindowEvent we) {
                        stopGame();
                        System.exit( 0);
                  }
            });
            addComponentListener( new ComponentAdapter() {
                   public void componentResized(ComponentEvent ce) {
                        canvas.fanning();
                  }
            });

            show();
            canvas.fanning();
      }

       //让游戏"复位 "
       public void reset() {
            ctrlPanel.reset();
            canvas.reset();
      }

       //判断游戏是否还在进行
       //@return boolean, true-还在运行，false-已经停止
       public boolean isPlaying() {
             return playing;
      }

       /**
       * 得到当前活动的块
       * @return ErsBlock, 当前活动块的引用
       */
       public ErsBlock getCurBlock() {
             return block;
      }

       //得到当前画布，@return GameCanvas, 当前画布的引用
       public GameCanvas getCanvas() {
             return canvas;
      }

       //开始游戏
       public void playGame() {
            play();
            ctrlPanel.setPlayButtonEnable( false);
            miPlay.setEnabled( false);
            ctrlPanel.requestFocus();
      }

       //游戏暂停
       public void pauseGame() {
             if (block != null) block.pauseMove();
            ctrlPanel.setPauseButtonLabel( false);
            miPause.setEnabled( false);
            miResume.setEnabled( true);
      }

       //让暂停中的游戏继续
       public void resumeGame() {
             if (block != null) block.resumeMove();
            ctrlPanel.setPauseButtonLabel( true);
            miPause.setEnabled( true);
            miResume.setEnabled( false);
            ctrlPanel.requestFocus();
      }

       //用户停止游戏
       public void stopGame() {
            playing = false;
             if (block != null) block.stopMove();
            miPlay.setEnabled( true);
            miPause.setEnabled( true);
            miResume.setEnabled( false);
            ctrlPanel.setPlayButtonEnable( true);
            ctrlPanel.setPauseButtonLabel( true);
      }

       //得到游戏者设置的难度， @return int,游戏难度1－MAX_LEVEL
       public int getLevel() {
             return ctrlPanel.getLevel();
      }

       //用户设置游戏难度，@param level int,游戏难度1－ MAX_LEVEL
       public void setLevel(int level) {
             if (level < 11 && level > 0) ctrlPanel.setLevel(level);
      }

       //得到游戏积分, @return int, 积分。
       public int getScore() {
             if (canvas != null) return canvas.getScore();
             return 0 ;
      }

       //得到自上次升级以来的游戏积分，升级以后，此积分清零
       //@return int, 积分。
       public int getScoreForLevelUpdate() {
             if (canvas != null) return canvas.getScoreForLevelUpdate();
             return 0 ;
      }

       //当分数累计到一定的数量时，升一次级
       //@return boolean, ture-update successufl, false-update fail
       public boolean levelUpdate() {
             int curLevel = getLevel();
             if (curLevel < MAX_LEVEL) {
                  setLevel(curLevel + 1);
                  canvas.resetScoreForLevelUpdate();
                   return true ;
            }
             return false ;
      }

       //游戏开始
       private void play() {
            reset();
            playing = true;
            Thread thread = new Thread(new Game());
            thread.start();
      }

       //报告游戏结束了
       private void reportGameOver() {
            JOptionPane.showMessageDialog( this, "Game Over!" );
      }

       //建立并设置窗口菜单
       private void createMenu() {
            bar.add(mGame);
            bar.add(mControl);
            bar.add(mWindowStyle);
            bar.add(mInfo);
            mGame.add(miNewGame);
            mGame.addSeparator();
            mGame.add(miSetBlockColor);
            mGame.add(miSetBackColor);
            mGame.addSeparator();
            mGame.add(miTurnHarder);
            mGame.add(miTurnEasier);
            mGame.addSeparator();
            mGame.add(miExit);
            mControl.add(miPlay);
            mControl.add(miPause);
            mControl.add(miResume);
            mControl.add(miStop);
            mWindowStyle.add(miAsWindows);
            mWindowStyle.add(miAsMotif);
            mWindowStyle.add(miAsMetal);
            mInfo.add(miAuthor);
            mInfo.add(miSourceInfo);
            setJMenuBar(bar);

            miPause.setAccelerator(KeyStroke.getKeyStroke(
          KeyEvent.VK_P,KeyEvent.CTRL_MASK));
            miResume.setAccelerator(KeyStroke.getKeyStroke(
          KeyEvent.VK_ENTER, 0));

            miNewGame.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        stopGame();
                        reset();
                        setLevel(DEFAULT_LEVEL);
                  }
            });
            miSetBlockColor.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        Color newFrontColor = JColorChooser.showDialog(
                            ErsBlocksGame. this," 设置方块颜色 ",
                 canvas.getBlockColor());
                         if (newFrontColor != null)
                              canvas.setBlockColor(newFrontColor);
                  }
            });
            miSetBackColor.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        Color newBackColor = JColorChooser.showDialog(
                           ErsBlocksGame. this, " 设置方块颜色 ",
                           canvas.getBackgroundColor());
                         if (newBackColor != null)
                              canvas.setBackgroundColor(newBackColor);
                  }
            });
            miTurnHarder.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                         int curLevel = getLevel();
                         if (curLevel < MAX_LEVEL) setLevel(curLevel + 1);
                  }
            });
            miTurnEasier.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                         int curLevel = getLevel();
                         if (curLevel > 1) setLevel(curLevel - 1);
                  }
            });
            miExit.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        System.exit( 0);
                  }
            });
            miPlay.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        playGame();
                  }
            });
            miPause.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        pauseGame();
                  }
            });
            miResume.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        resumeGame();
                  }
            });
            miStop.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        stopGame();
                  }
            });
            miAsWindows.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        String plaf = "com.sun.java.swing.plaf.windows.WindowsLookAndFeel" ;
                        setWindowStyle(plaf);
                        canvas.fanning();
                        ctrlPanel.fanning();
                        miAsWindows.setState( true);
                        miAsMetal.setState( false);
                        miAsMotif.setState( false);
                  }
            });
            miAsMotif.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        String plaf = "com.sun.java.swing.plaf.motif.MotifLookAndFeel" ;
                        setWindowStyle(plaf);
                        canvas.fanning();
                        ctrlPanel.fanning();
                        miAsWindows.setState( false);
                        miAsMetal.setState( false);
                        miAsMotif.setState( true);
                  }
            });
            miAsMetal.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        String plaf = "javax.swing.plaf.metal.MetalLookAndFeel" ;
                        setWindowStyle(plaf);
                        canvas.fanning();
                        ctrlPanel.fanning();
                        miAsWindows.setState( false);
                        miAsMetal.setState( true);
                        miAsMotif.setState( false);
                  }
            });
      }

       //根据字串设置窗口外观 , @param plaf String, 窗口外观的描述
       private void setWindowStyle(String plaf) {
             try {
                  UIManager.setLookAndFeel(plaf);
                  SwingUtilities.updateComponentTreeUI( this);
            } catch (Exception e) {
            }
      }

       /**
       * 一轮游戏过程，实现了 Runnable接口
       * 一轮游戏是一个大循环，在这个循环中，每隔 100毫秒，
       * 检查游戏中的当前块是否已经到底了，如果没有，
       * 就继续等待。如果到底了，就看有没有全填满的行，
       * 如果有就删除它，并为游戏者加分，同时随机产生一个
       * 新的当前块，让它自动下落。
       * 当新产生一个块时，先检查画布最顶上的一行是否已经
       * 被占了，如果是，可以判断 Game Over了。
       */
       private class Game implements Runnable {
             public void run() {
                   int col = (int) (Math.random() * (canvas.getCols() - 3));
                   int style = ErsBlock.STYLES[(int) (Math.random() * 7)][(int ) (Math.random() * 4)];

                   while (playing) {
                         if (block != null) {    //第一次循环时，block为空
                               if (block.isAlive()) {
                                     try {
                                          Thread.currentThread() .sleep(100 );
                                    } catch (InterruptedException ie) {
                                          ie.printStackTrace();
                                    }
                                     continue;
                              }
                        }

                        checkFullLine();        //检查是否有全填满的行

                         if (isGameOver()) {     //检查游戏是否应该结束了
                              miPlay.setEnabled( true);
                              miPause.setEnabled( true);
                              miResume.setEnabled( false);
                              ctrlPanel.setPlayButtonEnable( true);
                              ctrlPanel.setPauseButtonLabel( true);
                              reportGameOver();
                               return;
                        }

                        block = new ErsBlock(style, -1, col, getLevel(), canvas);
                        block.start();

                        col = ( int) (Math.random() * (canvas.getCols() - 3));
                        style = ErsBlock.STYLES[( int) (Math.random() * 7)][(int ) (Math.random() * 4)];

                        ctrlPanel.setTipStyle(style);
                  }
            }

             //检查画布中是否有全填满的行，如果有就删除之
             public void checkFullLine() {
                   for (int i = 0; i < canvas.getRows(); i++) {
                         int row = -1;
                         boolean fullLineColorBox = true;
                         for (int j = 0; j < canvas.getCols(); j++) {
                               if (!canvas.getBox(i, j).isColorBox()) {
                                    fullLineColorBox = false;
                                     break;
                              }
                        }
                         if (fullLineColorBox) {
                              row = i--;
                              canvas.removeLine(row);
                        }
                  }
            }

             //根据最顶行是否被占，判断游戏是否已经结束了。
             //@return boolean, true-游戏结束了，false-游戏未结束
             private boolean isGameOver() {
                   for (int i = 0; i < canvas.getCols(); i++) {
                        ErsBox box = canvas.getBox( 0, i);
                         if (box.isColorBox()) return true;
                  }
                   return false ;
            }
      }

       //程序入口函数, @param args String[], 附带的命令行参数
       public static void main(String[] args) {
             new ErsBlocksGame("俄罗斯方块 ");
      }
}

/**
 * 画布类，内有<行数> * < 列数>个方格类实例。
 * 继承自JPanel类。
 * ErsBlock 线程类动态改变画布类的方格颜色，画布类通过
 * 检查方格颜色来体现ErsBlock块的移动情况。
 */
class GameCanvas extends JPanel {
       private Color backColor = Color.black, frontColor = Color.orange;
       private int rows, cols, score = 0, scoreForLevelUpdate = 0;
       private ErsBox[][] boxes;
       private int boxWidth, boxHeight;

       /**
       * 画布类的构造函数
       * @param rows int, 画布的行数
       * @param cols int, 画布的列数
       * 行数和列数决定着画布拥有方格的数目
       */
       public GameCanvas(int rows, int cols) {
             this.rows = rows;
             this.cols = cols;

            boxes = new ErsBox[rows][cols];
             for (int i = 0; i < boxes.length; i++) {
                   for (int j = 0; j < boxes[i] .length; j++) {
                        boxes[i][j] = new ErsBox(false);
                  }
            }

            setBorder( new EtchedBorder(
                    EtchedBorder.RAISED, Color.white, new Color(148, 145, 140 )));
      }

       /**
       * 画布类的构造函数
       * @param rows 与public GameCanvas(int rows, int cols)同
       * @param cols 与public GameCanvas(int rows, int cols)同
       * @param backColor Color, 背景色
       * @param frontColor Color, 前景色
       */
       public GameCanvas(int rows, int cols,
                        Color backColor, Color frontColor) {
             this(rows, cols);
             this.backColor = backColor;
             this.frontColor = frontColor;
      }

       /**
       * 设置游戏背景色彩
       * @param backColor Color, 背景色彩
       */
       public void setBackgroundColor(Color backColor) {
             this.backColor = backColor;
      }

       /**
       * 取得游戏背景色彩
       * @return Color, 背景色彩
       */
       public Color getBackgroundColor() {
             return backColor;
      }

       /**
       * 设置游戏方块色彩
       * @param frontColor Color, 方块色彩
       */
       public void setBlockColor(Color frontColor) {
             this.frontColor = frontColor;
      }

       /**
       * 取得游戏方块色彩
       * @return Color, 方块色彩
       */
       public Color getBlockColor() {
             return frontColor;
      }

       /**
       * 取得画布中方格的行数
       * @return int, 方格的行数
       */
       public int getRows() {
             return rows;
      }

       /**
       * 取得画布中方格的列数
       * @return int, 方格的列数
       */
       public int getCols() {
             return cols;
      }

       /**
       * 取得游戏成绩
       * @return int, 分数
       */
       public int getScore() {
             return score;
      }

       /**
       * 取得自上一次升级后的积分
       * @return int, 上一次升级后的积分
       */
       public int getScoreForLevelUpdate() {
             return scoreForLevelUpdate;
      }

       /**
       * 升级后，将上一次升级以来的积分清 0
       */
       public void resetScoreForLevelUpdate() {
            scoreForLevelUpdate -= ErsBlocksGame.PER_LEVEL_SCORE;
      }

       /**
       * 得到某一行某一列的方格引用。
       * @param row int, 要引用的方格所在的行
       * @param col int, 要引用的方格所在的列
       * @return ErsBox, 在row行col 列的方格的引用
       */
       public ErsBox getBox(int row, int col) {
             if (row < 0 || row > boxes.length - 1
                    || col < 0 || col > boxes[0].length - 1)
                   return null ;
             return (boxes[row][col]);
      }

       /**
       * 覆盖JComponent类的函数，画组件。
       * @param g 图形设备环境
       */
       public void paintComponent(Graphics g) {
             super.paintComponent(g);

            g.setColor(frontColor);
             for (int i = 0; i < boxes.length; i++) {
                   for (int j = 0; j < boxes[i] .length; j++) {
                        g.setColor(boxes[i][j] .isColorBox() ? frontColor : backColor);
                        g.fill3DRect(j * boxWidth, i * boxHeight,
                                boxWidth, boxHeight, true);
                  }
            }
      }

       /**
       * 根据窗口的大小，自动调整方格的尺寸
       */
       public void fanning() {
            boxWidth = getSize() .width / cols;
            boxHeight = getSize() .height / rows;
      }

       /**
       * 当一行被游戏者叠满后，将此行清除，并为游戏者加分
       * @param row int, 要清除的行，是由 ErsBoxesGame类计算的
       */
       public synchronized void removeLine(int row) {
             for (int i = row; i > 0; i--) {
                   for (int j = 0; j < cols; j++)
                        boxes[i][j] = (ErsBox) boxes[i - 1][j]. clone();
            }

            score += ErsBlocksGame.PER_LINE_SCORE;
            scoreForLevelUpdate += ErsBlocksGame.PER_LINE_SCORE;
            repaint();
      }

       /**
       * 重置画布，置积分为 0
       */
       public void reset() {
            score = 0;
            scoreForLevelUpdate = 0;
             for (int i = 0; i < boxes.length; i++) {
                   for (int j = 0; j < boxes[i] .length; j++)
                        boxes[i][j] .setColor(false);
            }

            repaint();
      }
}

/**
 * 方格类，是组成块的基本元素，用自己的颜色来表示块的外观
 */
class ErsBox implements Cloneable {
       private boolean isColor;
       private Dimension size = new Dimension();

       /**
       * 方格类的构造函数
       * @param isColor 是不是用前景色来为此方格着色，
       *      true 前景色， false用背景色
       */
       public ErsBox(boolean isColor) {
             this.isColor = isColor;
      }

       /**
       * 此方格是不是用前景色表现
       * @return boolean,true 用前景色表现， false用背景色表现
       */
       public boolean isColorBox() {
             return isColor;
      }

       /**
       * 设置方格的颜色，
       * @param isColor boolean,true 用前景色表现， false用背景色表现
       */
       public void setColor(boolean isColor) {
             this.isColor = isColor;
      }

       /**
       * 得到此方格的尺寸
       * @return Dimension, 方格的尺寸
       */
       public Dimension getSize() {
             return size;
      }

       /**
       * 设置方格的尺寸
       * @param size Dimension, 方格的尺寸
       */
       public void setSize(Dimension size) {
             this.size = size;
      }

       /**
       * 覆盖Object的Object clone() ，实现克隆
       * @return Object, 克隆的结果
       */
       public Object clone() {
            Object cloned = null;
             try {
                  cloned = super.clone();
            } catch (Exception ex) {
                  ex.printStackTrace();
            }

             return cloned;
      }
}

/**
 * 块类，继承自线程类（ Thread）
 * 由 4 * 4 个方格（ ErsBox）构成一个块，
 * 控制块的移动、下落、变形等
 */
class ErsBlock extends Thread {
       /**
       * 一个块占的行数是 4行
       */
       public final static int BOXES_ROWS = 4;
       /**
       * 一个块占的列数是 4列
       */
       public final static int BOXES_COLS = 4;
       /**
       * 让升级变化平滑的因子，避免最后几级之间的速度相差近一倍
       */
       public final static int LEVEL_FLATNESS_GENE = 3;
       /**
       * 相近的两级之间，块每下落一行的时间差别为多少 (毫秒)
       */
       public final static int BETWEEN_LEVELS_DEGRESS_TIME = 50;
       /**
       * 方块的样式数目为 7
       */
       private final static int BLOCK_KIND_NUMBER = 7;
       /**
       * 每一个样式的方块的反转状态种类为 4
       */
       private final static int BLOCK_STATUS_NUMBER = 4;
       /**
       * 分别对应对 7种模型的28种状态
       */
       public final static int[][] STYLES = { // 共28种状态
            { 0x0f00, 0x4444 , 0x0f00, 0x4444}, // 长条型的四种状态
            { 0x04e0, 0x0464 , 0x00e4, 0x04c4}, // 'T'型的四种状态
            { 0x4620, 0x6c00 , 0x4620, 0x6c00}, // 反'Z'型的四种状态
            { 0x2640, 0xc600 , 0x2640, 0xc600}, // 'Z'型的四种状态
            { 0x6220, 0x1700 , 0x2230, 0x0740}, // '7'型的四种状态
            { 0x6440, 0x0e20 , 0x44c0, 0x8e00}, // 反'7'型的四种状态
            { 0x0660, 0x0660 , 0x0660, 0x0660}, // 方块的四种状态
      };

       private GameCanvas canvas;
       private ErsBox[][] boxes = new ErsBox[BOXES_ROWS][BOXES_COLS];
       private int style, y, x, level;
       private boolean pausing = false, moving = true;

       /**
       * 构造函数，产生一个特定的块
       * @param style 块的样式，对应 STYLES的28个值中的一个
       * @param y 起始位置，左上角在 canvas中的坐标行
       * @param x 起始位置，左上角在 canvas中的坐标列
       * @param level 游戏等级，控制块的下落速度
       * @param canvas 画板
       */
       public ErsBlock(int style, int y, int x, int level, GameCanvas canvas) {
             this.style = style;
             this.y = y;
             this.x = x;
             this.level = level;
             this.canvas = canvas;

             int key = 0x8000;
             for (int i = 0; i < boxes.length; i++) {
                   for (int j = 0; j < boxes[i] .length; j++) {
                         boolean isColor = ((style & key) != 0);
                        boxes[i][j] = new ErsBox(isColor);
                        key >>= 1;
                  }
            }

            display();
      }

       /**
       * 线程类的 run()函数覆盖，下落块，直到块不能再下落
       */
       public void run() {
             while (moving) {
                   try {
                        sleep(BETWEEN_LEVELS_DEGRESS_TIME
                                * (ErsBlocksGame.MAX_LEVEL - level + LEVEL_FLATNESS_GENE));
                  } catch (InterruptedException ie) {
                        ie.printStackTrace();
                  }
                   //后边的moving是表示在等待的 100毫秒间，moving没被改变
                   if (!pausing) moving = (moveTo(y + 1, x) && moving);
            }
      }

       /**
       * 块向左移动一格
       */
       public void moveLeft() {
            moveTo(y, x - 1);
      }

       /**
       * 块向右移动一格
       */
       public void moveRight() {
            moveTo(y, x + 1);
      }

       /**
       * 块向下落一格
       */
       public void moveDown() {
            moveTo(y + 1, x);
      }

       /**
       * 块变型
       */
       public void turnNext() {
             for (int i = 0; i < BLOCK_KIND_NUMBER; i++) {
                   for (int j = 0; j < BLOCK_STATUS_NUMBER; j++) {
                         if (STYLES[i][j] == style) {
                               int newStyle = STYLES[i][(j + 1) % BLOCK_STATUS_NUMBER];
                              turnTo(newStyle);
                               return;
                        }
                  }
            }
      }

       /**
       * 暂停块的下落，对应游戏暂停
       */
       public void pauseMove() {
            pausing = true;
      }

       /**
       * 继续块的下落，对应游戏继续
       */
       public void resumeMove() {
            pausing = false;
      }

       /**
       * 停止块的下落，对应游戏停止
       */
       public void stopMove() {
            moving = false;
      }

       /**
       * 将当前块从画布的对应位置移除，要等到下次重画画布时才能反映出来
       */
       private void earse() {
             for (int i = 0; i < boxes.length; i++) {
                   for (int j = 0; j < boxes[i] .length; j++) {
                         if (boxes[i][j].isColorBox()) {
                              ErsBox box = canvas.getBox(i + y, j + x);
                               if (box == null) continue;
                              box.setColor( false);
                        }
                  }
            }
      }

       /**
       * 让当前块放置在画布的对应位置上，要等到下次重画画布时才能看见
       */
       private void display() {
             for (int i = 0; i < boxes.length; i++) {
                   for (int j = 0; j < boxes[i] .length; j++) {
                         if (boxes[i][j].isColorBox()) {
                              ErsBox box = canvas.getBox(y + i, x + j);
                               if (box == null) continue;
                              box.setColor( true);
                        }
                  }
            }
      }

       /**
       * 当前块能否移动到 newRow/newCol所指定的位置
       * @param newRow int, 目的地所在行
       * @param newCol int, 目的地所在列
       * @return boolean, true- 能移动， false-不能
       */
       private boolean isMoveAble(int newRow, int newCol) {
            earse();
             for (int i = 0; i < boxes.length; i++) {
                   for (int j = 0; j < boxes[i] .length; j++) {
                         if (boxes[i][j].isColorBox()) {
                              ErsBox box = canvas.getBox(newRow + i, newCol + j);
                               if (box == null || (box.isColorBox())) {
                                    display();
                                     return false ;
                              }
                        }
                  }
            }
            display();
             return true ;
      }

       /**
       * 将当前画移动到 newRow/newCol所指定的位置
       * @param newRow int, 目的地所在行
       * @param newCol int, 目的地所在列
       * @return boolean, true- 移动成功， false-移动失败
       */
       private synchronized boolean moveTo(int newRow, int newCol) {
             if (!isMoveAble(newRow, newCol) || !moving) return false;

            earse();
            y = newRow;
            x = newCol;

            display();
            canvas.repaint();

             return true ;
      }

       /**
       * 当前块能否变成 newStyle所指定的块样式，主要是要考虑
       * 边界以及被其它块挡住、不能移动的情况
       * @param newStyle int, 希望改变的块样式，对应 STYLES的28个值中的一个
       * @return boolean,true- 能改变， false-不能改变
       */
       private boolean isTurnAble(int newStyle) {
             int key = 0x8000;
            earse();
             for (int i = 0; i < boxes.length; i++) {
                   for (int j = 0; j < boxes[i] .length; j++) {
                         if ((newStyle & key) != 0) {
                              ErsBox box = canvas.getBox(y + i, x + j);
                               if (box == null || box.isColorBox()) {
                                    display();
                                     return false ;
                              }
                        }
                        key >>= 1;
                  }
            }
            display();
             return true ;
      }

       /**
       * 将当前块变成 newStyle所指定的块样式
       * @param newStyle int, 将要改变成的块样式，对应 STYLES的28个值中的一个
       * @return boolean,true- 改变成功， false-改变失败
       */
       private boolean turnTo(int newStyle) {
             if (!isTurnAble(newStyle) || !moving) return false;

            earse();
             int key = 0x8000;
             for (int i = 0; i < boxes.length; i++) {
                   for (int j = 0; j < boxes[i] .length; j++) {
                         boolean isColor = ((newStyle & key) != 0);
                        boxes[i][j] .setColor(isColor);
                        key >>= 1;
                  }
            }
            style = newStyle;

            display();
            canvas.repaint();

             return true ;
      }
}

/**
 * 控制面板类，继承自JPanel.
 * 上边安放预显窗口、等级、得分、控制按钮
 * 主要用来控制游戏进程。
 */
class ControlPanel extends JPanel {
       private JTextField
              tfLevel = new JTextField(""+ ErsBlocksGame.DEFAULT_LEVEL),
      tfScore = new JTextField("0");

       private JButton
              btPlay = new JButton("开始 "),
      btPause = new JButton("暂停 "),
      btStop = new JButton("中止游戏 "),
      btTurnLevelUp = new JButton("增加难度 "),
      btTurnLevelDown = new JButton("降低难度 ");

       private JPanel plTip = new JPanel(new BorderLayout());
       private TipPanel plTipBlock = new TipPanel();
       private JPanel plInfo = new JPanel(new GridLayout( 4, 1 ));
       private JPanel plButton = new JPanel(new GridLayout( 5, 1 ));

       private Timer timer;
       private ErsBlocksGame game;

       private Border border = new EtchedBorder(
              EtchedBorder.RAISED, Color.white, new Color(148, 145, 140));

       /**
       * 控制面板类的构造函数
       * @param game ErsBlocksGame, ErsBoxesGame 类的一个实例引用，
       * 方便直接控制 ErsBoxesGame类的行为。
       */
       public ControlPanel(final ErsBlocksGame game) {
            setLayout( new GridLayout(3, 1, 0, 4 ));
             this.game = game;

            plTip.add( new JLabel("下一个方块 "), BorderLayout.NORTH);
            plTip.add(plTipBlock);
            plTip.setBorder(border);

            plInfo.add( new JLabel("难度系数 "));
            plInfo.add(tfLevel);
            plInfo.add( new JLabel("得分 "));
            plInfo.add(tfScore);
            plInfo.setBorder(border);

            tfLevel.setEditable( false);
            tfScore.setEditable( false);

            plButton.add(btPlay);
            plButton.add(btPause);
            plButton.add(btStop);
            plButton.add(btTurnLevelUp);
            plButton.add(btTurnLevelDown);
            plButton.setBorder(border);

            add(plTip);
            add(plInfo);
            add(plButton);

            addKeyListener( new ControlKeyListener());

            btPlay.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        game.playGame();
                  }
            });
            btPause.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                         if (btPause.getText().equals(new String("Pause" ))) {
                              game.pauseGame();
                        } else {
                              game.resumeGame();
                        }
                  }
            });
            btStop.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        game.stopGame();
                  }
            });
            btTurnLevelUp.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                         try {
                               int level = Integer.parseInt(tfLevel.getText());
                               if (level < ErsBlocksGame.MAX_LEVEL)
                                    tfLevel.setText( ""+ (level + 1));
                        } catch (NumberFormatException e) {
                        }
                        requestFocus();
                  }
            });
            btTurnLevelDown.addActionListener( new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                         try {
                               int level = Integer.parseInt(tfLevel.getText());
                               if (level > 1)
                                    tfLevel.setText( ""+ (level - 1));
                        } catch (NumberFormatException e) {
                        }
                        requestFocus();
                  }
            });

            addComponentListener( new ComponentAdapter() {
                   public void componentResized(ComponentEvent ce) {
                        plTipBlock.fanning();
                  }
            });

            timer = new Timer(500, new ActionListener() {
                   public void actionPerformed(ActionEvent ae) {
                        tfScore.setText( ""+ game.getScore());
                         int scoreForLevelUpdate =
                                game.getScoreForLevelUpdate();
                         if (scoreForLevelUpdate >= ErsBlocksGame.PER_LEVEL_SCORE
                                && scoreForLevelUpdate > 0)
                              game.levelUpdate();
                  }
            });
            timer.start();
      }

       /**
       * 设置预显窗口的样式，
       * @param style int, 对应ErsBlock类的STYLES 中的28个值
       */
       public void setTipStyle(int style) {
            plTipBlock.setStyle(style);
      }

       /**
       * 取得用户设置的游戏等级。
       * @return int, 难度等级， 1　－　ErsBlocksGame.MAX_LEVEL
       */
       public int getLevel() {
             int level = 0;
             try {
                  level = Integer.parseInt(tfLevel.getText());
            } catch (NumberFormatException e) {
            }
             return level;
      }

       /**
       * 让用户修改游戏难度等级。
       * @param level 修改后的游戏难度等级
       */
       public void setLevel(int level) {
             if (level > 0 && level < 11) tfLevel.setText( ""+ level);
      }

       /**
       * 设置"开始" 按钮的状态。
       */
       public void setPlayButtonEnable(boolean enable) {
            btPlay.setEnabled(enable);
      }

       public void setPauseButtonLabel(boolean pause) {
            btPause.setText(pause ? "暂停": "继续" );
      }

       /**
       * 重置控制面板
       */
       public void reset() {
            tfScore.setText( "0");
            plTipBlock.setStyle( 0);
      }

       /**
       * 重新计算 TipPanel里的boxes[][]里的小框的大小
       */
       public void fanning() {
            plTipBlock.fanning();
      }

       /**
       * 预显窗口的实现细节类
       */
       private class TipPanel extends JPanel {
             private Color backColor = Color.darkGray, frontColor = Color.lightGray;
             private ErsBox[][] boxes =
                    new ErsBox[ErsBlock.BOXES_ROWS][ErsBlock.BOXES_COLS];

             private int style, boxWidth, boxHeight;
             private boolean isTiled = false;

             /**
             * 预显窗口类构造函数
             */
             public TipPanel() {
                   for (int i = 0; i < boxes.length; i++) {
                         for (int j = 0; j < boxes[i] .length; j++)
                              boxes[i][j] = new ErsBox(false);
                  }
            }

             /**
             * 预显窗口类构造函数
             * @param backColor Color, 窗口的背景色
             * @param frontColor Color, 窗口的前景色
             */
             public TipPanel(Color backColor, Color frontColor) {
                   this();
                   this.backColor = backColor;
                   this.frontColor = frontColor;
            }

             /**
             * 设置预显窗口的方块样式
             * @param style int, 对应ErsBlock类的STYLES 中的28个值
             */
             public void setStyle(int style) {
                   this.style = style;
                  repaint();
            }

             /**
             * 覆盖JComponent类的函数，画组件。
             * @param g 图形设备环境
             */
             public void paintComponent(Graphics g) {
                   super.paintComponent(g);

                   if (!isTiled) fanning();

                   int key = 0x8000;
                   for (int i = 0; i < boxes.length; i++) {
                         for (int j = 0; j < boxes[i] .length; j++) {
                              Color color = (((key & style) != 0) ? frontColor : backColor);
                              g.setColor(color);
                              g.fill3DRect(j * boxWidth, i * boxHeight,
                                      boxWidth, boxHeight, true);
                              key >>= 1;
                        }
                  }
            }

             /**
             * 根据窗口的大小，自动调整方格的尺寸
             */
             public void fanning() {
                  boxWidth = getSize() .width / ErsBlock.BOXES_COLS;
                  boxHeight = getSize() .height / ErsBlock.BOXES_ROWS;
                  isTiled = true;
            }
      }

       private class ControlKeyListener extends KeyAdapter {
             public void keyPressed(KeyEvent ke) {
                   if (!game.isPlaying()) return;

                  ErsBlock block = game.getCurBlock();
                   switch (ke.getKeyCode()) {
                         case KeyEvent.VK_DOWN:
                              block.moveDown();
                               break;
                         case KeyEvent.VK_LEFT:
                              block.moveLeft();
                               break;
                         case KeyEvent.VK_RIGHT:
                              block.moveRight();
                               break;
                         case KeyEvent.VK_UP:
                              block.turnNext();
                               break;
                         default:
                               break;
                  }
            }
      }
}
```
