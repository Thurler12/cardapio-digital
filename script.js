import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Suas credenciais do Firebase
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

// ==========================================================================
// 1. GERENCIAMENTO DE SESSÃO E ROLES
// ==========================================================================
const loginContainer = document.getElementById('login-container');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const btnLogout = document.getElementById('btn-logout');

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Buscar perfil do usuário no Firestore
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        currentUserRole = userData.role;
        aplicarPermissoesUI(currentUserRole, userData.nome);
      } else {
        // Papel padrão caso não exista documento
        currentUserRole = 'gerente';
        aplicarPermissoesUI('gerente', 'Usuário');
      }
    } catch (err) {
      console.error("Erro ao carregar permissões:", err);
      currentUserRole = 'gerente';
    }

    if (loginContainer) loginContainer.classList.add('hidden');
    if (adminPanel) adminPanel.classList.remove('hidden');
  } else {
    currentUserRole = null;
    if (loginContainer) loginContainer.classList.remove('hidden');
    if (adminPanel) adminPanel.classList.add('hidden');
  }
});

// Exibe/Oculta elementos com base nas classes de permissão
function aplicarPermissoesUI(role, nome) {
  const userInfoTag = document.getElementById('user-info-tag');
  if (userInfoTag) {
    userInfoTag.textContent = `${nome} (${role.toUpperCase()})`;
  }

  // Oculta/Exibe botões ou áreas com classes especiais no HTML
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

// Login
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('admin-user').value;
    const password = document.getElementById('admin-pass').value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      loginForm.reset();
    } catch (error) {
      console.error("Erro no login:", error);
      alert('E-mail ou senha incorretos!');
    }
  });
}

// Logout
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    signOut(auth);
  });
}

// ==========================================================================
// 2. SINCRONIZAÇÃO EM TEMPO REAL
// ==========================================================================
onSnapshot(productsRef, (snapshot) => {
  globalProducts = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  renderPublicProducts(globalProducts);
  renderAdminProducts(globalProducts);
});

// ==========================================================================
// 3. EXIBIÇÃO NO CARDÁPIO PÚBLICO
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

// ==========================================================================
// 4. PAINEL ADMIN (ADMIN.HTML)
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

    // O botão de excluir só aparece para Dona e Suporte
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
  editIdInput.value = product.id;

  imgInput.removeAttribute('required');

  if (formTitle) formTitle.textContent = 'Editar Sabor';
  if (btnSubmit) btnSubmit.textContent = 'Salvar Alterações';
  if (btnCancelEdit) btnCancelEdit.classList.remove('hidden');

  productForm.scrollIntoView({ behavior: 'smooth' });
}

if (btnCancelEdit) {
  btnCancelEdit.addEventListener('click', resetAdminForm);
}

function resetAdminForm() {
  if (!productForm) return;
  productForm.reset();
  editIdInput.value = '';
  imgInput.setAttribute('required', 'true');
  if (formTitle) formTitle.textContent = 'Cadastrar Novo Sabor';
  if (btnSubmit) btnSubmit.textContent = '+ Adicionar Sabor';
  if (btnCancelEdit) btnCancelEdit.classList.add('hidden');
}

async function deleteProduct(id) {
  // Verificação no frontend
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
    const docIdToEdit = editIdInput.value;
    const file = imgInput.files[0];

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