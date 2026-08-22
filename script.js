import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, doc, getDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCmMvpuCwr0xIPMtqxYeFtoqkulPzGy6Ok",
  authDomain: "projeto-cardapio-thurler12.firebaseapp.com",
  projectId: "projeto-cardapio-thurler12",
  storageBucket: "projeto-cardapio-thurler12.firebasestorage.app",
  messagingSenderId: "536350657388",
  appId: "1:536350657388:web:8042646fe3e018aca48149",
  measurementId: "G-RYC0VQ2ZL2"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variáveis Globais
let currentUserRole = null;
let globalProducts = [];
const productsRef = collection(db, "produtos");

// Elementos do HTML
const adminPanel = document.getElementById('admin-panel');
const btnLogout = document.getElementById('btn-logout');

// ==========================================================================
// 1. GERENCIAMENTO DE SESSÃO E ROLES
// ==========================================================================
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
      console.error("Erro ao carregar permissões:", err);
    }

    if (adminPanel) adminPanel.classList.remove('hidden');

  } else {
    if (isAdminPage) {
      window.location.href = 'login.html';
    }
  }
});

// ==========================================================================
// 2. FUNÇÃO DE LOGIN ÚNICA E UNIFICADA
// ==========================================================================
async function realizarLogin(e) {
  if (e) e.preventDefault(); // MÁXIMA IMPORTÂNCIA: Bloqueia o refresh da página!

  const userInput = document.getElementById('admin-user');
  const passInput = document.getElementById('admin-pass');

  if (!userInput || !passInput) return;

  const email = userInput.value.trim();
  const password = passInput.value.trim();

  if (!email || !password) {
    alert("Por favor, preencha o e-mail e a senha.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = 'admin.html';
  } catch (error) {
    console.error("Erro no Firebase Auth:", error);
    const loginError = document.getElementById('login-error');
    if (loginError) {
      loginError.classList.remove('hidden');
    } else {
      alert("Erro ao fazer login: " + error.message);
    }
  }
}

// Vincula o evento ao formulário no login.html
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', realizarLogin);
}

// Logout
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    signOut(auth);
  });
}

function aplicarPermissoesUI(role, nome) {
  const userInfoTag = document.getElementById('user-info-tag');
  if (userInfoTag) {
    userInfoTag.textContent = `${nome} (${role.toUpperCase()})`;
  }

  document.querySelectorAll('.perm-suporte').forEach(el => {
    el.style.display = (role === 'suporte') ? 'block' : 'none';
  });

  document.querySelectorAll('.perm-dona').forEach(el => {
    el.style.display = (role === 'suporte' || role === 'dona') ? 'block' : 'none';
  });

  document.querySelectorAll('.perm-gerente').forEach(el => {
    el.style.display = (role === 'suporte' || role === 'dona' || role === 'gerente') ? 'block' : 'none';
  });
}

// ==========================================================================
// 3. SINCRONIZAÇÃO EM TEMPO REAL
// ==========================================================================
onSnapshot(productsRef, (snapshot) => {
  globalProducts = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  // Identifica qual botão de categoria está ativo no momento (padrão é 'Todos')
  const activeBtn = document.querySelector('.filter-btn.active');
  const activeCategory = activeBtn ? activeBtn.dataset.category : 'Todos';

  if (activeCategory === 'Todos') {
    renderPublicProducts(globalProducts);
  } else {
    const filtered = globalProducts.filter(p => p.category === activeCategory);
    renderPublicProducts(filtered);
  }

  // Atualiza também a lista do painel admin
  renderAdminProducts(globalProducts);
}, (error) => {
  console.error("Erro ao escutar alterações no Firestore:", error);
});

// ==========================================================================
// 4. EXIBIÇÃO NO CARDÁPIO PÚBLICO
// ==========================================================================
const productContainer = document.getElementById('product-list');
const categoryButtons = document.querySelectorAll('.filter-btn');

function renderPublicProducts(products) {
  if (!productContainer) return;

  productContainer.innerHTML = '';

  if (products.length === 0) {
    productContainer.innerHTML = '<p class="empty-msg">Nenhum sabor cadastrado no momento.</p>';
    return;
  }

  products.forEach(product => {
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

if (categoryButtons) {
  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const category = button.dataset.category;
      if (category === 'Todos') {
        renderPublicProducts(globalProducts);
      } else {
        const filtered = globalProducts.filter(p => p.category === category);
        renderPublicProducts(filtered);
      }
    });
  });
}

// ==========================================================================
// 5. PAINEL ADMIN (ADMIN.HTML)
// ==========================================================================
const productForm = document.getElementById('product-form');
const adminProductList = document.getElementById('admin-product-list');
const editIdInput = document.getElementById('edit-id');
const formTitle = document.getElementById('form-title');
const btnSubmit = document.getElementById('btn-submit');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const imgInput = document.getElementById('prod-img');

function renderAdminProducts(products) {
  if (!adminProductList) return;

  adminProductList.innerHTML = '';

  if (products.length === 0) {
    adminProductList.innerHTML = '<p style="color: var(--text-muted);">Nenhum sabor cadastrado no momento.</p>';
    return;
  }

  products.forEach(product => {
    const itemCard = document.createElement('div');
    itemCard.className = 'admin-item-card';

    const deleteButtonHtml = (currentUserRole === 'dona' || currentUserRole === 'suporte') 
      ? `<button class="btn-delete btn-delete-action" data-id="${product.id}">Excluir</button>` 
      : '';

    itemCard.innerHTML = `
      <div class="admin-item-info">
        <img src="${product.image}" alt="${product.name}" class="admin-item-img">
        <div>
          <strong>${product.name}</strong> <small>(${product.category})</small>
          <p style="font-size: var(--font-sm); color: var(--text-muted);">${product.description}</p>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="filter-btn btn-edit-action" data-id="${product.id}">✏️ Editar</button>
        ${deleteButtonHtml}
      </div>
    `;

    adminProductList.appendChild(itemCard);
  });

  document.querySelectorAll('.btn-edit-action').forEach(btn => {
    btn.addEventListener('click', () => prepareEditProduct(btn.dataset.id));
  });

  document.querySelectorAll('.btn-delete-action').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}

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

if (btnCancelEdit) {
  btnCancelEdit.addEventListener('click', resetAdminForm);
}

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
  if (currentUserRole !== 'dona' && currentUserRole !== 'suporte') {
    alert("Apenas a Dona ou o Suporte têm permissão para excluir produtos!");
    return;
  }

  if (confirm("Tem certeza que deseja excluir este sabor?")) {
    try {
      await deleteDoc(doc(db, "produtos", id));
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir sabor do banco de dados.");
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
            name,
            category,
            description,
            image: imageBase64 || '',
            createdAt: new Date()
          });
        }
        resetAdminForm();
      } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar sabor no banco de dados.");
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