import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, doc, getDoc, collection, addDoc, deleteDoc, updateDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmMvpuCwr0xIPMtqxYeFtoqkulPzGy6Ok",
  authDomain: "projeto-cardapio-thurler12.firebaseapp.com",
  projectId: "projeto-cardapio-thurler12",
  storageBucket: "projeto-cardapio-thurler12.firebasestorage.app",
  messagingSenderId: "536350657388",
  appId: "1:536350657388:web:8042646fe3e018aca48149",
  measurementId: "G-RYC0VQ2ZL2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserRole = null;
let globalProducts = [];
const productsRef = collection(db, "produtos");

const adminPanel = document.getElementById('admin-panel');
const btnLogout = document.getElementById('btn-logout');

// 1. SESSÃO E AUTENTICAÇÃO
onAuthStateChanged(auth, async (user) => {
  const path = window.location.pathname;
  const isLoginPage = path.includes('login.html');
  const isAdminPage = path.includes('admin.html');

  if (user) {
    if (isLoginPage) {
      window.location.href = 'admin.html';
      return;
    }

    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        currentUserRole = userData.role;
        aplicarPermissoesUI(currentUserRole, userData.nome);
      } else {
        currentUserRole = 'gerente';
        aplicarPermissoesUI('gerente', 'Usuário');
      }
    } catch (err) {
      console.error("Erro permissões:", err);
    }

    if (adminPanel) adminPanel.classList.remove('hidden');

  } else {
    if (isAdminPage) {
      window.location.href = 'login.html';
    }
  }
});

// 2. LOGIN / LOGOUT
async function realizarLogin(e) {
  if (e) e.preventDefault();

  const userInput = document.getElementById('admin-user');
  const passInput = document.getElementById('admin-pass');

  if (!userInput || !passInput) return;

  const email = userInput.value.trim();
  const password = passInput.value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = 'admin.html';
  } catch (error) {
    console.error("Erro Auth:", error);
    const loginError = document.getElementById('login-error');
    if (loginError) loginError.classList.remove('hidden');
  }
}

const loginForm = document.getElementById('login-form');
if (loginForm) loginForm.addEventListener('submit', realizarLogin);

if (btnLogout) {
  btnLogout.addEventListener('click', () => signOut(auth));
}

function aplicarPermissoesUI(role, nome) {
  const userInfoTag = document.getElementById('user-info-tag');
  if (userInfoTag) userInfoTag.textContent = `${nome} (${role ? role.toUpperCase() : 'USER'})`;
}

// 3. BANCO DE DADOS EM TEMPO REAL
onSnapshot(productsRef, (snapshot) => {
  globalProducts = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    available: true,
    ...docSnap.data()
  }));

  const activeBtn = document.querySelector('.filter-btn.active');
  const activeCategory = activeBtn ? activeBtn.dataset.category : 'Todos';

  renderPublicProducts(globalProducts, activeCategory);
  renderAdminProducts(globalProducts);
}, (err) => {
  console.error("Erro Firestore:", err);
});

// 4. RENDEREIZAÇÃO VITRINE PÚBLICA
function renderPublicProducts(products, category = 'Todos') {
  const productContainer = document.getElementById('product-list');
  if (!productContainer) return;

  productContainer.innerHTML = '';

  let visibleProducts = products.filter(p => p.available !== false);

  if (category !== 'Todos') {
    visibleProducts = visibleProducts.filter(p => p.category === category);
  }

  if (visibleProducts.length === 0) {
    productContainer.innerHTML = '<p class="empty-msg">Nenhum sabor disponível no momento.</p>';
    return;
  }

  visibleProducts.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}" class="product-image">
      <div class="product-info">
        <span class="product-badge">${product.category}</span>
        <h3 class="product-title">${product.name}</h3>
        <p class="product-desc">${product.description}</p>
      </div>
    `;
    productContainer.appendChild(card);
  });
}

const categoryButtons = document.querySelectorAll('.filter-btn');
if (categoryButtons.length > 0) {
  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      renderPublicProducts(globalProducts, button.dataset.category);
    });
  });
}

// 5. RENDERIZAÇÃO PAINEL ADMIN
function renderAdminProducts(products) {
  const adminProductList = document.getElementById('admin-product-list');
  if (!adminProductList) return;

  adminProductList.innerHTML = '';

  if (products.length === 0) {
    adminProductList.innerHTML = '<p style="color: var(--text-muted);">Nenhum sabor cadastrado.</p>';
    return;
  }

  products.forEach(product => {
    const itemCard = document.createElement('div');
    itemCard.className = `admin-item-card ${product.available === false ? 'disabled-item' : ''}`;
    const isChecked = product.available !== false ? 'checked' : '';

    itemCard.innerHTML = `
      <div class="admin-item-info">
        <img src="${product.image}" alt="${product.name}" class="admin-item-img">
        <div>
          <strong>${product.name}</strong> <small>(${product.category})</small>
          <p style="font-size: var(--font-sm); color: var(--text-muted);">${product.description}</p>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <label class="switch-container" title="Ativar/Desativar">
          <input type="checkbox" class="toggle-status" data-id="${product.id}" ${isChecked}>
          <span class="slider round"></span>
        </label>
        <button class="filter-btn btn-edit-action" data-id="${product.id}">✏️ Editar</button>
        <button class="btn-delete-action" data-id="${product.id}" title="Excluir Sabor">🗑️</button>
      </div>
    `;
    adminProductList.appendChild(itemCard);
  });

  document.querySelectorAll('.toggle-status').forEach(toggle => {
    toggle.addEventListener('change', async (e) => {
      const prodId = e.target.dataset.id;
      const isAvailable = e.target.checked;
      try {
        await updateDoc(doc(db, "produtos", prodId), { available: isAvailable });
      } catch (err) {
        console.error("Erro status:", err);
        e.target.checked = !isAvailable;
      }
    });
  });

  document.querySelectorAll('.btn-edit-action').forEach(btn => {
    btn.addEventListener('click', () => prepareEditProduct(btn.dataset.id));
  });

  document.querySelectorAll('.btn-delete-action').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}

// 6. EDITAR, RESETAR E DELETAR
const productForm = document.getElementById('product-form');
const editIdInput = document.getElementById('edit-id');
const formTitle = document.getElementById('form-title');
const btnSubmit = document.getElementById('btn-submit');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const imgInput = document.getElementById('prod-img');

function prepareEditProduct(id) {
  const product = globalProducts.find(p => p.id === id);
  if (!product) return;

  document.getElementById('prod-name').value = product.name;
  document.getElementById('prod-category').value = product.category;
  document.getElementById('prod-desc').value = product.description;
  if (editIdInput) editIdInput.value = product.id;
  if (imgInput) imgInput.removeAttribute('required');

  if (formTitle) formTitle.textContent = 'Editar Sabor';
  if (btnSubmit) btnSubmit.textContent = 'Salvar Alterações';
  if (btnCancelEdit) btnCancelEdit.classList.remove('hidden');

  if (productForm) productForm.scrollIntoView({ behavior: 'smooth' });
}

if (btnCancelEdit) btnCancelEdit.addEventListener('click', resetAdminForm);

function resetAdminForm() {
  if (!productForm) return;
  productForm.reset();
  if (editIdInput) editIdInput.value = '';
  if (imgInput) imgInput.setAttribute('required', 'true');
  if (formTitle) formTitle.textContent = 'Cadastrar Novo Sabor';
  if (btnSubmit) btnSubmit.textContent = '+ Adicionar Sabor';
  if (btnCancelEdit) btnCancelEdit.classList.add('hidden');
}

async function deleteProduct(id) {
  const product = globalProducts.find(p => p.id === id);
  const productName = product ? product.name : 'este item';

  if (confirm(`Deseja apagar "${productName}" permanentemente?`)) {
    try {
      await deleteDoc(doc(db, "produtos", id));
    } catch (error) {
      console.error("Erro ao apagar:", error);
    }
  }
}

if (productForm) {
  productForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const name = document.getElementById('prod-name').value;
    const category = document.getElementById('prod-category').value;
    const description = document.getElementById('prod-desc').value;
    const docIdToEdit = editIdInput ? editIdInput.value : '';
    const file = imgInput ? imgInput.files[0] : null;

    const saveToFirestore = async (imageBase64) => {
      try {
        if (docIdToEdit) {
          const docRef = doc(db, "produtos", docIdToEdit);
          const updateData = { name, category, description };
          if (imageBase64) updateData.image = imageBase64;
          await updateDoc(docRef, updateData);
        } else {
          await addDoc(productsRef, {
            name, category, description,
            image: imageBase64 || '',
            available: true,
            createdAt: new Date()
          });
        }
        resetAdminForm();
      } catch (error) {
        console.error("Erro salvar:", error);
      }
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => saveToFirestore(e.target.result);
      reader.readAsDataURL(file);
    } else {
      saveToFirestore(null);
    }
  });
}