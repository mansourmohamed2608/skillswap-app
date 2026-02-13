export const HEADER_HEIGHT = 64; // Keep in sync with header visual height

// Shared fade behavior across screens and header
export const FADE_SCROLL_DISTANCE = 36; // reach the glassy state even faster
export const computeFade = (y: number) => {
	'worklet';
	const t = y / FADE_SCROLL_DISTANCE;
	const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
	// Ease-out cubic for faster fade near the top: 1 - (1 - t)^3
	const eased = 1 - Math.pow(1 - clamped, 3);
	return eased;
};

// Visual tuning for header glass effect
export const OVERLAY_OPACITY_TOP = 0.9; // slightly less opaque at the very top
export const OVERLAY_OPACITY_BOTTOM = 0.0; // fully clear overlay at max fade so content is visible through blur
export const SHADOW_OPACITY_MAX = 0.10; // subtle separation only
export const ELEVATION_MAX = 4; // balanced with lighter shadow
export const BLUR_INTENSITY_MIN = 8;
export const BLUR_INTENSITY_MAX = 60; // reduce maximum to avoid milky look under bright backgrounds
