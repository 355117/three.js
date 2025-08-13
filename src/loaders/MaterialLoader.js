// 导入颜色类，用于处理材质颜色
import { Color } from "../math/Color.js";
// 导入二维向量类，用于处理UV坐标等
import { Vector2 } from "../math/Vector2.js";
// 导入三维向量类，用于处理位置、法线等
import { Vector3 } from "../math/Vector3.js";
// 导入四维向量类，用于处理齐次坐标等
import { Vector4 } from "../math/Vector4.js";
// 导入3x3矩阵类，用于处理变换
import { Matrix3 } from "../math/Matrix3.js";
// 导入4x4矩阵类，用于处理变换
import { Matrix4 } from "../math/Matrix4.js";
// 导入文件加载器，用于加载文件
import { FileLoader } from "./FileLoader.js";
// 导入基础加载器类
import { Loader } from "./Loader.js";
// 导入各种材质类型
import {
  ShadowMaterial, // 阴影材质
  SpriteMaterial, // 精灵材质
  RawShaderMaterial, // 原始着色器材质
  ShaderMaterial, // 着色器材质
  PointsMaterial, // 点材质
  MeshPhysicalMaterial, // 物理网格材质
  MeshStandardMaterial, // 标准网格材质
  MeshPhongMaterial, // Phong网格材质
  MeshToonMaterial, // 卡通网格材质
  MeshNormalMaterial, // 法线网格材质
  MeshLambertMaterial, // Lambert网格材质
  MeshDepthMaterial, // 深度网格材质
  MeshDistanceMaterial, // 距离网格材质
  MeshBasicMaterial, // 基础网格材质
  MeshMatcapMaterial, // Matcap网格材质
  LineDashedMaterial, // 虚线材质
  LineBasicMaterial, // 基础线材质
  Material, // 基础材质类
} from "../materials/Materials.js";

/**
 * 材质加载器类，用于加载材质。文件通过 {@link FileLoader} 内部加载。
 *
 * ```js
 * const loader = new THREE.MaterialLoader();
 * const material = await loader.loadAsync( 'material.json' );
 * ```
 * 此加载器不支持节点材质。请使用 {@link NodeMaterialLoader} 代替。
 *
 * @augments Loader
 */
class MaterialLoader extends Loader {
  /**
   * 构造一个新的材质加载器。
   *
   * @param {LoadingManager} [manager] - 加载管理器。
   */
  constructor(manager) {
    // 调用父类构造函数
    super(manager);

    /**
     * 存储材质使用的纹理的字典。
     *
     * @type {Object<string,Texture>}
     */
    this.textures = {};
  }

  /**
   * 从给定的URL开始加载，并将加载的材质传递给 `onLoad()` 回调函数。
   *
   * @param {string} url - 要加载的文件的路径/URL。这也可以是数据URI。
   * @param {function(Material)} onLoad - 加载过程完成时执行的回调函数。
   * @param {onProgressCallback} onProgress - 加载过程中执行的进度回调函数。
   * @param {onErrorCallback} onError - 发生错误时执行的错误回调函数。
   */
  load(url, onLoad, onProgress, onError) {
    // 保存当前作用域的引用
    const scope = this;

    // 创建文件加载器实例
    const loader = new FileLoader(scope.manager);
    // 设置加载路径
    loader.setPath(scope.path);
    // 设置请求头
    loader.setRequestHeader(scope.requestHeader);
    // 设置是否携带凭证
    loader.setWithCredentials(scope.withCredentials);
    // 开始加载文件
    loader.load(
      url,
      function (text) {
        try {
          // 解析JSON文本并创建材质，然后调用成功回调
          onLoad(scope.parse(JSON.parse(text)));
        } catch (e) {
          // 处理解析错误
          if (onError) {
            // 如果提供了错误回调，则调用它
            onError(e);
          } else {
            // 否则输出错误到控制台
            console.error(e);
          }

          // 通知管理器加载项出错
          scope.manager.itemError(url);
        }
      },
      onProgress,
      onError
    );
  }

  /**
   * 解析给定的JSON对象并返回材质。
   *
   * @param {Object} json - 序列化的材质数据。
   * @return {Material} 解析后的材质。
   */
  parse(json) {
    // 获取纹理字典的引用
    const textures = this.textures;

    // 内部函数：根据名称获取纹理
    function getTexture(name) {
      // 检查纹理是否存在
      if (textures[name] === undefined) {
        console.warn("THREE.MaterialLoader: Undefined texture", name);
      }

      return textures[name];
    }

    // 根据类型创建材质实例
    const material = this.createMaterialFromType(json.type);

    // 设置材质的基本属性
    if (json.uuid !== undefined) material.uuid = json.uuid; // 设置UUID
    if (json.name !== undefined) material.name = json.name; // 设置名称
    if (json.color !== undefined && material.color !== undefined) material.color.setHex(json.color); // 设置颜色
    if (json.roughness !== undefined) material.roughness = json.roughness; // 设置粗糙度
    if (json.metalness !== undefined) material.metalness = json.metalness; // 设置金属度
    if (json.sheen !== undefined) material.sheen = json.sheen; // 设置光泽度
    if (json.sheenColor !== undefined) material.sheenColor = new Color().setHex(json.sheenColor); // 设置光泽颜色
    if (json.sheenRoughness !== undefined) material.sheenRoughness = json.sheenRoughness; // 设置光泽粗糙度
    if (json.emissive !== undefined && material.emissive !== undefined) material.emissive.setHex(json.emissive); // 设置自发光颜色
    if (json.specular !== undefined && material.specular !== undefined) material.specular.setHex(json.specular); // 设置镜面反射颜色
    if (json.specularIntensity !== undefined) material.specularIntensity = json.specularIntensity; // 设置镜面反射强度
    if (json.specularColor !== undefined && material.specularColor !== undefined) material.specularColor.setHex(json.specularColor); // 设置镜面反射颜色
    if (json.shininess !== undefined) material.shininess = json.shininess; // 设置光泽度
    if (json.clearcoat !== undefined) material.clearcoat = json.clearcoat; // 设置清漆层
    if (json.clearcoatRoughness !== undefined) material.clearcoatRoughness = json.clearcoatRoughness; // 设置清漆层粗糙度
    if (json.dispersion !== undefined) material.dispersion = json.dispersion; // 设置色散
    if (json.iridescence !== undefined) material.iridescence = json.iridescence; // 设置彩虹色
    if (json.iridescenceIOR !== undefined) material.iridescenceIOR = json.iridescenceIOR; // 设置彩虹色折射率
    if (json.iridescenceThicknessRange !== undefined) material.iridescenceThicknessRange = json.iridescenceThicknessRange; // 设置彩虹色厚度范围
    if (json.transmission !== undefined) material.transmission = json.transmission; // 设置透射
    if (json.thickness !== undefined) material.thickness = json.thickness; // 设置厚度
    if (json.attenuationDistance !== undefined) material.attenuationDistance = json.attenuationDistance; // 设置衰减距离
    if (json.attenuationColor !== undefined && material.attenuationColor !== undefined) material.attenuationColor.setHex(json.attenuationColor); // 设置衰减颜色
    if (json.anisotropy !== undefined) material.anisotropy = json.anisotropy; // 设置各向异性
    if (json.anisotropyRotation !== undefined) material.anisotropyRotation = json.anisotropyRotation; // 设置各向异性旋转
    if (json.fog !== undefined) material.fog = json.fog; // 设置是否受雾影响
    if (json.flatShading !== undefined) material.flatShading = json.flatShading; // 设置平面着色
    if (json.blending !== undefined) material.blending = json.blending; // 设置混合模式
    if (json.combine !== undefined) material.combine = json.combine; // 设置组合模式
    if (json.side !== undefined) material.side = json.side; // 设置渲染面
    if (json.shadowSide !== undefined) material.shadowSide = json.shadowSide; // 设置阴影面
    if (json.opacity !== undefined) material.opacity = json.opacity; // 设置不透明度
    if (json.transparent !== undefined) material.transparent = json.transparent; // 设置是否透明
    if (json.alphaTest !== undefined) material.alphaTest = json.alphaTest; // 设置Alpha测试值
    if (json.alphaHash !== undefined) material.alphaHash = json.alphaHash; // 设置Alpha哈希
    if (json.depthFunc !== undefined) material.depthFunc = json.depthFunc; // 设置深度函数
    if (json.depthTest !== undefined) material.depthTest = json.depthTest; // 设置深度测试
    if (json.depthWrite !== undefined) material.depthWrite = json.depthWrite; // 设置深度写入
    if (json.colorWrite !== undefined) material.colorWrite = json.colorWrite; // 设置颜色写入
    if (json.blendSrc !== undefined) material.blendSrc = json.blendSrc; // 设置源混合因子
    if (json.blendDst !== undefined) material.blendDst = json.blendDst; // 设置目标混合因子
    if (json.blendEquation !== undefined) material.blendEquation = json.blendEquation; // 设置混合方程
    if (json.blendSrcAlpha !== undefined) material.blendSrcAlpha = json.blendSrcAlpha; // 设置源Alpha混合因子
    if (json.blendDstAlpha !== undefined) material.blendDstAlpha = json.blendDstAlpha; // 设置目标Alpha混合因子
    if (json.blendEquationAlpha !== undefined) material.blendEquationAlpha = json.blendEquationAlpha; // 设置Alpha混合方程
    if (json.blendColor !== undefined && material.blendColor !== undefined) material.blendColor.setHex(json.blendColor); // 设置混合颜色
    if (json.blendAlpha !== undefined) material.blendAlpha = json.blendAlpha; // 设置混合Alpha
    if (json.stencilWriteMask !== undefined) material.stencilWriteMask = json.stencilWriteMask; // 设置模板写入掩码
    if (json.stencilFunc !== undefined) material.stencilFunc = json.stencilFunc; // 设置模板函数
    if (json.stencilRef !== undefined) material.stencilRef = json.stencilRef; // 设置模板参考值
    if (json.stencilFuncMask !== undefined) material.stencilFuncMask = json.stencilFuncMask; // 设置模板函数掩码
    if (json.stencilFail !== undefined) material.stencilFail = json.stencilFail; // 设置模板失败操作
    if (json.stencilZFail !== undefined) material.stencilZFail = json.stencilZFail; // 设置模板Z失败操作
    if (json.stencilZPass !== undefined) material.stencilZPass = json.stencilZPass; // 设置模板Z通过操作
    if (json.stencilWrite !== undefined) material.stencilWrite = json.stencilWrite; // 设置模板写入

    // 线框相关属性
    if (json.wireframe !== undefined) material.wireframe = json.wireframe; // 设置线框模式
    if (json.wireframeLinewidth !== undefined) material.wireframeLinewidth = json.wireframeLinewidth; // 设置线框线宽
    if (json.wireframeLinecap !== undefined) material.wireframeLinecap = json.wireframeLinecap; // 设置线框线帽
    if (json.wireframeLinejoin !== undefined) material.wireframeLinejoin = json.wireframeLinejoin; // 设置线框线连接

    // 旋转属性
    if (json.rotation !== undefined) material.rotation = json.rotation; // 设置旋转

    // 线条相关属性
    if (json.linewidth !== undefined) material.linewidth = json.linewidth; // 设置线宽
    if (json.dashSize !== undefined) material.dashSize = json.dashSize; // 设置虚线段长度
    if (json.gapSize !== undefined) material.gapSize = json.gapSize; // 设置虚线间隙长度
    if (json.scale !== undefined) material.scale = json.scale; // 设置缩放

    // 多边形偏移相关属性
    if (json.polygonOffset !== undefined) material.polygonOffset = json.polygonOffset; // 设置多边形偏移
    if (json.polygonOffsetFactor !== undefined) material.polygonOffsetFactor = json.polygonOffsetFactor; // 设置多边形偏移因子
    if (json.polygonOffsetUnits !== undefined) material.polygonOffsetUnits = json.polygonOffsetUnits; // 设置多边形偏移单位

    // 抖动
    if (json.dithering !== undefined) material.dithering = json.dithering; // 设置抖动

    // Alpha相关属性
    if (json.alphaToCoverage !== undefined) material.alphaToCoverage = json.alphaToCoverage; // 设置Alpha到覆盖
    if (json.premultipliedAlpha !== undefined) material.premultipliedAlpha = json.premultipliedAlpha; // 设置预乘Alpha
    if (json.forceSinglePass !== undefined) material.forceSinglePass = json.forceSinglePass; // 设置强制单通道

    // 可见性
    if (json.visible !== undefined) material.visible = json.visible; // 设置可见性

    // 色调映射
    if (json.toneMapped !== undefined) material.toneMapped = json.toneMapped; // 设置色调映射

    // 用户数据
    if (json.userData !== undefined) material.userData = json.userData; // 设置用户数据

    // 顶点颜色处理
    if (json.vertexColors !== undefined) {
      if (typeof json.vertexColors === "number") {
        // 如果是数字，转换为布尔值
        material.vertexColors = json.vertexColors > 0 ? true : false;
      } else {
        // 直接赋值
        material.vertexColors = json.vertexColors;
      }
    }

    // 着色器材质相关处理

    // 处理uniform变量
    if (json.uniforms !== undefined) {
      // 遍历所有uniform
      for (const name in json.uniforms) {
        const uniform = json.uniforms[name];

        // 初始化uniform对象
        material.uniforms[name] = {};

        // 根据uniform类型设置值
        switch (uniform.type) {
          case "t": // 纹理类型
            material.uniforms[name].value = getTexture(uniform.value);
            break;

          case "c": // 颜色类型
            material.uniforms[name].value = new Color().setHex(uniform.value);
            break;

          case "v2": // 二维向量类型
            material.uniforms[name].value = new Vector2().fromArray(uniform.value);
            break;

          case "v3": // 三维向量类型
            material.uniforms[name].value = new Vector3().fromArray(uniform.value);
            break;

          case "v4": // 四维向量类型
            material.uniforms[name].value = new Vector4().fromArray(uniform.value);
            break;

          case "m3": // 3x3矩阵类型
            material.uniforms[name].value = new Matrix3().fromArray(uniform.value);
            break;

          case "m4": // 4x4矩阵类型
            material.uniforms[name].value = new Matrix4().fromArray(uniform.value);
            break;

          default: // 其他类型直接赋值
            material.uniforms[name].value = uniform.value;
        }
      }
    }

    // 着色器相关属性
    if (json.defines !== undefined) material.defines = json.defines; // 设置着色器定义
    if (json.vertexShader !== undefined) material.vertexShader = json.vertexShader; // 设置顶点着色器
    if (json.fragmentShader !== undefined) material.fragmentShader = json.fragmentShader; // 设置片段着色器
    if (json.glslVersion !== undefined) material.glslVersion = json.glslVersion; // 设置GLSL版本

    // 扩展处理
    if (json.extensions !== undefined) {
      // 遍历所有扩展
      for (const key in json.extensions) {
        material.extensions[key] = json.extensions[key]; // 设置扩展属性
      }
    }

    // 光照和裁剪
    if (json.lights !== undefined) material.lights = json.lights; // 设置光照
    if (json.clipping !== undefined) material.clipping = json.clipping; // 设置裁剪

    // 点材质相关属性

    if (json.size !== undefined) material.size = json.size; // 设置点大小
    if (json.sizeAttenuation !== undefined) material.sizeAttenuation = json.sizeAttenuation; // 设置点大小衰减

    // 纹理贴图处理

    if (json.map !== undefined) material.map = getTexture(json.map); // 设置主纹理贴图
    if (json.matcap !== undefined) material.matcap = getTexture(json.matcap); // 设置Matcap纹理

    if (json.alphaMap !== undefined) material.alphaMap = getTexture(json.alphaMap); // 设置Alpha贴图

    // 凹凸贴图相关
    if (json.bumpMap !== undefined) material.bumpMap = getTexture(json.bumpMap); // 设置凹凸贴图
    if (json.bumpScale !== undefined) material.bumpScale = json.bumpScale; // 设置凹凸缩放

    // 法线贴图相关
    if (json.normalMap !== undefined) material.normalMap = getTexture(json.normalMap); // 设置法线贴图
    if (json.normalMapType !== undefined) material.normalMapType = json.normalMapType; // 设置法线贴图类型
    if (json.normalScale !== undefined) {
      let normalScale = json.normalScale;

      // 处理法线缩放值
      if (Array.isArray(normalScale) === false) {
        // Blender导出器曾经导出标量值。参见 #7459
        normalScale = [normalScale, normalScale];
      }

      material.normalScale = new Vector2().fromArray(normalScale); // 设置法线缩放
    }

    // 位移贴图相关
    if (json.displacementMap !== undefined) material.displacementMap = getTexture(json.displacementMap); // 设置位移贴图
    if (json.displacementScale !== undefined) material.displacementScale = json.displacementScale; // 设置位移缩放
    if (json.displacementBias !== undefined) material.displacementBias = json.displacementBias; // 设置位移偏移

    // 粗糙度和金属度贴图
    if (json.roughnessMap !== undefined) material.roughnessMap = getTexture(json.roughnessMap); // 设置粗糙度贴图
    if (json.metalnessMap !== undefined) material.metalnessMap = getTexture(json.metalnessMap); // 设置金属度贴图

    // 自发光贴图相关
    if (json.emissiveMap !== undefined) material.emissiveMap = getTexture(json.emissiveMap); // 设置自发光贴图
    if (json.emissiveIntensity !== undefined) material.emissiveIntensity = json.emissiveIntensity; // 设置自发光强度

    // 镜面反射贴图相关
    if (json.specularMap !== undefined) material.specularMap = getTexture(json.specularMap); // 设置镜面反射贴图
    if (json.specularIntensityMap !== undefined) material.specularIntensityMap = getTexture(json.specularIntensityMap); // 设置镜面反射强度贴图
    if (json.specularColorMap !== undefined) material.specularColorMap = getTexture(json.specularColorMap); // 设置镜面反射颜色贴图

    // 环境贴图相关
    if (json.envMap !== undefined) material.envMap = getTexture(json.envMap); // 设置环境贴图
    if (json.envMapRotation !== undefined) material.envMapRotation.fromArray(json.envMapRotation); // 设置环境贴图旋转
    if (json.envMapIntensity !== undefined) material.envMapIntensity = json.envMapIntensity; // 设置环境贴图强度

    // 反射相关
    if (json.reflectivity !== undefined) material.reflectivity = json.reflectivity; // 设置反射率
    if (json.refractionRatio !== undefined) material.refractionRatio = json.refractionRatio; // 设置折射率

    // 光照贴图相关
    if (json.lightMap !== undefined) material.lightMap = getTexture(json.lightMap); // 设置光照贴图
    if (json.lightMapIntensity !== undefined) material.lightMapIntensity = json.lightMapIntensity; // 设置光照贴图强度

    // 环境遮挡贴图
    if (json.aoMap !== undefined) material.aoMap = getTexture(json.aoMap); // 设置环境遮挡贴图
    if (json.aoMapIntensity !== undefined) material.aoMapIntensity = json.aoMapIntensity; // 设置环境遮挡贴图强度

    if (json.gradientMap !== undefined) material.gradientMap = getTexture(json.gradientMap); // 设置渐变贴图

    // 清漆层相关贴图
    if (json.clearcoatMap !== undefined) material.clearcoatMap = getTexture(json.clearcoatMap); // 设置清漆层贴图
    if (json.clearcoatRoughnessMap !== undefined) material.clearcoatRoughnessMap = getTexture(json.clearcoatRoughnessMap); // 设置清漆层粗糙度贴图
    if (json.clearcoatNormalMap !== undefined) material.clearcoatNormalMap = getTexture(json.clearcoatNormalMap); // 设置清漆层法线贴图
    if (json.clearcoatNormalScale !== undefined) material.clearcoatNormalScale = new Vector2().fromArray(json.clearcoatNormalScale); // 设置清漆层法线缩放

    // 彩虹色相关贴图
    if (json.iridescenceMap !== undefined) material.iridescenceMap = getTexture(json.iridescenceMap); // 设置彩虹色贴图
    if (json.iridescenceThicknessMap !== undefined) material.iridescenceThicknessMap = getTexture(json.iridescenceThicknessMap); // 设置彩虹色厚度贴图

    // 透射相关贴图
    if (json.transmissionMap !== undefined) material.transmissionMap = getTexture(json.transmissionMap); // 设置透射贴图
    if (json.thicknessMap !== undefined) material.thicknessMap = getTexture(json.thicknessMap); // 设置厚度贴图

    // 各向异性贴图
    if (json.anisotropyMap !== undefined) material.anisotropyMap = getTexture(json.anisotropyMap); // 设置各向异性贴图

    // 光泽相关贴图
    if (json.sheenColorMap !== undefined) material.sheenColorMap = getTexture(json.sheenColorMap); // 设置光泽颜色贴图
    if (json.sheenRoughnessMap !== undefined) material.sheenRoughnessMap = getTexture(json.sheenRoughnessMap); // 设置光泽粗糙度贴图

    // 返回解析完成的材质
    return material;
  }

  /**
   * 纹理不嵌入在材质JSON中，因此必须在加载过程开始之前注入。
   *
   * @param {Object} value - 包含材质属性纹理的字典。
   * @return {MaterialLoader} 对此材质加载器的引用。
   */
  setTextures(value) {
    // 设置纹理字典
    this.textures = value;
    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 为给定类型创建材质。
   *
   * @param {string} type - 材质类型。
   * @return {Material} 新的材质实例。
   */
  createMaterialFromType(type) {
    // 调用静态方法创建材质
    return MaterialLoader.createMaterialFromType(type);
  }

  /**
   * 为给定类型创建材质的静态方法。
   *
   * @static
   * @param {string} type - 材质类型。
   * @return {Material} 新的材质实例。
   */
  static createMaterialFromType(type) {
    // 材质库映射表，包含所有可用的材质类型
    const materialLib = {
      ShadowMaterial, // 阴影材质
      SpriteMaterial, // 精灵材质
      RawShaderMaterial, // 原始着色器材质
      ShaderMaterial, // 着色器材质
      PointsMaterial, // 点材质
      MeshPhysicalMaterial, // 物理网格材质
      MeshStandardMaterial, // 标准网格材质
      MeshPhongMaterial, // Phong网格材质
      MeshToonMaterial, // 卡通网格材质
      MeshNormalMaterial, // 法线网格材质
      MeshLambertMaterial, // Lambert网格材质
      MeshDepthMaterial, // 深度网格材质
      MeshDistanceMaterial, // 距离网格材质
      MeshBasicMaterial, // 基础网格材质
      MeshMatcapMaterial, // Matcap网格材质
      LineDashedMaterial, // 虚线材质
      LineBasicMaterial, // 基础线材质
      Material, // 基础材质类
    };

    // 根据类型创建并返回新的材质实例
    return new materialLib[type]();
  }
}

// 导出MaterialLoader类
export { MaterialLoader };
