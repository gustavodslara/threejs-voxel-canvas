/* v2.0 - Optimized */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import i18n from 'i18n';

const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

const updateURLWithSession = sessionId => {
  const url = new URL(window.location);
  url.searchParams.set('session', sessionId);
  window.history.replaceState({}, '', url);
};

const getOrCreateSessionId = () => {
  const urlParams = new URLSearchParams(window.location.search);
  let sessionId = urlParams.get('session');
  
  if (sessionId) {
    localStorage.setItem('pixel-canvas-session', sessionId);
    return { sessionId, isNew: false };
  }
  
  sessionId = generateUUID();
  localStorage.setItem('pixel-canvas-session', sessionId);
  updateURLWithSession(sessionId);
  return { sessionId, isNew: true };
};

const sessionInfo = getOrCreateSessionId();
const SESSION_ID = sessionInfo.sessionId;
const IS_NEW_SESSION = sessionInfo.isNew;

const checkCookieConsent = () => {
  if (!localStorage.getItem('cookie-consent')) {
    document.getElementById('cookie-consent')?.classList.remove('hidden');
  }
};

window.acceptCookies = () => {
  localStorage.setItem('cookie-consent', 'accepted');
  document.getElementById('cookie-consent')?.classList.add('hidden');
};

window.declineCookies = () => {
  localStorage.setItem('cookie-consent', 'declined');
  document.getElementById('cookie-consent')?.classList.add('hidden');
  showNotification(i18n.t('cookies.note'), 'info');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkCookieConsent);
} else {
  checkCookieConsent();
}

const saveSessionState = () => {
  const state = {
    mode: voxelMode,
    gridWidth,
    gridHeight,
    voxelWidth,
    voxelHeight,
    voxelDepth,
    cubes: cubes.map(cube => ({
      x: cube.position.x,
      y: cube.position.y,
      z: cube.position.z,
      color: '#' + cube.material.color.getHexString()
    })),
    timestamp: Date.now()
  };
  localStorage.setItem(`session-state-${SESSION_ID}`, JSON.stringify(state));
};

const loadSessionState = () => {
  const stateStr = localStorage.getItem(`session-state-${SESSION_ID}`);
  if (!stateStr) return null;
  
  try {
    return JSON.parse(stateStr);
  } catch (e) {
    console.error('Failed to parse session state:', e);
    return null;
  }
};

const clearSessionState = () => {
  localStorage.removeItem(`session-state-${SESSION_ID}`);
  localStorage.removeItem('pixel-canvas-session');
};

const restoreSession = state => {
  const loadingOverlay = document.getElementById('session-loading');
  loadingOverlay?.classList.remove('hidden');
  
  setTimeout(() => {
    document.getElementById('startup-modal').style.display = 'none';
    
    if (state.mode === 'single') {
      createSingleCube();
    } else if (state.mode === 'grid') {
      createWall(state.gridWidth || 8, state.gridHeight || 8);
    }
    
    cubes.forEach(cube => {
      scene.remove(cube);
      cube.geometry.dispose();
      cube.material.dispose();
    });
    cubes = [];
    
    state.cubes.forEach(cubeData => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ 
        color: cubeData.color,
        roughness: 0.7,
        metalness: 0.3
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(cubeData.x, cubeData.y, cubeData.z);
      scene.add(cube);
      cubes.push(cube);
    });
    
    createGhostCube();
    animate();
    loadingOverlay?.classList.add('hidden');
    showNotification(i18n.t('loading.success'), 'success');
  }, 100);
};

let saveTimeout;
const autoSaveState = () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveSessionState, 1000);
};

window.addEventListener('DOMContentLoaded', () => {
  const savedState = loadSessionState();
  if (!IS_NEW_SESSION && savedState?.cubes.length > 0) {
    restoreSession(savedState);
  }
  // Load AI configuration
  loadAIConfig();
});

let currentLocale = 'en-US';
i18n.init().then(locale => {
  currentLocale = locale;
  updateLanguageSwitcher(locale);
});

window.addEventListener('languageChanged', e => {
  currentLocale = e.detail.locale;
  updateLanguageSwitcher(e.detail.locale);
});

window.changeLanguage = async locale => await i18n.changeLanguage(locale);

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
    e.preventDefault();
    redo();
  }
});

const updateLanguageSwitcher = locale => {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === locale);
  });
};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0x222230);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const createLight = (color, intensity, position) => {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...position);
  if (intensity > 0.4) light.castShadow = true;
  return light;
};

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
scene.add(createLight(0xffffff, 0.5, [5, 5, 5]));
scene.add(createLight(0xffffff, 0.3, [-5, 5, -5]));
scene.add(createLight(0xffffff, 0.3, [5, -5, -5]));
scene.add(createLight(0xffffff, 0.2, [-5, -5, 5]));

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(10, 10, 10);
controls.update();

const animate = () => {
  requestAnimationFrame(animate);
  controls.update();
  if (interactionMode === 'add' && ghostCube) updateGhostCube();
  renderer.render(scene, camera);
};

const geometry = new THREE.BoxGeometry(1, 1, 1);
let interactionMode = 'paint';
let ghostCube = null;
let gridWidth = 8;
let gridHeight = 8;
let voxelWidth = 16;
let voxelHeight = 16;
let voxelDepth = 16;
let cubes = [];
let voxelMode = 'grid';

const createCube = (color, position, userData) => {
  const material = new THREE.MeshStandardMaterial({ 
    color,
    roughness: 0.7,
    metalness: color === 0xaaaaaa ? 0.2 : 0.3
  });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(...position);
  cube.userData = userData;
  cube.castShadow = true;
  cube.receiveShadow = true;
  return cube;
};

const createWall = (width, height) => {
  cubes.forEach(cube => {
    scene.remove(cube);
    cube.geometry.dispose();
    cube.material.dispose();
  });
  cubes = [];
  
  for (let x = -width / 2; x <= width / 2; x++) {
    for (let y = -height / 2; y <= height / 2; y++) {
      const cube = createCube(0xaaaaaa, [1.05 * x, 1.05 * y, 0], { x, y, z: 0 });
      scene.add(cube);
      cubes.push(cube);
    }
  }
  
  gridWidth = width;
  gridHeight = height;
  voxelMode = 'grid';
  updateCameraForGrid(width, height);
  history = [];
  historyIndex = -1;
  saveState();
};

const createSingleCube = () => {
  cubes.forEach(cube => {
    scene.remove(cube);
    cube.geometry.dispose();
    cube.material.dispose();
  });
  cubes = [];
  
  const cube = createCube(0xaaaaaa, [0, 0, 0], { x: 0, y: 0, z: 0 });
  scene.add(cube);
  cubes.push(cube);
  
  voxelMode = 'single';
  camera.position.set(3, 3, 3);
  controls.target.set(0, 0, 0);
  controls.update();
  history = [];
  historyIndex = -1;
  saveState();
};

const createGhostCube = () => {
  const material = new THREE.MeshStandardMaterial({ 
    color: colors[activeColor],
    transparent: true,
    opacity: 0.5,
    roughness: 0.7,
    metalness: 0.2
  });
  ghostCube = new THREE.Mesh(geometry, material);
  ghostCube.visible = false;
  scene.add(ghostCube);
};

const updateGhostCube = () => {
  if (!ghostCube) return;
};

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const onMouseMove = ev => {
  mouse.set(
    (ev.clientX / renderer.domElement.clientWidth) * 2 - 1,
    -(ev.clientY / renderer.domElement.clientHeight) * 2 + 1
  );
  
  if (interactionMode === 'add' && ghostCube) {
    raycaster.setFromCamera(mouse, camera);
    const intersections = raycaster.intersectObjects(cubes, true);
    
    if (intersections.length > 0) {
      const { face, object: cube } = intersections[0];
      const newPos = new THREE.Vector3()
        .copy(cube.position)
        .add(face.normal.multiplyScalar(1.05));
      
      newPos.x = Math.round(newPos.x / 1.05) * 1.05;
      newPos.y = Math.round(newPos.y / 1.05) * 1.05;
      newPos.z = Math.round(newPos.z / 1.05) * 1.05;
      
      const exists = cubes.some(c => 
        Math.abs(c.position.x - newPos.x) < 0.01 &&
        Math.abs(c.position.y - newPos.y) < 0.01 &&
        Math.abs(c.position.z - newPos.z) < 0.01
      );
      
      if (!exists) {
        ghostCube.position.copy(newPos);
        ghostCube.visible = true;
        ghostCube.material.color.setHex(colors[activeColor]);
      } else {
        ghostCube.visible = false;
      }
    } else {
      ghostCube.visible = false;
    }
  }
};

let history = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

const saveState = () => {
  history = history.slice(0, historyIndex + 1);
  const state = cubes.map(cube => ({
    x: cube.userData.x,
    y: cube.userData.y,
    z: cube.userData.z,
    px: cube.position.x,
    py: cube.position.y,
    pz: cube.position.z,
    color: cube.material.color.getHex()
  }));
  
  history.push(state);
  if (history.length > MAX_HISTORY) {
    history.shift();
  } else {
    historyIndex++;
  }
  updateUndoRedoButtons();
};

const restoreState = state => {
  cubes.forEach(cube => {
    scene.remove(cube);
    cube.geometry.dispose();
    cube.material.dispose();
  });
  cubes = [];
  
  state.forEach(cubeState => {
    const cube = createCube(cubeState.color, [cubeState.px, cubeState.py, cubeState.pz], {
      x: cubeState.x,
      y: cubeState.y,
      z: cubeState.z
    });
    scene.add(cube);
    cubes.push(cube);
  });
};

const updateUndoRedoButtons = () => {
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  if (undoBtn) undoBtn.disabled = historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1;
};

window.undo = () => {
  if (historyIndex > 0) {
    historyIndex--;
    restoreState(history[historyIndex]);
    updateUndoRedoButtons();
    autoSaveState();
    showNotification(i18n.t('notifications.undo'), 'success');
  }
};

window.redo = () => {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    restoreState(history[historyIndex]);
    updateUndoRedoButtons();
    autoSaveState();
    showNotification(i18n.t('notifications.redo'), 'success');
  }
};

const onMouseDown = ev => {
  const coords = {
    x: (ev.clientX / renderer.domElement.clientWidth) * 2 - 1,
    y: -(ev.clientY / renderer.domElement.clientHeight) * 2 + 1
  };

  raycaster.setFromCamera(coords, camera);
  const intersections = raycaster.intersectObjects(cubes, true);
  
  if (ev.button === 0) {
    if (interactionMode === 'paint' && intersections.length > 0) {
      const selectedObject = intersections[0].object;
      const oldColor = selectedObject.material.color.getHex();
      const newColor = colors[activeColor];
      
      if (oldColor !== newColor) {
        saveState();
        selectedObject.material.color.setHex(newColor);
        autoSaveState();
      }
    } else if (interactionMode === 'add' && intersections.length > 0) {
      if (cubes.length <= 1) {
        showNotification(i18n.t('notifications.cannotRemoveLastCube'), 'warning');
        return;
      }
      
      const cubeToRemove = intersections[0].object;
      saveState();
      scene.remove(cubeToRemove);
      cubeToRemove.geometry.dispose();
      cubeToRemove.material.dispose();
      cubes.splice(cubes.indexOf(cubeToRemove), 1);
      autoSaveState();
    }
  } else if (ev.button === 2 && interactionMode === 'add' && intersections.length > 0) {
    const { face, object: cube } = intersections[0];
    const newPos = new THREE.Vector3()
      .copy(cube.position)
      .add(face.normal.multiplyScalar(1.05));
    
    newPos.x = Math.round(newPos.x / 1.05) * 1.05;
    newPos.y = Math.round(newPos.y / 1.05) * 1.05;
    newPos.z = Math.round(newPos.z / 1.05) * 1.05;
    
    const exists = cubes.some(c => 
      Math.abs(c.position.x - newPos.x) < 0.01 &&
      Math.abs(c.position.y - newPos.y) < 0.01 &&
      Math.abs(c.position.z - newPos.z) < 0.01
    );
    
    if (!exists) {
      saveState();
      const newCube = createCube(colors[activeColor], [newPos.x, newPos.y, newPos.z], {
        x: Math.round(newPos.x / 1.05),
        y: Math.round(newPos.y / 1.05),
        z: Math.round(newPos.z / 1.05)
      });
      scene.add(newCube);
      cubes.push(newCube);
      autoSaveState();
    }
  }
};

document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('contextmenu', e => e.preventDefault());

let activeColor = 'gray';
const colors = {
  gray: 0xaaaaaa,
  white: 0xffffff,
  red: 0xff0000,
  orange: 0xff8000,
  yellow: 0xffff00,
  green: 0x00ff00,
  blue: 0x0000ff,
  purple: 0x8000ff,
  pink: 0xff00ff
};

let colorPickerAction = 'add';
let replaceTargetId = null;

window.setColor = ev => {
  document.getElementById(activeColor).classList.remove('selected');
  activeColor = ev.target.id;
  document.getElementById(activeColor).classList.add('selected');
};

window.toggleColorPicker = () => {
  const modal = document.getElementById('color-picker-modal');
  modal.classList.toggle('show');
  
  if (modal.classList.contains('show')) {
    colorPickerAction = 'add';
    document.getElementById('action-add').classList.add('selected');
    document.getElementById('action-replace').classList.remove('selected');
    document.getElementById('replace-target-container').classList.add('hidden');
    document.getElementById('color-picker-input').value = '#808080';
    document.getElementById('hex-input').value = '#808080';
    replaceTargetId = null;
  }
};

window.handleAddNewColor = () => {
  const hexColor = document.getElementById('color-picker-input').value;
  
  if (colorExists(hexColor)) {
    showNotification(i18n.t('notifications.colorExists'), 'warning');
    highlightExistingColor(hexColor);
    return;
  }
  
  if (document.querySelectorAll('.color-button').length >= 20) {
    showNotification(i18n.t('notifications.maxColorsReached'), 'error');
    return;
  }
  
  addColorButton(generateColorName(hexColor), hexColor);
  showNotification(i18n.t('notifications.colorAdded'), 'success');
  toggleColorPicker();
};

window.setAction = action => {
  colorPickerAction = action;
  document.getElementById('action-add').classList.remove('selected');
  document.getElementById('action-replace').classList.remove('selected');
  document.getElementById(`action-${action}`).classList.add('selected');
  
  const replaceContainer = document.getElementById('replace-target-container');
  if (action === 'replace') {
    replaceContainer.classList.remove('hidden');
    populateReplaceButtons();
  } else {
    replaceContainer.classList.add('hidden');
    replaceTargetId = null;
  }
};

const populateReplaceButtons = () => {
  const container = document.getElementById('replace-buttons');
  container.innerHTML = '';
  
  document.querySelectorAll('.color-button').forEach(btn => {
    const replaceBtn = document.createElement('button');
    replaceBtn.className = 'replace-color-option w-12 h-12 rounded-lg cursor-pointer';
    replaceBtn.style.backgroundColor = btn.style.backgroundColor;
    replaceBtn.dataset.colorId = btn.id;
    
    const rgb = hexToRgb(rgbToHex(btn.style.backgroundColor));
    if (rgb && isLightColor(rgb)) {
      replaceBtn.classList.add('ring-1', 'ring-gray-300');
    }
    
    replaceBtn.onclick = function() {
      const hexColor = document.getElementById('color-picker-input').value;
      const targetId = this.dataset.colorId;
      
      if (colorExists(hexColor, targetId)) {
        showNotification(i18n.t('notifications.colorExists'), 'warning');
        return;
      }
      
      replaceColor(targetId, generateColorName(hexColor), hexColor);
      showNotification(i18n.t('notifications.colorReplaced'), 'success');
      toggleColorPicker();
    };
    
    container.appendChild(replaceBtn);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const colorInput = document.getElementById('color-picker-input');
  const hexInput = document.getElementById('hex-input');
  
  if (colorInput && hexInput) {
    colorInput.addEventListener('input', e => hexInput.value = e.target.value.toUpperCase());
    hexInput.addEventListener('input', e => {
      let value = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(value)) colorInput.value = value;
    });
  }
});

const colorExists = (hexColor, excludeId = null) => {
  const normalizedHex = hexColor.toLowerCase();
  return Array.from(document.querySelectorAll('.color-button')).some(btn => 
    btn.id !== excludeId && rgbToHex(btn.style.backgroundColor).toLowerCase() === normalizedHex
  );
};

const generateColorName = hexColor => `color_${hexColor.replace('#', '')}_${Date.now().toString(36)}`;

const showNotification = (message, type = 'info') => {
  const bgColors = { success: 'bg-green-500', warning: 'bg-yellow-500', error: 'bg-red-500', info: 'bg-blue-500' };
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 ${bgColors[type] || bgColors.info} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300`;
  notification.textContent = message;
  notification.style.transform = 'translateX(400px)';
  
  document.body.appendChild(notification);
  setTimeout(() => notification.style.transform = 'translateX(0)', 10);
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
};

const highlightExistingColor = hexColor => {
  const normalizedHex = hexColor.toLowerCase();
  document.querySelectorAll('.color-button').forEach(btn => {
    if (rgbToHex(btn.style.backgroundColor).toLowerCase() === normalizedHex) {
      btn.style.animation = 'pulse 0.5s ease-in-out 3';
    }
  });
};

const addColorButton = (id, hexColor) => {
  colors[id] = parseInt(hexColor.replace('#', '0x'));
  const colorToolbar = document.getElementById('color-toolbar');
  const addButton = document.getElementById('add-color-btn');
  const newButton = document.createElement('button');
  
  newButton.id = id;
  newButton.className = 'color-button w-12 h-12 border-none rounded-lg cursor-pointer transition-all duration-200 hover:scale-110 flex-shrink-0';
  newButton.style.backgroundColor = hexColor;
  newButton.onclick = setColor;
  
  const rgb = hexToRgb(hexColor);
  if (rgb && isLightColor(rgb)) {
    newButton.classList.add('ring-1', 'ring-gray-300');
  }
  
  addButton.parentElement.insertBefore(newButton, addButton);
};

const replaceColor = (targetId, newId, hexColor) => {
  const targetButton = document.getElementById(targetId);
  if (!targetButton) return;
  
  delete colors[targetId];
  colors[newId] = parseInt(hexColor.replace('#', '0x'));
  
  targetButton.id = newId;
  targetButton.style.backgroundColor = hexColor;
  targetButton.classList.remove('ring-1', 'ring-gray-300');
  
  const rgb = hexToRgb(hexColor);
  if (isLightColor(rgb)) {
    targetButton.classList.add('ring-1', 'ring-gray-300');
  }
  
  if (activeColor === targetId) activeColor = newId;
};

const hexToRgb = hex => {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const rgbToHex = rgb => {
  if (!rgb) return '#000000';
  if (rgb.startsWith('#')) return rgb;
  
  const result = rgb.match(/\d+/g);
  if (!result || result.length < 3) return '#000000';
  
  return '#' + result.slice(0, 3).map(x => {
    const hex = parseInt(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const isLightColor = rgb => {
  if (!rgb) return false;
  return ((0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255) > 0.8;
};

const updateCameraForGrid = (width, height) => {
  const maxDimension = Math.max(width, height);
  camera.position.z = maxDimension * 1.5 + 5;
  controls.update();
};

window.toggleSettings = function() {
  const modal = document.getElementById('settings-modal');
  modal.classList.toggle('show');
  
  if (modal.classList.contains('show')) {
    document.getElementById('grid-width').value = gridWidth;
    document.getElementById('grid-height').value = gridHeight;
    
    document.getElementById('voxel-width').value = voxelWidth;
    document.getElementById('voxel-height').value = voxelHeight;
    document.getElementById('voxel-depth').value = voxelDepth;
    
    updateAIProviderUI();
    const customSettings = document.getElementById('custom-ai-settings');
    if (aiProvider === 'custom') {
      customSettings.classList.remove('hidden');
      document.getElementById('custom-ai-url').value = customAIConfig.url || '';
      document.getElementById('custom-ai-key').value = customAIConfig.apiKey || '';
    } else {
      customSettings.classList.add('hidden');
    }
  }
}

window.setGridDimensions = function(width, height) {
  document.getElementById('grid-width').value = width;
  document.getElementById('grid-height').value = height;
}

window.applyGridSize = function(width, height) {
  createWall(width, height);
  autoSaveState(); 
  showNotification(i18n.t('notifications.resolutionChanged', { width, height }), 'success');
  toggleSettings();
}

window.applyCustomGridSize = function() {
  const width = parseInt(document.getElementById('grid-width').value);
  const height = parseInt(document.getElementById('grid-height').value);
  
  if (width < 4 || width > 128 || height < 4 || height > 128) {
    showNotification(i18n.t('notifications.gridSizeError'), 'error');
    return;
  }
  
  applyGridSize(width, height);
}

window.setVoxelDimensions = function(width, height, depth) {
  document.getElementById('voxel-width').value = width;
  document.getElementById('voxel-height').value = height;
  document.getElementById('voxel-depth').value = depth;
}

function createVoxelGrid(width, height, depth) {
  cubes.forEach(cube => {
    scene.remove(cube);
    cube.geometry.dispose();
    cube.material.dispose();
  });
  cubes = [];
  
  for (let x = -width / 2; x <= width / 2; x++) {
    for (let y = -height / 2; y <= height / 2; y++) {
      for (let z = -depth / 2; z <= depth / 2; z++) {
        const material = new THREE.MeshStandardMaterial({ 
          color: 0xaaaaaa,
          roughness: 0.7,
          metalness: 0.2
        });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(1.05 * x, 1.05 * y, 1.05 * z);
        cube.userData = { x, y, z };
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);
        cubes.push(cube);
      }
    }
  }
  
  voxelMode = 'grid';
  
  voxelWidth = width;
  voxelHeight = height;
  voxelDepth = depth;
  
  const maxDim = Math.max(width, height, depth);
  const distance = maxDim * 2.5;
  camera.position.set(distance, distance, distance);
  camera.lookAt(0, 0, 0);
  
  history = [];
  historyIndex = -1;
  saveState(); 
}

window.applyVoxelSize = function(width, height, depth) {
  createVoxelGrid(width, height, depth);
  
  autoSaveState(); 
  showNotification(i18n.t('notifications.voxelSizeChanged', { width, height, depth }), 'success');
  toggleSettings();
}

window.applyCustomVoxelSize = function() {
  const width = parseInt(document.getElementById('voxel-width').value);
  const height = parseInt(document.getElementById('voxel-height').value);
  const depth = parseInt(document.getElementById('voxel-depth').value);
  
  if (width < 4 || width > 64 || height < 4 || height > 64 || depth < 4 || depth > 64) {
    showNotification(i18n.t('notifications.voxelSizeError'), 'error');
    return;
  }
  
  applyVoxelSize(width, height, depth);
}

window.startAgain = function() {
  if (!confirm(i18n.t('settings.startAgainConfirm'))) {
    return;
  }
  
  clearSessionState();
  
  window.location.href = window.location.origin + window.location.pathname;
}

let currentExportType = 'image'; 

window.toggleExport = function() {
  const modal = document.getElementById('export-modal');
  modal.classList.toggle('show');
  
  if (modal.classList.contains('show')) {
    setExportType('image');
  }
}

window.setExportType = function(type) {
  currentExportType = type;
  
  const imageBtn = document.getElementById('export-type-image');
  const model3dBtn = document.getElementById('export-type-3d');
  const imageSettings = document.getElementById('image-export-settings');
  const model3dSettings = document.getElementById('3d-export-settings');
  
  if (type === 'image') {
    imageBtn.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
    imageBtn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
    model3dBtn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
    model3dBtn.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
    imageSettings.classList.remove('hidden');
    model3dSettings.classList.add('hidden');
  } else {
    model3dBtn.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
    model3dBtn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
    imageBtn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
    imageBtn.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
    imageSettings.classList.add('hidden');
    model3dSettings.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const qualitySlider = document.getElementById('jpg-quality');
  const qualityValue = document.getElementById('quality-value');
  
  if (qualitySlider && qualityValue) {
    qualitySlider.addEventListener('input', (e) => {
      const value = Math.round(e.target.value * 100);
      qualityValue.textContent = `${value}%`;
    });
  }
});

window.exportArtwork = function(format) {
  const filename = document.getElementById('export-filename').value || 'pixel-art-3d';
  const resolution = parseInt(document.getElementById('export-resolution').value);
  const quality = parseFloat(document.getElementById('jpg-quality').value);
  
  const exportWidth = renderer.domElement.width * resolution;
  const exportHeight = renderer.domElement.height * resolution;
  
  const originalWidth = renderer.domElement.width;
  const originalHeight = renderer.domElement.height;
  
  renderer.setSize(exportWidth, exportHeight);
  camera.aspect = exportWidth / exportHeight;
  camera.updateProjectionMatrix();
  
  renderer.render(scene, camera);
  
  const dataURL = format === 'png' 
    ? renderer.domElement.toDataURL('image/png')
    : renderer.domElement.toDataURL('image/jpeg', quality);
  
  renderer.setSize(originalWidth, originalHeight);
  camera.aspect = originalWidth / originalHeight;
  camera.updateProjectionMatrix();
  
  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = dataURL;
  link.click();
  
  const message = format === 'png' 
    ? i18n.t('notifications.exportedAsPNG')
    : i18n.t('notifications.exportedAsJPG');
  showNotification(message, 'success');
  
  toggleExport();
}

window.export3DModel = function(format) {
  const filename = document.getElementById('export-filename').value || 'pixel-art-3d';
  
  if (cubes.length === 0) {
    showNotification(i18n.t('notifications.noVoxelsToExport'), 'error');
    return;
  }
  
  const exportGroup = new THREE.Group();
  
  cubes.forEach(cube => {
    const clonedGeometry = cube.geometry.clone();
    const clonedMaterial = cube.material.clone();
    const clonedCube = new THREE.Mesh(clonedGeometry, clonedMaterial);
    
    clonedCube.position.copy(cube.position);
    clonedCube.rotation.copy(cube.rotation);
    clonedCube.scale.copy(cube.scale);
    
    exportGroup.add(clonedCube);
  });
  
  try {
    switch(format) {
      case 'glb':
        exportGLB(exportGroup, filename);
        break;
      case 'obj':
        exportOBJ(exportGroup, filename);
        break;
      case 'stl':
        exportSTL(exportGroup, filename);
        break;
      default:
        showNotification('Unknown export format', 'error');
    }
  } catch (error) {
    console.error('Export error:', error);
    showNotification(`Export failed: ${error.message}`, 'error');
  }
}

function exportGLB(object, filename) {
  const exporter = new GLTFExporter();
  
  exporter.parse(
    object,
    function(result) {
      const blob = new Blob([result], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.glb`;
      link.click();
      
      showNotification(i18n.t('notifications.exportedAsGLB'), 'success');
      toggleExport();
    },
    function(error) {
      console.error('GLB export error:', error);
      showNotification('Failed to export GLB', 'error');
    },
    { binary: true }
  );
}

function exportOBJ(object, filename) {
  const exporter = new OBJExporter();
  const result = exporter.parse(object);
  
  const blob = new Blob([result], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.obj`;
  link.click();
  
  showNotification(i18n.t('notifications.exportedAsOBJ'), 'success');
  toggleExport();
}

function exportSTL(object, filename) {
  const exporter = new STLExporter();
  
  const geometries = [];
  object.traverse((child) => {
    if (child.isMesh) {
      const clonedGeometry = child.geometry.clone();
      clonedGeometry.applyMatrix4(child.matrixWorld);
      geometries.push(clonedGeometry);
    }
  });
  
  const mergedGeometry = new THREE.BufferGeometry();
  if (geometries.length > 0) {
    const positions = [];
    const normals = [];
    
    geometries.forEach(geo => {
      const pos = geo.attributes.position.array;
      const norm = geo.attributes.normal.array;
      
      for (let i = 0; i < pos.length; i++) {
        positions.push(pos[i]);
      }
      for (let i = 0; i < norm.length; i++) {
        normals.push(norm[i]);
      }
    });
    
    mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mergedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  }
  
  const result = exporter.parse(mergedGeometry);
  
  const blob = new Blob([result], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.stl`;
  link.click();
  
  showNotification(i18n.t('notifications.exportedAsSTL'), 'success');
  toggleExport();
}

const DEFAULT_GEMINI_API_KEY = 'AIzaSyAcu6MqmbJm9yTMIQRstiMJO4ffbvqcRZg';
const DEFAULT_GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${DEFAULT_GEMINI_API_KEY}`;

let aiProvider = 'default'; // 'default' or 'custom'
let customAIConfig = {
  url: '',
  apiKey: ''
};

function loadAIConfig() {
  try {
    const savedProvider = localStorage.getItem('aiProvider');
    const savedConfig = localStorage.getItem('customAIConfig');
    
    if (savedProvider) {
      aiProvider = savedProvider;
    }
    
    if (savedConfig) {
      customAIConfig = JSON.parse(savedConfig);
    }
    
    updateAIProviderUI();
  } catch (error) {
    console.error('Error loading AI config:', error);
  }
}

function saveAIConfigToStorage() {
  try {
    localStorage.setItem('aiProvider', aiProvider);
    localStorage.setItem('customAIConfig', JSON.stringify(customAIConfig));
  } catch (error) {
    console.error('Error saving AI config:', error);
  }
}

function getAIEndpointURL() {
  if (aiProvider === 'custom' && customAIConfig.url) {
    if (customAIConfig.apiKey && !customAIConfig.url.includes('key=')) {
      const separator = customAIConfig.url.includes('?') ? '&' : '?';
      return `${customAIConfig.url}${separator}key=${customAIConfig.apiKey}`;
    }
    return customAIConfig.url;
  }
  return DEFAULT_GEMINI_API_URL;
}

function getAPIKey() {
  if (aiProvider === 'custom') {
    return customAIConfig.apiKey || '';
  }
  return DEFAULT_GEMINI_API_KEY;
}

window.setAIProvider = function(provider) {
  aiProvider = provider;
  saveAIConfigToStorage();
  updateAIProviderUI();
  
  const customSettings = document.getElementById('custom-ai-settings');
  if (provider === 'custom') {
    customSettings.classList.remove('hidden');
    document.getElementById('custom-ai-url').value = customAIConfig.url || '';
    document.getElementById('custom-ai-key').value = customAIConfig.apiKey || '';
  } else {
    customSettings.classList.add('hidden');
  }
}

function updateAIProviderUI() {
  const defaultBtn = document.getElementById('ai-provider-default');
  const customBtn = document.getElementById('ai-provider-custom');
  
  if (!defaultBtn || !customBtn) return;
  
  if (aiProvider === 'default') {
    defaultBtn.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
    defaultBtn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
    customBtn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
    customBtn.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
  } else {
    customBtn.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
    customBtn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
    defaultBtn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
    defaultBtn.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
  }
}

window.saveCustomAIConfig = function() {
  const url = document.getElementById('custom-ai-url').value.trim();
  const apiKey = document.getElementById('custom-ai-key').value.trim();
  
  if (!url) {
    showNotification(i18n.t('notifications.aiURLRequired'), 'error');
    return;
  }
  
  customAIConfig = {
    url: url,
    apiKey: apiKey
  };
  
  saveAIConfigToStorage();
  showNotification(i18n.t('notifications.aiConfigSaved'), 'success');
}

let aiGenerationMode = '2d'; 

window.toggleAIPrompt = function() {
  const modal = document.getElementById('ai-prompt-modal');
  modal.classList.toggle('show');
  
  if (modal.classList.contains('show')) {
    document.getElementById('ai-grid-width').value = gridWidth;
    document.getElementById('ai-grid-height').value = gridHeight;
    document.getElementById('ai-voxel-width').value = 8;
    document.getElementById('ai-voxel-height').value = 8;
    document.getElementById('ai-voxel-depth').value = 8;
    setAIMode(voxelMode === 'grid' ? '2d' : '3d');
    document.getElementById('ai-prompt-input').value = '';
    document.getElementById('ai-loading').classList.add('hidden');
    document.getElementById('ai-generate-button').classList.remove('hidden');
  }
}

window.setAIMode = function(mode) {
  aiGenerationMode = mode;
  
  const mode2dBtn = document.getElementById('ai-mode-2d');
  const mode3dBtn = document.getElementById('ai-mode-3d');
  const info2d = document.getElementById('ai-2d-info');
  const settings3d = document.getElementById('ai-3d-settings');
  
  if (mode === '2d') {
    mode2dBtn.classList.add('bg-purple-500', 'text-white', 'border-purple-500');
    mode2dBtn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
    mode3dBtn.classList.remove('bg-purple-500', 'text-white', 'border-purple-500');
    mode3dBtn.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
    info2d.classList.remove('hidden');
    settings3d.classList.add('hidden');
  } else {
    mode3dBtn.classList.add('bg-purple-500', 'text-white', 'border-purple-500');
    mode3dBtn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
    mode2dBtn.classList.remove('bg-purple-500', 'text-white', 'border-purple-500');
    mode2dBtn.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
    info2d.classList.add('hidden');
    settings3d.classList.remove('hidden');
  }
}

window.generateWithAI = async function() {
  const prompt = document.getElementById('ai-prompt-input').value.trim();
  
  if (!prompt) {
    showNotification(i18n.t('notifications.enterDescription'), 'error');
    return;
  }
  
  const currentAPIKey = getAPIKey();
  const currentEndpoint = getAIEndpointURL();
  
  if (aiProvider === 'default' && currentAPIKey === 'YOUR_GEMINI_API_KEY_HERE') {
    showNotification(i18n.t('notifications.configureAPIKey'), 'error');
    return;
  }
  
  if (aiProvider === 'custom' && !customAIConfig.url) {
    showNotification(i18n.t('notifications.configureCustomAI'), 'error');
    return;
  }
  
  document.getElementById('ai-loading').classList.remove('hidden');
  document.getElementById('ai-generate-button').classList.add('hidden');
  
  try {
    if (aiGenerationMode === '2d') {
      await generate2DArt(prompt);
    } else {
      await generate3DVoxels(prompt);
    }
    
    showNotification(i18n.t('notifications.artGeneratedSuccess'), 'success');
    toggleAIPrompt();
    
  } catch (error) {
    console.error('AI Generation Error:', error);
    showNotification(i18n.t('notifications.generationFailed', { error: error.message }), 'error');
  } finally {
    document.getElementById('ai-loading').classList.add('hidden');
    document.getElementById('ai-generate-button').classList.remove('hidden');
  }
}

async function generate2DArt(prompt) {
  const width = parseInt(document.getElementById('ai-grid-width').value) || gridWidth;
  const height = parseInt(document.getElementById('ai-grid-height').value) || gridHeight;
  
  if (width < 4 || width > 128 || height < 4 || height > 128) {
    throw new Error(i18n.t('notifications.dimensionsError'));
  }
  
  if (width !== gridWidth || height !== gridHeight) {
    createWall(width, height);
  }
  
  if (voxelMode !== 'grid') {
    throw new Error('2D generation only works in grid mode. Please start with a grid canvas.');
  }
  
  const colorPalette = getCurrentColorPalette();
  
  const systemPrompt = build2DPrompt(prompt, width, height, colorPalette);
  
  const response = await fetch(getAIEndpointURL(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: systemPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 30000,
      }
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  console.log('Gemini API Response:', data);
  
  const generatedText = extractTextFromResponse(data);
  
  saveState();
  
  apply2DPixelArt(generatedText, width, height);
}

async function generate3DVoxels(prompt) {
  const width = parseInt(document.getElementById('ai-voxel-width').value) || 8;
  const height = parseInt(document.getElementById('ai-voxel-height').value) || 8;
  const depth = parseInt(document.getElementById('ai-voxel-depth').value) || 8;
  
  if (width < 4 || width > 24 || height < 4 || height > 24 || depth < 4 || depth > 24) {
    throw new Error(i18n.t('notifications.dimensionsError3D'));
  }
  
  const colorPalette = getCurrentColorPalette();
  
  const systemPrompt = build3DVoxelPrompt(prompt, width, height, depth, colorPalette);
  
  const response = await fetch(getAIEndpointURL(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: systemPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 50000,
      }
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  console.log('Gemini 3D Voxel Response:', data);
  
  const generatedText = extractTextFromResponse(data);
  
  saveState();
  
  apply3DVoxelStructure(generatedText, width, height, depth);
}

function getCurrentColorPalette() {
  const palette = {};
  const colorButtons = document.querySelectorAll('.color-button');
  
  colorButtons.forEach((btn, index) => {
    const hexColor = rgbToHex(btn.style.backgroundColor);
    palette[btn.id] = hexColor;
  });
  
  return palette;
}

function extractTextFromResponse(data) {
  if (!data.candidates || !data.candidates[0]) {
    console.error('Unexpected API response structure:', data);
    throw new Error('Invalid response from AI. Please try again.');
  }
  
  const candidate = data.candidates[0];
  
  if (candidate.finishReason === 'MAX_TOKENS') {
    throw new Error('Content too large for current settings. Try smaller dimensions.');
  }
  
  if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
    return candidate.content.parts[0].text;
  } else if (candidate.text) {
    return candidate.text;
  } else {
    console.error('Could not extract text from candidate:', candidate);
    throw new Error('Could not extract text from AI response. Please try again.');
  }
}

function build2DPrompt(userPrompt, width, height, colorPalette) {
  const colorNames = Object.keys(colorPalette);
  const paletteStr = colorNames.join(', ');
  
  return `You are a pixel art generator. Create ${width}x${height} pixel art: "${userPrompt}"

AVAILABLE COLORS: ${paletteStr}

CRITICAL RULES:
1. Return ONLY a JSON array of ${height} rows with ${width} colors each
2. Use ONLY color names from the list above
3. Each color must be a string like "red", "blue", "gray"
4. Format: [["color1","color2",...],["color1","color2",...]...]
5. NO explanations, NO extra text, ONLY the JSON array
6. Make it creative and match the description

Example 4x4:
[["blue","blue","blue","blue"],["gray","red","red","gray"],["gray","red","red","gray"],["gray","gray","gray","gray"]]

Generate ${width}x${height} for: "${userPrompt}"`;
}

function build3DVoxelPrompt(userPrompt, width, height, depth, colorPalette) {
  const colorNames = Object.keys(colorPalette);
  const paletteStr = colorNames.join(', ');
  
  return `You are a 3D voxel structure generator. Create a ${width}x${height}x${depth} voxel model: "${userPrompt}"

AVAILABLE COLORS: ${paletteStr}

COORDINATE SYSTEM:
- X axis: left to right (0 to ${width-1})
- Y axis: bottom to top (0 to ${height-1})  
- Z axis: front to back (0 to ${depth-1})
- Center is at (${Math.floor(width/2)}, ${Math.floor(height/2)}, ${Math.floor(depth/2)})

CRITICAL INSTRUCTIONS:
1. Output MUST start with [ and end with ]
2. Return ONLY the JSON array - NO text before or after
3. Each voxel format: {"x":number,"y":number,"z":number,"color":"name"}
4. Use ONLY these colors: ${paletteStr}
5. Only include filled positions (sparse - don't include empty space)
6. All coordinates must be integers within bounds
7. Create recognizable 3D shapes

EXAMPLE OUTPUT for a small tree:
[{"x":2,"y":0,"z":2,"color":"brown"},{"x":2,"y":1,"z":2,"color":"brown"},{"x":2,"y":2,"z":2,"color":"brown"},{"x":1,"y":3,"z":1,"color":"green"},{"x":2,"y":3,"z":1,"color":"green"},{"x":3,"y":3,"z":1,"color":"green"},{"x":1,"y":3,"z":2,"color":"green"},{"x":2,"y":3,"z":2,"color":"green"},{"x":3,"y":3,"z":2,"color":"green"}]

NOW generate ONLY the JSON array for: "${userPrompt}"
Start with [ and end with ]
DO NOT include any explanatory text.`;
}

function apply2DPixelArt(responseText, width, height) {
  const targetWidth = width || gridWidth;
  const targetHeight = height || gridHeight;
  
  try {
    const jsonMatch = responseText.match(/\[\s*\[[\s\S]*\]\s*\]/);
    if (!jsonMatch) {
      throw new Error('Could not find valid JSON array in response');
    }
    
    let pixelData = JSON.parse(jsonMatch[0]);
    
    if (pixelData.length !== targetHeight) {
      console.warn(`Grid height mismatch: expected ${targetHeight}, got ${pixelData.length}. Attempting to fix...`);
      
      if (pixelData.length > targetHeight) {
        pixelData = pixelData.slice(0, targetHeight);
      } else {
        while (pixelData.length < targetHeight) {
          pixelData.push(new Array(targetWidth).fill('gray'));
        }
      }
    }
    
    pixelData.forEach((row, rowIndex) => {
      if (row.length !== targetWidth) {
        console.warn(`Grid width mismatch at row ${rowIndex}: expected ${targetWidth}, got ${row.length}. Fixing...`);
        
        if (row.length > targetWidth) {
          row = row.slice(0, targetWidth);
        } else {
          while (row.length < targetWidth) {
            row.push('gray');
          }
        }
      }
      
      row.forEach((colorName, colIndex) => {
        const x = colIndex - Math.floor(targetWidth / 2);
        const y = Math.floor(targetHeight / 2) - rowIndex;
        
        const cube = cubes.find(c => c.userData.x === x && c.userData.y === y && c.userData.z === 0);
        
        if (cube) {
          const normalizedColorName = colorName.toLowerCase().trim();
          const colorHex = colors[normalizedColorName] || colors['gray'];
          cube.material.color.setHex(colorHex);
        }
      });
    });
    
    console.log('Applied 2D pixel art from AI successfully');
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error(`Failed to parse pixel art: ${error.message}`);
  }
}

function apply3DVoxelStructure(responseText, width, height, depth) {
  try {
    console.log('Raw response text:', responseText); // Debug log
    
    let jsonMatch = null;
    
    jsonMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    
    if (!jsonMatch) {
      jsonMatch = responseText.match(/\[[\s\S]*?\{[\s\S]*?\}[\s\S]*?\]/);
    }
    
    if (!jsonMatch) {
      const startIdx = responseText.indexOf('[');
      const endIdx = responseText.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonMatch = [responseText.substring(startIdx, endIdx + 1)];
      }
    }
    
    if (!jsonMatch) {
      console.error('Could not find JSON in response. Full text:', responseText);
      throw new Error('Could not find valid JSON array in response');
    }
    
    console.log('Extracted JSON:', jsonMatch[0]); 
    
    let voxelData;
    try {
      voxelData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempted to parse:', jsonMatch[0]);
      throw new Error(`Failed to parse JSON: ${parseError.message}`);
    }
    
    if (!Array.isArray(voxelData)) {
      console.error('Parsed data is not an array:', voxelData);
      throw new Error('Response is not an array of voxels');
    }
    
    console.log(`Generating ${voxelData.length} voxels...`);
    
    if (voxelMode === 'single') {
      cubes.forEach(cube => {
        scene.remove(cube);
        cube.geometry.dispose();
        cube.material.dispose();
      });
      cubes = [];
    }
    
    const offsetX = Math.floor(width / 2);
    const offsetY = Math.floor(height / 2);
    const offsetZ = Math.floor(depth / 2);
    
    voxelData.forEach((voxel, index) => {
      if (typeof voxel.x !== 'number' || typeof voxel.y !== 'number' || 
          typeof voxel.z !== 'number' || typeof voxel.color !== 'string') {
        console.warn(`Skipping invalid voxel at index ${index}:`, voxel);
        return;
      }
      
      if (voxel.x < 0 || voxel.x >= width || 
          voxel.y < 0 || voxel.y >= height || 
          voxel.z < 0 || voxel.z >= depth) {
        console.warn(`Voxel out of bounds at index ${index}:`, voxel);
        return;
      }
      
      const worldX = (voxel.x - offsetX) * 1.05;
      const worldY = (voxel.y - offsetY) * 1.05;
      const worldZ = (voxel.z - offsetZ) * 1.05;
      
      const exists = cubes.some(c => 
        Math.abs(c.position.x - worldX) < 0.01 &&
        Math.abs(c.position.y - worldY) < 0.01 &&
        Math.abs(c.position.z - worldZ) < 0.01
      );
      
      if (exists) {
        console.warn(`Cube already exists at (${voxel.x}, ${voxel.y}, ${voxel.z})`);
        return;
      }
      
      const normalizedColorName = voxel.color.toLowerCase().trim();
      const colorHex = colors[normalizedColorName] || colors['gray'];
      
      const material = new THREE.MeshStandardMaterial({ 
        color: colorHex,
        roughness: 0.7,
        metalness: 0.2
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(worldX, worldY, worldZ);
      cube.userData = { x: voxel.x - offsetX, y: voxel.y - offsetY, z: voxel.z - offsetZ };
      cube.castShadow = true;
      cube.receiveShadow = true;
      scene.add(cube);
      cubes.push(cube);
    });
    
    if (voxelMode !== 'single') {
      voxelMode = 'single';
      if (!ghostCube) {
        createGhostCube();
      }
    }
    
    console.log(`Successfully created ${cubes.length} voxels from AI generation`);
  } catch (error) {
    console.error('Error parsing 3D voxel response:', error);
    throw new Error(`Failed to parse voxel structure: ${error.message}`);
  }
}

window.toggleGridSizeSelection = function() {
  const selection = document.getElementById('grid-size-selection');
  selection.classList.toggle('hidden');
}

window.startMode = function(mode, width = 8, height = 8) {
  const modal = document.getElementById('startup-modal');
  modal.style.display = 'none';
  
  voxelMode = mode;
  gridWidth = width;
  gridHeight = height;
  
  if (mode === 'single') {
    createSingleCube();
    createGhostCube();
  } else if (mode === 'grid') {
    createWall(width, height);
    createGhostCube();
  }
  
  autoSaveState();
  
  animate();
}

window.toggleMode = function() {
  interactionMode = interactionMode === 'paint' ? 'add' : 'paint';
  
  const btn = document.getElementById('mode-toggle-btn');
  if (interactionMode === 'add') {
    btn.textContent = '➕';
    btn.classList.remove('border-green-500/70', 'hover:border-green-400', 'hover:bg-green-500/20');
    btn.classList.add('border-blue-500/70', 'hover:border-blue-400', 'hover:bg-blue-500/20');
    btn.title = i18n.t('notifications.toggleModeTooltipAdd');
    ghostCube.visible = false; // Will be shown on hover
    showNotification(i18n.t('notifications.addModeTip'), 'success');
  } else {
    btn.textContent = '🎨';
    btn.classList.remove('border-blue-500/70', 'hover:border-blue-400', 'hover:bg-blue-500/20');
    btn.classList.add('border-green-500/70', 'hover:border-green-400', 'hover:bg-green-500/20');
    btn.title = i18n.t('notifications.toggleModeTooltipPaint');
    if (ghostCube) ghostCube.visible = false;
    showNotification(i18n.t('notifications.paintModeTip'), 'success');
  }
}

window.setSettingsMode = function(settingsMode) {
  const btn2D = document.getElementById('settings-mode-2d');
  const btn3D = document.getElementById('settings-mode-3d');
  const config2D = document.getElementById('settings-2d-config');
  const config3D = document.getElementById('settings-3d-config');
  
  if (settingsMode === '2d') {
    config2D.classList.remove('hidden');
    config3D.classList.add('hidden');
    
    btn2D.classList.remove('border-gray-300', 'bg-white', 'text-gray-700');
    btn2D.classList.add('border-blue-500', 'bg-blue-500', 'text-white');
    
    btn3D.classList.remove('border-blue-500', 'bg-blue-500', 'text-white');
    btn3D.classList.add('border-gray-300', 'bg-white', 'text-gray-700');
  } else {
    config3D.classList.remove('hidden');
    config2D.classList.add('hidden');
    
    btn3D.classList.remove('border-gray-300', 'bg-white', 'text-gray-700');
    btn3D.classList.add('border-blue-500', 'bg-blue-500', 'text-white');
    
    btn2D.classList.remove('border-blue-500', 'bg-blue-500', 'text-white');
    btn2D.classList.add('border-gray-300', 'bg-white', 'text-gray-700');
  }
}

