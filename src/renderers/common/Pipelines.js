// Import base class for data management and caching
// 导入数据管理和缓存的基类
import DataMap from "./DataMap.js";
// Import render pipeline class for graphics rendering operations
// 导入用于图形渲染操作的渲染管线类
import RenderPipeline from "./RenderPipeline.js";
// Import compute pipeline class for compute shader operations
// 导入用于计算着色器操作的计算管线类
import ComputePipeline from "./ComputePipeline.js";
// Import programmable stage class for shader program management
// 导入用于着色器程序管理的可编程阶段类
import ProgrammableStage from "./ProgrammableStage.js";

/**
 * Pipeline management system for the renderer.
 * 渲染器的管线管理系统。
 *
 * This class manages both render and compute pipelines, handling their creation,
 * caching, and lifecycle. It maintains shader programs and ensures efficient
 * reuse of pipeline resources across different render objects and compute nodes.
 *
 * 该类管理渲染和计算管线，处理它们的创建、缓存和生命周期。
 * 它维护着色器程序并确保在不同渲染对象和计算节点之间高效重用管线资源。
 *
 * @private
 * @augments DataMap
 */
class Pipelines extends DataMap {
  /**
   * Constructs a new pipeline management component.
   * 构造一个新的管线管理组件。
   *
   * Initializes the pipeline manager with references to the backend and nodes
   * components, sets up internal caches for pipelines and shader programs.
   *
   * 使用后端和节点组件的引用初始化管线管理器，设置管线和着色器程序的内部缓存。
   *
   * @param {Object} backend - The renderer's backend implementation.
   * @param {Object} nodes - Renderer component for managing nodes related logic.
   */
  constructor(backend, nodes) {
    super();

    /**
     * The renderer's backend implementation.
     * 渲染器的后端实现。
     *
     * Provides low-level graphics API abstraction for creating and managing
     * GPU resources like pipelines, shaders, and buffers.
     *
     * 提供低级图形API抽象，用于创建和管理GPU资源，如管线、着色器和缓冲区。
     *
     * @type {Object}
     */
    this.backend = backend;

    /**
     * Renderer component for managing nodes related logic.
     * 用于管理节点相关逻辑的渲染器组件。
     *
     * Handles node graph processing, shader generation, and material compilation.
     * 处理节点图处理、着色器生成和材质编译。
     *
     * @type {Object}
     */
    this.nodes = nodes;

    /**
     * Reference to the bindings management component.
     * 绑定管理组件的引用。
     *
     * This reference will be set inside the `Bindings` constructor to establish
     * a bidirectional relationship between pipelines and bindings management.
     *
     * 该引用将在 `Bindings` 构造函数内部设置，以建立管线和绑定管理之间的双向关系。
     *
     * @type {?Object}
     * @default null
     */
    this.bindings = null;

    /**
     * Internal cache for maintaining pipeline instances.
     * 用于维护管线实例的内部缓存。
     *
     * Maps cache keys to pipeline objects to enable efficient reuse of
     * identical pipeline configurations across multiple render operations.
     *
     * 将缓存键映射到管线对象，以便在多个渲染操作中高效重用相同的管线配置。
     *
     * @type {Map<string, Object>}
     */
    this.caches = new Map();

    /**
     * Shader program storage organized by stage type.
     * 按阶段类型组织的着色器程序存储。
     *
     * Maintains separate maps for vertex, fragment, and compute shader programs
     * to enable efficient lookup and reuse of compiled shader code.
     *
     * 为顶点、片段和计算着色器程序维护单独的映射，以便高效查找和重用编译的着色器代码。
     *
     * @type {Object<string, Map<string, ProgrammableStage>>}
     * @property {Map<string, ProgrammableStage>} vertex - Vertex shader programs
     * @property {Map<string, ProgrammableStage>} fragment - Fragment shader programs
     * @property {Map<string, ProgrammableStage>} compute - Compute shader programs
     */
    this.programs = {
      vertex: new Map(),
      fragment: new Map(),
      compute: new Map(),
    };
  }

  /**
   * Returns a compute pipeline for the given compute node.
   * 为给定的计算节点返回计算管线。
   *
   * This method handles the complete lifecycle of compute pipeline creation and management:
   * 1. Checks if the compute node requires a pipeline update
   * 2. Manages reference counting for existing pipelines and programs
   * 3. Creates or retrieves shader programs from cache
   * 4. Creates or retrieves compute pipelines from cache
   * 5. Updates usage tracking for resource management
   *
   * 该方法处理计算管线创建和管理的完整生命周期：
   * 1. 检查计算节点是否需要管线更新
   * 2. 管理现有管线和程序的引用计数
   * 3. 从缓存创建或检索着色器程序
   * 4. 从缓存创建或检索计算管线
   * 5. 更新资源管理的使用跟踪
   *
   * @param {Object} computeNode - The compute node containing shader logic and configuration.
   * @param {Array<Object>} bindings - The resource bindings for the compute operation.
   * @return {ComputePipeline} The compute pipeline ready for execution.
   */
  getForCompute(computeNode, bindings) {
    // Extract backend reference for easier access throughout the method
    // 提取后端引用以便在整个方法中更容易访问
    const { backend } = this;

    // Get or create data entry for this compute node from the DataMap
    // 从DataMap获取或创建此计算节点的数据条目
    const data = this.get(computeNode);

    // Check if the compute node requires a pipeline update
    // 检查计算节点是否需要管线更新
    if (this._needsComputeUpdate(computeNode)) {
      // Store reference to the existing pipeline (may be undefined)
      // 存储对现有管线的引用（可能为undefined）
      const previousPipeline = data.pipeline;

      // Decrement usage counters for the previous pipeline if it exists
      // 如果存在先前的管线，则减少其使用计数器
      if (previousPipeline) {
        // Decrement the pipeline's usage counter
        // 减少管线的使用计数器
        previousPipeline.usedTimes--;
        // Decrement the compute program's usage counter
        // 减少计算程序的使用计数器
        previousPipeline.computeProgram.usedTimes--;
      }

      // Generate shader code and build state through the node system
      // 通过节点系统生成着色器代码和构建状态
      const nodeBuilderState = this.nodes.getForCompute(computeNode);

      // Try to retrieve existing compute shader program from cache
      // 尝试从缓存中检索现有的计算着色器程序
      let stageCompute = this.programs.compute.get(nodeBuilderState.computeShader);

      // If no cached program exists, create a new one
      // 如果不存在缓存的程序，则创建一个新的
      if (stageCompute === undefined) {
        // Release the previous program if it's no longer used
        // 如果先前的程序不再使用，则释放它
        if (previousPipeline && previousPipeline.computeProgram.usedTimes === 0) {
          // Remove the unused program from cache and free GPU resources
          // 从缓存中移除未使用的程序并释放GPU资源
          this._releaseProgram(previousPipeline.computeProgram);
        }

        // Create new programmable stage with compute shader code and metadata
        // 使用计算着色器代码和元数据创建新的可编程阶段
        stageCompute = new ProgrammableStage(
          nodeBuilderState.computeShader, // Shader source code / 着色器源代码
          "compute", // Shader stage type / 着色器阶段类型
          computeNode.name, // Debug name / 调试名称
          nodeBuilderState.transforms, // Transform operations / 变换操作
          nodeBuilderState.nodeAttributes // Node attributes / 节点属性
        );
        // Cache the new program for future reuse
        // 缓存新程序以供将来重用
        this.programs.compute.set(nodeBuilderState.computeShader, stageCompute);

        // Create the actual GPU program through the backend
        // 通过后端创建实际的GPU程序
        backend.createProgram(stageCompute);
      }

      // Generate unique cache key for this pipeline configuration
      // 为此管线配置生成唯一的缓存键
      const cacheKey = this._getComputeCacheKey(computeNode, stageCompute);

      // Try to retrieve existing pipeline from cache
      // 尝试从缓存中检索现有管线
      let pipeline = this.caches.get(cacheKey);

      // If no cached pipeline exists, create a new one
      // 如果不存在缓存的管线，则创建一个新的
      if (pipeline === undefined) {
        // Release the previous pipeline if it's no longer used
        // 如果先前的管线不再使用，则释放它
        if (previousPipeline && previousPipeline.usedTimes === 0) {
          // Remove the unused pipeline from cache
          // 从缓存中移除未使用的管线
          this._releasePipeline(previousPipeline);
        }

        // Create new compute pipeline with all necessary components
        // 使用所有必要组件创建新的计算管线
        pipeline = this._getComputePipeline(computeNode, stageCompute, cacheKey, bindings);
      }

      // Increment usage counters for resource tracking and garbage collection
      // 增加资源跟踪和垃圾回收的使用计数器
      pipeline.usedTimes++; // Track pipeline usage / 跟踪管线使用
      stageCompute.usedTimes++; // Track program usage / 跟踪程序使用

      // Update the data entry with current version and new pipeline
      // 使用当前版本和新管线更新数据条目
      data.version = computeNode.version; // Store current version for change detection / 存储当前版本用于变更检测
      data.pipeline = pipeline; // Store the pipeline reference / 存储管线引用
    }

    // Return the pipeline (either existing or newly created)
    // 返回管线（现有的或新创建的）
    return data.pipeline;
  }

  /**
   * Returns a render pipeline for the given render object.
   * 为给定的渲染对象返回渲染管线。
   *
   * This method manages the complete render pipeline lifecycle for rendering objects:
   * 1. Checks if the render object requires a pipeline update
   * 2. Manages reference counting for existing pipelines and shader programs
   * 3. Generates vertex and fragment shaders through the node system
   * 4. Creates or retrieves shader programs from cache
   * 5. Creates or retrieves render pipelines from cache
   * 6. Handles asynchronous compilation when promises array is provided
   * 7. Updates usage tracking for resource management
   *
   * 该方法管理渲染对象的完整渲染管线生命周期：
   * 1. 检查渲染对象是否需要管线更新
   * 2. 管理现有管线和着色器程序的引用计数
   * 3. 通过节点系统生成顶点和片段着色器
   * 4. 从缓存创建或检索着色器程序
   * 5. 从缓存创建或检索渲染管线
   * 6. 在提供promises数组时处理异步编译
   * 7. 更新资源管理的使用跟踪
   *
   * @param {Object} renderObject - The render object containing geometry, material, and rendering state.
   * @param {?Array<Promise>} [promises=null] - Optional array for async compilation promises (used by Renderer.compileAsync()).
   * @return {RenderPipeline} The render pipeline ready for rendering operations.
   */
  getForRender(renderObject, promises = null) {
    // Extract backend reference for easier access throughout the method
    // 提取后端引用以便在整个方法中更容易访问
    const { backend } = this;

    // Get or create data entry for this render object from the DataMap
    // 从DataMap获取或创建此渲染对象的数据条目
    const data = this.get(renderObject);

    // Check if the render object requires a pipeline update
    // 检查渲染对象是否需要管线更新
    if (this._needsRenderUpdate(renderObject)) {
      // Store reference to the existing pipeline (may be undefined)
      // 存储对现有管线的引用（可能为undefined）
      const previousPipeline = data.pipeline;

      // Decrement usage counters for the previous pipeline if it exists
      // 如果存在先前的管线，则减少其使用计数器
      if (previousPipeline) {
        // Decrement the pipeline's usage counter
        // 减少管线的使用计数器
        previousPipeline.usedTimes--;
        // Decrement the vertex program's usage counter
        // 减少顶点程序的使用计数器
        previousPipeline.vertexProgram.usedTimes--;
        // Decrement the fragment program's usage counter
        // 减少片段程序的使用计数器
        previousPipeline.fragmentProgram.usedTimes--;
      }

      // Get shader build state from the render object's node system
      // 从渲染对象的节点系统获取着色器构建状态
      const nodeBuilderState = renderObject.getNodeBuilderState();

      // Extract material name for debugging purposes (fallback to empty string)
      // 提取材质名称用于调试目的（回退到空字符串）
      const name = renderObject.material ? renderObject.material.name : "";

      // === VERTEX SHADER STAGE PROCESSING ===
      // === 顶点着色器阶段处理 ===

      // Try to retrieve existing vertex shader program from cache
      // 尝试从缓存中检索现有的顶点着色器程序
      let stageVertex = this.programs.vertex.get(nodeBuilderState.vertexShader);

      // If no cached vertex program exists, create a new one
      // 如果不存在缓存的顶点程序，则创建一个新的
      if (stageVertex === undefined) {
        // Release the previous vertex program if it's no longer used
        // 如果先前的顶点程序不再使用，则释放它
        if (previousPipeline && previousPipeline.vertexProgram.usedTimes === 0) {
          // Remove the unused vertex program from cache and free GPU resources
          // 从缓存中移除未使用的顶点程序并释放GPU资源
          this._releaseProgram(previousPipeline.vertexProgram);
        }

        // Create new programmable stage for vertex shader
        // 为顶点着色器创建新的可编程阶段
        stageVertex = new ProgrammableStage(nodeBuilderState.vertexShader, "vertex", name);
        // Cache the new vertex program for future reuse
        // 缓存新的顶点程序以供将来重用
        this.programs.vertex.set(nodeBuilderState.vertexShader, stageVertex);

        // Create the actual GPU vertex program through the backend
        // 通过后端创建实际的GPU顶点程序
        backend.createProgram(stageVertex);
      }

      // === FRAGMENT SHADER STAGE PROCESSING ===
      // === 片段着色器阶段处理 ===

      // Try to retrieve existing fragment shader program from cache
      // 尝试从缓存中检索现有的片段着色器程序
      let stageFragment = this.programs.fragment.get(nodeBuilderState.fragmentShader);

      // If no cached fragment program exists, create a new one
      // 如果不存在缓存的片段程序，则创建一个新的
      if (stageFragment === undefined) {
        // Release the previous fragment program if it's no longer used
        // 如果先前的片段程序不再使用，则释放它
        if (previousPipeline && previousPipeline.fragmentProgram.usedTimes === 0) {
          // Remove the unused fragment program from cache and free GPU resources
          // 从缓存中移除未使用的片段程序并释放GPU资源
          this._releaseProgram(previousPipeline.fragmentProgram);
        }

        // Create new programmable stage for fragment shader
        // 为片段着色器创建新的可编程阶段
        stageFragment = new ProgrammableStage(nodeBuilderState.fragmentShader, "fragment", name);
        // Cache the new fragment program for future reuse
        // 缓存新的片段程序以供将来重用
        this.programs.fragment.set(nodeBuilderState.fragmentShader, stageFragment);

        // Create the actual GPU fragment program through the backend
        // 通过后端创建实际的GPU片段程序
        backend.createProgram(stageFragment);
      }

      // === RENDER PIPELINE PROCESSING ===
      // === 渲染管线处理 ===

      // Generate unique cache key for this render pipeline configuration
      // 为此渲染管线配置生成唯一的缓存键
      const cacheKey = this._getRenderCacheKey(renderObject, stageVertex, stageFragment);

      // Try to retrieve existing render pipeline from cache
      // 尝试从缓存中检索现有的渲染管线
      let pipeline = this.caches.get(cacheKey);

      // If no cached pipeline exists, create a new one
      // 如果不存在缓存的管线，则创建一个新的
      if (pipeline === undefined) {
        // Release the previous pipeline if it's no longer used
        // 如果先前的管线不再使用，则释放它
        if (previousPipeline && previousPipeline.usedTimes === 0) {
          // Remove the unused pipeline from cache
          // 从缓存中移除未使用的管线
          this._releasePipeline(previousPipeline);
        }

        // Create new render pipeline with vertex and fragment stages
        // 使用顶点和片段阶段创建新的渲染管线
        pipeline = this._getRenderPipeline(renderObject, stageVertex, stageFragment, cacheKey, promises);
      } else {
        // If pipeline exists in cache, associate it with the render object
        // 如果管线存在于缓存中，则将其与渲染对象关联
        renderObject.pipeline = pipeline;
      }

      // === USAGE TRACKING ===
      // === 使用跟踪 ===

      // Increment usage counters for resource tracking and garbage collection
      // 增加资源跟踪和垃圾回收的使用计数器
      pipeline.usedTimes++; // Track pipeline usage / 跟踪管线使用
      stageVertex.usedTimes++; // Track vertex program usage / 跟踪顶点程序使用
      stageFragment.usedTimes++; // Track fragment program usage / 跟踪片段程序使用

      // Update the data entry with the new pipeline reference
      // 使用新的管线引用更新数据条目
      data.pipeline = pipeline;
    }

    // Return the pipeline (either existing or newly created)
    // 返回管线（现有的或新创建的）
    return data.pipeline;
  }

  /**
   * Deletes the pipeline data for the given object and manages resource cleanup.
   * 删除给定对象的管线数据并管理资源清理。
   *
   * This method handles proper cleanup of pipeline resources by:
   * 1. Decrementing usage counters for the pipeline and its programs
   * 2. Releasing pipelines and programs when usage reaches zero
   * 3. Handling both compute and render pipeline types appropriately
   * 4. Calling the parent class delete method to remove the data entry
   *
   * 该方法通过以下方式处理管线资源的正确清理：
   * 1. 减少管线及其程序的使用计数器
   * 2. 当使用次数达到零时释放管线和程序
   * 3. 适当处理计算和渲染管线类型
   * 4. 调用父类删除方法来移除数据条目
   *
   * @param {Object} object - The render object or compute node to delete pipeline data for.
   * @return {?Object} The deleted data dictionary from the parent DataMap.
   */
  delete(object) {
    // Get the pipeline associated with this object from the data map
    // 从数据映射中获取与此对象关联的管线
    const pipeline = this.get(object).pipeline;

    // Only proceed with cleanup if a pipeline exists
    // 只有在管线存在时才进行清理
    if (pipeline) {
      // Decrement the pipeline's usage counter to track references
      // 减少管线的使用计数器以跟踪引用
      pipeline.usedTimes--;

      // If no other objects are using this pipeline, remove it from cache
      // 如果没有其他对象使用此管线，则从缓存中移除它
      if (pipeline.usedTimes === 0) {
        // Remove the pipeline from the cache and free GPU resources
        // 从缓存中移除管线并释放GPU资源
        this._releasePipeline(pipeline);
      }

      // Handle shader program cleanup based on pipeline type
      // 根据管线类型处理着色器程序清理
      if (pipeline.isComputePipeline) {
        // === COMPUTE PIPELINE CLEANUP ===
        // === 计算管线清理 ===

        // Decrement the compute program's usage counter
        // 减少计算程序的使用计数器
        pipeline.computeProgram.usedTimes--;

        // If no other pipelines are using this compute program, release it
        // 如果没有其他管线使用此计算程序，则释放它
        if (pipeline.computeProgram.usedTimes === 0) {
          // Remove the compute program from cache and free GPU resources
          // 从缓存中移除计算程序并释放GPU资源
          this._releaseProgram(pipeline.computeProgram);
        }
      } else {
        // === RENDER PIPELINE CLEANUP ===
        // === 渲染管线清理 ===

        // Decrement the fragment program's usage counter
        // 减少片段程序的使用计数器
        pipeline.fragmentProgram.usedTimes--;
        // Decrement the vertex program's usage counter
        // 减少顶点程序的使用计数器
        pipeline.vertexProgram.usedTimes--;

        // If no other pipelines are using the vertex program, release it
        // 如果没有其他管线使用顶点程序，则释放它
        if (pipeline.vertexProgram.usedTimes === 0) {
          // Remove the vertex program from cache and free GPU resources
          // 从缓存中移除顶点程序并释放GPU资源
          this._releaseProgram(pipeline.vertexProgram);
        }
        // If no other pipelines are using the fragment program, release it
        // 如果没有其他管线使用片段程序，则释放它
        if (pipeline.fragmentProgram.usedTimes === 0) {
          // Remove the fragment program from cache and free GPU resources
          // 从缓存中移除片段程序并释放GPU资源
          this._releaseProgram(pipeline.fragmentProgram);
        }
      }
    }

    // Call parent class delete method to remove the object from the data map
    // 调用父类删除方法从数据映射中移除对象
    return super.delete(object);
  }

  /**
   * Frees all internal resources and resets the pipeline manager.
   * 释放所有内部资源并重置管线管理器。
   *
   * This method performs complete cleanup of the pipeline manager by:
   * 1. Calling the parent dispose method to clear the data map
   * 2. Clearing all cached pipelines
   * 3. Clearing all shader program caches for all stages
   *
   * 该方法通过以下方式执行管线管理器的完整清理：
   * 1. 调用父类dispose方法清除数据映射
   * 2. 清除所有缓存的管线
   * 3. 清除所有阶段的所有着色器程序缓存
   */
  dispose() {
    // Call parent class dispose to clear the data map and free base resources
    // 调用父类dispose清除数据映射并释放基础资源
    super.dispose();

    // Create a new empty Map to clear all cached pipeline references
    // 创建新的空Map以清除所有缓存的管线引用
    this.caches = new Map();

    // Reset all shader program caches to empty Maps for each stage type
    // 将所有着色器程序缓存重置为每个阶段类型的空Map
    this.programs = {
      vertex: new Map(), // Clear vertex shader program cache / 清除顶点着色器程序缓存
      fragment: new Map(), // Clear fragment shader program cache / 清除片段着色器程序缓存
      compute: new Map(), // Clear compute shader program cache / 清除计算着色器程序缓存
    };
  }

  /**
   * Updates the pipeline for the given render object.
   * 更新给定渲染对象的管线。
   *
   * This is a convenience method that triggers pipeline update by calling
   * getForRender, which will create or update the pipeline as needed.
   *
   * 这是一个便利方法，通过调用getForRender触发管线更新，
   * 它将根据需要创建或更新管线。
   *
   * @param {Object} renderObject - The render object to update pipeline for.
   */
  updateForRender(renderObject) {
    // Trigger pipeline update/creation by calling the main getForRender method
    // 通过调用主要的getForRender方法触发管线更新/创建
    this.getForRender(renderObject);
  }

  /**
   * Creates or retrieves a compute pipeline for the given parameters.
   * 为给定参数创建或检索计算管线。
   *
   * This internal method handles the actual creation of compute pipelines:
   * 1. Generates or uses provided cache key
   * 2. Checks cache for existing pipeline
   * 3. Creates new ComputePipeline instance if not found
   * 4. Delegates to backend for GPU resource creation
   * 5. Caches the pipeline for future reuse
   *
   * 该内部方法处理计算管线的实际创建：
   * 1. 生成或使用提供的缓存键
   * 2. 检查缓存中的现有管线
   * 3. 如果未找到则创建新的ComputePipeline实例
   * 4. 委托给后端进行GPU资源创建
   * 5. 缓存管线以供将来重用
   *
   * @private
   * @param {Object} computeNode - The compute node containing shader configuration.
   * @param {ProgrammableStage} stageCompute - The programmable stage with compiled compute shader.
   * @param {string} cacheKey - The cache key for pipeline identification.
   * @param {Array<Object>} bindings - The resource bindings for the compute operation.
   * @return {ComputePipeline} The compute pipeline ready for execution.
   */
  _getComputePipeline(computeNode, stageCompute, cacheKey, bindings) {
    // Generate cache key if not provided (fallback safety mechanism)
    // 如果未提供缓存键则生成（回退安全机制）
    cacheKey = cacheKey || this._getComputeCacheKey(computeNode, stageCompute);

    // Attempt to retrieve existing pipeline from the cache using the key
    // 尝试使用键从缓存中检索现有管线
    let pipeline = this.caches.get(cacheKey);

    // Only create a new pipeline if none exists in cache
    // 只有在缓存中不存在管线时才创建新的管线
    if (pipeline === undefined) {
      // Instantiate a new ComputePipeline with cache key and compute stage
      // 使用缓存键和计算阶段实例化新的ComputePipeline
      pipeline = new ComputePipeline(cacheKey, stageCompute);

      // Store the new pipeline in cache for future lookups
      // 将新管线存储在缓存中以供将来查找
      this.caches.set(cacheKey, pipeline);

      // Delegate to backend to create the actual GPU compute pipeline
      // 委托给后端创建实际的GPU计算管线
      this.backend.createComputePipeline(pipeline, bindings);
    }

    // Return the pipeline (either cached or newly created)
    // 返回管线（缓存的或新创建的）
    return pipeline;
  }

  /**
   * Creates or retrieves a render pipeline for the given parameters.
   * 为给定参数创建或检索渲染管线。
   *
   * This internal method handles the actual creation of render pipelines:
   * 1. Generates or uses provided cache key
   * 2. Checks cache for existing pipeline
   * 3. Creates new RenderPipeline instance if not found
   * 4. Associates pipeline with render object
   * 5. Delegates to backend for GPU resource creation (with async support)
   * 6. Caches the pipeline for future reuse
   *
   * 该内部方法处理渲染管线的实际创建：
   * 1. 生成或使用提供的缓存键
   * 2. 检查缓存中的现有管线
   * 3. 如果未找到则创建新的RenderPipeline实例
   * 4. 将管线与渲染对象关联
   * 5. 委托给后端进行GPU资源创建（支持异步）
   * 6. 缓存管线以供将来重用
   *
   * @private
   * @param {Object} renderObject - The render object containing geometry and material.
   * @param {ProgrammableStage} stageVertex - The programmable stage with compiled vertex shader.
   * @param {ProgrammableStage} stageFragment - The programmable stage with compiled fragment shader.
   * @param {string} cacheKey - The cache key for pipeline identification.
   * @param {?Array<Promise>} promises - Optional array for async compilation promises.
   * @return {RenderPipeline} The render pipeline ready for rendering operations.
   */
  _getRenderPipeline(renderObject, stageVertex, stageFragment, cacheKey, promises) {
    // Generate cache key if not provided (fallback safety mechanism)
    // 如果未提供缓存键则生成（回退安全机制）
    cacheKey = cacheKey || this._getRenderCacheKey(renderObject, stageVertex, stageFragment);

    // Attempt to retrieve existing pipeline from the cache using the key
    // 尝试使用键从缓存中检索现有管线
    let pipeline = this.caches.get(cacheKey);

    // Only create a new pipeline if none exists in cache
    // 只有在缓存中不存在管线时才创建新的管线
    if (pipeline === undefined) {
      // Instantiate a new RenderPipeline with cache key and both shader stages
      // 使用缓存键和两个着色器阶段实例化新的RenderPipeline
      pipeline = new RenderPipeline(cacheKey, stageVertex, stageFragment);

      // Store the new pipeline in cache for future lookups
      // 将新管线存储在缓存中以供将来查找
      this.caches.set(cacheKey, pipeline);

      // Establish bidirectional reference between render object and pipeline
      // 在渲染对象和管线之间建立双向引用
      renderObject.pipeline = pipeline;

      // Delegate to backend to create the actual GPU render pipeline
      // The promises parameter supports asynchronous compilation workflows
      // 委托给后端创建实际的GPU渲染管线
      // promises参数支持异步编译工作流
      this.backend.createRenderPipeline(renderObject, promises);
    }

    // Return the pipeline (either cached or newly created)
    // 返回管线（缓存的或新创建的）
    return pipeline;
  }

  /**
   * Computes a unique cache key for compute pipeline identification.
   * 计算计算管线识别的唯一缓存键。
   *
   * The cache key combines the compute node ID and compute stage ID to create
   * a unique identifier for the compute pipeline configuration. This ensures
   * that pipelines with identical compute shaders can be efficiently reused.
   *
   * 缓存键结合计算节点ID和计算阶段ID来创建计算管线配置的唯一标识符。
   * 这确保具有相同计算着色器的管线可以被高效重用。
   *
   * @private
   * @param {Object} computeNode - The compute node containing shader configuration.
   * @param {ProgrammableStage} stageCompute - The programmable stage with compute shader.
   * @return {string} The unique cache key for the compute pipeline.
   */
  _getComputeCacheKey(computeNode, stageCompute) {
    // Concatenate compute node ID and stage ID with comma separator
    // 使用逗号分隔符连接计算节点ID和阶段ID
    return computeNode.id + "," + stageCompute.id;
  }

  /**
   * Computes a unique cache key for render pipeline identification.
   * 计算渲染管线识别的唯一缓存键。
   *
   * The cache key combines vertex stage ID, fragment stage ID, and backend-specific
   * render state to create a unique identifier for the render pipeline configuration.
   * This enables efficient reuse of pipelines with identical shader and state combinations.
   *
   * 缓存键结合顶点阶段ID、片段阶段ID和后端特定的渲染状态来创建渲染管线配置的唯一标识符。
   * 这使得具有相同着色器和状态组合的管线能够被高效重用。
   *
   * @private
   * @param {Object} renderObject - The render object containing geometry and material.
   * @param {ProgrammableStage} stageVertex - The programmable stage with vertex shader.
   * @param {ProgrammableStage} stageFragment - The programmable stage with fragment shader.
   * @return {string} The unique cache key for the render pipeline.
   */
  _getRenderCacheKey(renderObject, stageVertex, stageFragment) {
    // Combine vertex ID, fragment ID, and backend-specific render state
    // 组合顶点ID、片段ID和后端特定的渲染状态
    return stageVertex.id + "," + stageFragment.id + "," + this.backend.getRenderCacheKey(renderObject);
  }

  /**
   * Releases a pipeline from the cache.
   * 从缓存中释放管线。
   *
   * This method removes the pipeline from the internal cache using its cache key.
   * It should only be called when the pipeline's usage count reaches zero.
   *
   * 该方法使用缓存键从内部缓存中移除管线。
   * 只有当管线的使用计数达到零时才应调用此方法。
   *
   * @private
   * @param {Object} pipeline - The pipeline object to release from cache.
   */
  _releasePipeline(pipeline) {
    // Remove the pipeline from cache using its unique cache key
    // 使用其唯一缓存键从缓存中移除管线
    this.caches.delete(pipeline.cacheKey);
  }

  /**
   * Releases a shader program from the appropriate stage cache.
   * 从相应的阶段缓存中释放着色器程序。
   *
   * This method removes the shader program from the stage-specific cache
   * (vertex, fragment, or compute) using the program's shader code as the key.
   * It should only be called when the program's usage count reaches zero.
   *
   * 该方法使用程序的着色器代码作为键，从特定阶段的缓存（顶点、片段或计算）中移除着色器程序。
   * 只有当程序的使用计数达到零时才应调用此方法。
   *
   * @private
   * @param {Object} program - The shader program to release from cache.
   * @param {string} program.code - The shader source code used as cache key.
   * @param {string} program.stage - The shader stage ('vertex', 'fragment', or 'compute').
   */
  _releaseProgram(program) {
    // Extract the shader source code to use as the cache key
    // 提取着色器源代码用作缓存键
    const code = program.code;
    // Extract the shader stage type to determine which cache to access
    // 提取着色器阶段类型以确定要访问哪个缓存
    const stage = program.stage;

    // Remove the program from the appropriate stage-specific cache
    // 从相应的特定阶段缓存中移除程序
    this.programs[stage].delete(code);
  }

  /**
   * Determines if a compute pipeline update is required for the given compute node.
   * 确定给定计算节点是否需要计算管线更新。
   *
   * A compute pipeline update is required when:
   * 1. No pipeline exists for the compute node
   * 2. The compute node version has changed since the last pipeline creation
   *
   * 在以下情况下需要计算管线更新：
   * 1. 计算节点不存在管线
   * 2. 自上次管线创建以来计算节点版本已更改
   *
   * @private
   * @param {Object} computeNode - The compute node to check for updates.
   * @return {boolean} True if the compute pipeline requires an update, false otherwise.
   */
  _needsComputeUpdate(computeNode) {
    // Get the data entry for this compute node from the DataMap
    // 从DataMap获取此计算节点的数据条目
    const data = this.get(computeNode);

    // Return true if no pipeline exists OR if the node version has changed
    // 如果不存在管线或节点版本已更改则返回true
    return data.pipeline === undefined || data.version !== computeNode.version;
  }

  /**
   * Determines if a render pipeline update is required for the given render object.
   * 确定给定渲染对象是否需要渲染管线更新。
   *
   * A render pipeline update is required when:
   * 1. No pipeline exists for the render object
   * 2. The backend determines that the render state has changed
   *    (e.g., material properties, geometry attributes, render state changes)
   *
   * 在以下情况下需要渲染管线更新：
   * 1. 渲染对象不存在管线
   * 2. 后端确定渲染状态已更改
   *    （例如，材质属性、几何属性、渲染状态更改）
   *
   * @private
   * @param {Object} renderObject - The render object to check for updates.
   * @return {boolean} True if the render pipeline requires an update, false otherwise.
   */
  _needsRenderUpdate(renderObject) {
    // Get the data entry for this render object from the DataMap
    // 从DataMap获取此渲染对象的数据条目
    const data = this.get(renderObject);

    // Return true if no pipeline exists OR if backend detects render state changes
    // 如果不存在管线或后端检测到渲染状态更改则返回true
    return data.pipeline === undefined || this.backend.needsRenderUpdate(renderObject);
  }
}

// Export the Pipelines class as the default export for this module
// 将Pipelines类作为此模块的默认导出
export default Pipelines;
