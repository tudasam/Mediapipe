import { mediapipe } from 'vite-plugin-mediapipe';
import { defineConfig } from 'vite'

export default defineConfig(config => {
	return {
		plugins: [
			mediapipe({
				'holistic.js': [
					'VERSION',
					'POSE_CONNECTIONS',
					'HAND_CONNECTIONS',
					'FACEMESH_TESSELATION',
					'Holistic'
				]
			})
		]
	}
});