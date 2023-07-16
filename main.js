import { loadGLTF } from "./loader.js";
import * as THREE from './three.js-r132/build/three.module.js';
import { ARButton } from './three.js-r132/examples/jsm/webxr/ARButton.js';

const normalizeModel = (obj, height) => {
  // scale it according to height
  const bbox = new THREE.Box3().setFromObject(obj);
  const size = bbox.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(height / size.y);

  // reposition to center
  const bbox2 = new THREE.Box3().setFromObject(obj);
  const center = bbox2.getCenter(new THREE.Vector3());
  obj.position.set(-center.x, -center.y, -center.z);
};

const setOpacity = (obj, opacity) => {
  obj.traverse((child) => {
    if (child.isMesh) {
      child.material.transparent = true;
      child.material.opacity = opacity;
      child.material.depthWrite = !opacity;
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const initialize = async () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body },
    });
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(arButton);

    const modelName = 'https://mediacdn.loadbee.com/threeD/oddity/415X_Prep_CB_gltf.glb';
    const model = await loadGLTF(modelName);
    const item = new THREE.Group();
    item.add(model.scene);
    item.visible = false;
    setOpacity(item, 0.5);
    scene.add(item);

    let selectedItem = null;

    const itemButtons = document.querySelector("#item-buttons");

    const select = (selectItem) => {
      item.visible = false;
      selectedItem = selectItem;
    };

    itemButtons.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      select(item);
    });

    const controller = renderer.xr.getController(0);
    scene.add(controller);

    renderer.xr.addEventListener("sessionstart", async () => {
      const session = renderer.xr.getSession();
      const viewerReferenceSpace = await session.requestReferenceSpace("viewer");
      const hitTestSource = await session.requestHitTestSource({ space: viewerReferenceSpace });

      renderer.setAnimationLoop((timestamp, frame) => {
        if (!frame) return;

        const referenceSpace = renderer.xr.getReferenceSpace();
        if (selectedItem) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);
          if (hitTestResults.length) {
            const hit = hitTestResults[0];
            selectedItem.visible = true;
            selectedItem.position.setFromMatrixPosition(new THREE.Matrix4().fromArray(hit.getPose(referenceSpace).transform.matrix));
          } else {
            selectedItem.visible = false;
          }
        }

        renderer.render(scene, camera);
      });
    });
  };

  initialize();
});

