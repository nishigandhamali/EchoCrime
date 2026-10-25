import * as THREE from 'three'

/** Point the camera is looking at: written by the orbit rig (overview) or the player rig (explore), read by Wall. */
export const viewTarget = new THREE.Vector3(1.5, 0, -0.5)

/** Last detective position, so toggling overview <-> explore resumes where they stood. */
export const playerSave = { x: 0, z: 0, valid: false, nonce: -1, camYaw: 0 }
