// 导入事件分发器基类
import { EventDispatcher } from "../core/EventDispatcher.js";
// 导入纹理相关的常量
import {
  MirroredRepeatWrapping, // 镜像重复包装
  ClampToEdgeWrapping, // 边缘夹紧包装
  RepeatWrapping, // 重复包装
  UnsignedByteType, // 无符号字节类型
  RGBAFormat, // RGBA格式
  LinearMipmapLinearFilter, // 线性Mipmap线性过滤
  LinearFilter, // 线性过滤
  UVMapping, // UV映射
  NoColorSpace, // 无颜色空间
} from "../constants.js";
// 导入UUID生成函数
import { generateUUID } from "../math/MathUtils.js";
// 导入数学类
import { Vector2 } from "../math/Vector2.js";
import { Vector3 } from "../math/Vector3.js";
import { Matrix3 } from "../math/Matrix3.js";
// 导入纹理数据源类
import { Source } from "./Source.js";

// 全局纹理ID计数器，用于为每个纹理实例分配唯一的数字ID
let _textureId = 0;

// 临时向量，用于内部计算，使用 /*@__PURE__*/ 标记以便打包工具优化
const _tempVec3 = /*@__PURE__*/ new Vector3();

/**
 * 纹理基类
 *
 * 所有纹理类型的基础类，提供纹理的核心功能和属性
 * 纹理是3D图形中用于给物体表面添加细节和颜色的重要组件
 *
 * 纹理系统的核心概念：
 * - 数据源：纹理的实际图像数据（图片、画布、视频等）
 * - 映射方式：纹理坐标如何映射到3D表面
 * - 包装模式：纹理边界外的处理方式
 * - 过滤方式：纹理采样时的插值算法
 * - 格式和类型：像素数据的组织和存储方式
 *
 * 主要功能：
 * - 图像数据管理：加载、存储和更新纹理数据
 * - 纹理坐标映射：控制纹理如何应用到几何体表面
 * - 采样和过滤：控制纹理的视觉质量和性能
 * - 变换操作：偏移、旋转、缩放纹理坐标
 * - 内存管理：优化GPU内存使用和纹理生命周期
 *
 * 使用场景：
 * - 材质贴图：为物体表面添加颜色和细节
 * - 法线贴图：模拟表面凹凸和细节
 * - 环境贴图：实现反射和环境光照
 * - 数据纹理：存储和传递计算数据
 * - 后处理效果：屏幕空间效果的数据源
 *
 * 重要限制：
 * 纹理首次使用后，其尺寸、格式和类型无法更改
 * 如需修改这些属性，必须调用 dispose() 方法销毁纹理并创建新实例
 *
 * 使用示例：
 * ```js
 * // 从图像创建纹理
 * const loader = new THREE.TextureLoader();
 * const texture = loader.load('texture.jpg');
 *
 * // 设置纹理属性
 * texture.wrapS = THREE.RepeatWrapping;
 * texture.wrapT = THREE.RepeatWrapping;
 * texture.repeat.set(2, 2);
 *
 * // 应用到材质
 * const material = new THREE.MeshBasicMaterial({ map: texture });
 * ```
 *
 * @augments EventDispatcher - 继承自事件分发器，支持事件监听和分发
 */
class Texture extends EventDispatcher {
  /**
   * 构造一个新的纹理
   *
   * 创建纹理实例并初始化所有属性
   * 所有参数都是可选的，未指定的参数将使用默认值
   *
   * @param {?Object} [image=Texture.DEFAULT_IMAGE] - 包含纹理数据的图像对象
   *                                                 可以是Image、Canvas、Video等DOM元素
   *                                                 或包含width、height、data的数据对象
   * @param {number} [mapping=Texture.DEFAULT_MAPPING] - 纹理映射方式
   *                                                     定义纹理坐标如何映射到3D表面
   * @param {number} [wrapS=ClampToEdgeWrapping] - S轴（水平）包装模式
   *                                              控制纹理在水平方向的重复行为
   * @param {number} [wrapT=ClampToEdgeWrapping] - T轴（垂直）包装模式
   *                                              控制纹理在垂直方向的重复行为
   * @param {number} [magFilter=LinearFilter] - 放大过滤器
   *                                           当纹理被放大时使用的过滤算法
   * @param {number} [minFilter=LinearMipmapLinearFilter] - 缩小过滤器
   *                                                       当纹理被缩小时使用的过滤算法
   * @param {number} [format=RGBAFormat] - 纹理格式
   *                                      定义像素数据的格式（RGB、RGBA、Luminance等）
   * @param {number} [type=UnsignedByteType] - 纹理数据类型
   *                                          定义像素数据的数据类型
   * @param {number} [anisotropy=Texture.DEFAULT_ANISOTROPY] - 各向异性过滤级别
   *                                                          提高倾斜角度观看时的纹理质量
   * @param {string} [colorSpace=NoColorSpace] - 颜色空间
   *                                            定义颜色数据的解释方式
   */
  constructor(
    image = Texture.DEFAULT_IMAGE,
    mapping = Texture.DEFAULT_MAPPING,
    wrapS = ClampToEdgeWrapping,
    wrapT = ClampToEdgeWrapping,
    magFilter = LinearFilter,
    minFilter = LinearMipmapLinearFilter,
    format = RGBAFormat,
    type = UnsignedByteType,
    anisotropy = Texture.DEFAULT_ANISOTROPY,
    colorSpace = NoColorSpace
  ) {
    // 调用父类构造函数，初始化事件分发功能
    super();

    // ===== 基础属性 =====

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 Texture 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isTexture = true;

    /**
     * 纹理的唯一数字标识符
     *
     * 每个纹理实例都有一个唯一的数字ID，从0开始递增
     * 主要用于内部识别和调试，比UUID更轻量级
     * 使用Object.defineProperty确保ID不可修改
     *
     * @name Texture#id
     * @type {number}
     * @readonly
     */
    Object.defineProperty(this, "id", { value: _textureId++ });

    /**
     * 纹理的UUID（通用唯一标识符）
     *
     * 全局唯一的字符串标识符，用于序列化、网络传输等场景
     * 比数字ID更适合跨系统的唯一性保证
     *
     * 注意：注释中提到"material"是错误的，这里应该是"texture"
     *
     * @type {string}
     * @readonly
     */
    this.uuid = generateUUID();

    /**
     * 纹理的名称
     *
     * 用户定义的纹理名称，便于识别和调试
     * 在编辑器、调试工具和序列化中很有用
     *
     * @type {string}
     */
    this.name = "";

    // ===== 数据源和内容 =====

    /**
     * 纹理的数据源定义
     *
     * 包含纹理的实际数据，数据源的引用可以在多个纹理间共享
     * 这在精灵图（spritesheets）场景中特别有用，多个纹理可以渲染相同的数据
     * 但使用不同的纹理变换
     *
     * 数据共享的优势：
     * - 内存效率：避免重复存储相同的图像数据
     * - 性能优化：减少GPU内存使用
     * - 灵活性：支持不同的纹理变换和裁剪
     *
     * 使用场景：
     * - 精灵图集：从大图中提取不同区域
     * - 纹理图集：多个小纹理合并在一张大图中
     * - 动画序列：共享图像数据但显示不同帧
     *
     * @type {Source}
     */
    this.source = new Source(image);

    /**
     * 用户定义的Mipmap数组
     *
     * 存储手动提供的多级渐远纹理数据
     * 如果为空，系统会自动生成Mipmaps（如果启用了generateMipmaps）
     *
     * Mipmap的作用：
     * - 提高远距离观看时的渲染质量
     * - 减少纹理走样（aliasing）
     * - 优化GPU采样性能
     *
     * 数组结构：
     * - 索引0：最高分辨率级别（原始尺寸）
     * - 索引1：一半分辨率级别
     * - 索引n：最低分辨率级别（通常是1x1）
     *
     * @type {Array<Object>}
     */
    this.mipmaps = [];

    // ===== 映射和坐标 =====

    /**
     * 纹理映射方式
     *
     * 定义纹理如何应用到物体表面，默认值是UVMapping
     * 使用纹理坐标或UV坐标来应用贴图
     *
     * 支持的映射类型：
     * - UVMapping: 标准UV映射（默认）
     * - CubeReflectionMapping: 立方体反射映射
     * - CubeRefractionMapping: 立方体折射映射
     * - EquirectangularReflectionMapping: 等距柱状反射映射
     * - EquirectangularRefractionMapping: 等距柱状折射映射
     * - CubeUVReflectionMapping: 立方体UV反射映射
     *
     * 使用场景：
     * - UVMapping: 普通的纹理贴图
     * - 反射映射: 环境反射效果
     * - 折射映射: 透明材质的折射效果
     *
     * @type {(UVMapping|CubeReflectionMapping|CubeRefractionMapping|EquirectangularReflectionMapping|EquirectangularRefractionMapping|CubeUVReflectionMapping)}
     * @default UVMapping
     */
    this.mapping = mapping;

    /**
     * UV属性通道选择
     *
     * 选择用于映射纹理的UV属性通道
     * 几何体可以有多套UV坐标，此属性指定使用哪一套
     *
     * 通道对应关系：
     * - 0: 使用 'uv' 属性（默认）
     * - 1: 使用 'uv1' 属性
     * - 2: 使用 'uv2' 属性
     * - 3: 使用 'uv3' 属性
     *
     * 使用场景：
     * - 多重纹理：不同纹理使用不同的UV通道
     * - 光照贴图：通常使用第二套UV坐标
     * - 细节纹理：使用额外的UV通道添加细节
     *
     * @type {number}
     * @default 0
     */
    this.channel = 0;

    // ===== 包装模式 =====

    /**
     * 水平方向包装模式
     *
     * 定义纹理在水平方向（U轴）的包装行为
     * 控制当纹理坐标超出[0,1]范围时的处理方式
     *
     * 包装模式选项：
     * - RepeatWrapping: 重复包装，纹理会重复平铺
     * - ClampToEdgeWrapping: 边缘夹紧，使用边缘像素扩展（默认）
     * - MirroredRepeatWrapping: 镜像重复，纹理会镜像重复
     *
     * 使用场景：
     * - RepeatWrapping: 地板、墙壁等需要平铺的纹理
     * - ClampToEdgeWrapping: 避免边缘伪影，适合单次使用的纹理
     * - MirroredRepeatWrapping: 创造无缝的镜像效果
     *
     * @type {(RepeatWrapping|ClampToEdgeWrapping|MirroredRepeatWrapping)}
     * @default ClampToEdgeWrapping
     */
    this.wrapS = wrapS;

    /**
     * 垂直方向包装模式
     *
     * 定义纹理在垂直方向（V轴）的包装行为
     * 控制当纹理坐标超出[0,1]范围时的处理方式
     *
     * 包装模式选项：
     * - RepeatWrapping: 重复包装，纹理会重复平铺
     * - ClampToEdgeWrapping: 边缘夹紧，使用边缘像素扩展（默认）
     * - MirroredRepeatWrapping: 镜像重复，纹理会镜像重复
     *
     * 通常与wrapS设置相同的值以保持一致的包装行为
     *
     * @type {(RepeatWrapping|ClampToEdgeWrapping|MirroredRepeatWrapping)}
     * @default ClampToEdgeWrapping
     */
    this.wrapT = wrapT;

    // ===== 过滤和采样 =====

    /**
     * 放大过滤器
     *
     * 定义当纹素（texel）覆盖多个像素时的纹理采样方式
     * 即当纹理被放大显示时使用的过滤算法
     *
     * 过滤器选项：
     * - NearestFilter: 最近邻过滤，保持像素化效果
     * - LinearFilter: 线性过滤，提供平滑效果（默认）
     * - 注意：放大过滤器不支持Mipmap相关的过滤器
     *
     * 选择建议：
     * - NearestFilter: 像素艺术、复古游戏风格
     * - LinearFilter: 大多数情况下的最佳选择
     *
     * @type {(NearestFilter|LinearFilter)}
     * @default LinearFilter
     */
    this.magFilter = magFilter;

    /**
     * 缩小过滤器
     *
     * 定义当纹素（texel）覆盖少于一个像素时的纹理采样方式
     * 即当纹理被缩小显示时使用的过滤算法
     *
     * 过滤器选项：
     * - NearestFilter: 最近邻过滤
     * - LinearFilter: 线性过滤
     * - NearestMipmapNearestFilter: 最近邻Mipmap + 最近邻过滤
     * - LinearMipmapNearestFilter: 最近邻Mipmap + 线性过滤
     * - NearestMipmapLinearFilter: 线性Mipmap + 最近邻过滤
     * - LinearMipmapLinearFilter: 线性Mipmap + 线性过滤（默认）
     *
     * 性能和质量权衡：
     * - Nearest: 性能最好，质量最低
     * - Linear: 性能中等，质量中等
     * - Mipmap: 质量最好，性能开销较大
     *
     * @type {(NearestFilter|LinearFilter|NearestMipmapNearestFilter|LinearMipmapNearestFilter|NearestMipmapLinearFilter|LinearMipmapLinearFilter)}
     * @default LinearMipmapLinearFilter
     */
    this.minFilter = minFilter;

    /**
     * 各向异性过滤级别
     *
     * 沿着具有最高纹素密度的像素轴采样的数量
     * 默认值为1，更高的值在倾斜角度观看时提供更清晰的结果
     * 但会消耗更多的纹理采样
     *
     * 各向异性过滤的作用：
     * - 改善倾斜表面的纹理质量
     * - 减少远距离纹理的模糊
     * - 提高纹理细节的可见性
     *
     * 取值范围：
     * - 1: 禁用各向异性过滤（默认）
     * - 2-16: 各向异性过滤级别，值越大质量越好但性能开销越大
     *
     * 注意：实际支持的最大值取决于GPU硬件
     *
     * @type {number}
     * @default 1
     */
    this.anisotropy = anisotropy;

    // ===== 格式和类型 =====

    /**
     * 纹理格式
     *
     * 定义纹理像素数据的格式，决定每个像素包含哪些颜色分量
     *
     * 常用格式：
     * - RGBAFormat: 红绿蓝透明度，4个分量（默认）
     * - RGBFormat: 红绿蓝，3个分量
     * - RedFormat: 仅红色分量，1个分量
     * - LuminanceFormat: 亮度，1个分量
     * - LuminanceAlphaFormat: 亮度+透明度，2个分量
     * - DepthFormat: 深度信息
     * - DepthStencilFormat: 深度+模板信息
     *
     * 选择建议：
     * - RGBA: 需要透明度的纹理
     * - RGB: 不需要透明度，节省内存
     * - Red: 单通道数据（如高度图、遮罩）
     *
     * @type {number}
     * @default RGBAFormat
     */
    this.format = format;

    /**
     * 内部格式
     *
     * 定义纹理数据在GPU上的存储格式
     * 默认内部格式由format和type属性自动推导
     * 此属性允许覆盖默认格式以实现特殊需求
     *
     * 使用场景：
     * - 高精度纹理：使用浮点格式
     * - 压缩纹理：使用特定的压缩格式
     * - 特殊用途：如sRGB格式
     *
     * 注意：
     * - 大多数情况下保持null即可
     * - 修改此属性需要了解GPU格式支持
     * - 错误的格式可能导致渲染问题
     *
     * @type {?string}
     * @default null
     */
    this.internalFormat = null;

    /**
     * 纹理数据类型
     *
     * 定义纹理像素数据的数据类型，决定每个分量的存储方式
     *
     * 常用类型：
     * - UnsignedByteType: 无符号字节，0-255范围（默认）
     * - FloatType: 32位浮点数，支持HDR
     * - HalfFloatType: 16位浮点数，HDR的内存优化版本
     * - UnsignedShortType: 无符号短整型，0-65535范围
     * - ByteType: 有符号字节，-128到127范围
     *
     * 选择建议：
     * - UnsignedByteType: 标准LDR纹理
     * - FloatType: HDR纹理、数据纹理
     * - HalfFloatType: HDR纹理的内存优化版本
     *
     * @type {number}
     * @default UnsignedByteType
     */
    this.type = type;

    // ===== 纹理变换 =====

    /**
     * 纹理偏移量
     *
     * 定义纹理单次重复相对于起始位置的偏移量
     * 在U和V方向上分别设置偏移，典型范围是0.0到1.0
     *
     * 偏移的作用：
     * - 调整纹理在表面上的起始位置
     * - 创建纹理动画效果（如流水、传送带）
     * - 精确对齐纹理特征
     *
     * 坐标系统：
     * - x分量：U方向偏移（水平）
     * - y分量：V方向偏移（垂直）
     * - 0.5的偏移相当于移动半个纹理单位
     *
     * @type {Vector2}
     * @default (0,0)
     */
    this.offset = new Vector2(0, 0);

    /**
     * 纹理重复次数
     *
     * 定义纹理在表面上的重复次数，在U和V方向上分别设置
     * 如果重复次数大于1，对应的包装参数应设置为RepeatWrapping或MirroredRepeatWrapping
     *
     * 重复的效果：
     * - 1: 纹理覆盖整个表面一次（默认）
     * - >1: 纹理重复多次，创建平铺效果
     * - <1: 纹理被拉伸，覆盖表面的一部分
     *
     * 使用场景：
     * - 地板、墙壁等需要平铺的纹理
     * - 创建密集的纹理图案
     * - 调整纹理的视觉密度
     *
     * 注意：需要配合适当的包装模式使用
     *
     * @type {Vector2}
     * @default (1,1)
     */
    this.repeat = new Vector2(1, 1);

    /**
     * 旋转中心点
     *
     * 定义纹理旋转的中心点，使用纹理坐标系
     * (0.5, 0.5)对应纹理的中心，(0, 0)对应左下角（默认）
     *
     * 中心点的选择：
     * - (0, 0): 左下角，纹理围绕角落旋转
     * - (0.5, 0.5): 中心点，纹理围绕中心旋转（常用）
     * - (1, 1): 右上角，纹理围绕对角旋转
     *
     * 使用场景：
     * - 创建旋转动画效果
     * - 调整纹理的方向
     * - 实现特殊的视觉效果
     *
     * @type {Vector2}
     * @default (0,0)
     */
    this.center = new Vector2(0, 0);

    /**
     * 纹理旋转角度
     *
     * 定义纹理围绕中心点的旋转角度，以弧度为单位
     * 正值表示逆时针旋转，负值表示顺时针旋转
     *
     * 角度转换：
     * - 90度 = Math.PI / 2 弧度
     * - 180度 = Math.PI 弧度
     * - 360度 = 2 * Math.PI 弧度
     *
     * 使用场景：
     * - 调整纹理方向以匹配几何体
     * - 创建旋转动画效果
     * - 修正纹理的朝向
     *
     * @type {number}
     * @default 0
     */
    this.rotation = 0;

    /**
     * 自动更新变换矩阵
     *
     * 是否根据offset、repeat、rotation和center属性自动更新纹理的UV变换矩阵
     * 如果直接指定UV变换矩阵，应将此属性设置为false
     *
     * 自动更新的优势：
     * - 简化纹理变换的使用
     * - 自动处理矩阵计算
     * - 保持属性与矩阵的同步
     *
     * 手动控制的场景：
     * - 复杂的自定义变换
     * - 性能优化（避免重复计算）
     * - 精确的矩阵控制
     *
     * @type {boolean}
     * @default true
     */
    this.matrixAutoUpdate = true;

    /**
     * UV变换矩阵
     *
     * 纹理的UV变换矩阵，用于实现复杂的纹理坐标变换
     * 当matrixAutoUpdate为true时，此矩阵会根据其他变换属性自动计算
     *
     * 矩阵变换的作用：
     * - 平移：改变纹理位置
     * - 缩放：改变纹理大小
     * - 旋转：改变纹理方向
     * - 剪切：创建倾斜效果
     *
     * 手动设置矩阵时，需要将matrixAutoUpdate设置为false
     *
     * @type {Matrix3}
     */
    this.matrix = new Matrix3();

    // ===== 渲染选项 =====

    /**
     * 是否生成多级渐远纹理（Mipmaps）
     *
     * 控制是否为纹理自动生成Mipmaps（如果可能）
     * 如果手动创建Mipmaps，应将此属性设置为false
     *
     * Mipmaps的优势：
     * - 提高远距离观看时的渲染质量
     * - 减少纹理走样（aliasing）
     * - 优化GPU采样性能
     * - 减少摩尔纹等视觉伪影
     *
     * 禁用Mipmaps的场景：
     * - 手动提供Mipmaps数据
     * - 像素精确的纹理（如UI元素）
     * - 特殊用途的纹理（如数据纹理）
     * - 内存受限的环境
     *
     * @type {boolean}
     * @default true
     */
    this.generateMipmaps = true;

    /**
     * 预乘透明度
     *
     * 如果设置为true，在纹理上传到GPU时，透明度通道（如果存在）会被乘入颜色通道
     * 这是一种常见的透明度处理方式，可以提高混合效果的质量
     *
     * 预乘透明度的优势：
     * - 改善透明物体的混合效果
     * - 减少透明边缘的伪影
     * - 提高半透明效果的质量
     * - 符合现代图形管线的标准
     *
     * 注意事项：
     * - 对ImageBitmap无效，需要在位图创建时配置
     * - 可能影响纹理的颜色表现
     * - 需要与材质的混合模式配合使用
     *
     * @type {boolean}
     * @default false
     */
    this.premultiplyAlpha = false;

    /**
     * 垂直翻转
     *
     * 如果设置为true，纹理在上传到GPU时会沿垂直轴翻转
     * 这是因为图像文件的坐标系（左上角为原点）与OpenGL坐标系（左下角为原点）不同
     *
     * 翻转的必要性：
     * - 大多数图像格式使用左上角为原点
     * - OpenGL使用左下角为原点
     * - 翻转确保图像正确显示
     *
     * 特殊情况：
     * - 对ImageBitmap无效，需要在位图创建时配置翻转
     * - 某些纹理类型（如数据纹理）可能不需要翻转
     * - 立方体纹理通常不翻转以保持面的正确方向
     *
     * @type {boolean}
     * @default true
     */
    this.flipY = true;

    /**
     * 像素行内存对齐
     *
     * 指定内存中每个像素行起始位置的对齐要求
     * 这是一个GPU性能优化参数，影响纹理数据的内存布局
     *
     * 允许的对齐值：
     * - 1: 字节对齐，无填充
     * - 2: 偶数字节对齐
     * - 4: 字（word）对齐（默认）
     * - 8: 双字（double-word）对齐
     *
     * 对齐的影响：
     * - 更高的对齐值可能提高GPU访问性能
     * - 但可能增加内存使用（由于填充字节）
     * - 4字节对齐是大多数情况下的最佳选择
     *
     * 参考：OpenGL ES glPixelStorei 文档
     *
     * @type {number}
     * @default 4
     */
    this.unpackAlignment = 4; // valid values: 1, 2, 4, 8 (see http://www.khronos.org/opengles/sdk/docs/man/xhtml/glPixelStorei.xml)

    // ===== 颜色空间和用户数据 =====

    /**
     * 颜色空间
     *
     * 定义纹理颜色数据的颜色空间，影响颜色的解释和渲染
     * 包含颜色数据的纹理应该标注为SRGBColorSpace或LinearSRGBColorSpace
     *
     * 颜色空间类型：
     * - NoColorSpace: 无颜色空间（默认）
     * - SRGBColorSpace: sRGB颜色空间，适合大多数图像
     * - LinearSRGBColorSpace: 线性sRGB颜色空间
     * - DisplayP3ColorSpace: Display P3颜色空间
     *
     * 选择建议：
     * - 普通图像：SRGBColorSpace
     * - HDR图像：LinearSRGBColorSpace
     * - 数据纹理：NoColorSpace
     * - 法线贴图：NoColorSpace
     *
     * @type {string}
     * @default NoColorSpace
     */
    this.colorSpace = colorSpace;

    /**
     * 用户自定义数据
     *
     * 可用于存储关于纹理的自定义数据的对象
     * 不应包含函数引用，因为这些不会被克隆
     *
     * 使用场景：
     * - 存储纹理的元数据
     * - 应用程序特定的标识信息
     * - 调试和分析数据
     * - 序列化时的额外信息
     *
     * 注意事项：
     * - 避免存储函数引用
     * - 保持数据结构简单
     * - 考虑序列化兼容性
     *
     * @type {Object}
     */
    this.userData = {};

    // ===== 更新和版本控制 =====

    /**
     * 更新范围数组
     *
     * 用于仅更新纹理的子区域或特定行（例如，仅前3行）
     * 使用addUpdateRange()函数向此数组添加范围
     *
     * 部分更新的优势：
     * - 减少GPU数据传输量
     * - 提高动态纹理的更新性能
     * - 支持流式纹理更新
     * - 优化大纹理的局部修改
     *
     * 使用场景：
     * - 动态纹理内容更新
     * - 流式视频纹理
     * - 实时数据可视化
     * - 纹理动画效果
     *
     * @type {Array<Object>}
     */
    this.updateRanges = [];

    /**
     * 版本计数器
     *
     * 从0开始计数，每次needsUpdate设置为true时递增
     * 用于跟踪纹理的更新次数，帮助渲染系统判断是否需要重新上传数据
     *
     * 版本控制的作用：
     * - 缓存失效：版本变化时使相关缓存失效
     * - 更新检测：比较版本号判断纹理是否已更新
     * - 调试辅助：跟踪纹理更新的频率
     * - 性能分析：监控纹理更新的开销
     *
     * @type {number}
     * @readonly
     * @default 0
     */
    this.version = 0;

    /**
     * 更新回调函数
     *
     * 当纹理更新时调用的回调函数（例如，当needsUpdate设置为true并且纹理被使用时）
     * 可用于执行自定义的更新逻辑或通知其他系统
     *
     * 回调时机：
     * - needsUpdate设置为true后
     * - 纹理实际被渲染器使用时
     * - GPU上传完成后
     *
     * 使用场景：
     * - 更新统计信息
     * - 触发相关系统的更新
     * - 调试和性能监控
     * - 自定义的纹理管理逻辑
     *
     * @type {?Function}
     * @default null
     */
    this.onUpdate = null;

    // ===== 渲染目标相关属性 =====

    /**
     * 渲染目标的可选反向引用
     *
     * 指向拥有此纹理的渲染目标的可选引用
     * 当纹理属于渲染目标时，此属性提供反向链接以便访问渲染目标
     *
     * 反向引用的用途：
     * - 访问渲染目标的属性和方法
     * - 管理纹理与渲染目标的关系
     * - 调试和诊断渲染管线
     * - 优化渲染目标的生命周期管理
     *
     * 使用场景：
     * - 帧缓冲纹理：链接到对应的帧缓冲对象
     * - 后处理管线：跟踪渲染目标链
     * - 资源管理：统一管理相关资源
     *
     * @type {?(RenderTarget|WebGLRenderTarget)}
     * @default null
     */
    this.renderTarget = null;

    /**
     * 渲染目标纹理标识
     *
     * 指示纹理是否属于渲染目标
     * 渲染目标纹理有特殊的处理逻辑和优化
     *
     * 渲染目标纹理的特点：
     * - 作为渲染的输出目标
     * - 可能需要特殊的格式和设置
     * - 通常不需要Mipmap生成
     * - 可能有特殊的内存管理需求
     *
     * 影响的行为：
     * - 渲染器的处理方式
     * - 内存分配策略
     * - 纹理参数的默认值
     * - 性能优化的应用
     *
     * @type {boolean}
     * @readonly
     * @default false
     */
    this.isRenderTargetTexture = false;

    /**
     * 纹理数组标识
     *
     * 指示纹理是否应该作为纹理数组处理
     * 纹理数组是包含多个2D纹理层的3D纹理结构
     *
     * 纹理数组的特点：
     * - 包含多个相同尺寸的2D纹理
     * - 在着色器中可以通过索引访问不同层
     * - 提高批处理渲染的效率
     * - 减少纹理切换的开销
     *
     * 判断条件：
     * - 图像对象存在且有深度属性
     * - 深度大于1表示多层纹理
     *
     * 使用场景：
     * - 精灵图集：多个精灵存储在不同层
     * - 动画序列：每一帧存储在不同层
     * - 材质变体：同一物体的不同材质
     *
     * @type {boolean}
     * @readonly
     * @default false
     */
    this.isArrayTexture = image && image.depth && image.depth > 1 ? true : false;

    /**
     * PMREM版本号
     *
     * 指示纹理是否应该由PMREMGenerator处理
     * 仅对渲染目标纹理相关，用于环境贴图的预过滤
     *
     * PMREM（Pre-filtered Mipmap Radiance Environment Map）：
     * - 预过滤的Mipmap辐射环境贴图
     * - 用于基于图像的光照（IBL）
     * - 提供高质量的环境反射效果
     * - 优化实时渲染的性能
     *
     * 版本控制的作用：
     * - 跟踪PMREM数据的更新状态
     * - 触发重新生成预过滤数据
     * - 优化不必要的重复计算
     * - 确保环境光照的正确性
     *
     * 使用场景：
     * - 环境贴图：天空盒和环境反射
     * - PBR材质：基于物理的渲染
     * - 全局光照：环境光照计算
     *
     * @type {number}
     * @readonly
     * @default 0
     */
    this.pmremVersion = 0;
  }

  // ===== 纹理尺寸访问器 =====

  /**
   * 纹理宽度（像素）
   *
   * 获取纹理的宽度，以像素为单位
   * 通过数据源获取实际的图像宽度
   *
   * 宽度的来源：
   * - 图像文件：原始图像的宽度
   * - 画布元素：画布的宽度
   * - 视频元素：视频的宽度
   * - 数据纹理：指定的宽度
   *
   * 使用场景：
   * - 纹理坐标计算
   * - 渲染目标尺寸设置
   * - 性能分析和优化
   * - UI布局计算
   *
   * @type {number}
   * @readonly
   */
  get width() {
    return this.source.getSize(_tempVec3).x;
  }

  /**
   * 纹理高度（像素）
   *
   * 获取纹理的高度，以像素为单位
   * 通过数据源获取实际的图像高度
   *
   * 高度的来源：
   * - 图像文件：原始图像的高度
   * - 画布元素：画布的高度
   * - 视频元素：视频的高度
   * - 数据纹理：指定的高度
   *
   * 使用场景：
   * - 纹理坐标计算
   * - 渲染目标尺寸设置
   * - 宽高比计算
   * - 内存使用估算
   *
   * @type {number}
   * @readonly
   */
  get height() {
    return this.source.getSize(_tempVec3).y;
  }

  /**
   * 纹理深度（像素）
   *
   * 获取纹理的深度，以像素为单位
   * 主要用于3D纹理和纹理数组
   *
   * 深度的含义：
   * - 3D纹理：Z轴的像素数量
   * - 纹理数组：数组中的层数
   * - 2D纹理：通常为1
   * - 立方体纹理：通常为6（6个面）
   *
   * 使用场景：
   * - 3D纹理采样
   * - 纹理数组索引
   * - 体积渲染
   * - 内存使用计算
   *
   * @type {number}
   * @readonly
   */
  get depth() {
    return this.source.getSize(_tempVec3).z;
  }

  // ===== 图像数据访问器 =====

  /**
   * 图像数据对象
   *
   * 获取或设置包含纹理数据的图像对象
   * 这是纹理的实际数据源
   *
   * 支持的图像类型：
   * - HTMLImageElement：图像文件
   * - HTMLCanvasElement：画布元素
   * - HTMLVideoElement：视频元素
   * - ImageData：像素数据
   * - TypedArray：原始数据数组
   * - ImageBitmap：位图对象
   *
   * 获取器的作用：
   * - 访问当前的图像数据
   * - 检查数据源的类型和状态
   * - 进行数据验证和处理
   *
   * @type {?Object}
   */
  get image() {
    return this.source.data;
  }

  /**
   * 设置图像数据
   *
   * 设置新的图像数据源，更新纹理内容
   * 设置新图像后需要标记纹理需要更新
   *
   * 设置器的功能：
   * - 更新纹理的数据源
   * - 触发相关的验证和处理
   * - 保持数据源的一致性
   *
   * 注意事项：
   * - 设置后需要调用needsUpdate = true
   * - 新图像的尺寸可能影响渲染
   * - 格式变化可能需要重新配置
   *
   * @param {?Object} value - 新的图像数据对象，null表示清空
   */
  set image(value = null) {
    this.source.data = value;
  }

  // ===== 纹理变换和更新方法 =====

  /**
   * 更新纹理变换矩阵
   *
   * 根据offset、repeat、rotation和center属性更新纹理变换矩阵
   * 此方法将纹理的变换属性转换为可用于GPU的矩阵形式
   *
   * 变换矩阵的作用：
   * - 将纹理变换属性合并为单一矩阵
   * - 提高GPU处理效率
   * - 支持复杂的纹理变换组合
   * - 确保变换的正确顺序
   *
   * 变换顺序：
   * 1. 平移到旋转中心
   * 2. 应用缩放（repeat）
   * 3. 应用旋转
   * 4. 应用偏移
   * 5. 平移回原位置
   *
   * 调用时机：
   * - matrixAutoUpdate为true时自动调用
   * - 手动更新变换属性后
   * - 渲染前的准备阶段
   */
  updateMatrix() {
    this.matrix.setUvTransform(this.offset.x, this.offset.y, this.repeat.x, this.repeat.y, this.rotation, this.center.x, this.center.y);
  }

  /**
   * 添加更新范围
   *
   * 向数据纹理添加需要在GPU上更新的数据范围
   * 用于优化大纹理的部分更新，避免全量数据传输
   *
   * 部分更新的优势：
   * - 减少GPU数据传输量
   * - 提高动态纹理的更新性能
   * - 支持流式纹理更新
   * - 优化带宽使用
   *
   * 使用场景：
   * - 动态纹理内容更新
   * - 流式视频纹理
   * - 实时数据可视化
   * - 纹理动画效果
   *
   * 范围管理：
   * - 多个范围会被合并处理
   * - 重叠范围会被优化
   * - 按顺序处理所有范围
   *
   * @param {number} start - 开始更新的位置（以组件为单位）
   * @param {number} count - 要更新的组件数量
   */
  addUpdateRange(start, count) {
    this.updateRanges.push({ start, count });
  }

  /**
   * 清除更新范围
   *
   * 清除所有待更新的数据范围
   * 通常在完成部分更新后调用，为下次更新做准备
   *
   * 清除的时机：
   * - 完成GPU数据上传后
   * - 重置更新状态时
   * - 切换到全量更新模式时
   * - 纹理重新初始化时
   *
   * 性能考虑：
   * - 及时清除避免累积过多范围
   * - 减少内存使用
   * - 提高下次更新的效率
   */
  clearUpdateRanges() {
    this.updateRanges.length = 0;
  }

  // ===== 纹理复制和克隆方法 =====

  /**
   * 克隆纹理
   *
   * 返回一个包含此实例所有属性副本的新纹理
   * 创建完全独立的纹理实例，但共享相同的数据源
   *
   * 克隆的特点：
   * - 新实例：创建全新的纹理对象
   * - 属性复制：复制所有纹理属性和设置
   * - 数据共享：共享相同的图像数据源（节省内存）
   * - 独立操作：可以独立修改属性而不影响原纹理
   *
   * 使用场景：
   * - 多材质使用：同一图像用于不同材质
   * - 属性变体：相同数据但不同的过滤或变换设置
   * - 备份和恢复：保存纹理状态的副本
   * - 性能优化：避免重复加载相同的图像数据
   *
   * 内存考虑：
   * - 图像数据共享，节省内存
   * - 属性独立存储
   * - GPU纹理可能需要重新上传
   *
   * @return {Texture} 此实例的克隆
   */
  clone() {
    return new this.constructor().copy(this);
  }

  /**
   * 复制纹理属性
   *
   * 将给定纹理的所有属性值复制到此实例
   * 这是一个深度复制操作，确保所有属性都被正确复制
   *
   * 复制的属性包括：
   * - 基础属性：名称、数据源、Mipmaps
   * - 映射属性：映射方式、通道选择
   * - 包装属性：水平和垂直包装模式
   * - 过滤属性：放大和缩小过滤器、各向异性
   * - 格式属性：纹理格式、内部格式、数据类型
   * - 变换属性：偏移、重复、中心、旋转
   * - 渲染属性：Mipmap生成、预乘透明度、翻转等
   * - 特殊属性：渲染目标、数组纹理标识等
   *
   * 特殊处理：
   * - Vector对象：使用copy方法进行深度复制
   * - Matrix对象：使用copy方法进行深度复制
   * - userData：使用JSON序列化进行深度复制
   * - Mipmaps：使用slice创建数组副本
   *
   * 复制后的状态：
   * - needsUpdate设置为true，触发GPU更新
   * - 所有属性与源纹理保持一致
   * - 返回this引用，支持链式调用
   *
   * @param {Texture} source - 要复制的源纹理
   * @return {Texture} 此实例的引用（支持链式调用）
   */
  copy(source) {
    // 复制基础属性
    this.name = source.name;

    // 复制数据源和Mipmaps
    this.source = source.source;
    this.mipmaps = source.mipmaps.slice(0);

    // 复制映射属性
    this.mapping = source.mapping;
    this.channel = source.channel;

    // 复制包装模式
    this.wrapS = source.wrapS;
    this.wrapT = source.wrapT;

    // 复制过滤设置
    this.magFilter = source.magFilter;
    this.minFilter = source.minFilter;
    this.anisotropy = source.anisotropy;

    // 复制格式和类型
    this.format = source.format;
    this.internalFormat = source.internalFormat;
    this.type = source.type;

    // 复制变换属性（使用深度复制）
    this.offset.copy(source.offset);
    this.repeat.copy(source.repeat);
    this.center.copy(source.center);
    this.rotation = source.rotation;

    // 复制矩阵相关属性
    this.matrixAutoUpdate = source.matrixAutoUpdate;
    this.matrix.copy(source.matrix);

    // 复制渲染选项
    this.generateMipmaps = source.generateMipmaps;
    this.premultiplyAlpha = source.premultiplyAlpha;
    this.flipY = source.flipY;
    this.unpackAlignment = source.unpackAlignment;
    this.colorSpace = source.colorSpace;

    // 复制特殊属性
    this.renderTarget = source.renderTarget;
    this.isRenderTargetTexture = source.isRenderTargetTexture;
    this.isArrayTexture = source.isArrayTexture;

    // 深度复制用户数据
    this.userData = JSON.parse(JSON.stringify(source.userData));

    // 标记需要更新
    this.needsUpdate = true;

    return this;
  }

  /**
   * 批量设置纹理属性
   *
   * 根据提供的值对象批量设置纹理的属性
   * 这是一个便捷方法，用于一次性配置多个纹理参数
   *
   * 设置过程：
   * 1. 遍历values对象的所有属性
   * 2. 验证新值和当前值的有效性
   * 3. 根据值类型选择合适的设置方式
   * 4. 对特殊对象类型使用深度复制
   *
   * 支持的值类型：
   * - 基础类型：直接赋值（number、string、boolean等）
   * - Vector2对象：使用copy方法进行深度复制
   * - Vector3对象：使用copy方法进行深度复制
   * - Matrix3对象：使用copy方法进行深度复制
   *
   * 错误处理：
   * - undefined值：发出警告并跳过
   * - 不存在的属性：发出警告并跳过
   * - 类型不匹配：尝试直接赋值
   *
   * 使用示例：
   * ```js
   * texture.setValues({
   *   wrapS: THREE.RepeatWrapping,
   *   wrapT: THREE.RepeatWrapping,
   *   repeat: new THREE.Vector2(2, 2),
   *   offset: new THREE.Vector2(0.5, 0.5),
   *   magFilter: THREE.LinearFilter,
   *   minFilter: THREE.LinearMipmapLinearFilter
   * });
   * ```
   *
   * 优势：
   * - 批量操作：一次设置多个属性
   * - 类型安全：自动处理不同的值类型
   * - 错误检查：提供详细的错误信息
   * - 深度复制：正确处理对象类型的属性
   *
   * @param {Object} values - 包含纹理参数的容器对象
   */
  setValues(values) {
    // 遍历所有提供的属性
    for (const key in values) {
      const newValue = values[key];

      // 检查新值是否有效
      if (newValue === undefined) {
        console.warn(`THREE.Texture.setValues(): parameter '${key}' has value of undefined.`);
        continue;
      }

      // 获取当前属性值
      const currentValue = this[key];

      // 检查属性是否存在
      if (currentValue === undefined) {
        console.warn(`THREE.Texture.setValues(): property '${key}' does not exist.`);
        continue;
      }

      // 根据值类型选择设置方式
      if (currentValue && newValue && currentValue.isVector2 && newValue.isVector2) {
        // Vector2对象：使用copy方法进行深度复制
        currentValue.copy(newValue);
      } else if (currentValue && newValue && currentValue.isVector3 && newValue.isVector3) {
        // Vector3对象：使用copy方法进行深度复制
        currentValue.copy(newValue);
      } else if (currentValue && newValue && currentValue.isMatrix3 && newValue.isMatrix3) {
        // Matrix3对象：使用copy方法进行深度复制
        currentValue.copy(newValue);
      } else {
        // 基础类型：直接赋值
        this[key] = newValue;
      }
    }
  }

  /**
   * 序列化纹理为JSON
   *
   * 将纹理对象序列化为JSON格式，用于保存、传输或重建纹理
   * 支持完整的纹理状态保存和引用管理
   *
   * 序列化的内容：
   * - 元数据：版本、类型、生成器信息
   * - 基础属性：UUID、名称
   * - 数据源：图像数据的引用
   * - 映射属性：映射方式、通道选择
   * - 变换属性：重复、偏移、中心、旋转
   * - 包装属性：水平和垂直包装模式
   * - 格式属性：纹理格式、内部格式、数据类型、颜色空间
   * - 过滤属性：过滤器设置、各向异性级别
   * - 渲染选项：翻转、Mipmap生成、预乘透明度等
   * - 用户数据：自定义数据（如果存在）
   *
   * 引用管理：
   * - 检查是否已序列化：避免重复序列化相同对象
   * - 缓存序列化结果：提高性能和一致性
   * - 处理循环引用：防止无限递归
   *
   * 使用场景：
   * - 场景保存：将整个场景序列化为文件
   * - 网络传输：在客户端和服务器间传输纹理数据
   * - 缓存系统：缓存纹理配置以提高加载速度
   * - 调试工具：导出纹理状态用于分析
   *
   * 兼容性：
   * - 版本信息：确保序列化格式的兼容性
   * - 标准格式：使用Three.js标准的JSON格式
   * - 加载器支持：与ObjectLoader配合使用
   *
   * @param {?(Object|string)} meta - 包含序列化元信息的可选值
   *                                 用于管理引用和避免重复序列化
   * @return {Object} 表示序列化纹理的JSON对象
   * @see {@link ObjectLoader#parse} - 对应的解析方法
   */
  toJSON(meta) {
    // 判断是否为根对象（没有元信息或元信息为字符串）
    const isRootObject = meta === undefined || typeof meta === "string";

    // 检查是否已经序列化过此纹理，避免重复序列化
    if (!isRootObject && meta.textures[this.uuid] !== undefined) {
      return meta.textures[this.uuid];
    }

    // 构建序列化输出对象
    const output = {
      // 元数据信息
      metadata: {
        version: 4.7, // Three.js版本
        type: "Texture", // 对象类型
        generator: "Texture.toJSON", // 生成器标识
      },

      // 基础标识
      uuid: this.uuid, // 唯一标识符
      name: this.name, // 纹理名称

      // 数据源引用
      image: this.source.toJSON(meta).uuid, // 图像数据的UUID引用

      // 映射属性
      mapping: this.mapping, // 映射方式
      channel: this.channel, // UV通道选择

      // 变换属性（转换为数组格式）
      repeat: [this.repeat.x, this.repeat.y], // 重复次数
      offset: [this.offset.x, this.offset.y], // 偏移量
      center: [this.center.x, this.center.y], // 旋转中心
      rotation: this.rotation, // 旋转角度

      // 包装模式（合并为数组）
      wrap: [this.wrapS, this.wrapT], // 水平和垂直包装

      // 格式和类型
      format: this.format, // 纹理格式
      internalFormat: this.internalFormat, // 内部格式
      type: this.type, // 数据类型
      colorSpace: this.colorSpace, // 颜色空间

      // 过滤设置
      minFilter: this.minFilter, // 缩小过滤器
      magFilter: this.magFilter, // 放大过滤器
      anisotropy: this.anisotropy, // 各向异性级别

      // 渲染选项
      flipY: this.flipY, // 垂直翻转

      // 生成选项
      generateMipmaps: this.generateMipmaps, // Mipmap生成
      premultiplyAlpha: this.premultiplyAlpha, // 预乘透明度
      unpackAlignment: this.unpackAlignment, // 像素对齐
    };

    // 添加用户数据（如果存在）
    if (Object.keys(this.userData).length > 0) output.userData = this.userData;

    // 如果不是根对象，将结果缓存到元信息中
    if (!isRootObject) {
      meta.textures[this.uuid] = output;
    }

    return output;
  }

  // ===== 资源管理和工具方法 =====

  /**
   * 释放GPU相关资源
   *
   * 释放此实例分配的GPU相关资源
   * 当应用程序中不再使用此实例时应调用此方法
   *
   * 释放的资源：
   * - GPU纹理内存：释放显存中的纹理数据
   * - 渲染状态：清理相关的渲染状态
   * - 事件监听：移除相关的事件监听器
   * - 缓存数据：清理内部缓存
   *
   * 调用时机：
   * - 纹理不再需要时
   * - 场景清理时
   * - 内存优化时
   * - 应用程序关闭时
   *
   * 重要性：
   * - 防止内存泄漏：及时释放GPU内存
   * - 提高性能：减少不必要的资源占用
   * - 系统稳定性：避免资源耗尽
   * - 移动设备优化：在资源受限的环境中尤为重要
   *
   * 注意事项：
   * - 调用后纹理不可再使用
   * - 会触发dispose事件
   * - 应确保没有其他对象仍在引用此纹理
   *
   * @fires Texture#dispose - 触发dispose事件
   */
  dispose() {
    /**
     * 纹理销毁事件
     *
     * 当纹理被销毁时触发此事件
     * 其他系统可以监听此事件来执行清理工作
     *
     * @event Texture#dispose
     * @type {Object}
     */
    this.dispatchEvent({ type: "dispose" });
  }

  /**
   * UV坐标变换
   *
   * 使用纹理的UV变换矩阵变换给定的UV向量
   * 应用纹理的所有变换效果，包括偏移、重复、旋转和包装
   *
   * 变换过程：
   * 1. 检查映射类型：仅对UV映射有效
   * 2. 应用变换矩阵：偏移、重复、旋转
   * 3. 处理包装模式：处理超出[0,1]范围的坐标
   * 4. 应用垂直翻转：如果启用flipY
   *
   * 包装模式处理：
   * - RepeatWrapping：重复平铺，使用小数部分
   * - ClampToEdgeWrapping：夹紧到边缘，限制在[0,1]范围
   * - MirroredRepeatWrapping：镜像重复，奇数区间镜像
   *
   * 使用场景：
   * - 自定义着色器：手动计算纹理坐标
   * - 纹理采样：获取正确的采样坐标
   * - 调试工具：验证纹理坐标变换
   * - 特效处理：实现特殊的纹理效果
   *
   * 性能考虑：
   * - 仅在必要时调用
   * - 批量处理多个坐标时考虑优化
   * - 避免在渲染循环中频繁调用
   *
   * @param {Vector2} uv - 要变换的UV向量
   * @return {Vector2} 变换后的UV向量
   */
  transformUv(uv) {
    // 仅对UV映射有效，其他映射类型直接返回
    if (this.mapping !== UVMapping) return uv;

    // 应用变换矩阵（偏移、重复、旋转）
    uv.applyMatrix3(this.matrix);

    // 处理X轴（U轴）的包装
    if (uv.x < 0 || uv.x > 1) {
      switch (this.wrapS) {
        case RepeatWrapping:
          // 重复包装：使用小数部分实现平铺
          uv.x = uv.x - Math.floor(uv.x);
          break;

        case ClampToEdgeWrapping:
          // 边缘夹紧：限制在[0,1]范围内
          uv.x = uv.x < 0 ? 0 : 1;
          break;

        case MirroredRepeatWrapping:
          // 镜像重复：奇数区间进行镜像
          if (Math.abs(Math.floor(uv.x) % 2) === 1) {
            uv.x = Math.ceil(uv.x) - uv.x;
          } else {
            uv.x = uv.x - Math.floor(uv.x);
          }
          break;
      }
    }

    // 处理Y轴（V轴）的包装
    if (uv.y < 0 || uv.y > 1) {
      switch (this.wrapT) {
        case RepeatWrapping:
          // 重复包装：使用小数部分实现平铺
          uv.y = uv.y - Math.floor(uv.y);
          break;

        case ClampToEdgeWrapping:
          // 边缘夹紧：限制在[0,1]范围内
          uv.y = uv.y < 0 ? 0 : 1;
          break;

        case MirroredRepeatWrapping:
          // 镜像重复：奇数区间进行镜像
          if (Math.abs(Math.floor(uv.y) % 2) === 1) {
            uv.y = Math.ceil(uv.y) - uv.y;
          } else {
            uv.y = uv.y - Math.floor(uv.y);
          }
          break;
      }
    }

    // 应用垂直翻转（如果启用）
    if (this.flipY) {
      uv.y = 1 - uv.y;
    }

    return uv;
  }

  // ===== 更新控制属性 =====

  /**
   * 纹理更新标志
   *
   * 将此属性设置为true表示引擎在下次渲染时必须更新纹理
   * 这会触发纹理上传到GPU并确保正确的纹理参数配置
   *
   * 更新触发的操作：
   * - 版本号递增：用于跟踪更新次数
   * - 数据源更新：标记数据源需要更新
   * - GPU上传：在下次渲染时上传新数据到GPU
   * - 参数配置：更新GPU纹理参数
   *
   * 需要更新的情况：
   * - 图像数据变化：新的图像内容
   * - 纹理参数变化：过滤、包装等设置改变
   * - 格式变化：纹理格式或类型改变
   * - 首次使用：纹理第一次被使用
   *
   * 性能考虑：
   * - 仅在必要时设置为true
   * - 避免频繁的不必要更新
   * - 批量更新多个属性后再设置
   * - 考虑更新的GPU开销
   *
   * 自动重置：
   * - 渲染器会在处理后自动重置此标志
   * - 无需手动重置为false
   * - 每次需要更新时都要重新设置为true
   *
   * @type {boolean}
   * @default false
   * @param {boolean} value - 是否需要更新纹理
   */
  set needsUpdate(value) {
    if (value === true) {
      // 递增版本号，用于跟踪更新
      this.version++;
      // 标记数据源需要更新
      this.source.needsUpdate = true;
    }
  }

  /**
   * PMREM更新标志
   *
   * 将此属性设置为true表示引擎必须重新生成PMREM
   * PMREM（Pre-filtered Mipmap Radiance Environment Map）用于基于图像的光照
   *
   * PMREM的作用：
   * - 环境光照：提供高质量的环境反射
   * - 性能优化：预计算环境光照数据
   * - 视觉质量：改善PBR材质的渲染效果
   * - 实时渲染：支持实时的环境光照
   *
   * 需要重新生成的情况：
   * - 环境贴图内容变化
   * - 光照参数调整
   * - 质量设置改变
   * - 首次使用环境贴图
   *
   * 性能影响：
   * - PMREM生成是计算密集型操作
   * - 仅在必要时触发重新生成
   * - 考虑在适当的时机进行更新
   * - 可能影响帧率，建议异步处理
   *
   * 使用场景：
   * - 环境贴图：天空盒和环境反射
   * - PBR渲染：基于物理的材质
   * - 全局光照：环境光照计算
   * - 实时光照：动态环境光照
   *
   * @type {boolean}
   * @default false
   * @param {boolean} value - 是否需要重新生成PMREM
   */
  set needsPMREMUpdate(value) {
    if (value === true) {
      // 递增PMREM版本号，触发重新生成
      this.pmremVersion++;
    }
  }
}

// ===== 静态属性 =====

/**
 * 所有纹理的默认图像
 *
 * 当创建纹理时没有提供图像参数时使用的默认图像
 * 设置为null表示没有默认图像，纹理将使用空的数据源
 *
 * 用途：
 * - 作为纹理构造函数的默认参数
 * - 提供一致的默认行为
 * - 避免未定义的图像引用
 *
 * @static
 * @type {?Image}
 * @default null
 */
Texture.DEFAULT_IMAGE = null;

/**
 * 所有纹理的默认映射方式
 *
 * 当创建纹理时没有指定映射方式时使用的默认映射
 * UVMapping是最常用的映射方式，适用于大多数标准纹理应用
 *
 * 默认映射的特点：
 * - 使用标准的UV坐标系统
 * - 适用于平面和曲面几何体
 * - 支持标准的纹理变换操作
 *
 * @static
 * @type {number}
 * @default UVMapping
 */
Texture.DEFAULT_MAPPING = UVMapping;

/**
 * 所有纹理的默认各向异性过滤级别
 *
 * 当创建纹理时没有指定各向异性过滤级别时使用的默认值
 * 值为1表示禁用各向异性过滤，这是性能和兼容性的平衡选择
 *
 * 默认值的考虑：
 * - 1: 禁用各向异性过滤，最佳兼容性和性能
 * - 更高值需要GPU支持，可能影响性能
 * - 用户可以根据需要手动设置更高的值
 *
 * @static
 * @type {number}
 * @default 1
 */
Texture.DEFAULT_ANISOTROPY = 1;

// ===== 模块导出 =====

/**
 * 导出 Texture 类
 *
 * Texture 类是 Three.js 纹理系统的核心基类
 * 提供了完整的纹理功能，包括数据管理、坐标变换、采样控制等
 * 是所有其他纹理类型的基础，定义了纹理系统的标准接口
 */
export { Texture };
