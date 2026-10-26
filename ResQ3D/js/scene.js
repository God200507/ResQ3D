import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070d16);
scene.fog = new THREE.FogExp2(0x070d16, 0.0032);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 3000);
camera.position.set(52, 38, 58);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
document.getElementById('app').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 9, 0);
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 10;
controls.maxDistance = 220;

/* LIGHTING */
scene.add(new THREE.HemisphereLight(0x9dc4ff, 0x141c26, 0.85));
const sun = new THREE.DirectionalLight(0xfff0dc, 1.15);
sun.position.set(70, 110, 55);
sun.castShadow = false;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
sun.shadow.camera.top = 70;   sun.shadow.camera.bottom = -70;
sun.shadow.camera.near = 1;   sun.shadow.camera.far = 320;
sun.shadow.bias = -0.0008;
scene.add(sun);
scene.add(new THREE.DirectionalLight(0x7fa8ff, 0.34).translateX(-60).translateY(40).translateZ(-70));
scene.add(new THREE.DirectionalLight(0x00d4ff, 0.22).translateY(20).translateZ(-90));

/* GROUPS */
const worldGroup    = new THREE.Group(); scene.add(worldGroup);
const siteGroup     = new THREE.Group(); worldGroup.add(siteGroup);
const buildingGroup = new THREE.Group(); worldGroup.add(buildingGroup);
const simGroup      = new THREE.Group(); worldGroup.add(simGroup);
const floorGroups   = [];


export { scene, camera, renderer, controls, worldGroup, siteGroup, buildingGroup, simGroup, floorGroups };
