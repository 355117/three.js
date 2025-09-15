export default /* glsl */`
#if NUM_CLIPPING_PLANES > 0 // 若启用裁剪平面（顶点着色器侧）

	varying vec3 vClipPosition; // 传递到片元着色器的裁剪空间位置变量

#endif // 结束：NUM_CLIPPING_PLANES 条件
`;
