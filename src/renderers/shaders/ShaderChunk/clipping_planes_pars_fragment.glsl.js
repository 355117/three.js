export default /* glsl */`
#if NUM_CLIPPING_PLANES > 0 // 若启用裁剪平面（片元着色器侧）

	varying vec3 vClipPosition; // 片元着色器接收的裁剪空间位置（来自顶点着色器）

	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ]; // 裁剪平面数组（xyz 法线，w 距离）

#endif // 结束：NUM_CLIPPING_PLANES 条件
`;
