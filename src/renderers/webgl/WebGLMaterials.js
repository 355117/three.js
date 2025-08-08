/**
 * WebGL 材质管理器
 *
 * 这个模块负责管理和更新 WebGL 渲染器中的材质 uniform 变量。
 * 它将 Three.js 材质对象的属性转换为着色器可以使用的 uniform 值，
 * 并处理不同类型材质的特定属性和贴图。
 *
 * 主要功能：
 * - 更新材质的 uniform 变量
 * - 处理纹理变换矩阵
 * - 管理雾效果参数
 * - 支持所有内置材质类型
 */

// 导入常量和工具函数
import { BackSide } from "../../constants.js"; // 背面渲染常量
import { getUnlitUniformColorSpace } from "../shaders/UniformsUtils.js"; // 颜色空间工具
import { Euler } from "../../math/Euler.js"; // 欧拉角类
import { Matrix4 } from "../../math/Matrix4.js"; // 4x4矩阵类

// 预分配的数学对象，避免在渲染循环中创建新对象
const _e1 = /*@__PURE__*/ new Euler(); // 临时欧拉角对象，用于环境贴图旋转
const _m1 = /*@__PURE__*/ new Matrix4(); // 临时矩阵对象，用于旋转矩阵计算

/**
 * WebGL 材质管理器构造函数
 *
 * @param {WebGLRenderer} renderer - WebGL 渲染器实例
 * @param {WebGLProperties} properties - WebGL 属性管理器，用于存储材质相关的缓存数据
 * @returns {Object} 包含材质和雾效果更新函数的对象
 */
function WebGLMaterials(renderer, properties) {
  /**
   * 刷新纹理变换 uniform
   *
   * 更新纹理的变换矩阵到对应的 uniform 变量。
   * 如果纹理设置了自动更新矩阵，会先更新纹理的变换矩阵。
   *
   * @param {Texture} map - 纹理对象
   * @param {Object} uniform - 对应的 uniform 变量对象
   */
  function refreshTransformUniform(map, uniform) {
    // 如果纹理设置了自动更新矩阵，先更新纹理的变换矩阵
    if (map.matrixAutoUpdate === true) {
      map.updateMatrix();
    }

    // 将纹理的变换矩阵复制到 uniform 变量
    uniform.value.copy(map.matrix);
  }

  /**
   * 刷新雾效果 uniform 变量
   *
   * 根据雾对象的类型（线性雾或指数雾）更新相应的 uniform 变量。
   * 支持 Fog（线性雾）和 FogExp2（指数雾）两种类型。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {Fog|FogExp2} fog - 雾对象
   */
  function refreshFogUniforms(uniforms, fog) {
    // 获取雾颜色并转换到正确的颜色空间
    fog.color.getRGB(uniforms.fogColor.value, getUnlitUniformColorSpace(renderer));

    if (fog.isFog) {
      // 线性雾：设置近距离和远距离
      uniforms.fogNear.value = fog.near;
      uniforms.fogFar.value = fog.far;
    } else if (fog.isFogExp2) {
      // 指数雾：设置密度参数
      uniforms.fogDensity.value = fog.density;
    }
  }

  /**
   * 刷新材质 uniform 变量
   *
   * 根据材质类型调用相应的 uniform 更新函数。
   * 这是材质系统的核心分发函数，处理所有内置材质类型。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {Material} material - 材质对象
   * @param {number} pixelRatio - 像素比率，用于点材质
   * @param {number} height - 渲染目标高度，用于点材质
   * @param {WebGLRenderTarget} transmissionRenderTarget - 透射渲染目标，用于物理材质
   */
  function refreshMaterialUniforms(uniforms, material, pixelRatio, height, transmissionRenderTarget) {
    if (material.isMeshBasicMaterial) {
      // 基础网格材质：最简单的材质，只需要通用属性
      refreshUniformsCommon(uniforms, material);
    } else if (material.isMeshLambertMaterial) {
      // Lambert 网格材质：漫反射光照模型
      refreshUniformsCommon(uniforms, material);
    } else if (material.isMeshToonMaterial) {
      // 卡通网格材质：非真实感渲染
      refreshUniformsCommon(uniforms, material);
      refreshUniformsToon(uniforms, material);
    } else if (material.isMeshPhongMaterial) {
      // Phong 网格材质：镜面反射光照模型
      refreshUniformsCommon(uniforms, material);
      refreshUniformsPhong(uniforms, material);
    } else if (material.isMeshStandardMaterial) {
      // 标准网格材质：PBR 基础材质
      refreshUniformsCommon(uniforms, material);
      refreshUniformsStandard(uniforms, material);

      if (material.isMeshPhysicalMaterial) {
        // 物理网格材质：完整的 PBR 材质，包含高级效果
        refreshUniformsPhysical(uniforms, material, transmissionRenderTarget);
      }
    } else if (material.isMeshMatcapMaterial) {
      // MatCap 网格材质：使用材质捕获贴图的快速光照
      refreshUniformsCommon(uniforms, material);
      refreshUniformsMatcap(uniforms, material);
    } else if (material.isMeshDepthMaterial) {
      // 深度网格材质：用于深度渲染
      refreshUniformsCommon(uniforms, material);
    } else if (material.isMeshDistanceMaterial) {
      // 距离网格材质：用于点光源阴影
      refreshUniformsCommon(uniforms, material);
      refreshUniformsDistance(uniforms, material);
    } else if (material.isMeshNormalMaterial) {
      // 法线网格材质：将法线可视化为颜色
      refreshUniformsCommon(uniforms, material);
    } else if (material.isLineBasicMaterial) {
      // 基础线条材质：用于线条渲染
      refreshUniformsLine(uniforms, material);

      if (material.isLineDashedMaterial) {
        // 虚线材质：带虚线效果的线条
        refreshUniformsDash(uniforms, material);
      }
    } else if (material.isPointsMaterial) {
      // 点材质：用于粒子系统和点云
      refreshUniformsPoints(uniforms, material, pixelRatio, height);
    } else if (material.isSpriteMaterial) {
      // 精灵材质：用于 2D 精灵渲染
      refreshUniformsSprites(uniforms, material);
    } else if (material.isShadowMaterial) {
      // 阴影材质：用于接收阴影的透明平面
      uniforms.color.value.copy(material.color);
      uniforms.opacity.value = material.opacity;
    } else if (material.isShaderMaterial) {
      // 自定义着色器材质：用户自定义的着色器
      material.uniformsNeedUpdate = false; // #15581 - 重置更新标志
    }
  }

  /**
   * 刷新通用材质属性
   *
   * 更新所有材质类型都可能使用的通用 uniform 变量，
   * 包括颜色、透明度、各种贴图等基础属性。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {Material} material - 材质对象
   */
  function refreshUniformsCommon(uniforms, material) {
    // 设置材质不透明度
    uniforms.opacity.value = material.opacity;

    // 设置漫反射颜色（如果材质有颜色属性）
    if (material.color) {
      uniforms.diffuse.value.copy(material.color);
    }

    // 设置自发光颜色和强度
    if (material.emissive) {
      uniforms.emissive.value.copy(material.emissive).multiplyScalar(material.emissiveIntensity);
    }

    // 设置主贴图和其变换矩阵
    if (material.map) {
      uniforms.map.value = material.map;
      refreshTransformUniform(material.map, uniforms.mapTransform);
    }

    // 设置 Alpha 贴图和其变换矩阵
    if (material.alphaMap) {
      uniforms.alphaMap.value = material.alphaMap;
      refreshTransformUniform(material.alphaMap, uniforms.alphaMapTransform);
    }

    // 设置凹凸贴图和相关参数
    if (material.bumpMap) {
      uniforms.bumpMap.value = material.bumpMap;
      refreshTransformUniform(material.bumpMap, uniforms.bumpMapTransform);

      // 设置凹凸强度，背面渲染时需要反转
      uniforms.bumpScale.value = material.bumpScale;
      if (material.side === BackSide) {
        uniforms.bumpScale.value *= -1;
      }
    }

    // 设置法线贴图和相关参数
    if (material.normalMap) {
      uniforms.normalMap.value = material.normalMap;
      refreshTransformUniform(material.normalMap, uniforms.normalMapTransform);

      // 设置法线强度，背面渲染时需要反转
      uniforms.normalScale.value.copy(material.normalScale);
      if (material.side === BackSide) {
        uniforms.normalScale.value.negate();
      }
    }

    // 设置位移贴图和相关参数
    if (material.displacementMap) {
      uniforms.displacementMap.value = material.displacementMap;
      refreshTransformUniform(material.displacementMap, uniforms.displacementMapTransform);

      // 设置位移强度和偏移
      uniforms.displacementScale.value = material.displacementScale;
      uniforms.displacementBias.value = material.displacementBias;
    }

    // 设置自发光贴图
    if (material.emissiveMap) {
      uniforms.emissiveMap.value = material.emissiveMap;
      refreshTransformUniform(material.emissiveMap, uniforms.emissiveMapTransform);
    }

    // 设置镜面反射贴图（用于 Phong 材质）
    if (material.specularMap) {
      uniforms.specularMap.value = material.specularMap;
      refreshTransformUniform(material.specularMap, uniforms.specularMapTransform);
    }

    // 设置 Alpha 测试阈值
    if (material.alphaTest > 0) {
      uniforms.alphaTest.value = material.alphaTest;
    }

    // 从材质属性缓存中获取环境贴图相关信息
    const materialProperties = properties.get(material);
    const envMap = materialProperties.envMap;
    const envMapRotation = materialProperties.envMapRotation;

    // 设置环境贴图和相关参数
    if (envMap) {
      uniforms.envMap.value = envMap;

      // 复制环境贴图旋转角度
      _e1.copy(envMapRotation);

      // 适配左手坐标系
      _e1.x *= -1;
      _e1.y *= -1;
      _e1.z *= -1;

      // 非渲染目标的立方体贴图和 PMREM 使用不同的约定
      if (envMap.isCubeTexture && envMap.isRenderTargetTexture === false) {
        _e1.y *= -1;
        _e1.z *= -1;
      }

      // 将欧拉角转换为旋转矩阵并设置到 uniform
      uniforms.envMapRotation.value.setFromMatrix4(_m1.makeRotationFromEuler(_e1));

      // 设置环境贴图翻转标志
      uniforms.flipEnvMap.value = envMap.isCubeTexture && envMap.isRenderTargetTexture === false ? -1 : 1;

      // 设置反射和折射相关参数
      uniforms.reflectivity.value = material.reflectivity;
      uniforms.ior.value = material.ior;
      uniforms.refractionRatio.value = material.refractionRatio;
    }

    // 设置光照贴图和强度
    if (material.lightMap) {
      uniforms.lightMap.value = material.lightMap;
      uniforms.lightMapIntensity.value = material.lightMapIntensity;
      refreshTransformUniform(material.lightMap, uniforms.lightMapTransform);
    }

    // 设置环境光遮蔽贴图和强度
    if (material.aoMap) {
      uniforms.aoMap.value = material.aoMap;
      uniforms.aoMapIntensity.value = material.aoMapIntensity;
      refreshTransformUniform(material.aoMap, uniforms.aoMapTransform);
    }
  }

  /**
   * 刷新线条材质 uniform 变量
   *
   * 更新基础线条材质的颜色、透明度和贴图等属性。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {LineBasicMaterial} material - 线条材质对象
   */
  function refreshUniformsLine(uniforms, material) {
    // 设置线条颜色和透明度
    uniforms.diffuse.value.copy(material.color);
    uniforms.opacity.value = material.opacity;

    // 设置线条贴图
    if (material.map) {
      uniforms.map.value = material.map;
      refreshTransformUniform(material.map, uniforms.mapTransform);
    }
  }

  /**
   * 刷新虚线材质 uniform 变量
   *
   * 更新虚线材质的虚线长度、间隙和缩放等参数。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {LineDashedMaterial} material - 虚线材质对象
   */
  function refreshUniformsDash(uniforms, material) {
    // 设置虚线长度
    uniforms.dashSize.value = material.dashSize;
    // 设置总长度（虚线长度 + 间隙长度）
    uniforms.totalSize.value = material.dashSize + material.gapSize;
    // 设置缩放比例
    uniforms.scale.value = material.scale;
  }

  /**
   * 刷新点材质 uniform 变量
   *
   * 更新点材质的颜色、大小、贴图等属性，用于粒子系统和点云渲染。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {PointsMaterial} material - 点材质对象
   * @param {number} pixelRatio - 像素比率，用于调整点大小
   * @param {number} height - 渲染目标高度，用于计算缩放
   */
  function refreshUniformsPoints(uniforms, material, pixelRatio, height) {
    // 设置点颜色和透明度
    uniforms.diffuse.value.copy(material.color);
    uniforms.opacity.value = material.opacity;
    // 设置点大小（考虑像素比率）
    uniforms.size.value = material.size * pixelRatio;
    // 设置缩放因子（基于渲染高度）
    uniforms.scale.value = height * 0.5;

    // 设置点贴图
    if (material.map) {
      uniforms.map.value = material.map;
      refreshTransformUniform(material.map, uniforms.uvTransform);
    }

    // 设置 Alpha 贴图
    if (material.alphaMap) {
      uniforms.alphaMap.value = material.alphaMap;
      refreshTransformUniform(material.alphaMap, uniforms.alphaMapTransform);
    }

    // 设置 Alpha 测试阈值
    if (material.alphaTest > 0) {
      uniforms.alphaTest.value = material.alphaTest;
    }
  }

  /**
   * 刷新精灵材质 uniform 变量
   *
   * 更新精灵材质的颜色、透明度、旋转和贴图等属性。
   * 精灵是始终面向摄像机的 2D 平面。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {SpriteMaterial} material - 精灵材质对象
   */
  function refreshUniformsSprites(uniforms, material) {
    // 设置精灵颜色和透明度
    uniforms.diffuse.value.copy(material.color);
    uniforms.opacity.value = material.opacity;
    // 设置精灵旋转角度
    uniforms.rotation.value = material.rotation;

    // 设置精灵贴图
    if (material.map) {
      uniforms.map.value = material.map;
      refreshTransformUniform(material.map, uniforms.mapTransform);
    }

    // 设置 Alpha 贴图
    if (material.alphaMap) {
      uniforms.alphaMap.value = material.alphaMap;
      refreshTransformUniform(material.alphaMap, uniforms.alphaMapTransform);
    }

    // 设置 Alpha 测试阈值
    if (material.alphaTest > 0) {
      uniforms.alphaTest.value = material.alphaTest;
    }
  }

  /**
   * 刷新 Phong 光照模型 uniform 变量
   *
   * 更新 Phong 材质特有的镜面反射颜色和光泽度参数。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {MeshPhongMaterial} material - Phong 材质对象
   */
  function refreshUniformsPhong(uniforms, material) {
    // 设置镜面反射颜色
    uniforms.specular.value.copy(material.specular);
    // 设置光泽度，最小值为 1e-4 以防止 pow(0.0, 0.0) 的数学错误
    uniforms.shininess.value = Math.max(material.shininess, 1e-4);
  }

  /**
   * 刷新卡通材质 uniform 变量
   *
   * 更新卡通材质的渐变贴图，用于实现非真实感渲染的色调分离效果。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {MeshToonMaterial} material - 卡通材质对象
   */
  function refreshUniformsToon(uniforms, material) {
    // 设置渐变贴图，用于卡通风格的色调映射
    if (material.gradientMap) {
      uniforms.gradientMap.value = material.gradientMap;
    }
  }

  /**
   * 刷新标准材质（PBR 基础）uniform 变量
   *
   * 更新标准材质的金属度、粗糙度和环境映射强度等 PBR 参数。
   * 这是基于物理渲染的基础材质。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {MeshStandardMaterial} material - 标准材质对象
   */
  function refreshUniformsStandard(uniforms, material) {
    // 设置金属度值
    uniforms.metalness.value = material.metalness;

    // 设置金属度贴图
    if (material.metalnessMap) {
      uniforms.metalnessMap.value = material.metalnessMap;
      refreshTransformUniform(material.metalnessMap, uniforms.metalnessMapTransform);
    }

    // 设置粗糙度值
    uniforms.roughness.value = material.roughness;

    // 设置粗糙度贴图
    if (material.roughnessMap) {
      uniforms.roughnessMap.value = material.roughnessMap;
      refreshTransformUniform(material.roughnessMap, uniforms.roughnessMapTransform);
    }

    // 设置环境映射强度
    if (material.envMap) {
      // 环境贴图本身在 refreshUniformsCommon 中设置
      uniforms.envMapIntensity.value = material.envMapIntensity;
    }
  }

  /**
   * 刷新物理材质（完整 PBR）uniform 变量
   *
   * 更新物理材质的高级 PBR 特性，包括光泽、清漆涂层、彩虹色、
   * 透射、各向异性和镜面反射等效果。这是最完整的 PBR 材质。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {MeshPhysicalMaterial} material - 物理材质对象
   * @param {WebGLRenderTarget} transmissionRenderTarget - 透射渲染目标
   */
  function refreshUniformsPhysical(uniforms, material, transmissionRenderTarget) {
    // 设置折射率（也是通用 uniform 的一部分）
    uniforms.ior.value = material.ior;

    // === 光泽效果 (Sheen) ===
    // 模拟织物等材质的光泽效果
    if (material.sheen > 0) {
      // 设置光泽颜色（光泽颜色 × 光泽强度）
      uniforms.sheenColor.value.copy(material.sheenColor).multiplyScalar(material.sheen);
      // 设置光泽粗糙度
      uniforms.sheenRoughness.value = material.sheenRoughness;

      // 设置光泽颜色贴图
      if (material.sheenColorMap) {
        uniforms.sheenColorMap.value = material.sheenColorMap;
        refreshTransformUniform(material.sheenColorMap, uniforms.sheenColorMapTransform);
      }

      // 设置光泽粗糙度贴图
      if (material.sheenRoughnessMap) {
        uniforms.sheenRoughnessMap.value = material.sheenRoughnessMap;
        refreshTransformUniform(material.sheenRoughnessMap, uniforms.sheenRoughnessMapTransform);
      }
    }

    // === 清漆涂层效果 (Clear Coat) ===
    // 模拟汽车漆面等多层材质效果
    if (material.clearcoat > 0) {
      // 设置清漆强度和粗糙度
      uniforms.clearcoat.value = material.clearcoat;
      uniforms.clearcoatRoughness.value = material.clearcoatRoughness;

      // 设置清漆贴图
      if (material.clearcoatMap) {
        uniforms.clearcoatMap.value = material.clearcoatMap;
        refreshTransformUniform(material.clearcoatMap, uniforms.clearcoatMapTransform);
      }

      // 设置清漆粗糙度贴图
      if (material.clearcoatRoughnessMap) {
        uniforms.clearcoatRoughnessMap.value = material.clearcoatRoughnessMap;
        refreshTransformUniform(material.clearcoatRoughnessMap, uniforms.clearcoatRoughnessMapTransform);
      }

      // 设置清漆法线贴图
      if (material.clearcoatNormalMap) {
        uniforms.clearcoatNormalMap.value = material.clearcoatNormalMap;
        refreshTransformUniform(material.clearcoatNormalMap, uniforms.clearcoatNormalMapTransform);

        // 设置清漆法线强度
        uniforms.clearcoatNormalScale.value.copy(material.clearcoatNormalScale);

        // 背面渲染时需要反转清漆法线
        if (material.side === BackSide) {
          uniforms.clearcoatNormalScale.value.negate();
        }
      }
    }

    // === 色散效果 (Dispersion) ===
    // 模拟光的色散现象，如钻石的彩虹效果
    if (material.dispersion > 0) {
      uniforms.dispersion.value = material.dispersion;
    }

    // === 彩虹色效果 (Iridescence) ===
    // 模拟薄膜干涉产生的彩虹色，如肥皂泡、油膜等
    if (material.iridescence > 0) {
      // 设置彩虹色强度和折射率
      uniforms.iridescence.value = material.iridescence;
      uniforms.iridescenceIOR.value = material.iridescenceIOR;
      // 设置薄膜厚度范围
      uniforms.iridescenceThicknessMinimum.value = material.iridescenceThicknessRange[0];
      uniforms.iridescenceThicknessMaximum.value = material.iridescenceThicknessRange[1];

      // 设置彩虹色贴图
      if (material.iridescenceMap) {
        uniforms.iridescenceMap.value = material.iridescenceMap;
        refreshTransformUniform(material.iridescenceMap, uniforms.iridescenceMapTransform);
      }

      // 设置薄膜厚度贴图
      if (material.iridescenceThicknessMap) {
        uniforms.iridescenceThicknessMap.value = material.iridescenceThicknessMap;
        refreshTransformUniform(material.iridescenceThicknessMap, uniforms.iridescenceThicknessMapTransform);
      }
    }

    // === 透射效果 (Transmission) ===
    // 模拟光线穿透半透明材质的效果，如玻璃、水等
    if (material.transmission > 0) {
      // 设置透射强度
      uniforms.transmission.value = material.transmission;
      // 设置透射采样贴图和尺寸
      uniforms.transmissionSamplerMap.value = transmissionRenderTarget.texture;
      uniforms.transmissionSamplerSize.value.set(transmissionRenderTarget.width, transmissionRenderTarget.height);

      // 设置透射贴图
      if (material.transmissionMap) {
        uniforms.transmissionMap.value = material.transmissionMap;
        refreshTransformUniform(material.transmissionMap, uniforms.transmissionMapTransform);
      }

      // 设置材质厚度
      uniforms.thickness.value = material.thickness;

      // 设置厚度贴图
      if (material.thicknessMap) {
        uniforms.thicknessMap.value = material.thicknessMap;
        refreshTransformUniform(material.thicknessMap, uniforms.thicknessMapTransform);
      }

      // 设置光线衰减距离和颜色
      uniforms.attenuationDistance.value = material.attenuationDistance;
      uniforms.attenuationColor.value.copy(material.attenuationColor);
    }

    // === 各向异性效果 (Anisotropy) ===
    // 模拟拉丝金属等具有方向性反射的材质
    if (material.anisotropy > 0) {
      // 计算各向异性向量（强度 × 旋转方向）
      uniforms.anisotropyVector.value.set(material.anisotropy * Math.cos(material.anisotropyRotation), material.anisotropy * Math.sin(material.anisotropyRotation));

      // 设置各向异性贴图
      if (material.anisotropyMap) {
        uniforms.anisotropyMap.value = material.anisotropyMap;
        refreshTransformUniform(material.anisotropyMap, uniforms.anisotropyMapTransform);
      }
    }

    // === 镜面反射效果 (Specular) ===
    // 设置镜面反射强度和颜色（用于物理材质的镜面反射工作流）
    uniforms.specularIntensity.value = material.specularIntensity;
    uniforms.specularColor.value.copy(material.specularColor);

    // 设置镜面反射颜色贴图
    if (material.specularColorMap) {
      uniforms.specularColorMap.value = material.specularColorMap;
      refreshTransformUniform(material.specularColorMap, uniforms.specularColorMapTransform);
    }

    // 设置镜面反射强度贴图
    if (material.specularIntensityMap) {
      uniforms.specularIntensityMap.value = material.specularIntensityMap;
      refreshTransformUniform(material.specularIntensityMap, uniforms.specularIntensityMapTransform);
    }
  }

  /**
   * 刷新 MatCap 材质 uniform 变量
   *
   * 更新 MatCap 材质的材质捕获贴图。MatCap 使用预渲染的球体贴图
   * 来模拟复杂的光照效果，是一种快速的光照技术。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {MeshMatcapMaterial} material - MatCap 材质对象
   */
  function refreshUniformsMatcap(uniforms, material) {
    // 设置材质捕获贴图
    if (material.matcap) {
      uniforms.matcap.value = material.matcap;
    }
  }

  /**
   * 刷新距离材质 uniform 变量
   *
   * 更新距离材质的光源参考位置和距离范围。
   * 距离材质用于点光源的阴影映射，将距离信息编码到颜色中。
   *
   * @param {Object} uniforms - 着色器 uniform 变量集合
   * @param {MeshDistanceMaterial} material - 距离材质对象
   */
  function refreshUniformsDistance(uniforms, material) {
    // 从材质属性中获取关联的光源
    const light = properties.get(material).light;

    // 设置光源的世界位置作为参考点
    uniforms.referencePosition.value.setFromMatrixPosition(light.matrixWorld);
    // 设置阴影相机的近距离和远距离
    uniforms.nearDistance.value = light.shadow.camera.near;
    uniforms.farDistance.value = light.shadow.camera.far;
  }

  // 返回公共接口
  return {
    refreshFogUniforms: refreshFogUniforms, // 雾效果更新函数
    refreshMaterialUniforms: refreshMaterialUniforms, // 材质更新函数
  };
}

export { WebGLMaterials };
