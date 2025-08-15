// 导入动画工具函数
import * as AnimationUtils from "./AnimationUtils.js";
// 导入关键帧轨道基类
import { KeyframeTrack } from "./KeyframeTrack.js";
// 导入布尔值关键帧轨道
import { BooleanKeyframeTrack } from "./tracks/BooleanKeyframeTrack.js";
// 导入颜色关键帧轨道
import { ColorKeyframeTrack } from "./tracks/ColorKeyframeTrack.js";
// 导入数值关键帧轨道
import { NumberKeyframeTrack } from "./tracks/NumberKeyframeTrack.js";
// 导入四元数关键帧轨道
import { QuaternionKeyframeTrack } from "./tracks/QuaternionKeyframeTrack.js";
// 导入字符串关键帧轨道
import { StringKeyframeTrack } from "./tracks/StringKeyframeTrack.js";
// 导入向量关键帧轨道
import { VectorKeyframeTrack } from "./tracks/VectorKeyframeTrack.js";
// 导入UUID生成函数
import { generateUUID } from "../math/MathUtils.js";
// 导入正常动画混合模式常量
import { NormalAnimationBlendMode } from "../constants.js";

/**
 * 表示动画的可重用关键帧轨道集合
 * A reusable set of keyframe tracks which represent an animation.
 */
class AnimationClip {
  /**
   * 构造一个新的动画剪辑
   * Constructs a new animation clip.
   *
   * 注意：除了直接使用构造函数实例化AnimationClip外，您还可以
   * 使用此类的静态接口来创建剪辑。不过在大多数情况下，动画剪辑
   * 会在导入动画3D资产时由加载器自动创建。
   * Note: Instead of instantiating an AnimationClip directly with the constructor, you can
   * use the static interface of this class for creating clips. In most cases though, animation clips
   * will automatically be created by loaders when importing animated 3D assets.
   *
   * @param {string} [name=''] - 剪辑的名称 The clip's name.
   * @param {number} [duration=-1] - 剪辑的持续时间（秒）。如果传递负值，
   * 持续时间将从传递的关键帧计算得出 The clip's duration in seconds. If a negative value is passed,
   * the duration will be calculated from the passed keyframes.
   * @param {Array<KeyframeTrack>} tracks - 关键帧轨道数组 An array of keyframe tracks.
   * @param {(NormalAnimationBlendMode|AdditiveAnimationBlendMode)} [blendMode=NormalAnimationBlendMode] - 定义当同时播放两个或多个动画时
   * 如何混合/组合动画 Defines how the animation is blended/combined when two or more animations are simultaneously played.
   */
  constructor(name = "", duration = -1, tracks = [], blendMode = NormalAnimationBlendMode) {
    /**
     * 剪辑的名称
     * The clip's name.
     *
     * @type {string}
     */
    this.name = name;

    /**
     * 关键帧轨道数组
     * An array of keyframe tracks.
     *
     * @type {Array<KeyframeTrack>}
     */
    this.tracks = tracks;

    /**
     * 剪辑的持续时间（秒）
     * The clip's duration in seconds.
     *
     * @type {number}
     */
    this.duration = duration;

    /**
     * 定义当同时播放两个或多个动画时如何混合/组合动画
     * Defines how the animation is blended/combined when two or more animations
     * are simultaneously played.
     *
     * @type {(NormalAnimationBlendMode|AdditiveAnimationBlendMode)}
     */
    this.blendMode = blendMode;

    /**
     * 动画剪辑的UUID
     * The UUID of the animation clip.
     *
     * @type {string}
     * @readonly
     */
    this.uuid = generateUUID();

    // 这意味着它应该通过扫描轨道来计算其持续时间
    // this means it should figure out its duration by scanning the tracks
    if (this.duration < 0) {
      // 重置持续时间
      this.resetDuration();
    }
  }

  /**
   * 从给定的JSON创建动画剪辑的工厂方法
   * Factory method for creating an animation clip from the given JSON.
   *
   * @static
   * @param {Object} json - 序列化的动画剪辑 The serialized animation clip.
   * @return {AnimationClip} 新的动画剪辑 The new animation clip.
   */
  static parse(json) {
    // 初始化轨道数组
    const tracks = [],
      // 获取JSON中的轨道数据
      jsonTracks = json.tracks,
      // 计算帧时间（1除以fps，如果没有fps则默认为1）
      frameTime = 1.0 / (json.fps || 1.0);

    // 遍历所有JSON轨道
    for (let i = 0, n = jsonTracks.length; i !== n; ++i) {
      // 解析关键帧轨道并按帧时间缩放，然后添加到轨道数组
      tracks.push(parseKeyframeTrack(jsonTracks[i]).scale(frameTime));
    }

    // 创建新的动画剪辑实例
    const clip = new this(json.name, json.duration, tracks, json.blendMode);
    // 设置UUID
    clip.uuid = json.uuid;

    // 返回创建的剪辑
    return clip;
  }

  /**
   * 将给定的动画剪辑序列化为JSON
   * Serializes the given animation clip into JSON.
   *
   * @static
   * @param {AnimationClip} clip - 要序列化的动画剪辑 The animation clip to serialize.
   * @return {Object} JSON对象 The JSON object.
   */
  static toJSON(clip) {
    // 初始化轨道数组
    const tracks = [],
      // 获取剪辑的轨道
      clipTracks = clip.tracks;

    // 创建JSON对象
    const json = {
      name: clip.name, // 剪辑名称
      duration: clip.duration, // 剪辑持续时间
      tracks: tracks, // 轨道数组
      uuid: clip.uuid, // UUID
      blendMode: clip.blendMode, // 混合模式
    };

    // 遍历所有轨道
    for (let i = 0, n = clipTracks.length; i !== n; ++i) {
      // 将每个轨道转换为JSON并添加到轨道数组
      tracks.push(KeyframeTrack.toJSON(clipTracks[i]));
    }

    // 返回JSON对象
    return json;
  }

  /**
   * 从几何体的变形目标数组返回新的动画剪辑，
   * 需要提供名称和每秒帧数
   * Returns a new animation clip from the passed morph targets array of a
   * geometry, taking a name and the number of frames per second.
   *
   * 注意：fps参数是必需的，但动画速度可以
   * 通过 {@link AnimationAction#setDuration} 覆盖。
   * Note: The fps parameter is required, but the animation speed can be
   * overridden via {@link AnimationAction#setDuration}.
   *
   * @static
   * @param {string} name - 动画剪辑的名称 The name of the animation clip.
   * @param {Array<Object>} morphTargetSequence - 变形目标序列 A sequence of morph targets.
   * @param {number} fps - 每秒帧数值 The Frames-Per-Second value.
   * @param {boolean} noLoop - 剪辑是否不循环 Whether the clip should be no loop or not.
   * @return {AnimationClip} 新的动画剪辑 The new animation clip.
   */
  static CreateFromMorphTargetSequence(name, morphTargetSequence, fps, noLoop) {
    // 获取变形目标的数量
    const numMorphTargets = morphTargetSequence.length;
    // 初始化轨道数组
    const tracks = [];

    // 为每个变形目标创建轨道
    for (let i = 0; i < numMorphTargets; i++) {
      // 初始化时间数组
      let times = [];
      // 初始化值数组
      let values = [];

      // 添加三个时间点：前一个、当前、下一个（使用模运算实现循环）
      times.push((i + numMorphTargets - 1) % numMorphTargets, i, (i + 1) % numMorphTargets);

      // 添加对应的值：0（前一个），1（当前激活），0（下一个）
      values.push(0, 1, 0);

      // 获取关键帧排序顺序
      const order = AnimationUtils.getKeyframeOrder(times);
      // 按顺序排列时间数组
      times = AnimationUtils.sortedArray(times, 1, order);
      // 按顺序排列值数组
      values = AnimationUtils.sortedArray(values, 1, order);

      // 如果第一帧有关键帧，将其复制为最后一帧以实现完美循环
      // if there is a key at the first frame, duplicate it as the
      // last frame as well for perfect loop.
      if (!noLoop && times[0] === 0) {
        // 添加最后一帧的时间
        times.push(numMorphTargets);
        // 添加最后一帧的值（与第一帧相同）
        values.push(values[0]);
      }

      // 创建数值关键帧轨道并按fps缩放，然后添加到轨道数组
      tracks.push(new NumberKeyframeTrack(".morphTargetInfluences[" + morphTargetSequence[i].name + "]", times, values).scale(1.0 / fps));
    }

    // 返回新的动画剪辑（持续时间为-1，表示自动计算）
    return new this(name, -1, tracks);
  }

  /**
   * 按名称搜索动画剪辑，第一个参数可以是
   * 剪辑数组，或包含名为"animations"属性数组的网格或几何体
   * Searches for an animation clip by name, taking as its first parameter
   * either an array of clips, or a mesh or geometry that contains an
   * array named "animations" property.
   *
   * @static
   * @param {(Array<AnimationClip>|Object3D)} objectOrClipArray - 要搜索的数组或对象 The array or object to search through.
   * @param {string} name - 要搜索的名称 The name to search for.
   * @return {?AnimationClip} 找到的动画剪辑。如果没有找到剪辑则返回 `null` The found animation clip. Returns `null` if no clip has been found.
   */
  static findByName(objectOrClipArray, name) {
    // 初始化剪辑数组
    let clipArray = objectOrClipArray;

    // 如果传入的不是数组
    if (!Array.isArray(objectOrClipArray)) {
      // 获取对象引用
      const o = objectOrClipArray;
      // 尝试从几何体的animations属性或对象的animations属性获取剪辑数组
      clipArray = (o.geometry && o.geometry.animations) || o.animations;
    }

    // 遍历剪辑数组
    for (let i = 0; i < clipArray.length; i++) {
      // 如果找到匹配的名称
      if (clipArray[i].name === name) {
        // 返回找到的剪辑
        return clipArray[i];
      }
    }

    // 没有找到，返回null
    return null;
  }

  /**
   * 从几何体的变形目标序列创建新的AnimationClips数组，
   * 尝试将变形目标名称排序为基于动画组的模式，
   * 如"Walk_001, Walk_002, Run_001, Run_002..."
   * Returns an array of new AnimationClips created from the morph target
   * sequences of a geometry, trying to sort morph target names into
   * animation-group-based patterns like "Walk_001, Walk_002, Run_001, Run_002...".
   *
   * 参见 {@link MD2Loader#parse} 作为如何使用该方法的示例
   * See {@link MD2Loader#parse} as an example for how the method should be used.
   *
   * @static
   * @param {Array<Object>} morphTargets - 变形目标序列 A sequence of morph targets.
   * @param {number} fps - 每秒帧数值 The Frames-Per-Second value.
   * @param {boolean} noLoop - 剪辑是否不循环 Whether the clip should be no loop or not.
   * @return {Array<AnimationClip>} 新动画剪辑数组 An array of new animation clips.
   */
  static CreateClipsFromMorphTargetSequences(morphTargets, fps, noLoop) {
    // 创建动画名称到变形目标的映射对象
    const animationToMorphTargets = {};

    // 在 https://regex101.com/ 上测试过的复杂序列
    // 如 flamingo_flyA_003, flamingo_run1_003, crdeath0059
    // tested with https://regex101.com/ on trick sequences
    // such flamingo_flyA_003, flamingo_run1_003, crdeath0059
    const pattern = /^([\w-]*?)([\d]+)$/;

    // 根据模式将变形目标名称排序到动画组中
    // 如 Walk_001, Walk_002, Run_001, Run_002
    // sort morph target names into animation groups based
    // patterns like Walk_001, Walk_002, Run_001, Run_002
    for (let i = 0, il = morphTargets.length; i < il; i++) {
      // 获取当前变形目标
      const morphTarget = morphTargets[i];
      // 使用正则表达式匹配名称
      const parts = morphTarget.name.match(pattern);

      // 如果匹配成功且有捕获组
      if (parts && parts.length > 1) {
        // 获取动画名称（第一个捕获组）
        const name = parts[1];

        // 获取该动画名称对应的变形目标数组
        let animationMorphTargets = animationToMorphTargets[name];

        // 如果该动画名称还没有对应的数组
        if (!animationMorphTargets) {
          // 创建新数组
          animationToMorphTargets[name] = animationMorphTargets = [];
        }

        // 将当前变形目标添加到对应的动画组
        animationMorphTargets.push(morphTarget);
      }
    }

    // 初始化剪辑数组
    const clips = [];

    // 遍历所有动画组
    for (const name in animationToMorphTargets) {
      // 为每个动画组创建动画剪辑并添加到数组
      clips.push(this.CreateFromMorphTargetSequence(name, animationToMorphTargets[name], fps, noLoop));
    }

    // 返回剪辑数组
    return clips;
  }

  /**
   * 解析 `animation.hierarchy` 格式并返回新的动画剪辑
   * Parses the `animation.hierarchy` format and returns a new animation clip.
   *
   * @static
   * @deprecated 自r175版本起已弃用 since r175.
   * @param {Object} animation - 序列化的动画剪辑JSON A serialized animation clip as JSON.
   * @param {Array<Bones>} bones - 骨骼数组 An array of bones.
   * @return {?AnimationClip} 新的动画剪辑 The new animation clip.
   */
  static parseAnimation(animation, bones) {
    // 发出弃用警告
    console.warn("THREE.AnimationClip: parseAnimation() is deprecated and will be removed with r185");

    // 检查动画数据是否存在
    if (!animation) {
      console.error("THREE.AnimationClip: No animation in JSONLoader data.");
      return null;
    }

    // 添加非空轨道的辅助函数
    const addNonemptyTrack = function (trackType, trackName, animationKeys, propertyName, destTracks) {
      // 只有在实际有关键帧时才返回轨道
      // only return track if there are actually keys.
      if (animationKeys.length !== 0) {
        // 初始化时间和值数组
        const times = [];
        const values = [];

        // 将JSON数据扁平化为时间和值数组
        AnimationUtils.flattenJSON(animationKeys, times, values, propertyName);

        // 空关键帧被过滤掉，所以再次检查
        // empty keys are filtered out, so check again
        if (times.length !== 0) {
          // 创建轨道并添加到目标轨道数组
          destTracks.push(new trackType(trackName, times, values));
        }
      }
    };

    // 初始化轨道数组
    const tracks = [];

    // 获取剪辑名称，默认为"default"
    const clipName = animation.name || "default";
    // 获取fps，默认为30
    const fps = animation.fps || 30;
    // 获取混合模式
    const blendMode = animation.blendMode;

    // AnimationClip中的自动长度确定
    // automatic length determination in AnimationClip.
    let duration = animation.length || -1;

    // 获取层次结构轨道数组
    const hierarchyTracks = animation.hierarchy || [];

    // 遍历所有层次结构轨道
    for (let h = 0; h < hierarchyTracks.length; h++) {
      // 获取当前轨道的动画关键帧
      const animationKeys = hierarchyTracks[h].keys;

      // 跳过空轨道
      // skip empty tracks
      if (!animationKeys || animationKeys.length === 0) continue;

      // 处理变形目标
      // process morph targets
      if (animationKeys[0].morphTargets) {
        // 找出此轨道中使用的所有变形目标
        // figure out all morph targets used in this track
        // 创建变形目标名称映射对象
        const morphTargetNames = {};

        // 声明循环变量
        let k;

        // 遍历所有动画关键帧，收集变形目标名称
        for (k = 0; k < animationKeys.length; k++) {
          // 如果当前关键帧有变形目标
          if (animationKeys[k].morphTargets) {
            // 遍历所有变形目标
            for (let m = 0; m < animationKeys[k].morphTargets.length; m++) {
              // 将变形目标名称添加到映射对象（值设为-1作为标记）
              morphTargetNames[animationKeys[k].morphTargets[m]] = -1;
            }
          }
        }

        // 为每个变形目标创建轨道，除了命名的变形目标外，
        // 所有morphTargetInfluences都为零
        // create a track for each morph target with all zero
        // morphTargetInfluences except for the keys in which
        // the morphTarget is named.
        for (const morphTargetName in morphTargetNames) {
          // 初始化时间和值数组
          const times = [];
          const values = [];

          // 遍历变形目标数组
          for (let m = 0; m !== animationKeys[k].morphTargets.length; ++m) {
            // 获取当前动画关键帧
            const animationKey = animationKeys[k];

            // 添加时间
            times.push(animationKey.time);
            // 如果是当前变形目标则值为1，否则为0
            values.push(animationKey.morphTarget === morphTargetName ? 1 : 0);
          }

          // 创建数值关键帧轨道并添加到轨道数组
          tracks.push(new NumberKeyframeTrack(".morphTargetInfluence[" + morphTargetName + "]", times, values));
        }

        // 设置持续时间
        duration = morphTargetNames.length * fps;
      } else {
        // ...假设是骨骼动画
        // ...assume skeletal animation

        // 构建骨骼名称
        const boneName = ".bones[" + bones[h].name + "]";

        // 添加位置轨道
        addNonemptyTrack(VectorKeyframeTrack, boneName + ".position", animationKeys, "pos", tracks);

        // 添加旋转轨道（四元数）
        addNonemptyTrack(QuaternionKeyframeTrack, boneName + ".quaternion", animationKeys, "rot", tracks);

        // 添加缩放轨道
        addNonemptyTrack(VectorKeyframeTrack, boneName + ".scale", animationKeys, "scl", tracks);
      }
    }

    // 如果没有轨道，返回null
    if (tracks.length === 0) {
      return null;
    }

    // 创建新的动画剪辑
    const clip = new this(clipName, duration, tracks, blendMode);

    // 返回剪辑
    return clip;
  }

  /**
   * 将此剪辑的持续时间设置为其最长关键帧轨道的持续时间
   * Sets the duration of this clip to the duration of its longest keyframe track.
   *
   * @return {AnimationClip} 此动画剪辑的引用 A reference to this animation clip.
   */
  resetDuration() {
    // 获取轨道数组
    const tracks = this.tracks;
    // 初始化持续时间为0
    let duration = 0;

    // 遍历所有轨道
    for (let i = 0, n = tracks.length; i !== n; ++i) {
      // 获取当前轨道
      const track = this.tracks[i];

      // 找到最大持续时间（轨道最后一个时间点）
      duration = Math.max(duration, track.times[track.times.length - 1]);
    }

    // 设置剪辑的持续时间
    this.duration = duration;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 将所有轨道修剪到剪辑的持续时间
   * Trims all tracks to the clip's duration.
   *
   * @return {AnimationClip} 此动画剪辑的引用 A reference to this animation clip.
   */
  trim() {
    // 遍历所有轨道
    for (let i = 0; i < this.tracks.length; i++) {
      // 修剪每个轨道到剪辑的持续时间（从0到duration）
      this.tracks[i].trim(0, this.duration);
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 对剪辑中的每个轨道执行最小验证。如果所有轨道都有效则返回 `true`
   * Performs minimal validation on each track in the clip. Returns `true` if all
   * tracks are valid.
   *
   * @return {boolean} 剪辑的关键帧是否有效 Whether the clip's keyframes are valid or not.
   */
  validate() {
    // 初始化验证结果为true
    let valid = true;

    // 遍历所有轨道
    for (let i = 0; i < this.tracks.length; i++) {
      // 验证每个轨道，所有轨道都必须有效
      valid = valid && this.tracks[i].validate();
    }

    // 返回验证结果
    return valid;
  }

  /**
   * 通过移除等效的连续关键帧来优化每个轨道
   * （这在变形目标序列中很常见）
   * Optimizes each track by removing equivalent sequential keys (which are
   * common in morph target sequences).
   *
   * @return {AnimationClip} 此动画剪辑的引用 A reference to this animation clip.
   */
  optimize() {
    // 遍历所有轨道
    for (let i = 0; i < this.tracks.length; i++) {
      // 优化每个轨道
      this.tracks[i].optimize();
    }

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 返回从此实例复制值的新动画剪辑
   * Returns a new animation clip with copied values from this instance.
   *
   * @return {AnimationClip} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 初始化轨道数组
    const tracks = [];

    // 遍历所有轨道
    for (let i = 0; i < this.tracks.length; i++) {
      // 克隆每个轨道并添加到数组
      tracks.push(this.tracks[i].clone());
    }

    // 返回新的动画剪辑实例
    return new this.constructor(this.name, this.duration, tracks, this.blendMode);
  }

  /**
   * 将此动画剪辑序列化为JSON
   * Serializes this animation clip into JSON.
   *
   * @return {Object} JSON对象 The JSON object.
   */
  toJSON() {
    // 调用静态方法进行序列化
    return this.constructor.toJSON(this);
  }
}

/**
 * 根据值类型名称获取轨道类型
 * Gets the track type for a value type name
 *
 * @param {string} typeName - 值类型名称 The value type name
 * @return {Function} 对应的轨道类构造函数 The corresponding track class constructor
 */
function getTrackTypeForValueTypeName(typeName) {
  // 根据类型名称（转为小写）返回对应的轨道类
  switch (typeName.toLowerCase()) {
    // 标量、双精度、浮点、数字、整数类型
    case "scalar":
    case "double":
    case "float":
    case "number":
    case "integer":
      return NumberKeyframeTrack;

    // 向量类型（2D、3D、4D向量）
    case "vector":
    case "vector2":
    case "vector3":
    case "vector4":
      return VectorKeyframeTrack;

    // 颜色类型
    case "color":
      return ColorKeyframeTrack;

    // 四元数类型
    case "quaternion":
      return QuaternionKeyframeTrack;

    // 布尔类型
    case "bool":
    case "boolean":
      return BooleanKeyframeTrack;

    // 字符串类型
    case "string":
      return StringKeyframeTrack;
  }

  // 如果类型不支持，抛出错误
  throw new Error("THREE.KeyframeTrack: Unsupported typeName: " + typeName);
}

/**
 * 解析关键帧轨道JSON数据
 * Parses keyframe track JSON data
 *
 * @param {Object} json - 关键帧轨道的JSON数据 The JSON data of the keyframe track
 * @return {KeyframeTrack} 解析后的关键帧轨道 The parsed keyframe track
 */
function parseKeyframeTrack(json) {
  // 检查类型是否已定义
  if (json.type === undefined) {
    throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");
  }

  // 根据类型获取轨道类
  const trackType = getTrackTypeForValueTypeName(json.type);

  // 如果没有时间数据，从keys中提取
  if (json.times === undefined) {
    // 初始化时间和值数组
    const times = [],
      values = [];

    // 从JSON的keys中扁平化提取时间和值
    AnimationUtils.flattenJSON(json.keys, times, values, "value");

    // 设置时间和值数组
    json.times = times;
    json.values = values;
  }

  // 派生类可以定义静态parse方法
  // derived classes can define a static parse method
  if (trackType.parse !== undefined) {
    // 使用轨道类的parse方法
    return trackType.parse(json);
  } else {
    // 默认情况下，我们假设构造函数与基类兼容
    // by default, we assume a constructor compatible with the base
    return new trackType(json.name, json.times, json.values, json.interpolation);
  }
}

// 导出 AnimationClip 类
export { AnimationClip };
