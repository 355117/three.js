/**
 * 此类可用于分析音频数据。
 *
 * ```js
 * // 创建一个AudioListener并将其添加到相机
 * const listener = new THREE.AudioListener();
 * camera.add( listener );
 *
 * // 创建一个音频源
 * const sound = new THREE.Audio( listener );
 *
 * // 加载声音并将其设置为Audio对象的缓冲区
 * const audioLoader = new THREE.AudioLoader();
 * audioLoader.load( 'sounds/ambient.ogg', function( buffer ) {
 * 	sound.setBuffer( buffer );
 * 	sound.setLoop(true);
 * 	sound.setVolume(0.5);
 * 	sound.play();
 * });
 *
 * // 创建一个AudioAnalyser，传入声音和所需的fftSize
 * const analyser = new THREE.AudioAnalyser( sound, 32 );
 *
 * // 获取声音的平均频率
 * const data = analyser.getAverageFrequency();
 * ```
 */
class AudioAnalyser {
  /**
   * 构造一个新的音频分析器。
   *
   * @param {Audio} audio - 要分析的音频。
   * @param {number} [fftSize=2048] - 执行快速傅里叶变换（FFT）以获取频域数据时使用的样本窗口大小。
   */
  constructor(audio, fftSize = 2048) {
    /**
     * 音频分析器节点。
     *
     * @type {AnalyserNode}
     */
    this.analyser = audio.context.createAnalyser(); // 创建分析器节点
    this.analyser.fftSize = fftSize; // 设置FFT大小

    /**
     * 保存分析后的数据。
     *
     * @type {Uint8Array}
     */
    this.data = new Uint8Array(this.analyser.frequencyBinCount); // 创建数据数组

    // 将音频输出连接到分析器
    audio.getOutput().connect(this.analyser);
  }

  /**
   * 返回包含音频频率数据的数组。
   *
   * 数组中的每个项目表示特定频率的分贝值。
   * 频率从0线性分布到采样率的1/2。
   * 例如，对于48000采样率，数组的最后一项将表示
   * 24000 Hz的分贝值。
   *
   * @return {Uint8Array} 频率数据。
   */
  getFrequencyData() {
    // 获取字节频率数据
    this.analyser.getByteFrequencyData(this.data);

    // 返回频率数据
    return this.data;
  }

  /**
   * 返回由 {@link AudioAnalyser#getFrequencyData} 返回的频率的平均值。
   *
   * @return {number} 平均频率。
   */
  getAverageFrequency() {
    // 初始化累加值
    let value = 0;
    // 获取频率数据
    const data = this.getFrequencyData();

    // 遍历所有频率数据并累加
    for (let i = 0; i < data.length; i++) {
      value += data[i];
    }

    // 返回平均值
    return value / data.length;
  }
}

// 导出AudioAnalyser类
export { AudioAnalyser };
