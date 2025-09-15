export default /* glsl */`
#if NUM_CLIPPING_PLANES > 0 // 若启用裁剪平面

	vClipPosition = - mvPosition.xyz; // 计算用于裁剪的坐标（取反以匹配片元侧公式）

#endif // 结束：NUM_CLIPPING_PLANES 条件
`;
